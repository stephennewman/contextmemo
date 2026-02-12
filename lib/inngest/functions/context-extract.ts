import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { fetchUrlAsMarkdown, crawlWebsite, searchWebsite, JinaReaderResponse } from '@/lib/utils/jina-reader'
import { CONTEXT_EXTRACTION_PROMPT, POSITIONING_ENRICHMENT_PROMPT } from '@/lib/ai/prompts/context-extraction'
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
  "personas": [{"title": "role title", "pain_points": ["pain 1"]}],
  "certifications": ["cert 1"],
  "customers": ["notable customer 1"],
  "brand_voice": "professional" | "casual" | "technical",
  "corporate_positioning": {
    "mission_statement": "company mission",
    "core_value_promise": "main value proposition",
    "key_benefits": ["benefit 1", "benefit 2"],
    "differentiators": [{"name": "differentiator", "detail": "explanation"}]
  }
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

    // Step 2b: Enrich corporate positioning gaps with a focused second-pass
    const enrichedContext = await step.run('enrich-positioning', async () => {
      // Cast to BrandContext for property access (minimal fallback won't have these fields)
      const ctx = extractedContext as BrandContext
      const cp = ctx.corporate_positioning
      if (!cp) {
        // No corporate_positioning at all — build from scratch
        // But only if we have basic context to work with
        if (!ctx.company_name || ctx.company_name === domain) {
          return extractedContext
        }
      }

      // Calculate which fields are missing
      const missing: string[] = []
      const instructions: string[] = []

      if (!cp?.vision_statement) {
        missing.push('vision_statement')
        instructions.push(`"vision_statement": Generate a 1-2 sentence vision statement — the future state the company is creating. Infer from their mission, products, and market positioning.`)
      }
      if (!cp?.primary_verticals?.length) {
        missing.push('primary_verticals')
        instructions.push(`"primary_verticals": List 2-4 industries/verticals with specific sub-segments. Format: "• Industry - sub-segments". Use the company's markets data.`)
      }
      if (!cp?.buyer_personas?.length) {
        missing.push('buyer_personas')
        instructions.push(`"buyer_personas": List 2-3 decision-maker personas as prose descriptions. Format: "• Title - responsibilities, pain points, what they look for". Infer from markets + products.`)
      }
      if (!cp?.user_personas?.length) {
        missing.push('user_personas')
        instructions.push(`"user_personas": List 2-3 end-user personas. Format: "• User type - how they interact with the product daily". Infer from features + products.`)
      }
      if (!cp?.core_value_promise) {
        missing.push('core_value_promise')
        instructions.push(`"core_value_promise": One sentence answering "What do we do and why does it matter?" Ground in the company's actual products.`)
      }
      if (!cp?.key_benefits?.length) {
        missing.push('key_benefits')
        instructions.push(`"key_benefits": 4-6 specific, outcome-oriented benefit statements. Use action verbs. Derive from features + products.`)
      }
      if (!cp?.proof_points?.length) {
        missing.push('proof_points')
        instructions.push(`"proof_points": 3-5 trust signals — customer logos, statistics, awards, compliance certs. Use the customers + certifications data.`)
      }
      if (!cp?.differentiators?.length || cp.differentiators.length < 3) {
        missing.push('differentiators')
        const existing = cp?.differentiators?.length || 0
        instructions.push(`"differentiators": Array of ${3 - existing} differentiator objects with "name" (3-5 words) and "detail" (2-3 sentences). What makes this company unique? Be specific, not generic.`)
      }
      if (!cp?.messaging_pillars?.length) {
        missing.push('messaging_pillars')
        instructions.push(`"messaging_pillars": Array of 3 objects with "name" (one word like "Speed" or "Intelligence") and "supporting_points" (array of 3-4 specific capabilities). Identify the 3 most repeated themes across the company's messaging.`)
      }
      if (!cp?.pitch_10_second) {
        missing.push('pitch_10_second')
        instructions.push(`"pitch_10_second": One sentence — who the company is, what they do, for whom.`)
      }
      if (!cp?.pitch_30_second) {
        missing.push('pitch_30_second')
        instructions.push(`"pitch_30_second": 3-4 sentences covering: the problem → the solution → the key differentiator.`)
      }
      if (!cp?.pitch_2_minute) {
        missing.push('pitch_2_minute')
        instructions.push(`"pitch_2_minute": A complete narrative (5-8 sentences) covering: 1) The problem, 2) The solution, 3) How it works, 4) Key benefits, 5) Proof points, 6) Call to action.`)
      }
      if (!cp?.objection_responses?.length) {
        missing.push('objection_responses')
        instructions.push(`"objection_responses": Array of 3 objects with "objection" (common buyer pushback) and "response" (how to address it). Think about what a skeptical buyer in this market would say.`)
      }
      if (!cp?.competitive_positioning) {
        missing.push('competitive_positioning')
        instructions.push(`"competitive_positioning": One paragraph on how the company positions itself vs competitors. Infer from differentiators and market position.`)
      }
      if (!cp?.win_themes?.length) {
        missing.push('win_themes')
        instructions.push(`"win_themes": 3-5 themes that win deals. E.g., "Unified platform vs. point solutions". Derive from differentiators + value prop.`)
      }
      if (!cp?.competitive_landmines?.length) {
        missing.push('competitive_landmines')
        instructions.push(`"competitive_landmines": 3 questions to ask competitors that expose weaknesses. Based on the company's strengths.`)
      }

      // Skip only if nothing is missing
      if (missing.length === 0) {
        console.log('Positioning enrichment: all fields filled, skipping')
        return extractedContext
      }

      console.log(`Positioning enrichment: ${missing.length} fields missing for ${extractedContext.company_name}, running enrichment...`)

      // Build the prompt with context
      const prompt = POSITIONING_ENRICHMENT_PROMPT
        .replace('{{company_name}}', ctx.company_name || '')
        .replace('{{description}}', ctx.description || '')
        .replace('{{products}}', (ctx.products || []).join(', '))
        .replace('{{markets}}', (ctx.markets || []).join(', '))
        .replace('{{features}}', (ctx.features || []).join(', '))
        .replace('{{customers}}', (ctx.customers || []).join(', '))
        .replace('{{mission_statement}}', cp?.mission_statement || 'Not available')
        .replace('{{core_value_promise}}', cp?.core_value_promise || 'Not available')
        .replace('{{differentiators}}', cp?.differentiators?.map((d: { name: string; detail: string }) => `${d.name}: ${d.detail}`).join('; ') || 'None extracted')
        .replace('{{missing_fields_instructions}}', `Generate these missing fields:\n\n${instructions.join('\n\n')}`)

      try {
        const { text, usage: uEnrich } = await generateText({
          model: openai('gpt-4o'),
          prompt,
          temperature: 0.3,
        })

        if (tenantId) {
          await logSingleUsage(tenantId, brandId, 'context_extract', 'gpt-4o', uEnrich?.inputTokens || 0, uEnrich?.outputTokens || 0)
        }

        // Parse the enrichment response
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          console.error('Positioning enrichment: no JSON found in response')
          return extractedContext
        }

        const enriched = JSON.parse(jsonMatch[0])
        console.log(`Positioning enrichment: filled ${Object.keys(enriched).length} fields`)

        // Merge enriched fields into existing corporate_positioning
        const mergedPositioning = { ...(cp || {}), ...enriched }

        // For differentiators, append rather than replace if we had some
        if (enriched.differentiators && cp?.differentiators?.length) {
          mergedPositioning.differentiators = [
            ...cp.differentiators,
            ...enriched.differentiators
          ].slice(0, 3) // Cap at 3
        }

        return {
          ...extractedContext,
          corporate_positioning: mergedPositioning
        }
      } catch (e) {
        console.error('Positioning enrichment failed:', e)
        return extractedContext
      }
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
        ...enrichedContext,
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

    // Step 5: Trigger query generation directly (skip broad competitor discovery during onboarding)
    // Competitors/entities will be discovered later from scan results
    await step.sendEvent('trigger-query-generation', {
      name: 'query/generate',
      data: { brandId },
    })

    // Step 5b: Trigger deep competitor research in parallel (non-blocking)
    // This runs Sonar web search + GPT classification to find true product competitors
    // while queries and scans proceed independently
    await step.sendEvent('trigger-competitor-research', {
      name: 'competitor/research',
      data: { brandId },
    })

    return { 
      success: true, 
      context: enrichedContext,
      source: websiteContent.source,
      contentLength: websiteContent.content.length,
      pagesIndexed: existingPages.length,
    }
  }
)
