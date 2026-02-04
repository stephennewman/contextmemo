import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
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
import { BrandContext, VoiceInsight } from '@/lib/supabase/types'
import { emitFeedEvent } from '@/lib/feed/emit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
    const { brandId, queryId, memoType, competitorId } = event.data

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

    // Step 2: Generate memo based on type
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
            .replace(/\{\{competitor_name\}\}/g, competitor.name)
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
            .replace('{{competitor_name}}', competitor.name)
            .replace('{{competitor_context}}', JSON.stringify(competitor.context || {}, null, 2))
            .replace('{{other_alternatives}}', otherCompetitors)
            .replace(/\{\{brand_name\}\}/g, brand.name)
            .replace(/\{\{date\}\}/g, today)
          slug = `alternatives-to/${sanitizeSlug(competitor.name)}`
          title = `${competitor.name} Alternatives`
          break

        case 'industry':
          // Extract industry from query or use first market
          const industry = query?.query_text?.match(/for\s+(.+)$/i)?.[1] 
            || brandContext.markets?.[0] 
            || 'business'
          prompt = INDUSTRY_MEMO_PROMPT
            .replace('{{tone_instructions}}', toneInstructions)
            .replace('{{verified_insights}}', verifiedInsights)
            .replace('{{brand_context}}', JSON.stringify(brandContext, null, 2))
            .replace('{{industry}}', industry)
            .replace(/\{\{brand_name\}\}/g, brand.name)
            .replace(/\{\{date\}\}/g, today)
          slug = `for/${sanitizeSlug(industry)}`
          title = `${brand.name} for ${industry}`
          break

        case 'how_to':
          // Extract topic from query - remove various question prefixes
          let topic = query?.query_text || 'get started'
          // Remove common question prefixes to get the core topic
          topic = topic
            .replace(/^how\s+(to|can\s+i|do\s+i|should\s+i)\s+/i, '')
            .replace(/^what\s+(are|is)\s+(the\s+)?(best\s+)?(ways?\s+to\s+)?/i, '')
            .replace(/^why\s+(should\s+i|do\s+i\s+need\s+to)\s+/i, '')
            .replace(/\?$/g, '') // Remove trailing question mark
            .trim()
          
          const competitorList = competitors.slice(0, 3).map(c => c.name).join(', ')
          prompt = HOW_TO_MEMO_PROMPT
            .replace('{{tone_instructions}}', toneInstructions)
            .replace('{{verified_insights}}', verifiedInsights)
            .replace('{{brand_context}}', JSON.stringify(brandContext, null, 2))
            .replace('{{competitors}}', competitorList)
            .replace('{{topic}}', topic)
            .replace(/\{\{brand_name\}\}/g, brand.name)
            .replace(/\{\{date\}\}/g, today)
          slug = `how/${sanitizeSlug(topic)}`
          // Capitalize first letter properly
          title = `How to ${topic.charAt(0).toUpperCase() + topic.slice(1)}`
          break

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

    // Step 3: Create meta description
    const metaDescription = await step.run('generate-meta', async () => {
      const { text } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: `Write a 150-160 character meta description for this memo. Be factual and include the brand name:\n\n${memoContent.content.slice(0, 1000)}`,
        temperature: 0.3,
      })
      return text.slice(0, 160)
    })

    // Step 4: Generate Schema.org structured data with sameAs links
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

    // Step 5: Save memo to database
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

    // Step 6: Save version history
    await step.run('save-version', async () => {
      await supabase.from('memo_versions').insert({
        memo_id: memo.id,
        version: 1,
        content_markdown: memoContent.content,
        change_reason: 'initial',
      })
    })

    // Step 7: Create alert and feed event
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

    // Step 8: Trigger backlinking for this memo AND batch update all brand memos
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

    // Step 9: Submit to IndexNow for instant search engine indexing
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

    // Step 10: Auto-sync to HubSpot if enabled
    // This pushes the memo directly to the brand's HubSpot blog
    const hubspotConfig = brandContext?.hubspot
    if (hubspotConfig?.enabled && hubspotConfig?.auto_sync && hubspotConfig?.access_token && hubspotConfig?.blog_id) {
      await step.run('sync-to-hubspot', async () => {
        try {
          const { marked } = await import('marked')
          const htmlContent = await marked(memoContent.content, { gfm: true, breaks: true })
          
          const blogPost = {
            name: memoContent.title,
            contentGroupId: hubspotConfig.blog_id,
            postBody: htmlContent,
            metaDescription: metaDescription || undefined,
            slug: memoContent.slug.replace(/\//g, '-'),
            state: memo.status === 'published' ? 'PUBLISHED' : 'DRAFT',
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

          // If published, push live
          if (memo.status === 'published' && hubspotPost.state !== 'PUBLISHED') {
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
              },
            })
            .eq('id', memo.id)

          console.log(`Auto-synced to HubSpot: ${hubspotPost.id}`)
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
