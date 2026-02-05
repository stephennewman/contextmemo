import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { marked } from 'marked'
import { BrandContext, HubSpotConfig } from '@/lib/supabase/types'
import { getHubSpotToken } from '@/lib/hubspot/oauth'
import { sanitizeContentForHubspot, formatHtmlForHubspot } from '@/lib/hubspot/content-sanitizer'
import { selectImageForMemo } from '@/lib/hubspot/image-selector'

/**
 * Upload an image from URL to HubSpot's file manager
 * HubSpot requires images to be hosted on their platform (hubfs/)
 * 
 * Note: Requires 'files' OAuth scope. If images aren't uploading,
 * user may need to reconnect HubSpot to grant the new permission.
 */
async function uploadImageToHubSpot(
  imageUrl: string, 
  fileName: string, 
  accessToken: string
): Promise<string | null> {
  try {
    console.log('Uploading image to HubSpot:', { imageUrl: imageUrl.slice(0, 100), fileName })
    
    // Fetch the image from Unsplash
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      console.error('Failed to fetch image from Unsplash:', {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        url: imageUrl.slice(0, 100)
      })
      return null
    }
    
    const imageBuffer = await imageResponse.arrayBuffer()
    console.log('Image fetched successfully, size:', imageBuffer.byteLength, 'bytes')
    
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' })
    
    // Create form data for HubSpot upload
    const formData = new FormData()
    formData.append('file', blob, `${fileName}.jpg`)
    formData.append('options', JSON.stringify({
      access: 'PUBLIC_INDEXABLE',
      overwrite: false
    }))
    formData.append('folderPath', '/contextmemo-featured-images')
    
    // Upload to HubSpot
    const uploadResponse = await fetch('https://api.hubapi.com/files/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    })
    
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}))
      console.error('HubSpot file upload error:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorData,
        message: errorData.message,
        // Check if this is a permission error
        hint: uploadResponse.status === 403 
          ? 'Missing files scope - user may need to reconnect HubSpot' 
          : undefined
      })
      return null
    }
    
    const uploadResult = await uploadResponse.json()
    console.log('Image uploaded to HubSpot successfully:', uploadResult.url)
    return uploadResult.url
  } catch (error) {
    console.error('Error uploading image to HubSpot:', error)
    return null
  }
}

// Service role client for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Create authenticated client to get current user
async function getAuthClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

interface HubSpotBlogPost {
  name: string
  htmlTitle?: string
  contentGroupId: string
  postBody: string
  postSummary?: string
  metaDescription?: string
  slug?: string
  state: 'DRAFT' | 'PUBLISHED'
  blogAuthorId?: string  // HubSpot author ID - required for author to display on posts
  // Featured image
  featuredImage?: string
  featuredImageAltText?: string
  useFeaturedImage?: boolean
  // Publish date
  publishDate?: string
}

interface HubSpotAuthor {
  id: string
  name: string
  displayName?: string
  email?: string
}

/**
 * Get or create a HubSpot blog author
 * Returns the HubSpot author ID for use in blog posts
 */
