/**
 * Topic Universe Generator
 * 
 * Builds the complete set of content topics a brand should have for maximum
 * AI visibility, scores each by priority, and matches against existing content.
 * 
 * Flow:
 * 1. Build site content inventory (sitemap + classification + deep-read)
 * 2. Fetch brand context, competitors, existing memos
 * 3. Generate full topic universe via AI (one call)
 * 4. AI marks each topic as covered/gap/partial based on existing content
 * 5. Upsert into topic_universe table
 * 6. Calculate and return coverage score
 */

import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { buildSiteInventory } from '@/lib/utils/site-inventory'
import { BrandContext, TopicCategory, TopicContentType, SitePageEntry, CoverageScore } from '@/lib/supabase/types'
import { logSingleUsage, normalizeModelId } from '@/lib/utils/usage-logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Lazy-load OpenRouter
let _openrouter: ReturnType<typeof import('@openrouter/ai-sdk-provider').createOpenRouter> | null = null

async function getOpenRouter() {
  if (!_openrouter) {
    const { createOpenRouter } = await import('@openrouter/ai-sdk-provider')
    _openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    })
  }
  return _openrouter
}

// ============================================================================
// Topic generation prompt
// ============================================================================

const TOPIC_UNIVERSE_PROMPT = `You are a B2B content strategist specializing in AI visibility. Your task is to generate the COMPLETE set of content topics a brand needs for maximum visibility in AI-powered search engines (ChatGPT, Claude, Perplexity, Gemini).

## BRAND INFORMATION
- **Name**: {{brand_name}}
- **Domain**: {{brand_domain}}
- **Description**: {{brand_description}}
- **Products/Services**: {{brand_products}}
- **Markets**: {{brand_markets}}
- **Features**: {{brand_features}}
- **Certifications**: {{brand_certifications}}

## COMPETITORS
{{competitor_list}}

## TARGET PERSONAS
{{persona_list}}

## EXISTING CONTENT ON BRAND'S WEBSITE
These are pages that already exist on the brand's website (from their sitemap):
{{existing_site_pages}}

## EXISTING MEMOS (AI-optimized content already created)
{{existing_memos}}

## YOUR TASK

Generate the COMPLETE set of content topics this brand needs. Think about:

1. **Comparisons** (vs each competitor): Direct comparison pages are the #1 driver of AI citations. Generate one for EACH competitor listed above.
2. **Alternatives** (to each competitor): "Alternatives to [Competitor]" pages capture high-intent switchers. Generate one for EACH competitor.
3. **How-to Guides**: Step-by-step guides that position the brand as the solution. Focus on problems the target personas actually face.
4. **Industry Guides**: Content for each vertical market the brand serves. How does the solution apply to [industry]?
5. **Definitions**: "What is [concept]?" pages that establish authority on key terms in the space.
6. **Use Cases**: Specific application scenarios that demonstrate value.

## MATCHING RULES

For each topic you generate, check if the brand ALREADY has content covering it:
- Check the "Existing Content" list (website pages) - if a page clearly covers this topic, mark as "covered" and reference the URL
- Check the "Existing Memos" list - if a memo covers this topic, mark as "covered" and reference the memo title
- If a page partially covers the topic (mentions it but isn't dedicated to it), mark as "partial"
- If nothing covers it, mark as "gap"

Be conservative: only mark "covered" if there's a dedicated, substantive piece on this exact topic. A passing mention in another article does NOT count as coverage.

## PRIORITY SCORING (0-100)

Score each topic by potential impact on AI visibility:
- 90-100: Table stakes content that multiple competitors have (comparisons, alternatives)
- 70-89: High-value content in the brand's core market (industry guides, key how-tos)
- 50-69: Valuable but lower urgency (secondary markets, niche use cases)
- 30-49: Nice to have (definitions, tangential topics)
- 0-29: Low priority filler content

Factors that increase priority:
- More competitors likely have this content (+10 per competitor)
- Content type is comparison or alternative (+15)
- Target persona is primary buyer (+10)
- Bottom-funnel intent (+10)

## OUTPUT FORMAT

Return a JSON array. Generate between 40-150 topics depending on market breadth.

[
  {
    "title": "Specific, descriptive content title",
    "category": "comparisons" | "alternatives" | "how_tos" | "industry_guides" | "definitions" | "use_cases",
    "content_type": "comparison" | "alternative" | "how_to" | "industry" | "definition" | "guide",
    "description": "1-2 sentence description of what this content should cover",
    "target_persona": "Primary persona this serves (or null)",
    "funnel_stage": "top_funnel" | "mid_funnel" | "bottom_funnel",
    "competitor_relevance": ["Competitor names relevant to this topic"],
    "estimated_competitor_coverage": 0-5,
    "priority_score": 0-100,
    "impact_rationale": "Why this priority score",
    "status": "gap" | "partial" | "covered",
    "matched_url": "/path/to/existing/page or null",
    "matched_memo": "Existing memo title or null"
  }
]

CRITICAL: 
- Generate comparison AND alternative topics for EVERY competitor
- Be specific in titles (not "Temperature Guide" but "HACCP Temperature Monitoring Compliance Guide for Restaurant Chains")
- Every topic must be actionable as a content piece
- Return ONLY valid JSON array, no explanations`

