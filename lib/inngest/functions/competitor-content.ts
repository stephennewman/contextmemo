import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { fetchUrlAsMarkdown } from '@/lib/utils/jina-reader'
import { BrandContext, CompetitorFeed } from '@/lib/supabase/types'
import { generateToneInstructions } from '@/lib/ai/prompts/memo-generation'
import { emitCompetitorPublished } from '@/lib/feed/emit'
import { trackJobStart, trackJobEnd } from '@/lib/utils/job-tracker'
import { canBrandSpend } from '@/lib/utils/budget-guard'
import crypto from 'crypto'
import Parser from 'rss-parser'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

// Custom types for RSS parser
type CustomFeed = {
  lastBuildDate?: string
}

type CustomItem = {
  contentEncoded?: string
  creator?: string
  mediaContent?: string
  author?: string
  'content:encoded'?: string
  'dc:creator'?: string
  'media:content'?: string
}

// Initialize RSS parser with custom fields and proper types
const rssParser = new Parser<CustomFeed, CustomItem>({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'creator'],
      ['media:content', 'mediaContent'],
    ],
    feed: [
      'lastBuildDate',
    ],
  },
  timeout: 10000,
})

// Common RSS/Atom feed paths to check
const FEED_PATHS = [
  '/feed',
  '/rss',
  '/rss.xml',
  '/feed.xml',
  '/atom.xml',
  '/blog/feed',
  '/blog/rss',
  '/blog/rss.xml',
  '/blog/feed.xml',
  '/blog/atom.xml',
  '/feeds/posts/default',
  '/index.xml',
  '/.rss',
]

// Common blog paths to check for content discovery
const BLOG_PATHS = [
  '/blog',
  '/resources',
  '/articles',
  '/insights',
  '/news',
  '/content',
  '/learn',
  '/library',
  '/posts',
]

// Patterns that indicate junk/navigation content (not real articles)
const JUNK_TITLE_PATTERNS = [
  /^log\s*in$/i,
  /^sign\s*(up|in).*$/i,
  /^pricing$/i,
  /^customers?$/i,
  /^about(\s+us)?$/i,
  /^contact(\s+us)?$/i,
  /^careers?$/i,
  /^jobs?$/i,
  /^go\s*back.*$/i,
  /^home$/i,
  /^features?$/i,
  /^products?$/i,
  /^solutions?$/i,
  /^services?$/i,
  /^integrations?$/i,
  /^partners?$/i,
  /^support$/i,
  /^help$/i,
  /^faq$/i,
  /^demo$/i,
  /^request\s*(a\s*)?demo$/i,
  /^get\s*started$/i,
  /^free\s*trial$/i,
  /^book\s*(a\s*)?(call|meeting|demo)$/i,
  /^schedule\s*(a\s*)?(call|meeting|demo)$/i,
  /^privacy(\s*policy)?$/i,
  /^terms(\s*(of\s*use|of\s*service|&\s*conditions))?$/i,
  /^cookie.*$/i,
  /^legal$/i,
  /^got\s*it!?$/i,
  /^learn\s*more$/i,
  /^read\s*more$/i,
  /^click\s*here$/i,
  /^see\s*more$/i,
  /^view\s*all$/i,
  /^show\s*more$/i,
  /^\[.*\]$/i, // Bracketed text like [Applications
  /^-\s*.+$/i, // Items starting with dash like "- Partners With"
  /^meet\s+\w+$/i, // "Meet Nathan" - team pages
  /^[A-Z][a-z]+\s+[A-Z][a-z]+$/, // Two-word proper names (usually team members)
]

// URL patterns that indicate non-article pages
const JUNK_URL_PATTERNS = [
  /\/login/i,
  /\/signin/i,
  /\/signup/i,
  /\/register/i,
  /\/pricing/i,
  /\/contact/i,
  /\/about/i,
  /\/careers/i,
  /\/jobs/i,
  /\/demo/i,
  /\/trial/i,
  /\/support/i,
  /\/help/i,
  /\/faq/i,
  /\/legal/i,
  /\/privacy/i,
  /\/terms/i,
  /\/cookie/i,
  /\/team/i,
  /\/people/i,
  /\/company/i,
  /\/partners/i,
  /\/integrations/i,
  /\/customers$/i,
  /\/features$/i,
  /\/products$/i,
  /\/solutions$/i,
  /\/services$/i,
]

/**
 * Check if a title looks like junk/navigation content
 */
function isJunkTitle(title: string): boolean {
  if (!title || title.length < 5) return true // Too short
  if (title.length > 200) return true // Too long (probably not a real title)
  
  // Check against junk patterns
  for (const pattern of JUNK_TITLE_PATTERNS) {
    if (pattern instanceof RegExp && pattern.test(title.trim())) {
      return true
    }
  }
  
  // Check for two-word proper names (team members)
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(title.trim()) && title.length < 30) {
    return true
  }
  
  return false
}

/**
 * Check if a URL looks like a non-article page
 */
function isJunkUrl(url: string): boolean {
  for (const pattern of JUNK_URL_PATTERNS) {
    if (pattern.test(url)) {
      return true
    }
  }
  return false
}

