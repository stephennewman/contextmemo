import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { COMPETITOR_DISCOVERY_PROMPT } from '@/lib/ai/prompts/context-extraction'
import { BrandContext } from '@/lib/supabase/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface DiscoveredCompetitor {
  name: string
  domain: string | null
  description: string
}

export const competitorDiscover = inngest.createFunction(
  { id: 'competitor-discover', name: 'Discover Competitors' },
  { event: 'competitor/discover' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Step 1: Get brand context
    const brand = await step.run('get-brand', async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (error || !data) {
        throw new Error('Brand not found')
      }

      return data
    })

    const context = brand.context as BrandContext

    if (!context || !context.description) {
      throw new Error('Brand context not available. Run context extraction first.')
    }

    // Step 2: Discover competitors using AI
    const competitors = await step.run('discover-competitors', async () => {
      const prompt = COMPETITOR_DISCOVERY_PROMPT
        .replace('{{company_name}}', context.company_name || brand.name)
        .replace('{{description}}', context.description || '')
        .replace('{{products}}', (context.products || []).join(', '))
        .replace('{{markets}}', (context.markets || []).join(', '))

      const { text } = await generateText({
        model: openai('gpt-4o'),
        prompt,
        temperature: 0.3,
      })

      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          throw new Error('No JSON array found in response')
        }
        return JSON.parse(jsonMatch[0]) as DiscoveredCompetitor[]
      } catch {
        console.error('Failed to parse competitors:', text)
        return []
      }
    })

    // Step 3: Save competitors to database
    const savedCompetitors = await step.run('save-competitors', async () => {
      const competitorsToInsert = competitors.map(c => ({
        brand_id: brandId,
        name: c.name,
        domain: c.domain,
        description: c.description,
        auto_discovered: true,
        is_active: true,
      }))

      // Use upsert to avoid duplicates
      const { data, error } = await supabase
        .from('competitors')
        .upsert(competitorsToInsert, {
          onConflict: 'brand_id,name',
          ignoreDuplicates: true,
        })
        .select()

      if (error) {
        console.error('Failed to save competitors:', error)
        // Don't throw - we want to continue even if some fail
      }

      return data || []
    })

    // Step 4: Trigger query generation
    await step.sendEvent('trigger-query-generation', {
      name: 'query/generate',
      data: { brandId },
    })

    return {
      success: true,
      competitorsFound: competitors.length,
      competitorsSaved: savedCompetitors.length,
    }
  }
)
