import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ brandId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params
  const supabase = await createClient()
  
  // Get recent scan count (last 10 minutes)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  
  const { count: recentScans } = await supabase
    .from('scan_results')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .gte('scanned_at', tenMinutesAgo)

  // Get total query count to estimate progress
  const { count: totalQueries } = await supabase
    .from('queries')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .eq('is_active', true)

  // Consider complete if we have recent scans and they match expected count
  // (30 queries * 3 models = 90 scans expected max)
  const expectedScans = Math.min((totalQueries || 0), 30) * 3
  const isComplete = (recentScans || 0) >= expectedScans * 0.8 // 80% threshold

  return NextResponse.json({
    recentScans: recentScans || 0,
    totalQueries: totalQueries || 0,
    expectedScans,
    isComplete,
  })
}
