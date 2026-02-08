import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { 
  QUERY_GENERATION_PROMPT, 
  USER_INTENT_EXTRACTION_PROMPT,
  INTENT_BASED_QUERY_PROMPT,
  PERSONA_PROMPT_GENERATION,
} from '@/lib/ai/prompts/context-extraction'
import { BrandContext, UserIntent, TargetPersona, PromptPersona } from '@/lib/supabase/types'
import { isJunkQuery } from '@/lib/utils/query-validation'
import { logSingleUsage } from '@/lib/utils/usage-logger'

const supabase = createServiceRoleClient()

interface GeneratedQuery {
  query_text: string
  query_type: string
  priority: number
  related_competitor: string | null
  persona?: PromptPersona | null
  funnel_stage?: 'top_funnel' | 'mid_funnel' | 'bottom_funnel' | null
}

export const queryGenerate = inngest.createFunction(
  { id: 'query-generate', name: 'Generate Search Queries' },
  { event: 'query/generate' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Step 1: Get brand and competitors (competitors may not exist yet during onboarding)
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

    const hasCompetitors = competitors.length > 0

    const context = brand.context as BrandContext

    // Check if we have any meaningful context (allow empty description)
    if (!context || (!context.description && !context.company_name && !context.homepage_content)) {
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

      const { text, usage: u1 } = await generateText({
        model: openai('gpt-4o'),
        prompt,
        temperature: 0.3,
      })

      await logSingleUsage(
        brand.tenant_id, brandId, 'query_generate',
        'gpt-4o', u1?.inputTokens || 0, u1?.outputTokens || 0
      )

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

    // Step 3: Generate category-based queries (skip competitor-dependent queries if no competitors yet)
    const categoryQueries = await step.run('generate-category-queries', async () => {
      const competitorNames = hasCompetitors 
        ? competitors.map(c => c.name).join(', ')
        : 'Not yet discovered'
      
      // Use description if available, otherwise use homepage content summary
      const descriptionText = context.description || 
        (context.homepage_content ? `Based on website content: ${context.homepage_content.slice(0, 2000)}` : `Company: ${brand.name}`)
      
      const prompt = QUERY_GENERATION_PROMPT
        .replace(/\{\{company_name\}\}/g, context.company_name || brand.name)
        .replace('{{description}}', descriptionText)
        .replace('{{products}}', (context.products || []).join(', ') || 'Not specified')
        .replace('{{markets}}', (context.markets || []).join(', ') || 'Not specified')
        .replace('{{competitors}}', competitorNames)

      const { text, usage: u2 } = await generateText({
        model: openai('gpt-4o'),
        prompt,
        temperature: 0.4,
      })

      await logSingleUsage(
        brand.tenant_id, brandId, 'query_generate',
        'gpt-4o', u2?.inputTokens || 0, u2?.outputTokens || 0
      )

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

      const { text, usage: u3 } = await generateText({
        model: openai('gpt-4o'),
        prompt,
        temperature: 0.5, // Slightly higher temp for more natural variation
      })

      await logSingleUsage(
        brand.tenant_id, brandId, 'query_generate',
        'gpt-4o', u3?.inputTokens || 0, u3?.outputTokens || 0
      )

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

    // Step 5: Generate persona-based prompts for the brand's target personas
    const personaQueries = await step.run('generate-persona-prompts', async () => {
      const allPersonaQueries: GeneratedQuery[] = []
      const competitorNames = hasCompetitors ? competitors.map(c => c.name).join(', ') : ''

      // Get personas from the new flexible structure
      const personas = context.personas || []
      
      // Filter out disabled personas
      const disabledPersonas = context.disabled_personas || []
      const enabledPersonas = personas.filter(p => !disabledPersonas.includes(p.id))
      
      console.log(`Target personas: ${personas.length}, Disabled: ${disabledPersonas.length}, Enabled: ${enabledPersonas.length}`)
      
      if (enabledPersonas.length === 0) {
        console.log('No enabled personas found, skipping persona-based prompts')
        return [] as GeneratedQuery[]
      }

      for (const persona of enabledPersonas) {
        try {
          // Build an example phrasing from persona data
          const examplePhrasing = `${persona.phrasing_style} - e.g., asking about ${persona.priorities[0] || 'their needs'}`
          
          const prompt = PERSONA_PROMPT_GENERATION
            .replace(/\{\{company_name\}\}/g, context.company_name || brand.name)
            .replace('{{description}}', context.description || '')
            .replace('{{products}}', (context.products || []).join(', '))
            .replace('{{markets}}', (context.markets || []).join(', '))
            .replace('{{competitors}}', competitorNames)
            .replace('{{persona_name}}', persona.title)
            .replace('{{persona_description}}', persona.description)
            .replace('{{persona_phrasing}}', persona.phrasing_style)
            .replace('{{persona_priorities}}', persona.priorities.join(', '))
            .replace('{{persona_example}}', examplePhrasing)

          const { text, usage: uP } = await generateText({
            model: openai('gpt-4o'),
            prompt,
            temperature: 0.5,
          })

          await logSingleUsage(
            brand.tenant_id, brandId, 'query_generate',
            'gpt-4o', uP?.inputTokens || 0, uP?.outputTokens || 0
          )

          const jsonMatch = text.match(/\[[\s\S]*\]/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as GeneratedQuery[]
            // Add persona to each query
            const withPersona = parsed.map(q => ({
              ...q,
              persona: persona.id,
            }))
            allPersonaQueries.push(...withPersona)
          }
        } catch (error) {
          console.error(`Failed to generate prompts for persona ${persona.id}:`, error)
        }

        // Small delay between persona generations
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      return allPersonaQueries
    })

    // Combine all query types, prioritizing persona and intent-based queries
    const allQueries = [
      ...personaQueries.map(q => ({ ...q, priority: Math.min(100, q.priority + 15) })), // Boost persona queries most
      ...intentQueries.map(q => ({ ...q, priority: Math.min(100, q.priority + 10) })), // Boost intent queries
      ...categoryQueries.map(q => ({ ...q, persona: null as PromptPersona | null })), // Legacy queries have no persona
    ]

    // Filter out junk queries (e.g., "BrandName for X" labels)
    const brandNameLower = brand.name.toLowerCase()
    const validQueries = allQueries.filter(q => !isJunkQuery(q.query_text, brandNameLower))
    
    if (validQueries.length < allQueries.length) {
      console.log(`Filtered ${allQueries.length - validQueries.length} junk queries (e.g., branded labels)`)
    }

    // Cap total queries at 100 to keep scans manageable (sorted by priority, highest first)
    const MAX_QUERIES = 100
    const queries = validQueries
      .sort((a, b) => b.priority - a.priority)
      .slice(0, MAX_QUERIES)
    
    console.log(`Total queries generated: ${allQueries.length}, valid: ${validQueries.length}, capped to: ${queries.length}`)

    // Step 5: Map competitor names to IDs
    const competitorIdMap = new Map(
      competitors.map(c => [c.name.toLowerCase(), c.id])
    )

    // Step 6: Save prompts to database
    const savedQueries = await step.run('save-prompts', async () => {
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
        persona: q.persona || null,
        funnel_stage: q.funnel_stage || null,
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

    // Step 8: Trigger initial scan with auto memo generation
    await step.sendEvent('trigger-initial-scan', {
      name: 'scan/run',
      data: { brandId, autoGenerateMemos: true },
    })

    // Create alert for user
    const intentQueryCount = intentQueries.length
    const categoryQueryCount = categoryQueries.length
    const personaQueryCount = personaQueries.length
    
    await step.run('create-alert', async () => {
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'setup_complete',
        title: 'Prompt Generation Complete',
        message: `Generated ${savedQueries.length} prompts (${personaQueryCount} persona-based, ${intentQueryCount} intent-based, ${categoryQueryCount} category-based). Running initial scan...`,
      })
    })

    return {
      success: true,
      promptsGenerated: queries.length,
      promptsSaved: savedQueries.length,
      personaPrompts: personaQueryCount,
      intentPrompts: intentQueryCount,
      categoryPrompts: categoryQueryCount,
      userIntentsExtracted: userIntents.length,
    }
  }
)
