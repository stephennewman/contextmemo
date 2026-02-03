/**
 * HubSpot OAuth Authorization
 * 
 * Redirects users to HubSpot's OAuth consent screen.
 * After consent, HubSpot redirects back to /api/auth/hubspot/callback
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const HUBSPOT_AUTH_URL = 'https://app.hubspot.com/oauth/authorize'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const brandId = searchParams.get('brandId')

  if (!brandId) {
    return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
  }

  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Use service role to bypass RLS for brand lookup
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify brand exists
  const { data: brand, error: brandError } = await serviceClient
    .from('brands')
    .select('id, organization_id, user_id')
    .eq('id', brandId)
    .single()

  if (brandError) {
    console.error('Brand lookup error:', brandError)
  }

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  // Check user has access to this brand
  // Either: direct owner (user_id matches) or organization member
  let hasAccess = false

  // Check direct ownership
  if (brand.user_id === user.id) {
    hasAccess = true
  }

  // Check organization membership if brand has an organization
  if (!hasAccess && brand.organization_id) {
    const { data: membership } = await serviceClient
      .from('organization_members')
      .select('role')
      .eq('organization_id', brand.organization_id)
      .eq('user_id', user.id)
      .single()

    if (membership) {
      hasAccess = true
    }
  }

  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Build HubSpot OAuth URL
  const clientId = process.env.HUBSPOT_CLIENT_ID
  const redirectUri = process.env.HUBSPOT_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'HubSpot OAuth not configured' }, { status: 500 })
  }

  // State parameter includes brandId for callback
  const state = Buffer.from(JSON.stringify({ brandId, userId: user.id })).toString('base64')

  const scopes = ['oauth', 'content']

  const authUrl = new URL(HUBSPOT_AUTH_URL)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scopes.join(' '))
  authUrl.searchParams.set('state', state)

  console.log('HubSpot OAuth URL:', authUrl.toString())

  return NextResponse.redirect(authUrl.toString())
}