// ============================================================================
// Helper: format data for prompt
// ============================================================================

function formatCompetitorList(competitors: Array<{ name: string; domain?: string; description?: string; entity_type?: string }>): string {
  if (competitors.length === 0) return 'No competitors discovered yet.'
  return competitors.map(c => {
    const parts = [`- **${c.name}**`]
    if (c.domain) parts.push(`(${c.domain})`)
    if (c.entity_type && c.entity_type !== 'competitor') parts.push(`[${c.entity_type}]`)
    if (c.description) parts.push(`- ${c.description}`)
    return parts.join(' ')
  }).join('\n')
}

function formatPersonaList(personas: BrandContext['personas']): string {
  if (!personas || personas.length === 0) return 'No specific personas defined.'
  return personas.map(p => {
    return `- **${p.title || 'Unnamed'}** (${p.seniority || 'unknown'} / ${p.function || 'unknown'})`
  }).join('\n')
}

function formatSitePages(pages: SitePageEntry[]): string {
  if (pages.length === 0) return 'No existing content found on website.'
  
  // Group by content type for readability
  const grouped: Record<string, SitePageEntry[]> = {}
  for (const page of pages) {
    const type = page.content_type
    if (!grouped[type]) grouped[type] = []
    grouped[type].push(page)
  }

  const sections: string[] = []
  for (const [type, typePages] of Object.entries(grouped)) {
    sections.push(`### ${type.toUpperCase()} (${typePages.length} pages)`)
    for (const page of typePages.slice(0, 50)) { // Cap per type to keep prompt size manageable
      const parts = [`- ${page.url}`]
      if (page.title) parts.push(`"${page.title}"`)
      if (page.topics.length > 0) parts.push(`[${page.topics.join(', ')}]`)
      if (page.content_quality) parts.push(`(${page.word_count} words, ${page.content_quality})`)
      sections.push(parts.join(' '))
    }
  }

  return sections.join('\n')
}

function formatExistingMemos(memos: Array<{ title: string; memo_type: string; slug: string; status: string }>): string {
  if (memos.length === 0) return 'No memos generated yet.'
  return memos.map(m => `- [${m.memo_type}] "${m.title}" (${m.status}) - /${m.slug}`).join('\n')
}

// ============================================================================
// Topic Universe Generate function
// ============================================================================

interface GeneratedTopic {
  title: string
  category: string
  content_type: string
  description: string | null
  target_persona: string | null
  funnel_stage: string | null
  competitor_relevance: string[]
  estimated_competitor_coverage: number
  priority_score: number
  impact_rationale: string | null
  status: string
  matched_url: string | null
  matched_memo: string | null
}

