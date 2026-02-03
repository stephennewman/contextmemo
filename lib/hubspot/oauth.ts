/**
 * HubSpot OAuth Utilities
 * 
 * Handles token refresh and validation for HubSpot API calls.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const HUBSPOT_TOKEN_URL = 'https://api.hubapi.com/oauth/v1/token'

interface HubSpotTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

interface HubSpotConfig {
  enabled: boolean
  auto_sync: boolean
  access_token: string
  refresh_token: string
  expires_at: string
  connected_at: string
  connected_by: string
  available_blogs: Array<{ id: string; name: string; slug: string }>
  blog_id: string | null
}

/**
 * Get a valid HubSpot access token for a brand.
 * Automatically refreshes the token if expired or about to expire.
 * 
 * @param brandId - The brand ID
 * @returns The access token, or null if not configured/failed
 */
export async function getHubSpotToken(brandId: string): Promise<string | null> {
  // Get brand's HubSpot config
  const { data: brand, error } = await supabase
    .from('brands')
    .select('context')
    .eq('id', brandId)
    .single()

  if (error || !brand?.context?.hubspot) {
    return null
  }

  const hubspot = brand.context.hubspot as HubSpotConfig

  if (!hubspot.enabled || !hubspot.access_token) {
    return null
  }

  // Check if token is expired or about to expire (within 5 minutes)
  const expiresAt = new Date(hubspot.expires_at)
  const now = new Date()
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

  if (expiresAt > fiveMinutesFromNow) {
    // Token is still valid
    return hubspot.access_token
  }

  // Token needs refresh
  const refreshedToken = await refreshHubSpotToken(brandId, hubspot)
  return refreshedToken
}

/**
 * Refresh a HubSpot access token using the refresh token.
 * Updates the brand's stored tokens.
 */
async function refreshHubSpotToken(
  brandId: string,
  hubspot: HubSpotConfig
): Promise<string | null> {
  const clientId = process.env.HUBSPOT_CLIENT_ID
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET

  if (!clientId || !clientSecret || !hubspot.refresh_token) {
    console.error('Cannot refresh HubSpot token: missing credentials')
    return null
  }

  try {
    const response = await fetch(HUBSPOT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: hubspot.refresh_token,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('HubSpot token refresh failed:', errorData)
      
      // If refresh token is invalid, mark HubSpot as disconnected
      if (response.status === 400 || response.status === 401) {
        await markHubSpotDisconnected(brandId, 'Token refresh failed')
      }
      
      return null
    }

    const tokens: HubSpotTokenResponse = await response.json()
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Get existing brand context
    const { data: brand } = await supabase
      .from('brands')
      .select('context')
      .eq('id', brandId)
      .single()

    const existingContext = brand?.context || {}

    // Update stored tokens
    await supabase
      .from('brands')
      .update({
        context: {
          ...existingContext,
          hubspot: {
            ...hubspot,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: expiresAt,
            last_refreshed_at: new Date().toISOString(),
          },
        },
      })
      .eq('id', brandId)

    return tokens.access_token
  } catch (error) {
    console.error('HubSpot token refresh error:', error)
    return null
  }
}

/**
 * Mark HubSpot as disconnected due to auth failure.
 */
async function markHubSpotDisconnected(brandId: string, reason: string): Promise<void> {
  const { data: brand } = await supabase
    .from('brands')
    .select('context')
    .eq('id', brandId)
    .single()

  const existingContext = brand?.context || {}
  const hubspot = existingContext.hubspot || {}

  await supabase
    .from('brands')
    .update({
      context: {
        ...existingContext,
        hubspot: {
          ...hubspot,
          enabled: false,
          disconnected_at: new Date().toISOString(),
          disconnect_reason: reason,
        },
      },
    })
    .eq('id', brandId)

  // Log the disconnection
  await supabase.from('activity_log').insert({
    brand_id: brandId,
    action: 'hubspot_disconnected',
    details: { reason },
  })
}

/**
 * Disconnect HubSpot from a brand (user-initiated).
 */
export async function disconnectHubSpot(brandId: string, userId: string): Promise<boolean> {
  const { data: brand } = await supabase
    .from('brands')
    .select('context')
    .eq('id', brandId)
    .single()

  if (!brand) return false

  const existingContext = brand.context || {}

  // Remove sensitive tokens but keep record of previous connection
  await supabase
    .from('brands')
    .update({
      context: {
        ...existingContext,
        hubspot: {
          enabled: false,
          auto_sync: false,
          disconnected_at: new Date().toISOString(),
          disconnected_by: userId,
          // Keep blog info for potential reconnection
          available_blogs: existingContext.hubspot?.available_blogs || [],
          blog_id: existingContext.hubspot?.blog_id || null,
        },
      },
    })
    .eq('id', brandId)

  // Log the disconnection
  await supabase.from('activity_log').insert({
    brand_id: brandId,
    user_id: userId,
    action: 'hubspot_disconnected',
    details: { user_initiated: true },
  })

  return true
}

/**
 * Check if HubSpot is connected and healthy for a brand.
 */
export async function checkHubSpotConnection(brandId: string): Promise<{
  connected: boolean
  healthy: boolean
  blog_id: string | null
  error?: string
}> {
  const token = await getHubSpotToken(brandId)

  if (!token) {
    return { connected: false, healthy: false, blog_id: null, error: 'Not connected or token invalid' }
  }

  // Test the connection with a simple API call
  try {
    const response = await fetch('https://api.hubapi.com/cms/v3/blogs/posts?limit=1', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (response.ok) {
      // Get blog_id from brand config
      const { data: brand } = await supabase
        .from('brands')
        .select('context')
        .eq('id', brandId)
        .single()

      return {
        connected: true,
        healthy: true,
        blog_id: brand?.context?.hubspot?.blog_id || null,
      }
    }

    return {
      connected: true,
      healthy: false,
      blog_id: null,
      error: `API returned ${response.status}`,
    }
  } catch (error) {
    return {
      connected: true,
      healthy: false,
      blog_id: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
