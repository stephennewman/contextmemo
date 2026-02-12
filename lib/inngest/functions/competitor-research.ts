import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { COMPETITOR_RESEARCH_PROMPT } from '@/lib/ai/prompts/context-extraction'
import { BrandContext } from '@/lib/supabase/types'
import { logSingleUsage } from '@/lib/utils/usage-logger'
import { queryPerplexity } from '@/lib/utils/perplexity'
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
  source_urls?: string[]  // URLs where this competitor was found (from Sonar)
}

// Simple domain validation
function isValidDomain(domain: string | null): boolean {
  if (!domain) return false
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(domain) && 
         domain.length >= 4 && 
         domain.length <= 253
}

/**
 * Build targeted search queries for Sonar based on brand context.
 * Uses CATEGORY-FIRST queries (not just brand-name queries) because small brands
 * won't have many "[brand] vs X" pages. The category searches surface the full
 * competitive landscape even when the brand itself isn't well-known.
 * Returns up to 8 queries for comprehensive coverage.
 */
function buildSonarQueries(brandName: string, context: BrandContext | null): string[] {
  const queries: string[] = []
  const products = context?.products || []
  const markets = context?.markets || []
  const description = context?.description || ''
  
  // 1. Brand-specific searches (useful if the brand has any web presence)
  queries.push(`${brandName} competitors and alternatives 2025 2026`)
  
  // 2. Category-first searches — these are the most important for finding the full landscape
  // Use ALL product terms, not just the first
  const productTerms: string[] = []
  for (const p of products.slice(0, 3)) {
    const term = typeof p === 'string' ? p : (p as { name?: string })?.name || ''
    if (term && !productTerms.includes(term.toLowerCase())) {
      productTerms.push(term.toLowerCase())
    }
  }
  
  if (productTerms.length > 0) {
    // "best OKR software tools 2026" — the money query for finding competitors
    queries.push(`best ${productTerms[0]} tools 2026 comparison list`)
    // "top OKR platforms compared" — different phrasing catches different results
    queries.push(`top ${productTerms[0]} platforms compared reviews`)
    // Second product term if available
    if (productTerms[1]) {
      queries.push(`best ${productTerms[1]} tools software comparison 2026`)
    }
  } else if (description) {
    const shortDesc = description.slice(0, 80).replace(/[^a-zA-Z0-9 ]/g, '')
    queries.push(`best ${shortDesc} software tools comparison 2026`)
  }
  
  // 3. Market-specific searches
  for (const m of markets.slice(0, 2)) {
    const market = typeof m === 'string' ? m : ''
    if (market) {
      queries.push(`${market} software tools market landscape 2026`)
      break // One market query is enough
    }
  }
  
  // 4. Review site category searches — G2, Capterra lists are gold for competitor discovery
  if (productTerms.length > 0) {
    queries.push(`G2 best ${productTerms[0]} software category 2026`)
    queries.push(`Capterra ${productTerms[0]} tools top rated`)
  } else {
    queries.push(`${brandName} G2 Capterra reviews category competitors`)
  }
  
  // 5. Market map / landscape search
  if (productTerms.length > 0) {
    queries.push(`${productTerms[0]} market map vendors landscape complete list`)
  }
  
  return queries.slice(0, 8) // Cap at 8 queries
}

