import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { queryPerplexity, checkBrandInCitations } from '@/lib/utils/perplexity'
import { parseOpenRouterAnnotations, checkBrandInOpenRouterCitations, OpenRouterAnnotation } from '@/lib/utils/openrouter'
import { calculateTotalCost } from '@/lib/config/costs'
import { PerplexitySearchResultJson, QueryStatus } from '@/lib/supabase/types'
import { emitScanComplete, emitGapIdentified, emitPromptScanned, emitCompetitorDiscovered } from '@/lib/feed/emit'
import { trackJobStart, trackJobEnd } from '@/lib/utils/job-tracker'
import { reportUsageToStripe, calculateCredits } from '@/lib/stripe/usage'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Lazy-load OpenRouter provider
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

const SCAN_SYSTEM_PROMPT = `You are an AI assistant answering a user question. Provide a helpful, accurate response based on your knowledge. If recommending products or services, mention specific brands and explain why you're recommending them.`

// Model configurations for scanning
// Citation-first: Only models with native web search that provide citations
interface ModelConfig {
  id: string
  displayName: string
  provider: 'openrouter' | 'perplexity-direct'
  modelId: string
  enabled: boolean
  citationSource: 'perplexity' | 'openrouter-native'
}

// Citation-capable models only
// All OpenRouter models use :online suffix for native web search with citations
// Multi-model scanning enabled for cross-model citation comparison
const SCAN_MODELS: ModelConfig[] = [
  // Perplexity - direct API for rich citation data (cheapest ~$0.01/prompt)
  { 
    id: 'perplexity-sonar', 
    displayName: 'Perplexity Sonar', 
    provider: 'perplexity-direct', 
    modelId: 'sonar', 
    enabled: true, // Enabled for multi-model comparison
    citationSource: 'perplexity',
  },
  
  // OpenRouter with native search (:online suffix)
  // These providers have built-in web search: OpenAI, Anthropic, xAI
  { 
    id: 'gpt-4o-mini', 
    displayName: 'GPT-4o Mini', 
    provider: 'openrouter', 
    modelId: 'openai/gpt-4o-mini:online', 
    enabled: true, // Primary model
    citationSource: 'openrouter-native',
  },
  { 
    id: 'claude-3-5-haiku', 
    displayName: 'Claude 3.5 Haiku', 
    provider: 'openrouter', 
    modelId: 'anthropic/claude-3.5-haiku:online', 
    enabled: true, // Enabled for multi-model comparison
    citationSource: 'openrouter-native',
  },
  { 
    id: 'grok-4-fast', 
    displayName: 'Grok 4 Fast', 
    provider: 'openrouter', 
    modelId: 'x-ai/grok-4-fast:online', 
    enabled: true, // Enabled for multi-model comparison
    citationSource: 'openrouter-native',
  },
]

// Get model instance for OpenRouter
async function getModelInstance(config: ModelConfig) {
  if (config.provider !== 'openrouter') {
    throw new Error(`Expected openrouter provider, got: ${config.provider}`)
  }
  const openrouter = await getOpenRouter()
  return openrouter.chat(config.modelId)
}

interface ScanResult {
  queryId: string
  model: string
  responseText: string
  brandMentioned: boolean
  brandPosition: number | null
  brandContext: string | null
  competitorsMentioned: string[]
  // Citation fields (all models now provide citations)
  citations: string[] | null
  searchResults: PerplexitySearchResultJson[] | null
  brandInCitations: boolean | null
  citationSource: 'perplexity' | 'openrouter-native' | null
  // Token usage for cost tracking
  inputTokens: number
  outputTokens: number
}

