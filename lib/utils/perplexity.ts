/**
 * Perplexity Direct API Client
 * 
 * Uses the direct Perplexity API to get structured citations and search results
 * that are not available through OpenRouter proxy.
 */

import { createHash } from 'crypto'
import { getCacheValue, setCacheValue } from '@/lib/cache/redis-cache'

export interface PerplexitySearchResult {
  url: string
  title: string | null
  date: string | null
  snippet: string | null
}

export interface PerplexityUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface PerplexityResponse {
  text: string
  citations: string[]
  searchResults: PerplexitySearchResult[]
  usage?: PerplexityUsage
}

interface PerplexityAPIResponse {
  id: string
  model: string
  created: number
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    search_context_size?: string
  }
  citations?: string[]
  search_results?: Array<{
    title: string
    url: string
    date?: string
    last_updated?: string
    snippet?: string
  }>
  choices: Array<{
    index: number
    finish_reason: string
    message: {
      role: string
      content: string
    }
  }>
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

/**
 * Query Perplexity's Sonar model directly to get citations
 */
export async function queryPerplexity(
  query: string,
  systemPrompt?: string,
  options?: {
    model?: 'sonar' | 'sonar-pro' | 'sonar-reasoning-pro'
    searchContextSize?: 'low' | 'medium' | 'high'
    temperature?: number
  }
): Promise<PerplexityResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY

  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY is not configured')
  }

  const {
    model = 'sonar',
    searchContextSize = 'low', // Default to low for cost efficiency
    temperature = 0.7,
  } = options || {}

  const messages = []
  
  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt,
    })
  }
  
  messages.push({
    role: 'user',
    content: query,
  })

  const cachePayload = {
    query,
    systemPrompt: systemPrompt || null,
    model,
    searchContextSize,
    temperature,
  }
  const cacheKey = `perplexity:${createHash('sha256')
    .update(JSON.stringify(cachePayload))
    .digest('hex')}`

  const cached = await getCacheValue<PerplexityResponse>(cacheKey)
  if (cached) {
    return cached
  }

  const response = await fetch(PERPLEXITY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      web_search_options: {
        search_context_size: searchContextSize,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Perplexity API error (${response.status}): ${errorText}`)
  }

  const data = await response.json() as PerplexityAPIResponse

  // Extract the response text
  const text = data.choices?.[0]?.message?.content || ''

  // Extract citations (array of URLs)
  const citations = data.citations || []

  // Extract and normalize search results
  const searchResults: PerplexitySearchResult[] = (data.search_results || []).map(result => ({
    url: result.url,
    title: result.title || null,
    date: result.date || result.last_updated || null,
    snippet: result.snippet || null,
  }))

  // Extract usage data for cost tracking
  const usage: PerplexityUsage | undefined = data.usage ? {
    promptTokens: data.usage.prompt_tokens,
    completionTokens: data.usage.completion_tokens,
    totalTokens: data.usage.total_tokens,
  } : undefined

  const payload: PerplexityResponse = {
    text,
    citations,
    searchResults,
    usage,
  }

  // Cache results for 6 hours to reduce repeated spend
  await setCacheValue(cacheKey, payload, 6 * 60 * 60)

  return payload
}

/**
 * Check if any citation URLs contain the brand's domain
 */
export function checkBrandInCitations(
  citations: string[],
  brandDomain: string
): boolean {
  const normalizedDomain = brandDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '')
  
  return citations.some(url => {
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '')
      return hostname.includes(normalizedDomain) || normalizedDomain.includes(hostname)
    } catch {
      // If URL parsing fails, do a simple string check
      return url.toLowerCase().includes(normalizedDomain)
    }
  })
}

/**
 * Extract unique domains from citations for analysis
 */
export function extractCitationDomains(citations: string[]): string[] {
  const domains = new Set<string>()
  
  for (const url of citations) {
    try {
      const urlObj = new URL(url)
      domains.add(urlObj.hostname.replace(/^www\./, ''))
    } catch {
      // Skip invalid URLs
    }
  }
  
  return Array.from(domains)
}
