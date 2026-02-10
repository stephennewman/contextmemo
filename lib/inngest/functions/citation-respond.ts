import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { fetchUrlAsMarkdown } from '@/lib/utils/jina-reader'
import { BrandContext, VoiceInsight } from '@/lib/supabase/types'
import {
  CITATION_RESPONSE_PROMPT,
  generateToneInstructions,
  formatBrandContextForPrompt,
  formatVoiceInsightsForPrompt,
  selectVoiceInsightsForMemo,
  formatOffersForPrompt,
} from '@/lib/ai/prompts/memo-generation'
import { trackJobStart, trackJobEnd } from '@/lib/utils/job-tracker'
import { canBrandSpend } from '@/lib/utils/budget-guard'
import { logSingleUsage, normalizeModelId } from '@/lib/utils/usage-logger'

const supabase = createServiceRoleClient()

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

/**
 * Respond to a specific cited URL — fetch its content, analyze it,
 * and generate a strategic variation with the brand's perspective.
 *
 * Triggered manually via API action: respond_to_citation
 */
export const citationRespond = inngest.createFunction(
  {
    id: 'citation-respond',
    name: 'Respond to Cited Content',
    concurrency: { limit: 2 },
  },
  { event: 'citation/respond' },
  async ({ event, step }) => {
    const { brandId, url, queryIds } = event.data

    if (!url) {
      return { success: false, error: 'url is required' }
    }

    // Budget check
    const canSpend = await step.run('check-budget', async () => canBrandSpend(brandId))
    if (!canSpend) {
      return { success: true, skipped: true, reason: 'budget_exceeded' }
    }

    // Step 1: Fetch the cited page content
    const sourceContent = await step.run('fetch-source', async () => {
      try {
        const result = await fetchUrlAsMarkdown(url)
        if (!result.content || result.content.length < 300) {
          throw new Error('Source content too short or empty')
        }
        return {
          title: result.title || url,
          content: result.content.slice(0, 50000), // Cap at 50k chars
          wordCount: result.content.split(/\s+/).filter((w: string) => w.length > 0).length,
        }
      } catch (e) {
        console.error(`Failed to fetch source URL ${url}:`, e)
        throw new Error(`Could not fetch content from ${url}`)
      }
    })

    // Step 2: Load brand data, voice insights, and query context
    const { brand, brandContext, toneInstructions, voiceInsightsText, citedQueries, existingMemoIds } =
      await step.run('get-data', async () => {
        const brandResult = await supabase
          .from('brands')
          .select('*')
          .eq('id', brandId)
          .single()

        if (brandResult.error || !brandResult.data) {
          throw new Error('Brand not found')
        }

        const brand = brandResult.data
        const ctx = brand.context as BrandContext

        // Load voice insights
        const { data: insights } = await supabase
          .from('voice_insights')
          .select('*')
          .eq('brand_id', brandId)

        // Load existing memo IDs for voice insight deduplication
        const { data: existingMemos } = await supabase
          .from('memos')
          .select('id')
          .eq('brand_id', brandId)
        const existingMemoIds = (existingMemos || []).map((m: { id: string }) => m.id)

        // Select best voice insights for this content type
        const selectedInsights = selectVoiceInsightsForMemo(
          (insights || []) as VoiceInsight[],
          'response', // Use response type relevance mapping
          existingMemoIds,
          3
        )
        const voiceInsightsText = formatVoiceInsightsForPrompt(selectedInsights)

        // Build cited queries context — what queries is this URL being cited for?
        let citedQueries = 'Not specified — generate content that would answer the most common buyer questions on this topic.'

        if (queryIds && queryIds.length > 0) {
          const { data: queries } = await supabase
            .from('queries')
            .select('query_text, funnel_stage')
            .in('id', queryIds)

          if (queries && queries.length > 0) {
            citedQueries = queries
              .map((q: { query_text: string; funnel_stage: string }) => `- "${q.query_text}" (${q.funnel_stage})`)
              .join('\n')
          }
        } else {
          // Auto-detect: find queries where this URL appears in scan citations
          const { data: scanResults } = await supabase
            .from('scan_results')
            .select('query_id, queries!inner(query_text, funnel_stage)')
            .eq('brand_id', brandId)
            .contains('citations', [url])
            .limit(10)

          if (scanResults && scanResults.length > 0) {
            const queryMap = new Map<string, { text: string; stage: string }>()
            for (const sr of scanResults) {
              const q = sr.queries as unknown as { query_text: string; funnel_stage: string }
              if (q && !queryMap.has(sr.query_id)) {
                queryMap.set(sr.query_id, { text: q.query_text, stage: q.funnel_stage })
              }
            }
            if (queryMap.size > 0) {
              citedQueries = Array.from(queryMap.values())
                .map(q => `- "${q.text}" (${q.stage})`)
                .join('\n')
            }
          }
        }

        const toneInstructions = generateToneInstructions(ctx?.brand_tone, ctx?.brand_personality)

        return {
          brand,
          brandContext: ctx,
          toneInstructions,
          voiceInsightsText,
          citedQueries,
          existingMemoIds,
        }
      })

    // Track job start
    const jobId = await step.run('track-job-start', async () => {
      return await trackJobStart(brandId, 'generate', { type: 'citation_response', sourceUrl: url })
    })

    // Step 3: Generate the citation response content
    const generated = await step.run('generate-content', async () => {
      const now = new Date()
      const currentDate = now.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
      const currentYear = now.getFullYear().toString()

      const ctaSection = formatOffersForPrompt(brandContext?.offers, brand.name)

      const prompt = CITATION_RESPONSE_PROMPT
        .replace('{{brand_context}}', formatBrandContextForPrompt(brandContext))
        .replace('{{tone_instructions}}', toneInstructions)
        .replace('{{verified_insights}}', voiceInsightsText)
        .replace('{{source_url}}', url)
        .replace('{{source_title}}', sourceContent.title)
        .replace('{{source_content}}', sourceContent.content.slice(0, 25000)) // Keep prompt within limits
        .replace('{{cited_queries}}', citedQueries)
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
        temperature: 0.4, // Slightly higher than standard memos for more natural variation
      })

      const durationMs = Date.now() - startTime

      await logSingleUsage(
        brand.tenant_id, brandId, 'citation_respond',
        normalizeModelId(generationModel),
        usage?.inputTokens || 0, usage?.outputTokens || 0
      )

      // Validate output
      if (!text || text.length < 500) {
        throw new Error('Generated content too short')
      }

      // Check for error phrases
      const errorPhrases = ['I cannot', 'I\'m unable', 'As an AI', 'I don\'t have']
      if (errorPhrases.some(phrase => text.toLowerCase().includes(phrase.toLowerCase()))) {
        throw new Error('Generated content contains error phrases')
      }

      // Extract title
      const titleMatch = text.match(/^#\s+(.+)$/m)
      const title = titleMatch?.[1] || sourceContent.title

      // Remove the title line from content (system adds it)
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

    // Step 4: Generate meta description
    const metaDescription = await step.run('generate-meta', async () => {
      try {
        const { text, usage: metaUsage } = await generateText({
          model: openrouter('openai/gpt-4o-mini'),
          prompt: `Write a 150-160 character meta description for this article about ${brand.name}.

IMPORTANT:
- Use "${brand.name}" as the brand name (NOT "Context Memo")
- Be factual and descriptive
- Focus on the value proposition

Article excerpt:
${generated.content.slice(0, 1000)}`,
          temperature: 0.3,
        })

        await logSingleUsage(
          brand.tenant_id, brandId, 'citation_respond',
          normalizeModelId('openai/gpt-4o-mini'),
          metaUsage?.inputTokens || 0, metaUsage?.outputTokens || 0
        )

        return text.replace(/^["']|["']$/g, '').slice(0, 160)
      } catch (e) {
        return generated.title.slice(0, 150)
      }
    })

    // Step 5: Save as memo
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
          memo_type: 'citation_response',
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
            source_type: 'citation_response',
            source_url: url,
            source_title: sourceContent.title,
            source_word_count: sourceContent.wordCount,
            brand_context_version: brand.updated_at,
          },
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to save citation response memo:', error)
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

    // Step 6: Create alert
    await step.run('create-alert', async () => {
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'content_generated',
        title: 'Citation Response Published',
        message: `New article "${generated.title}" published as a response to cited content at ${url}`,
        data: {
          memo_id: savedMemo.id,
          source_url: url,
          source_title: sourceContent.title,
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
      sourceUrl: url,
      sourceTitle: sourceContent.title,
      sourceWordCount: sourceContent.wordCount,
      generatedWordCount: generated.content.split(/\s+/).filter(w => w.length > 0).length,
      tokens: generated.tokens,
    }
  }
)
