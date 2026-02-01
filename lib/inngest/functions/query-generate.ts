import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { 
  QUERY_GENERATION_PROMPT, 
  USER_INTENT_EXTRACTION_PROMPT,
  INTENT_BASED_QUERY_PROMPT 
} from '@/lib/ai/prompts/context-extraction'
import { BrandContext, UserIntent } from '@/lib/supabase/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface GeneratedQuery {
  query_text: string
  query_type: string
  priority: number
  related_competitor: string | null
}

export const queryGenerate = inngest.createFunction(
  { id: 'query-generate', name: 'Generate Search Queries' },
  { event: 'query/generate' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Step 1: Get brand and competitors
    const { brand, competitors } = await step.run('get-brand-data', async () => {
      const [brandResult, competitorsResult] = await Promise.all([
        supabase
          .from('brands')
          .select('*')
          .eq('id', brandId)
          .single(),
        supabase
          .from('competitors')
          .select('*')
          .eq('brand_id', brandId)
          .eq('is_active', true),
      ])

      if (brandResult.error || !brandResult.data) {
        throw new Error('Brand not found')
      }

      return {
        brand: brandResult.data,
        competitors: competitorsResult.data || [],
      }
    })

    const context = brand.context as BrandContext

    if (!context || !context.description) {
      throw new Error('Brand context not available. Run context extraction first.')
    }

    // Step 2: Extract user intents from homepage content (if available)
    const userIntents = await step.run('extract-user-intents', async () => {
      // Use homepage_content if available, otherwise fall back to description
      const contentToAnalyze = context.homepage_content || context.description || ''
      
      if (contentToAnalyze.length < 200) {
        console.log('Not enough content for intent extraction, skipping')
        return [] as UserIntent[]
      }

      const prompt = USER_INTENT_EXTRACTION_PROMPT
        .replace('{{homepage_content}}', contentToAnalyze.slice(0, 12000))

      const { text } = await generateText({
        model: openai('gpt-4o'),
        prompt,
        temperature: 0.3,
      })

      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          throw new Error('No JSON array found in intent response')
        }
        return JSON.parse(jsonMatch[0]) as UserIntent[]
      } catch {
        console.error('Failed to parse user intents:', text)
        return [] as UserIntent[]
      }
    })

    // Step 3: Generate category-based queries (existing approach)
    const categoryQueries = await step.run('generate-category-queries', async () => {
      const competitorNames = competitors.map(c => c.name).join(', ')
      
      const prompt = QUERY_GENERATION_PROMPT
        .replace(/\{\{company_name\}\}/g, context.company_name || brand.name)
        .replace('{{description}}', context.description || '')
        .replace('{{products}}', (context.products || []).join(', '))
        .replace('{{markets}}', (context.markets || []).join(', '))
        .replace('{{competitors}}', competitorNames)

      const { text } = await generateText({
        model: openai('gpt-4o'),
        prompt,
        temperature: 0.4,
      })

      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          throw new Error('No JSON array found in response')
        }
        return JSON.parse(jsonMatch[0]) as GeneratedQuery[]
      } catch {
        console.error('Failed to parse queries:', text)
        return []
      }
    })

    // Step 4: Generate intent-based conversational queries (new approach)
    const intentQueries = await step.run('generate-intent-queries', async () => {
      if (userIntents.length === 0) {
        console.log('No user intents extracted, skipping intent-based queries')
        return [] as GeneratedQuery[]
      }

      const intentsText = userIntents.map(i => 
        `- Pain point: ${i.pain_point}\n  Desired outcome: ${i.desired_outcome}\n  Natural phrasing: "${i.trigger_phrase}"`
      ).join('\n')

      const prompt = INTENT_BASED_QUERY_PROMPT
        .replace(/\{\{company_name\}\}/g, context.company_name || brand.name)
        .replace('{{description}}', context.description || '')
        .replace('{{user_intents}}', intentsText)

      const { text } = await generateText({
        model: openai('gpt-4o'),
        prompt,
        temperature: 0.5, // Slightly higher temp for more natural variation
      })

      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          throw new Error('No JSON array found in intent queries response')
        }
        return JSON.parse(jsonMatch[0]) as GeneratedQuery[]
      } catch {
        console.error('Failed to parse intent queries:', text)
        return []
      }
    })

    // Combine both query types, prioritizing intent-based queries
    const queries = [
      ...intentQueries.map(q => ({ ...q, priority: Math.min(100, q.priority + 10) })), // Boost intent queries
      ...categoryQueries,
    ]

    // Step 5: Map competitor names to IDs
    const competitorIdMap = new Map(
      competitors.map(c => [c.name.toLowerCase(), c.id])
    )

    // Step 6: Save queries to database
    const savedQueries = await step.run('save-queries', async () => {
      const queriesToInsert = queries.map(q => ({
        brand_id: brandId,
        query_text: q.query_text,
        query_type: q.query_type,
        priority: q.priority,
        related_competitor_id: q.related_competitor 
          ? competitorIdMap.get(q.related_competitor.toLowerCase()) || null
          : null,
        auto_discovered: true,
        is_active: true,
      }))

      // Use upsert to avoid duplicates
      const { data, error } = await supabase
        .from('queries')
        .upsert(queriesToInsert, {
          onConflict: 'brand_id,query_text',
          ignoreDuplicates: true,
        })
        .select()

      if (error) {
        console.error('Failed to save queries:', error)
      }

      return data || []
    })

    // Step 7: Save user intents to brand context (for future reference)
    if (userIntents.length > 0) {
      await step.run('save-user-intents', async () => {
        const updatedContext = {
          ...context,
          user_intents: userIntents,
        }
        
        await supabase
          .from('brands')
          .update({ context: updatedContext })
          .eq('id', brandId)
      })
    }

    // Step 8: Trigger initial scan
    await step.sendEvent('trigger-initial-scan', {
      name: 'scan/run',
      data: { brandId },
    })

    // Create alert for user
    const intentQueryCount = intentQueries.length
    const categoryQueryCount = categoryQueries.length
    
    await step.run('create-alert', async () => {
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'setup_complete',
        title: 'Setup Complete',
        message: `Generated ${savedQueries.length} queries (${intentQueryCount} intent-based, ${categoryQueryCount} category-based). Running initial scan...`,
      })
    })

    return {
      success: true,
      queriesGenerated: queries.length,
      queriesSaved: savedQueries.length,
      intentQueries: intentQueryCount,
      categoryQueries: categoryQueryCount,
      userIntentsExtracted: userIntents.length,
    }
  }
)
