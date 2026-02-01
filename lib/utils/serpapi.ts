// SerpAPI integration for Google AI Overviews tracking
// Free tier: 100 searches/month
// Docs: https://serpapi.com/google-ai-overview

export interface AIOverviewResult {
  hasAIOverview: boolean
  brandMentioned: boolean
  brandPosition: number | null  // Position in the AI overview text, if mentioned
  overviewText: string | null
  overviewSources: AIOverviewSource[]
  brandInSources: boolean
  relatedQuestions: string[]
  organicPosition: number | null  // Brand's position in organic results
}

export interface AIOverviewSource {
  title: string
  link: string
  snippet: string
  position: number
}

export interface SerpAPIResponse {
  ai_overview?: {
    text?: string
    text_blocks?: Array<{
      type: string
      text?: string
      list?: string[]
    }>
    sources?: Array<{
      title: string
      link: string
      snippet: string
    }>
  }
  related_questions?: Array<{
    question: string
    snippet?: string
  }>
  organic_results?: Array<{
    position: number
    title: string
    link: string
    snippet?: string
  }>
  error?: string
}

/**
 * Recursively extract text from nested objects
 */
function extractTextFromObject(obj: unknown): string {
  if (typeof obj === 'string') return obj
  if (Array.isArray(obj)) {
    return obj.map(extractTextFromObject).filter(Boolean).join('\n')
  }
  if (typeof obj === 'object' && obj !== null) {
    const texts: string[] = []
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'text' || key === 'snippet' || key === 'title') {
        if (typeof value === 'string') texts.push(value)
      } else if (key === 'list' && Array.isArray(value)) {
        texts.push(value.filter(v => typeof v === 'string').join('\n'))
      } else if (typeof value === 'object') {
        const nested = extractTextFromObject(value)
        if (nested) texts.push(nested)
      }
    }
    return texts.filter(Boolean).join('\n')
  }
  return ''
}

/**
 * Query Google via SerpAPI and check for AI Overview
 */
export async function checkGoogleAIOverview(
  query: string,
  brandName: string,
  brandDomain: string
): Promise<AIOverviewResult> {
  const apiKey = process.env.SERPAPI_KEY
  
  if (!apiKey) {
    console.warn('SERPAPI_KEY not set, skipping Google AI Overview check')
    return {
      hasAIOverview: false,
      brandMentioned: false,
      brandPosition: null,
      overviewText: null,
      overviewSources: [],
      brandInSources: false,
      relatedQuestions: [],
      organicPosition: null,
    }
  }

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      engine: 'google',
      q: query,
      gl: 'us',  // Country
      hl: 'en',  // Language
      num: '10', // Number of results
    })

    const response = await fetch(`https://serpapi.com/search?${params}`)
    
    if (!response.ok) {
      throw new Error(`SerpAPI error: ${response.status}`)
    }

    const data: SerpAPIResponse = await response.json()

    if (data.error) {
      throw new Error(`SerpAPI error: ${data.error}`)
    }

    return parseAIOverviewResponse(data, brandName, brandDomain)
  } catch (error) {
    console.error('SerpAPI request failed:', error)
    return {
      hasAIOverview: false,
      brandMentioned: false,
      brandPosition: null,
      overviewText: null,
      overviewSources: [],
      brandInSources: false,
      relatedQuestions: [],
      organicPosition: null,
    }
  }
}

/**
 * Parse SerpAPI response and extract AI Overview data
 */
function parseAIOverviewResponse(
  data: SerpAPIResponse,
  brandName: string,
  brandDomain: string
): AIOverviewResult {
  const brandNameLower = brandName.toLowerCase()
  const domainLower = brandDomain.toLowerCase().replace(/^www\./, '')

  // Check if AI Overview exists
  const hasAIOverview = !!(data.ai_overview?.text || data.ai_overview?.text_blocks?.length)

  // Extract full overview text
  let overviewText: string | null = null
  if (data.ai_overview) {
    if (data.ai_overview.text) {
      overviewText = data.ai_overview.text
    } else if (data.ai_overview.text_blocks) {
      overviewText = data.ai_overview.text_blocks
        .map(block => {
          if (typeof block === 'string') return block
          if (block.text) return block.text
          if (block.list) return block.list.join('\n')
          // Handle nested structures
          if (typeof block === 'object') {
            return extractTextFromObject(block)
          }
          return ''
        })
        .filter(Boolean)
        .join('\n\n')
    }
  }

  // Check if brand is mentioned in overview text
  const brandMentioned = overviewText 
    ? overviewText.toLowerCase().includes(brandNameLower)
    : false

  // Find brand position in overview (approximate by sentence position)
  let brandPosition: number | null = null
  if (brandMentioned && overviewText) {
    const sentences = overviewText.split(/[.!?]+/)
    for (let i = 0; i < sentences.length; i++) {
      if (sentences[i].toLowerCase().includes(brandNameLower)) {
        brandPosition = i + 1
        break
      }
    }
  }

  // Parse sources
  const overviewSources: AIOverviewSource[] = (data.ai_overview?.sources || []).map((s, i) => ({
    title: s.title,
    link: s.link,
    snippet: s.snippet || '',
    position: i + 1,
  }))

  // Check if brand's domain is in sources
  const brandInSources = overviewSources.some(s => 
    s.link.toLowerCase().includes(domainLower)
  )

  // Extract related questions
  const relatedQuestions = (data.related_questions || [])
    .map(q => q.question)
    .filter(Boolean)

  // Find brand's organic position
  let organicPosition: number | null = null
  if (data.organic_results) {
    const brandResult = data.organic_results.find(r => 
      r.link.toLowerCase().includes(domainLower) ||
      r.title.toLowerCase().includes(brandNameLower)
    )
    if (brandResult) {
      organicPosition = brandResult.position
    }
  }

  return {
    hasAIOverview,
    brandMentioned,
    brandPosition,
    overviewText,
    overviewSources,
    brandInSources,
    relatedQuestions,
    organicPosition,
  }
}

/**
 * Batch check multiple queries (respects rate limits)
 * Free tier = 100/month, so use sparingly
 */
export async function batchCheckAIOverviews(
  queries: string[],
  brandName: string,
  brandDomain: string,
  delayMs: number = 1000
): Promise<Map<string, AIOverviewResult>> {
  const results = new Map<string, AIOverviewResult>()

  for (const query of queries) {
    const result = await checkGoogleAIOverview(query, brandName, brandDomain)
    results.set(query, result)
    
    // Rate limiting delay
    if (queries.indexOf(query) < queries.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return results
}
