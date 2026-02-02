import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ActivityType } from '@/lib/supabase/types'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const activityType = searchParams.get('activity_type') as ActivityType
  const brandId = searchParams.get('brand_id')
  const createdAt = searchParams.get('created_at')

  if (!activityType || !brandId) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  // Verify user owns this brand
  const { data: brand } = await supabase
    .from('brands')
    .select('id, tenant_id')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  try {
    const result: {
      queries?: Array<{ id: string; query_text: string; persona: string | null; query_type: string }>
      scans?: Array<{ model: string; brand_mentioned: boolean; query_text: string }>
      gaps?: Array<{ 
        id: string
        query_text: string
        query_type: string
        persona: string | null
        mention_rate: number
        models_checked: number
        has_memo: boolean
      }>
      memo?: { title: string; content_markdown: string; slug: string }
      competitors?: Array<{ name: string; domain: string | null }>
      content?: Array<{ title: string; url: string; competitor_name: string }>
    } = {}

    // Fetch data based on activity type
    switch (activityType) {
      case 'query_generated': {
        // Get queries generated around the activity time
        const timeWindow = createdAt 
          ? new Date(new Date(createdAt).getTime() - 60 * 60 * 1000).toISOString() // 1 hour before
          : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // last 24 hours

        const { data: queries } = await supabase
          .from('queries')
          .select('id, query_text, persona, query_type')
          .eq('brand_id', brandId)
          .eq('auto_discovered', true)
          .gte('created_at', timeWindow)
          .order('created_at', { ascending: false })
          .limit(100)

        result.queries = queries || []
        break
      }

      case 'scan_completed': {
        // Get recent scan results with query details
        const timeWindow = createdAt 
          ? new Date(new Date(createdAt).getTime() - 60 * 60 * 1000).toISOString()
          : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

        const { data: scans } = await supabase
          .from('scan_results')
          .select(`
            query_id,
            model,
            brand_mentioned,
            query:query_id(id, query_text, query_type, persona, is_active)
          `)
          .eq('brand_id', brandId)
          .gte('scanned_at', timeWindow)
          .order('scanned_at', { ascending: false })

        if (scans && scans.length > 0) {
          // Group by query to find gaps (queries where brand wasn't mentioned)
          const queryStats = new Map<string, {
            id: string
            query_text: string
            query_type: string
            persona: string | null
            mentions: number
            total: number
          }>()

          for (const scan of scans) {
            const query = scan.query as unknown as { 
              id: string
              query_text: string
              query_type: string
              persona: string | null
              is_active: boolean
            } | null
            
            if (!query || !query.is_active) continue

            const existing = queryStats.get(query.id)
            if (existing) {
              existing.total++
              if (scan.brand_mentioned) existing.mentions++
            } else {
              queryStats.set(query.id, {
                id: query.id,
                query_text: query.query_text,
                query_type: query.query_type || 'general',
                persona: query.persona,
                mentions: scan.brand_mentioned ? 1 : 0,
                total: 1,
              })
            }
          }

          // Get memos to check which queries have memos
          const { data: memos } = await supabase
            .from('memos')
            .select('source_query_id')
            .eq('brand_id', brandId)
            .not('source_query_id', 'is', null)

          const queryIdsWithMemos = new Set((memos || []).map(m => m.source_query_id))

          // Convert to gaps array - only queries with <50% mention rate
          const gaps = Array.from(queryStats.values())
            .filter(q => (q.mentions / q.total) < 0.5) // Less than 50% mention rate = gap
            .map(q => ({
              id: q.id,
              query_text: q.query_text,
              query_type: q.query_type,
              persona: q.persona,
              mention_rate: Math.round((q.mentions / q.total) * 100),
              models_checked: q.total,
              has_memo: queryIdsWithMemos.has(q.id),
            }))
            .sort((a, b) => a.mention_rate - b.mention_rate) // Worst first

          result.gaps = gaps

          // Also include summary scans
          result.scans = (scans || []).slice(0, 20).map(s => ({
            model: s.model,
            brand_mentioned: s.brand_mentioned,
            query_text: (s.query as unknown as { query_text: string } | null)?.query_text || 'Unknown query',
          }))
        }
        break
      }

      case 'memo_generated':
      case 'memo_published': {
        // Get the memo
        const timeWindow = createdAt 
          ? new Date(new Date(createdAt).getTime() - 5 * 60 * 1000).toISOString() // 5 min before
          : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

        const { data: memos } = await supabase
          .from('memos')
          .select('title, content_markdown, slug')
          .eq('brand_id', brandId)
          .gte('created_at', timeWindow)
          .order('created_at', { ascending: false })
          .limit(1)

        if (memos && memos.length > 0) {
          result.memo = memos[0]
        }
        break
      }

      case 'competitor_discovered': {
        // Get recently discovered competitors
        const timeWindow = createdAt 
          ? new Date(new Date(createdAt).getTime() - 60 * 60 * 1000).toISOString()
          : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

        const { data: competitors } = await supabase
          .from('competitors')
          .select('name, domain')
          .eq('brand_id', brandId)
          .gte('created_at', timeWindow)
          .order('created_at', { ascending: false })
          .limit(20)

        result.competitors = competitors || []
        break
      }

      case 'competitor_content_found': {
        // Get recent competitor content
        const timeWindow = createdAt 
          ? new Date(new Date(createdAt).getTime() - 60 * 60 * 1000).toISOString()
          : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

        const { data: content } = await supabase
          .from('competitor_content')
          .select(`
            title,
            url,
            competitors!inner(name, brand_id)
          `)
          .gte('first_seen_at', timeWindow)
          .order('first_seen_at', { ascending: false })
          .limit(20)

        // Filter to only this brand's competitors
        const filtered = (content || []).filter(c => 
          (c.competitors as unknown as { brand_id: string }).brand_id === brandId
        )

        result.content = filtered.map(c => ({
          title: c.title,
          url: c.url,
          competitor_name: (c.competitors as unknown as { name: string }).name,
        }))
        break
      }

      default:
        // No additional data for other activity types
        break
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Activity detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch activity details' }, { status: 500 })
  }
}
