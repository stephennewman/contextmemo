import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCacheValue, setCacheValue } from '@/lib/cache/redis-cache'
import { 
  ActivityLogEntry, 
  ActivityCategory, 
  ActivityType,
  ACTIVITY_TYPE_META 
} from '@/lib/supabase/types'

interface AggregatedActivity {
  id: string
  brand_id: string
  brand_name?: string
  activity_type: ActivityType
  category: ActivityCategory
  title: string
  description: string | null
  icon: string
  link_url: string | null
  link_label: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse query params
  const searchParams = request.nextUrl.searchParams
  const categories = searchParams.get('categories')?.split(',').filter(Boolean) as ActivityCategory[] | undefined
  const activityTypes = searchParams.get('types')?.split(',').filter(Boolean) as ActivityType[] | undefined
  const brandIds = searchParams.get('brands')?.split(',').filter(Boolean)
  const startDate = searchParams.get('start')
  const endDate = searchParams.get('end')
  const rawLimit = parseInt(searchParams.get('limit') || '50')
  const rawOffset = parseInt(searchParams.get('offset') || '0')
  const limit = Math.min(Number.isNaN(rawLimit) ? 50 : rawLimit, 100)
  const offset = Math.max(Number.isNaN(rawOffset) ? 0 : rawOffset, 0)

