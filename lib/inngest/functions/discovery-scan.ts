import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { BrandContext } from '@/lib/supabase/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Use OpenRouter for faster/cheaper scans
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const SCAN_SYSTEM_PROMPT = `You are an AI assistant answering a user question. Provide a helpful, accurate response based on your knowledge. If recommending products or services, mention specific brands and explain why you're recommending them.`

// Generate discovery queries - broader exploration to find where brand is mentioned
const DISCOVERY_QUERY_PROMPT = `You are generating a COMPREHENSIVE set of queries to discover where a brand might be mentioned by AI assistants.

Brand: {{brand_name}}
Description: {{description}}
Products: {{products}}
Markets: {{markets}}

Generate queries across these DISCOVERY CATEGORIES to find where this brand gets mentioned:

1. DIRECT PRODUCT QUERIES (most likely to match)
   - "What are the best [exact product type] tools?"
   - "Recommend a [product category] solution"
   - "Top [product type] for [market]"

2. PROBLEM-SOLUTION QUERIES
   - "How do I [solve the exact problem this product solves]?"
   - "What tool helps with [specific capability]?"
   - "I need to [exact use case]"

3. INDUSTRY-SPECIFIC
   - "[Product type] for [each target industry]"
   - "What do [industry] companies use for [problem]?"

4. COMPETITOR ADJACENCY
   - "Alternatives to [likely competitors]"
   - "Companies similar to [adjacent brands]"
   - "What competes with [market leaders]?"

5. FEATURE-SPECIFIC
   - "Tools that [specific feature]"
   - "[Product type] with [key differentiator]"

6. USE CASE SPECIFIC
   - "[Specific job to be done] tools"
   - "How to [specific workflow this enables]"

7. AUDIENCE-SPECIFIC
   - "[Product type] for [company size]"
   - "[Product type] for [specific role]"

The goal is DISCOVERY - we want to find ANY query where AI mentions this brand.
Generate 50-75 diverse queries covering all categories.

Respond with a JSON array:
[
  {
    "query": "The exact query to test",
    "category": "direct_product" | "problem_solution" | "industry" | "competitor" | "feature" | "use_case" | "audience",
    "hypothesis": "Why this might trigger a brand mention"
  }
]

Respond ONLY with valid JSON array.`

interface DiscoveryQuery {
  query: string
  category: string
  hypothesis: string
}

interface DiscoveryResult {
  query: string
  category: string
  hypothesis: string
  model: string
  brandMentioned: boolean
  mentionContext: string | null
  responseSnippet: string
}