async function getOrCreateHubSpotAuthor(
  userName: string,
  userEmail: string | undefined,
  accessToken: string
): Promise<string | null> {
  try {
    // First, search for existing author by name
    const searchParams = new URLSearchParams({
      limit: '100',
    })
    
    const listResponse = await fetch(
      `https://api.hubapi.com/cms/v3/blogs/authors?${searchParams}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (listResponse.ok) {
      const data = await listResponse.json()
      const authors: HubSpotAuthor[] = data.results || []
      
      // Try to find existing author by name (case-insensitive) or email
      const existingAuthor = authors.find((author: HubSpotAuthor) => 
        author.name?.toLowerCase() === userName.toLowerCase() ||
        author.displayName?.toLowerCase() === userName.toLowerCase() ||
        (userEmail && author.email?.toLowerCase() === userEmail.toLowerCase())
      )
      
      if (existingAuthor) {
        console.log(`Found existing HubSpot author: ${existingAuthor.name} (${existingAuthor.id})`)
        return existingAuthor.id
      }
    }

    // Author doesn't exist, create a new one
    const createResponse = await fetch('https://api.hubapi.com/cms/v3/blogs/authors', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: userName,
        displayName: userName,
        email: userEmail || undefined,
      }),
    })

    if (createResponse.ok) {
      const newAuthor = await createResponse.json()
      console.log(`Created new HubSpot author: ${newAuthor.name} (${newAuthor.id})`)
      return newAuthor.id
    } else {
      const errorData = await createResponse.json().catch(() => ({}))
      console.error('Failed to create HubSpot author:', errorData)
      
      // If creation fails (e.g., duplicate), try to get authors again and find by name
      if (createResponse.status === 409 || errorData.message?.includes('duplicate')) {
        const retryList = await fetch(
          `https://api.hubapi.com/cms/v3/blogs/authors?limit=100`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        )
        if (retryList.ok) {
          const retryData = await retryList.json()
          const found = retryData.results?.find((a: HubSpotAuthor) => 
            a.name?.toLowerCase() === userName.toLowerCase()
          )
          if (found) return found.id
        }
      }
      
      return null
    }
  } catch (error) {
    console.error('Error getting/creating HubSpot author:', error)
    return null
  }
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

    // Get authenticated user
    const supabase = await getAuthClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's name from tenants table
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('name, email')
      .eq('id', user.id)
      .single()
    
    // Use the user's name, or parse a nice name from email
    // e.g., stephen.newman@checkit.net -> "Stephen Newman"
    const parseNameFromEmail = (email: string): string => {
      const prefix = email.split('@')[0] // stephen.newman
      return prefix
        .split(/[._-]/) // Split on dots, underscores, hyphens
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()) // Capitalize each part
        .join(' ') // "Stephen Newman"
    }
    
    const userName = tenant?.name || parseNameFromEmail(user.email || '') || 'Unknown User'

    // Get brand with HubSpot config
    const { data: brand, error: brandError } = await supabaseAdmin
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
    const { data: memo, error: memoError } = await supabaseAdmin
      .from('memos')
      .select('*')
      .eq('id', memoId)
      .eq('brand_id', brandId)
      .single()

    if (memoError || !memo) {
      return NextResponse.json({ error: 'Memo not found' }, { status: 404 })
    }

    // Sanitize content to remove any Contextmemo references and the title, then convert to HTML
    const sanitizedMarkdown = sanitizeContentForHubspot(memo.content_markdown, { 
      brandName: brand.name,
      title: memo.title, // Remove title from body - HubSpot displays it separately
    })
    const rawHtml = await marked(sanitizedMarkdown, {
      gfm: true,
      breaks: true,
    })
    // Apply HubSpot-specific formatting (inline styles for spacing, tables, etc.)
    const htmlContent = formatHtmlForHubspot(rawHtml)

    // Select a featured image based on the memo content
    const selectedImage = selectImageForMemo(memo.title, memo.content_markdown, memo.memo_type)
    
    // Upload image to HubSpot's file manager (required - HubSpot doesn't accept external URLs)
    const slugForImage = memo.slug.replace(/\//g, '-').slice(0, 50)
    const hubspotImageUrl = await uploadImageToHubSpot(
      selectedImage.url,
      `featured-${slugForImage}-${Date.now()}`,
      accessToken
    )
    
    // Create a summary from the first paragraph for HubSpot blog listing
    const contentParagraphs = sanitizedMarkdown.split('\n\n')
    const firstParagraph = contentParagraphs.find((p: string) => p.trim() && !p.startsWith('#') && !p.startsWith('*Last'))
    const postSummary = firstParagraph
      ? firstParagraph.replace(/[*_`#]/g, '').trim().slice(0, 300) + (firstParagraph.length > 300 ? '...' : '')
      : memo.meta_description || ''

    // Get or create the HubSpot author for this user
    const hubspotAuthorId = await getOrCreateHubSpotAuthor(
      userName,
      tenant?.email || user.email,
      accessToken
    )
    
    if (!hubspotAuthorId) {
      console.warn(`Could not get/create HubSpot author for ${userName}, proceeding without author`)
    }

    // Prepare HubSpot blog post payload
    const blogPost: HubSpotBlogPost = {
      name: memo.title,
      htmlTitle: `${memo.title} | ${brand.name}`,
      contentGroupId: hubspotConfig.blog_id,
      postBody: htmlContent,
      postSummary: postSummary,
      metaDescription: memo.meta_description || undefined,
      slug: memo.slug.replace(/\//g, '-'), // HubSpot doesn't allow slashes in slugs
      state: publish ? 'PUBLISHED' : 'DRAFT',
      // Use blogAuthorId to properly link to HubSpot author profile
      ...(hubspotAuthorId ? { blogAuthorId: hubspotAuthorId } : {}),
      // Featured image - must be hosted on HubSpot (uploaded from Unsplash)
      ...(hubspotImageUrl ? {
        featuredImage: hubspotImageUrl,
        featuredImageAltText: selectedImage.alt,
        useFeaturedImage: true,
      } : {
        useFeaturedImage: false, // Fallback if image upload failed
      }),
      // Publish date
      publishDate: new Date().toISOString(),
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

    // Store HubSpot post ID and author info in memo's schema_json for future updates
    await supabaseAdmin
      .from('memos')
      .update({
        schema_json: {
          ...memo.schema_json,
          hubspot_post_id: hubspotPost.id,
          hubspot_author_id: hubspotAuthorId,
          hubspot_synced_at: new Date().toISOString(),
          hubspot_synced_by: userName,
          hubspot_synced_by_user_id: user.id,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', memoId)

    // Log the HubSpot sync activity with user attribution
    await supabaseAdmin.from('activity_log').insert({
      brand_id: brandId,
      user_id: user.id,
      action: existingHubspotId ? 'hubspot_content_updated' : 'hubspot_content_created',
      details: {
        memo_id: memoId,
        memo_title: memo.title,
        hubspot_post_id: hubspotPost.id,
        hubspot_author_id: hubspotAuthorId,
        state: hubspotPost.state,
        synced_by: userName,
      },
    })

    return NextResponse.json({
      success: true,
      hubspotPostId: hubspotPost.id,
      hubspotAuthorId: hubspotAuthorId,
      state: hubspotPost.state,
      syncedBy: userName,
      message: existingHubspotId 
        ? `Updated blog post in HubSpot by ${userName} (${hubspotPost.state})`
        : `Created new blog post in HubSpot by ${userName} (${hubspotPost.state})`,
    })
  } catch (error) {
    console.error('HubSpot sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
