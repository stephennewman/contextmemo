import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { ENTITY_REVALIDATION_PROMPT } from '@/lib/ai/prompts/context-extraction'
import { BrandContext } from '@/lib/supabase/types'
import { logSingleUsage } from '@/lib/utils/usage-logger'

const supabase = createServiceRoleClient()

interface RevalidationResult {
  name: string
  recommended_type: string
  should_be_active: boolean
  confidence: 'high' | 'medium'
  reasoning: string
}

/**
 * Competitor Revalidation - Pressure-tests all entities against brand context
 * 
 * Uses GPT-4o-mini to classify every entity and determine:
 * 1. Is this actually a product competitor for this brand?
 * 2. If not, what type of entity is it? (technology, consultant, publisher, etc.)
 * 3. Should it remain active?
 * 
 * Cost: ~0.5-1 cent per brand (single GPT-4o-mini call)
 */
export const competitorRevalidate = inngest.createFunction(
  {
    id: 'competitor-revalidate',
    name: 'Entity Revalidation',
    concurrency: { limit: 3 },
  },
  { event: 'competitor/revalidate' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Step 1: Get brand context and all entities
    const { brand, entities } = await step.run('get-data', async () => {
      const [brandResult, entitiesResult] = await Promise.all([
        supabase
          .from('brands')
          .select('*')
          .eq('id', brandId)
          .single(),
        supabase
          .from('competitors')
          .select('id, name, domain, entity_type, is_active, auto_discovered, source_method')
          .eq('brand_id', brandId)
          .eq('is_active', true), // Only revalidate active entities
      ])

      if (brandResult.error || !brandResult.data) {
        throw new Error('Brand not found')
      }

      return {
        brand: brandResult.data,
        entities: entitiesResult.data || [],
      }
    })

    if (entities.length === 0) {
      return { success: true, message: 'No active entities to revalidate', changes: 0 }
    }

    const context = brand.context as BrandContext

    // Step 2: Run GPT-4o-mini classification
    const classifications = await step.run('classify-entities', async () => {
      // Build entities list for the prompt
      const entitiesList = entities
        .map((e, i) => `${i + 1}. ${e.name}${e.domain ? ` (${e.domain})` : ''} — currently: ${e.entity_type || 'product_competitor'}, source: ${e.source_method || 'unknown'}`)
        .join('\n')

      const prompt = ENTITY_REVALIDATION_PROMPT
        .replace(/\{\{company_name\}\}/g, context?.company_name || brand.name)
        .replace('{{domain}}', brand.domain || 'Not specified')
        .replace('{{description}}', context?.description || `Company: ${brand.name}`)
        .replace('{{products}}', (context?.products || []).join(', ') || 'Not specified')
        .replace('{{markets}}', (context?.markets || []).join(', ') || 'Not specified')
        .replace('{{features}}', (context?.features || []).join(', ') || 'Not specified')
        .replace('{{entities_list}}', entitiesList)

      const { text, usage } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        temperature: 0.1, // Low temperature for consistent classification
      })

      await logSingleUsage(
        brand.tenant_id, brandId, 'entity_revalidation',
        'gpt-4o-mini', usage?.inputTokens || 0, usage?.outputTokens || 0
      )

      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          throw new Error('No JSON array found in response')
        }
        return JSON.parse(jsonMatch[0]) as RevalidationResult[]
      } catch {
        console.error('Failed to parse revalidation results:', text)
        return []
      }
    })

    if (classifications.length === 0) {
      return { success: false, message: 'Classification failed', changes: 0 }
    }

    // Step 3: Apply changes to database
    const results = await step.run('apply-changes', async () => {
      let deactivated = 0
      let reclassified = 0
      let unchanged = 0
      const changes: Array<{ name: string; action: string; from: string; to: string; reasoning: string }> = []

      for (const classification of classifications) {
        // Find matching entity by name
        const entity = entities.find(
          e => e.name.toLowerCase() === classification.name.toLowerCase()
        )
        if (!entity) continue

        const currentType = entity.entity_type || 'product_competitor'
        const newType = classification.recommended_type
        const shouldBeActive = classification.should_be_active

        // Determine what changed
        if (!shouldBeActive && entity.is_active) {
          // Deactivate and reclassify
          const { error } = await supabase
            .from('competitors')
            .update({
              is_active: false,
              entity_type: newType,
            })
            .eq('id', entity.id)

          if (!error) {
            deactivated++
            changes.push({
              name: entity.name,
              action: 'deactivated',
              from: currentType,
              to: newType,
              reasoning: classification.reasoning,
            })
          }
        } else if (newType !== currentType && shouldBeActive) {
          // Reclassify but keep active
          const { error } = await supabase
            .from('competitors')
            .update({ entity_type: newType })
            .eq('id', entity.id)

          if (!error) {
            reclassified++
            changes.push({
              name: entity.name,
              action: 'reclassified',
              from: currentType,
              to: newType,
              reasoning: classification.reasoning,
            })
          }
        } else {
          unchanged++
        }
      }

      return { deactivated, reclassified, unchanged, changes }
    })

    return {
      success: true,
      totalEntities: entities.length,
      classified: classifications.length,
      deactivated: results.deactivated,
      reclassified: results.reclassified,
      unchanged: results.unchanged,
      changes: results.changes,
    }
  }
)
