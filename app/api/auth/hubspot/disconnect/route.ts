/**
 * HubSpot Disconnect
 * 
 * Disconnect HubSpot from a brand.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { disconnectHubSpot } from '@/lib/hubspot/oauth'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const { brandId } = (body || {}) as { brandId?: string }

  if (!brandId) {
    return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(brandId)) {
    return NextResponse.json({ error: 'Invalid brandId format' }, { status: 400 })
  }

  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use service role to bypass RLS for brand lookup
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify brand exists
  const { data: brand, error: brandError } = await serviceClient
    .from('brands')
    .select('id, tenant_id, organization_id')
    .eq('id', brandId)
    .single()
  
  if (brandError) {
    console.error('Brand lookup error:', brandError)
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  // Check user has access - tenant owner or org member
  let hasAccess = false

  // Check tenant ownership
  if (brand.tenant_id === user.id) {
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

  const success = await disconnectHubSpot(brandId, user.id)

  if (success) {
    return NextResponse.json({ success: true, message: 'HubSpot disconnected' })
  }

  return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
}
// Deploy trigger Tue Feb  3 12:39:10 EST 2026
