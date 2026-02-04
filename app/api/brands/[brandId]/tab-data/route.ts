import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params
  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab')

  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify user has access to this brand
  const { data: brand } = await supabase
    .from('brands')
    .select('id, name')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  // Load data based on tab
  switch (tab) {
    case 'scans':
    case 'prompts': {
      const [scansResult, queriesResult] = await Promise.all([
        supabase
          .from('scan_results')
          .select('*')
          .eq('brand_id', brandId)
          .gte('scanned_at', ninetyDaysAgo.toISOString())
          .order('scanned_at', { ascending: true }),
        supabase
          .from('queries')
          .select('*')
          .eq('brand_id', brandId)
          .eq('is_active', true)
          .order('priority', { ascending: false })
      ])
      return NextResponse.json({
        scans: scansResult.data || [],
        queries: queriesResult.data || []
      })
    }

    case 'memos': {
      const [memosResult, scansResult, queriesResult] = await Promise.all([
        supabase
          .from('memos')
          .select('*')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false }),
        supabase
          .from('scan_results')
          .select('query_id, brand_mentioned')
          .eq('brand_id', brandId)
          .gte('scanned_at', ninetyDaysAgo.toISOString()),
        supabase
          .from('queries')
          .select('id, query_text, query_type')
          .eq('brand_id', brandId)
          .eq('is_active', true)
      ])

      // Calculate low visibility queries
      const brandNameLower = brand.name.toLowerCase()
      const queryVisibility = new Map<string, { mentioned: number; total: number }>()
      
      ;(scansResult.data || []).forEach(scan => {
        if (!scan.query_id) return
        const current = queryVisibility.get(scan.query_id) || { mentioned: 0, total: 0 }
        current.total++
        if (scan.brand_mentioned) current.mentioned++
        queryVisibility.set(scan.query_id, current)
      })

      const lowVisibilityQueries = (queriesResult.data || [])
        .filter(q => !q.query_text.toLowerCase().includes(brandNameLower))
        .map(q => {
          const stats = queryVisibility.get(q.id)
          const visibility = stats && stats.total > 0 
            ? Math.round((stats.mentioned / stats.total) * 100) 
            : 0
          return {
            id: q.id,
            query_text: q.query_text,
            query_type: q.query_type,
            visibility,
            hasScans: stats ? stats.total > 0 : false,
          }
        })
        .filter(q => q.hasScans && q.visibility < 30)
        .sort((a, b) => a.visibility - b.visibility)
        .slice(0, 10)

      return NextResponse.json({
        memos: memosResult.data || [],
        lowVisibilityQueries
      })
    }

    case 'competitors': {
      const { data: competitors } = await supabase
        .from('competitors')
        .select('id')
        .eq('brand_id', brandId)
        .eq('is_active', true)

      const competitorIds = (competitors || []).map(c => c.id)

      const [scansResult, queriesResult, contentResult, feedsResult] = await Promise.all([
        supabase
          .from('scan_results')
          .select('*')
          .eq('brand_id', brandId)
          .gte('scanned_at', ninetyDaysAgo.toISOString())
          .order('scanned_at', { ascending: true }),
        supabase
          .from('queries')
          .select('*')
          .eq('brand_id', brandId)
          .eq('is_active', true)
          .order('priority', { ascending: false }),
        competitorIds.length > 0
          ? supabase
              .from('competitor_content')
              .select('*, response_memo:response_memo_id(id, title, slug, status)')
              .in('competitor_id', competitorIds)
              .order('first_seen_at', { ascending: false })
              .limit(50)
          : Promise.resolve({ data: [] }),
        competitorIds.length > 0
          ? supabase
              .from('competitor_feeds')
              .select('*')
              .in('competitor_id', competitorIds)
              .eq('is_active', true)
              .order('discovered_at', { ascending: false })
          : Promise.resolve({ data: [] })
      ])

      return NextResponse.json({
        scans: scansResult.data || [],
        queries: queriesResult.data || [],
        competitorContent: contentResult.data || [],
        competitorFeeds: feedsResult.data || []
      })
    }

    case 'search': {
      const [searchResult, queriesResult] = await Promise.all([
        supabase
          .from('search_console_stats')
          .select('*')
          .eq('brand_id', brandId)
          .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: false }),
        supabase
          .from('queries')
          .select('*')
          .eq('brand_id', brandId)
          .eq('is_active', true)
      ])

      return NextResponse.json({
        searchConsoleStats: searchResult.data || [],
        queries: queriesResult.data || []
      })
    }

    case 'traffic': {
      const { data: aiTraffic } = await supabase
        .from('ai_traffic')
        .select('*, memo:memo_id(title, slug)')
        .eq('brand_id', brandId)
        .gte('timestamp', ninetyDaysAgo.toISOString())
        .order('timestamp', { ascending: false })
        .limit(500)

      return NextResponse.json({
        aiTraffic: aiTraffic || []
      })
    }

    case 'intelligence': {
      const [attributionResult, promptIntelResult, modelInsightsResult] = await Promise.all([
        supabase
          .from('attribution_events')
          .select('*')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('prompt_intelligence')
          .select('*')
          .eq('brand_id', brandId)
          .order('opportunity_score', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('alerts')
          .select('data')
          .eq('brand_id', brandId)
          .eq('alert_type', 'model_insights')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      ])

      return NextResponse.json({
        attributionEvents: attributionResult.data || [],
        promptIntelligence: promptIntelResult.data || [],
        modelInsights: modelInsightsResult.data?.data || null
      })
    }

    case 'alerts': {
      const { data: alerts } = await supabase
        .from('alerts')
        .select('*')
        .eq('brand_id', brandId)
        .order('created_at', { ascending: false })
        .limit(100)

      return NextResponse.json({
        alerts: alerts || []
      })
    }

    default:
      return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })
  }
}