/**
 * Competitor Research - Two-stage pipeline:
 * 
 * Stage 1 (Sonar): Real-time web search for competitors with source URLs
 *   - Searches for "[brand] competitors", "[brand] vs", category comparisons
 *   - Returns competitor names + the actual URLs where they were found
 * 
 * Stage 2 (GPT-4o-mini): Validate, classify, and enrich Sonar findings
 *   - Filters out non-competitors (tools, publishers, etc.)
 *   - Adds competition_type, confidence, reasoning
 *   - Supplements with training knowledge if Sonar missed any
 * 
 * Total cost per brand: ~1-2 cents
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

    // ================================================================
    // STAGE 1: Sonar web search - find competitors from live web data
    // ================================================================
    const sonarFindings = await step.run('sonar-web-search', async () => {
      const searchQueries = buildSonarQueries(brand.name, context)
      
      const allMentions = new Map<string, { 
        count: number
        sourceUrls: Set<string>
        snippets: string[]
      }>()
      
      let totalInputTokens = 0
      let totalOutputTokens = 0
      
      for (const query of searchQueries) {
        try {
          const result = await queryPerplexity(query, 
            `You are researching competitors for ${brand.name} (${brand.domain || 'unknown domain'}). ` +
            `List every company, product, or tool mentioned as a competitor, alternative, or comparable solution. ` +
            `For each one, provide the company name and domain if known. ` +
            `Format: "- CompanyName (domain.com): brief description"`,
            {
              model: 'sonar',
              searchContextSize: 'medium',
              temperature: 0.2,
            }
          )
          
          // Track usage
          if (result.usage) {
            totalInputTokens += result.usage.promptTokens
            totalOutputTokens += result.usage.completionTokens
          }
          
          // Extract company names from the response text using multiple patterns
          // Sonar output varies: bullet lists, numbered lists, bold text, inline mentions
          const lines = result.text.split('\n')
          for (const line of lines) {
            const patterns = [
              // "- Name (domain.com): description" or "- **Name**: description"
              /^[-•*]\s+\*?\*?([A-Z][A-Za-z0-9. ]+?)(?:\*\*)?(?:\s*\(([a-z0-9.-]+\.[a-z]{2,})\))?\s*[:\-–—]/,
              // "1. Name (domain.com)" or "1. **Name**"
              /^\d+[.)]\s+\*?\*?([A-Z][A-Za-z0-9. ]+?)(?:\*\*)?(?:\s*\(([a-z0-9.-]+\.[a-z]{2,})\))?\s*[:\-–—]/,
              // "**Name** (domain.com)" at start of line
              /^\*\*([A-Z][A-Za-z0-9. ]+?)\*\*(?:\s*\(([a-z0-9.-]+\.[a-z]{2,})\))?/,
              // "Name (domain.com) -" without leading bullet
              /^([A-Z][A-Za-z0-9. ]{2,40}?)(?:\s*\(([a-z0-9.-]+\.[a-z]{2,})\))?\s*[-–—:]/,
            ]
            
            for (const pattern of patterns) {
              const match = line.match(pattern)
              if (match) {
                const name = match[1].trim().replace(/\*+/g, '')
                const domain = match[2] || null
                
                if (name.length >= 2 && name.length <= 50) {
                  const key = name.toLowerCase()
                  if (!allMentions.has(key)) {
                    allMentions.set(key, { count: 0, sourceUrls: new Set(), snippets: [] })
                  }
                  const entry = allMentions.get(key)!
                  entry.count++
                  if (domain) entry.snippets.push(domain)
                  for (const url of result.citations) {
                    entry.sourceUrls.add(url)
                  }
                }
                break // First match wins for this line
              }
            }
          }
          
          // Also extract from citations - if a domain appears in citations, it might be a competitor
          for (const url of result.citations) {
            try {
              const urlDomain = new URL(url).hostname.replace('www.', '').toLowerCase()
              // Skip known non-competitor domains
              const skipDomains = ['g2.com', 'capterra.com', 'gartner.com', 'forbes.com', 'techcrunch.com',
                'wikipedia.org', 'youtube.com', 'linkedin.com', 'twitter.com', 'reddit.com',
                'medium.com', 'hubspot.com', 'salesforce.com', 'google.com', 'bing.com',
                'trustradius.com', 'getapp.com', 'softwareadvice.com', 'pcmag.com',
                'crozdesk.com', 'selecthub.com', 'slashdot.org', 'sourceforge.net',
                'producthunt.com', 'alternativeto.net', 'stackshare.io',
                brand.domain?.replace('www.', '').toLowerCase() || '']
              if (skipDomains.some(d => urlDomain.includes(d))) continue
              if (urlDomain.endsWith('.gov') || urlDomain.endsWith('.edu')) continue
              
              // Infer company name from domain
              const baseName = urlDomain.split('.')[0]
                .split('-')
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join('')
              
              if (baseName.length >= 2) {
                const key = baseName.toLowerCase()
                if (!allMentions.has(key)) {
                  allMentions.set(key, { count: 0, sourceUrls: new Set(), snippets: [] })
                }
                const entry = allMentions.get(key)!
                entry.count++
                entry.sourceUrls.add(url)
                entry.snippets.push(urlDomain)
              }
            } catch { /* skip invalid URLs */ }
          }
        } catch (e) {
          console.log(`[Research] Sonar query failed (non-critical): "${query}" -`, (e as Error).message)
        }
      }
      
      // Final query: comprehensive enumeration — ask Sonar to produce a complete vendor list
      // This catches names that individual searches may have mentioned but our regex missed
      const productTerms = (context?.products || []).slice(0, 2).map(
        p => typeof p === 'string' ? p : (p as { name?: string })?.name || ''
      ).filter(Boolean)
      const categoryName = productTerms[0] || brand.name
      
      try {
        const enumResult = await queryPerplexity(
          `Complete list of all ${categoryName} vendors tools and platforms available in 2025 2026`,
          `List EVERY ${categoryName} vendor, tool, and platform that exists in the market today. ` +
          `Include market leaders, mid-market players, niche tools, and new entrants. ` +
          `Be comprehensive — most software categories have 20-40+ vendors. ` +
          `For each, provide: "- CompanyName (domain.com)" on its own line. Nothing else.`,
          {
            model: 'sonar',
            searchContextSize: 'high',
            temperature: 0.1,
          }
        )
        
        if (enumResult.usage) {
          totalInputTokens += enumResult.usage.promptTokens
          totalOutputTokens += enumResult.usage.completionTokens
        }
        
        // Parse the enumeration response — should be a clean list
        for (const line of enumResult.text.split('\n')) {
          // Match "- Name (domain)" or "- Name" patterns
          const match = line.match(/^[-•*\d.)]+\s*\*?\*?([A-Z][A-Za-z0-9. ]+?)(?:\*\*)?(?:\s*\(([a-z0-9.-]+\.[a-z]{2,})\))?(?:\s*[-:–—]|$)/)
          if (match) {
            const name = match[1].trim().replace(/\*+/g, '')
            const domain = match[2] || null
            if (name.length >= 2 && name.length <= 50) {
              const key = name.toLowerCase()
              if (!allMentions.has(key)) {
                allMentions.set(key, { count: 0, sourceUrls: new Set(), snippets: [] })
              }
              const entry = allMentions.get(key)!
              entry.count++
              if (domain) entry.snippets.push(domain)
              for (const url of enumResult.citations) {
                entry.sourceUrls.add(url)
              }
            }
          }
        }
        console.log(`[Research] Enumeration query found additional names, total candidates now: ${allMentions.size}`)
      } catch (e) {
        console.log(`[Research] Enumeration query failed (non-critical):`, (e as Error).message)
      }
      
      // Log Sonar usage
      if (totalInputTokens > 0 || totalOutputTokens > 0) {
        await logSingleUsage(
          brand.tenant_id, brandId, 'competitor_research_sonar',
          'perplexity-sonar', totalInputTokens, totalOutputTokens
        )
      }
      
      // Convert to array, sorted by mention count
      const findings = Array.from(allMentions.entries())
        .map(([key, data]) => ({
          name: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize
          mentionCount: data.count,
          sourceUrls: Array.from(data.sourceUrls).slice(0, 5), // Cap at 5 URLs
          inferredDomain: data.snippets.find(s => s.includes('.')) || null,
        }))
        .sort((a, b) => b.mentionCount - a.mentionCount)
        .slice(0, 40) // Top 40 candidates for GPT to classify
      
      console.log(`[Research] Sonar found ${findings.length} candidate competitors for ${brand.name}`)
      return { findings, queriesRun: searchQueries.length }
    })

    // ================================================================
    // STAGE 2: GPT-4o-mini validation + classification + gap filling
    // ================================================================
    const researchResults = await step.run('classify-and-research', async () => {
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

      // Build Sonar findings context for the prompt
      const sonarContext = sonarFindings.findings.length > 0
        ? '\n\n## WEB SEARCH FINDINGS (from live search - validate these)\n' +
          'The following companies were found via web search as potential competitors. ' +
          'Validate each one - confirm if they are TRUE product competitors, and include them in your output if so:\n' +
          sonarFindings.findings.map(f => 
            `- ${f.name}${f.inferredDomain ? ` (${f.inferredDomain})` : ''} — mentioned ${f.mentionCount}x`
          ).join('\n') +
          '\n\n## IMPORTANT: FILL GAPS FROM YOUR OWN KNOWLEDGE\n' +
          'The web search above may have missed competitors. You MUST also add any competitors ' +
          'you know of from your training data that are NOT in the web search findings or existing entities list. ' +
          'Think about: well-known market leaders, mid-market players, niche/emerging tools, and ' +
          'products from larger companies (e.g. Microsoft Viva Goals from Ally.io acquisition). ' +
          'Do NOT limit yourself to only what the web search found.'
        : '\n\n## IMPORTANT: USE YOUR TRAINING KNOWLEDGE\n' +
          'No web search findings are available. You must rely entirely on your training knowledge ' +
          'to identify ALL competitors in this space. Be thorough.'

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
        + sonarContext

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
        const parsed = JSON.parse(jsonMatch[0]) as ResearchedCompetitor[]
        
        // Attach Sonar source URLs to matching competitors
        for (const competitor of parsed) {
          const sonarMatch = sonarFindings.findings.find(f => 
            f.name.toLowerCase() === competitor.name.toLowerCase() ||
            (competitor.domain && f.inferredDomain && 
             f.inferredDomain.includes(competitor.domain.replace('www.', '')))
          )
          if (sonarMatch) {
            competitor.source_urls = sonarMatch.sourceUrls
          }
        }
        
        return parsed
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

    // ================================================================
    // STAGE 3: Per-competitor citation enrichment via Sonar
    // Fires targeted "[brand] vs [competitor]" searches to get specific
    // comparison URLs, review pages, and head-to-head content.
    // ================================================================
    const enrichedCompetitors = await step.run('enrich-citations', async () => {
      const typed = validated as ResearchedCompetitor[]
      if (typed.length === 0) return typed
      
      let totalInputTokens = 0
      let totalOutputTokens = 0
      
      // Fire a targeted search per competitor (parallel, batched by 3)
      for (let i = 0; i < typed.length; i += 3) {
        const batch = typed.slice(i, i + 3)
        
        await Promise.allSettled(batch.map(async (competitor) => {
          try {
            const searchQuery = `${brand.name} vs ${competitor.name} comparison review`
            
            const result = await queryPerplexity(searchQuery,
              `Find comparison pages, reviews, and head-to-head analyses between ${brand.name} and ${competitor.name}. ` +
              `List the most relevant URLs that compare these two products.`,
              {
                model: 'sonar',
                searchContextSize: 'low',
                temperature: 0.1,
              }
            )
            
            if (result.usage) {
              totalInputTokens += result.usage.promptTokens
              totalOutputTokens += result.usage.completionTokens
            }
            
            // Merge new citations with any existing source URLs
            const existingUrls = new Set(competitor.source_urls || [])
            for (const url of result.citations) {
              existingUrls.add(url)
            }
            // Also grab URLs from search results
            for (const sr of result.searchResults) {
              if (sr.url) existingUrls.add(sr.url)
            }
            
            competitor.source_urls = Array.from(existingUrls).slice(0, 10) // Cap at 10
          } catch (e) {
            console.log(`[Research] Citation enrichment failed for ${competitor.name} (non-critical):`, (e as Error).message)
          }
        }))
      }
      
      // Log citation enrichment usage
      if (totalInputTokens > 0 || totalOutputTokens > 0) {
        await logSingleUsage(
          brand.tenant_id, brandId, 'competitor_research_citations',
          'perplexity-sonar', totalInputTokens, totalOutputTokens
        )
      }
      
      console.log(`[Research] Enriched citations for ${typed.length} competitors`)
      return typed
    })

    // Step 4: Save to database
    const saved = await step.run('save-competitors', async () => {
      const typed = enrichedCompetitors as ResearchedCompetitor[]
      
      if (typed.length === 0) return []

      const toInsert = typed.map(c => ({
        brand_id: brandId,
        name: c.name,
        domain: c.domain,
        description: c.description,
        auto_discovered: true,
        is_active: true,
        entity_type: 'product_competitor' as const,
        source_model: 'perplexity-sonar+gpt-4o-mini',
        source_method: 'competitor_research' as const,
        context: {
          confidence: c.confidence || 'medium',
          competition_type: c.competition_type || 'direct',
          research_angle: c.research_angle || null,
          reasoning: c.reasoning || null,
          source_urls: c.source_urls || [],
          sonar_queries: sonarFindings.queriesRun,
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
      sonarCandidates: sonarFindings.findings.length,
      sonarQueries: sonarFindings.queriesRun,
      researched: researchResults.length,
      validated: validated.length,
      citationsEnriched: enrichedCompetitors.length,
      saved: saved.length,
      enriching: enrichEvents.length,
      competitors: (saved as Array<{ name: string; domain?: string }>).map(c => ({
        name: c.name,
        domain: c.domain,
      })),
    }
  }
)
