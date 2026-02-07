import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { 
  COMPARISON_MEMO_PROMPT, 
  INDUSTRY_MEMO_PROMPT, 
  HOW_TO_MEMO_PROMPT,
  ALTERNATIVE_MEMO_PROMPT,
  generateToneInstructions,
  formatVoiceInsightsForPrompt
} from '@/lib/ai/prompts/memo-generation'
import { BrandContext, VoiceInsight, ExistingPage } from '@/lib/supabase/types'
import { emitFeedEvent } from '@/lib/feed/emit'
import { sanitizeContentForHubspot, formatHtmlForHubspot } from '@/lib/hubspot/content-sanitizer'
import { selectImageForMemo } from '@/lib/hubspot/image-selector'

const supabase = createServiceRoleClient()

// Helper to sanitize slugs - removes special characters, normalizes spaces
function sanitizeSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[?!.,;:'"()[\]{}]/g, '') // Remove punctuation
    .replace(/[^\w\s-]/g, '') // Remove non-word characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .slice(0, 50) // Limit length
}

// Helper to check if a memo topic overlaps with existing site content
function checkTopicOverlap(
  memoType: string,
  memoTopics: string[],
  competitorName: string | null,
  existingPages: ExistingPage[]
): { hasOverlap: boolean; matchingPage?: ExistingPage; overlapScore: number } {
  if (!existingPages || existingPages.length === 0) {
    return { hasOverlap: false, overlapScore: 0 }
  }

  // Normalize topics for comparison
  const normalizeText = (text: string) => text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  const normalizedMemoTopics = memoTopics.map(normalizeText)
  const normalizedCompetitor = competitorName ? normalizeText(competitorName) : null

  let bestMatch: { page: ExistingPage; score: number } | null = null

  for (const page of existingPages) {
    const pageTopics = page.topics.map(normalizeText)
    const pageTitle = normalizeText(page.title)
    const pageUrl = normalizeText(page.url)

    let matchScore = 0

    // Check for comparison/alternative memos - look for competitor name in existing pages
    if ((memoType === 'comparison' || memoType === 'alternative') && normalizedCompetitor) {
      // Check if page mentions the competitor
      if (pageTopics.some(t => t.includes(normalizedCompetitor) || normalizedCompetitor.includes(t))) {
        matchScore += 50
      }
      if (pageTitle.includes(normalizedCompetitor)) {
        matchScore += 30
      }
      if (pageUrl.includes(normalizedCompetitor.replace(/\s+/g, '-'))) {
        matchScore += 20
      }
      // Check for "vs" or "alternative" in URL/title
      if (pageUrl.includes('vs') || pageUrl.includes('alternative') || pageUrl.includes('compare')) {
        matchScore += 10
      }
      if (pageTitle.includes('vs') || pageTitle.includes('alternative') || pageTitle.includes('compare')) {
        matchScore += 10
      }
    }

    // Check for industry memos - look for industry keywords
    if (memoType === 'industry') {
      const industryKeywords = normalizedMemoTopics.filter(t => 
        t.includes('industry') || t.includes('sector') || t.includes('market') ||
        // Common industry terms
        ['restaurant', 'healthcare', 'hospitality', 'retail', 'food', 'pharma', 'manufacturing'].some(ind => t.includes(ind))
      )
      for (const keyword of industryKeywords) {
        if (pageTopics.some(t => t.includes(keyword) || keyword.includes(t))) {
          matchScore += 30
        }
        if (pageTitle.includes(keyword)) {
          matchScore += 20
        }
        if (pageUrl.includes(keyword.replace(/\s+/g, '-'))) {
          matchScore += 15
        }
      }
      // Check for "for" or "industries" in URL/title
      if (page.content_type === 'industry') {
        matchScore += 20
      }
    }

    // Check for how-to memos - look for topic keywords
    if (memoType === 'how_to') {
      for (const topic of normalizedMemoTopics) {
        if (pageTopics.some(t => t.includes(topic) || topic.includes(t))) {
          matchScore += 25
        }
        if (pageTitle.includes(topic)) {
          matchScore += 15
        }
      }
      // Check for how-to content types
      if (page.content_type === 'resource' || page.content_type === 'blog') {
        // Check if title suggests guide/how-to content
        if (pageTitle.includes('how') || pageTitle.includes('guide') || pageTitle.includes('tutorial')) {
          matchScore += 10
        }
      }
    }

    // General topic overlap check for any memo type
    for (const memoTopic of normalizedMemoTopics) {
      for (const pageTopic of pageTopics) {
        // Exact match
        if (memoTopic === pageTopic) {
          matchScore += 20
        }
        // Partial match (one contains the other)
        else if (memoTopic.includes(pageTopic) || pageTopic.includes(memoTopic)) {
          matchScore += 10
        }
      }
    }

    if (matchScore > 0 && (!bestMatch || matchScore > bestMatch.score)) {
      bestMatch = { page, score: matchScore }
    }
  }

  // Threshold for considering content as redundant
  // Score of 50+ means significant overlap
  const OVERLAP_THRESHOLD = 50

  if (bestMatch && bestMatch.score >= OVERLAP_THRESHOLD) {
    return {
      hasOverlap: true,
      matchingPage: bestMatch.page,
      overlapScore: bestMatch.score,
    }
  }

  return { hasOverlap: false, overlapScore: bestMatch?.score || 0 }
}

