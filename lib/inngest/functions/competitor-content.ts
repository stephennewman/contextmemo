import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { fetchUrlAsMarkdown } from '@/lib/utils/jina-reader'
import { BrandContext } from '@/lib/supabase/types'
import { generateToneInstructions } from '@/lib/ai/prompts/memo-generation'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

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

// Response content generation prompt
const RESPONSE_CONTENT_PROMPT = `You are creating educational content for a brand's resources page. This content should be SEO and AI-optimized.

BRAND CONTEXT:
{{brand_context}}

BRAND TONE:
{{tone_instructions}}

TOPIC TO WRITE ABOUT:
{{universal_topic}}

REFERENCE SUMMARY (competitor wrote about this - use as inspiration but write your OWN perspective):
{{content_summary}}

RULES:
1. Write from YOUR brand's perspective and expertise
2. Do NOT mention the competitor or their article
3. Include your brand's unique insights and approach
4. Use factual, neutral language (no marketing hype)
5. Make it genuinely educational and valuable
6. Aim for 600-900 words
7. Include actionable takeaways

CRITICAL FORMATTING:
- Use # for the main title
- Use ## for sections
- Use ### for subsections
- Use **bold** for key terms
- Use bullet points with - for lists
- Include a "## Key Takeaways" section
- Include a "## Sources" section at the end

Write the complete article in Markdown format.`

/**
 * Hash content for deduplication
 */
function hashContent(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex')
}

/**
 * Discover blog/content URLs from a competitor site
 */
async function discoverContentUrls(domain: string): Promise<string[]> {
  const urls: string[] = []
  
  // Try common blog/content paths
  const contentPaths = [
    '/blog',
    '/resources',
    '/articles',
    '/insights',
    '/news',
    '/content',
  ]
  
  for (const path of contentPaths) {
    try {
      const result = await fetchUrlAsMarkdown(`https://${domain}${path}`)
      if (result.content && result.content.length > 500) {
        // Extract links from the blog index page
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]+)\)/g
        let match
        while ((match = linkRegex.exec(result.content)) !== null) {
          let url = match[2]
          // Convert relative URLs to absolute
          if (url.startsWith('/')) {
            url = `https://${domain}${url}`
          }
          // Only include URLs from same domain that look like articles
          if (url.includes(domain) && 
              !url.includes('#') && 
              !url.match(/\.(jpg|png|gif|pdf|css|js)$/i)) {
            urls.push(url)
          }
        }
        break // Found content page, stop trying other paths
      }
    } catch (e) {
      // Path doesn't exist, try next
    }
  }
  
  // Also try RSS feed
  try {
    const rssUrls = ['/rss', '/feed', '/rss.xml', '/feed.xml', '/blog/rss', '/blog/feed']
    for (const rssPath of rssUrls) {
      try {
        const rssResult = await fetchUrlAsMarkdown(`https://${domain}${rssPath}`)
        if (rssResult.content && rssResult.content.includes('<item>')) {
          // Parse RSS items for links
          const itemRegex = /<link>([^<]+)<\/link>/g
          let match
          while ((match = itemRegex.exec(rssResult.content)) !== null) {
            if (match[1].includes(domain)) {
              urls.push(match[1])
            }
          }
        }
      } catch (e) {
        // RSS path doesn't exist
      }
    }
  } catch (e) {
    // RSS discovery failed
  }
  
  // Dedupe and limit
  return [...new Set(urls)].slice(0, 20)
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
    const { brandId } = event.data

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

    // Step 2: Scan each competitor
    for (const competitor of competitors) {
      if (!competitor.domain) continue

      const newContentFound = await step.run(`scan-${competitor.id}`, async () => {
        // Discover content URLs
        const urls = await discoverContentUrls(competitor.domain!)
        
        if (urls.length === 0) {
          console.log(`No content URLs found for ${competitor.name}`)
          return 0
        }

        let newCount = 0

        // Check each URL for new content
        for (const url of urls.slice(0, 10)) { // Limit to 10 articles per competitor
          try {
            // Check if we've already seen this URL
            const { data: existing } = await supabase
              .from('competitor_content')
              .select('id')
              .eq('competitor_id', competitor.id)
              .eq('url', url)
              .single()

            if (existing) continue // Already have this content

            // Fetch the article
            const article = await fetchUrlAsMarkdown(url)
            
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

            // Save new content (will be classified in next step)
            await supabase.from('competitor_content').insert({
              competitor_id: competitor.id,
              url,
              title: article.title || url,
              content_hash: contentHash,
              status: 'new',
              first_seen_at: new Date().toISOString(),
            })

            newCount++

            // Small delay to avoid rate limiting
            await new Promise(r => setTimeout(r, 300))
          } catch (e) {
            console.error(`Failed to process ${url}:`, e)
          }
        }

        return newCount
      })

      totalNewContent += newContentFound
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
      newContentFound: totalNewContent,
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
        // Fetch full content if needed
        let fullContent = ''
        try {
          const article = await fetchUrlAsMarkdown(content.url)
          fullContent = article.content?.slice(0, 8000) || ''
        } catch (e) {
          console.error(`Failed to fetch content for classification: ${content.url}`)
          return null
        }

        if (!fullContent) return null

        const competitorName = (content.competitor as { name: string })?.name || 'Unknown'

        const prompt = CONTENT_CLASSIFICATION_PROMPT
          .replace('{{title}}', content.title)
          .replace('{{content}}', fullContent)
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

        const prompt = RESPONSE_CONTENT_PROMPT
          .replace('{{brand_context}}', JSON.stringify(brandContext, null, 2))
          .replace('{{tone_instructions}}', toneInstructions)
          .replace('{{universal_topic}}', content.universal_topic)
          .replace('{{content_summary}}', content.content_summary)

        try {
          const { text } = await generateText({
            model: openrouter('openai/gpt-4o'),
            prompt,
            temperature: 0.4,
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