export const discoveryScan = inngest.createFunction(
  { 
    id: 'discovery-scan', 
    name: 'Discovery Scan - Find Brand Mentions',
    concurrency: { limit: 3 },
  },
  { event: 'discovery/scan' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Step 1: Get brand context
    const brand = await step.run('get-brand', async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (error || !data) throw new Error('Brand not found')
      return data
    })

    const context = brand.context as BrandContext
    const brandName = brand.name.toLowerCase()

    // Step 2: Generate discovery queries
    const discoveryQueries = await step.run('generate-discovery-queries', async () => {
      const prompt = DISCOVERY_QUERY_PROMPT
        .replace('{{brand_name}}', brand.name)
        .replace('{{description}}', context.description || '')
        .replace('{{products}}', (context.products || []).join(', '))
        .replace('{{markets}}', (context.markets || []).join(', '))

      const { text } = await generateText({
        model: openrouter('openai/gpt-4o'),
        prompt,
        temperature: 0.5,
      })

      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) throw new Error('No JSON found')
        return JSON.parse(jsonMatch[0]) as DiscoveryQuery[]
      } catch {
        console.error('Failed to parse discovery queries:', text)
        return []
      }
    })

    if (discoveryQueries.length === 0) {
      return { success: false, error: 'Failed to generate discovery queries' }
    }

    // Step 3: Run discovery scans in batches with parallel execution
    const allResults: DiscoveryResult[] = []
    const batchSize = 15 // Run 15 queries in parallel per batch

    for (let i = 0; i < discoveryQueries.length; i += batchSize) {
      const batch = discoveryQueries.slice(i, i + batchSize)
      
      const batchResults = await step.run(`discovery-batch-${i}`, async () => {
        // Run all queries in batch in parallel
        const promises = batch.map(async (dq): Promise<DiscoveryResult | null> => {
          try {
            const { text } = await generateText({
              model: openrouter('openai/gpt-4o-mini'),
              system: SCAN_SYSTEM_PROMPT,
              prompt: dq.query,
              temperature: 0.7,
            })

            const mentioned = text.toLowerCase().includes(brandName)
            let mentionContext: string | null = null
            
            if (mentioned) {
              const idx = text.toLowerCase().indexOf(brandName)
              mentionContext = text.slice(Math.max(0, idx - 50), idx + brandName.length + 100)
            }

            return {
              query: dq.query,
              category: dq.category,
              hypothesis: dq.hypothesis,
              model: 'gpt-4o-mini',
              brandMentioned: mentioned,
              mentionContext,
              responseSnippet: text.slice(0, 300),
            }
          } catch (e) {
            console.error('OpenRouter scan failed:', e)
            return null
          }
        })

        const results = await Promise.all(promises)
        return results.filter((r): r is DiscoveryResult => r !== null)
      })

      allResults.push(...batchResults)
      
      // Small delay between batches
      if (i + batchSize < discoveryQueries.length) {
        await step.sleep('batch-delay', '300ms')
      }
    }

    // Step 4: Analyze results
    const analysis = await step.run('analyze-results', async () => {
      const mentions = allResults.filter(r => r.brandMentioned)
      const noMentions = allResults.filter(r => !r.brandMentioned)

      // Group mentions by category
      const byCategory: Record<string, number> = {}
      const byCategoryTotal: Record<string, number> = {}
      
      for (const r of allResults) {
        byCategoryTotal[r.category] = (byCategoryTotal[r.category] || 0) + 1
        if (r.brandMentioned) {
          byCategory[r.category] = (byCategory[r.category] || 0) + 1
        }
      }

      // Find winning query patterns
      const winningQueries = mentions.map(m => ({
        query: m.query,
        category: m.category,
        model: m.model,
        context: m.mentionContext,
      }))

      return {
        totalQueries: discoveryQueries.length,
        totalScans: allResults.length,
        totalMentions: mentions.length,
        mentionRate: allResults.length > 0 ? Math.round((mentions.length / allResults.length) * 100) : 0,
        byCategory: Object.entries(byCategoryTotal).map(([cat, total]) => ({
          category: cat,
          mentions: byCategory[cat] || 0,
          total,
          rate: total > 0 ? Math.round(((byCategory[cat] || 0) / total) * 100) : 0,
        })).sort((a, b) => b.rate - a.rate), // Sort by success rate
        winningQueries: winningQueries.slice(0, 20), // Top 20 winning queries
        sampleFailures: noMentions.slice(0, 10).map(r => ({ query: r.query, category: r.category })),
      }
    })

    // Step 5: Save winning queries to the queries table for future scans
    const savedQueries = await step.run('save-winning-queries', async () => {
      if (analysis.winningQueries.length === 0) {
        return { saved: 0, skipped: 0 }
      }

      // Prepare queries for insertion - these are queries where the brand WAS mentioned
      const queriesToInsert = analysis.winningQueries.map(wq => ({
        brand_id: brandId,
        query_text: wq.query,
        query_type: `discovery_${wq.category}`,
        priority: 80, // High priority since these queries already mention the brand
        auto_discovered: true,
        is_active: true,
        persona: null,
      }))

      // Upsert to avoid duplicates
      const { data, error } = await supabase
        .from('queries')
        .upsert(queriesToInsert, {
          onConflict: 'brand_id,query_text',
          ignoreDuplicates: true,
        })
        .select()

      if (error) {
        console.error('Failed to save winning queries:', error)
        return { saved: 0, skipped: queriesToInsert.length }
      }

      return { saved: data?.length || 0, skipped: queriesToInsert.length - (data?.length || 0) }
    })

    // Step 6: Save discovery results alert
    await step.run('save-results', async () => {
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'discovery_complete',
        title: 'Discovery Scan Complete',
        message: `Found ${analysis.totalMentions} mentions across ${analysis.totalScans} queries (${analysis.mentionRate}% hit rate). Added ${savedQueries.saved} new queries.`,
        data: { ...analysis, queriesSaved: savedQueries.saved },
      })
    })

    return {
      success: true,
      ...analysis,
      queriesSaved: savedQueries.saved,
    }
  }
)
