/**
 * Gap-to-Content Pipeline
 * 
 * Automatically generates content from identified content gaps
 * and pushes directly to the brand's HubSpot CMS.
 * 
 * Flow:
 * 1. Content gap identified by citation loop
 * 2. Generate optimized content for the gap
 * 3. Push to HubSpot as draft or published
 * 4. Track and verify
 */

import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { marked } from 'marked'
import { BrandContext, HubSpotConfig } from '@/lib/supabase/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

// Stock images by topic (Unsplash direct URLs - free to use)
const TOPIC_IMAGES: Record<string, { url: string; alt: string }> = {
  'cold_chain': {
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&h=630&fit=crop',
    alt: 'Cold chain logistics and temperature-controlled storage facility'
  },
  'temperature_monitoring': {
    url: 'https://images.unsplash.com/photo-1581093458791-9d42e3c2fd45?w=1200&h=630&fit=crop',
    alt: 'Digital temperature monitoring and sensor technology'
  },
  'food_safety': {
    url: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=1200&h=630&fit=crop',
    alt: 'Food safety and quality control in commercial kitchen'
  },
  'haccp': {
    url: 'https://images.unsplash.com/photo-1581093458791-9d42e3c2fd45?w=1200&h=630&fit=crop',
    alt: 'HACCP compliance and food safety monitoring systems'
  },
  'pharmaceutical': {
    url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200&h=630&fit=crop',
    alt: 'Pharmaceutical storage and medical supply chain'
  },
  'hospitality': {
    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=630&fit=crop',
    alt: 'Hotel and hospitality temperature management'
  },
  'restaurant': {
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=630&fit=crop',
    alt: 'Restaurant kitchen food safety and compliance'
  },
  'default': {
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&h=630&fit=crop',
    alt: 'Business technology and monitoring solutions'
  }
}

// Map content keywords to HubSpot tag IDs (Checkit's tags)
const KEYWORD_TO_TAGS: Record<string, string[]> = {
  'cold_chain': ['47070366612', '47075785730'], // Logistics, Connected Automated Monitoring
  'pharmaceutical': ['47070366832', '47281943480'], // Healthcare | Life Sciences, Life Sciences
  'food_safety': ['47075785549', '47075785730'], // Food Services, Connected Automated Monitoring
  'haccp': ['47075785549', '47075785730'], // Food Services, Connected Automated Monitoring
  'hospitality': ['47286228633', '47075785730'], // Leisure & Entertainment, Connected Automated Monitoring
  'restaurant': ['47075785549', '47296146462'], // Food Services, Contract Catering
  'healthcare': ['47281801038', '47070366832'], // Healthcare, Healthcare | Life Sciences
  'retail': ['47282168456', '47075785730'], // Retail, Connected Automated Monitoring
}

/**
 * Detect topic from content/query for image and tag selection
 */
function detectTopic(query: string, title: string): string {
  const text = `${query} ${title}`.toLowerCase()
  
  if (text.includes('cold chain') || text.includes('cold storage') || text.includes('freezer')) {
    return 'cold_chain'
  }
  if (text.includes('haccp') || text.includes('hazard analysis')) {
    return 'haccp'
  }
  if (text.includes('pharma') || text.includes('vaccine') || text.includes('medical')) {
    return 'pharmaceutical'
  }
  if (text.includes('food safety') || text.includes('food service')) {
    return 'food_safety'
  }
  if (text.includes('hotel') || text.includes('hospitality') || text.includes('lodging')) {
    return 'hospitality'
  }
  if (text.includes('restaurant') || text.includes('kitchen') || text.includes('catering')) {
    return 'restaurant'
  }
  if (text.includes('temperature') || text.includes('monitoring') || text.includes('sensor')) {
    return 'temperature_monitoring'
  }
  
  return 'default'
}

