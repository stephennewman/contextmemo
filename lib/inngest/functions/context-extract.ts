import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { fetchUrlAsMarkdown, crawlWebsite, searchWebsite, JinaReaderResponse } from '@/lib/utils/jina-reader'
import { CONTEXT_EXTRACTION_PROMPT } from '@/lib/ai/prompts/context-extraction'
import { BrandContext, ExistingPage } from '@/lib/supabase/types'
import { logSingleUsage, logUsageEvents } from '@/lib/utils/usage-logger'

// Create Supabase admin client for server-side operations
const supabase = createServiceRoleClient()

// Web search fallback using Jina Search API
async function webSearchFallback(domain: string): Promise<string> {
  const companyName = domain.replace(/\.(com|net|org|io|co)$/, '')
  
  // Search for company information
  const searchQueries = [
    `${companyName} company products services`,
    `${companyName} what does the company do`,
    `site:${domain} about`,
  ]
  
  const results: string[] = []
  for (const query of searchQueries) {
    try {
      const searchResult = await searchWebsite(domain, query)
      if (searchResult && searchResult.length > 100) {
        results.push(searchResult)
      }
    } catch (e) {
      console.error(`Search failed for query "${query}":`, e)
    }
  }
  
  if (results.length === 0) {
    // Last resort: use Jina's general web search
    try {
      const response = await fetch(`https://s.jina.ai/${encodeURIComponent(`${companyName} company overview products`)}`, {
        headers: { 'Accept': 'text/plain' }
      })
      if (response.ok) {
        const text = await response.text()
        return text.slice(0, 30000)
      }
    } catch (e) {
      console.error('General web search failed:', e)
    }
  }
  
  return results.join('\n\n---\n\n').slice(0, 30000)
}

