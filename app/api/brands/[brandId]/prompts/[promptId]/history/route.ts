import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface HistoryEntry {
  date: string
  models_scanned: number
  mentioned_count: number
  cited_count: number
  mention_rate: number
  citation_rate: number
  competitors: string[]
  citations: { url: string; mentioned: boolean; cited: boolean }[]
  details: Array<{
    model: string
    brand_mentioned: boolean
    brand_in_citations: boolean
    competitors_mentioned: string[]
    citation_urls: string[]
  }>
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string; promptId: string }> }
) {
  const { brandId, promptId } = await params
  const supabase = await createClient()

  // Verify user has access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get the query/prompt details
  const { data: prompt, error: promptError } = await supabase
    .from('queries')
    .select('id, query_text, brand_id, created_at')
    .eq('id', promptId)
    .eq('brand_id', brandId)
    .single()

  if (promptError || !prompt) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
  }

  // Get query params for date range
  const searchParams = request.nextUrl.searchParams
  const days = parseInt(searchParams.get('days') || '30')

  // Get all scan results for this prompt
  const { data: scans, error: scansError } = await supabase
    .from('scan_results')
    .select(`
      id,
      model,
      brand_mentioned,
      brand_in_citations,
      competitors_mentioned,
      citations,
      citation_source,
      scanned_at
    `)
    .eq('query_id', promptId)
    .gte('scanned_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    .order('scanned_at', { ascending: false })

  if (scansError) {
    return NextResponse.json({ error: 'Failed to fetch scan history' }, { status: 500 })
  }

  // Group by date
  const byDate = new Map<string, typeof scans>()
  for (const scan of scans || []) {
    const date = new Date(scan.scanned_at).toISOString().split('T')[0]
    if (!byDate.has(date)) {
      byDate.set(date, [])
    }
    byDate.get(date)!.push(scan)
  }

  // Build history entries
  const history: HistoryEntry[] = []
  
  for (const [date, dayScans] of byDate) {
    const modelsScanned = dayScans.length
    const mentionedCount = dayScans.filter(s => s.brand_mentioned).length
    const citedCount = dayScans.filter(s => s.brand_in_citations).length
    
    // Aggregate competitors across all models
    const allCompetitors = new Set<string>()
    for (const scan of dayScans) {
      if (scan.competitors_mentioned) {
        for (const comp of scan.competitors_mentioned) {
          allCompetitors.add(comp)
        }
      }
    }
    
    // Aggregate citations
    const citationMap = new Map<string, { mentioned: boolean; cited: boolean }>()
    for (const scan of dayScans) {
      if (scan.citations) {
        for (const url of scan.citations) {
          if (!citationMap.has(url)) {
            citationMap.set(url, { mentioned: scan.brand_mentioned, cited: scan.brand_in_citations })
          } else {
            const existing = citationMap.get(url)!
            citationMap.set(url, {
              mentioned: existing.mentioned || scan.brand_mentioned,
              cited: existing.cited || scan.brand_in_citations,
            })
          }
        }
      }
    }
    
    history.push({
      date,
      models_scanned: modelsScanned,
      mentioned_count: mentionedCount,
      cited_count: citedCount,
      mention_rate: modelsScanned > 0 ? Math.round((mentionedCount / modelsScanned) * 100) : 0,
      citation_rate: modelsScanned > 0 ? Math.round((citedCount / modelsScanned) * 100) : 0,
      competitors: Array.from(allCompetitors).sort(),
      citations: Array.from(citationMap.entries()).map(([url, data]) => ({
        url,
        mentioned: data.mentioned,
        cited: data.cited,
      })),
      details: dayScans.map(s => ({
        model: s.model,
        brand_mentioned: s.brand_mentioned,
        brand_in_citations: s.brand_in_citations,
        competitors_mentioned: s.competitors_mentioned || [],
        citation_urls: s.citations || [],
      })),
    })
  }

  // Sort by date descending
  history.sort((a, b) => b.date.localeCompare(a.date))

  // Calculate overall stats
  const totalScans = scans?.length || 0
  const totalMentioned = scans?.filter(s => s.brand_mentioned).length || 0
  const totalCited = scans?.filter(s => s.brand_in_citations).length || 0

  // Find trend (compare last 7 days vs previous 7 days)
  const now = new Date()
  const last7Days = scans?.filter(s => {
    const d = new Date(s.scanned_at)
    return d >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }) || []
  const prev7Days = scans?.filter(s => {
    const d = new Date(s.scanned_at)
    return d >= new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) &&
           d < new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }) || []

  const last7MentionRate = last7Days.length > 0 
    ? Math.round((last7Days.filter(s => s.brand_mentioned).length / last7Days.length) * 100)
    : 0
  const prev7MentionRate = prev7Days.length > 0
    ? Math.round((prev7Days.filter(s => s.brand_mentioned).length / prev7Days.length) * 100)
    : 0

  const last7CitationRate = last7Days.length > 0
    ? Math.round((last7Days.filter(s => s.brand_in_citations).length / last7Days.length) * 100)
    : 0
  const prev7CitationRate = prev7Days.length > 0
    ? Math.round((prev7Days.filter(s => s.brand_in_citations).length / prev7Days.length) * 100)
    : 0

  return NextResponse.json({
    prompt: {
      id: prompt.id,
      query_text: prompt.query_text,
      created_at: prompt.created_at,
    },
    stats: {
      total_scans: totalScans,
      total_mentioned: totalMentioned,
      total_cited: totalCited,
      mention_rate: totalScans > 0 ? Math.round((totalMentioned / totalScans) * 100) : 0,
      citation_rate: totalScans > 0 ? Math.round((totalCited / totalScans) * 100) : 0,
      days_tracked: byDate.size,
    },
    trend: {
      mention_rate_change: last7MentionRate - prev7MentionRate,
      citation_rate_change: last7CitationRate - prev7CitationRate,
      direction: last7MentionRate > prev7MentionRate ? 'up' : last7MentionRate < prev7MentionRate ? 'down' : 'stable',
    },
    history,
  })
}
