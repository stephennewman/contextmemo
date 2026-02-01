/**
 * Jina Reader API - Converts any URL to clean markdown
 * Free tier: 1M tokens/month
 * Docs: https://jina.ai/reader/
 */

export interface JinaReaderResponse {
  content: string
  title: string
  url: string
  description?: string
}

export interface JinaReaderOptions {
  targetSelector?: string // CSS selector to focus on specific content
  waitForSelector?: string // Wait for element before scraping
  removeSelector?: string // Remove elements matching selector
}

/**
 * Fetch a URL and return clean markdown content using Jina Reader
 */
export async function fetchUrlAsMarkdown(
  url: string,
  options?: JinaReaderOptions
): Promise<JinaReaderResponse> {
  const jinaUrl = `https://r.jina.ai/${url}`
  
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  }
  
  if (options?.targetSelector) {
    headers['X-Target-Selector'] = options.targetSelector
  }
  if (options?.waitForSelector) {
    headers['X-Wait-For-Selector'] = options.waitForSelector
  }
  if (options?.removeSelector) {
    headers['X-Remove-Selector'] = options.removeSelector
  }
  
  const response = await fetch(jinaUrl, {
    method: 'GET',
    headers,
  })
  
  if (!response.ok) {
    throw new Error(`Jina Reader error: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  
  return {
    content: data.data?.content || data.content || '',
    title: data.data?.title || data.title || '',
    url: data.data?.url || url,
    description: data.data?.description || data.description,
  }
}

/**
 * Crawl multiple pages from a website
 */
export async function crawlWebsite(
  baseUrl: string,
  maxPages: number = 10
): Promise<JinaReaderResponse[]> {
  const results: JinaReaderResponse[] = []
  const visited = new Set<string>()
  const queue: string[] = [baseUrl]
  
  while (queue.length > 0 && results.length < maxPages) {
    const url = queue.shift()!
    
    if (visited.has(url)) continue
    visited.add(url)
    
    try {
      const result = await fetchUrlAsMarkdown(url)
      results.push(result)
      
      // Extract links from content (basic extraction)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
      let match
      while ((match = linkRegex.exec(result.content)) !== null) {
        const linkUrl = match[2]
        // Only follow internal links
        if (linkUrl.startsWith('/') || linkUrl.startsWith(baseUrl)) {
          const fullUrl = linkUrl.startsWith('/') 
            ? new URL(linkUrl, baseUrl).href 
            : linkUrl
          if (!visited.has(fullUrl)) {
            queue.push(fullUrl)
          }
        }
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`Failed to fetch ${url}:`, error)
    }
  }
  
  return results
}

/**
 * Search for specific information on a website
 */
export async function searchWebsite(
  url: string,
  query: string
): Promise<string> {
  const searchUrl = `https://s.jina.ai/${encodeURIComponent(query)} site:${url}`
  
  const response = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'Accept': 'text/plain',
    },
  })
  
  if (!response.ok) {
    throw new Error(`Jina Search error: ${response.status} ${response.statusText}`)
  }
  
  return response.text()
}
