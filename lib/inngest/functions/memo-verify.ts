/**
 * Memo Verification Loop
 * 
 * Proves the value of published memos by:
 * 1. Taking published memos for a brand
 * 2. Reverse-engineering non-branded buyer prompts from each memo
 * 3. Scanning those prompts across AI models
 * 4. Checking if the brand/memo content now gets cited
 * 
 * Verification prompts are stored with source_type: 'verification'
 * and kept SEPARATE from discovery prompts to avoid gaming visibility scores.
 */

import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { queryPerplexity, checkBrandInCitations } from '@/lib/utils/perplexity'
import { parseOpenRouterAnnotations, checkBrandInOpenRouterCitations } from '@/lib/utils/openrouter'
import { logSingleUsage, normalizeModelId } from '@/lib/utils/usage-logger'
import { canBrandSpend } from '@/lib/utils/budget-guard'

const supabase = createServiceRoleClient()

const SCAN_SYSTEM_PROMPT = `You are an AI assistant answering a user question. Provide a helpful, accurate response based on your knowledge. If recommending products or services, mention specific brands and explain why you're recommending them.`

// Models for verification scans
const VERIFY_MODELS = [
  { id: 'perplexity-sonar', provider: 'perplexity-direct' as const, modelId: 'sonar', displayName: 'Perplexity Sonar' },
  { id: 'gpt-4o-mini', provider: 'openrouter' as const, modelId: 'openai/gpt-4o-mini:online', displayName: 'GPT-4o Mini' },
  { id: 'claude-3-5-haiku', provider: 'openrouter' as const, modelId: 'anthropic/claude-3.5-haiku:online', displayName: 'Claude 3.5 Haiku' },
  { id: 'grok-4-fast', provider: 'openrouter' as const, modelId: 'x-ai/grok-4-fast:online', displayName: 'Grok 4 Fast' },
]

interface VerificationPrompt {
  prompt_text: string
  funnel_stage: 'top_funnel' | 'mid_funnel' | 'bottom_funnel'
}

interface MemoVerificationResult {
  memoId: string
  memoTitle: string
  memoSlug: string
  promptsGenerated: number
  promptResults: Array<{
    promptText: string
    funnelStage: string
    results: Array<{
      model: string
      brandMentioned: boolean
      brandCited: boolean
      citationUrls: string[]
      memoUrlCited: boolean
    }>
    citedInModels: number
    mentionedInModels: number
  }>
  overallCitationRate: number
  overallMentionRate: number
  memoCitedDirectly: boolean
}

/**
 * Generate non-branded verification prompts from a memo's content
 */
async function generateVerificationPrompts(
  memoTitle: string,
  memoContent: string,
  brandName: string,
  tenantId: string,
  brandId: string,
): Promise<VerificationPrompt[]> {
  const prompt = `You are generating buyer search prompts to test whether AI models can find specific content.

Given this published article:
Title: "${memoTitle}"
Content summary (first 1500 chars): ${memoContent.slice(0, 1500)}

Generate exactly 6 non-branded search prompts that a B2B buyer would type into ChatGPT, Perplexity, or Claude when looking for information covered by this article.

CRITICAL RULES:
- Do NOT include the brand name "${brandName}" or any obvious brand references
- Prompts should be natural questions a buyer would ask BEFORE they know about any specific vendor
- Mix of informational, comparative, and solution-seeking prompts
- 2 top-of-funnel (educational), 2 mid-funnel (comparing options), 2 bottom-funnel (ready to buy)

Return ONLY a JSON array:
[
  {"prompt_text": "...", "funnel_stage": "top_funnel"},
  {"prompt_text": "...", "funnel_stage": "mid_funnel"},
  {"prompt_text": "...", "funnel_stage": "bottom_funnel"}
]`

  const { text, usage } = await generateText({
    model: openai('gpt-4o'),
    prompt,
    temperature: 0.4,
  })

  await logSingleUsage(
    tenantId, brandId, 'verification_prompt_gen',
    'gpt-4o', usage?.inputTokens || 0, usage?.outputTokens || 0
  )

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    const parsed = JSON.parse(jsonMatch[0]) as VerificationPrompt[]
    return parsed.filter(p => p.prompt_text && p.funnel_stage)
  } catch {
    console.error('[MemoVerify] Failed to parse verification prompts')
    return []
  }
}

