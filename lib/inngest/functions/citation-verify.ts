/**
 * Citation Verification Loop
 * 
 * After content is published, verifies if the brand NOW gets cited
 * for the queries that originally cited only competitors.
 * 
 * Metrics tracked:
 * - Time to citation (hours from publish to first citation)
 * - Citation lift (% improvement in citation rate)
 * - Per-model success (which AI models cite the new content)
 */

import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { parseOpenRouterAnnotations, checkBrandInOpenRouterCitations } from '@/lib/utils/openrouter'
import { emitCitationVerified } from '@/lib/feed/emit'
import { canBrandSpend } from '@/lib/utils/budget-guard'
import { logSingleUsage, normalizeModelId } from '@/lib/utils/usage-logger'

const supabase = createServiceRoleClient()

const SCAN_SYSTEM_PROMPT = `You are an AI assistant answering a user question. Provide a helpful, accurate response based on your knowledge. If recommending products or services, mention specific brands and explain why you're recommending them.`

// Models to verify across (more comprehensive than daily scan)
const VERIFICATION_MODELS = [
  { id: 'gpt-4o-mini', modelId: 'openai/gpt-4o-mini:online', displayName: 'GPT-4o Mini' },
  { id: 'claude-3-5-haiku', modelId: 'anthropic/claude-3.5-haiku:online', displayName: 'Claude 3.5 Haiku' },
  { id: 'grok-4-fast', modelId: 'x-ai/grok-4-fast:online', displayName: 'Grok 4 Fast' },
]

interface VerificationResult {
  model: string
  brandMentioned: boolean
  brandInCitations: boolean
  competitorsMentioned: string[]
  citations: string[]
  responseText: string
}

interface GapVerificationSummary {
  gapId: string
  sourceQuery: string
  beforeStatus: {
    brandCited: boolean
    competitorCited: boolean
  }
  afterStatus: {
    brandCited: boolean
    brandMentioned: boolean
    modelsWithCitation: string[]
    modelsWithMention: string[]
  }
  verified: boolean
  timeToCitationHours: number | null
}

/**
 * Verify a single content gap - check if brand now gets cited
 */
