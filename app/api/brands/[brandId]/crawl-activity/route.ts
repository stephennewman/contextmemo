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

    // Get brand subdomain for joining
    const { data: brand } = await supabase
      .from('brands')
      .select('id, name, subdomain')
      .eq('id', brandId)
      .single()

    if (!brand || !brand.subdomain) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const days = parseInt(url.searchParams.get('days') || '90', 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch all crawl events for this brand's subdomain
    const { data: crawlEvents, error } = await supabase
      .from('bot_crawl_events')
      .select('*')
      .eq('brand_subdomain', brand.subdomain)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(5000)

    if (error) {
      console.error('Crawl activity query error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const events = crawlEvents || []

    // Also fetch published memos for coverage calculation
    const { data: memos } = await supabase
      .from('memos')
      .select('id, slug, title, memo_type')
      .eq('brand_id', brandId)
      .eq('status', 'published')

    const publishedMemos = memos || []

    // --- Summary stats ---
    const totalCrawls = events.length
    const aiCrawls = events.filter(e =>
      ['ai_training', 'ai_search', 'ai_user_browse'].includes(e.bot_category)
    )

    // Crawls by bot
    const byBot = events.reduce((acc, e) => {
      if (!acc[e.bot_name]) {
        acc[e.bot_name] = {
          count: 0,
          displayName: e.bot_display_name,
          category: e.bot_category,
          provider: e.bot_provider,
          lastSeen: e.created_at,
        }
      }
      acc[e.bot_name].count++
      return acc
    }, {} as Record<string, { count: number; displayName: string; category: string; provider: string; lastSeen: string }>)

    // Crawls by category
    const byCategory = events.reduce((acc, e) => {
      acc[e.bot_category] = (acc[e.bot_category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // --- Per-memo last crawled ---
    const lastCrawledByMemo: Record<string, {
      botName: string
      botDisplayName: string
      botCategory: string
      timestamp: string
    }> = {}

    for (const event of events) {
      if (event.memo_slug && !lastCrawledByMemo[event.memo_slug]) {
        lastCrawledByMemo[event.memo_slug] = {
          botName: event.bot_name,
          botDisplayName: event.bot_display_name,
          botCategory: event.bot_category,
          timestamp: event.created_at,
        }
      }
    }

    // --- AI-specific per-memo last crawled (only AI bots) ---
    const lastAICrawlByMemo: Record<string, {
      botName: string
      botDisplayName: string
      botCategory: string
      timestamp: string
    }> = {}

    for (const event of events) {
      if (
        event.memo_slug &&
        ['ai_training', 'ai_search', 'ai_user_browse'].includes(event.bot_category) &&
        !lastAICrawlByMemo[event.memo_slug]
      ) {
        lastAICrawlByMemo[event.memo_slug] = {
          botName: event.bot_name,
          botDisplayName: event.bot_display_name,
          botCategory: event.bot_category,
          timestamp: event.created_at,
        }
      }
    }

    // --- Coverage ---
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const memosWithSlugs = publishedMemos.filter(m => m.slug)
    const crawledSlugs7d = new Set(
      events
        .filter(e =>
          e.memo_slug &&
          ['ai_training', 'ai_search', 'ai_user_browse'].includes(e.bot_category) &&
          new Date(e.created_at) >= sevenDaysAgo
        )
        .map(e => e.memo_slug)
    )
    const crawledSlugs30d = new Set(
      events
        .filter(e =>
          e.memo_slug &&
          ['ai_training', 'ai_search', 'ai_user_browse'].includes(e.bot_category) &&
          new Date(e.created_at) >= thirtyDaysAgo
        )
        .map(e => e.memo_slug)
    )

    const coverage7d = memosWithSlugs.filter(m => crawledSlugs7d.has(m.slug)).length
    const coverage30d = memosWithSlugs.filter(m => crawledSlugs30d.has(m.slug)).length

    // --- Timeline (crawls per day) ---
    const timeline = events.reduce((acc, e) => {
      const date = new Date(e.created_at).toISOString().split('T')[0]
      if (!acc[date]) acc[date] = { total: 0, ai: 0, search: 0, seo: 0 }
      acc[date].total++
      if (['ai_training', 'ai_search', 'ai_user_browse'].includes(e.bot_category)) {
        acc[date].ai++
      } else if (e.bot_category === 'search_engine') {
        acc[date].search++
      } else {
        acc[date].seo++
      }
      return acc
    }, {} as Record<string, { total: number; ai: number; search: number; seo: number }>)

    // --- Recent events (last 50) ---
    const recentEvents = events.slice(0, 50).map(e => ({
      id: e.id,
      botName: e.bot_name,
      botDisplayName: e.bot_display_name,
      botCategory: e.bot_category,
      botProvider: e.bot_provider,
      memoSlug: e.memo_slug,
      pagePath: e.page_path,
      ipCountry: e.ip_country,
      timestamp: e.created_at,
    }))

    return NextResponse.json({
      summary: {
        totalCrawls,
        aiCrawls: aiCrawls.length,
        byBot,
        byCategory,
        mostRecentCrawl: events[0]?.created_at || null,
        mostRecentAICrawl: aiCrawls[0]?.created_at || null,
      },
      coverage: {
        totalPublishedMemos: memosWithSlugs.length,
        crawled7d: coverage7d,
        crawled30d: coverage30d,
      },
      perMemo: {
        lastCrawled: lastCrawledByMemo,
        lastAICrawl: lastAICrawlByMemo,
      },
      timeline,
      recentEvents,
      period: { days, startDate: startDate.toISOString() },
    })
  } catch (error) {
    console.error('Error in crawl activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
