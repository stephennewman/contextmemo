import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { crawlWebsite, fetchUrlAsMarkdown, searchWebsite } from '@/lib/utils/jina-reader'
import { logSingleUsage } from '@/lib/utils/usage-logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ============================================================================
// Competitor profile extraction prompt
// ============================================================================

const COMPETITOR_PROFILE_PROMPT = `You are analyzing a competitor's website to build a comprehensive competitive intelligence profile. Extract ONLY information that is explicitly stated or can be reasonably inferred from the content provided.

Analyze the website content and extract the following in JSON format:

{
  "company_name": "Official company name",
  "founded": "Year founded (if mentioned)",
  "headquarters": "City, State/Country (if mentioned)",
  "employee_count": "Approximate size or range (if mentioned)",
  "description": "What the company does in 2-3 factual sentences",
  "products": ["List of specific products or service offerings"],
  "features": ["Key features or capabilities of their platform/product"],
  "markets": ["Target industries or verticals they serve"],
  "use_cases": ["Specific use cases or problems they solve"],
  "customers": ["Named customers or notable clients (if publicly listed)"],
  "integrations": ["Technology integrations or partnerships mentioned"],
  "pricing_model": "How they price (per user, per site, custom, freemium, etc.) - or null if not found",
  "pricing_details": "Any specific pricing info found - or null",
  "value_proposition": "Their primary value proposition in 1-2 sentences",
  "differentiators": ["What they claim makes them unique vs. alternatives"],
  "certifications": ["Any certifications, compliance standards, or accreditations"],
  "technology": ["Key technology mentions (IoT, AI, cloud, mobile, etc.)"],
  "deployment": "How the product is deployed (cloud, on-premise, hybrid, mobile) - or null",
  "target_company_size": "Who they target (SMB, mid-market, enterprise, all) - or null",
  "strengths": ["Apparent strengths based on what they emphasize"],
  "potential_weaknesses": ["Gaps or areas not addressed based on what's NOT mentioned - be careful, only note obvious omissions"]
}

RULES:
1. Only extract what's explicitly stated or clearly implied - DO NOT fabricate information
2. If information is not available, use null for strings or empty arrays for lists
3. Be specific - "temperature monitoring" is better than "monitoring"
4. For strengths/weaknesses, base them on actual content, not assumptions
5. Keep descriptions factual and neutral - no marketing language
6. If multiple products exist, list them all separately`

// ============================================================================
// Inngest function: Enrich a single competitor
// ============================================================================

