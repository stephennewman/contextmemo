/**
 * Site Content Inventory
 * 
 * Builds a comprehensive inventory of all content on a brand's website.
 * 
 * Flow:
 * 1. Fetch sitemap.xml (handles sitemap index files recursively)
 * 2. Batch-classify all URLs by content type and topic (one AI call)
 * 3. Selective deep-read of key pages via Jina Reader
 * 
 * This runs BEFORE topic universe generation so the AI knows what content
 * the brand already has, enabling accurate coverage scoring.
 */

import { fetchUrlAsMarkdown } from './jina-reader'
import { SitePageEntry } from '@/lib/supabase/types'
import { generateText } from 'ai'

// Lazy-load OpenRouter
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

// ============================================================================
// Step 0a: Fetch sitemap.xml
// ============================================================================

interface SitemapUrl {
  loc: string
  lastmod?: string
}

/**
 * Parse a sitemap XML string and extract URLs.
 * Handles both regular sitemaps and sitemap index files.
 */
function parseSitemapXml(xml: string): { urls: SitemapUrl[]; sitemapUrls: string[] } {
  const urls: SitemapUrl[] = []
  const sitemapUrls: string[] = []

  // Check if this is a sitemap index (contains <sitemapindex>)
  if (xml.includes('<sitemapindex')) {
    // Extract sitemap URLs from the index
    const sitemapLocRegex = /<sitemap>\s*<loc>\s*(.*?)\s*<\/loc>/g
    let match
    while ((match = sitemapLocRegex.exec(xml)) !== null) {
      sitemapUrls.push(match[1].trim())
    }
  }

  // Extract regular URLs
  const urlRegex = /<url>\s*<loc>\s*(.*?)\s*<\/loc>(?:\s*<lastmod>\s*(.*?)\s*<\/lastmod>)?/g
  let match
  while ((match = urlRegex.exec(xml)) !== null) {
    urls.push({
      loc: match[1].trim(),
      lastmod: match[2]?.trim() || undefined,
    })
  }

  return { urls, sitemapUrls }
}

/**
 * Fetch and parse sitemap.xml for a domain.
 * Recursively follows sitemap index files.
 * Falls back to common sitemap paths if /sitemap.xml fails.
 */
export async function fetchSitemapUrls(domain: string, maxUrls: number = 500): Promise<SitemapUrl[]> {
  const allUrls: SitemapUrl[] = []
  const visited = new Set<string>()

  const sitemapPaths = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap-index.xml',
    '/wp-sitemap.xml', // WordPress
    '/post-sitemap.xml',
    '/page-sitemap.xml',
  ]

  async function fetchSitemap(url: string) {
    if (visited.has(url) || allUrls.length >= maxUrls) return
    visited.add(url)

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ContextMemo-Bot/1.0' },
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) return

      const contentType = response.headers.get('content-type') || ''
      // Some sitemaps are served as text/html or application/xml
      if (!contentType.includes('xml') && !contentType.includes('text')) return

      const xml = await response.text()
      
      // Sanity check: should contain sitemap-like content
      if (!xml.includes('<url') && !xml.includes('<sitemap')) return

      const { urls, sitemapUrls } = parseSitemapXml(xml)

      // Add found URLs (up to max)
      for (const u of urls) {
        if (allUrls.length >= maxUrls) break
        allUrls.push(u)
      }

      // Recursively follow sitemap index entries (limit depth)
      for (const sitemapUrl of sitemapUrls.slice(0, 10)) {
        if (allUrls.length >= maxUrls) break
        await fetchSitemap(sitemapUrl)
      }
    } catch (e) {
      // Silently skip failed sitemaps
      console.log(`Sitemap fetch failed for ${url}:`, (e as Error).message)
    }
  }

  // Try each sitemap path
  const baseUrl = `https://${domain}`
  for (const path of sitemapPaths) {
    if (allUrls.length > 0) break // Stop if we found URLs
    await fetchSitemap(`${baseUrl}${path}`)
  }

  return allUrls
}

// ============================================================================
// Step 0b: Batch-classify URLs
// ============================================================================

/**
 * Classify a list of URLs by content type and extract topic keywords.
 * Uses one AI call to classify all URLs at once.
 * Falls back to URL-pattern based classification if AI fails.
 */
