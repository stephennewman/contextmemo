import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BrandContext } from '@/lib/supabase/types'

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? 'https://contextmemo.com/api/auth/google-search-console/callback'
  : 'http://localhost:3000/api/auth/google-search-console/callback'

// Use service role for updating brand context
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const error = request.nextUrl.searchParams.get('error')

  // Handle errors from Google
  if (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(new URL('/dashboard?error=google_auth_failed', request.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/dashboard?error=missing_params', request.url))
  }

  // Decode state to get brandId
  let brandId: string
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
    brandId = decoded.brandId
    userId = decoded.userId
  } catch {
    return NextResponse.redirect(new URL('/dashboard?error=invalid_state', request.url))
  }

  // Exchange code for tokens
  let tokens: TokenResponse
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Token exchange failed:', errorData)
      return NextResponse.redirect(new URL('/dashboard?error=token_exchange_failed', request.url))
    }

    tokens = await tokenResponse.json()
  } catch (err) {
    console.error('Token exchange error:', err)
    return NextResponse.redirect(new URL('/dashboard?error=token_exchange_error', request.url))
  }

  // Get the brand and update its context
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single()

  if (brandError || !brand) {
    return NextResponse.redirect(new URL('/dashboard?error=brand_not_found', request.url))
  }

  // Update brand context with Google tokens
  const context = (brand.context || {}) as BrandContext
  const updatedContext: BrandContext = {
    ...context,
    search_console: {
      ...context.search_console,
      google: {
        enabled: true,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        connected_at: new Date().toISOString(),
      },
    },
  }

  const { error: updateError } = await supabase
    .from('brands')
    .update({ 
      context: updatedContext,
      updated_at: new Date().toISOString(),
    })
    .eq('id', brandId)

  if (updateError) {
    console.error('Failed to update brand:', updateError)
    return NextResponse.redirect(new URL('/dashboard?error=update_failed', request.url))
  }

  // Redirect back to brand settings with success
  return NextResponse.redirect(new URL(`/brands/${brandId}/settings?google_connected=true`, request.url))
}