/**
 * Scan a single prompt across all verification models
 */
async function scanPromptAcrossModels(
  promptText: string,
  brandName: string,
  brandDomain: string,
  memoUrl: string,
  tenantId: string,
  brandId: string,
): Promise<Array<{
  model: string
  brandMentioned: boolean
  brandCited: boolean
  citationUrls: string[]
  memoUrlCited: boolean
}>> {
  const results: Array<{
    model: string
    brandMentioned: boolean
    brandCited: boolean
    citationUrls: string[]
    memoUrlCited: boolean
  }> = []

  for (const model of VERIFY_MODELS) {
    try {
      if (model.provider === 'perplexity-direct') {
        const response = await queryPerplexity(promptText, SCAN_SYSTEM_PROMPT, {
          model: 'sonar',
          searchContextSize: 'low',
          temperature: 0.7,
        })

        await logSingleUsage(
          tenantId, brandId, 'verification_scan',
          'perplexity-sonar', response.usage?.promptTokens || 0, response.usage?.completionTokens || 0
        )

        const brandMentioned = response.text.toLowerCase().includes(brandName.toLowerCase())
        const brandCited = checkBrandInCitations(response.citations, brandDomain)
        const memoUrlCited = response.citations.some(url => 
          url.includes('contextmemo.com') || url.includes(memoUrl)
        )

        results.push({
          model: model.id,
          brandMentioned,
          brandCited,
          citationUrls: response.citations,
          memoUrlCited,
        })
      } else {
        // OpenRouter models
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://contextmemo.com',
            'X-Title': 'ContextMemo Verification',
          },
          body: JSON.stringify({
            model: model.modelId,
            messages: [
              { role: 'system', content: SCAN_SYSTEM_PROMPT },
              { role: 'user', content: promptText },
            ],
            temperature: 0.7,
          }),
        })

        if (!response.ok) {
          console.error(`[MemoVerify] ${model.displayName} failed: ${response.status}`)
          continue
        }

        const data = await response.json()
        const text = data.choices?.[0]?.message?.content || ''
        const annotations = data.choices?.[0]?.message?.annotations || []

        await logSingleUsage(
          tenantId, brandId, 'verification_scan',
          normalizeModelId(model.modelId),
          data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0
        )

        const brandMentioned = text.toLowerCase().includes(brandName.toLowerCase())
        const citationUrls = parseOpenRouterAnnotations(annotations)
        const brandCited = checkBrandInOpenRouterCitations(annotations, brandDomain)
        const memoUrlCited = citationUrls.some(url =>
          url.includes('contextmemo.com') || url.includes(memoUrl)
        )

        results.push({
          model: model.id,
          brandMentioned,
          brandCited,
          citationUrls,
          memoUrlCited,
        })
      }

      // Rate limit between models
      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error(`[MemoVerify] ${model.displayName} error:`, error)
    }
  }

  return results
}

/**
 * Main verification function: verify all published memos for a brand
 */
