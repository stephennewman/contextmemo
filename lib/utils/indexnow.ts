/**
 * IndexNow integration for instant search engine indexing
 * Supported by: Bing, Yandex, Seznam, Naver
 * 
 * This notifies search engines when new content is published,
 * helping AI models with web search find our content faster.
 */

const INDEXNOW_KEY = '183d7bbf8ca8a989ce60736233e31559'
const SITE_HOST = 'contextmemo.com'

// IndexNow endpoints - submit to multiple for broader coverage
const INDEXNOW_ENDPOINTS = [
  'https://api.indexnow.org/indexnow',
  'https://www.bing.com/indexnow',
  'https://yandex.com/indexnow',
]

interface IndexNowResponse {
  success: boolean
  endpoint: string
  status?: number
  error?: string
}

/**
 * Submit a single URL to IndexNow for instant indexing
 */
export async function submitUrlToIndexNow(url: string): Promise<IndexNowResponse[]> {
  const results: IndexNowResponse[] = []
  
  for (const endpoint of INDEXNOW_ENDPOINTS) {
    try {
      const submitUrl = `${endpoint}?url=${encodeURIComponent(url)}&key=${INDEXNOW_KEY}`
      
      const response = await fetch(submitUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      results.push({
        success: response.status === 200 || response.status === 202,
        endpoint,
        status: response.status,
      })
    } catch (error) {
      results.push({
        success: false,
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
  
  return results
}

/**
 * Submit multiple URLs to IndexNow in batch
 */
export async function submitUrlsToIndexNow(urls: string[]): Promise<IndexNowResponse[]> {
  const results: IndexNowResponse[] = []
  
  // IndexNow batch submission (POST with JSON body)
  const payload = {
    host: SITE_HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  }
  
  for (const endpoint of INDEXNOW_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      results.push({
        success: response.status === 200 || response.status === 202,
        endpoint,
        status: response.status,
      })
    } catch (error) {
      results.push({
        success: false,
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
  
  return results
}

/**
 * Build memo URL from brand subdomain and slug.
 * Priority: proxy origin (subfolder) > custom domain > subdomain
 */
export function buildMemoUrl(
  subdomain: string,
  slug: string,
  customDomain?: string | null,
  domainVerified?: boolean | null,
  proxyOrigin?: string | null,
  proxyBasePath?: string | null
): string {
  if (proxyOrigin && proxyBasePath) {
    const origin = proxyOrigin.replace(/\/$/, '')
    const base = proxyBasePath.replace(/\/$/, '')
    return `${origin}${base}/${slug}`
  }
  if (customDomain && domainVerified) {
    return `https://${customDomain}/${slug}`
  }
  return `https://${SITE_HOST}/memo/${subdomain}/${slug}`
}

/**
 * Build the brand index page URL.
 * Priority: proxy origin (subfolder) > custom domain > subdomain
 */
export function buildBrandUrl(
  subdomain: string,
  customDomain?: string | null,
  domainVerified?: boolean | null,
  proxyOrigin?: string | null,
  proxyBasePath?: string | null
): string {
  if (proxyOrigin && proxyBasePath) {
    const origin = proxyOrigin.replace(/\/$/, '')
    const base = proxyBasePath.replace(/\/$/, '')
    return `${origin}${base}`
  }
  if (customDomain && domainVerified) {
    return `https://${customDomain}`
  }
  return `https://${SITE_HOST}/memo/${subdomain}`
}

/**
 * Get the host for IndexNow submissions based on where content is published.
 * Returns the host that owns the URLs being submitted.
 */
export function getIndexNowHost(
  proxyOrigin?: string | null,
  customDomain?: string | null,
  domainVerified?: boolean | null
): string {
  if (proxyOrigin) {
    try {
      return new URL(proxyOrigin).host
    } catch {
      return SITE_HOST
    }
  }
  if (customDomain && domainVerified) {
    return customDomain
  }
  return SITE_HOST
}

/**
 * Submit URL to IndexNow for an external domain (e.g., HubSpot blog)
 * Requires the domain to have an IndexNow key file hosted
 */
export async function submitExternalUrlToIndexNow(
  url: string,
  host: string,
  key: string,
  keyLocation: string
): Promise<IndexNowResponse[]> {
  const results: IndexNowResponse[] = []
  
  for (const endpoint of INDEXNOW_ENDPOINTS) {
    try {
      const submitUrl = `${endpoint}?url=${encodeURIComponent(url)}&key=${key}&keyLocation=${encodeURIComponent(keyLocation)}`
      
      const response = await fetch(submitUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      results.push({
        success: response.status === 200 || response.status === 202,
        endpoint,
        status: response.status,
      })
    } catch (error) {
      results.push({
        success: false,
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
  
  return results
}

/**
 * Submit multiple URLs to IndexNow for an external domain
 */
export async function submitExternalUrlsToIndexNow(
  urls: string[],
  host: string,
  key: string,
  keyLocation: string
): Promise<IndexNowResponse[]> {
  const results: IndexNowResponse[] = []
  
  const payload = {
    host,
    key,
    keyLocation,
    urlList: urls,
  }
  
  for (const endpoint of INDEXNOW_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      results.push({
        success: response.status === 200 || response.status === 202,
        endpoint,
        status: response.status,
      })
    } catch (error) {
      results.push({
        success: false,
        endpoint,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
  
  return results
}