// Prompt for generating gap-filling content
const GAP_CONTENT_PROMPT = `You are creating content that will be published on a brand's website to help them get cited by AI assistants.

BRAND: {{brand_name}}
BRAND DESCRIPTION: {{brand_description}}
BRAND PRODUCTS/SERVICES: {{brand_products}}

CONTENT GAP TO FILL:
- Query that currently cites competitors: "{{source_query}}"
- Competitor being cited: {{competitor_name}}
- Content type that works: {{content_type}}
- Why competitor's content gets cited: {{content_structure}}
- Recommendation: {{recommendation}}

YOUR TASK:
Create a comprehensive, authoritative article that:
1. Directly addresses the query "{{source_query}}"
2. Positions {{brand_name}} as an expert/solution in this space
3. Uses the content structure that works ({{content_type}})
4. Is SEO-optimized for AI citation
5. Includes factual, verifiable information
6. Is 1500-2500 words for depth

CONTENT STRUCTURE REQUIREMENTS:
- Clear H1 title that matches the query intent
- Structured with H2/H3 headings for scannability
- Include a "Key Takeaways" or "Summary" section
- Include practical examples or use cases
- Reference {{brand_name}}'s capabilities naturally (not salesy)
- End with a clear call-to-action

SEO/AI CITATION REQUIREMENTS:
- Title should match common query patterns
- Include FAQ schema-friendly Q&A sections where appropriate
- Use specific numbers, statistics, and data points
- Include comparison tables if relevant
- Cite authoritative sources (industry standards, regulations)

OUTPUT FORMAT:
Return a JSON object:
{
  "title": "SEO-optimized title (60-70 chars)",
  "slug": "url-friendly-slug",
  "meta_description": "150-160 char meta description",
  "content": "Full article in Markdown format",
  "target_keywords": ["keyword1", "keyword2", "keyword3"]
}`

/**
 * Process a single content gap and generate content for HubSpot
 */