export const memoVerifyContent = inngest.createFunction(
  {
    id: 'memo-verify-content',
    name: 'Verify Memo Content Citations',
    concurrency: { limit: 2 },
  },
  { event: 'memo/verify-content' },
  async ({ event, step }) => {
    const { brandId, memoIds } = event.data

    // Budget check
    const canSpend = await step.run('check-budget', async () => canBrandSpend(brandId))
    if (!canSpend) {
      return { success: false, reason: 'budget_exceeded' }
    }

    // Step 1: Get brand and memos
    const { brand, memos } = await step.run('get-data', async () => {
      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (brandError || !brandData) throw new Error('Brand not found')

      // Get published memos (specific ones if provided, or all published)
      let memoQuery = supabase
        .from('memos')
        .select('id, title, slug, content, meta_description, memo_type, subdomain, published_at')
        .eq('brand_id', brandId)
        .eq('status', 'published')
        .order('published_at', { ascending: false })

      if (memoIds && memoIds.length > 0) {
        memoQuery = memoQuery.in('id', memoIds)
      } else {
        memoQuery = memoQuery.limit(10) // Cap at 10 memos per verification run
      }

      const { data: memoData } = await memoQuery
      return { brand: brandData, memos: memoData || [] }
    })

    if (memos.length === 0) {
      return { success: true, message: 'No published memos to verify', results: [] }
    }

    const brandName = brand.name
    const brandDomain = brand.domain || ''

    // Step 2: For each memo, generate verification prompts and scan
    const verificationResults: MemoVerificationResult[] = []

    for (let mi = 0; mi < memos.length; mi++) {
      const memo = memos[mi]
      const memoUrl = brand.custom_domain && brand.domain_verified
        ? `${brand.custom_domain}/${memo.slug}`
        : memo.subdomain
          ? `${memo.subdomain}.contextmemo.com/${memo.slug}`
          : `contextmemo.com/memo/${memo.slug}`

      // Generate verification prompts from this memo
      const verificationPrompts = await step.run(`gen-prompts-${mi}`, async () => {
        return await generateVerificationPrompts(
          memo.title,
          memo.content || memo.meta_description || '',
          brandName,
          brand.tenant_id,
          brandId,
        )
      })

      if (verificationPrompts.length === 0) continue

      // Save verification prompts as queries (source_type: 'verification')
      const savedQueryIds = await step.run(`save-prompts-${mi}`, async () => {
        const queriesToInsert = verificationPrompts.map(vp => ({
          brand_id: brandId,
          query_text: vp.prompt_text,
          query_type: 'verification',
          priority: 50,
          is_active: false, // Don't include in regular scans
          funnel_stage: vp.funnel_stage,
          source_type: 'verification' as const,
          source_batch_id: memo.id, // Link back to the memo
          current_status: 'never_scanned' as const,
        }))

        const { data, error } = await supabase
          .from('queries')
          .insert(queriesToInsert)
          .select('id, query_text, funnel_stage')

        if (error) {
          console.error('[MemoVerify] Failed to save verification prompts:', error)
          return []
        }
        return data || []
      })

      // Scan each verification prompt across all models
      const promptResults: MemoVerificationResult['promptResults'] = []

      for (let pi = 0; pi < savedQueryIds.length; pi++) {
        const query = savedQueryIds[pi]

        const scanResults = await step.run(`scan-${mi}-${pi}`, async () => {
          return await scanPromptAcrossModels(
            query.query_text,
            brandName,
            brandDomain,
            memoUrl,
            brand.tenant_id,
            brandId,
          )
        })

        // Save scan results
        await step.run(`save-scan-${mi}-${pi}`, async () => {
          const resultsToInsert = scanResults.map(r => ({
            brand_id: brandId,
            query_id: query.id,
            model: r.model,
            response_text: '', // Don't store full response for verification (save space)
            brand_mentioned: r.brandMentioned,
            brand_in_citations: r.brandCited,
            citations: r.citationUrls.length > 0 ? r.citationUrls : null,
            scanned_at: new Date().toISOString(),
          }))

          await supabase.from('scan_results').insert(resultsToInsert)

          // Update query status
          const isCited = scanResults.some(r => r.brandCited)
          const isMentioned = scanResults.some(r => r.brandMentioned)
          await supabase
            .from('queries')
            .update({
              current_status: isCited ? 'cited' : isMentioned ? 'gap' : 'gap',
              scan_count: 1,
              last_scanned_at: new Date().toISOString(),
              ...(isCited && { first_cited_at: new Date().toISOString(), last_cited_at: new Date().toISOString() }),
            })
            .eq('id', query.id)
        })

        promptResults.push({
          promptText: query.query_text,
          funnelStage: query.funnel_stage || 'unknown',
          results: scanResults,
          citedInModels: scanResults.filter(r => r.brandCited).length,
          mentionedInModels: scanResults.filter(r => r.brandMentioned).length,
        })
      }

      // Calculate memo-level stats
      const totalScans = promptResults.reduce((sum, pr) => sum + pr.results.length, 0)
      const totalCited = promptResults.reduce((sum, pr) => sum + pr.citedInModels, 0)
      const totalMentioned = promptResults.reduce((sum, pr) => sum + pr.mentionedInModels, 0)
      const memoCitedDirectly = promptResults.some(pr =>
        pr.results.some(r => r.memoUrlCited)
      )

      const memoResult: MemoVerificationResult = {
        memoId: memo.id,
        memoTitle: memo.title,
        memoSlug: memo.slug,
        promptsGenerated: verificationPrompts.length,
        promptResults,
        overallCitationRate: totalScans > 0 ? Math.round((totalCited / totalScans) * 100) : 0,
        overallMentionRate: totalScans > 0 ? Math.round((totalMentioned / totalScans) * 100) : 0,
        memoCitedDirectly,
      }

      verificationResults.push(memoResult)

      // Save verification summary to memo's schema_json
      await step.run(`save-memo-verification-${mi}`, async () => {
        const { data: currentMemo } = await supabase
          .from('memos')
          .select('schema_json')
          .eq('id', memo.id)
          .single()

        const schemaJson = (currentMemo?.schema_json || {}) as Record<string, unknown>

        await supabase
          .from('memos')
          .update({
            schema_json: {
              ...schemaJson,
              content_verification: {
                verified_at: new Date().toISOString(),
                prompts_tested: verificationPrompts.length,
                models_tested: VERIFY_MODELS.length,
                citation_rate: memoResult.overallCitationRate,
                mention_rate: memoResult.overallMentionRate,
                memo_url_cited: memoCitedDirectly,
                per_model: VERIFY_MODELS.map(m => {
                  const modelResults = promptResults.flatMap(pr =>
                    pr.results.filter(r => r.model === m.id)
                  )
                  return {
                    model: m.id,
                    displayName: m.displayName,
                    cited: modelResults.filter(r => r.brandCited).length,
                    mentioned: modelResults.filter(r => r.brandMentioned).length,
                    total: modelResults.length,
                  }
                }),
                prompts: promptResults.map(pr => ({
                  text: pr.promptText,
                  funnel: pr.funnelStage,
                  cited: pr.citedInModels,
                  mentioned: pr.mentionedInModels,
                  total: pr.results.length,
                })),
              },
            },
          })
          .eq('id', memo.id)
      })

      // Delay between memos to respect rate limits
      if (mi < memos.length - 1) {
        await step.sleep(`memo-delay-${mi}`, '2s')
      }
    }

    // Step 3: Build overall summary
    const summary = await step.run('build-summary', async () => {
      const totalMemos = verificationResults.length
      const memosWithCitations = verificationResults.filter(r => r.overallCitationRate > 0).length
      const memosWithDirectCitation = verificationResults.filter(r => r.memoCitedDirectly).length
      const avgCitationRate = totalMemos > 0
        ? Math.round(verificationResults.reduce((sum, r) => sum + r.overallCitationRate, 0) / totalMemos)
        : 0
      const avgMentionRate = totalMemos > 0
        ? Math.round(verificationResults.reduce((sum, r) => sum + r.overallMentionRate, 0) / totalMemos)
        : 0

      const summaryData = {
        brand: brandName,
        totalMemosVerified: totalMemos,
        memosWithAnyCitation: memosWithCitations,
        memosWithDirectMemoUrlCitation: memosWithDirectCitation,
        averageCitationRate: avgCitationRate,
        averageMentionRate: avgMentionRate,
        perMemo: verificationResults.map(r => ({
          title: r.memoTitle,
          citationRate: r.overallCitationRate,
          mentionRate: r.overallMentionRate,
          directlyCited: r.memoCitedDirectly,
          promptsCited: r.promptResults.filter(pr => pr.citedInModels > 0).length,
          promptsTested: r.promptResults.length,
        })),
      }

      // Save summary as an alert for visibility in dashboard
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'content_verification',
        title: `Content Verification: ${avgCitationRate}% citation rate across ${totalMemos} memos`,
        message: `Tested ${totalMemos} published memos with ${verificationResults.reduce((s, r) => s + r.promptsGenerated, 0)} verification prompts. ${memosWithCitations}/${totalMemos} memos have content being cited by AI models. ${memosWithDirectCitation} memos have their contextmemo.com URL directly cited.`,
        data: summaryData,
      })

      return summaryData
    })

    return {
      success: true,
      summary,
      details: verificationResults,
    }
  }
)