export const verifyGap = inngest.createFunction(
  {
    id: 'verify-gap',
    name: 'Verify Content Gap Citation',
    concurrency: { limit: 3 },
  },
  { event: 'gap/verify' },
  async ({ event, step }) => {
    const { gapId } = event.data

    // Step 0: Get gap to find brand_id, then budget check
    const gapBrandId = await step.run('get-gap-brand', async () => {
      const { data } = await supabase.from('content_gaps').select('brand_id').eq('id', gapId).single()
      return data?.brand_id
    })

    if (gapBrandId) {
      const canSpend = await step.run('check-budget', async () => canBrandSpend(gapBrandId))
      if (!canSpend) {
        return { success: true, skipped: true, reason: 'budget_exceeded' }
      }
    }

    // Step 1: Get gap, brand, and related data
    const { gap, brand, memo } = await step.run('get-data', async () => {
      const { data: gapData, error: gapError } = await supabase
        .from('content_gaps')
        .select('*')
        .eq('id', gapId)
        .single()

      if (gapError || !gapData) {
        throw new Error('Content gap not found')
      }

      if (gapData.status !== 'content_created') {
        throw new Error(`Gap status is ${gapData.status}, expected content_created`)
      }

      const { data: brandData } = await supabase
        .from('brands')
        .select('*')
        .eq('id', gapData.brand_id)
        .single()

      if (!brandData) {
        throw new Error('Brand not found')
      }

      // Check if citation verification is enabled for this brand
      const { data: brandSettings } = await supabase
        .from('brand_settings')
        .select('auto_verify_citations')
        .eq('brand_id', gapData.brand_id)
        .single()
      
      if (brandSettings && brandSettings.auto_verify_citations === false) {
        console.log(`[CitationVerify] Verification disabled for brand ${gapData.brand_id}, skipping`)
        return { gap: gapData, brand: brandData, memo: null, disabled: true }
      }

      // Get the memo if it exists
      let memoData = null
      if (gapData.response_memo_id) {
        const { data } = await supabase
          .from('memos')
          .select('*')
          .eq('id', gapData.response_memo_id)
          .single()
        memoData = data
      }

      return { gap: gapData, brand: brandData, memo: memoData, disabled: false }
    })

    // Early exit if verification is disabled for this brand
    if ((gap as { disabled?: boolean }).disabled) {
      return { success: true, skipped: true, reason: 'verification_disabled' }
    }

    const brandName = brand.name.toLowerCase()
    const brandDomain = brand.domain

    // Get competitors for this brand
    const competitors = await step.run('get-competitors', async () => {
      const { data } = await supabase
        .from('competitors')
        .select('name')
        .eq('brand_id', brand.id)
        .eq('is_active', true)

      return (data || []).map(c => c.name.toLowerCase())
    })

    // Step 2: Run the original query through multiple models
    const verificationResults: VerificationResult[] = await step.run('run-verification-scans', async () => {
      const results: VerificationResult[] = []

      for (const model of VERIFICATION_MODELS) {
        try {
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
                { role: 'user', content: gap.source_query },
              ],
              temperature: 0.7,
            }),
          })

          if (!response.ok) {
            console.error(`${model.displayName} verification failed: ${response.status}`)
            continue
          }

          const data = await response.json()
          const text = data.choices?.[0]?.message?.content || ''
          const annotations = data.choices?.[0]?.message?.annotations || []

          // Log usage
          await logSingleUsage(
            brand.tenant_id, brand.id, 'citation_verify',
            normalizeModelId(model.modelId),
            data.usage?.prompt_tokens || 0, data.usage?.completion_tokens || 0
          )

          const responseLower = text.toLowerCase()
          const brandMentioned = responseLower.includes(brandName)
          const citations = parseOpenRouterAnnotations(annotations)
          const brandInCitations = checkBrandInOpenRouterCitations(annotations, brandDomain)

          const competitorsMentioned = competitors.filter(name => 
            responseLower.includes(name)
          )

          results.push({
            model: model.id,
            brandMentioned,
            brandInCitations,
            competitorsMentioned,
            citations,
            responseText: text,
          })

          // Small delay between models
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error(`${model.displayName} verification error:`, error)
        }
      }

      return results
    })

    // Step 3: Analyze results
    const analysis = await step.run('analyze-results', async () => {
      const modelsWithCitation = verificationResults
        .filter(r => r.brandInCitations)
        .map(r => r.model)

      const modelsWithMention = verificationResults
        .filter(r => r.brandMentioned)
        .map(r => r.model)

      // Calculate time to citation if this is first verification
      let timeToCitationHours: number | null = null
      if (modelsWithCitation.length > 0 && memo?.published_at) {
        const publishedAt = new Date(memo.published_at).getTime()
        const now = Date.now()
        timeToCitationHours = Math.round((now - publishedAt) / (1000 * 60 * 60))
      }

      // Verification is successful if brand is cited in at least one model
      const verified = modelsWithCitation.length > 0

      return {
        verified,
        modelsWithCitation,
        modelsWithMention,
        timeToCitationHours,
        totalModels: verificationResults.length,
        citationRate: verificationResults.length > 0 
          ? Math.round((modelsWithCitation.length / verificationResults.length) * 100) 
          : 0,
        mentionRate: verificationResults.length > 0
          ? Math.round((modelsWithMention.length / verificationResults.length) * 100)
          : 0,
      }
    })

    // Step 4: Update gap status and save verification data
    await step.run('update-gap', async () => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (analysis.verified) {
        updateData.status = 'verified'
        updateData.verified_at = new Date().toISOString()
      }

      // Store verification results
      const existingAnalysis = gap.key_factors || []
      updateData.key_factors = [
        ...existingAnalysis,
        {
          type: 'verification',
          timestamp: new Date().toISOString(),
          results: analysis,
          detailed_results: verificationResults.map(r => ({
            model: r.model,
            brandMentioned: r.brandMentioned,
            brandInCitations: r.brandInCitations,
            citationCount: r.citations.length,
          })),
        },
      ]

      await supabase
        .from('content_gaps')
        .update(updateData)
        .eq('id', gapId)
    })

    // Step 5: Update memo with verification metrics if verified
    if (analysis.verified && memo) {
      await step.run('update-memo', async () => {
        const schemaJson = memo.schema_json || {}
        
        await supabase
          .from('memos')
          .update({
            schema_json: {
              ...schemaJson,
              verification: {
                verified: true,
                verified_at: new Date().toISOString(),
                time_to_citation_hours: analysis.timeToCitationHours,
                citation_rate: analysis.citationRate,
                mention_rate: analysis.mentionRate,
                models_citing: analysis.modelsWithCitation,
              },
            },
          })
          .eq('id', memo.id)
      })
    }

    // Step 6: Create alert and feed event
    await step.run('create-alert-and-feed', async () => {
      if (analysis.verified) {
        // Legacy alert (v1)
        await supabase.from('alerts').insert({
          brand_id: brand.id,
          alert_type: 'citation_verified',
          title: 'Citation Verified! 🎉',
          message: `Your content for "${gap.source_query.slice(0, 50)}..." is now being cited by ${analysis.modelsWithCitation.length}/${analysis.totalModels} AI models.`,
          data: {
            gapId,
            memoId: memo?.id,
            timeToCitationHours: analysis.timeToCitationHours,
            citationRate: analysis.citationRate,
            modelsWithCitation: analysis.modelsWithCitation,
          },
        })
        
        // V2 Feed event
        if (memo) {
          await emitCitationVerified({
            tenant_id: brand.tenant_id,
            brand_id: brand.id,
            memo_id: memo.id,
            memo_title: memo.title,
            memo_slug: memo.slug,
            time_to_citation_hours: analysis.timeToCitationHours || 0,
            citing_models: analysis.modelsWithCitation,
            citation_rate: analysis.citationRate,
          })
        }
      } else {
        // Not yet verified - schedule re-check
        await supabase.from('alerts').insert({
          brand_id: brand.id,
          alert_type: 'citation_pending',
          title: 'Citation Pending',
          message: `Content for "${gap.source_query.slice(0, 50)}..." not yet being cited. Will re-check in 24 hours.`,
          data: {
            gapId,
            memoId: memo?.id,
            mentionRate: analysis.mentionRate,
            modelsWithMention: analysis.modelsWithMention,
          },
        })
      }
    })

    // Step 7: Schedule re-check if not verified (up to 3 attempts over 72 hours)
    if (!analysis.verified) {
      const verificationAttempts = (gap.key_factors || [])
        .filter((f: { type: string }) => f.type === 'verification').length

      if (verificationAttempts < 3) {
        await step.sendEvent('schedule-recheck', {
          name: 'gap/verify',
          data: { gapId },
          // Re-check in 24 hours
          ts: Date.now() + (24 * 60 * 60 * 1000),
        })
      }
    }

    return {
      success: true,
      gapId,
      verified: analysis.verified,
      citationRate: analysis.citationRate,
      mentionRate: analysis.mentionRate,
      timeToCitationHours: analysis.timeToCitationHours,
      modelsWithCitation: analysis.modelsWithCitation,
    }
  }
)

