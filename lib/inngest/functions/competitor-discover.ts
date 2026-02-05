import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { COMPETITOR_DISCOVERY_PROMPT } from '@/lib/ai/prompts/context-extraction'
import { BrandContext } from '@/lib/supabase/types'
import { 
  isBlockedCompetitorName, 
  validateCompetitor,
  getEntityTypeForDomain 
} from '@/lib/config/competitor-blocklist'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Entity types for classification
type EntityType = 
  | 'product_competitor'
  | 'publisher'
  | 'accrediting_body'
  | 'association'
  | 'news_outlet'
  | 'analyst'
  | 'influencer'
  | 'marketplace'
  | 'partner'
  | 'research_institution'
  | 'other'

interface DiscoveredEntity {
  name: string
  domain: string | null
  description: string
  entity_type?: EntityType
  confidence?: 'high' | 'medium'
  competition_type?: 'direct' | 'partial' | 'none'
  is_partner_candidate?: boolean
  partnership_opportunity?: string
  reasoning?: string
}

// Legacy interface for backward compatibility
interface DiscoveredCompetitor extends DiscoveredEntity {}

// Extract competitor mentions from homepage content
function extractMentionedCompetitors(content: string): string[] {
  if (!content) return []
  
  // Common patterns for competitor mentions
  const patterns = [
    /(?:vs\.?|versus|compared to|alternative to|switch from|migrate from|replace)\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)/gi,
    /([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)\s+(?:alternative|competitor|vs\.?|comparison)/gi,
  ]
  
  const mentioned = new Set<string>()
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const name = match[1].trim()
      // Filter out common false positives
      if (name.length > 2 && !['The', 'Our', 'Your', 'This', 'That', 'With', 'From', 'Into'].includes(name)) {
        mentioned.add(name)
      }
    }
  }
  
  return Array.from(mentioned).slice(0, 10) // Limit to 10
}

// Simple domain validation - check if it looks like a real domain
function isValidDomain(domain: string | null): boolean {
  if (!domain) return false
  // Basic validation: has a dot, reasonable length, no spaces
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain) && 
         domain.length >= 4 && 
         domain.length <= 253
}

