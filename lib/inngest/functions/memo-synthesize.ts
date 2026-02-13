import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { fetchUrlAsMarkdown } from '@/lib/utils/jina-reader'
import { BrandContext, VoiceInsight } from '@/lib/supabase/types'
import {
  SYNTHESIS_MEMO_PROMPT,
  generateToneInstructions,
  formatBrandContextForPrompt,
  formatVoiceInsightsForPrompt,
  selectVoiceInsightsForMemo,
  formatOffersForPrompt,
} from '@/lib/ai/prompts/memo-generation'
import { trackJobStart, trackJobEnd } from '@/lib/utils/job-tracker'
import { canBrandSpend } from '@/lib/utils/budget-guard'
import { logSingleUsage, normalizeModelId } from '@/lib/utils/usage-logger'
import { extractImageConcepts, sourceImagesForTopic, formatImagesForPrompt } from '@/lib/utils/image-sourcer'

const supabase = createServiceRoleClient()

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

const MAX_SOURCES = 5
const MAX_CONTENT_PER_SOURCE = 10000 // chars per source — keeps total prompt under ~60k tokens

/**
 * Synthesize a memo from multiple cited sources for a specific prompt.
 *
 * Instead of responding to ONE cited URL, this function:
 * 1. Takes a prompt (query)
 * 2. Gathers all cited URLs from that prompt's scan results
 * 3. Fetches content from the top N most-cited URLs
 * 4. Generates a single authoritative memo that covers everything
 *
 * Triggered via API action: synthesize_from_prompt
 */
