import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { marked } from 'marked'
import { BrandContext, HubSpotConfig } from '@/lib/supabase/types'
import { getHubSpotToken } from '@/lib/hubspot/oauth'
import { sanitizeContentForHubspot } from '@/lib/hubspot/content-sanitizer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface HubSpotBlogPost {
  name: string
  contentGroupId: string
  postBody: string
  metaDescription?: string
  slug?: string
  state: 'DRAFT' | 'PUBLISHED'
}

interface HubSpotResponse {
  id: string
  name: string
  slug: string
  state: string
  publishDate?: string
  url?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string; memoId: string }> }
) {
  try {
    const { brandId, memoId } = await params
    const body = await request.json()
    const { publish = false } = body

    // Get brand with HubSpot config
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single()

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const context = brand.context as BrandContext
    const hubspotConfig = context?.hubspot as HubSpotConfig | undefined

    if (!hubspotConfig?.enabled) {
      return NextResponse.json(
        { error: 'HubSpot integration is not enabled for this brand' },
        { status: 400 }
      )
    }

    if (!hubspotConfig.blog_id) {
      return NextResponse.json(
        { error: 'HubSpot blog ID is required' },
        { status: 400 }
      )
    }

    // Get a fresh/refreshed access token
    const accessToken = await getHubSpotToken(brandId)
    if (!accessToken) {
      return NextResponse.json(
        { error: 'HubSpot connection expired. Please reconnect HubSpot in settings.' },
        { status: 401 }
      )
    }

    // Get memo
    const { data: memo, error: memoError } = await supabase
      .from('memos')
      .select('*')
      .eq('id', memoId)
      .eq('brand_id', brandId)
      .single()

    if (memoError || !memo) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 })
    }

    // Sanitize content to remove any Contextmemo references, then convert to HTML
    const sanitizedMarkdown = sanitizeContentForHubspot(memo.content_markdown, { brandName: brand.name })
    const htmlContent = await marked(sanitizedMarkdown, {
      gfm: true,
      breaks: true,
    })

    // Prepare HubSpot blog post payload
    const blogPost: HubSpotBlogPost = {
      name: memo.title,
      contentGroupId: hubspotConfig.blog_id,
      postBody: htmlContent,
      metaDescription: memo.meta_description || undefined,
      slug: memo.slug.replace(/\//g, '-'), // HubSpot doesn't allow slashes in slugs
      state: publish ? 'PUBLISHED' : 'DRAFT',
    }

    // Check if we already have a HubSpot post ID (for updates)
    let existingHubspotId = memo.schema_json?.hubspot_post_id

    let response: Response
    let hubspotPost: HubSpotResponse

    // Helper to create a new post
    const createNewPost = async () => {
      return fetch('https://api.hubapi.com/cms/v3/blogs/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(blogPost),
      })
    }

    if (existingHubspotId) {
      // Try to update existing post
      response = await fetch(
        `https://api.hubapi.com/cms/v3/blogs/posts/${existingHubspotId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(blogPost),
        }
      )

      // If post was deleted in HubSpot (404), create a new one instead
      if (response.status === 404) {
        console.log(`HubSpot post ${existingHubspotId} not found, creating new post`)
        existingHubspotId = null // Clear so we report as "Created" not "Updated"
        response = await createNewPost()
      }
    } else {
      // Create new post
      response = await createNewPost()
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('HubSpot API error:', errorData)
      
      // Handle specific error cases
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'HubSpot access token expired. Please reconnect HubSpot in settings.' },
          { status: 401 }
        )
      }
      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Access denied. Make sure your HubSpot app has CMS Blog permissions.' },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: errorData.message || 'Failed to push to HubSpot' },
        { status: response.status }
      )
    }

    hubspotPost = await response.json()

    // If we want to publish immediately and it's not already published
    if (publish && hubspotPost.state !== 'PUBLISHED') {
      const publishResponse = await fetch(
        `https://api.hubapi.com/cms/v3/blogs/posts/${hubspotPost.id}/draft/push-live`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!publishResponse.ok) {
        console.error('Failed to publish HubSpot post:', await publishResponse.text())
        // Don't fail the whole request, just note it wasn't published
      } else {
        hubspotPost.state = 'PUBLISHED'
      }
    }

    // Store HubSpot post ID in memo's schema_json for future updates
    await supabase
      .from('memos')
      .update({
        schema_json: {
          ...memo.schema_json,
          hubspot_post_id: hubspotPost.id,
          hubspot_synced_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', memoId)

    return NextResponse.json({
      success: true,
      hubspotPostId: hubspotPost.id,
      state: hubspotPost.state,
      message: existingHubspotId 
        ? `Updated blog post in HubSpot (${hubspotPost.state})`
        : `Created new blog post in HubSpot (${hubspotPost.state})`,
    })
  } catch (error) {
    console.error('HubSpot sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
