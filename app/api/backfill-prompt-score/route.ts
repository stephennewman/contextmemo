import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculatePromptScore } from '@/lib/utils/prompt-score'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * One-time backfill route to calculate prompt_score for all existing queries.
 * Uses scan_results data to compute citation volume and competitor density.
 * 
 * POST /api/backfill-prompt-score
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('x-admin-key')
  if (authHeader !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all active queries
  const { data: queries, error: qErr } = await supabase
    .from('queries')
    .select('id, query_text, funnel_stage, brand_id')
    .eq('is_active', true)

  if (qErr || !queries) {
    return NextResponse.json({ error: 'Failed to fetch queries', details: qErr }, { status: 500 })
  }

  // Fetch all scan results in bulk (most recent 5 per query would be ideal but we'll aggregate)
  const queryIds = queries.map(q => q.id)
  
  // Process in chunks to avoid query limits
  const chunkSize = 200
  let updated = 0

  for (let i = 0; i < queryIds.length; i += chunkSize) {
    const chunk = queryIds.slice(i, i + chunkSize)
    const chunkQueries = queries.filter(q => chunk.includes(q.id))
    
    // Get scan results for this chunk
    const { data: scans } = await supabase
      .from('scan_results')
      .select('query_id, citations, competitors_mentioned')
      .in('query_id', chunk)

    // Aggregate per query
    const scansByQuery = new Map<string, { citationCounts: number[], competitorCounts: number[] }>()
    for (const scan of scans || []) {
      const existing = scansByQuery.get(scan.query_id) || { citationCounts: [], competitorCounts: [] }
      existing.citationCounts.push(scan.citations?.length || 0)
      existing.competitorCounts.push(scan.competitors_mentioned?.length || 0)
      scansByQuery.set(scan.query_id, existing)
    }

    // Calculate and update scores
    for (const q of chunkQueries) {
      const agg = scansByQuery.get(q.id)
      const avgCitations = agg && agg.citationCounts.length > 0
        ? agg.citationCounts.reduce((a, b) => a + b, 0) / agg.citationCounts.length
        : 0
      const avgCompetitors = agg && agg.competitorCounts.length > 0
        ? agg.competitorCounts.reduce((a, b) => a + b, 0) / agg.competitorCounts.length
        : 0

      const score = calculatePromptScore({
        queryText: q.query_text,
        avgCitationCount: avgCitations,
        avgCompetitorCount: avgCompetitors,
        funnelStage: q.funnel_stage,
      })

      await supabase
        .from('queries')
        .update({ prompt_score: score })
        .eq('id', q.id)

      updated++
    }
  }

  return NextResponse.json({ 
    success: true, 
    updated,
    total: queries.length,
  })
}
