import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { queryPerplexity, checkBrandInCitations } from '@/lib/utils/perplexity'
import { parseOpenRouterAnnotations, checkBrandInOpenRouterCitations, OpenRouterAnnotation } from '@/lib/utils/openrouter'
import { calculateTotalCost } from '@/lib/config/costs'
import { PerplexitySearchResultJson } from '@/lib/supabase/types'

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
const SCAN_MODELS: ModelConfig[] = [
  // Perplexity - direct API for rich citation data
  { 
    id: 'perplexity-sonar', 
    displayName: 'Perplexity Sonar', 
    provider: 'perplexity-direct', 
    modelId: 'sonar', 
    enabled: true,
    citationSource: 'perplexity',
  },
  
  // OpenRouter with native search (:online suffix)
  // These providers have built-in web search: OpenAI, Anthropic, xAI
  { 
    id: 'gpt-4o-mini', 
    displayName: 'GPT-4o Mini', 
    provider: 'openrouter', 
    modelId: 'openai/gpt-4o-mini:online', 
    enabled: true,
    citationSource: 'openrouter-native',
  },
  { 
    id: 'claude-3-5-haiku', 
    displayName: 'Claude 3.5 Haiku', 
    provider: 'openrouter', 
    modelId: 'anthropic/claude-3.5-haiku:online', 
    enabled: true,
    citationSource: 'openrouter-native',
  },
  { 
    id: 'grok-4-fast', 
    displayName: 'Grok 4 Fast', 
    provider: 'openrouter', 
    modelId: 'x-ai/grok-4-fast:online', 
    enabled: true,
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
              .limit(30), // Limit to top 30 queries per scan for faster scans
        supabase
          .from('competitors')
          .select('name')
          .eq('brand_id', brandId)
          .eq('is_active', true),
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

    // Get enabled models
    const enabledModels = SCAN_MODELS.filter(m => m.enabled)
    
    // Step 2: Run scans for each query across all enabled models
    const scanResults: ScanResult[] = []
    
    // Process queries in batches of 5 (smaller batches since we're running more models)
    const batchSize = 5
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize)
      
      const batchResults = await step.run(`scan-batch-${i}`, async () => {
        const results: ScanResult[] = []
        
        for (const query of batch) {
          // Scan with each enabled model
          for (const modelConfig of enabledModels) {
            try {
              // Use direct Perplexity API for citation data
              if (modelConfig.provider === 'perplexity-direct') {
                const scanResult = await scanWithPerplexityDirect(
                  query.query_text,
                  brandName,
                  brand.domain,
                  competitorNames
                )
                results.push({
                  queryId: query.id,
                  model: modelConfig.id,
                  citationSource: modelConfig.citationSource,
                  ...scanResult,
                })
              } else {
                // OpenRouter with :online suffix for native web search
                const scanResult = await scanWithOpenRouter(
                  query.query_text,
                  modelConfig,
                  brandName,
                  brand.domain,
                  competitorNames
                )
                results.push({
                  queryId: query.id,
                  model: modelConfig.id,
                  citationSource: modelConfig.citationSource,
                  ...scanResult,
                })
              }
            } catch (error) {
              console.error(`${modelConfig.displayName} scan failed for query ${query.id}:`, error)
              // Continue with other models even if one fails
            }
            
            // Small delay between model calls to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 150))
          }
          
          // Slightly longer delay between queries
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        return results
      })
      
      scanResults.push(...batchResults)
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
    await step.run('log-usage', async () => {
      const usageEvents = scanResults.map((r, i) => {
        const costs = calculateTotalCost(r.model, r.inputTokens, r.outputTokens)
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

    // Step 5: Create alert with results
    await step.run('create-alert', async () => {
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'scan_complete',
        title: 'AI Search Scan Complete',
        message: `Citation score: ${citationScore}%. Found ${gaps.length} citation gaps.`,
        data: { citationScore, visibilityScore, gapCount: gaps.length, totalScans: scanResults.length },
      })
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

    // Step 7: Trigger prompt enrichment to mine scan results for new prompts/competitors
    await step.sendEvent('trigger-prompt-enrichment', {
      name: 'prompt/enrich',
      data: { brandId },
    })

    return {
      success: true,
      scansCompleted: scanResults.length,
      citationScore,
      visibilityScore,
      gapsFound: gaps.length,
      autoMemosTriggered: autoGenerateMemos,
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
