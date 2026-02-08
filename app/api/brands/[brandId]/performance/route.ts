import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params
    const supabase = await createClient()

    // Verify user has access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check brand ownership
    const { data: brand } = await supabase
      .from('brands')
      .select('id, name, subdomain, tenant_id')
      .eq('id', brandId)
      .single()

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '90', 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch all data in parallel
    const [
      { data: memos },
      { data: traffic },
    ] = await Promise.all([
      // All memos for this brand
      supabase
        .from('memos')
        .select('id, title, slug, status, memo_type, created_at, published_at, schema_json')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false }),
      // All tracked traffic for this brand
      supabase
        .from('ai_traffic')
        .select('id, memo_id, page_url, referrer, referrer_source, country, timestamp')
        .eq('brand_id', brandId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false })
        .limit(2000),
    ])

    // --- Content Output Stats ---
    const allMemos = memos || []
    const publishedMemos = allMemos.filter(m => m.status === 'published')
    const hubspotSynced = allMemos.filter(m => m.schema_json?.hubspot_post_id)
    const contextmemoOnly = publishedMemos.filter(m => !m.schema_json?.hubspot_post_id)

    // Content by type
    const byType = allMemos.reduce((acc, m) => {
      acc[m.memo_type] = (acc[m.memo_type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Content created over time (by week)
    const contentTimeline = allMemos.reduce((acc, m) => {
      const date = new Date(m.created_at)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const key = weekStart.toISOString().split('T')[0]
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // --- Traffic Stats ---
    const allTraffic = traffic || []
    const aiTraffic = allTraffic.filter(t =>
      !['organic', 'direct_nav', 'direct'].includes(t.referrer_source)
    )
    const organicTraffic = allTraffic.filter(t => t.referrer_source === 'organic')

    // Traffic by source
    const trafficBySource = allTraffic.reduce((acc, t) => {
      acc[t.referrer_source] = (acc[t.referrer_source] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Traffic by date (for chart)
    const trafficByDate = allTraffic.reduce((acc, t) => {
      const date = new Date(t.timestamp).toISOString().split('T')[0]
      if (!acc[date]) acc[date] = { total: 0, ai: 0, organic: 0 }
      acc[date].total++
      if (!['organic', 'direct_nav', 'direct'].includes(t.referrer_source)) {
        acc[date].ai++
      } else if (t.referrer_source === 'organic') {
        acc[date].organic++
      }
      return acc
    }, {} as Record<string, { total: number; ai: number; organic: number }>)

    // Traffic by country
    const trafficByCountry = allTraffic.reduce((acc, t) => {
      const country = t.country || 'Unknown'
      acc[country] = (acc[country] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Per-memo view counts
    const viewsByMemo = allTraffic.reduce((acc, t) => {
      if (t.memo_id) {
        if (!acc[t.memo_id]) acc[t.memo_id] = { total: 0, ai: 0, organic: 0 }
        acc[t.memo_id].total++
        if (!['organic', 'direct_nav', 'direct'].includes(t.referrer_source)) {
          acc[t.memo_id].ai++
        } else if (t.referrer_source === 'organic') {
          acc[t.memo_id].organic++
        }
      }
      return acc
    }, {} as Record<string, { total: number; ai: number; organic: number }>)

    // Build per-memo performance table
    const memoPerformance = publishedMemos.map(m => ({
      id: m.id,
      title: m.title,
      slug: m.slug,
      type: m.memo_type,
      createdAt: m.created_at,
      publishedAt: m.published_at,
      onHubSpot: !!m.schema_json?.hubspot_post_id,
      views: viewsByMemo[m.id] || { total: 0, ai: 0, organic: 0 },
    })).sort((a, b) => b.views.total - a.views.total)

    // Recent traffic (last 20 events)
    const recentTraffic = allTraffic.slice(0, 20).map(t => ({
      id: t.id,
      memoId: t.memo_id,
      pageUrl: t.page_url,
      source: t.referrer_source,
      referrer: t.referrer,
      country: t.country,
      timestamp: t.timestamp,
    }))

    return NextResponse.json({
      content: {
        total: allMemos.length,
        published: publishedMemos.length,
        drafts: allMemos.length - publishedMemos.length,
        hubspotSynced: hubspotSynced.length,
        contextmemoOnly: contextmemoOnly.length,
        byType,
        timeline: contentTimeline,
      },
      traffic: {
        total: allTraffic.length,
        ai: aiTraffic.length,
        organic: organicTraffic.length,
        aiPercentage: allTraffic.length > 0 ? Math.round((aiTraffic.length / allTraffic.length) * 100) : 0,
        bySource: trafficBySource,
        byDate: trafficByDate,
        byCountry: trafficByCountry,
      },
      memoPerformance,
      recentTraffic,
      period: { days, startDate: startDate.toISOString() },
    })
  } catch (error) {
    console.error('Error in brand performance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