  const cacheKey = `activity:${user.id}:${categories?.join('|') || 'all'}:${activityTypes?.join('|') || 'all'}:${brandIds?.join('|') || 'all'}:${startDate || 'none'}:${endDate || 'none'}:${limit}:${offset}`
  const cached = await getCacheValue<{ activities: AggregatedActivity[]; total: number; hasMore: boolean; offset: number; limit: number }>(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  try {
    // Get user's brands first
    const { data: brands } = await supabase
      .from('brands')
      .select('id, name')
      .order('created_at', { ascending: false })

    if (!brands || brands.length === 0) {
      const emptyResponse = { activities: [], total: 0, hasMore: false, offset, limit }
      await setCacheValue(cacheKey, emptyResponse, 30)
      return NextResponse.json(emptyResponse)
    }

    const userBrandIds = brands.map(b => b.id)
    const brandMap = new Map(brands.map(b => [b.id, b.name]))
    
    // Filter to requested brands (if specified) that user owns
    const targetBrandIds = brandIds 
      ? brandIds.filter(id => userBrandIds.includes(id))
      : userBrandIds

    if (targetBrandIds.length === 0) {
      const emptyResponse = { activities: [], total: 0, hasMore: false, offset, limit }
      await setCacheValue(cacheKey, emptyResponse, 30)
      return NextResponse.json(emptyResponse)
    }

    const activities: AggregatedActivity[] = []

    // Helper to check if activity type should be included
    const shouldInclude = (type: ActivityType, cat: ActivityCategory) => {
      if (categories && !categories.includes(cat)) return false
      if (activityTypes && !activityTypes.includes(type)) return false
      return true
    }

    // Helper to check date range
    const withinDateRange = (dateStr: string) => {
      if (startDate && new Date(dateStr) < new Date(startDate)) return false
      if (endDate && new Date(dateStr) > new Date(endDate)) return false
      return true
    }

    // 1. Aggregate from alerts table (already captures many activities)
    try {
    if (shouldInclude('scan_completed', 'scan') || 
        shouldInclude('memo_published', 'content') ||
        shouldInclude('discovery_scan_completed', 'discovery') ||
        shouldInclude('daily_run_completed', 'system') ||
        !activityTypes) {
      
      const { data: alerts } = await supabase
        .from('alerts')
        .select('*')
        .in('brand_id', targetBrandIds)
        .order('created_at', { ascending: false })
        .limit(300)

      if (alerts) {
        for (const alert of alerts) {
          if (!withinDateRange(alert.created_at)) continue

          // Map alert types to activity types
          let activityType: ActivityType
          let category: ActivityCategory
          
          switch (alert.alert_type) {
            case 'scan_complete':
              activityType = 'scan_completed'
              category = 'scan'
              break
            case 'memo_published':
              activityType = 'memo_published'
              category = 'content'
              break
            case 'content_generated':
              activityType = 'memo_generated'
              category = 'content'
              break
            case 'discovery_complete':
              activityType = 'discovery_scan_completed'
              category = 'discovery'
              break
            case 'system':
              activityType = 'daily_run_completed'
              category = 'system'
              break
            default:
              activityType = 'scan_completed'
              category = 'system'
          }

          if (!shouldInclude(activityType, category)) continue

          // Determine contextual link and label based on alert type
          let linkUrl: string
          let linkLabel: string
          
          if (alert.data?.memoId) {
            linkUrl = `/brands/${alert.brand_id}/memos/${alert.data.memoId}`
            linkLabel = 'View Memo'
          } else {
            // Contextual CTAs based on alert type
            switch (alert.alert_type) {
              case 'content_generated':
                linkUrl = `/brands/${alert.brand_id}/memos`
                linkLabel = 'View Resources'
                break
              case 'scan_complete':
                linkUrl = `/v2/brands/${alert.brand_id}/prompts`
                linkLabel = 'View Prompts'
                break
              case 'discovery_complete':
                linkUrl = `/v2/brands/${alert.brand_id}/prompts`
                linkLabel = 'View Prompts'
                break
              case 'citation_found':
                linkUrl = `/v2/brands/${alert.brand_id}/prompts`
                linkLabel = 'View Prompts'
                break
              case 'ai_traffic_detected':
                linkUrl = `/v2/brands/${alert.brand_id}`
                linkLabel = 'View Analytics'
                break
              default:
                linkUrl = `/brands/${alert.brand_id}`
                linkLabel = 'View Dashboard'
            }
          }

          const meta = ACTIVITY_TYPE_META[activityType]
          activities.push({
            id: `alert-${alert.id}`,
            brand_id: alert.brand_id,
            brand_name: brandMap.get(alert.brand_id),
            activity_type: activityType,
            category,
            title: alert.title,
            description: alert.message,
            icon: meta.icon,
            link_url: linkUrl,
            link_label: linkLabel,
            metadata: alert.data || {},
            created_at: alert.created_at,
          })
        }
      }
    }
    } catch (e) {
      console.error('Activity: alerts query failed:', e)
    }

    // 2. Aggregate recent memos (content category)
    try {
    if (shouldInclude('memo_generated', 'content') || 
        shouldInclude('memo_published', 'content') ||
        !activityTypes) {
      
      const { data: memos } = await supabase
        .from('memos')
        .select('id, brand_id, title, slug, status, memo_type, created_at, published_at')
        .in('brand_id', targetBrandIds)
        .order('created_at', { ascending: false })
        .limit(200)

      if (memos) {
        for (const memo of memos) {
          if (!withinDateRange(memo.created_at)) continue

          const activityType: ActivityType = memo.status === 'published' ? 'memo_published' : 'memo_generated'
          if (!shouldInclude(activityType, 'content')) continue

          const meta = ACTIVITY_TYPE_META[activityType]
          activities.push({
            id: `memo-${memo.id}`,
            brand_id: memo.brand_id,
            brand_name: brandMap.get(memo.brand_id),
            activity_type: activityType,
            category: 'content',
            title: memo.status === 'published' ? 'Memo Published' : 'Memo Generated',
            description: memo.title,
            icon: meta.icon,
            link_url: `/brands/${memo.brand_id}/memos/${memo.id}`,
            link_label: 'View Memo',
            metadata: { memo_type: memo.memo_type, slug: memo.slug },
            created_at: memo.published_at || memo.created_at,
          })
        }
      }
    }
    } catch (e) {
      console.error('Activity: memos query failed:', e)
    }

    // 3. Aggregate competitor discoveries
    try {
    if (shouldInclude('competitor_discovered', 'discovery') || !activityTypes) {
      const { data: competitors } = await supabase
        .from('competitors')
        .select('id, brand_id, name, domain, auto_discovered, created_at')
        .in('brand_id', targetBrandIds)
        .order('created_at', { ascending: false })
        .limit(200)

      if (competitors) {
        for (const comp of competitors) {
          if (!withinDateRange(comp.created_at)) continue
          if (!shouldInclude('competitor_discovered', 'discovery')) continue

          const meta = ACTIVITY_TYPE_META['competitor_discovered']
          activities.push({
            id: `competitor-${comp.id}`,
            brand_id: comp.brand_id,
            brand_name: brandMap.get(comp.brand_id),
            activity_type: 'competitor_discovered',
            category: 'discovery',
            title: comp.auto_discovered ? 'Competitor Auto-Discovered' : 'Competitor Added',
            description: comp.name,
            icon: meta.icon,
            link_url: `/brands/${comp.brand_id}?tab=competitors`,
            link_label: 'View Competitors',
            metadata: { domain: comp.domain, auto: comp.auto_discovered },
            created_at: comp.created_at,
          })
        }
      }
    }
    } catch (e) {
      console.error('Activity: competitors query failed:', e)
    }

    // 4. Aggregate query generation
    try {
    if (shouldInclude('query_generated', 'discovery') || !activityTypes) {
      const { data: queries } = await supabase
        .from('queries')
        .select('id, brand_id, query_text, query_type, persona, auto_discovered, created_at')
        .in('brand_id', targetBrandIds)
        .eq('auto_discovered', true)
        .order('created_at', { ascending: false })
        .limit(200)

      if (queries) {
        // Group queries by brand and hour to avoid flooding the feed
        const groupedQueries = new Map<string, typeof queries>()
        for (const q of queries) {
          const hourKey = `${q.brand_id}-${new Date(q.created_at).toISOString().slice(0, 13)}`
          if (!groupedQueries.has(hourKey)) {
            groupedQueries.set(hourKey, [])
          }
          groupedQueries.get(hourKey)!.push(q)
        }

        for (const [key, group] of groupedQueries) {
          const first = group[0]
          if (!withinDateRange(first.created_at)) continue
          if (!shouldInclude('query_generated', 'discovery')) continue

          const meta = ACTIVITY_TYPE_META['query_generated']
          activities.push({
            id: `queries-${key}`,
            brand_id: first.brand_id,
            brand_name: brandMap.get(first.brand_id),
            activity_type: 'query_generated',
            category: 'discovery',
            title: `${group.length} Queries Generated`,
            description: group.length === 1 ? first.query_text : `Including "${first.query_text}" and ${group.length - 1} more`,
            icon: meta.icon,
            link_url: `/brands/${first.brand_id}?tab=prompts`,
            link_label: 'View Prompts',
            metadata: { count: group.length, sample: first.query_text },
            created_at: first.created_at,
          })
        }
      }
    }
    } catch (e) {
      console.error('Activity: queries query failed:', e)
    }

    // 5. Aggregate competitor content discoveries
    try {
    if (shouldInclude('competitor_content_found', 'discovery') || !activityTypes) {
      const { data: content } = await supabase
        .from('competitor_content')
        .select('id, competitor_id, title, url, content_type, first_seen_at, competitors!inner(brand_id, name)')
        .order('first_seen_at', { ascending: false })
        .limit(300) // Fetch more to account for junk filtering

      // Junk title patterns to filter out
      const junkPatterns = [
        /^(log\s*in|sign\s*(up|in)|pricing|customers?|about|contact|careers?|jobs?|go\s*back|home|features?|products?|solutions?|services?|integrations?|partners?|support|help|faq|demo|get\s*started|free\s*trial|privacy|terms|cookie|legal|got\s*it|learn\s*more|read\s*more|click\s*here|see\s*more|view\s*all|show\s*more)$/i,
        /^-\s+/i, // Items starting with dash
        /^\[.*\]$/i, // Bracketed text
        /^meet\s+\w+$/i, // Team member pages
        /^[A-Z][a-z]+\s+[A-Z][a-z]+$/, // Two-word proper names (team members)
      ]
      const isJunkTitle = (title: string) => {
        if (!title || title.length < 10) return true // Too short for real content
        return junkPatterns.some(p => p.test(title.trim()))
      }

      if (content) {
        let addedCount = 0
        for (const item of content) {
          if (addedCount >= 100) break // Limit after junk filtering
          
          const brandId = (item.competitors as unknown as { brand_id: string }).brand_id
          if (!targetBrandIds.includes(brandId)) continue
          if (!withinDateRange(item.first_seen_at)) continue
          if (!shouldInclude('competitor_content_found', 'discovery')) continue
          
          // Skip junk content
          if (isJunkTitle(item.title)) continue

          const competitorName = (item.competitors as unknown as { name: string }).name
          const meta = ACTIVITY_TYPE_META['competitor_content_found']
          activities.push({
            id: `comp-content-${item.id}`,
            brand_id: brandId,
            brand_name: brandMap.get(brandId),
            activity_type: 'competitor_content_found',
            category: 'discovery',
            title: `Competitor Content: ${competitorName}`,
            description: item.title,
            icon: meta.icon,
            link_url: item.url,
            link_label: 'Read Article',
            metadata: { competitor: competitorName, content_type: item.content_type },
            created_at: item.first_seen_at,
          })
          addedCount++
        }
      }
    }
    } catch (e) {
      console.error('Activity: competitor_content query failed:', e)
    }

    // 6. Aggregate scan results (summarized by day/brand)
    try {
    if (shouldInclude('scan_completed', 'scan') || !activityTypes) {
      const { data: scans } = await supabase
        .from('scan_results')
        .select('id, brand_id, model, brand_mentioned, scanned_at')
        .in('brand_id', targetBrandIds)
        .order('scanned_at', { ascending: false })
        .limit(500)

      if (scans) {
        // Group by brand and day
        const groupedScans = new Map<string, typeof scans>()
        for (const s of scans) {
          const dayKey = `${s.brand_id}-${new Date(s.scanned_at).toISOString().slice(0, 10)}`
          if (!groupedScans.has(dayKey)) {
            groupedScans.set(dayKey, [])
          }
          groupedScans.get(dayKey)!.push(s)
        }

        for (const [key, group] of groupedScans) {
          const first = group[0]
          if (!withinDateRange(first.scanned_at)) continue
          if (!shouldInclude('scan_completed', 'scan')) continue

          const mentioned = group.filter(s => s.brand_mentioned).length
          const total = group.length
          const score = Math.round((mentioned / total) * 100)
          const models = [...new Set(group.map(s => s.model))]

          const meta = ACTIVITY_TYPE_META['scan_completed']
          activities.push({
            id: `scan-${key}`,
            brand_id: first.brand_id,
            brand_name: brandMap.get(first.brand_id),
            activity_type: 'scan_completed',
            category: 'scan',
            title: `AI Scan Complete`,
            description: `${score}% visibility across ${models.length} models (${mentioned}/${total} mentions)`,
            icon: meta.icon,
            link_url: `/v2/brands/${first.brand_id}/prompts`,
            link_label: 'View Scan Results',
            metadata: { visibility: score, models: models.length, mentioned, total },
            created_at: first.scanned_at,
          })
        }
      }
    }
    } catch (e) {
      console.error('Activity: scan_results query failed:', e)
    }

    // 7. Aggregate AI traffic (if table exists)
    try {
    if (shouldInclude('ai_traffic_detected', 'traffic') || !activityTypes) {
        const { data: traffic } = await supabase
          .from('ai_traffic')
          .select('id, brand_id, memo_id, page_url, referrer_source, timestamp')
          .in('brand_id', targetBrandIds)
          .order('timestamp', { ascending: false })
          .limit(200)

        if (traffic) {
          for (const t of traffic) {
            if (!withinDateRange(t.timestamp)) continue
            if (!shouldInclude('ai_traffic_detected', 'traffic')) continue

            const meta = ACTIVITY_TYPE_META['ai_traffic_detected']
            const sourceLabel = t.referrer_source.charAt(0).toUpperCase() + t.referrer_source.slice(1).replace(/_/g, ' ')
            activities.push({
              id: `traffic-${t.id}`,
              brand_id: t.brand_id,
              brand_name: brandMap.get(t.brand_id),
              activity_type: 'ai_traffic_detected',
              category: 'traffic',
              title: `Visit from ${sourceLabel}`,
              description: t.page_url,
              icon: meta.icon,
              link_url: t.memo_id ? `/brands/${t.brand_id}/memos/${t.memo_id}` : `/v2/brands/${t.brand_id}`,
              link_label: t.memo_id ? 'View Memo' : 'View Dashboard',
              metadata: { source: t.referrer_source },
              created_at: t.timestamp,
            })
          }
        }
    }
    } catch {
      // ai_traffic table may not exist yet
    }

    // Sort all activities by date descending
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Deduplicate by ID (some may appear in multiple sources)
    const seen = new Set<string>()
    const deduped = activities.filter(a => {
      // Use a composite key to avoid duplicates
      const key = `${a.activity_type}-${a.brand_id}-${a.created_at.slice(0, 16)}-${a.description?.slice(0, 20)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Paginate
    const total = deduped.length
    const paginated = deduped.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    const response = {
      activities: paginated,
      total,
      hasMore,
      offset,
      limit,
    }

    await setCacheValue(cacheKey, response, 30)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Activity feed error:', error)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}
