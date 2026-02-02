import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { 
  COMPARISON_MEMO_PROMPT, 
  INDUSTRY_MEMO_PROMPT, 
  HOW_TO_MEMO_PROMPT,
  ALTERNATIVE_MEMO_PROMPT,
  generateToneInstructions
} from '@/lib/ai/prompts/memo-generation'
import { BrandContext } from '@/lib/supabase/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

    // Step 1: Get brand, query, and related data
    const { brand, query, competitor, competitors } = await step.run('get-data', async () => {
      const [brandResult, queryResult, directCompetitorResult] = await Promise.all([
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
            .replace('{{brand_context}}', JSON.stringify(brandContext, null, 2))
            .replace('{{competitor_context}}', JSON.stringify(competitor.context || {}, null, 2))
            .replace(/\{\{brand_name\}\}/g, brand.name)
            .replace(/\{\{competitor_name\}\}/g, competitor.name)
            .replace(/\{\{date\}\}/g, today)
          slug = `vs/${competitor.name.toLowerCase().replace(/\s+/g, '-')}`
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
            .replace('{{brand_context}}', JSON.stringify(brandContext, null, 2))
            .replace('{{competitor_name}}', competitor.name)
            .replace('{{competitor_context}}', JSON.stringify(competitor.context || {}, null, 2))
            .replace('{{other_alternatives}}', otherCompetitors)
            .replace(/\{\{brand_name\}\}/g, brand.name)
            .replace(/\{\{date\}\}/g, today)
          slug = `alternatives-to/${competitor.name.toLowerCase().replace(/\s+/g, '-')}`
          title = `${competitor.name} Alternatives`
          break

        case 'industry':
          // Extract industry from query or use first market
          const industry = query?.query_text?.match(/for\s+(.+)$/i)?.[1] 
            || brandContext.markets?.[0] 
            || 'business'
          prompt = INDUSTRY_MEMO_PROMPT
            .replace('{{tone_instructions}}', toneInstructions)
            .replace('{{brand_context}}', JSON.stringify(brandContext, null, 2))
            .replace('{{industry}}', industry)
            .replace(/\{\{brand_name\}\}/g, brand.name)
            .replace(/\{\{date\}\}/g, today)
          slug = `for/${industry.toLowerCase().replace(/\s+/g, '-')}`
          title = `${brand.name} for ${industry}`
          break

        case 'how_to':
          // Extract topic from query
          const topic = query?.query_text?.replace(/^how\s+to\s+/i, '') 
            || 'get started'
          const competitorList = competitors.slice(0, 3).map(c => c.name).join(', ')
          prompt = HOW_TO_MEMO_PROMPT
            .replace('{{tone_instructions}}', toneInstructions)
            .replace('{{brand_context}}', JSON.stringify(brandContext, null, 2))
            .replace('{{competitors}}', competitorList)
            .replace('{{topic}}', topic)
            .replace(/\{\{brand_name\}\}/g, brand.name)
            .replace(/\{\{date\}\}/g, today)
          slug = `how/${topic.toLowerCase().replace(/\s+/g, '-').slice(0, 50)}`
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
      citation: {
        '@type': 'WebSite',
        name: brand.name,
        url: `https://${brand.domain}`,
      },
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

    // Step 7: Create alert
    await step.run('create-alert', async () => {
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'memo_published',
        title: 'New Memo Published',
        message: `"${memoContent.title}" is now live at ${brand.subdomain}.contextmemo.com/${memoContent.slug}`,
        data: { memoId: memo.id, slug: memoContent.slug },
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

    return {
      success: true,
      memoId: memo.id,
      slug: memoContent.slug,
      status: memo.status,
    }
  }
)
