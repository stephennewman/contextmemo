import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { COMPETITOR_RESEARCH_PROMPT } from '@/lib/ai/prompts/context-extraction'
import { BrandContext } from '@/lib/supabase/types'
import { logSingleUsage } from '@/lib/utils/usage-logger'
import { 
  isBlockedCompetitorName, 
  validateCompetitor,
} from '@/lib/config/competitor-blocklist'

const supabase = createServiceRoleClient()

interface ResearchedCompetitor {
  name: string
  domain: string | null
  description: string
  confidence?: 'high' | 'medium'
  competition_type?: 'direct' | 'partial'
  research_angle?: string
  reasoning?: string
}

// Simple domain validation
function isValidDomain(domain: string | null): boolean {
  if (!domain) return false
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain) && 
         domain.length >= 4 && 
         domain.length <= 253
}

/**
 * Competitor Research - Deep, focused competitor identification
 * 
 * Unlike the broad "competitor/discover" which finds mixed entity types,
 * this function ONLY finds true product competitors using multiple research angles.
 * 
 * Uses gpt-4o-mini for cost efficiency - competitor identification doesn't need
 * the full power of gpt-4o since it's leveraging training knowledge, not analyzing
 * complex documents.
 * 
 * Can be run:
 * - Retroactively on brands with poor competitor data
 * - After context extraction improves (e.g., homepage was initially blank)
 * - On a schedule to discover new market entrants
 */