export const contextExtract = inngest.createFunction(
  { id: 'context-extract', name: 'Extract Brand Context' },
  { event: 'context/extract' },
  async ({ event, step }) => {
    const { brandId, domain } = event.data

    // Get tenant_id for usage logging
    const tenantId = await step.run('get-tenant', async () => {
      const { data } = await supabase.from('brands').select('tenant_id').eq('id', brandId).single()
      return data?.tenant_id || ''
    })

    // Step 1: Crawl the website (with web search fallback)
    const websiteContent = await step.run('crawl-website', async () => {
      let crawledContent = ''
      let source = 'minimal'
      let crawledPages: JinaReaderResponse[] = []
      
      try {
        // Try crawling up to 10 pages from the website
        const pages = await crawlWebsite(`https://${domain}`, 10)
        
        if (pages.length > 0) {
          crawledPages = pages
          // Combine content from all pages
          crawledContent = pages
            .map(p => `## ${p.title}\n\n${p.content}`)
            .join('\n\n---\n\n')
          source = 'crawl'
        }
      } catch (crawlError) {
        console.error('Crawl error:', crawlError)
        
        // Fallback 1: Try single page fetch
        try {
          const singlePage = await fetchUrlAsMarkdown(`https://${domain}`)
          if (singlePage.content && singlePage.content.length > 200) {
            crawledContent = singlePage.content
            crawledPages = [singlePage]
            source = 'single-page'
          }
        } catch (fetchError) {
          console.error('Single page fetch error:', fetchError)
        }
      }
      
      // Check if we got meaningful content (at least 500 chars of actual text, not just images/links)
      const textOnlyContent = crawledContent.replace(/!\[.*?\]\(.*?\)/g, '').replace(/\[.*?\]\(.*?\)/g, '').trim()
      const hasEnoughContent = textOnlyContent.length > 500
      
      // If content is sparse, augment with web search
      if (!hasEnoughContent) {
        console.log('Sparse homepage content detected, augmenting with web search for:', domain)
        const searchContent = await webSearchFallback(domain)
        if (searchContent && searchContent.length > 200) {
          if (crawledContent.length > 0) {
            // Combine crawled content with search results
            crawledContent = `${crawledContent}\n\n---\n\nAdditional information from web search:\n\n${searchContent}`
            source = 'crawl+search'
          } else {
            crawledContent = searchContent
            source = 'web-search'
          }
        }
      }
      
      // Final fallback if we still have nothing
      if (crawledContent.length < 200) {
        return { 
          content: `Company domain: ${domain}. Unable to gather detailed information.`, 
          source: 'minimal',
          pages: []
        }
      }
      
      return { content: crawledContent.slice(0, 50000), source, pages: crawledPages }
    })

    // Step 2: Extract context using AI (with retry logic)
    const extractedContext = await step.run('extract-context', async () => {
      const sourceNote = websiteContent.source === 'web-search' 
        ? '\n\nNote: This content was gathered from web search results, not direct website crawling.'
        : websiteContent.source === 'minimal'
        ? '\n\nNote: Unable to access website directly. Please verify extracted information.'
        : ''
      
      // Clean up content for better AI parsing
      // Remove image markdown, excessive whitespace, and truncate
      let cleanContent = websiteContent.content
        .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
        .replace(/\[Image \d+:.*?\]/g, '') // Remove image references like [Image 24: ...]
        .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
        .replace(/\s{3,}/g, ' ') // Collapse multiple spaces
        .trim()
        .slice(0, 30000) // Limit to 30k chars for reliable parsing

      // Helper to extract JSON with better error handling
      const extractJSON = (text: string): BrandContext | null => {
        try {
          // Try to find JSON in the response
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (!jsonMatch) {
            console.error('No JSON found in response. Response length:', text.length)
            return null
          }
          const parsed = JSON.parse(jsonMatch[0]) as BrandContext
          // Validate that we got meaningful data
          if (!parsed.company_name || parsed.company_name === domain || parsed.description === 'Unable to extract detailed context') {
            console.error('Parsed context has minimal data:', JSON.stringify(parsed).slice(0, 200))
            return null
          }
          return parsed
        } catch (e) {
          console.error('JSON parse error:', e, 'Response snippet:', text.slice(0, 500))
          return null
        }
      }
      
      // First attempt
      console.log(`Extracting context for ${domain}, content length: ${cleanContent.length}`)
      const { text: firstAttempt, usage: u1 } = await generateText({
        model: openai('gpt-4o'),
        system: CONTEXT_EXTRACTION_PROMPT,
        prompt: `Extract brand context from this website content:\n\n${cleanContent}${sourceNote}`,
        temperature: 0.2,
      })

      if (tenantId) {
        await logSingleUsage(tenantId, brandId, 'context_extract', 'gpt-4o', u1?.inputTokens || 0, u1?.outputTokens || 0)
      }

      let result = extractJSON(firstAttempt)
      
      // If first attempt failed, retry with smaller content and simpler prompt
      if (!result) {
        console.log(`First extraction attempt failed for ${domain}, retrying with simplified approach...`)
        
        // Use even shorter content for retry
        const shortContent = cleanContent.slice(0, 15000)
        
        const { text: retryAttempt, usage: u2 } = await generateText({
          model: openai('gpt-4o'),
          system: `Extract company information from website content. Return ONLY valid JSON with these fields:
{
  "company_name": "Official company name",
  "description": "2-3 sentence description of what the company does",
  "products": ["product/service 1", "product/service 2"],
  "markets": ["target market 1", "target market 2"],
  "features": ["key feature 1", "key feature 2"],
  "brand_voice": "professional" | "casual" | "technical",
  "customers": ["notable customer 1", "notable customer 2"]
}

Be thorough but respond ONLY with JSON.`,
          prompt: `Extract from this content:\n\n${shortContent}`,
          temperature: 0.3,
        })

        if (tenantId) {
          await logSingleUsage(tenantId, brandId, 'context_extract', 'gpt-4o', u2?.inputTokens || 0, u2?.outputTokens || 0)
        }
        
        result = extractJSON(retryAttempt)
      }
      
      // If still failed, return minimal context
      if (!result) {
        console.error(`All extraction attempts failed for ${domain}`)
        return {
          company_name: domain,
          description: 'Unable to extract detailed context',
          brand_voice: 'professional' as const,
        }
      }
      
      console.log(`Successfully extracted context for ${domain}: ${result.company_name}`)
      return result
    })

    // Step 3: Extract topics from crawled pages to build site index
    const existingPages = await step.run('extract-page-topics', async () => {
      const pages = websiteContent.pages || []
      if (pages.length === 0) {
        console.log('No crawled pages to index')
        return [] as ExistingPage[]
      }

      const baseUrl = `https://${domain}`
      const now = new Date().toISOString()
      
      // Build a batch request to extract topics from all pages at once (more efficient)
      const pagesForExtraction = pages.slice(0, 15).map(p => ({
        url: p.url.replace(baseUrl, '') || '/',
        title: p.title,
        contentSnippet: p.content.slice(0, 1500) // First 1500 chars for topic extraction
      }))

      const { text, usage: u3 } = await generateText({
        model: openai('gpt-4o-mini'), // Use mini for efficiency
        prompt: `Extract the main topics/keywords from these website pages. For each page, identify 2-5 key topics that describe what the page is about.

Pages to analyze:
${pagesForExtraction.map((p, i) => `
--- PAGE ${i + 1} ---
URL: ${p.url}
Title: ${p.title}
Content: ${p.contentSnippet}
`).join('\n')}

Return a JSON array with this structure:
[
  {
    "url": "/page-path",
    "topics": ["topic1", "topic2", "topic3"],
    "content_type": "blog" | "landing" | "resource" | "product" | "industry" | "comparison" | "other"
  }
]

Topics should be 1-3 word phrases that describe the page content (e.g., "temperature monitoring", "food safety", "HACCP compliance", "restaurant solutions").
Content type should match the page purpose:
- "blog" = blog post, article, news
- "landing" = marketing/sales landing page
- "resource" = guide, whitepaper, documentation
- "product" = product page, features, pricing
- "industry" = industry/vertical specific page
- "comparison" = vs competitor, alternatives
- "other" = anything else

Respond ONLY with valid JSON array, no explanations.`,
        temperature: 0.2,
      })

      if (tenantId) {
        await logSingleUsage(tenantId, brandId, 'context_extract', 'gpt-4o-mini', u3?.inputTokens || 0, u3?.outputTokens || 0)
      }

      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        if (!jsonMatch) {
          console.error('No JSON array found in topic extraction response')
          return [] as ExistingPage[]
        }
        
        const parsed = JSON.parse(jsonMatch[0]) as Array<{
          url: string
          topics: string[]
          content_type: string
        }>

        // Map to ExistingPage format
        const existingPages: ExistingPage[] = parsed.map((p, i) => ({
          url: p.url,
          title: pagesForExtraction[i]?.title || p.url,
          topics: p.topics || [],
          content_type: p.content_type as ExistingPage['content_type'] || 'other',
          crawled_at: now,
        }))

        console.log(`Extracted topics for ${existingPages.length} pages`)
        return existingPages
      } catch (e) {
        console.error('Failed to parse topic extraction response:', e)
        // Fallback: create basic entries without AI-extracted topics
        return pages.slice(0, 15).map(p => ({
          url: p.url.replace(baseUrl, '') || '/',
          title: p.title,
          topics: [], // No topics extracted
          content_type: 'other' as const,
          crawled_at: now,
        }))
      }
    })

    // Step 4: Save context to database (including raw homepage content and existing pages index)
    await step.run('save-context', async () => {
      // Store homepage content (truncated) and existing pages for memo deduplication
      const contextWithContent = {
        ...extractedContext,
        homepage_content: websiteContent.content.slice(0, 15000), // Keep first 15k chars for intent extraction
        existing_pages: existingPages, // Site index for preventing memo redundancy
      }
      
      const { error } = await supabase
        .from('brands')
        .update({
          context: contextWithContent,
          context_extracted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', brandId)

      if (error) {
        console.error('Failed to save context:', error)
        throw error
      }
    })

    // Step 5: Trigger query generation directly (skip competitor discovery during onboarding)
    // Competitors/entities will be discovered later from scan results
    await step.sendEvent('trigger-query-generation', {
      name: 'query/generate',
      data: { brandId },
    })

    return { 
      success: true, 
      context: extractedContext,
      source: websiteContent.source,
      contentLength: websiteContent.content.length,
      pagesIndexed: existingPages.length,
    }
  }
)
