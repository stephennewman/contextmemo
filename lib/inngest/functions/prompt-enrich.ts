import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { BrandContext } from '@/lib/supabase/types'

const supabase = createServiceRoleClient()
const baseModel = process.env.BASE_MODEL || 'openai/gpt-4o-mini'

// Helper to get active OpenRouter API key for rotation
function getOpenRouterApiKey(): string | undefined {
  const keys = [
    process.env.OPENROUTER_API_KEY_1,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY, // Fallback to original
  ].filter(Boolean) as string[]

  if (keys.length === 0) {
    console.warn('No OpenRouter API keys found. OpenRouter functionality may be limited.')
    return undefined
  }
  
  // For simplicity, just return the first available key.
  // A more robust implementation might rotate keys or check health.
  return keys[0]
}

const openrouter = createOpenRouter({
  apiKey: getOpenRouterApiKey(),
})

// Prompt to generate new queries from gap analysis
const GAP_ANALYSIS_PROMPT = `You are analyzing AI search results to find opportunities for a brand to improve visibility.

BRAND: {{brand_name}}
BRAND DESCRIPTION: {{description}}
BRAND PRODUCTS: {{products}}

ANALYSIS CONTEXT:
The brand was NOT mentioned in AI responses for certain queries, but competitors WERE mentioned.
This represents a visibility gap - queries where users would benefit from knowing about this brand.

GAP DATA (queries where brand lost, competitors won):
{{gap_data}}

Your task: Generate NEW non-branded search queries that could help this brand get discovered.

Rules:
1. Generate queries that are SIMILAR to the gap patterns but phrased differently
2. Focus on the underlying USER INTENT, not the brand or competitors
3. Create queries a real person would type into ChatGPT/Claude/Perplexity
4. Include variations: problem-focused, solution-focused, comparison-focused
5. Do NOT include the brand name in the queries
6. Do NOT include specific competitor names in the queries

Generate 10-15 new queries.

Respond with a JSON array:
[
  {
    "query": "The exact query text",
    "query_type": "problem_solution" | "best_of" | "how_to" | "comparison" | "industry",
    "intent": "What the user is trying to accomplish",
    "priority": 70-90 (higher = more likely to convert)
  }
]

Respond ONLY with valid JSON array.`

// Prompt to discover new competitors from scan responses
const COMPETITOR_EXTRACTION_PROMPT = `Analyze these AI model responses and extract any brand/company names mentioned as recommendations or alternatives.

RESPONSES:
{{responses}}

KNOWN COMPETITORS (already tracked):
{{known_competitors}}

Extract NEW companies/brands mentioned that are NOT in the known list.
Only include actual product/service brands, not generic terms.

Respond with a JSON array:
[
  {
    "name": "Company Name",
    "context": "Brief description of what they do based on the response"
  }
]

If no new competitors found, respond with empty array: []
Respond ONLY with valid JSON array.`

interface GapPattern {
  query: string
  queryType: string
  competitorsMentioned: string[]
}

interface GeneratedQuery {
  query: string
  query_type: string
  intent: string
  priority: number
}

interface NewCompetitor {
  name: string
  context: string
}

/**
 * Prompt Enrichment - Feedback Loop
 * 
 * Runs after scans to:
 * 1. Analyze gap patterns (where brand lost, competitors won)
 * 2. Generate new prompts targeting those gaps
 * 3. Discover new competitors mentioned in AI responses
 * 4. Save everything to enrich future scans
 */