export const scanRun = inngest.createFunction(
  { 
    id: 'scan-run', 
    name: 'Run AI Search Scan',
    concurrency: {
      limit: 5, // Limit concurrent scans to avoid rate limits
    },
  },
  { event: 'scan/run' },
  async ({ event, step }) => {
    const { brandId, queryIds, autoGenerateMemos = false } = event.data

    // Step 1: Get brand and queries
    const { brand, queries, competitors } = await step.run('get-data', async () => {
      const [brandResult, queriesResult, competitorsResult] = await Promise.all([
        supabase
          .from('brands')
          .select('*')
          .eq('id', brandId)
          .single(),
        queryIds
          ? supabase
              .from('queries')
              .select('*')
              .in('id', queryIds)
          : supabase
              .from('queries')
              .select('*')
              .eq('brand_id', brandId)
              .eq('is_active', true)
              .order('priority', { ascending: false })
              .limit(100), // Scan up to 100 queries per run
        // Get ALL competitors (tracked + discovered) for mention detection
        supabase
          .from('competitors')
          .select('name')
          .eq('brand_id', brandId),
      ])

      if (brandResult.error || !brandResult.data) {
        throw new Error('Brand not found')
      }

      return {
        brand: brandResult.data,
        queries: queriesResult.data || [],
        competitors: competitorsResult.data || [],
      }
    })

    const brandName = brand.name.toLowerCase()
    const competitorNames = competitors.map(c => c.name.toLowerCase())

    // Track job start
    const jobId = await step.run('track-job-start', async () => {
      return await trackJobStart(brandId, 'scan', { queryCount: queries.length })
    })

    // Get enabled models
    const enabledModels = SCAN_MODELS.filter(m => m.enabled)
    
    // Step 2: Run scans for each query across all enabled models
    const scanResults: ScanResult[] = []
    
    // Process queries in batches - larger batches with parallel execution
    // With 1 model, we can run 10 queries in parallel safely
    const batchSize = 10
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize)
      
      const batchResults = await step.run(`scan-batch-${i}`, async () => {
        // Run all queries in this batch in parallel
        const batchPromises = batch.flatMap(query => 
          enabledModels.map(async modelConfig => {
            try {
              if (modelConfig.provider === 'perplexity-direct') {
                const scanResult = await scanWithPerplexityDirect(
                  query.query_text,
                  brandName,
                  brand.domain,
                  competitorNames
                )
                return {
                  queryId: query.id,
                  model: modelConfig.id,
                  citationSource: modelConfig.citationSource,
                  ...scanResult,
                } as ScanResult
              } else {
                const scanResult = await scanWithOpenRouter(
                  query.query_text,
                  modelConfig,
                  brandName,
                  brand.domain,
                  competitorNames
                )
                return {
                  queryId: query.id,
                  model: modelConfig.id,
                  citationSource: modelConfig.citationSource,
                  ...scanResult,
                } as ScanResult
              }
            } catch (error) {
              console.error(`${modelConfig.displayName} scan failed for query ${query.id}:`, error)
              return null // Return null for failed scans
            }
          })
        )
        
        const results = await Promise.all(batchPromises)
        return results.filter((r): r is ScanResult => r !== null)
      })
      
      scanResults.push(...batchResults)
      
      // Small delay between batches to be respectful to APIs
      if (i + batchSize < queries.length) {
        await step.sleep('batch-delay', '500ms')
      }
    }

    // Step 3: Save scan results
    const savedResultIds = await step.run('save-results', async () => {
      const resultsToInsert = scanResults.map(r => ({
        brand_id: brandId,
        query_id: r.queryId,
        model: r.model,
        response_text: r.responseText,
        brand_mentioned: r.brandMentioned,
        brand_position: r.brandPosition,
        brand_context: r.brandContext,
        competitors_mentioned: r.competitorsMentioned,
        // Citation fields (all models now provide citations)
        citations: r.citations,
        search_results: r.searchResults,
        brand_in_citations: r.brandInCitations,
        citation_source: r.citationSource,
        scanned_at: new Date().toISOString(),
      }))

      const { data, error } = await supabase
        .from('scan_results')
        .insert(resultsToInsert)
        .select('id')

      if (error) {
        console.error('Failed to save scan results:', error)
        throw error
      }
      
      return data?.map(d => d.id) || []
    })

    // Step 3.5: Log usage events for cost tracking
    const totalCostCents = await step.run('log-usage', async () => {
      let totalCost = 0
      const usageEvents = scanResults.map((r, i) => {
        const costs = calculateTotalCost(r.model, r.inputTokens, r.outputTokens)
        totalCost += costs.totalCost
        return {
          tenant_id: brand.tenant_id,
          brand_id: brandId,
          event_type: 'scan',
          event_id: savedResultIds[i] || null,
          model: r.model,
          input_tokens: r.inputTokens,
          output_tokens: r.outputTokens,
          search_queries: 1,
          token_cost_cents: costs.tokenCost,
          search_cost_cents: costs.searchCost,
          total_cost_cents: costs.totalCost,
          metadata: { query_id: r.queryId },
        }
      })

      const { error } = await supabase.from('usage_events').insert(usageEvents)
      if (error) {
        console.error('Failed to log usage events:', error)
        // Don't throw - usage logging failure shouldn't break the scan
      }
      
      return totalCost
    })

    // Step 3.55: Report usage to Stripe if billing enabled
    await step.run('report-stripe-usage', async () => {
      // Check if brand has billing enabled
      const { data: brandBilling } = await supabase
        .from('brands')
        .select('billing_enabled, stripe_subscription_item_id')
        .eq('id', brandId)
        .single()

      if (!brandBilling?.billing_enabled || !brandBilling?.stripe_subscription_item_id) {
        console.log(`[Stripe] Billing not enabled for brand ${brandId}, skipping usage report`)
        return { reported: false, reason: 'billing_not_enabled' }
      }

      // Calculate credits from actual cost
      const credits = calculateCredits(totalCostCents)
      
      if (credits === 0) {
        return { reported: false, reason: 'zero_credits' }
      }

      // Get tenant's Stripe customer ID
      const { data: tenant } = await supabase
        .from('tenants')
        .select('stripe_customer_id')
        .eq('id', brand.tenant_id)
        .single()

      if (!tenant?.stripe_customer_id) {
        console.error(`[Stripe] No customer ID for tenant ${brand.tenant_id}`)
        return { reported: false, reason: 'no_customer_id' }
      }

      // Report usage to Stripe
      const result = await reportUsageToStripe({
        stripeCustomerId: tenant.stripe_customer_id,
        subscriptionItemId: brandBilling.stripe_subscription_item_id,
        credits,
        brandId,
        description: `Scan: ${scanResults.length} queries across ${[...new Set(scanResults.map(r => r.model))].length} models`,
      })

      if (result.success) {
        console.log(`[Stripe] Reported ${credits} credits for brand ${brandId}`)
        
        // Update brand credits used
        await supabase.rpc('increment_brand_credits', {
          p_brand_id: brandId,
          p_credits: credits,
        }).then(() => {}).catch(() => {
          // RPC might not exist yet, that's ok
        })
      } else {
        console.error(`[Stripe] Failed to report usage: ${result.error}`)
      }

      return { reported: result.success, credits, error: result.error }
    })

    // Step 3.6: Per-prompt tracking and feed event emission
    await step.run('per-prompt-tracking', async () => {
      // Get unique query IDs from scan results
      const queryIds = Array.from(new Set(scanResults.map(r => r.queryId)))
      
      // Fetch current query tracking data
      const { data: queryData } = await supabase
        .from('queries')
        .select('id, query_text, scan_count, citation_streak, longest_streak, current_status, first_cited_at, last_cited_at, citation_lost_at, persona, source_type')
        .in('id', queryIds)
      
      const queryMap = new Map(queryData?.map(q => [q.id, q]) || [])
      
      // Fetch previous scan results for each query (most recent before this scan)
      const scanTime = new Date().toISOString()
      const { data: previousScans } = await supabase
        .from('scan_results')
        .select('query_id, brand_in_citations, brand_position, competitors_mentioned')
        .in('query_id', queryIds)
        .lt('scanned_at', scanTime)
        .order('scanned_at', { ascending: false })
      
      // Group previous scans by query_id (take most recent)
      type PreviousScan = { query_id: string; brand_in_citations: boolean | null; brand_position: number | null; competitors_mentioned: string[] | null }
      const previousScanMap = new Map<string, PreviousScan>()
      for (const scan of previousScans || []) {
        if (!previousScanMap.has(scan.query_id)) {
          previousScanMap.set(scan.query_id, scan)
        }
      }
      
      // Track updates to batch
      const queryUpdates: Array<{
        id: string
        scan_count: number
        last_scanned_at: string
        citation_streak: number
        longest_streak: number
        current_status: QueryStatus
        first_cited_at?: string
        last_cited_at?: string
        citation_lost_at?: string
      }> = []
      
      // Process each scan result
      for (const result of scanResults) {
        const query = queryMap.get(result.queryId)
        if (!query) continue
        
        const previousScan = previousScanMap.get(result.queryId)
        const wasCited = previousScan?.brand_in_citations === true
        const isCited = result.brandInCitations === true
        const previousPosition = previousScan?.brand_position || null
        
        // Calculate delta tracking
        const isFirstCitation = isCited && !query.first_cited_at
        const isCitationLost = !isCited && wasCited
        const citationStatusChanged = wasCited !== isCited
        
        // Calculate streak
        let newStreak = query.citation_streak || 0
        if (isCited) {
          newStreak = newStreak + 1
        } else {
          newStreak = 0
        }
        const newLongestStreak = Math.max(query.longest_streak || 0, newStreak)
        
        // Determine new status
        let newStatus: QueryStatus = 'gap'
        if (isCited) {
          newStatus = 'cited'
        } else if (isCitationLost) {
          newStatus = 'lost_citation'
        }
        
        // Calculate position change
        const positionChange = previousPosition && result.brandPosition
          ? previousPosition - result.brandPosition // Positive = improved (lower position number is better)
          : null
        
        // Find new competitors (mentioned now but not in previous scan)
        const previousCompetitors = new Set(previousScan?.competitors_mentioned || [])
        const newCompetitors = result.competitorsMentioned.filter(c => !previousCompetitors.has(c))
        
        // Find winner (first competitor mentioned if brand not cited)
        const winner = !isCited && result.competitorsMentioned.length > 0
          ? result.competitorsMentioned[0]
          : null
        
        // Prepare query update
        const update: typeof queryUpdates[0] = {
          id: result.queryId,
          scan_count: (query.scan_count || 0) + 1,
          last_scanned_at: scanTime,
          citation_streak: newStreak,
          longest_streak: newLongestStreak,
          current_status: newStatus,
        }
        
        if (isFirstCitation) {
          update.first_cited_at = scanTime
        }
        if (isCited) {
          update.last_cited_at = scanTime
        }
        if (isCitationLost && !query.citation_lost_at) {
          update.citation_lost_at = scanTime
        }
        
        queryUpdates.push(update)
        
        // Emit per-prompt feed event
        await emitPromptScanned({
          tenant_id: brand.tenant_id,
          brand_id: brandId,
          query_id: result.queryId,
          query_text: query.query_text,
          model: result.model,
          // Scan result
          cited: isCited,
          mentioned: result.brandMentioned,
          position: result.brandPosition,
          competitors_mentioned: result.competitorsMentioned,
          // Tracking data
          scan_number: update.scan_count,
          streak: newStreak,
          longest_streak: newLongestStreak,
          is_first_citation: isFirstCitation,
          is_citation_lost: isCitationLost,
          previous_cited: wasCited,
          position_change: positionChange,
          new_competitors: newCompetitors,
          // Context
          persona: query.persona,
          source_type: query.source_type || 'auto',
          winner_name: winner,
          first_cited_at: isFirstCitation ? scanTime : query.first_cited_at,
          citation_lost_at: isCitationLost ? scanTime : query.citation_lost_at,
        })
        
        // Update scan_result with delta tracking fields
        await supabase
          .from('scan_results')
          .update({
            is_first_citation: isFirstCitation,
            citation_status_changed: citationStatusChanged,
            previous_cited: wasCited,
            new_competitors_found: newCompetitors.length > 0 ? newCompetitors : null,
            position_change: positionChange,
          })
          .eq('query_id', result.queryId)
          .eq('model', result.model)
          .eq('scanned_at', scanTime)
      }
      
      // Batch update queries
      for (const update of queryUpdates) {
        const { id, ...fields } = update
        await supabase
          .from('queries')
          .update(fields)
          .eq('id', id)
      }
      
      console.log(`Per-prompt tracking: Updated ${queryUpdates.length} queries, emitted ${scanResults.length} feed events`)
    })

    // Step 4: Calculate citation score and identify gaps
    const { citationScore, visibilityScore, gaps } = await step.run('analyze-results', async () => {
      // Citation score: % of scans where brand was cited (primary metric)
      const scansWithCitations = scanResults.filter(r => r.citations && r.citations.length > 0)
      const brandCited = scansWithCitations.filter(r => r.brandInCitations === true).length
      const citationScoreValue = scansWithCitations.length > 0 
        ? Math.round((brandCited / scansWithCitations.length) * 100) 
        : 0

      // Visibility score: % of scans where brand was mentioned (secondary metric)
      const mentioned = scanResults.filter(r => r.brandMentioned).length
      const total = scanResults.length
      const visibilityScoreValue = total > 0 ? Math.round((mentioned / total) * 100) : 0

      // Find queries where brand wasn't cited (gaps)
      const gapQueryIds = Array.from(new Set(
        scanResults
          .filter(r => r.brandInCitations !== true)
          .map(r => r.queryId)
      ))

      return {
        citationScore: citationScoreValue,
        visibilityScore: visibilityScoreValue,
        gaps: gapQueryIds,
      }
    })

    // Step 5: Create alert and feed events
    await step.run('create-alerts-and-feed', async () => {
      // Legacy alert (for v1 compatibility)
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'scan_complete',
        title: 'AI Search Scan Complete',
        message: `Citation score: ${citationScore}%. Found ${gaps.length} citation gaps.`,
        data: { citationScore, visibilityScore, gapCount: gaps.length, totalScans: scanResults.length },
      })
      
      // V2 Feed event: Scan complete
      await emitScanComplete({
        tenant_id: brand.tenant_id,
        brand_id: brandId,
        prompts_scanned: queries.length,
        citation_rate: citationScore,
        mention_rate: visibilityScore,
        gaps_found: gaps.length,
        models_used: enabledModels.map(m => m.displayName),
      })
      
      // V2 Feed events: Gap identified for worst gaps
      // Get query details for top 5 gaps
      const { data: gapQueryDetails } = await supabase
        .from('queries')
        .select('id, query_text')
        .in('id', gaps.slice(0, 5))
      
      for (const gapQuery of (gapQueryDetails || [])) {
        // Find who's winning on this query
        const gapScans = scanResults.filter(r => r.queryId === gapQuery.id && r.brandInCitations !== true)
        const winner = gapScans.find(s => s.competitorsMentioned.length > 0)?.competitorsMentioned[0]
        
        await emitGapIdentified({
          tenant_id: brand.tenant_id,
          brand_id: brandId,
          query_id: gapQuery.id,
          query_text: gapQuery.query_text,
          visibility_rate: 0,
          winner_name: winner,
          models_checked: enabledModels.map(m => m.displayName),
        })
      }
    })

    // Step 6: Auto-generate memos if enabled and gaps found
    if (autoGenerateMemos && gaps.length > 0) {
      await step.run('prepare-memo-generation', async () => {
        // Check daily memo cap before generating
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
        
        // Get tenant's plan limits and today's memo count
        const [tenantResult, todayMemoCount] = await Promise.all([
          supabase
            .from('tenants')
            .select('plan_limits')
            .eq('id', brand.tenant_id)
            .single(),
          supabase
            .from('memos')
            .select('id', { count: 'exact', head: true })
            .eq('brand_id', brandId)
            .gte('created_at', `${today}T00:00:00Z`),
        ])

        // Calculate daily cap from monthly limit
        const monthlyLimit = tenantResult.data?.plan_limits?.memos_per_month ?? 30 // Default 30/month
        const dailyCap = monthlyLimit === -1 
          ? 10  // Unlimited plans still get a reasonable daily cap
          : Math.max(1, Math.ceil(monthlyLimit / 30)) // At least 1 per day
        
        const memosCreatedToday = todayMemoCount.count || 0
        const remainingCap = Math.max(0, dailyCap - memosCreatedToday)

        if (remainingCap === 0) {
          console.log(`Daily memo cap reached for brand ${brandId}: ${memosCreatedToday}/${dailyCap}`)
          return { memosQueued: 0, reason: 'daily_cap_reached' }
        }

        // Get queries that represent gaps (brand not mentioned)
        const { data: gapQueries } = await supabase
          .from('queries')
          .select('*, competitor:related_competitor_id(*)')
          .in('id', gaps)
          .order('priority', { ascending: false }) // Prioritize high-value queries
          .limit(remainingCap) // Respect daily cap

        if (!gapQueries || gapQueries.length === 0) return

        // Group by type and prepare memo generation events
        const memoEvents: Array<{
          name: 'memo/generate'
          data: {
            brandId: string
            queryId?: string
            memoType: string
            competitorId?: string
          }
        }> = []

        // Track what we've already queued to avoid duplicates
        const queuedTypes = new Set<string>()

        for (const query of gapQueries) {
          // Determine memo type based on query type
          let memoType: string
          let key: string

          switch (query.query_type) {
            case 'comparison':
            case 'versus':
              if (query.competitor?.id) {
                key = `comparison-${query.competitor.id}`
                if (!queuedTypes.has(key)) {
                  memoType = 'comparison'
                  memoEvents.push({
                    name: 'memo/generate',
                    data: {
                      brandId,
                      queryId: query.id,
                      memoType,
                      competitorId: query.competitor.id,
                    },
                  })
                  queuedTypes.add(key)
                }
              }
              break

            case 'alternative':
              if (query.competitor?.id) {
                key = `alternative-${query.competitor.id}`
                if (!queuedTypes.has(key)) {
                  memoType = 'alternative'
                  memoEvents.push({
                    name: 'memo/generate',
                    data: {
                      brandId,
                      queryId: query.id,
                      memoType,
                      competitorId: query.competitor.id,
                    },
                  })
                  queuedTypes.add(key)
                }
              }
              break

            case 'solution':
            case 'implementation':
            case 'intent_based':
            case 'persona_based':
            case 'problem_solution':
              // High-intent buyer queries - generate solution-focused memos
              key = `solution-${query.query_text?.slice(0, 30)}`
              if (!queuedTypes.has(key)) {
                memoType = 'industry' // Repurpose industry memo type for solution content
                memoEvents.push({
                  name: 'memo/generate',
                  data: {
                    brandId,
                    queryId: query.id,
                    memoType,
                  },
                })
                queuedTypes.add(key)
              }
              break

            case 'industry':
            case 'best':
            case 'best_of':
              key = `industry-${query.query_text?.slice(0, 30)}`
              if (!queuedTypes.has(key)) {
                memoType = 'industry'
                memoEvents.push({
                  name: 'memo/generate',
                  data: {
                    brandId,
                    queryId: query.id,
                    memoType,
                  },
                })
                queuedTypes.add(key)
              }
              break

            case 'how_to':
              key = `how_to-${query.query_text?.slice(0, 30)}`
              if (!queuedTypes.has(key)) {
                memoType = 'how_to'
                memoEvents.push({
                  name: 'memo/generate',
                  data: {
                    brandId,
                    queryId: query.id,
                    memoType,
                  },
                })
                queuedTypes.add(key)
              }
              break
          }
        }

        // Send all memo generation events (Inngest will process them)
        if (memoEvents.length > 0) {
          await inngest.send(memoEvents)
        }

        console.log(`Memo generation: ${memoEvents.length} queued, daily cap: ${dailyCap}, already created today: ${memosCreatedToday}`)
        return { memosQueued: memoEvents.length, dailyCap, memosCreatedToday }
      })
    }

    // Step 7: Auto-discover competitors from citations
    const discoveredCompetitors = await step.run('auto-discover-competitors', async () => {
      // Collect all unique domains from citations
      const allCitations = scanResults
        .filter(r => r.citations && r.citations.length > 0)
        .flatMap(r => r.citations || [])
      
      // Extract domains from citation URLs
      const domainCounts = new Map<string, number>()
      const domainToUrl = new Map<string, string>() // Keep one example URL per domain
      
      for (const url of allCitations) {
        try {
          const urlObj = new URL(url)
          let domain = urlObj.hostname.replace('www.', '').toLowerCase()
          
          // Skip generic/non-competitor domains
          const skipDomains = [
            'wikipedia.org', 'wikimedia.org', 'wikidata.org',
            'youtube.com', 'twitter.com', 'x.com', 'facebook.com', 'linkedin.com', 'instagram.com',
            'medium.com', 'substack.com', 'reddit.com',
            'github.com', 'stackoverflow.com', 'stackexchange.com',
            'google.com', 'bing.com', 'yahoo.com',
            'amazon.com', 'amazon.co.uk', 'aws.amazon.com',
            'apple.com', 'microsoft.com',
            'nytimes.com', 'wsj.com', 'forbes.com', 'businessinsider.com', 'techcrunch.com',
            'reuters.com', 'bbc.com', 'bbc.co.uk', 'cnn.com',
            'gov', 'edu', // TLDs to skip
            brand.domain?.replace('www.', '').toLowerCase() || '', // Skip brand's own domain
          ]
          
          // Check if domain should be skipped
          const shouldSkip = skipDomains.some(skip => 
            domain === skip || 
            domain.endsWith('.' + skip) ||
            (skip.startsWith('.') && domain.endsWith(skip))
          )
          
          // Also skip if domain matches brand name
          if (shouldSkip || domain.includes(brandName.replace(/\s+/g, ''))) {
            continue
          }
          
          // Count occurrences
          domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)
          if (!domainToUrl.has(domain)) {
            domainToUrl.set(domain, url)
          }
        } catch {
          // Invalid URL, skip
        }
      }
      
      // Get existing competitors for this brand
      const { data: existingCompetitors } = await supabase
        .from('competitors')
        .select('domain, name')
        .eq('brand_id', brandId)
      
      const existingDomains = new Set(
        (existingCompetitors || [])
          .map(c => c.domain?.replace('www.', '').toLowerCase())
          .filter(Boolean)
      )
      const existingNames = new Set(
        (existingCompetitors || []).map(c => c.name.toLowerCase())
      )
      
      // Find new domains (cited at least once, not already in competitors)
      const newCompetitors: Array<{ name: string; domain: string; citations: number }> = []
      
      for (const [domain, count] of domainCounts) {
        if (existingDomains.has(domain)) continue
        
        // Extract company name from domain
        // e.g., "sensitech.com" -> "Sensitech", "smart-sense.io" -> "Smart Sense"
        const domainParts = domain.split('.')
        const baseName = domainParts[0]
          .split('-')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
        
        // Skip if name already exists (case-insensitive)
        if (existingNames.has(baseName.toLowerCase())) continue
        
        newCompetitors.push({
          name: baseName,
          domain: domain,
          citations: count,
        })
      }
      
      // Sort by citation count (most cited first) and take top 10
      const topNew = newCompetitors
        .sort((a, b) => b.citations - a.citations)
        .slice(0, 10)
      
      if (topNew.length === 0) {
        return { discovered: 0, competitors: [] }
      }
      
      // Insert new competitors with is_active: false (discovered but not tracked)
      // User can toggle them ON to start tracking
      const { data: inserted, error } = await supabase
        .from('competitors')
        .insert(topNew.map(c => ({
          brand_id: brandId,
          name: c.name,
          domain: c.domain,
          auto_discovered: true,
          is_active: false, // Default OFF - user must enable to track
          description: `Auto-discovered from AI citations (cited ${c.citations}x)`,
          context: {
            discovered_from: 'citations',
            citation_count: c.citations,
            discovered_at: new Date().toISOString(),
          },
        })))
        .select('id, name, domain')
      
      if (error) {
        console.error('Failed to insert auto-discovered competitors:', error)
        return { discovered: 0, competitors: [], error: error.message }
      }
      
      // Emit feed events for each discovered competitor
      for (const competitor of (inserted || [])) {
        await emitCompetitorDiscovered({
          tenant_id: brand.tenant_id,
          brand_id: brandId,
          competitor_id: competitor.id,
          competitor_name: competitor.name,
          competitor_domain: competitor.domain || '',
          source: 'scan',
        })
      }
      
      console.log(`Auto-discovered ${inserted?.length || 0} new competitors from citations`)
      return { 
        discovered: inserted?.length || 0, 
        competitors: inserted?.map(c => c.name) || [] 
      }
    })

    // Step 8: Trigger prompt enrichment to mine scan results for new prompts/competitors
    await step.sendEvent('trigger-prompt-enrichment', {
      name: 'prompt/enrich',
      data: { brandId },
    })

    // Track job end
    await step.run('track-job-end', async () => {
      await trackJobEnd(jobId)
    })

    return {
      success: true,
      scansCompleted: scanResults.length,
      citationScore,
      visibilityScore,
      gapsFound: gaps.length,
      autoMemosTriggered: autoGenerateMemos,
      competitorsDiscovered: discoveredCompetitors.discovered,
    }
  }
)