/**
 * Verify all content gaps that have content created but not yet verified
 */
export const verifyAllGaps = inngest.createFunction(
  {
    id: 'verify-all-gaps',
    name: 'Verify All Pending Gaps',
    concurrency: { limit: 1 },
  },
  { event: 'gap/verify-all' },
  async ({ event, step }) => {
    const { brandId, minAgeHours = 24 } = event.data

    // Get gaps that need verification (content created, not verified, old enough)
    const gaps = await step.run('get-gaps', async () => {
      const minAge = new Date(Date.now() - (minAgeHours * 60 * 60 * 1000)).toISOString()

      let query = supabase
        .from('content_gaps')
        .select('id, source_query, updated_at')
        .eq('status', 'content_created')
        .lt('updated_at', minAge)
        .order('updated_at', { ascending: true })
        .limit(10) // Process 10 at a time

      if (brandId) {
        query = query.eq('brand_id', brandId)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    })

    if (gaps.length === 0) {
      return { success: true, message: 'No gaps ready for verification', verified: 0 }
    }

    // Trigger verification for each gap
    await step.sendEvent(
      'verify-gaps',
      gaps.map(gap => ({
        name: 'gap/verify',
        data: { gapId: gap.id },
      }))
    )

    return {
      success: true,
      queued: gaps.length,
      gaps: gaps.map(g => ({ id: g.id, query: g.source_query.slice(0, 50) })),
    }
  }
)

/**
 * Get verification metrics for a brand
 */
export const getVerificationMetrics = inngest.createFunction(
  {
    id: 'get-verification-metrics',
    name: 'Calculate Verification Metrics',
  },
  { event: 'metrics/verification' },
  async ({ event, step }) => {
    const { brandId } = event.data

    const metrics = await step.run('calculate-metrics', async () => {
      // Get all gaps with their status
      const { data: gaps } = await supabase
        .from('content_gaps')
        .select('id, status, created_at, verified_at, key_factors, response_memo_id')
        .eq('brand_id', brandId)

      if (!gaps || gaps.length === 0) {
        return {
          totalGaps: 0,
          identified: 0,
          contentCreated: 0,
          verified: 0,
          verificationRate: 0,
          avgTimeToCitation: null,
          fastestCitation: null,
          slowestCitation: null,
        }
      }

      const identified = gaps.filter(g => g.status === 'identified').length
      const contentCreated = gaps.filter(g => g.status === 'content_created').length
      const verified = gaps.filter(g => g.status === 'verified').length

      // Calculate time to citation for verified gaps
      const timesToCitation: number[] = []
      for (const gap of gaps.filter(g => g.status === 'verified')) {
        const verificationData = (gap.key_factors || [])
          .find((f: { type: string; results?: { timeToCitationHours?: number } }) => 
            f.type === 'verification' && f.results?.timeToCitationHours
          )
        if (verificationData?.results?.timeToCitationHours) {
          timesToCitation.push(verificationData.results.timeToCitationHours)
        }
      }

      const avgTimeToCitation = timesToCitation.length > 0
        ? Math.round(timesToCitation.reduce((a, b) => a + b, 0) / timesToCitation.length)
        : null

      return {
        totalGaps: gaps.length,
        identified,
        contentCreated,
        verified,
        verificationRate: gaps.length > 0 ? Math.round((verified / gaps.length) * 100) : 0,
        avgTimeToCitation,
        fastestCitation: timesToCitation.length > 0 ? Math.min(...timesToCitation) : null,
        slowestCitation: timesToCitation.length > 0 ? Math.max(...timesToCitation) : null,
      }
    })

    return metrics
  }
)