export const promptEnrich = inngest.createFunction(
  { 
    id: 'prompt-enrich', 
    name: 'Prompt Enrichment - Feedback Loop',
    concurrency: { limit: 3 },
  },
  { event: 'prompt/enrich' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Step 1: Get brand context and recent scan results
    const { brand, recentScans, knownCompetitors } = await step.run('get-data', async () => {
      const [brandResult, scansResult, competitorsResult] = await Promise.all([
        supabase
          .from('brands')
          .select('*')
          .eq('id', brandId)
          .single(),
        // Get scans from last 24 hours
        supabase
          .from('scan_results')
          .select('*, query:query_id(query_text, query_type)')
          .eq('brand_id', brandId)
          .gte('scanned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('scanned_at', { ascending: false }),
        supabase
          .from('competitors')
          .select('name')
          .eq('brand_id', brandId)
          .eq('is_active', true),
      ])

      if (brandResult.error || !brandResult.data) {
        throw new Error('Brand not found')
      }

      return {
        brand: brandResult.data,
        recentScans: scansResult.data || [],
        knownCompetitors: (competitorsResult.data || []).map(c => c.name.toLowerCase()),
      }
    })

    if (recentScans.length === 0) {
      return { success: true, message: 'No recent scans to analyze', newQueries: 0, newCompetitors: 0 }
    }

    const context = brand.context as BrandContext

    // Step 2: Identify gap patterns - queries where brand lost but competitors won
    const gapPatterns = await step.run('identify-gaps', async () => {
      const gaps: GapPattern[] = []
      
      // Group scans by query
      const scansByQuery = new Map<string, typeof recentScans>()
      for (const scan of recentScans) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queryText = (scan as any).query?.query_text || ''
        if (!scansByQuery.has(queryText)) {
          scansByQuery.set(queryText, [])
        }
        scansByQuery.get(queryText)!.push(scan)
      }

      // Find queries where brand wasn't mentioned but competitors were
      for (const [queryText, scans] of scansByQuery) {
        const brandMentioned = scans.some(s => s.brand_mentioned)
        const competitorsMentioned = new Set<string>()
        
        for (const scan of scans) {
          if (scan.competitors_mentioned) {
            for (const comp of scan.competitors_mentioned) {
              competitorsMentioned.add(comp)
            }
          }
        }

        // This is a gap: brand not mentioned, but competitors were
        if (!brandMentioned && competitorsMentioned.size > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const queryType = (scans[0] as any).query?.query_type || 'unknown'
          gaps.push({
            query: queryText,
            queryType,
            competitorsMentioned: Array.from(competitorsMentioned),
          })
        }
      }

      return gaps
    })

    // Step 3: Generate new queries based on gap patterns
    let newQueriesCount = 0
    if (gapPatterns.length > 0) {
      const generatedQueries = await step.run('generate-gap-queries', async () => {
        // Format gap data for the prompt
        const gapData = gapPatterns.slice(0, 10).map(g => 
          `- Query: "${g.query}" (type: ${g.queryType}) - Competitors mentioned: ${g.competitorsMentioned.join(', ')}`
        ).join('\n')

        const prompt = GAP_ANALYSIS_PROMPT
          .replace('{{brand_name}}', brand.name)
          .replace('{{description}}', context.description || '')
          .replace('{{products}}', (context.products || []).join(', '))
          .replace('{{gap_data}}', gapData)

        try {
          const { text } = await generateText({
            model: openrouter(baseModel),
            prompt,
            temperature: 0.5,
          })

          const jsonMatch = text.match(/\[[\s\S]*\]/)
          if (!jsonMatch) return []
          return JSON.parse(jsonMatch[0]) as GeneratedQuery[]
        } catch (e) {
          console.error('Failed to generate gap queries:', e)
          return []
        }
      })

      // Save new queries
      if (generatedQueries.length > 0) {
        newQueriesCount = await step.run('save-gap-queries', async () => {
          const queriesToInsert = generatedQueries.map(q => ({
            brand_id: brandId,
            query_text: q.query,
            query_type: q.query_type,
            priority: q.priority,
            auto_discovered: true,
            is_active: true,
            persona: null,
          }))

          const { data, error } = await supabase
            .from('queries')
            .upsert(queriesToInsert, {
              onConflict: 'brand_id,query_text',
              ignoreDuplicates: true,
            })
            .select()

          if (error) {
            console.error('Failed to save gap queries:', error)
            return 0
          }

          return data?.length || 0
        })
      }
    }

    // Step 4: Discover new competitors from scan responses
    let newCompetitorsCount = 0
    const responsesWithCompetitors = recentScans.filter(s => 
      s.competitors_mentioned && s.competitors_mentioned.length > 0
    )

    if (responsesWithCompetitors.length > 0) {
      const newCompetitors = await step.run('discover-competitors', async () => {
        // Sample some responses that mentioned competitors
        const sampleResponses = responsesWithCompetitors
          .slice(0, 5)
          .map(s => s.response_text?.slice(0, 500) || '')
          .join('\n\n---\n\n')

        const prompt = COMPETITOR_EXTRACTION_PROMPT
          .replace('{{responses}}', sampleResponses)
          .replace('{{known_competitors}}', knownCompetitors.join(', '))

        try {
          const { text } = await generateText({
            model: openrouter(baseModel),
            prompt,
            temperature: 0.3,
          })

          const jsonMatch = text.match(/\[[\s\S]*\]/)
          if (!jsonMatch) return []
          return JSON.parse(jsonMatch[0]) as NewCompetitor[]
        } catch (e) {
          console.error('Failed to extract competitors:', e)
          return []
        }
      })

      // Save new competitors
      if (newCompetitors.length > 0) {
        newCompetitorsCount = await step.run('save-new-competitors', async () => {
          // Filter out any that match known competitors (case-insensitive)
          const trulyNew = newCompetitors.filter(nc => 
            !knownCompetitors.includes(nc.name.toLowerCase())
          )

          if (trulyNew.length === 0) return 0

          const competitorsToInsert = trulyNew.map(c => ({
            brand_id: brandId,
            name: c.name,
            description: c.context,
            auto_discovered: true,
            is_active: true,
          }))

          const { data, error } = await supabase
            .from('competitors')
            .upsert(competitorsToInsert, {
              onConflict: 'brand_id,name',
              ignoreDuplicates: true,
            })
            .select()

          if (error) {
            console.error('Failed to save new competitors:', error)
            return 0
          }

          return data?.length || 0
        })
      }
    }

    // Step 5: Create alert with enrichment results
    if (newQueriesCount > 0 || newCompetitorsCount > 0) {
      await step.run('create-alert', async () => {
        await supabase.from('alerts').insert({
          brand_id: brandId,
          alert_type: 'enrichment_complete',
          title: 'Prompt Enrichment Complete',
          message: `Discovered ${newQueriesCount} new queries and ${newCompetitorsCount} new competitors from scan analysis.`,
          data: { 
            newQueries: newQueriesCount, 
            newCompetitors: newCompetitorsCount,
            gapPatternsAnalyzed: gapPatterns.length,
          },
        })
      })
    }

    return {
      success: true,
      gapPatternsFound: gapPatterns.length,
      newQueriesGenerated: newQueriesCount,
      newCompetitorsDiscovered: newCompetitorsCount,
    }
  }
)
