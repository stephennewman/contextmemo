import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logSecurityEvent } from '@/lib/security/security-events'
import { z } from 'zod'

const uuidSchema = z.string().uuid('Invalid brandId format')

interface RouteParams {
  params: Promise<{ brandId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { brandId: rawBrandId } = await params
  const parsedBrandId = uuidSchema.safeParse(rawBrandId)

  if (!parsedBrandId.success) {
    return NextResponse.json({ error: 'Invalid brandId' }, { status: 400 })
  }
  const brandId = parsedBrandId.data
  const supabase = await createClient()
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.ip || 'unknown'


  // Verify user owns the brand
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    await logSecurityEvent({
      type: 'unauthorized',
      ip,
      path: request.nextUrl.pathname,
      details: { reason: 'user_not_authenticated' },
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('tenant_id')
    .eq('id', brandId)
    .single()

  if (brandError || !brand || brand.tenant_id !== user.id) {
    await logSecurityEvent({
      type: 'access_denied',
      ip,
      userId: user.id,
      path: request.nextUrl.pathname,
      details: { reason: 'brand_not_found_or_unauthorized', brandId },
    })
    return NextResponse.json(
      { error: 'Brand not found or unauthorized' },
      { status: 404 }
    )
  }
  
  // Get recent scan count (last 10 minutes)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  
  const { data: recentScanData } = await supabase
    .from('scan_results')
    .select('brand_mentioned, brand_in_citations')
    .eq('brand_id', brandId)
    .gte('scanned_at', tenMinutesAgo)

  const recentScans = recentScanData?.length || 0
  const mentionedCount = recentScanData?.filter(s => s.brand_mentioned === true).length || 0
  const citedCount = recentScanData?.filter(s => s.brand_in_citations === true).length || 0

  // Get total query count to estimate progress
  const { count: totalQueries } = await supabase
    .from('queries')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .eq('is_active', true)

  // Consider complete if we have recent scans and they match expected count
  // Only 1 model is enabled currently (GPT-4o-mini)
  const expectedScans = Math.min((totalQueries || 0), 30) * 1
  const isComplete = (recentScans || 0) >= expectedScans * 0.8 // 80% threshold

  return NextResponse.json({
    recentScans,
    mentionedCount,
    citedCount,
    totalQueries: totalQueries || 0,
    expectedScans,
    isComplete,
  })
}
