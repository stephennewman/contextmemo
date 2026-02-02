import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { queryPerplexity, checkBrandInCitations, PerplexitySearchResult } from '@/lib/utils/perplexity'
import { PerplexitySearchResultJson } from '@/lib/supabase/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Lazy-load AI providers to avoid build-time errors when env vars aren't set
let _openai: ReturnType<typeof import('@ai-sdk/openai').openai> | null = null
let _anthropic: ReturnType<typeof import('@ai-sdk/anthropic').anthropic> | null = null
let _openrouter: ReturnType<typeof import('@openrouter/ai-sdk-provider').createOpenRouter> | null = null

async function getOpenAI() {
  if (!_openai) {
    const { openai } = await import('@ai-sdk/openai')
    _openai = openai
  }
  return _openai
}

async function getAnthropic() {
  if (!_anthropic) {
    const { anthropic } = await import('@ai-sdk/anthropic')
    _anthropic = anthropic
  }
  return _anthropic
}

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
// Using cheaper/faster models for cost efficiency while covering major AI providers
interface ModelConfig {
  id: string
  displayName: string
  provider: 'openai' | 'anthropic' | 'openrouter' | 'perplexity-direct'
  modelId: string
  enabled: boolean
}

const SCAN_MODELS: ModelConfig[] = [
  // Direct providers (faster, no routing overhead)
  { id: 'gpt-4o-mini', displayName: 'GPT-4o Mini', provider: 'openai', modelId: 'gpt-4o-mini', enabled: true },
  { id: 'claude-3-5-haiku', displayName: 'Claude 3.5 Haiku', provider: 'anthropic', modelId: 'claude-3-5-haiku-latest', enabled: true },
  
  // OpenRouter models - expanded coverage
  { id: 'gemini-flash', displayName: 'Gemini 2.0 Flash', provider: 'openrouter', modelId: 'google/gemini-2.0-flash-001', enabled: true },
  { id: 'llama-3.1-70b', displayName: 'Llama 3.1 70B', provider: 'openrouter', modelId: 'meta-llama/llama-3.1-70b-instruct', enabled: true },
  { id: 'mistral-large', displayName: 'Mistral Large', provider: 'openrouter', modelId: 'mistralai/mistral-large-2411', enabled: true },
  
  // Perplexity - using direct API to get citations (not OpenRouter)
  { id: 'perplexity-sonar', displayName: 'Perplexity Sonar', provider: 'perplexity-direct', modelId: 'sonar', enabled: true },
  
  // Additional models for broader coverage
  { id: 'deepseek-v3', displayName: 'DeepSeek V3', provider: 'openrouter', modelId: 'deepseek/deepseek-chat', enabled: true },
  { id: 'qwen-72b', displayName: 'Qwen 2.5 72B', provider: 'openrouter', modelId: 'qwen/qwen-2.5-72b-instruct', enabled: true },
  { id: 'grok-2', displayName: 'Grok 2', provider: 'openrouter', modelId: 'x-ai/grok-2-1212', enabled: true },
  
  // Optional: more models (disabled by default for cost control)
  { id: 'cohere-command-r-plus', displayName: 'Cohere Command R+', provider: 'openrouter', modelId: 'cohere/command-r-plus', enabled: false },
]