export const topicUniverseGenerate = inngest.createFunction(
  {
    id: 'topic-universe-generate',
    name: 'Generate Topic Universe',
    concurrency: { limit: 2 },
  },
  { event: 'topic/universe-generate' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Step 1: Get brand data
    const brandData = await step.run('get-brand-data', async () => {
      const [brandResult, competitorsResult, memosResult] = await Promise.all([
        supabase.from('brands').select('*').eq('id', brandId).single(),
        supabase.from('competitors').select('*').eq('brand_id', brandId).eq('is_active', true),
        supabase.from('memos').select('id, title, memo_type, slug, status').eq('brand_id', brandId),
      ])

      if (brandResult.error || !brandResult.data) {
        throw new Error('Brand not found')
      }

      return {
        brand: brandResult.data,
        competitors: competitorsResult.data || [],
        memos: memosResult.data || [],
      }
    })

    const context = brandData.brand.context as BrandContext

    // Step 2: Build site content inventory
    const siteInventory = await step.run('build-site-inventory', async () => {
      try {
        return await buildSiteInventory(brandData.brand.domain, {
          maxUrls: 500,
          maxDeepRead: 15,
        })
      } catch (e) {
        console.error('Site inventory failed:', e)
        // Fall back to existing_pages from context extraction
        const existingPages = context?.existing_pages || []
        return {
          pages: existingPages.map(p => ({
            url: p.url,
            title: p.title || null,
            content_type: (p.content_type || 'other') as SitePageEntry['content_type'],
            topics: p.topics || [],
            lastmod: null,
            word_count: null,
            content_quality: null,
          })),
          stats: {
            sitemap_urls_found: 0,
            pages_classified: existingPages.length,
            pages_deep_read: 0,
            source: 'none' as const,
          }
        }
      }
    })

    // Step 3: Generate topic universe
    const topics = await step.run('generate-topics', async () => {
      const openrouter = await getOpenRouter()

      const prompt = TOPIC_UNIVERSE_PROMPT
        .replace('{{brand_name}}', brandData.brand.name)
        .replace('{{brand_domain}}', brandData.brand.domain)
        .replace('{{brand_description}}', context?.description || brandData.brand.description || '')
        .replace('{{brand_products}}', (context?.products || []).join(', ') || 'Not specified')
        .replace('{{brand_markets}}', (context?.markets || []).join(', ') || 'Not specified')
        .replace('{{brand_features}}', (context?.features || []).join(', ') || 'Not specified')
        .replace('{{brand_certifications}}', (context?.certifications || []).join(', ') || 'Not specified')
        .replace('{{competitor_list}}', formatCompetitorList(brandData.competitors))
        .replace('{{persona_list}}', formatPersonaList(context?.personas))
        .replace('{{existing_site_pages}}', formatSitePages(siteInventory.pages))
        .replace('{{existing_memos}}', formatExistingMemos(brandData.memos))

      const { text, usage } = await generateText({
        model: openrouter('openai/gpt-4o'),
        prompt,
        temperature: 0.3,
      })

      // Log usage
      await logSingleUsage(
        brandData.brand.tenant_id, brandId, 'topic_universe',
        normalizeModelId('openai/gpt-4o'),
        usage?.inputTokens || 0, usage?.outputTokens || 0
      )

      // Parse JSON response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('Failed to parse topic universe response - no JSON array found')
      }

      const parsed = JSON.parse(jsonMatch[0]) as GeneratedTopic[]

      // Validate and normalize
      const validCategories: TopicCategory[] = ['comparisons', 'alternatives', 'how_tos', 'industry_guides', 'definitions', 'use_cases']
      const validContentTypes: TopicContentType[] = ['comparison', 'alternative', 'how_to', 'industry', 'definition', 'guide']
      const validStatuses = ['gap', 'partial', 'covered']

      return parsed
        .filter(t => t.title && t.category && t.content_type)
        .map(t => ({
          ...t,
          category: validCategories.includes(t.category as TopicCategory) ? t.category : 'use_cases',
          content_type: validContentTypes.includes(t.content_type as TopicContentType) ? t.content_type : 'guide',
          status: validStatuses.includes(t.status) ? t.status : 'gap',
          priority_score: Math.max(0, Math.min(100, t.priority_score || 50)),
          competitor_relevance: Array.isArray(t.competitor_relevance) ? t.competitor_relevance : [],
          estimated_competitor_coverage: Math.max(0, Math.min(5, t.estimated_competitor_coverage || 0)),
        }))
    })

    // Step 4: Match topics to existing memos by ID
    const topicsWithMemoMatch = await step.run('match-memos', async () => {
      // Build a lookup of memos by normalized title
      const memoLookup = new Map<string, string>()
      for (const memo of brandData.memos) {
        if (memo.title) {
          memoLookup.set(memo.title.toLowerCase().trim(), memo.id)
        }
      }

      return topics.map(topic => {
        let matched_memo_id: string | null = null

        // If AI matched a memo by title, find its ID
        if (topic.matched_memo) {
          const normalizedMemoTitle = topic.matched_memo.toLowerCase().trim()
          matched_memo_id = memoLookup.get(normalizedMemoTitle) || null

          // Fuzzy match: check if any memo title contains or is contained by the matched title
          if (!matched_memo_id) {
            for (const [title, id] of memoLookup.entries()) {
              if (title.includes(normalizedMemoTitle) || normalizedMemoTitle.includes(title)) {
                matched_memo_id = id
                break
              }
            }
          }
        }

        return {
          brand_id: brandId,
          title: topic.title,
          category: topic.category,
          content_type: topic.content_type,
          description: topic.description || null,
          target_persona: topic.target_persona || null,
          funnel_stage: topic.funnel_stage || null,
          competitor_relevance: topic.competitor_relevance,
          estimated_competitor_coverage: topic.estimated_competitor_coverage,
          priority_score: topic.priority_score,
          impact_rationale: topic.impact_rationale || null,
          status: topic.status,
          matched_memo_id,
          matched_page_url: topic.matched_url || null,
          source: 'ai_generated',
          refreshed_at: new Date().toISOString(),
        }
      })
    })

    // Step 5: Upsert into database
    const upsertResult = await step.run('upsert-topics', async () => {
      // Delete existing topics for this brand (full refresh)
      await supabase
        .from('topic_universe')
        .delete()
        .eq('brand_id', brandId)

      // Insert new topics in batches
      const batchSize = 50
      let inserted = 0

      for (let i = 0; i < topicsWithMemoMatch.length; i += batchSize) {
        const batch = topicsWithMemoMatch.slice(i, i + batchSize)
        const { error } = await supabase
          .from('topic_universe')
          .insert(batch)

        if (error) {
          console.error(`Failed to insert topic batch ${i}:`, error)
        } else {
          inserted += batch.length
        }
      }

      return { inserted, total: topicsWithMemoMatch.length }
    })

    // Step 6: Calculate coverage score
    const coverageScore = await step.run('calculate-coverage', async () => {
      const total = topicsWithMemoMatch.length
      const covered = topicsWithMemoMatch.filter(t => t.status === 'covered').length
      const partial = topicsWithMemoMatch.filter(t => t.status === 'partial').length
      const gaps = topicsWithMemoMatch.filter(t => t.status === 'gap').length

      // By category breakdown
      const byCategory: CoverageScore['by_category'] = {} as CoverageScore['by_category']
      const categories: TopicCategory[] = ['comparisons', 'alternatives', 'how_tos', 'industry_guides', 'definitions', 'use_cases']

      for (const cat of categories) {
        const catTopics = topicsWithMemoMatch.filter(t => t.category === cat)
        byCategory[cat] = {
          total: catTopics.length,
          covered: catTopics.filter(t => t.status === 'covered').length,
          gaps: catTopics.filter(t => t.status === 'gap').length,
        }
      }

      const score: CoverageScore = {
        total_topics: total,
        covered,
        partial,
        gaps,
        coverage_percent: total > 0 ? Math.round((covered / total) * 100) : 0,
        by_category: byCategory,
      }

      return score
    })

    // Step 7: Create alert
    await step.run('create-alert', async () => {
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'topic_universe_generated',
        title: 'Content Coverage Audit Complete',
        message: `Mapped ${coverageScore.total_topics} topics. Coverage: ${coverageScore.coverage_percent}% (${coverageScore.covered} covered, ${coverageScore.gaps} gaps).`,
        data: {
          coverage_score: coverageScore,
          site_inventory_stats: siteInventory.stats,
        },
      })
    })

    return {
      success: true,
      brandId,
      topics_generated: topicsWithMemoMatch.length,
      topics_inserted: upsertResult.inserted,
      coverage_score: coverageScore,
      site_inventory: siteInventory.stats,
    }
  }
)