export async function classifyUrls(
  domain: string,
  urls: SitemapUrl[]
): Promise<SitePageEntry[]> {
  if (urls.length === 0) return []

  // Filter out obviously non-content URLs
  const contentUrls = urls.filter(u => {
    const path = new URL(u.loc).pathname.toLowerCase()
    const skip = [
      '/privacy', '/terms', '/cookie', '/legal', '/careers', '/jobs',
      '/login', '/signup', '/register', '/account', '/cart', '/checkout',
      '/404', '/500', '/sitemap', '/robots', '/feed', '/rss',
      '/wp-admin', '/wp-content', '/wp-includes',
      '/tag/', '/category/', '/author/', '/page/',
    ]
    return !skip.some(s => path.includes(s))
  })

  // Cap at 300 URLs for classification to keep AI cost reasonable
  const urlsToClassify = contentUrls.slice(0, 300)

  // Build URL list for AI classification
  const urlList = urlsToClassify.map(u => {
    const path = new URL(u.loc).pathname
    return `${path}${u.lastmod ? ` (${u.lastmod})` : ''}`
  }).join('\n')

  try {
    const openrouter = await getOpenRouter()
    const { text } = await generateText({
      model: openrouter('openai/gpt-4o-mini'),
      prompt: `Classify these website URLs from ${domain} by content type and extract topic keywords.

URLs:
${urlList}

For each URL, determine:
1. content_type: "blog" (article/post), "landing" (marketing page), "resource" (guide/whitepaper/ebook), "product" (product/feature/pricing page), "industry" (vertical/sector page), "comparison" (vs competitor, alternatives), "case_study" (customer story/testimonial), "docs" (documentation/help), "other"
2. topics: 1-3 keyword phrases extracted from the URL slug (e.g., "/blog/haccp-compliance-guide" → ["haccp compliance", "food safety guide"])
3. title: Best guess at a human-readable title from the URL slug (e.g., "/blog/haccp-compliance-guide" → "HACCP Compliance Guide")

Return a JSON array:
[
  {
    "url": "/path/to/page",
    "title": "Human Readable Title",
    "content_type": "blog",
    "topics": ["topic1", "topic2"]
  }
]

Only include URLs that are actual content pages. Skip navigation pages, utility pages, and pages with no meaningful content signal in the URL.

Respond ONLY with valid JSON array.`,
      temperature: 0.2,
    })

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('No JSON array found in URL classification response')
      return fallbackClassify(urlsToClassify, domain)
    }

    const classified = JSON.parse(jsonMatch[0]) as Array<{
      url: string
      title: string
      content_type: string
      topics: string[]
    }>

    // Map to SitePageEntry format
    return classified.map(c => {
      const origUrl = urlsToClassify.find(u => new URL(u.loc).pathname === c.url)
      return {
        url: c.url,
        title: c.title || null,
        content_type: (c.content_type || 'other') as SitePageEntry['content_type'],
        topics: c.topics || [],
        lastmod: origUrl?.lastmod || null,
        word_count: null,
        content_quality: null,
      }
    })
  } catch (e) {
    console.error('AI URL classification failed:', e)
    return fallbackClassify(urlsToClassify, domain)
  }
}

/**
 * Fallback: classify URLs by pattern matching when AI is unavailable.
 */
function fallbackClassify(urls: SitemapUrl[], domain: string): SitePageEntry[] {
  return urls.map(u => {
    const path = new URL(u.loc).pathname.toLowerCase()
    let content_type: SitePageEntry['content_type'] = 'other'
    
    if (path.includes('/blog/') || path.includes('/posts/') || path.includes('/articles/')) {
      content_type = 'blog'
    } else if (path.includes('/resources/') || path.includes('/guides/') || path.includes('/whitepapers/')) {
      content_type = 'resource'
    } else if (path.includes('/products/') || path.includes('/features/') || path.includes('/pricing')) {
      content_type = 'product'
    } else if (path.includes('/industries/') || path.includes('/sectors/') || path.includes('/solutions/')) {
      content_type = 'industry'
    } else if (path.includes('/vs/') || path.includes('/compare/') || path.includes('/alternatives/') || path.includes('-vs-')) {
      content_type = 'comparison'
    } else if (path.includes('/case-stud') || path.includes('/customers/') || path.includes('/success-stor')) {
      content_type = 'case_study'
    } else if (path.includes('/docs/') || path.includes('/help/') || path.includes('/support/')) {
      content_type = 'docs'
    } else if (path === '/' || path.split('/').filter(Boolean).length <= 1) {
      content_type = 'landing'
    }

    // Extract topics from URL slug
    const slug = path.split('/').filter(Boolean).pop() || ''
    const topics = slug
      .replace(/[-_]/g, ' ')
      .split(' ')
      .filter(w => w.length > 2)
      .slice(0, 3)

    // Generate title from slug
    const title = slug
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())

    return {
      url: new URL(u.loc).pathname,
      title: title || null,
      content_type,
      topics,
      lastmod: u.lastmod || null,
      word_count: null,
      content_quality: null,
    }
  })
}

// ============================================================================
// Step 0c: Selective deep-read of key pages
// ============================================================================

/**
 * Deep-read a selection of key pages to assess content quality.
 * Only fetches pages that are most relevant to coverage scoring:
 * - All comparison/alternative pages
 * - Resource/guide pages
 * - Blog posts with topic-relevant slugs
 */