// Get model instance based on config (async to support lazy-loaded providers)
async function getModelInstance(config: ModelConfig) {
  switch (config.provider) {
    case 'openai':
      const openai = await getOpenAI()
      return openai(config.modelId)
    case 'anthropic':
      const anthropic = await getAnthropic()
      return anthropic(config.modelId)
    case 'openrouter':
      const openrouter = await getOpenRouter()
      return openrouter.chat(config.modelId)
    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
}

interface ScanResult {
  queryId: string
  model: string
  responseText: string
  brandMentioned: boolean
  brandPosition: number | null
  brandContext: string | null
  competitorsMentioned: string[]
  // Perplexity-specific citation fields
  citations: string[] | null
  searchResults: PerplexitySearchResultJson[] | null
  brandInCitations: boolean | null
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
              .limit(50), // Limit to top 50 queries per scan
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
                  ...scanResult,
                })
              } else {
                // Standard AI SDK for other models
                const modelInstance = await getModelInstance(modelConfig)
                const scanResult = await scanWithModel(
                  query.query_text,
                  modelConfig.displayName,
                  modelInstance,
                  brandName,
                  competitorNames
                )
                results.push({
                  queryId: query.id,
                  model: modelConfig.id,
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
    await step.run('save-results', async () => {
      const resultsToInsert = scanResults.map(r => ({
        brand_id: brandId,
        query_id: r.queryId,
        model: r.model,
        response_text: r.responseText,
        brand_mentioned: r.brandMentioned,
        brand_position: r.brandPosition,
        brand_context: r.brandContext,
        competitors_mentioned: r.competitorsMentioned,
        // Perplexity citation fields
        citations: r.citations,
        search_results: r.searchResults,
        brand_in_citations: r.brandInCitations,
        scanned_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('scan_results')
        .insert(resultsToInsert)

      if (error) {
        console.error('Failed to save scan results:', error)
        throw error
      }
    })

    // Step 4: Calculate visibility score and identify gaps
    const { visibilityScore, gaps } = await step.run('analyze-results', async () => {
      const mentioned = scanResults.filter(r => r.brandMentioned).length
      const total = scanResults.length
      const score = total > 0 ? Math.round((mentioned / total) * 100) : 0

      // Find queries where brand wasn't mentioned
      const gapQueryIds = Array.from(new Set(
        scanResults
          .filter(r => r.brandMentioned === false)
          .map(r => r.queryId)
      ))

      return {
        visibilityScore: score,
        gaps: gapQueryIds,
      }
    })

    // Step 5: Create alert with results
    await step.run('create-alert', async () => {
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'scan_complete',
        title: 'AI Search Scan Complete',
        message: `Visibility score: ${visibilityScore}%. Found ${gaps.length} content gaps.`,
        data: { visibilityScore, gapCount: gaps.length, totalScans: scanResults.length },
      })
    })

    // Step 6: Auto-generate memos if enabled and gaps found
    if (autoGenerateMemos && gaps.length > 0) {
      await step.run('prepare-memo-generation', async () => {
        // Get queries that represent gaps (brand not mentioned)
        const { data: gapQueries } = await supabase
          .from('queries')
          .select('*, competitor:related_competitor_id(*)')
          .in('id', gaps)
          .limit(10) // Limit to 10 memos per day per brand

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

        return { memosQueued: memoEvents.length }
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
      visibilityScore,
      gapsFound: gaps.length,
      autoMemosTriggered: autoGenerateMemos,
    }
  }
)

// Helper function to scan with a specific model (non-Perplexity)
async function scanWithModel(
  query: string,
  modelName: string,
  model: Parameters<typeof generateText>[0]['model'],
  brandName: string,
  competitorNames: string[]
): Promise<Omit<ScanResult, 'queryId' | 'model'>> {
  const { text } = await generateText({
    model,
    system: SCAN_SYSTEM_PROMPT,
    prompt: query,
    temperature: 0.7,
  })

  const responseLower = text.toLowerCase()
  const brandMentioned = responseLower.includes(brandName)
  
  // Find position if mentioned (which recommendation number)
  let brandPosition: number | null = null
  if (brandMentioned) {
    // Try to find position by looking for numbered lists or sequence
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(brandName)) {
        // Check if there's a number prefix
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
    // Non-Perplexity models don't have citations
    citations: null,
    searchResults: null,
    brandInCitations: null,
  }
}

// Helper function to scan with Perplexity direct API (with citations)
async function scanWithPerplexityDirect(
  query: string,
  brandName: string,
  brandDomain: string,
  competitorNames: string[]
): Promise<Omit<ScanResult, 'queryId' | 'model'>> {
  // Call Perplexity direct API to get citations
  const perplexityResponse = await queryPerplexity(query, SCAN_SYSTEM_PROMPT, {
    model: 'sonar',
    searchContextSize: 'low', // Cost-efficient
    temperature: 0.7,
  })

  const { text, citations, searchResults } = perplexityResponse
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
  }
}
