import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string; memoId: string }> }
) {
  try {
    const { brandId, memoId } = await params
    const supabase = await createClient()

    // Verify user has access to this brand
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check brand ownership
    const { data: brand } = await supabase
      .from('brands')
      .select('id, tenant_id')
      .eq('id', brandId)
      .single()

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Get time period from query params (default 90 days)
    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '90', 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch traffic data for this memo
    const { data: traffic, error: trafficError } = await supabase
      .from('ai_traffic')
      .select('*')
      .eq('memo_id', memoId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false })
      .limit(500)

    if (trafficError) {
      console.error('Error fetching traffic:', trafficError)
      return NextResponse.json({ error: 'Failed to fetch traffic data' }, { status: 500 })
    }

    // Calculate stats
    const totalViews = traffic?.length || 0
    const aiViews = traffic?.filter(t => 
      !['organic', 'direct_nav', 'direct'].includes(t.referrer_source)
    ).length || 0
    const organicViews = traffic?.filter(t => 
      t.referrer_source === 'organic'
    ).length || 0

    // Group by source
    const bySource = (traffic || []).reduce((acc, t) => {
      acc[t.referrer_source] = (acc[t.referrer_source] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Group by date for trend chart (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const byDate = (traffic || [])
      .filter(t => new Date(t.timestamp) >= thirtyDaysAgo)
      .reduce((acc, t) => {
        const date = new Date(t.timestamp).toISOString().split('T')[0]
        if (!acc[date]) {
          acc[date] = { total: 0, ai: 0, organic: 0 }
        }
        acc[date].total++
        if (!['organic', 'direct_nav', 'direct'].includes(t.referrer_source)) {
          acc[date].ai++
        } else if (t.referrer_source === 'organic') {
          acc[date].organic++
        }
        return acc
      }, {} as Record<string, { total: number; ai: number; organic: number }>)

    // Get recent visits (last 10)
    const recentVisits = (traffic || []).slice(0, 10).map(t => ({
      id: t.id,
      source: t.referrer_source,
      referrer: t.referrer,
      country: t.country,
      city: t.city || null,
      region: t.region || null,
      timestamp: t.timestamp,
    }))

    // Get geographic breakdown
    const byCountry = (traffic || []).reduce((acc, t) => {
      const country = t.country || 'Unknown'
      acc[country] = (acc[country] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Fetch SEO stats from search console (if available)
    // Get the memo to find its URL pattern
    const { data: memo } = await supabase
      .from('memos')
      .select('slug')
      .eq('id', memoId)
      .single()

    const { data: brandData } = await supabase
      .from('brands')
      .select('subdomain')
      .eq('id', brandId)
      .single()

    let seoStats = null
    if (memo && brandData) {
      // Look for search console stats that match this memo's URL pattern
      const memoUrlPattern = `%${brandData.subdomain}%${memo.slug}%`
      
      const { data: searchStats } = await supabase
        .from('search_console_stats')
        .select('*')
        .eq('brand_id', brandId)
        .ilike('page_url', memoUrlPattern)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(100)

      if (searchStats && searchStats.length > 0) {
        // Aggregate stats
        const totalImpressions = searchStats.reduce((sum, s) => sum + s.impressions, 0)
        const totalClicks = searchStats.reduce((sum, s) => sum + s.clicks, 0)
        const avgPosition = searchStats.reduce((sum, s) => sum + (s.position || 0), 0) / searchStats.length

        // Top queries
        const queryMap = searchStats.reduce((acc, s) => {
          if (!acc[s.query]) {
            acc[s.query] = { impressions: 0, clicks: 0 }
          }
          acc[s.query].impressions += s.impressions
          acc[s.query].clicks += s.clicks
          return acc
        }, {} as Record<string, { impressions: number; clicks: number }>)

        const topQueries = (Object.entries(queryMap) as [string, { impressions: number; clicks: number }][])
          .map(([query, stats]) => ({ query, ...stats }))
          .sort((a, b) => b.impressions - a.impressions)
          .slice(0, 5)

        seoStats = {
          totalImpressions,
          totalClicks,
          avgPosition: Math.round(avgPosition * 10) / 10,
          ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 1000) / 10 : 0,
          topQueries,
          provider: searchStats[0]?.provider || 'unknown',
        }
      }
    }

    return NextResponse.json({
      summary: {
        totalViews,
        aiViews,
        organicViews,
        directViews: totalViews - aiViews - organicViews,
        aiPercentage: totalViews > 0 ? Math.round((aiViews / totalViews) * 100) : 0,
      },
      bySource,
      byDate,
      byCountry,
      recentVisits,
      seoStats,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Error in memo analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