export async function deepReadKeyPages(
  domain: string,
  pages: SitePageEntry[],
  maxPages: number = 15
): Promise<SitePageEntry[]> {
  // Prioritize pages for deep-reading
  const prioritized = [...pages].sort((a, b) => {
    const typeOrder: Record<string, number> = {
      comparison: 0,
      resource: 1,
      industry: 2,
      case_study: 3,
      blog: 4,
      product: 5,
      docs: 6,
      landing: 7,
      other: 8,
    }
    return (typeOrder[a.content_type] ?? 8) - (typeOrder[b.content_type] ?? 8)
  })

  const toDeepRead = prioritized.slice(0, maxPages)
  const deepReadResults = new Map<string, { word_count: number; content_quality: 'substantive' | 'thin'; title: string }>()

  // Fetch pages in parallel batches of 5
  for (let i = 0; i < toDeepRead.length; i += 5) {
    const batch = toDeepRead.slice(i, i + 5)
    const results = await Promise.allSettled(
      batch.map(async (page) => {
        try {
          const fullUrl = `https://${domain}${page.url}`
          const result = await fetchUrlAsMarkdown(fullUrl)
          const wordCount = result.content.split(/\s+/).length
          return {
            url: page.url,
            word_count: wordCount,
            content_quality: (wordCount > 500 ? 'substantive' : 'thin') as 'substantive' | 'thin',
            title: result.title || page.title || '',
          }
        } catch (e) {
          console.log(`Failed to deep-read ${page.url}:`, (e as Error).message)
          return null
        }
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        deepReadResults.set(result.value.url, result.value)
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + 5 < toDeepRead.length) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // Merge deep-read results back into the full page list
  return pages.map(page => {
    const deepRead = deepReadResults.get(page.url)
    if (deepRead) {
      return {
        ...page,
        title: deepRead.title || page.title,
        word_count: deepRead.word_count,
        content_quality: deepRead.content_quality,
      }
    }
    return page
  })
}

// ============================================================================
// Full inventory pipeline
// ============================================================================

/**
 * Build a complete content inventory for a brand's website.
 * This is the main entry point called by the topic universe generator.
 */
export async function buildSiteInventory(
  domain: string,
  options: { maxUrls?: number; maxDeepRead?: number; skipDeepRead?: boolean } = {}
): Promise<{
  pages: SitePageEntry[]
  stats: {
    sitemap_urls_found: number
    pages_classified: number
    pages_deep_read: number
    source: 'sitemap' | 'jina_search' | 'none'
  }
}> {
  const { maxUrls = 500, maxDeepRead = 15, skipDeepRead = false } = options

  // Step 1: Fetch sitemap URLs
  console.log(`[Site Inventory] Fetching sitemap for ${domain}...`)
  let sitemapUrls = await fetchSitemapUrls(domain, maxUrls)
  let source: 'sitemap' | 'jina_search' | 'none' = 'sitemap'

  // Fallback: if no sitemap, try Jina site search
  if (sitemapUrls.length === 0) {
    console.log(`[Site Inventory] No sitemap found for ${domain}, trying Jina site search...`)
    try {
      const searchResult = await fetchUrlAsMarkdown(`https://s.jina.ai/site:${domain}`)
      // Extract URLs from search results
      const urlRegex = /https?:\/\/[^\s)]+/g
      const foundUrls = searchResult.content.match(urlRegex) || []
      const domainUrls = foundUrls
        .filter(u => u.includes(domain))
        .map(u => ({ loc: u }))
      sitemapUrls = domainUrls.slice(0, 100)
      source = sitemapUrls.length > 0 ? 'jina_search' : 'none'
    } catch (e) {
      console.log(`[Site Inventory] Jina search fallback failed:`, (e as Error).message)
      source = 'none'
    }
  }

  console.log(`[Site Inventory] Found ${sitemapUrls.length} URLs from ${source}`)

  if (sitemapUrls.length === 0) {
    return {
      pages: [],
      stats: { sitemap_urls_found: 0, pages_classified: 0, pages_deep_read: 0, source: 'none' }
    }
  }

  // Step 2: Classify URLs
  console.log(`[Site Inventory] Classifying ${sitemapUrls.length} URLs...`)
  let pages = await classifyUrls(domain, sitemapUrls)

  // Step 3: Deep-read key pages (optional)
  let deepReadCount = 0
  if (!skipDeepRead && pages.length > 0) {
    console.log(`[Site Inventory] Deep-reading up to ${maxDeepRead} key pages...`)
    pages = await deepReadKeyPages(domain, pages, maxDeepRead)
    deepReadCount = pages.filter(p => p.word_count !== null).length
  }

  console.log(`[Site Inventory] Complete: ${pages.length} pages classified, ${deepReadCount} deep-read`)

  return {
    pages,
    stats: {
      sitemap_urls_found: sitemapUrls.length,
      pages_classified: pages.length,
      pages_deep_read: deepReadCount,
      source,
    }
  }
}