export const competitorEnrich = inngest.createFunction(
  {
    id: 'competitor-enrich',
    name: 'Enrich Competitor Profile',
    concurrency: { limit: 2 }, // Limit concurrent crawls
    throttle: { limit: 5, period: '1m' }, // Rate limit
  },
  { event: 'competitor/enrich' },
  async ({ event, step }) => {
    const { competitorId, brandId } = event.data

    // Step 1: Get competitor data
    const competitor = await step.run('get-competitor', async () => {
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .eq('id', competitorId)
        .single()

      if (error || !data) throw new Error('Competitor not found')
      return data
    })

    if (!competitor.domain) {
      return { success: false, reason: 'No domain available' }
    }

    // Skip if already enriched recently (within 7 days)
    const existingContext = competitor.context as Record<string, unknown> | null
    if (existingContext?.enriched_at) {
      const enrichedAt = new Date(existingContext.enriched_at as string)
      const daysSince = (Date.now() - enrichedAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSince < 7) {
        return { success: true, skipped: true, reason: 'Already enriched within 7 days' }
      }
    }

    // Step 2: Crawl competitor website
    const websiteContent = await step.run('crawl-competitor', async () => {
      let content = ''
      let source = 'none'

      try {
        // Crawl up to 8 pages
        const pages = await crawlWebsite(`https://${competitor.domain}`, 8)
        if (pages.length > 0) {
          content = pages
            .map(p => `## ${p.title}\nURL: ${p.url}\n\n${p.content}`)
            .join('\n\n---\n\n')
          source = `crawl (${pages.length} pages)`
        }
      } catch (e) {
        console.error(`Crawl failed for ${competitor.domain}:`, e)
      }

      // Fallback: single page fetch
      if (content.length < 500) {
        try {
          const page = await fetchUrlAsMarkdown(`https://${competitor.domain}`)
          if (page.content && page.content.length > 200) {
            content = page.content
            source = 'single-page'
          }
        } catch (e) {
          console.error(`Single page fetch failed for ${competitor.domain}:`, e)
        }
      }

      // Fallback: web search
      if (content.length < 500) {
        try {
          const companyName = competitor.name || competitor.domain.replace(/\.(com|net|org|io|co)$/, '')
          const searchResult = await searchWebsite(competitor.domain, `${companyName} products features pricing`)
          if (searchResult && searchResult.length > 200) {
            content = searchResult
            source = 'web-search'
          }
        } catch (e) {
          console.error(`Web search failed for ${competitor.domain}:`, e)
        }
      }

      if (content.length < 200) {
        return { content: '', source: 'none' }
      }

      return { content: content.slice(0, 40000), source }
    })

    if (websiteContent.content.length < 200) {
      // Mark as attempted but failed
      await step.run('mark-failed', async () => {
        await supabase
          .from('competitors')
          .update({
            context: {
              ...(existingContext || {}),
              enrichment_attempted: true,
              enrichment_failed_at: new Date().toISOString(),
              enrichment_source: websiteContent.source,
            },
          })
          .eq('id', competitorId)
      })
      return { success: false, reason: 'Could not fetch website content' }
    }

    // Get tenant_id for usage logging
    const tenantId = await step.run('get-tenant', async () => {
      const { data } = await supabase.from('brands').select('tenant_id').eq('id', brandId).single()
      return data?.tenant_id || ''
    })

    // Step 3: Extract profile using AI
    const profile = await step.run('extract-profile', async () => {
      // Clean content
      const cleanContent = websiteContent.content
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[Image \d+:.*?\]/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s{3,}/g, ' ')
        .trim()
        .slice(0, 30000)

      const { text, usage: enrichUsage } = await generateText({
        model: openai('gpt-4o'),
        system: COMPETITOR_PROFILE_PROMPT,
        prompt: `Extract a competitive intelligence profile from this website content for: ${competitor.name} (${competitor.domain})\n\n${cleanContent}`,
        temperature: 0.2,
      })

      if (tenantId) {
        await logSingleUsage(tenantId, brandId, 'competitor_enrich', 'gpt-4o', enrichUsage?.inputTokens || 0, enrichUsage?.outputTokens || 0)
      }

      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse competitor profile JSON')
      }

      return JSON.parse(jsonMatch[0])
    })

    // Step 4: Save enriched profile
    await step.run('save-profile', async () => {
      const enrichedContext = {
        ...(existingContext || {}),
        ...profile,
        // Metadata
        enriched_at: new Date().toISOString(),
        enrichment_source: websiteContent.source,
        enrichment_version: 2, // v2 = deep enrichment (v1 = citation-loop basic)
      }

      await supabase
        .from('competitors')
        .update({
          context: enrichedContext,
          context_extracted_at: new Date().toISOString(),
          description: profile.description || competitor.description,
        })
        .eq('id', competitorId)
    })

    console.log(`Enriched competitor: ${competitor.name} (${competitor.domain}) via ${websiteContent.source}`)

    return {
      success: true,
      competitor: competitor.name,
      domain: competitor.domain,
      source: websiteContent.source,
      fieldsExtracted: Object.keys(profile).filter(k => {
        const v = profile[k]
        return v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
      }).length,
    }
  }
)

// ============================================================================
// Inngest function: Batch enrich all active competitors for a brand
// ============================================================================

export const competitorEnrichBatch = inngest.createFunction(
  {
    id: 'competitor-enrich-batch',
    name: 'Batch Enrich Competitors',
  },
  { event: 'competitor/enrich-batch' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Get all active competitors that need enrichment
    const competitors = await step.run('get-competitors', async () => {
      const { data } = await supabase
        .from('competitors')
        .select('id, name, domain, context, context_extracted_at')
        .eq('brand_id', brandId)
        .eq('is_active', true)
        .not('domain', 'is', null)

      if (!data) return []

      // Filter to those that need enrichment
      return data.filter(c => {
        const ctx = c.context as Record<string, unknown> | null
        // No context at all
        if (!ctx || Object.keys(ctx).length === 0) return true
        // Only basic citation-loop context (version 1 or no version)
        if (!ctx.enrichment_version || (ctx.enrichment_version as number) < 2) return true
        // Enriched more than 14 days ago
        if (ctx.enriched_at) {
          const daysSince = (Date.now() - new Date(ctx.enriched_at as string).getTime()) / (1000 * 60 * 60 * 24)
          return daysSince > 14
        }
        return true
      })
    })

    if (competitors.length === 0) {
      return { success: true, message: 'All competitors already enriched' }
    }

    // Trigger enrichment for each (Inngest handles concurrency)
    const events = competitors.slice(0, 20).map(c => ({
      name: 'competitor/enrich' as const,
      data: { competitorId: c.id, brandId },
    }))

    await step.sendEvent('enrich-competitors', events)

    return {
      success: true,
      triggered: events.length,
      competitors: competitors.map(c => c.name),
    }
  }
)