// Content classification prompt
const CONTENT_CLASSIFICATION_PROMPT = `Analyze this article/page content and classify it.

ARTICLE TITLE: {{title}}
ARTICLE CONTENT:
{{content}}

COMPETITOR NAME: {{competitor_name}}

YOUR BRAND'S CAPABILITIES (for context on what topics are relevant):
{{brand_capabilities}}

Classify this content:

1. content_type: One of:
   - "educational" (how-to guides, tutorials, best practices)
   - "industry" (market analysis, trends, research, OR product/service pages about an industry capability that multiple companies offer)
   - "thought_leadership" (opinion pieces, predictions, insights)
   - "press_release" (company announcements, news)
   - "feature_announcement" (new product features, updates specific to this company's unique product)
   - "company_news" (funding, hires, partnerships, events)
   - "case_study" (customer stories specific to this company)
   - "promotional" (generic marketing, webinars, events, sales content with no educational substance)

2. is_competitor_specific: true/false
   CRITICAL DISTINCTION:
   - "competitor-specific" means the content is ONLY about {{competitor_name}} internally — their funding, their specific product UI, their specific customers, their company news.
   - If the page is about an INDUSTRY CAPABILITY or TOPIC that other companies also offer (e.g., "temperature monitoring", "food safety compliance", "remote monitoring"), it is NOT competitor-specific even if it's on the competitor's product page. The underlying topic is universal.
   - Ask: "Could our brand write authoritatively about this same topic from our own perspective?" If YES → is_competitor_specific: false.
   
   Examples that ARE competitor-specific:
   - "We raised $50M" → only about them
   - "Meet our new CTO" → only about them
   - "Customer X uses [competitor product]" → their case study
   - "[Competitor] Dashboard v3.0 Release Notes" → their specific product update
   
   Examples that are NOT competitor-specific (even if on a product page):
   - "Food Safety Temperature Monitoring" → industry capability, our brand does this too
   - "HACCP Compliance Solutions" → industry need, not unique to them
   - "Remote Temperature Monitoring for Healthcare" → industry topic
   - "How to improve email deliverability" → educational topic
   - "IoT sensors for cold chain management" → industry capability

3. universal_topic: string or null
   - Extract the underlying industry topic that ANY company in this space could write about.
   - ALWAYS extract a universal_topic when is_competitor_specific is false, even for product pages.
   - Frame it as the capability or need, not the competitor's product name.
   - e.g., "food safety temperature monitoring", "HACCP compliance automation", "remote cold chain monitoring"
   - null ONLY if the content is truly competitor-specific (their internal news/updates).

4. topics: array of 3-5 topic keywords for this content

5. summary: 2-3 sentence summary of the key points. Focus on the industry topic, not the competitor's branding.

Respond ONLY with valid JSON:
{
  "content_type": "...",
  "is_competitor_specific": true/false,
  "universal_topic": "..." or null,
  "topics": ["...", "..."],
  "summary": "..."
}`

// Response content generation prompt - creates unique, differentiated, BETTER content
const RESPONSE_CONTENT_PROMPT = `You are creating authoritative, in-depth educational content optimized for AI CITATION. Your goal is to create content that AI assistants (ChatGPT, Perplexity, Claude, Gemini) will confidently cite when answering user questions.

IMPORTANT - CURRENT DATE: {{current_date}}
Use the current year ({{current_year}}) when referencing time-sensitive information, trends, or creating titles. DO NOT use outdated years like 2023, 2024, or 2025 - we are in {{current_year}}.

BRAND CONTEXT:
{{brand_context}}

BRAND TONE:
{{tone_instructions}}

TOPIC TO WRITE ABOUT:
{{universal_topic}}

COMPETITOR'S APPROACH (what they wrote - use this to understand the topic, then EXCEED it):
{{content_summary}}

=== AI CITATION OPTIMIZATION ===

AI models cite content that is:
1. **Factually dense** - Specific numbers, dates, statistics they can quote
2. **Clearly structured** - Easy to parse and extract specific answers
3. **Question-answering** - Directly answers common questions in the format users ask them
4. **Authoritative** - Has clear expertise signals and sources
5. **Comprehensive** - Covers the topic thoroughly so AI doesn't need other sources

REQUIRED AI-FRIENDLY ELEMENTS:

1. **QUICK ANSWER BOX** (at the very top, after title):
   > **Quick Answer:** [1-2 sentence direct answer to the core question this article addresses]

2. **KEY FACTS SUMMARY**:
   Include a "## At a Glance" section with 5-7 bullet points of the most citable facts:
   - Specific numbers (e.g., "Reduces costs by 23%")
   - Timeframes (e.g., "Implementation takes 2-4 weeks")
   - Comparisons (e.g., "3x faster than manual methods")

3. **FAQ SECTION** (CRITICAL for AI citation):
   Include "## Frequently Asked Questions" with 4-6 Q&As in this exact format:
   
   ### What is [topic]?
   [Direct, comprehensive answer in 2-3 sentences]
   
   ### How does [topic] work?
   [Clear explanation]
   
   ### Why is [topic] important?
   [Benefits and implications]
   
   ### How much does [topic] cost?
   [If applicable - ranges or factors]

4. **DEFINITION CALLOUTS**:
   When introducing key terms, use this format:
   > **Definition:** [Term] refers to [clear definition]. This is important because [context].

5. **STATISTICS WITH SOURCES**:
   Every statistic must have attribution:
   - "According to [Source], [statistic]"
   - "Research from [Organization] shows [finding]"
   
DIFFERENTIATION STRATEGY:
Your article MUST be distinctly different and better:

1. **DEEPER ANALYSIS**: Go beyond surface-level. Add context, nuance, and expert-level insights.

2. **UNIQUE ANGLE**: Fresh perspective with:
   - First-principles thinking that reframes the problem
   - Real-world case studies or scenarios
   - Quantified outcomes and data points

3. **ACTIONABLE FRAMEWORK**: Give readers a checklist or methodology they can immediately use.

4. **LONG-FORM VALUE**: Write 1200-1800 words. Depth wins in AI citation.

5. **BRAND EXPERTISE**: Weave in {{brand_name}}'s unique expertise naturally.

CRITICAL RULES:
- NEVER mention the competitor or their article
- NEVER copy their structure or phrases
- DO cite statistics with sources
- DO include practical examples
- DO make every section independently citable
- DO answer questions directly (AI extracts Q&A patterns)

FORMATTING REQUIREMENTS:
- Use # for the main title (include the primary keyword)
- Use ## for major sections (aim for 6-8 sections including FAQ)
- Use ### for subsections and FAQ questions
- Use **bold** for key terms and definitions
- Use > blockquotes for Quick Answer, Definitions, and Key Takeaways
- Use numbered lists for sequential steps
- Use bullet points for non-sequential lists
- Include "## At a Glance" near the top
- Include "## Frequently Asked Questions" section
- Include "## Key Takeaways" section
- Include "## Sources" section at the end

TITLE STRATEGY:
Create a title that is:
- More specific than "How to [topic]"
- Includes a number, year, or concrete benefit when appropriate
- Signals depth (e.g., "The Complete Guide to...", "X Strategies for...", "Why [Counterintuitive Thing]...")

Write the complete article in Markdown format. Make it the definitive resource on this topic.`