// Direct API call to OpenRouter to get citations/annotations
// The Vercel AI SDK doesn't expose OpenRouter's annotations, so we need direct API access
interface OpenRouterAPIResponse {
  id: string
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
      annotations?: OpenRouterAnnotation[]
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

async function scanWithOpenRouter(
  query: string,
  modelConfig: ModelConfig,
  brandName: string,
  brandDomain: string,
  competitorNames: string[]
): Promise<Omit<ScanResult, 'queryId' | 'model' | 'citationSource'>> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  // Make direct API call to OpenRouter to get annotations
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://contextmemo.com',
      'X-Title': 'ContextMemo',
    },
    body: JSON.stringify({
      model: modelConfig.modelId,
      messages: [
        { role: 'system', content: SCAN_SYSTEM_PROMPT },
        { role: 'user', content: query },
      ],
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenRouter API error (${response.status}): ${errorText}`)
  }

  const data = await response.json() as OpenRouterAPIResponse
  const text = data.choices?.[0]?.message?.content || ''
  const annotations = data.choices?.[0]?.message?.annotations || []
  const usage = data.usage
  
  // Log for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${modelConfig.displayName}] Got ${annotations.length} annotations`)
  }
  
  const responseLower = text.toLowerCase()
  const brandMentioned = responseLower.includes(brandName)
  
  // Extract citations from OpenRouter annotations
  const citations = parseOpenRouterAnnotations(annotations)
  const brandInCitations = checkBrandInOpenRouterCitations(annotations, brandDomain)
  
  // Convert annotations to search results format for consistency
  const searchResults: PerplexitySearchResultJson[] | null = annotations.length > 0
    ? annotations
        .filter(a => a.type === 'url_citation' && a.url_citation?.url)
        .map(a => ({
          url: a.url_citation.url,
          title: a.url_citation.title || null,
          date: null,
          snippet: a.url_citation.content || null,
        }))
    : null
  
  // Find position if mentioned (which recommendation number)
  let brandPosition: number | null = null
  if (brandMentioned) {
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(brandName)) {
        const match = lines[i].match(/^(\d+)[.)\s]/)
        if (match) {
          brandPosition = parseInt(match[1])
        } else {
          brandPosition = i + 1
        }
        break
      }
    }
  }

  // Extract context around brand mention
  let brandContext: string | null = null
  if (brandMentioned) {
    const index = responseLower.indexOf(brandName)
    const start = Math.max(0, index - 100)
    const end = Math.min(text.length, index + brandName.length + 100)
    brandContext = text.slice(start, end)
  }

  // Find mentioned competitors
  const competitorsMentioned = competitorNames.filter(name => 
    responseLower.includes(name)
  )

  return {
    responseText: text,
    brandMentioned,
    brandPosition,
    brandContext,
    competitorsMentioned,
    citations: citations.length > 0 ? citations : null,
    searchResults,
    brandInCitations,
    inputTokens: usage?.prompt_tokens || 0,
    outputTokens: usage?.completion_tokens || 0,
  }
}