export const memoGenerate = inngest.createFunction(
  { 
    id: 'memo-generate', 
    name: 'Generate Context Memo',
    concurrency: {
      limit: 3, // Limit concurrent memo generation to avoid rate limits
    },
  },
  { event: 'memo/generate' },
  async ({ event, step }) => {
    const { brandId, queryId, memoType, competitorId, topicTitle, topicDescription } = event.data

    // Step 1: Get brand, query, related data, and voice insights
    const { brand, query, competitor, competitors, voiceInsights } = await step.run('get-data', async () => {
      const [brandResult, queryResult, directCompetitorResult, voiceInsightsResult] = await Promise.all([
        supabase
          .from('brands')
          .select('*')
          .eq('id', brandId)
          .single(),
        queryId
          ? supabase
              .from('queries')
              .select('*, competitor:related_competitor_id(*)')
              .eq('id', queryId)
              .single()
          : Promise.resolve({ data: null, error: null }),
        // Also fetch competitor directly if competitorId provided
        competitorId
          ? supabase
              .from('competitors')
              .select('*')
              .eq('id', competitorId)
              .single()
          : Promise.resolve({ data: null, error: null }),
        // Fetch active voice insights for the brand
        supabase
          .from('voice_insights')
          .select('*')
          .eq('brand_id', brandId)
          .eq('status', 'active')
          .order('recorded_at', { ascending: false })
          .limit(10),
      ])

      if (brandResult.error || !brandResult.data) {
        throw new Error('Brand not found')
      }

      // Get all competitors for the brand
      const { data: allCompetitors } = await supabase
        .from('competitors')
        .select('*')
        .eq('brand_id', brandId)
        .eq('is_active', true)

      // Use direct competitor if provided, otherwise fall back to query's competitor
      const resolvedCompetitor = directCompetitorResult.data || queryResult.data?.competitor || null

      return {
        brand: brandResult.data,
        query: queryResult.data,
        competitor: resolvedCompetitor,
        competitors: allCompetitors || [],
        voiceInsights: (voiceInsightsResult.data || []) as VoiceInsight[],
      }
    })

    const brandContext = brand.context as BrandContext
    const today = new Date().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })

    // Generate tone instructions from brand settings
    const toneInstructions = generateToneInstructions(brandContext.brand_tone)
    
    // Format voice insights for inclusion in prompts
    const verifiedInsights = formatVoiceInsightsForPrompt(voiceInsights)

    // Step 2: Check for redundancy with existing site content
    const redundancyCheck = await step.run('check-redundancy', async () => {
      const existingPages = brandContext.existing_pages || []
      
      if (existingPages.length === 0) {
        console.log('No existing pages indexed, skipping redundancy check')
        return { shouldSkip: false, reason: null as string | null, matchingPage: undefined as ExistingPage | undefined, overlapScore: 0 }
      }

      // Build topics based on memo type
      let memoTopics: string[] = []
      let competitorName: string | null = competitor?.name || null

      switch (memoType) {
        case 'comparison':
        case 'alternative':
          if (competitor) {
            memoTopics = [
              competitor.name,
              `${brand.name} vs ${competitor.name}`,
              'comparison',
              'alternative',
              ...(competitor.context?.products || []),
            ].filter(Boolean)
          }
          break

        case 'industry': {
          const redIndustry = topicTitle
            || query?.query_text?.match(/for\s+(.+)$/i)?.[1] 
            || brandContext.markets?.[0] 
            || 'business'
          memoTopics = [
            redIndustry,
            `${brand.name} for ${redIndustry}`,
            ...(brandContext.markets || []),
          ].filter(Boolean)
          break
        }

        case 'how_to': {
          let topic = topicTitle || query?.query_text || 'get started'
          topic = topic
            .replace(/^how\s+(to|can\s+i|do\s+i|should\s+i)\s+/i, '')
            .replace(/^what\s+(are|is)\s+(the\s+)?(best\s+)?(ways?\s+to\s+)?/i, '')
            .replace(/\?$/g, '')
            .trim()
          memoTopics = [
            topic,
            `how to ${topic}`,
            ...(brandContext.products || []),
            ...(brandContext.features || []),
          ].filter(Boolean)
          break
        }

        default:
          memoTopics = [
            ...(brandContext.products || []),
            ...(brandContext.markets || []),
          ].filter(Boolean)
      }

      const overlap = checkTopicOverlap(memoType, memoTopics, competitorName, existingPages)

      if (overlap.hasOverlap && overlap.matchingPage) {
        console.log(`Redundancy detected: memo type "${memoType}" overlaps with existing page "${overlap.matchingPage.url}" (score: ${overlap.overlapScore})`)
        return {
          shouldSkip: true,
          reason: `Content already exists at ${overlap.matchingPage.url}`,
          matchingPage: overlap.matchingPage,
          overlapScore: overlap.overlapScore,
        }
      }

      console.log(`No redundancy detected for memo type "${memoType}" (best overlap score: ${overlap.overlapScore})`)
      return { shouldSkip: false, reason: null as string | null, matchingPage: undefined as ExistingPage | undefined, overlapScore: overlap.overlapScore }
    })

    // If content already exists, skip memo generation and return early
    if (redundancyCheck.shouldSkip) {
      console.log(`Skipping memo generation: ${redundancyCheck.reason}`)
      
      // Create an informational alert instead of generating duplicate content
      await step.run('create-skip-alert', async () => {
        await supabase.from('alerts').insert({
          brand_id: brandId,
          alert_type: 'memo_skipped',
          title: 'Memo Generation Skipped',
          message: `Skipped creating ${memoType} memo: ${redundancyCheck.reason}. The brand already has content covering this topic.`,
          data: { 
            memoType,
            competitorName: competitor?.name,
            matchingPage: redundancyCheck.matchingPage,
            queryId,
          },
        })
      })

      return {
        success: false,
        skipped: true,
        reason: redundancyCheck.reason,
        matchingPage: redundancyCheck.matchingPage,
      }
    }

    // Step 3: Generate memo based on type
    const memoContent = await step.run('generate-memo', async () => {
      let prompt: string
      let slug: string
      let title: string

      switch (memoType) {
        case 'comparison':
          if (!competitor) {
            throw new Error('Competitor required for comparison memo')
          }
          prompt = COMPARISON_MEMO_PROMPT
            .replace('{{tone_instructions}}', toneInstructions)
            .replace('{{verified_insights}}', verifiedInsights)
            .replace('{{brand_context}}', JSON.stringify(brandContext, null, 2))
            .replace('{{competitor_context}}', JSON.stringify(competitor.context || {}, null, 2))
            .replace(/\{\{brand_name\}\}/g, brand.name)
            .replace(/\{\{brand_domain\}\}/g, brand.domain || '')
            .replace(/\{\{competitor_name\}\}/g, competitor.name)
            .replace(/\{\{competitor_domain\}\}/g, competitor.domain || competitor.name.toLowerCase().replace(/\s+/g, '') + '.com')
            .replace(/\{\{date\}\}/g, today)
          slug = `vs/${sanitizeSlug(competitor.name)}`
          title = `${brand.name} vs ${competitor.name}: Key Differences`
          break

        case 'alternative':
          if (!competitor) {
            throw new Error('Competitor required for alternative memo')
          }
          const otherCompetitors = competitors
            .filter(c => c.id !== competitor.id)
            .slice(0, 3)
            .map(c => c.name)
            .join(', ')
          prompt = ALTERNATIVE_MEMO_PROMPT
            .replace('{{tone_instructions}}', toneInstructions)
            .replace('{{verified_insights}}', verifiedInsights)
            .replace('{{brand_context}}', JSON.stringify(brandContext, null, 2))
            .replace(/\{\{competitor_name\}\}/g, competitor.name)
            .replace('{{competitor_context}}', JSON.stringify(competitor.context || {}, null, 2))
            .replace('{{other_alternatives}}', otherCompetitors)
            .replace(/\{\{brand_name\}\}/g, brand.name)
            .replace(/\{\{brand_domain\}\}/g, brand.domain || '')
            .replace(/\{\{competitor_domain\}\}/g, competitor.domain || competitor.name.toLowerCase().replace(/\s+/g, '') + '.com')
            .replace(/\{\{date\}\}/g, today)
          slug = `alternatives-to/${sanitizeSlug(competitor.name)}`
          title = `${competitor.name} Alternatives`
          break

        case 'industry': {
          // Extract industry from topic title, query, or first market
          const industry = topicTitle
            || query?.query_text?.match(/for\s+(.+)$/i)?.[1] 
            || brandContext.markets?.[0] 
            || 'business'
          prompt = INDUSTRY_MEMO_PROMPT
            .replace('{{tone_instructions}}', toneInstructions)
            .replace('{{verified_insights}}', verifiedInsights)
            .replace('{{brand_context}}', JSON.stringify(brandContext, null, 2))
            .replace('{{industry}}', industry)
            .replace(/\{\{brand_name\}\}/g, brand.name)
            .replace(/\{\{brand_domain\}\}/g, brand.domain || '')
            .replace(/\{\{date\}\}/g, today)
          slug = `for/${sanitizeSlug(industry)}`
          title = `${brand.name} for ${industry}`
          break
        }

        case 'how_to': {
          // Use topic title from coverage audit, or extract from query
          let topic = topicTitle || query?.query_text || 'get started'
          
          // Remove question prefixes and convert to imperative form
          topic = topic
            .replace(/^how\s+(to|can\s+i|do\s+i|should\s+i)\s+/i, '')
            .replace(/^what\s+(are|is)\s+(the\s+)?(best\s+)?(ways?\s+to\s+)?/i, '')
            .replace(/^what\s+(are|is)\s+(the\s+)?(most\s+)?(effective\s+)?(methods?\s+(for|to)\s+)?/i, '')
            .replace(/^why\s+(should\s+i|do\s+i\s+need\s+to)\s+/i, '')
            .replace(/\?$/g, '') // Remove trailing question mark
            .trim()
          
          // Ensure topic starts with a verb for "How to X" format
          // If it starts with a noun/adjective pattern, add an appropriate verb
          const startsWithVerb = /^(implement|create|build|use|set|get|make|choose|select|find|monitor|track|automate|manage|improve|optimize|ensure|establish|develop|deploy|configure|enable|install|integrate|maintain|prevent|reduce|increase|measure|analyze|verify|validate|secure|protect|customize|streamline|simplify|digitize|transform)/i.test(topic)
          
          if (!startsWithVerb) {
            // Convert noun phrases to verb phrases
            if (/^(effective|best|optimal|proper|correct|safe|reliable|accurate|efficient)\s+(methods?|ways?|practices?|strategies?|approaches?|techniques?|solutions?)\s+(for|to)\s+/i.test(topic)) {
              // "effective methods for monitoring X" -> "effectively monitor X"
              topic = topic
                .replace(/^effective\s+(methods?|ways?|practices?)\s+(for|to)\s+/i, 'effectively ')
                .replace(/^best\s+(methods?|ways?|practices?)\s+(for|to)\s+/i, 'best ')
                .replace(/^optimal\s+(methods?|ways?|practices?)\s+(for|to)\s+/i, 'optimize ')
            } else if (/^(iot|digital|automated?|smart|wireless|cloud|remote)\s+/i.test(topic)) {
              // "IoT solutions for X" -> "implement IoT solutions for X"
              topic = `implement ${topic}`
            } else if (/monitoring|tracking|compliance|reporting|management/i.test(topic)) {
              // Topic about monitoring/tracking -> "set up X"
              topic = `set up ${topic}`
            }
          }
          
          // Ensure first letter is lowercase (since "How to" will precede it)
          topic = topic.charAt(0).toLowerCase() + topic.slice(1)
          
          const competitorList = competitors.slice(0, 3).map(c => c.name).join(', ')
          prompt = HOW_TO_MEMO_PROMPT
            .replace('{{tone_instructions}}', toneInstructions)
            .replace('{{verified_insights}}', verifiedInsights)
            .replace('{{brand_context}}', JSON.stringify(brandContext, null, 2))
            .replace('{{competitors}}', competitorList)
            .replace('{{topic}}', topic)
            .replace(/\{\{brand_name\}\}/g, brand.name)
            .replace(/\{\{brand_domain\}\}/g, brand.domain || '')
            .replace(/\{\{date\}\}/g, today)
          slug = `how/${sanitizeSlug(topic)}`
          // Capitalize first letter of action word after "How to"
          title = `How to ${topic.charAt(0).toUpperCase() + topic.slice(1)}`
          break
        }

        default:
          throw new Error(`Unknown memo type: ${memoType}`)
      }

      const { text } = await generateText({
        model: openai('gpt-4o'),
        prompt,
        temperature: 0.3,
      })

      // Validate that we got actual content, not an error response
      const errorPhrases = [
        "i'm sorry",
        "i cannot",
        "i can't",
        "i don't have",
        "i am not able",
        "without specific details",
        "without more context",
        "without more information",
        "please provide",
        "could you provide",
        "need more information",
      ]
      
      const textLower = text.toLowerCase().slice(0, 200)
      const isErrorResponse = errorPhrases.some(phrase => textLower.includes(phrase))
      
      if (isErrorResponse || text.length < 200) {
        console.error('Memo generation produced invalid content:', text.slice(0, 200))
        throw new Error(`Memo generation failed: AI could not generate content. Brand context may be insufficient. Please review brand settings and try again.`)
      }

      return { content: text, slug, title }
    })

    // Step 4: Create meta description
    const metaDescription = await step.run('generate-meta', async () => {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: `Write a 150-160 character meta description for this article about ${brand.name}. 

IMPORTANT: 
- Use "${brand.name}" as the brand name (NOT "Context Memo")
- Be factual and descriptive
- Focus on the value proposition

Article excerpt:
${memoContent.content.slice(0, 1000)}`,
        temperature: 0.3,
      })
      return text.slice(0, 160)
    })

    // Step 5: Generate Schema.org structured data with sameAs links
    // Build sameAs array for authoritative external references
    const brandSameAs: string[] = []
    
    // Add domain as primary reference
    if (brand.domain) {
      brandSameAs.push(`https://${brand.domain}`)
      brandSameAs.push(`https://www.${brand.domain}`)
    }
    
    // Add known authoritative sources based on brand name
    const brandSlug = brand.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const brandSlugUnderscore = brand.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    
    // LinkedIn company page (common pattern)
    brandSameAs.push(`https://www.linkedin.com/company/${brandSlug}`)
    
    // Crunchbase
    brandSameAs.push(`https://www.crunchbase.com/organization/${brandSlug}`)
    
    // Wikipedia (if company is notable enough)
    brandSameAs.push(`https://en.wikipedia.org/wiki/${encodeURIComponent(brand.name.replace(/\s+/g, '_'))}`)
    
    // Add social links from context if available
    if (brandContext.social_links) {
      if (brandContext.social_links.linkedin) brandSameAs.push(brandContext.social_links.linkedin)
      if (brandContext.social_links.twitter) brandSameAs.push(brandContext.social_links.twitter)
      if (brandContext.social_links.crunchbase) brandSameAs.push(brandContext.social_links.crunchbase)
      if (brandContext.social_links.wikipedia) brandSameAs.push(brandContext.social_links.wikipedia)
    }
    
    // Deduplicate
    const uniqueSameAs = [...new Set(brandSameAs)]

    // Build citations array from voice insights (Schema.org Quotation)
    const expertCitations = voiceInsights.map(insight => ({
      '@type': 'Quotation',
      text: insight.transcript,
      creator: {
        '@type': 'Person',
        name: insight.recorded_by_name,
        jobTitle: insight.recorded_by_title || undefined,
        sameAs: insight.recorded_by_linkedin_url || undefined,
      },
      dateCreated: insight.recorded_at,
      // Mark as verified primary source
      additionalType: 'https://schema.org/Statement',
      isBasedOn: {
        '@type': 'AudioObject',
        name: `Voice recording: ${insight.title}`,
        dateCreated: insight.recorded_at,
        // Include direct audio URL if available for verification
        ...(insight.audio_url && {
          contentUrl: insight.audio_url,
          encodingFormat: insight.audio_url.includes('.webm') ? 'audio/webm' : 'audio/mp4',
        }),
        // Duration in ISO 8601 format if available
        ...(insight.audio_duration_seconds && {
          duration: `PT${insight.audio_duration_seconds}S`,
        }),
      },
    }))

    // Build speakable specification for key content
    const speakableSpec = voiceInsights.length > 0 ? {
      '@type': 'SpeakableSpecification',
      cssSelector: ['blockquote', '.expert-insight'],
    } : undefined

    const schemaJson = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: memoContent.title,
      description: metaDescription,
      datePublished: new Date().toISOString(),
      dateModified: new Date().toISOString(),
      author: {
        '@type': 'Organization',
        name: 'Context Memo',
        url: 'https://contextmemo.com',
        logo: 'https://contextmemo.com/logo.png',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Context Memo',
        url: 'https://contextmemo.com',
      },
      about: {
        '@type': 'Organization',
        name: brand.name,
        url: `https://${brand.domain}`,
        sameAs: uniqueSameAs,
        description: brandContext.description || `${brand.name} company information`,
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://${brand.subdomain}.contextmemo.com/${memoContent.slug}`,
      },
      isAccessibleForFree: true,
      inLanguage: 'en-US',
      copyrightHolder: {
        '@type': 'Organization',
        name: brand.name,
      },
      // Primary source - the brand's website
      citation: {
        '@type': 'WebSite',
        name: brand.name,
        url: `https://${brand.domain}`,
      },
      // Expert quotes as structured citations
      ...(expertCitations.length > 0 && { hasPart: expertCitations }),
      // Speakable content for voice assistants
      ...(speakableSpec && { speakable: speakableSpec }),
    }

    // Step 6: Save memo to database
    const memo = await step.run('save-memo', async () => {
      const { data, error } = await supabase
        .from('memos')
        .upsert({
          brand_id: brandId,
          source_query_id: queryId || null,
          memo_type: memoType,
          slug: memoContent.slug,
          title: memoContent.title,
          content_markdown: memoContent.content,
          meta_description: metaDescription,
          schema_json: schemaJson,
          sources: [
            { url: `https://${brand.domain}`, title: brand.name, accessed_at: today },
            ...(competitor?.domain ? [{ url: `https://${competitor.domain}`, title: competitor.name, accessed_at: today }] : []),
          ],
          status: brand.auto_publish ? 'published' : 'draft',
          published_at: brand.auto_publish ? new Date().toISOString() : null,
          last_verified_at: new Date().toISOString(),
          version: 1,
        }, {
          onConflict: 'brand_id,slug',
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to save memo:', error)
        throw error
      }

      return data
    })

    // Step 7: Save version history
    await step.run('save-version', async () => {
      await supabase.from('memo_versions').insert({
        memo_id: memo.id,
        version: 1,
        content_markdown: memoContent.content,
        change_reason: 'initial',
      })
    })

    // Step 8: Create alert and feed event
    await step.run('create-alert-and-feed', async () => {
      // Legacy alert (v1 compatibility)
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'memo_published',
        title: 'New Memo Published',
        message: `"${memoContent.title}" is now live at ${brand.subdomain}.contextmemo.com/${memoContent.slug}`,
        data: { memoId: memo.id, slug: memoContent.slug },
      })
      
      // V2 Feed event
      await emitFeedEvent({
        tenant_id: brand.tenant_id,
        brand_id: brandId,
        workflow: 'core_discovery',
        event_type: memo.status === 'published' ? 'scan_complete' : 'gap_identified', // Using available types
        title: `Memo ${memo.status === 'published' ? 'published' : 'drafted'}: "${memoContent.title}"`,
        description: memo.status === 'published' 
          ? `Live at ${brand.subdomain}.contextmemo.com/${memoContent.slug}`
          : 'Memo saved as draft - review and publish when ready',
        severity: 'success',
        action_available: memo.status === 'published' ? ['view_memo'] : ['view_memo'],
        related_memo_id: memo.id,
        related_query_id: queryId || undefined,
        data: {
          memo_title: memoContent.title,
          memo_slug: memoContent.slug,
          memo_type: memoType,
          status: memo.status,
        },
      })
    })

    // Step 9: Trigger backlinking for this memo AND batch update all brand memos
    // This ensures new memos get linked, and existing memos link to the new one
    await step.sendEvent('trigger-backlinks', [
      {
        name: 'memo/backlink',
        data: { memoId: memo.id, brandId },
      },
      {
        name: 'memo/batch-backlink',
        data: { brandId },
      },
    ])

    // Step 10: Submit to IndexNow for instant search engine indexing
    // This helps AI models with web search find our content faster
    if (memo.status === 'published' && brand.subdomain) {
      await step.run('submit-indexnow', async () => {
        try {
          const { submitUrlToIndexNow, buildMemoUrl } = await import('@/lib/utils/indexnow')
          const memoUrl = buildMemoUrl(brand.subdomain, memoContent.slug)
          const results = await submitUrlToIndexNow(memoUrl)
          console.log(`IndexNow submission for ${memoUrl}:`, results)
          return results
        } catch (error) {
          console.error('IndexNow submission failed:', error)
          // Don't throw - indexing failure shouldn't break memo generation
          return null
        }
      })
    }

    // Step 11: Auto-sync to HubSpot if enabled
    // This pushes the memo directly to the brand's HubSpot blog
    const hubspotConfig = brandContext?.hubspot
    if (hubspotConfig?.enabled && hubspotConfig?.auto_sync && hubspotConfig?.access_token && hubspotConfig?.blog_id) {
      await step.run('sync-to-hubspot', async () => {
        try {
          const { marked } = await import('marked')
          
          // Sanitize content to remove any Contextmemo references and title before HubSpot sync
          const sanitizedContent = sanitizeContentForHubspot(memoContent.content, { 
            brandName: brand.name,
            title: memoContent.title, // Remove title from body - HubSpot displays it separately
          })
          const rawHtml = await marked(sanitizedContent, { gfm: true, breaks: true })
          // Apply HubSpot-specific formatting (inline styles for spacing, tables, etc.)
          const htmlContent = formatHtmlForHubspot(rawHtml)
          
          // Select a featured image based on the memo content
          // Using Unsplash URLs directly - HubSpot accepts external URLs for featuredImage
          const featuredImage = selectImageForMemo(memoContent.title, memoContent.content, memoType)
          
          // Create a summary from the first paragraph
          const contentParagraphs = sanitizedContent.split('\n\n')
          const firstParagraph = contentParagraphs.find((p: string) => p.trim() && !p.startsWith('#') && !p.startsWith('*Last'))
          const postSummary = firstParagraph
            ? firstParagraph.replace(/[*_`#]/g, '').trim().slice(0, 300) + (firstParagraph.length > 300 ? '...' : '')
            : metaDescription || ''
          
          const blogPost = {
            name: memoContent.title,
            htmlTitle: `${memoContent.title} | ${brand.name}`,
            contentGroupId: hubspotConfig.blog_id,
            postBody: htmlContent,
            postSummary: postSummary,
            metaDescription: metaDescription || undefined,
            slug: memoContent.slug.replace(/\//g, '-'),
            state: hubspotConfig.auto_publish ? 'PUBLISHED' : 'DRAFT',
            authorName: brand.name, // Auto-generated content uses brand name as author
            // Featured image - using Unsplash URL directly
            featuredImage: featuredImage.url,
            featuredImageAltText: featuredImage.alt,
            useFeaturedImage: true,
            // Publish date
            publishDate: new Date().toISOString(),
          }

          const response = await fetch('https://api.hubapi.com/cms/v3/blogs/posts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${hubspotConfig.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(blogPost),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('HubSpot auto-sync failed:', errorData)
            return { success: false, error: errorData.message }
          }

          const hubspotPost = await response.json()

          // If auto-publish enabled, push live
          if (hubspotConfig.auto_publish && hubspotPost.state !== 'PUBLISHED') {
            await fetch(
              `https://api.hubapi.com/cms/v3/blogs/posts/${hubspotPost.id}/draft/push-live`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${hubspotConfig.access_token}`,
                  'Content-Type': 'application/json',
                },
              }
            )
          }

          // Update memo with HubSpot post ID
          await supabase
            .from('memos')
            .update({
              schema_json: {
                ...memo.schema_json,
                hubspot_post_id: hubspotPost.id,
                hubspot_synced_at: new Date().toISOString(),
                hubspot_synced_by: 'Auto-sync',
                hubspot_auto_synced: true,
              },
            })
            .eq('id', memo.id)

          console.log(`Auto-synced to HubSpot: ${hubspotPost.id}`)
          
          // Submit to IndexNow if configured (for faster search engine indexing)
          if (hubspotConfig.indexnow_key && hubspotConfig.indexnow_key_location && hubspotPost.url) {
            try {
              const { submitExternalUrlToIndexNow } = await import('@/lib/utils/indexnow')
              const hubspotUrl = hubspotPost.url || `https://${brand.domain}/memos/${memoContent.slug.replace(/\//g, '-')}`
              const host = new URL(hubspotUrl).host
              await submitExternalUrlToIndexNow(
                hubspotUrl,
                host,
                hubspotConfig.indexnow_key,
                hubspotConfig.indexnow_key_location
              )
              console.log(`IndexNow submitted for HubSpot URL: ${hubspotUrl}`)
            } catch (indexNowError) {
              console.error('IndexNow submission failed:', indexNowError)
              // Don't fail the sync if IndexNow fails
            }
          }
          
          return { success: true, hubspotPostId: hubspotPost.id }
        } catch (error) {
          console.error('HubSpot auto-sync error:', error)
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        }
      })
    }

    return {
      success: true,
      memoId: memo.id,
      slug: memoContent.slug,
      status: memo.status,
    }
  }
)
