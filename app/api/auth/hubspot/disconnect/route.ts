/**
 * HubSpot Disconnect
 * 
 * Disconnect HubSpot from a brand.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { disconnectHubSpot } from '@/lib/hubspot/oauth'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { brandId } = body

  if (!brandId) {
    return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
  }

  // Verify user is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify brand ownership
  const { data: brand } = await supabase
    .from('brands')
    .select('id, organization_id')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  // Check user has access
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', brand.organization_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const success = await disconnectHubSpot(brandId, user.id)

  if (success) {
    return NextResponse.json({ success: true, message: 'HubSpot disconnected' })
  }

  return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
}
