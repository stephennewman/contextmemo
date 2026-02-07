/**
 * HubSpot OAuth Callback
 * 
 * Handles the OAuth callback from HubSpot:
 * 1. Exchanges auth code for access/refresh tokens
 * 2. Fetches available blogs
 * 3. Stores tokens in brand context
 * 4. Redirects back to brand settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const HUBSPOT_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token'

// Use service role for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface HubSpotTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

interface HubSpotBlog {
  id: string
  name: string
  slug: string
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('HubSpot OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/dashboard?error=hubspot_oauth_failed&message=${encodeURIComponent(errorDescription || error)}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard?error=missing_oauth_params', request.url)
    )
  }

  // Decode state to get brandId
  let brandId: string
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
    brandId = decoded.brandId
    userId = decoded.userId
  } catch {
    return NextResponse.redirect(
      new URL('/dashboard?error=invalid_state', request.url)
    )
  }

  // Exchange code for tokens
  const clientId = process.env.HUBSPOT_CLIENT_ID
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      new URL('/dashboard?error=hubspot_not_configured', request.url)
    )
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch(HUBSPOT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('HubSpot token exchange failed:', errorData)
      return NextResponse.redirect(
        new URL(`/dashboard?error=token_exchange_failed&message=${encodeURIComponent(errorData.message || 'Unknown error')}`, request.url)
      )
    }

    const tokens: HubSpotTokenResponse = await tokenResponse.json()

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Fetch available blogs
    const blogsResponse = await fetch('https://api.hubapi.com/cms/v3/blogs/posts?limit=1', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })

    let blogs: HubSpotBlog[] = []
    if (blogsResponse.ok) {
      // Fetch blog groups (content groups)
      const blogGroupsResponse = await fetch('https://api.hubapi.com/content/api/v2/blogs', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      })
      
      if (blogGroupsResponse.ok) {
        const blogGroupsData = await blogGroupsResponse.json()
        blogs = (blogGroupsData.objects || []).map((blog: { id: string; name: string; slug: string }) => ({
          id: blog.id,
          name: blog.name,
          slug: blog.slug,
        }))
      }
    }

    // Get existing brand context
    const { data: brand } = await supabase
      .from('brands')
      .select('context')
      .eq('id', brandId)
      .single()

    const existingContext = brand?.context || {}

    // Update brand with HubSpot OAuth tokens
    const hubspotConfig = {
      enabled: true,
      auto_sync: false, // User can enable this later
      auto_publish: false, // User can enable this later - publishes immediately vs drafts
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      connected_at: new Date().toISOString(),
      connected_by: userId,
      available_blogs: blogs,
      blog_id: blogs.length === 1 ? blogs[0].id : null, // Auto-select if only one blog
    }

    const { error: updateError } = await supabase
      .from('brands')
      .update({
        context: {
          ...existingContext,
          hubspot: hubspotConfig,
        },
      })
      .eq('id', brandId)

    if (updateError) {
      console.error('Failed to save HubSpot config:', updateError)
      return NextResponse.redirect(
        new URL('/dashboard?error=save_failed', request.url)
      )
    }

    // Log the connection
    await supabase.from('activity_log').insert({
      brand_id: brandId,
      user_id: userId,
      action: 'hubspot_connected',
      details: {
        blogs_found: blogs.length,
        blog_names: blogs.map(b => b.name),
      },
    })

    // Redirect back to brand settings with success
    return NextResponse.redirect(
      new URL(`/brands/${brandId}/settings?success=hubspot_connected`, request.url)
    )

  } catch (error) {
    console.error('HubSpot OAuth error:', error)
    return NextResponse.redirect(
      new URL('/dashboard?error=oauth_failed', request.url)
    )
  }
}