// Helper function to scan with Perplexity direct API (with citations)
async function scanWithPerplexityDirect(
  query: string,
  brandName: string,
  brandDomain: string,
  competitorNames: string[]
): Promise<Omit<ScanResult, 'queryId' | 'model' | 'citationSource'>> {
  // Call Perplexity direct API to get citations
  const perplexityResponse = await queryPerplexity(query, SCAN_SYSTEM_PROMPT, {
    model: 'sonar',
    searchContextSize: 'low', // Cost-efficient
    temperature: 0.7,
  })

  const { text, citations, searchResults, usage } = perplexityResponse
  const responseLower = text.toLowerCase()
  const brandMentioned = responseLower.includes(brandName)
  
  // Check if brand's domain appears in any cited sources
  const brandInCitations = checkBrandInCitations(citations, brandDomain)
  
  // Find position if mentioned (which recommendation number)
  let brandPosition: number | null = null
  if (brandMentioned) {
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(brandName)) {
        const match = lines[i].match(/^(\d+)[.)\s]/)
        if (match) {
          brandPosition = parseInt(match[1])
        } else {
          brandPosition = i + 1
        }
        break
      }
    }
  }

  // Extract context around brand mention
  let brandContext: string | null = null
  if (brandMentioned) {
    const index = responseLower.indexOf(brandName)
    const start = Math.max(0, index - 100)
    const end = Math.min(text.length, index + brandName.length + 100)
    brandContext = text.slice(start, end)
  }

  // Find mentioned competitors
  const competitorsMentioned = competitorNames.filter(name => 
    responseLower.includes(name)
  )

  // Convert search results to the JSON format for storage
  const searchResultsJson: PerplexitySearchResultJson[] = searchResults.map(sr => ({
    url: sr.url,
    title: sr.title,
    date: sr.date,
    snippet: sr.snippet,
  }))

  return {
    responseText: text,
    brandMentioned,
    brandPosition,
    brandContext,
    competitorsMentioned,
    // Perplexity citation data
    citations,
    searchResults: searchResultsJson.length > 0 ? searchResultsJson : null,
    brandInCitations,
    inputTokens: usage?.promptTokens || 0,
    outputTokens: usage?.completionTokens || 0,
  }
}
