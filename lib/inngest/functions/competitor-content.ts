import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { fetchUrlAsMarkdown } from '@/lib/utils/jina-reader'
import { BrandContext, CompetitorFeed } from '@/lib/supabase/types'
import { generateToneInstructions } from '@/lib/ai/prompts/memo-generation'
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

// Content classification prompt
const CONTENT_CLASSIFICATION_PROMPT = `Analyze this article content and classify it.

ARTICLE TITLE: {{title}}
ARTICLE CONTENT:
{{content}}

COMPETITOR NAME: {{competitor_name}}

Classify this content:

1. content_type: One of:
   - "educational" (how-to guides, tutorials, best practices)
   - "industry" (market analysis, trends, research)
   - "thought_leadership" (opinion pieces, predictions, insights)
   - "press_release" (company announcements, news)
   - "feature_announcement" (new product features, updates)
   - "company_news" (funding, hires, partnerships, events)
   - "case_study" (customer stories specific to this company)
   - "promotional" (marketing, webinars, events, sales content)

2. is_competitor_specific: true/false
   - Is this content ONLY meaningful in context of {{competitor_name}}?
   - Would writing a response inherently be "about them"?
   - Examples that ARE competitor-specific: "We raised $50M", "Our new dashboard", "Customer X uses our product"
   - Examples that are NOT competitor-specific: "How to improve email deliverability", "State of B2B Sales"

3. universal_topic: string or null
   - If NOT competitor-specific, what is the underlying topic that ANY company could write about?
   - e.g., "email deliverability best practices" or "B2B sales trends 2026"
   - null if the content is competitor-specific

4. topics: array of 3-5 topic keywords for this content

5. summary: 2-3 sentence summary of the key points

Respond ONLY with valid JSON:
{
  "content_type": "...",
  "is_competitor_specific": true/false,
  "universal_topic": "..." or null,
  "topics": ["...", "..."],
  "summary": "..."
}`

// Response content generation prompt - creates unique, differentiated, BETTER content
const RESPONSE_CONTENT_PROMPT = `You are creating authoritative, in-depth educational content that will OUTPERFORM the competitor's article on this topic. Your goal is not to copy, but to create something demonstrably BETTER, MORE COMPREHENSIVE, and MORE USEFUL.

BRAND CONTEXT:
{{brand_context}}

BRAND TONE:
{{tone_instructions}}

TOPIC TO WRITE ABOUT:
{{universal_topic}}

COMPETITOR'S APPROACH (what they wrote - use this to understand the topic, then EXCEED it):
{{content_summary}}

DIFFERENTIATION STRATEGY:
Your article MUST be distinctly different and better in these ways:

1. **DEEPER ANALYSIS**: Go beyond surface-level. Add context, nuance, and expert-level insights the competitor likely missed.

2. **UNIQUE ANGLE**: Find a fresh perspective. Consider:
   - A contrarian or unexpected viewpoint backed by evidence
   - First-principles thinking that reframes the problem
   - Real-world case studies or scenarios (without naming specific customers unless in brand context)
   - Quantified outcomes, statistics, or data points where possible

3. **ACTIONABLE FRAMEWORK**: Don't just explain - give readers a framework, checklist, or methodology they can immediately use.

4. **LONG-FORM VALUE**: Write 1000-1500 words (longer than typical competitor content). Depth wins in AI/SEO.

5. **BRAND EXPERTISE**: Weave in {{brand_name}}'s unique expertise and perspective naturally. What would your product experts say about this topic?

CRITICAL RULES:
- NEVER mention the competitor or their article
- NEVER copy their structure or phrases - create your own
- DO cite statistics and data points where relevant
- DO include practical examples and scenarios
- DO make it scannable with clear sections
- DO include a unique insight or "aha moment" that readers won't find elsewhere

FORMATTING REQUIREMENTS:
- Use # for the main title (make it compelling and specific)
- Use ## for major sections (aim for 5-7 sections)
- Use ### for subsections where needed
- Use **bold** for key terms and important concepts
- Use > blockquotes for expert insights or key takeaways
- Use numbered lists for sequential steps/processes
- Use bullet points for non-sequential lists
- Include a "## Key Takeaways" section with 5-7 actionable points
- Include a "## Sources" section at the end

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
                !items.some(i => i.url === url)) {
              items.push({
                url,
                title,
                published_at: null, // Unknown from HTML scraping
                author: null,
                source_feed_id: null,
              })
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

    // Step 1: Get brand and its competitors
    const { brand, competitors } = await step.run('get-brand-and-competitors', async () => {
      const [brandResult, competitorsResult] = await Promise.all([
        supabase.from('brands').select('*').eq('id', brandId).single(),
        supabase.from('competitors').select('*').eq('brand_id', brandId).eq('is_active', true),
      ])

      if (brandResult.error || !brandResult.data) {
        throw new Error('Brand not found')
      }

      return {
        brand: brandResult.data,
        competitors: competitorsResult.data || [],
      }
    })

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
    const { brandId } = event.data

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
        .limit(20)

      return {
        brand: brandResult.data,
        newContent: content || [],
      }
    })

    if (newContent.length === 0) {
      return { success: true, message: 'No content to classify', classified: 0 }
    }

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

        const prompt = CONTENT_CLASSIFICATION_PROMPT
          .replace('{{title}}', content.title)
          .replace('{{content}}', fullContent.slice(0, 12000)) // Use more content for better classification
          .replace(/\{\{competitor_name\}\}/g, competitorName)

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
      const shouldRespond = !classification.is_competitor_specific && 
        ['educational', 'industry', 'thought_leadership'].includes(classification.content_type) &&
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
    const { brandId } = event.data

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
        .limit(5) // Process 5 at a time to avoid overwhelming

      return {
        brand: brandResult.data,
        pendingContent: content || [],
      }
    })

    if (pendingContent.length === 0) {
      return { success: true, message: 'No content to respond to', generated: 0 }
    }

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

        const prompt = RESPONSE_CONTENT_PROMPT
          .replace('{{brand_context}}', JSON.stringify(brandContext, null, 2))
          .replace('{{tone_instructions}}', toneInstructions)
          .replace('{{universal_topic}}', content.universal_topic)
          .replace('{{content_summary}}', contentAnalysis)
          .replace(/\{\{brand_name\}\}/g, brand.name)

        try {
          const { text } = await generateText({
            model: openrouter('openai/gpt-4o'),
            prompt,
            temperature: 0.5, // Slightly higher for more creative differentiation
            maxTokens: 4000, // Allow longer content
          })

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
            prompt: `Write a 150-160 character meta description for this article. Be factual and include key concepts:\n\n${memo.content.slice(0, 1000)}`,
            temperature: 0.3,
          })
          return text.slice(0, 160)
        } catch (e) {
          return content.universal_topic?.slice(0, 150) || ''
        }
      })

      // Step 4: Save and auto-publish memo
      const savedMemo = await step.run(`save-${content.id}`, async () => {
        const schemaJson = {
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
          },
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://${brand.subdomain}.contextmemo.com/${memo.slug}`,
          },
        }

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

    return {
      success: true,
      generated: generatedCount,
      pending: pendingContent.length - generatedCount,
    }
  }
)