// ============================================================================
// Lightweight refresh: add topics for new entities
// ============================================================================

export const topicUniverseRefresh = inngest.createFunction(
  {
    id: 'topic-universe-refresh',
    name: 'Refresh Topic Universe (New Entities)',
    concurrency: { limit: 2 },
  },
  { event: 'topic/universe-refresh' },
  async ({ event, step }) => {
    const { brandId, newEntityName, newEntityType } = event.data

    // Only add comparison/alternative topics for new competitors
    if (!newEntityName || newEntityType !== 'competitor') {
      return { success: true, message: 'Not a competitor entity, skipping', added: 0 }
    }

    // Check if topics already exist for this competitor
    const existing = await step.run('check-existing', async () => {
      const { data } = await supabase
        .from('topic_universe')
        .select('id')
        .eq('brand_id', brandId)
        .contains('competitor_relevance', [newEntityName])
        .limit(1)

      return data?.length || 0
    })

    if (existing > 0) {
      return { success: true, message: 'Topics already exist for this competitor', added: 0 }
    }

    // Get brand name
    const brand = await step.run('get-brand', async () => {
      const { data } = await supabase
        .from('brands')
        .select('name')
        .eq('id', brandId)
        .single()
      return data
    })

    if (!brand) return { success: false, message: 'Brand not found', added: 0 }

    // Add comparison and alternative topics
    const newTopics = [
      {
        brand_id: brandId,
        title: `${brand.name} vs ${newEntityName}: Detailed Comparison`,
        category: 'comparisons',
        content_type: 'comparison',
        description: `Side-by-side comparison of ${brand.name} and ${newEntityName}`,
        target_persona: null,
        funnel_stage: 'mid_funnel',
        competitor_relevance: [newEntityName],
        estimated_competitor_coverage: 1,
        priority_score: 85,
        impact_rationale: `New competitor discovered. Comparison pages are the #1 driver of AI citations.`,
        status: 'gap',
        source: 'entity_discovered',
      },
      {
        brand_id: brandId,
        title: `${newEntityName} Alternatives: Top Options Compared`,
        category: 'alternatives',
        content_type: 'alternative',
        description: `Alternatives to ${newEntityName}, positioning ${brand.name} as a top option`,
        target_persona: null,
        funnel_stage: 'bottom_funnel',
        competitor_relevance: [newEntityName],
        estimated_competitor_coverage: 1,
        priority_score: 82,
        impact_rationale: `New competitor discovered. Alternative pages capture high-intent switchers.`,
        status: 'gap',
        source: 'entity_discovered',
      },
    ]

    await step.run('insert-topics', async () => {
      const { error } = await supabase
        .from('topic_universe')
        .insert(newTopics)

      if (error) {
        console.error('Failed to insert new entity topics:', error)
      }
    })

    return { success: true, added: newTopics.length, entity: newEntityName }
  }
)