export const memoSynthesize = inngest.createFunction(
  {
    id: 'memo-synthesize',
    name: 'Synthesize Memo from Multiple Sources',
    concurrency: { limit: 2 },
  },
  { event: 'memo/synthesize' },
  async ({ event, step }) => {
    const { brandId, queryId } = event.data

    if (!queryId) {
      return { success: false, error: 'queryId is required' }
    }

    // Budget check
    const canSpend = await step.run('check-budget', async () => canBrandSpend(brandId))
    if (!canSpend) {
      return { success: true, skipped: true, reason: 'budget_exceeded' }
    }

    // Step 1: Load query, brand data, scan results with citations
    const {
      brand,
      brandContext,
      toneInstructions,
      voiceInsightsText,
      query,
      citedUrls,
      existingMemoIds,
    } = await step.run('get-data', async () => {
      const [brandResult, queryResult, scanResults, insights, existingMemos] = await Promise.all([
        supabase.from('brands').select('*').eq('id', brandId).single(),
        supabase.from('queries').select('*').eq('id', queryId).single(),
        supabase
          .from('scan_results')
          .select('citations, brand_in_citations')
          .eq('brand_id', brandId)
          .eq('query_id', queryId)
          .not('citations', 'is', null),
        supabase.from('voice_insights').select('*').eq('brand_id', brandId),
        supabase.from('memos').select('id').eq('brand_id', brandId),
      ])

      if (brandResult.error || !brandResult.data) throw new Error('Brand not found')
      if (queryResult.error || !queryResult.data) throw new Error('Query not found')

      const brand = brandResult.data
      const ctx = brand.context as BrandContext

      // Aggregate all cited URLs across all scan results for this query
      // Count frequency — more cited = more important to cover
      const urlCounts = new Map<string, number>()
      const brandDomain = (brand.domain || '').replace(/^www\./, '').toLowerCase()

      for (const scan of scanResults.data || []) {
        for (const url of (scan.citations as string[]) || []) {
          try {
            const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
            // Skip brand's own domain and common non-content domains
            if (brandDomain && domain.includes(brandDomain)) continue
            if (['google.com', 'youtube.com', 'wikipedia.org', 'reddit.com', 'twitter.com', 'x.com', 'linkedin.com', 'facebook.com'].includes(domain)) continue
            urlCounts.set(url, (urlCounts.get(url) || 0) + 1)
          } catch {
            // Skip malformed URLs
          }
        }
      }

      // Sort by citation frequency, take top N
      const citedUrls = Array.from(urlCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_SOURCES)
        .map(([url, count]) => ({ url, count }))

      // Voice insights
      const selectedInsights = selectVoiceInsightsForMemo(
        (insights.data || []) as VoiceInsight[],
        'response',
        (existingMemos.data || []).map((m: { id: string }) => m.id),
        3
      )

      return {
        brand,
        brandContext: ctx,
        toneInstructions: generateToneInstructions(ctx?.brand_tone, ctx?.brand_personality),
        voiceInsightsText: formatVoiceInsightsForPrompt(selectedInsights),
        query: queryResult.data,
        citedUrls,
        existingMemoIds: (existingMemos.data || []).map((m: { id: string }) => m.id),
      }
    })

    if (citedUrls.length === 0) {
      return { success: false, error: 'No cited URLs found for this query. Run a scan first.' }
    }

    // Track job start
    const jobId = await step.run('track-job-start', async () => {
      return await trackJobStart(brandId, 'generate', {
        type: 'synthesis',
        queryId,
        sourceCount: citedUrls.length,
      })
    })

    // Step 2: Fetch content from each cited URL
    const sourceSummaries = await step.run('fetch-sources', async () => {
      const results: Array<{
        url: string
        title: string
        content: string
        wordCount: number
        citationCount: number
        fetchError?: string
      }> = []

      // Fetch in parallel (with limit)
      const fetchPromises = citedUrls.map(async ({ url, count }) => {
        try {
          const result = await fetchUrlAsMarkdown(url)
          if (!result.content || result.content.length < 200) {
            return {
              url,
              title: result.title || url,
              content: '',
              wordCount: 0,
              citationCount: count,
              fetchError: 'Content too short or empty',
            }
          }
          return {
            url,
            title: result.title || url,
            content: result.content.slice(0, MAX_CONTENT_PER_SOURCE),
            wordCount: result.content.split(/\s+/).filter((w: string) => w.length > 0).length,
            citationCount: count,
          }
        } catch (e) {
          console.error(`Failed to fetch ${url}:`, e)
          return {
            url,
            title: url,
            content: '',
            wordCount: 0,
            citationCount: count,
            fetchError: `Fetch failed: ${e instanceof Error ? e.message : 'unknown'}`,
          }
        }
      })

      const settled = await Promise.allSettled(fetchPromises)
      for (const r of settled) {
        if (r.status === 'fulfilled') results.push(r.value)
      }

      return results
    })

    // Filter to sources that actually returned content
    const validSources = sourceSummaries.filter(s => s.content.length > 0)

    if (validSources.length === 0) {
      await step.run('track-job-end-no-sources', async () => await trackJobEnd(jobId))
      return { success: false, error: 'Could not fetch content from any cited URL' }
    }

    // Step 3: Source images
    const imagePromptBlock = await step.run('source-images', async () => {
      const allContent = validSources.map(s => s.content).join('\n\n')
      const imageConcepts = extractImageConcepts(allContent)
      const images = await sourceImagesForTopic(
        query.query_text,
        imageConcepts,
        4,
        queryId // unique per query for varied image selection
      )
      return formatImagesForPrompt(images)
    })

    // Step 4: Generate synthesized content
    const generated = await step.run('generate-content', async () => {
      const now = new Date()
      const currentDate = now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
      const currentYear = now.getFullYear().toString()

      // Build source summaries block for the prompt
      const sourceBlock = validSources
        .map((s, i) => {
          return `── SOURCE ${i + 1} of ${validSources.length} (cited ${s.citationCount}x) ──
URL: ${s.url}
TITLE: ${s.title}
WORD COUNT: ~${s.wordCount}

CONTENT:
${s.content}
`
        })
        .join('\n\n')

      const ctaSection = formatOffersForPrompt(brandContext?.offers, brand.name)

      const prompt = SYNTHESIS_MEMO_PROMPT
        .replace('{{brand_context}}', formatBrandContextForPrompt(brandContext))
        .replace('{{tone_instructions}}', toneInstructions)
        .replace('{{verified_insights}}', voiceInsightsText)
        .replace('{{available_images}}', imagePromptBlock)
        .replace('{{prompt_text}}', query.query_text)
        .replace('{{funnel_stage}}', query.funnel_stage || 'unknown')
        .replace('{{query_type}}', query.query_type || 'general')
        .replace('{{source_summaries}}', sourceBlock)
        .replace('{{current_date}}', currentDate)
        .replace('{{cta_section}}', ctaSection)
        .replace(/\{\{current_year\}\}/g, currentYear)
        .replace(/\{\{brand_name\}\}/g, brand.name)
        .replace(/\{\{brand_domain\}\}/g, brand.domain || '')

      const generationModel = 'openai/gpt-4o'
      const startTime = Date.now()

      const { text, usage } = await generateText({
        model: openrouter(generationModel),
        prompt,
        temperature: 0.4,
      })

      const durationMs = Date.now() - startTime

      await logSingleUsage(
        brand.tenant_id, brandId, 'memo_synthesize',
        normalizeModelId(generationModel),
        usage?.inputTokens || 0, usage?.outputTokens || 0
      )

      // Validate output
      if (!text || text.length < 500) {
        throw new Error('Generated content too short')
      }

      const errorPhrases = ['I cannot', "I'm unable", 'As an AI', "I don't have"]
      if (errorPhrases.some(phrase => text.toLowerCase().includes(phrase.toLowerCase()))) {
        throw new Error('Generated content contains error phrases')
      }

      // Extract title
      const titleMatch = text.match(/^#\s+(.+)$/m)
      const title = titleMatch?.[1] || query.query_text

      // Remove the title line from content
      const contentWithoutTitle = text.replace(/^#\s+.+\n+/, '')

      return {
        title,
        content: contentWithoutTitle,
        fullContent: text,
        generationModel,
        durationMs,
        tokens: {
          prompt: usage?.inputTokens || 0,
          completion: usage?.outputTokens || 0,
          total: (usage?.inputTokens || 0) + (usage?.outputTokens || 0),
        },
      }
    })

    // Step 5: Generate meta description
    const metaDescription = await step.run('generate-meta', async () => {
      try {
        const { text, usage: metaUsage } = await generateText({
          model: openrouter('openai/gpt-4o-mini'),
          prompt: `Write a 150-160 character meta description for this article about ${brand.name}.

IMPORTANT:
- Use "${brand.name}" as the brand name (NOT "Context Memo")
- Be factual and descriptive
- Focus on the value proposition
- This article answers: "${query.query_text}"

Article excerpt:
${generated.content.slice(0, 1000)}`,
          temperature: 0.3,
        })

        await logSingleUsage(
          brand.tenant_id, brandId, 'memo_synthesize',
          normalizeModelId('openai/gpt-4o-mini'),
          metaUsage?.inputTokens || 0, metaUsage?.outputTokens || 0
        )

        return text.replace(/^["']|["']$/g, '').slice(0, 160)
      } catch {
        return generated.title.slice(0, 150)
      }
    })

    // Step 6: Save as memo
    const savedMemo = await step.run('save-memo', async () => {
      // Generate slug from title
      const slug = `resources/${generated.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60)}`

      // Check slug collision
      const { data: existing } = await supabase
        .from('memos')
        .select('id, slug')
        .eq('brand_id', brandId)
        .eq('slug', slug)
        .single()

      const finalSlug = existing
        ? `${slug}-${Date.now().toString(36)}`
        : slug

      // Extract FAQs for schema
      const faqMatches = generated.content.matchAll(/###\s+(.+\?)\s*\n+([^#]+?)(?=\n###|\n##|$)/g)
      const faqItems = Array.from(faqMatches).map(match => ({
        '@type': 'Question',
        name: match[1].trim(),
        acceptedAnswer: {
          '@type': 'Answer',
          text: match[2].trim().slice(0, 500),
        },
      }))

      // Build schema
      const schemas: Record<string, unknown>[] = [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: generated.title,
          description: metaDescription,
          datePublished: new Date().toISOString(),
          dateModified: new Date().toISOString(),
          author: {
            '@type': 'Organization',
            name: 'Context Memo',
            url: 'https://contextmemo.com',
          },
          publisher: {
            '@type': 'Organization',
            name: brand.name,
            url: brand.domain ? `https://${brand.domain}` : undefined,
          },
          mainEntityOfPage: { '@type': 'WebPage' },
        },
      ]

      if (faqItems.length > 0) {
        schemas.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqItems,
        })
      }

      const today = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })

      const { data, error } = await supabase
        .from('memos')
        .insert({
          brand_id: brandId,
          source_query_id: queryId,
          memo_type: 'synthesis',
          slug: finalSlug,
          title: generated.title,
          content_markdown: generated.content,
          meta_description: metaDescription,
          schema_json: schemas.length === 1 ? schemas[0] : schemas,
          sources: [
            { url: `https://${brand.domain}`, title: brand.name, accessed_at: today },
          ],
          status: 'published',
          published_at: new Date().toISOString(),
          last_verified_at: new Date().toISOString(),
          version: 1,
          generation_model: generated.generationModel,
          generation_duration_ms: generated.durationMs,
          generation_tokens: generated.tokens,
          review_status: 'ai_generated',
          provenance: {
            generated_at: new Date().toISOString(),
            source_type: 'synthesis',
            source_urls: validSources.map(s => ({
              url: s.url,
              title: s.title,
              wordCount: s.wordCount,
              citationCount: s.citationCount,
            })),
            prompt_text: query.query_text,
            prompt_funnel_stage: query.funnel_stage,
            total_sources_fetched: validSources.length,
            total_sources_attempted: citedUrls.length,
            brand_context_version: brand.updated_at,
          },
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to save synthesis memo:', error)
        throw new Error(`Failed to save memo: ${error.message}`)
      }

      // Save version history
      await supabase.from('memo_versions').insert({
        memo_id: data.id,
        version: 1,
        content_markdown: generated.content,
        change_reason: 'initial',
      })

      return data
    })

    // Step 7: Create alert
    await step.run('create-alert', async () => {
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'content_generated',
        title: 'Synthesis Memo Published',
        message: `New article "${generated.title}" published — synthesized from ${validSources.length} sources for prompt "${query.query_text}"`,
        data: {
          memo_id: savedMemo.id,
          query_id: queryId,
          prompt_text: query.query_text,
          source_count: validSources.length,
          source_urls: validSources.map(s => s.url),
        },
      })
    })

    // Track job end
    await step.run('track-job-end', async () => {
      await trackJobEnd(jobId)
    })

    return {
      success: true,
      memoId: savedMemo.id,
      title: generated.title,
      slug: savedMemo.slug,
      promptText: query.query_text,
      sourcesFetched: validSources.length,
      sourcesAttempted: citedUrls.length,
      sourceDetails: validSources.map(s => ({
        url: s.url,
        title: s.title,
        wordCount: s.wordCount,
        citationCount: s.citationCount,
      })),
      generatedWordCount: generated.content.split(/\s+/).filter(w => w.length > 0).length,
      tokens: generated.tokens,
    }
  }
)