export const competitorDiscover = inngest.createFunction(
  { id: 'competitor-discover', name: 'Discover Competitors' },
  { event: 'competitor/discover' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Step 1: Get brand context and existing competitors
    const { brand, deletedCompetitors } = await step.run('get-brand-and-history', async () => {
      const { data: brandData, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (error || !brandData) {
        throw new Error('Brand not found')
      }

      // Get previously deleted competitors (to avoid re-suggesting them)
      // We check for competitors that were auto_discovered but are now deleted
      // by looking at the activity_log or checking for is_active = false with no manual add
      const { data: inactiveCompetitors } = await supabase
        .from('competitors')
        .select('name, domain')
        .eq('brand_id', brandId)
        .eq('is_active', false)
        .eq('auto_discovered', true)

      return { 
        brand: brandData, 
        deletedCompetitors: inactiveCompetitors || [] 
      }
    })

    const context = brand.context as BrandContext

    // Check if we have any meaningful context
    if (!context || (!context.description && !context.company_name && !context.homepage_content)) {
      throw new Error('Brand context not available. Run context extraction first.')
    }

    // Step 2: Extract competitors mentioned on website
    const mentionedOnWebsite = await step.run('extract-mentioned-competitors', async () => {
      const homepageContent = context.homepage_content || ''
      return extractMentionedCompetitors(homepageContent)
    })

    // Step 3: Discover competitors using AI with enhanced prompt
    const competitors = await step.run('discover-competitors', async () => {
      // Build comprehensive description
      const descriptionText = context.description || 
        (context.homepage_content ? context.homepage_content.slice(0, 3000) : `Company: ${brand.name}`)
      
      // Format deleted competitors list
      const deletedList = deletedCompetitors.length > 0
        ? deletedCompetitors.map(c => `- ${c.name}${c.domain ? ` (${c.domain})` : ''}`).join('\n')
        : 'None'
      
      // Format mentioned competitors
      const mentionedList = mentionedOnWebsite.length > 0
        ? mentionedOnWebsite.join(', ')
        : 'None found on website'

      const prompt = COMPETITOR_DISCOVERY_PROMPT
        .replace('{{company_name}}', context.company_name || brand.name)
        .replace('{{domain}}', brand.domain || 'Not specified')
        .replace('{{description}}', descriptionText)
        .replace('{{products}}', (context.products || []).join(', ') || 'Not specified')
        .replace('{{markets}}', (context.markets || []).join(', ') || 'Not specified')
        .replace('{{features}}', (context.features || []).join(', ') || 'Not specified')
        .replace('{{mentioned_competitors}}', mentionedList)
        .replace('{{deleted_competitors}}', deletedList)

      const { text } = await generateText({
        model: openai('gpt-4o'),
        prompt,
        temperature: 0.2, // Lower temperature for more consistent results
      })

      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          throw new Error('No JSON array found in response')
        }
        return JSON.parse(jsonMatch[0]) as DiscoveredEntity[]
      } catch {
        console.error('Failed to parse entities:', text)
        return []
      }
    })

    // Step 4: Validate and filter competitors using blocklist
    const validatedCompetitors = await step.run('validate-competitors', async () => {
      return competitors.filter(c => {
        // Must have a name
        if (!c.name || c.name.length < 2) return false
        
        // Check against blocklist first
        if (isBlockedCompetitorName(c.name)) {
          console.log(`Blocked by blocklist: ${c.name}`)
          return false
        }
        
        // Validate and potentially correct entity type
        const validation = validateCompetitor({
          name: c.name,
          domain: c.domain,
          entity_type: c.entity_type,
        })
        
        if (!validation.isValid) {
          console.log(`Validation failed for ${c.name}: ${validation.reason}`)
          return false
        }
        
        // Apply corrected entity type if needed
        if (validation.correctedType) {
          console.log(`Correcting entity type for ${c.name}: ${c.entity_type} -> ${validation.correctedType}`)
          c.entity_type = validation.correctedType as EntityType
        }
        
        // If domain is provided, validate it
        if (c.domain && !isValidDomain(c.domain)) {
          console.log(`Invalid domain for ${c.name}: ${c.domain}`)
          // Don't reject, just clear the invalid domain
          c.domain = null
        }
        
        // Skip if it matches brand name (self-reference)
        if (c.name.toLowerCase() === brand.name.toLowerCase()) return false
        
        // Skip if in deleted list
        const isDeleted = deletedCompetitors.some(
          d => d.name.toLowerCase() === c.name.toLowerCase()
        )
        if (isDeleted) {
          console.log(`Skipping previously deleted competitor: ${c.name}`)
          return false
        }
        
        return true
      })
    })

    // Step 5: Save entities to database
    const savedCompetitors = await step.run('save-entities', async () => {
      // Cast to restore type info lost during Inngest serialization
      const typed = validatedCompetitors as DiscoveredEntity[]
      
      if (typed.length === 0) {
        return []
      }

      const entitiesToInsert = typed.map(c => ({
        brand_id: brandId,
        name: c.name,
        domain: c.domain,
        description: c.description,
        auto_discovered: true,
        // Only auto-activate product competitors, others start inactive
        is_active: c.entity_type === 'product_competitor',
        // New entity classification fields
        entity_type: c.entity_type || 'product_competitor',
        is_partner_candidate: c.is_partner_candidate || false,
        // Store additional metadata in context field
        context: {
          confidence: c.confidence || 'medium',
          competition_type: c.competition_type || 'direct',
          reasoning: c.reasoning || null,
          partnership_opportunity: c.partnership_opportunity || null,
          discovered_at: new Date().toISOString(),
        },
      }))

      // Use upsert to avoid duplicates, but update if exists
      const { data, error } = await supabase
        .from('competitors')
        .upsert(entitiesToInsert, {
          onConflict: 'brand_id,name',
          ignoreDuplicates: false, // Update existing records
        })
        .select()

      if (error) {
        console.error('Failed to save entities:', error)
      }

      return data || []
    })

    // Step 6: Trigger query generation
    await step.sendEvent('trigger-query-generation', {
      name: 'query/generate',
      data: { brandId },
    })

    // Count entities by type
    const typedEntities = savedCompetitors as Array<{ entity_type?: string }>
    const entityTypeCounts = typedEntities.reduce((acc, e) => {
      const type = e.entity_type || 'product_competitor'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      success: true,
      entitiesFound: competitors.length,
      entitiesValidated: validatedCompetitors.length,
      entitiesSaved: savedCompetitors.length,
      mentionedOnWebsite: mentionedOnWebsite.length,
      skippedDeleted: competitors.length - validatedCompetitors.length,
      entityTypeCounts,
      // Legacy fields for backward compatibility
      competitorsFound: competitors.length,
      competitorsValidated: validatedCompetitors.length,
      competitorsSaved: savedCompetitors.length,
    }
  }
)