export const gapToContent = inngest.createFunction(
  {
    id: 'gap-to-content',
    name: 'Generate Content from Gap',
    concurrency: { limit: 2 },
  },
  { event: 'gap/process' },
  async ({ event, step }) => {
    const { gapId, publishImmediately = false } = event.data

    // Step 1: Get gap and brand data
    const { gap, brand } = await step.run('get-data', async () => {
      const { data: gapData, error: gapError } = await supabase
        .from('content_gaps')
        .select('*')
        .eq('id', gapId)
        .single()

      if (gapError || !gapData) {
        throw new Error('Content gap not found')
      }

      const { data: brandData, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', gapData.brand_id)
        .single()

      if (brandError || !brandData) {
        throw new Error('Brand not found')
      }

      return { gap: gapData, brand: brandData }
    })

    const context = brand.context as BrandContext
    const hubspotConfig = context?.hubspot as HubSpotConfig | undefined

    // Check HubSpot is configured
    if (!hubspotConfig?.enabled || !hubspotConfig?.access_token || !hubspotConfig?.blog_id) {
      // Still generate content, just save as memo instead
      console.log('HubSpot not configured, will save as memo')
    }

    // Step 2: Generate content
    const content = await step.run('generate-content', async () => {
      const prompt = GAP_CONTENT_PROMPT
        .replace(/\{\{brand_name\}\}/g, brand.name)
        .replace('{{brand_description}}', context?.brand_description || brand.description || '')
        .replace('{{brand_products}}', JSON.stringify(context?.products || []))
        .replace('{{source_query}}', gap.source_query)
        .replace('{{competitor_name}}', gap.competitor_name)
        .replace('{{content_type}}', gap.content_type || 'landing_page')
        .replace('{{content_structure}}', gap.content_structure || '')
        .replace('{{recommendation}}', gap.recommendation || '')

      const { text } = await generateText({
        model: openrouter('openai/gpt-4o'),
        prompt,
        temperature: 0.5,
      })

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse content generation response')
      }

      return JSON.parse(jsonMatch[0])
    })

    // Step 3: Push to HubSpot if configured
    let hubspotResult = null
    if (hubspotConfig?.enabled && hubspotConfig?.access_token && hubspotConfig?.blog_id) {
      hubspotResult = await step.run('push-to-hubspot', async () => {
        const htmlContent = await marked(content.content, { gfm: true, breaks: true })
        
        // Detect topic for image and tags
        const topic = detectTopic(gap.source_query, content.title)
        const image = TOPIC_IMAGES[topic] || TOPIC_IMAGES['default']
        const tagIds = KEYWORD_TO_TAGS[topic] || []
        
        // Create excerpt from first paragraph
        const excerptMatch = content.content.match(/^[^#].*?(?=\n\n|\n#)/s)
        const postSummary = excerptMatch 
          ? excerptMatch[0].replace(/[*_`]/g, '').slice(0, 300) + '...'
          : content.meta_description

        const blogPost = {
          name: content.title,
          htmlTitle: `${content.title} | Checkit`,
          contentGroupId: hubspotConfig.blog_id,
          postBody: htmlContent,
          postSummary: postSummary,
          metaDescription: content.meta_description,
          slug: content.slug,
          state: publishImmediately ? 'PUBLISHED' : 'DRAFT',
          // Featured image
          featuredImage: image.url,
          featuredImageAltText: image.alt,
          useFeaturedImage: true,
          // Tags
          tagIds: tagIds.map(id => parseInt(id)),
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
          throw new Error(`HubSpot API error: ${errorData.message || response.status}`)
        }

        const hubspotPost = await response.json()

        // Publish if requested
        if (publishImmediately && hubspotPost.state !== 'PUBLISHED') {
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

        return {
          postId: hubspotPost.id,
          url: hubspotPost.url,
          state: publishImmediately ? 'PUBLISHED' : 'DRAFT',
        }
      })
    }

    // Step 4: Also save as memo for tracking
    const memo = await step.run('save-memo', async () => {
      const { data, error } = await supabase
        .from('memos')
        .insert({
          brand_id: brand.id,
          memo_type: 'gap_fill',
          slug: `gap/${content.slug}`,
          title: content.title,
          content_markdown: content.content,
          meta_description: content.meta_description,
          schema_json: {
            source_gap_id: gapId,
            target_keywords: content.target_keywords,
            hubspot_post_id: hubspotResult?.postId,
            hubspot_synced_at: hubspotResult ? new Date().toISOString() : null,
          },
          status: hubspotResult ? 'published' : 'draft',
          published_at: hubspotResult ? new Date().toISOString() : null,
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to save memo:', error)
        // Don't throw - HubSpot push succeeded
      }

      return data
    })

    // Step 5: Update gap status
    await step.run('update-gap', async () => {
      await supabase
        .from('content_gaps')
        .update({
          status: 'content_created',
          response_memo_id: memo?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gapId)
    })

    // Step 6: Create alert
    await step.run('create-alert', async () => {
      await supabase.from('alerts').insert({
        brand_id: brand.id,
        alert_type: 'gap_content_created',
        title: 'Content Gap Filled',
        message: hubspotResult 
          ? `"${content.title}" has been pushed to HubSpot (${hubspotResult.state})`
          : `"${content.title}" has been generated and saved as a memo`,
        data: {
          gapId,
          memoId: memo?.id,
          hubspotPostId: hubspotResult?.postId,
          title: content.title,
        },
      })
    })

    return {
      success: true,
      gapId,
      memoId: memo?.id,
      hubspotPostId: hubspotResult?.postId,
      hubspotState: hubspotResult?.state,
      title: content.title,
    }
  }
)

/**
 * Process all pending content gaps for a brand
 */
export const processAllGaps = inngest.createFunction(
  {
    id: 'process-all-gaps',
    name: 'Process All Content Gaps',
    concurrency: { limit: 1 },
  },
  { event: 'gap/process-all' },
  async ({ event, step }) => {
    const { brandId, limit = 5, publishImmediately = false } = event.data

    // Get pending gaps
    const gaps = await step.run('get-gaps', async () => {
      const { data, error } = await supabase
        .from('content_gaps')
        .select('id, source_query, competitor_name')
        .eq('brand_id', brandId)
        .eq('status', 'identified')
        .order('created_at', { ascending: true })
        .limit(limit)

      if (error) throw error
      return data || []
    })

    if (gaps.length === 0) {
      return { success: true, message: 'No pending gaps', processed: 0 }
    }

    // Trigger processing for each gap
    await step.sendEvent(
      'process-gaps',
      gaps.map(gap => ({
        name: 'gap/process',
        data: { gapId: gap.id, publishImmediately },
      }))
    )

    return {
      success: true,
      queued: gaps.length,
      gaps: gaps.map(g => ({ id: g.id, query: g.source_query, competitor: g.competitor_name })),
    }
  }
)
