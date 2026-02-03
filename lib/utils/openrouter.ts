/**
 * OpenRouter Utilities
 * 
 * Handles parsing of OpenRouter responses, especially for :online models
 * that return citation annotations.
 */

/**
 * OpenRouter URL citation annotation structure
 * Returned when using :online suffix with web search
 */
export interface OpenRouterAnnotation {
  type: 'url_citation'
  url_citation: {
    url: string
    title: string
    content?: string
    start_index: number
    end_index: number
  }
}

/**
 * Normalized citation structure for storage
 */
export interface NormalizedCitation {
  url: string
  title: string | null
  snippet: string | null
  source: 'perplexity' | 'openrouter-native'
  position_in_response?: number
}

/**
 * Parse OpenRouter annotations from response
 * Returns array of citation URLs
 */
export function parseOpenRouterAnnotations(
  annotations: OpenRouterAnnotation[] | undefined | null
): string[] {
  if (!annotations || !Array.isArray(annotations)) {
    return []
  }
  
  return annotations
    .filter(a => a.type === 'url_citation' && a.url_citation?.url)
    .map(a => a.url_citation.url)
}

/**
 * Convert OpenRouter annotations to normalized citations
 */
export function normalizeOpenRouterCitations(
  annotations: OpenRouterAnnotation[] | undefined | null
): NormalizedCitation[] {
  if (!annotations || !Array.isArray(annotations)) {
    return []
  }
  
  return annotations
    .filter(a => a.type === 'url_citation' && a.url_citation?.url)
    .map(a => ({
      url: a.url_citation.url,
      title: a.url_citation.title || null,
      snippet: a.url_citation.content || null,
      source: 'openrouter-native' as const,
      position_in_response: a.url_citation.start_index,
    }))
}

/**
 * Check if brand domain appears in citations
 */
export function checkBrandInOpenRouterCitations(
  annotations: OpenRouterAnnotation[] | undefined | null,
  brandDomain: string
): boolean {
  const citations = parseOpenRouterAnnotations(annotations)
  
  if (citations.length === 0) {
    return false
  }
  
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
 * Extract search results from OpenRouter annotations
 * (Similar to Perplexity's search_results format)
 */
export function extractSearchResults(
  annotations: OpenRouterAnnotation[] | undefined | null
): Array<{ url: string; title: string | null; snippet: string | null }> {
  if (!annotations || !Array.isArray(annotations)) {
    return []
  }
  
  return annotations
    .filter(a => a.type === 'url_citation' && a.url_citation?.url)
    .map(a => ({
      url: a.url_citation.url,
      title: a.url_citation.title || null,
      snippet: a.url_citation.content || null,
    }))
}
