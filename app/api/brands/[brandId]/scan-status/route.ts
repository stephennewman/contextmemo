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
