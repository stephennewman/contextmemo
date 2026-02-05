import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { fetchUrlAsMarkdown, crawlWebsite, searchWebsite } from '@/lib/utils/jina-reader'
import { CONTEXT_EXTRACTION_PROMPT } from '@/lib/ai/prompts/context-extraction'
import { BrandContext } from '@/lib/supabase/types'

// Create Supabase admin client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

    // Step 1: Crawl the website (with web search fallback)
    const websiteContent = await step.run('crawl-website', async () => {
      let crawledContent = ''
      let source = 'minimal'
      
      try {
        // Try crawling up to 10 pages from the website
        const pages = await crawlWebsite(`https://${domain}`, 10)
        
        if (pages.length > 0) {
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
          source: 'minimal' 
        }
      }
      
      return { content: crawledContent.slice(0, 50000), source }
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
      const { text: firstAttempt } = await generateText({
        model: openai('gpt-4o'),
        system: CONTEXT_EXTRACTION_PROMPT,
        prompt: `Extract brand context from this website content:\n\n${cleanContent}${sourceNote}`,
        temperature: 0.2,
      })

      let result = extractJSON(firstAttempt)
      
      // If first attempt failed, retry with smaller content and simpler prompt
      if (!result) {
        console.log(`First extraction attempt failed for ${domain}, retrying with simplified approach...`)
        
        // Use even shorter content for retry
        const shortContent = cleanContent.slice(0, 15000)
        
        const { text: retryAttempt } = await generateText({
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

    // Step 3: Save context to database (including raw homepage content for intent-based queries)
    await step.run('save-context', async () => {
      // Store homepage content (truncated) for later query generation
      const contextWithContent = {
        ...extractedContext,
        homepage_content: websiteContent.content.slice(0, 15000), // Keep first 15k chars for intent extraction
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

    // Step 4: Trigger competitor discovery
    await step.sendEvent('trigger-competitor-discovery', {
      name: 'competitor/discover',
      data: { brandId },
    })

    return { 
      success: true, 
      context: extractedContext,
      source: websiteContent.source,
      contentLength: websiteContent.content.length
    }
  }
)