export const competitorResearch = inngest.createFunction(
  { 
    id: 'competitor-research', 
    name: 'Deep Competitor Research',
    concurrency: { limit: 3 },
  },
  { event: 'competitor/research' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Step 1: Get brand context, existing entities, and rejected entities
    const { brand, existingEntities, rejectedEntities } = await step.run('get-brand-data', async () => {
      const [brandResult, activeResult, inactiveResult] = await Promise.all([
        supabase
          .from('brands')
          .select('*')
          .eq('id', brandId)
          .single(),
        supabase
          .from('competitors')
          .select('name, domain, entity_type')
          .eq('brand_id', brandId)
          .eq('is_active', true),
        supabase
          .from('competitors')
          .select('name, domain')
          .eq('brand_id', brandId)
          .eq('is_active', false)
          .eq('auto_discovered', true),
      ])

      if (brandResult.error || !brandResult.data) {
        throw new Error('Brand not found')
      }

      return { 
        brand: brandResult.data,
        existingEntities: activeResult.data || [],
        rejectedEntities: inactiveResult.data || [],
      }
    })

    const context = brand.context as BrandContext

    // Build the best description we can, even from minimal context
    const descriptionText = context?.description || 
      (context?.homepage_content ? context.homepage_content.slice(0, 3000) : 
        `Company: ${brand.name}, Domain: ${brand.domain || 'unknown'}`)

    // Step 2: Run focused competitor research with gpt-4o-mini
    const researchResults = await step.run('research-competitors', async () => {
      // Format existing entities list
      const existingList = existingEntities.length > 0
        ? existingEntities.map(e => `- ${e.name}${e.domain ? ` (${e.domain})` : ''} [${e.entity_type}]`).join('\n')
        : 'None tracked yet'

      // Format rejected entities list
      const rejectedList = rejectedEntities.length > 0
        ? rejectedEntities.map(e => `- ${e.name}${e.domain ? ` (${e.domain})` : ''}`).join('\n')
        : 'None'

      // Infer primary persona and core problem from context
      const personas = context?.personas || context?.corporate_positioning?.buyer_personas || []
      const primaryPersona = Array.isArray(personas) && personas.length > 0 
        ? (typeof personas[0] === 'string' ? personas[0] : (personas[0] as { title?: string })?.title || 'the target buyer')
        : 'the target buyer'
      
      const coreProblem = context?.corporate_positioning?.core_value_promise || 
        context?.description || 
        `the core problem that ${brand.name} solves`

      const prompt = COMPETITOR_RESEARCH_PROMPT
        .replace(/\{\{company_name\}\}/g, context?.company_name || brand.name)
        .replace('{{domain}}', brand.domain || 'Not specified')
        .replace('{{description}}', descriptionText)
        .replace('{{products}}', (context?.products || []).join(', ') || 'Not specified')
        .replace('{{markets}}', (context?.markets || []).join(', ') || 'Not specified')
        .replace('{{features}}', (context?.features || []).join(', ') || 'Not specified')
        .replace('{{existing_entities}}', existingList)
        .replace('{{rejected_entities}}', rejectedList)
        .replace('{{primary_persona}}', String(primaryPersona))
        .replace('{{core_problem}}', String(coreProblem))

      const { text, usage } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt,
        temperature: 0.3,
      })

      await logSingleUsage(
        brand.tenant_id, brandId, 'competitor_research',
        'gpt-4o-mini', usage?.inputTokens || 0, usage?.outputTokens || 0
      )

      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          throw new Error('No JSON array found in response')
        }
        return JSON.parse(jsonMatch[0]) as ResearchedCompetitor[]
      } catch {
        console.error('Failed to parse competitor research results:', text)
        return []
      }
    })

    // Step 3: Validate and filter
    const validated = await step.run('validate-competitors', async () => {
      return researchResults.filter(c => {
        if (!c.name || c.name.length < 2) return false
        
        if (isBlockedCompetitorName(c.name)) {
          console.log(`[Research] Blocked: ${c.name}`)
          return false
        }
        
        const validation = validateCompetitor({
          name: c.name,
          domain: c.domain,
          entity_type: 'product_competitor',
        })
        
        if (!validation.isValid) {
          console.log(`[Research] Validation failed for ${c.name}: ${validation.reason}`)
          return false
        }
        
        // Domain validation - don't reject, just clear invalid domains
        if (c.domain && !isValidDomain(c.domain)) {
          c.domain = null
        }
        
        // Skip self-references
        if (c.name.toLowerCase() === brand.name.toLowerCase()) return false
        
        // Skip if already exists (active)
        const alreadyExists = existingEntities.some(
          e => e.name.toLowerCase() === c.name.toLowerCase()
        )
        if (alreadyExists) return false
        
        // Skip if previously rejected
        const wasRejected = rejectedEntities.some(
          e => e.name.toLowerCase() === c.name.toLowerCase()
        )
        if (wasRejected) {
          console.log(`[Research] Skipping rejected: ${c.name}`)
          return false
        }
        
        return true
      })
    })

    // Step 4: Save to database
    const saved = await step.run('save-competitors', async () => {
      const typed = validated as ResearchedCompetitor[]
      
      if (typed.length === 0) return []

      const toInsert = typed.map(c => ({
        brand_id: brandId,
        name: c.name,
        domain: c.domain,
        description: c.description,
        auto_discovered: true,
        is_active: true, // All results from research are product competitors, auto-activate
        entity_type: 'product_competitor' as const,
        source_model: 'gpt-4o-mini',
        source_method: 'competitor_research' as const,
        context: {
          confidence: c.confidence || 'medium',
          competition_type: c.competition_type || 'direct',
          research_angle: c.research_angle || null,
          reasoning: c.reasoning || null,
          discovered_at: new Date().toISOString(),
        },
      }))

      const { data, error } = await supabase
        .from('competitors')
        .upsert(toInsert, {
          onConflict: 'brand_id,name',
          ignoreDuplicates: false,
        })
        .select()

      if (error) {
        console.error('Failed to save researched competitors:', error)
        return []
      }

      return data || []
    })

    // Step 5: Trigger enrichment for competitors with domains
    const enrichEvents = (saved as Array<{ id: string; domain?: string }>)
      .filter(c => c.domain)
      .map(c => ({
        name: 'competitor/enrich' as const,
        data: { competitorId: c.id, brandId },
      }))
    
    if (enrichEvents.length > 0) {
      await step.sendEvent('enrich-researched-competitors', enrichEvents)
    }

    // Step 6: Refresh topic universe with new competitors
    for (const competitor of (saved as Array<{ id: string; name: string }>)) {
      try {
        await step.sendEvent(`refresh-topics-${competitor.id}`, {
          name: 'topic/universe-refresh',
          data: {
            brandId,
            newEntityName: competitor.name,
            newEntityType: 'competitor',
          },
        })
      } catch (e) {
        console.log('Topic refresh emit failed (non-critical):', (e as Error).message)
      }
    }

    return {
      success: true,
      researched: researchResults.length,
      validated: validated.length,
      saved: saved.length,
      enriching: enrichEvents.length,
      competitors: (saved as Array<{ name: string; domain?: string }>).map(c => ({
        name: c.name,
        domain: c.domain,
      })),
    }
  }
)
