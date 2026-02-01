import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { 
  QUERY_GENERATION_PROMPT, 
  USER_INTENT_EXTRACTION_PROMPT,
  INTENT_BASED_QUERY_PROMPT,
  PERSONA_PROMPT_GENERATION,
} from '@/lib/ai/prompts/context-extraction'
import { BrandContext, UserIntent, PERSONA_CONFIGS, PromptPersona, CustomPersona, PersonaConfig } from '@/lib/supabase/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface GeneratedQuery {
  query_text: string
  query_type: string
  priority: number
  related_competitor: string | null
  persona?: PromptPersona | null
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

    // Step 5: Generate persona-based prompts for the brand's target personas (core + custom)
    const personaQueries = await step.run('generate-persona-prompts', async () => {
      const allPersonaQueries: GeneratedQuery[] = []
      const competitorNames = competitors.map(c => c.name).join(', ')

      // Use brand's extracted target personas, or fall back to sensible defaults
      const targetPersonaIds = context.target_personas && context.target_personas.length > 0
        ? context.target_personas
        : ['b2b_marketer', 'developer', 'smb_owner'] as PromptPersona[]
      
      // Filter out disabled personas
      const disabledPersonas = context.disabled_personas || []
      const enabledPersonaIds = targetPersonaIds.filter(id => !disabledPersonas.includes(id))
      
      console.log(`Target personas: ${targetPersonaIds.length}, Disabled: ${disabledPersonas.length}, Enabled: ${enabledPersonaIds.length}`)
      
      // Get core persona configs that match enabled personas
      const corePersonas = PERSONA_CONFIGS.filter(p => enabledPersonaIds.includes(p.id))
      
      // Get custom personas from brand context
      const customPersonas = context.custom_personas || []
      
      // Convert custom personas to the same format as core personas (only enabled ones)
      const customAsConfigs: PersonaConfig[] = customPersonas
        .filter(cp => enabledPersonaIds.includes(cp.id))
        .map(cp => ({
          id: cp.id as PromptPersona,
          name: cp.name,
          description: cp.description,
          phrasingSyle: cp.phrasing_style,
          priorities: cp.priorities,
          examplePhrasing: `${cp.phrasing_style} - e.g., asking about ${cp.priorities[0] || 'their needs'}`,
        }))
      
      // Combine core + custom personas
      const allPersonas = [...corePersonas, ...customAsConfigs]
      
      console.log(`Generating prompts for ${allPersonas.length} personas (${corePersonas.length} core, ${customAsConfigs.length} custom):`, 
        allPersonas.map(p => p.id))

      for (const persona of allPersonas) {
        try {
          const prompt = PERSONA_PROMPT_GENERATION
            .replace(/\{\{company_name\}\}/g, context.company_name || brand.name)
            .replace('{{description}}', context.description || '')
            .replace('{{products}}', (context.products || []).join(', '))
            .replace('{{markets}}', (context.markets || []).join(', '))
            .replace('{{competitors}}', competitorNames)
            .replace('{{persona_name}}', persona.name)
            .replace('{{persona_description}}', persona.description)
            .replace('{{persona_phrasing}}', persona.phrasingSyle)
            .replace('{{persona_priorities}}', persona.priorities.join(', '))
            .replace('{{persona_example}}', persona.examplePhrasing)

          const { text } = await generateText({
            model: openai('gpt-4o'),
            prompt,
            temperature: 0.5,
          })

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
    const queries = [
      ...personaQueries.map(q => ({ ...q, priority: Math.min(100, q.priority + 15) })), // Boost persona queries most
      ...intentQueries.map(q => ({ ...q, priority: Math.min(100, q.priority + 10) })), // Boost intent queries
      ...categoryQueries.map(q => ({ ...q, persona: null as PromptPersona | null })), // Legacy queries have no persona
    ]

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