/**
 * Hash content for deduplication
 */
function hashContent(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex')
}

/**
 * Parsed RSS/Atom item with normalized fields
 */
interface ParsedFeedItem {
  url: string
  title: string
  published_at: Date | null
  author: string | null
  content_preview: string | null
}

/**
 * Discover and validate RSS/Atom feeds for a domain
 * Returns array of feed URLs that were successfully parsed
 */
async function discoverFeeds(domain: string): Promise<{ url: string; type: 'rss' | 'atom'; title: string | null; lastBuildDate: Date | null }[]> {
  const validFeeds: { url: string; type: 'rss' | 'atom'; title: string | null; lastBuildDate: Date | null }[] = []
  
  for (const path of FEED_PATHS) {
    const feedUrl = `https://${domain}${path}`
    try {
      const feed = await rssParser.parseURL(feedUrl)
      if (feed && feed.items && feed.items.length > 0) {
        const feedType = feed.feedUrl?.includes('atom') || feedUrl.includes('atom') ? 'atom' : 'rss'
        validFeeds.push({
          url: feedUrl,
          type: feedType,
          title: feed.title || null,
          lastBuildDate: feed.lastBuildDate ? new Date(feed.lastBuildDate) : null,
        })
        console.log(`Found valid feed at ${feedUrl} with ${feed.items.length} items`)
      }
    } catch (e) {
      // Feed doesn't exist or invalid, continue
    }
  }
  
  // Also check for feed autodiscovery in HTML
  try {
    const response = await fetch(`https://${domain}`, { 
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContextMemo/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    const html = await response.text()
    
    // Look for <link rel="alternate" type="application/rss+xml" href="...">
    const feedLinkRegex = /<link[^>]+rel=["']alternate["'][^>]+type=["']application\/(rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/gi
    let match
    while ((match = feedLinkRegex.exec(html)) !== null) {
      let feedUrl = match[2]
      if (feedUrl.startsWith('/')) {
        feedUrl = `https://${domain}${feedUrl}`
      }
      
      // Check if we already have this feed
      if (!validFeeds.some(f => f.url === feedUrl)) {
        try {
          const feed = await rssParser.parseURL(feedUrl)
          if (feed && feed.items && feed.items.length > 0) {
            validFeeds.push({
              url: feedUrl,
              type: match[1] as 'rss' | 'atom',
              title: feed.title || null,
              lastBuildDate: feed.lastBuildDate ? new Date(feed.lastBuildDate) : null,
            })
            console.log(`Found autodiscovered feed at ${feedUrl}`)
          }
        } catch (e) {
          // Invalid feed
        }
      }
    }
  } catch (e) {
    // HTML fetch failed
  }
  
  return validFeeds
}

/**
 * Parse items from an RSS/Atom feed with proper date handling
 */
async function parseFeedItems(feedUrl: string, maxItems = 50): Promise<ParsedFeedItem[]> {
  try {
    const feed = await rssParser.parseURL(feedUrl)
    if (!feed || !feed.items) return []
    
    return feed.items.slice(0, maxItems).map(item => {
      // Normalize the item URL
      let url = item.link || item.guid || ''
      
      // Parse published date
      let publishedAt: Date | null = null
      if (item.pubDate) {
        publishedAt = new Date(item.pubDate)
      } else if (item.isoDate) {
        publishedAt = new Date(item.isoDate)
      }
      
      // Get author
      const author = item.creator || item.author || item['dc:creator'] || null
      
      // Get content preview
      const contentPreview = item.contentSnippet || item.content?.slice(0, 500) || item.summary?.slice(0, 500) || null
      
      return {
        url,
        title: item.title || '',
        published_at: publishedAt,
        author,
        content_preview: contentPreview,
      }
    }).filter(item => item.url && item.title)
  } catch (e) {
    console.error(`Failed to parse feed ${feedUrl}:`, e)
    return []
  }
}

/**
 * Get or create feeds for a competitor, returning saved feed records
 */
async function getOrDiscoverFeeds(competitorId: string, domain: string): Promise<CompetitorFeed[]> {
  // First check for existing active feeds
  const { data: existingFeeds } = await supabase
    .from('competitor_feeds')
    .select('*')
    .eq('competitor_id', competitorId)
    .eq('is_active', true)
  
  if (existingFeeds && existingFeeds.length > 0) {
    return existingFeeds as CompetitorFeed[]
  }
  
  // Discover new feeds
  const discoveredFeeds = await discoverFeeds(domain)
  
  if (discoveredFeeds.length === 0) {
    return []
  }
  
  // Save discovered feeds
  const feedsToInsert = discoveredFeeds.map(f => ({
    competitor_id: competitorId,
    feed_url: f.url,
    feed_type: f.type,
    title: f.title,
    is_active: true,
    is_manually_added: false,
    discovered_at: new Date().toISOString(),
    last_build_date: f.lastBuildDate?.toISOString() || null,
  }))
  
  const { data: savedFeeds, error } = await supabase
    .from('competitor_feeds')
    .upsert(feedsToInsert, { 
      onConflict: 'competitor_id,feed_url',
      ignoreDuplicates: false,
    })
    .select()
  
  if (error) {
    console.error('Failed to save discovered feeds:', error)
    return []
  }
  
  return (savedFeeds || []) as CompetitorFeed[]
}

/**
 * Discover blog/content URLs from a competitor site using feeds + fallback to HTML scraping
 */
async function discoverContentUrls(
  domain: string, 
  competitorId: string,
  options: { 
    retroactive?: boolean; // Fetch all historical content
    daysBack?: number; // Only content from last N days
  } = {}
): Promise<{ url: string; title: string; published_at: Date | null; author: string | null; source_feed_id: string | null }[]> {
  const items: { url: string; title: string; published_at: Date | null; author: string | null; source_feed_id: string | null }[] = []
  const { retroactive = false, daysBack = 30 } = options
  
  // Calculate cutoff date for filtering
  const cutoffDate = retroactive ? null : new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
  
  // Get or discover feeds
  const feeds = await getOrDiscoverFeeds(competitorId, domain)
  
  // Parse items from each feed
  for (const feed of feeds) {
    const maxItems = retroactive ? 100 : 20
    const feedItems = await parseFeedItems(feed.feed_url, maxItems)
    
    for (const item of feedItems) {
      // Filter by date if not retroactive
      if (cutoffDate && item.published_at && item.published_at < cutoffDate) {
        continue
      }
      
      // Normalize URL
      let url = item.url
      if (url.startsWith('/')) {
        url = `https://${domain}${url}`
      }
      
      // Only include URLs from same domain
      if (!url.includes(domain)) continue
      
      // Skip junk content (navigation, team pages, etc.)
      if (isJunkTitle(item.title) || isJunkUrl(url)) {
        console.log(`Skipping junk content: "${item.title}" (${url})`)
        continue
      }
      
      items.push({
        url,
        title: item.title,
        published_at: item.published_at,
        author: item.author,
        source_feed_id: feed.id,
      })
    }
    
    // Update feed stats
    await supabase
      .from('competitor_feeds')
      .update({
        last_checked_at: new Date().toISOString(),
        last_successful_at: feedItems.length > 0 ? new Date().toISOString() : undefined,
        total_items_found: feed.total_items_found + feedItems.length,
        check_failures: 0,
        last_error: null,
      })
      .eq('id', feed.id)
  }
  
  // Fallback: If no feeds found or few items, try HTML scraping
  if (items.length < 5) {
    console.log(`Few feed items (${items.length}), falling back to HTML scraping for ${domain}`)
    
    for (const path of BLOG_PATHS) {
      try {
        const result = await fetchUrlAsMarkdown(`https://${domain}${path}`)
        if (result.content && result.content.length > 500) {
          // Extract links from the blog index page
          const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/g
          let match
          while ((match = linkRegex.exec(result.content)) !== null) {
            let url = match[2]
            const title = match[1]
            
            if (url.startsWith('/')) {
              url = `https://${domain}${url}`
            }
            
            // Only include URLs from same domain that look like articles
            if (url.includes(domain) && 
                !url.includes('#') && 
                !url.match(/\.(jpg|png|gif|pdf|css|js)$/i) &&
                !items.some(i => i.url === url) &&
                !isJunkTitle(title) &&
                !isJunkUrl(url)) {
              items.push({
                url,
                title,
                published_at: null, // Unknown from HTML scraping
                author: null,
                source_feed_id: null,
              })
            } else if (isJunkTitle(title) || isJunkUrl(url)) {
              console.log(`Skipping junk HTML link: "${title}" (${url})`)
            }
          }
          break // Found content page
        }
      } catch (e) {
        // Path doesn't exist
      }
    }
  }
  
  // Dedupe by URL
  const seen = new Set<string>()
  return items.filter(item => {
    if (seen.has(item.url)) return false
    seen.add(item.url)
    return true
  })
}

/**
 * Scan competitor sites for new content
 */
export const competitorContentScan = inngest.createFunction(
  { 
    id: 'competitor-content-scan', 
    name: 'Scan Competitor Content',
    concurrency: { limit: 2 },
  },
  { event: 'competitor/content-scan' },
  async ({ event, step }) => {
    const { brandId, retroactive = false, daysBack = 30 } = event.data

    // Budget check
    const canSpend = await step.run('check-budget', async () => canBrandSpend(brandId))
    if (!canSpend) {
      return { success: true, skipped: true, reason: 'budget_exceeded' }
    }

    // Step 1: Get brand and its competitors
    const { brand, competitors, disabled } = await step.run('get-brand-and-competitors', async () => {
      const [brandResult, competitorsResult, settingsResult] = await Promise.all([
        supabase.from('brands').select('*').eq('id', brandId).single(),
        supabase.from('competitors').select('*').eq('brand_id', brandId).eq('is_active', true),
        supabase.from('brand_settings').select('competitor_content_enabled').eq('brand_id', brandId).single(),
      ])

      if (brandResult.error || !brandResult.data) {
        throw new Error('Brand not found')
      }

      // Check if competitor content scanning is disabled
      if (settingsResult.data && settingsResult.data.competitor_content_enabled === false) {
        console.log(`[CompetitorContent] Disabled for brand ${brandId}, skipping`)
        return { brand: brandResult.data, competitors: [], disabled: true }
      }

      return {
        brand: brandResult.data,
        competitors: competitorsResult.data || [],
        disabled: false,
      }
    })

    if (disabled) {
      return { success: true, skipped: true, reason: 'competitor_content_disabled' }
    }

    if (competitors.length === 0) {
      return { success: true, message: 'No competitors to scan', newContent: 0 }
    }

    let totalNewContent = 0
    let totalFeedsDiscovered = 0

    // Step 2: Scan each competitor
    for (const competitor of competitors) {
      if (!competitor.domain) continue

      const scanResult = await step.run(`scan-${competitor.id}`, async () => {
        // Discover content URLs using enhanced feed parsing
        const contentItems = await discoverContentUrls(competitor.domain!, competitor.id, {
          retroactive,
          daysBack,
        })
        
        if (contentItems.length === 0) {
          console.log(`No content URLs found for ${competitor.name}`)
          return { newCount: 0, feedsFound: 0 }
        }

        // Count feeds discovered for this competitor
        const { count: feedCount } = await supabase
          .from('competitor_feeds')
          .select('*', { count: 'exact', head: true })
          .eq('competitor_id', competitor.id)
          .eq('is_active', true)

        let newCount = 0

        // Limit articles per scan (more for retroactive)
        const maxArticles = retroactive ? 50 : 15

        // Check each URL for new content
        for (const item of contentItems.slice(0, maxArticles)) {
          try {
            // Check if we've already seen this URL
            const { data: existing } = await supabase
              .from('competitor_content')
              .select('id')
              .eq('competitor_id', competitor.id)
              .eq('url', item.url)
              .single()

            if (existing) continue // Already have this content

            // Fetch the article content
            const article = await fetchUrlAsMarkdown(item.url)
            
            if (!article.content || article.content.length < 300) continue

            // Hash for deduplication
            const contentHash = hashContent(article.content)

            // Check if we have content with same hash
            const { data: hashExists } = await supabase
              .from('competitor_content')
              .select('id')
              .eq('competitor_id', competitor.id)
              .eq('content_hash', contentHash)
              .single()

            if (hashExists) continue

            // Calculate word count
            const wordCount = article.content.split(/\s+/).filter(w => w.length > 0).length

            // Save new content with enhanced fields
            await supabase.from('competitor_content').insert({
              competitor_id: competitor.id,
              url: item.url,
              title: item.title || article.title || item.url,
              content_hash: contentHash,
              status: 'new',
              first_seen_at: new Date().toISOString(),
              // New enhanced fields
              published_at: item.published_at?.toISOString() || null,
              source_feed_id: item.source_feed_id,
              author: item.author,
              word_count: wordCount,
              full_content: article.content.slice(0, 50000), // Store up to 50k chars
            })

            newCount++

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 250))
          } catch (e) {
            console.error(`Failed to process ${item.url}:`, e)
          }
        }

        return { newCount, feedsFound: feedCount || 0 }
      })

      totalNewContent += scanResult.newCount
      totalFeedsDiscovered += scanResult.feedsFound
    }

    // Step 3: Trigger classification for new content
    if (totalNewContent > 0) {
      await step.sendEvent('classify-new-content', {
        name: 'competitor/content-classify',
        data: { brandId },
      })
    }

    return {
      success: true,
      competitorsScanned: competitors.length,
      feedsDiscovered: totalFeedsDiscovered,
      newContentFound: totalNewContent,
      mode: retroactive ? 'retroactive' : 'incremental',
    }
  }
)

/**
 * Retroactive backfill - scan competitor feeds for all historical content
 * Use this to populate content history when first setting up competitor monitoring
 */
export const competitorContentBackfill = inngest.createFunction(
  { 
    id: 'competitor-content-backfill', 
    name: 'Backfill Competitor Content History',
    concurrency: { limit: 1 }, // Only one backfill at a time
  },
  { event: 'competitor/content-backfill' },
  async ({ event, step }) => {
    const { brandId, competitorId } = event.data

    // If competitorId specified, only backfill that competitor
    // Otherwise, backfill all competitors for the brand

    const competitors = await step.run('get-competitors', async () => {
      if (competitorId) {
        const { data } = await supabase
          .from('competitors')
          .select('*')
          .eq('id', competitorId)
          .eq('is_active', true)
          .single()
        return data ? [data] : []
      } else {
        const { data } = await supabase
          .from('competitors')
          .select('*')
          .eq('brand_id', brandId)
          .eq('is_active', true)
        return data || []
      }
    })

    if (competitors.length === 0) {
      return { success: false, message: 'No competitors to backfill' }
    }

    let totalContent = 0

    for (const competitor of competitors) {
      if (!competitor.domain) continue

      const result = await step.run(`backfill-${competitor.id}`, async () => {
        // Discover and parse all available content (retroactive mode)
        const contentItems = await discoverContentUrls(competitor.domain!, competitor.id, {
          retroactive: true,
          daysBack: 365 * 2, // Go back up to 2 years
        })

        let savedCount = 0

        for (const item of contentItems) {
          try {
            // Check if already exists
            const { data: existing } = await supabase
              .from('competitor_content')
              .select('id')
              .eq('competitor_id', competitor.id)
              .eq('url', item.url)
              .single()

            if (existing) continue

            // Fetch full content
            const article = await fetchUrlAsMarkdown(item.url)
            if (!article.content || article.content.length < 300) continue

            const contentHash = hashContent(article.content)

            // Check hash dedup
            const { data: hashExists } = await supabase
              .from('competitor_content')
              .select('id')
              .eq('competitor_id', competitor.id)
              .eq('content_hash', contentHash)
              .single()

            if (hashExists) continue

            const wordCount = article.content.split(/\s+/).filter(w => w.length > 0).length

            await supabase.from('competitor_content').insert({
              competitor_id: competitor.id,
              url: item.url,
              title: item.title || article.title || item.url,
              content_hash: contentHash,
              status: 'new',
              first_seen_at: item.published_at?.toISOString() || new Date().toISOString(),
              published_at: item.published_at?.toISOString() || null,
              source_feed_id: item.source_feed_id,
              author: item.author,
              word_count: wordCount,
              full_content: article.content.slice(0, 50000),
            })

            savedCount++
            await new Promise(r => setTimeout(r, 300))
          } catch (e) {
            console.error(`Backfill failed for ${item.url}:`, e)
          }
        }

        return savedCount
      })

      totalContent += result
    }

    // Trigger classification for new content
    if (totalContent > 0) {
      await step.sendEvent('classify-backfilled', {
        name: 'competitor/content-classify',
        data: { brandId },
      })
    }

    return {
      success: true,
      competitorsBackfilled: competitors.length,
      totalContentDiscovered: totalContent,
    }
  }
)

/**
 * Classify competitor content and filter
 */
export const competitorContentClassify = inngest.createFunction(
  { 
    id: 'competitor-content-classify', 
    name: 'Classify Competitor Content',
    concurrency: { limit: 3 },
  },
  { event: 'competitor/content-classify' },
  async ({ event, step }) => {
    const { brandId, limit: requestedLimit } = event.data

    // Budget check
    const canSpendClassify = await step.run('check-budget', async () => canBrandSpend(brandId))
    if (!canSpendClassify) {
      return { success: true, skipped: true, reason: 'budget_exceeded' }
    }

    // Use requested limit or default to 20
    const classifyLimit = requestedLimit || 20

    // Step 1: Get brand and new content to classify
    const { brand, newContent } = await step.run('get-new-content', async () => {
      const brandResult = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (brandResult.error || !brandResult.data) {
        throw new Error('Brand not found')
      }

      // Get unclassified content for this brand's competitors
      const { data: competitors } = await supabase
        .from('competitors')
        .select('id')
        .eq('brand_id', brandId)

      const competitorIds = (competitors || []).map(c => c.id)

      const { data: content } = await supabase
        .from('competitor_content')
        .select('*, competitor:competitor_id(name, domain)')
        .in('competitor_id', competitorIds)
        .eq('status', 'new')
        .order('first_seen_at', { ascending: true })
        .limit(classifyLimit)

      return {
        brand: brandResult.data,
        newContent: content || [],
      }
    })

    if (newContent.length === 0) {
      return { success: true, message: 'No content to classify', classified: 0 }
    }

    // Track job start
    const jobId = await step.run('track-job-start', async () => {
      return await trackJobStart(brandId, 'classify', { contentCount: newContent.length })
    })

    let classifiedCount = 0
    let respondableCount = 0

    // Step 2: Classify each piece of content
    for (const content of newContent) {
      const classification = await step.run(`classify-${content.id}`, async () => {
        // Use stored full_content if available, otherwise fetch
        let fullContent = (content as { full_content?: string }).full_content || ''
        
        if (!fullContent || fullContent.length < 300) {
          try {
            const article = await fetchUrlAsMarkdown(content.url)
            fullContent = article.content?.slice(0, 15000) || ''
            
            // Update stored content if we fetched it
            if (fullContent) {
              await supabase
                .from('competitor_content')
                .update({ 
                  full_content: fullContent.slice(0, 50000),
                  word_count: fullContent.split(/\s+/).filter(w => w.length > 0).length,
                })
                .eq('id', content.id)
            }
          } catch (e) {
            console.error(`Failed to fetch content for classification: ${content.url}`)
            return null
          }
        }

        if (!fullContent || fullContent.length < 300) return null

        const competitorName = (content.competitor as { name: string })?.name || 'Unknown'

        // Build brand capabilities summary for the classifier
        const brandContext = brand.context as BrandContext
        const brandCapabilities = [
          brandContext?.description || '',
          brandContext?.features?.length ? `Features: ${brandContext.features.join(', ')}` : '',
          brandContext?.products?.length ? `Products: ${brandContext.products.join(', ')}` : '',
          brandContext?.markets?.length ? `Markets: ${brandContext.markets.join(', ')}` : '',
        ].filter(Boolean).join('\n')

        const prompt = CONTENT_CLASSIFICATION_PROMPT
          .replace('{{title}}', content.title)
          .replace('{{content}}', fullContent.slice(0, 12000)) // Use more content for better classification
          .replace(/\{\{competitor_name\}\}/g, competitorName)
          .replace('{{brand_capabilities}}', brandCapabilities || 'Not available')

        try {
          const { text } = await generateText({
            model: openrouter('openai/gpt-4o-mini'),
            prompt,
            temperature: 0.3,
          })

          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (!jsonMatch) return null

          return JSON.parse(jsonMatch[0])
        } catch (e) {
          console.error('Failed to classify content:', e)
          return null
        }
      })

      if (!classification) {
        // Mark as skipped if classification failed
        await step.run(`mark-failed-${content.id}`, async () => {
          await supabase
            .from('competitor_content')
            .update({ status: 'skipped' })
            .eq('id', content.id)
        })
        continue
      }

      // Step 3: Update content with classification
      // Respond if: not competitor-specific AND has a universal topic we can write about
      // This catches educational articles, industry topics, AND product pages covering capabilities we also offer
      const shouldRespond = !classification.is_competitor_specific && 
        classification.universal_topic

      await step.run(`update-${content.id}`, async () => {
        await supabase
          .from('competitor_content')
          .update({
            content_type: classification.content_type,
            is_competitor_specific: classification.is_competitor_specific,
            universal_topic: classification.universal_topic,
            topics: classification.topics,
            content_summary: classification.summary,
            status: shouldRespond ? 'pending_response' : 'skipped',
          })
          .eq('id', content.id)
        
        // Emit feed event for relevant competitor content
        if (shouldRespond) {
          const competitorName = (content.competitor as { name: string })?.name || 'Competitor'
          
          await emitCompetitorPublished({
            tenant_id: brand.tenant_id,
            brand_id: brandId,
            competitor_id: content.competitor_id,
            competitor_name: competitorName,
            article_title: content.title,
            article_url: content.url,
            relevance_score: 0.7, // High relevance if it passed filter
            matched_prompts: classification.topics || [],
          })
        }
      })

      classifiedCount++
      if (shouldRespond) respondableCount++
    }

    // Step 4: Trigger response generation for content that passed filter
    if (respondableCount > 0) {
      await step.sendEvent('generate-responses', {
        name: 'competitor/content-respond',
        data: { brandId },
      })
    }

    // Track job end
    await step.run('track-job-end', async () => {
      await trackJobEnd(jobId)
    })

    return {
      success: true,
      classified: classifiedCount,
      willRespondTo: respondableCount,
      skipped: classifiedCount - respondableCount,
    }
  }
)

/**
 * Generate response content and auto-publish
 */
export const competitorContentRespond = inngest.createFunction(
  { 
    id: 'competitor-content-respond', 
    name: 'Generate Response Content',
    concurrency: { limit: 2 },
  },
  { event: 'competitor/content-respond' },
  async ({ event, step }) => {
    const { brandId, limit: requestedLimit } = event.data

    // Budget check
    const canSpendRespond = await step.run('check-budget', async () => canBrandSpend(brandId))
    if (!canSpendRespond) {
      return { success: true, skipped: true, reason: 'budget_exceeded' }
    }

    // Use requested limit or default to 5
    const processLimit = requestedLimit || 5

    // Step 1: Get brand and content pending response
    const { brand, pendingContent } = await step.run('get-pending-content', async () => {
      const brandResult = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (brandResult.error || !brandResult.data) {
        throw new Error('Brand not found')
      }

      // Get content pending response for this brand's competitors
      const { data: competitors } = await supabase
        .from('competitors')
        .select('id')
        .eq('brand_id', brandId)

      const competitorIds = (competitors || []).map(c => c.id)

      const { data: content } = await supabase
        .from('competitor_content')
        .select('*')
        .in('competitor_id', competitorIds)
        .eq('status', 'pending_response')
        .order('first_seen_at', { ascending: true })
        .limit(processLimit)

      return {
        brand: brandResult.data,
        pendingContent: content || [],
      }
    })

    if (pendingContent.length === 0) {
      return { success: true, message: 'No content to respond to', generated: 0 }
    }

    // Track job start
    const jobId = await step.run('track-job-start', async () => {
      return await trackJobStart(brandId, 'generate', { contentCount: pendingContent.length })
    })

    const brandContext = brand.context as BrandContext
    const toneInstructions = generateToneInstructions(brandContext?.brand_tone)
    const today = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })

    let generatedCount = 0

    // Step 2: Generate response for each piece of content
    for (const content of pendingContent) {
      const memo = await step.run(`generate-${content.id}`, async () => {
        if (!content.universal_topic || !content.content_summary) {
          return null
        }

        // Build a more comprehensive content summary using full_content if available
        let contentAnalysis = content.content_summary
        const fullContent = (content as { full_content?: string }).full_content
        
        if (fullContent && fullContent.length > 500) {
          // Extract key points from full content for better differentiation
          contentAnalysis = `
COMPETITOR ARTICLE SUMMARY: ${content.content_summary}

COMPETITOR ARTICLE STRUCTURE & KEY POINTS (use this to understand what they covered, then go DEEPER and DIFFERENT):
${fullContent.slice(0, 8000)}

WORD COUNT: ~${(content as { word_count?: number }).word_count || 'Unknown'} words
`
        }

        // Get current date info for the prompt
        const now = new Date()
        const currentDate = now.toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        })
        const currentYear = now.getFullYear().toString()

        const prompt = RESPONSE_CONTENT_PROMPT
          .replace('{{brand_context}}', JSON.stringify(brandContext, null, 2))
          .replace('{{tone_instructions}}', toneInstructions)
          .replace('{{universal_topic}}', content.universal_topic)
          .replace('{{content_summary}}', contentAnalysis)
          .replace(/\{\{brand_name\}\}/g, brand.name)
          .replace('{{current_date}}', currentDate)
          .replace(/\{\{current_year\}\}/g, currentYear)

        const generationModel = 'openai/gpt-4o'
        const startTime = Date.now()

        try {
          const { text, usage } = await generateText({
            model: openrouter(generationModel),
            prompt,
            temperature: 0.5,
          })

          const durationMs = Date.now() - startTime

          // Extract title from generated content (first # heading)
          const titleMatch = text.match(/^#\s+(.+)$/m)
          const title = titleMatch?.[1] || content.universal_topic

          // Generate slug from topic
          const slug = `resources/${content.universal_topic
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 60)}`

          return {
            title,
            slug,
            content: text,
            generationModel,
            durationMs,
            tokens: {
              prompt: usage?.inputTokens || 0,
              completion: usage?.outputTokens || 0,
              total: (usage?.inputTokens || 0) + (usage?.outputTokens || 0),
            },
          }
        } catch (e) {
          console.error('Failed to generate response:', e)
          return null
        }
      })

      if (!memo) {
        await step.run(`mark-failed-${content.id}`, async () => {
          await supabase
            .from('competitor_content')
            .update({ status: 'generation_failed' })
            .eq('id', content.id)
        })
        continue
      }

      // Step 3: Generate meta description
      const metaDescription = await step.run(`meta-${content.id}`, async () => {
        try {
          const { text } = await generateText({
            model: openrouter('openai/gpt-4o-mini'),
            prompt: `Write a 150-160 character meta description for this article about ${brand.name}.

IMPORTANT:
- Use "${brand.name}" as the brand name (NOT "Context Memo")
- Be factual and descriptive
- Focus on the value proposition

Article excerpt:
${memo.content.slice(0, 1000)}`,
            temperature: 0.3,
          })
          return text.slice(0, 160)
        } catch (e) {
          return content.universal_topic?.slice(0, 150) || ''
        }
      })

      // Step 4: Save and auto-publish memo
      const savedMemo = await step.run(`save-${content.id}`, async () => {
        // Extract FAQs from content for FAQ schema
        const faqMatches = memo.content.matchAll(/###\s+(.+\?)\s*\n+([^#]+?)(?=\n###|\n##|$)/g)
        const faqItems = Array.from(faqMatches).map(match => ({
          '@type': 'Question',
          name: match[1].trim(),
          acceptedAnswer: {
            '@type': 'Answer',
            text: match[2].trim().slice(0, 500), // Limit answer length
          },
        }))

        // Extract key facts for speakable schema (Quick Answer box)
        const quickAnswerMatch = memo.content.match(/>\s*\*?\*?Quick Answer:?\*?\*?\s*(.+?)(?:\n|$)/i)
        const quickAnswer = quickAnswerMatch?.[1]?.trim()

        // Build comprehensive schema
        const schemas: Record<string, unknown>[] = [
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: memo.title,
            description: metaDescription,
            datePublished: new Date().toISOString(),
            dateModified: new Date().toISOString(),
            author: {
              '@type': 'Organization',
              name: 'Context Memo',
              url: 'https://contextmemo.com',
            },
            publisher: {
              '@type': 'Organization',
              name: brand.name,
              url: brand.domain ? `https://${brand.domain}` : undefined,
            },
            mainEntityOfPage: {
              '@type': 'WebPage',
            },
            articleSection: content.universal_topic,
            keywords: content.universal_topic,
            ...(quickAnswer && {
              speakable: {
                '@type': 'SpeakableSpecification',
                cssSelector: ['.quick-answer', 'blockquote'],
              },
            }),
          },
        ]

        // Add FAQ schema if we found Q&A patterns
        if (faqItems.length > 0) {
          schemas.push({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqItems,
          })
        }

        const schemaJson = schemas.length === 1 ? schemas[0] : schemas

        // Check if slug already exists
        const { data: existing } = await supabase
          .from('memos')
          .select('id, slug')
          .eq('brand_id', brandId)
          .eq('slug', memo.slug)
          .single()

        // If exists, add timestamp to slug
        const finalSlug = existing 
          ? `${memo.slug}-${Date.now().toString(36)}`
          : memo.slug

        const { data, error } = await supabase
          .from('memos')
          .insert({
            brand_id: brandId,
            source_competitor_content_id: content.id,
            memo_type: 'response',
            slug: finalSlug,
            title: memo.title,
            content_markdown: memo.content,
            meta_description: metaDescription,
            schema_json: schemaJson,
            sources: [
              { url: `https://${brand.domain}`, title: brand.name, accessed_at: today },
            ],
            status: 'published', // Auto-publish
            published_at: new Date().toISOString(),
            last_verified_at: new Date().toISOString(),
            version: 1,
            // Provenance tracking
            generation_model: memo.generationModel,
            generation_duration_ms: memo.durationMs,
            generation_tokens: memo.tokens,
            review_status: 'ai_generated',
            provenance: {
              generated_at: new Date().toISOString(),
              source_type: 'competitor_response',
              source_content_id: content.id,
              source_competitor: (content as { competitor?: { name?: string } }).competitor?.name,
              source_url: content.url,
              topic_extracted: content.universal_topic,
              brand_context_version: brand.updated_at,
            },
          })
          .select()
          .single()

        if (error) {
          console.error('Failed to save memo:', error)
          return null
        }

        return data
      })

      if (savedMemo) {
        // Update competitor content with response memo ID
        await step.run(`link-${content.id}`, async () => {
          await supabase
            .from('competitor_content')
            .update({ 
              status: 'responded',
              response_memo_id: savedMemo.id,
            })
            .eq('id', content.id)
        })

        // Save version history
        await step.run(`version-${content.id}`, async () => {
          await supabase.from('memo_versions').insert({
            memo_id: savedMemo.id,
            version: 1,
            content_markdown: memo.content,
            change_reason: 'initial',
          })
        })

        generatedCount++
      }
    }

    // Step 5: Create alert
    if (generatedCount > 0) {
      await step.run('create-alert', async () => {
        await supabase.from('alerts').insert({
          brand_id: brandId,
          alert_type: 'content_generated',
          title: 'New Content Auto-Published',
          message: `${generatedCount} new article${generatedCount > 1 ? 's' : ''} generated from competitor content intelligence and published to your resources page.`,
          data: { count: generatedCount },
        })
      })
    }

    // Track job end
    await step.run('track-job-end', async () => {
      await trackJobEnd(jobId)
    })

    return {
      success: true,
      generated: generatedCount,
      pending: pendingContent.length - generatedCount,
    }
  }
)
