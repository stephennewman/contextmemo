/**
 * HubSpot Connection Status
 * 
 * Check if HubSpot is connected and healthy for a brand.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkHubSpotConnection } from '@/lib/hubspot/oauth'

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = await checkHubSpotConnection(brandId)

  return NextResponse.json(status)
}
