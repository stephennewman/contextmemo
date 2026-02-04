import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ brandId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params
  const supabase = await createClient()
  
  // Get competitors for this brand
  const { data: competitors } = await supabase
    .from('competitors')
    .select('id')
    .eq('brand_id', brandId)
    .eq('is_active', true)

  const competitorIds = (competitors || []).map(c => c.id)

  if (competitorIds.length === 0) {
    return NextResponse.json({
      articlesScanned: 0,
      gapsFound: 0,
      memosGenerating: 0,
      memosQueued: 0,
      isComplete: true,
    })
  }

  // Get content scanned in the last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()

  // Count articles scanned recently
  const { count: articlesScanned } = await supabase
    .from('competitor_content')
    .select('*', { count: 'exact', head: true })
    .in('competitor_id', competitorIds)
    .gte('first_seen_at', tenMinutesAgo)

  // Count content gaps found (pending_response status)
  const { count: gapsFound } = await supabase
    .from('competitor_content')
    .select('*', { count: 'exact', head: true })
    .in('competitor_id', competitorIds)
    .in('status', ['pending_response', 'responded'])
    .gte('first_seen_at', tenMinutesAgo)

  // Count memos being generated
  const { count: memosGenerating } = await supabase
    .from('competitor_content')
    .select('*', { count: 'exact', head: true })
    .in('competitor_id', competitorIds)
    .eq('status', 'pending_response')

  // Count memos queued/completed
  const { count: memosQueued } = await supabase
    .from('competitor_content')
    .select('*', { count: 'exact', head: true })
    .in('competitor_id', competitorIds)
    .in('status', ['pending_response', 'responded'])
    .gte('first_seen_at', tenMinutesAgo)

  // Consider complete if no pending items and we have some results
  const isComplete = (memosGenerating || 0) === 0 && ((articlesScanned || 0) > 0 || Date.now() - new Date(tenMinutesAgo).getTime() > 30000)

  return NextResponse.json({
    articlesScanned: articlesScanned || 0,
    gapsFound: gapsFound || 0,
    memosGenerating: memosGenerating || 0,
    memosQueued: memosQueued || 0,
    isComplete,
  })
}
