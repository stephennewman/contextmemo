import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Awareness stage thresholds
type AwarenessStage = 'unaware' | 'problem_aware' | 'solution_aware' | 'product_aware'

interface MarketCompetitor {
  name: string
  domain: string | null
  entityType: string
  mentionCount: number
  sov: number
  strength: 'strong' | 'moderate' | 'weak'
  // Per-framing breakdown
  problemMentions: number
  solutionMentions: number
}

interface Market {
  vertical: string
  queryCount: number
  scanCount: number
  awareness: AwarenessStage
  awarenessScore: number // 0-100
  brandSov: number
  brandMentionCount: number
  competitors: MarketCompetitor[]
}

interface CompetitorSummary {
  name: string
  domain: string | null
  entityType: string
  totalMentionCount: number
  totalSov: number
  marketReach: number // how many markets they appear strongly in
  totalMarkets: number
  markets: string[] // which markets they appear in
}

function calculateAwareness(
  problemQueryProductMentions: number,
  solutionQueryProductMentions: number,
  problemQueryCount: number,
  solutionQueryCount: number,
): { stage: AwarenessStage; score: number } {
  // Average product mentions per query for each framing
  const avgProblemMentions = problemQueryCount > 0 ? problemQueryProductMentions / problemQueryCount : 0
  const avgSolutionMentions = solutionQueryCount > 0 ? solutionQueryProductMentions / solutionQueryCount : 0

  if (avgSolutionMentions >= 2 && avgProblemMentions >= 1.5) {
    return { stage: 'product_aware', score: Math.min(100, Math.round((avgSolutionMentions + avgProblemMentions) * 15)) }
  }
  if (avgSolutionMentions >= 1.5 && avgProblemMentions < 1.5) {
    return { stage: 'solution_aware', score: Math.min(80, Math.round(avgSolutionMentions * 20 + 20)) }
  }
  if (avgSolutionMentions < 1.5 && (problemQueryCount > 0 || solutionQueryCount > 0)) {
    return { stage: 'problem_aware', score: Math.min(50, Math.round((avgSolutionMentions + avgProblemMentions) * 15 + 10)) }
  }
  return { stage: 'unaware', score: 0 }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get brand with context
  const { data: brand } = await supabase
    .from('brands')
    .select('id, name, domain, context')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const brandNameLower = brand.name.toLowerCase()

  // Get all active queries with vertical tags
  const { data: queries } = await supabase
    .from('queries')
    .select('id, query_text, vertical, query_framing, funnel_stage')
    .eq('brand_id', brandId)
    .eq('is_active', true)

  if (!queries || queries.length === 0) {
    return NextResponse.json({
      markets: [],
      competitors: [],
      summary: {
        totalMarkets: 0,
        totalEntities: 0,
        totalQueries: 0,
        totalScans: 0,
        strongestMarket: null,
        weakestMarket: null,
        biggestOpportunity: null,
      }
    })
  }

  // Filter to queries that have vertical tags
  const taggedQueries = queries.filter(q => q.vertical)
  const queryIds = taggedQueries.map(q => q.id)

  // Get scan results for tagged queries (last 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  let scanResults: Array<{
    query_id: string
    competitors_mentioned: string[] | null
    brand_mentioned: boolean
    brand_in_citations: boolean | null
    model: string
  }> = []

  if (queryIds.length > 0) {
    // Fetch in chunks to avoid query limits
    const chunkSize = 200
    for (let i = 0; i < queryIds.length; i += chunkSize) {
      const chunk = queryIds.slice(i, i + chunkSize)
      const { data } = await supabase
        .from('scan_results')
        .select('query_id, competitors_mentioned, brand_mentioned, brand_in_citations, model')
        .eq('brand_id', brandId)
        .in('query_id', chunk)
        .gte('scanned_at', ninetyDaysAgo.toISOString())

      if (data) {
        scanResults = scanResults.concat(data)
      }
    }
  }

  // Get known entities for domain lookup
  const { data: entities } = await supabase
    .from('competitors')
    .select('name, domain, entity_type')
    .eq('brand_id', brandId)
    .eq('is_active', true)

  const entityMap = new Map((entities || []).map(e => [e.name.toLowerCase(), e]))

  // Build query lookup
  const queryMap = new Map(taggedQueries.map(q => [q.id, q]))

  // Aggregate: vertical -> competitor -> metrics
  type VerticalData = {
    vertical: string
    queryCount: number
    scanCount: number
    problemQueryCount: number
    solutionQueryCount: number
    brandMentionCount: number
    totalCompetitorMentionsOnProblem: number // sum of competitors_mentioned.length on problem queries
    totalCompetitorMentionsOnSolution: number
    competitorMentions: Map<string, {
      count: number
      problemCount: number
      solutionCount: number
    }>
  }

  const verticalMap = new Map<string, VerticalData>()

  // Initialize verticals from tagged queries
  for (const q of taggedQueries) {
    if (!q.vertical) continue
    if (!verticalMap.has(q.vertical)) {
      verticalMap.set(q.vertical, {
        vertical: q.vertical,
        queryCount: 0,
        scanCount: 0,
        problemQueryCount: 0,
        solutionQueryCount: 0,
        brandMentionCount: 0,
        totalCompetitorMentionsOnProblem: 0,
        totalCompetitorMentionsOnSolution: 0,
        competitorMentions: new Map(),
      })
    }
    const vd = verticalMap.get(q.vertical)!
    vd.queryCount++
    if (q.query_framing === 'problem') vd.problemQueryCount++
    if (q.query_framing === 'solution') vd.solutionQueryCount++
  }

  // Process scan results
  for (const scan of scanResults) {
    const query = queryMap.get(scan.query_id)
    if (!query || !query.vertical) continue

    const vd = verticalMap.get(query.vertical)
    if (!vd) continue

    vd.scanCount++

    // Track brand mentions
    if (scan.brand_mentioned || scan.brand_in_citations) {
      vd.brandMentionCount++
    }

    // Track competitor mentions
    const competitors = scan.competitors_mentioned || []
    
    // Track total competitor mentions per framing for awareness scoring
    if (query.query_framing === 'problem') {
      vd.totalCompetitorMentionsOnProblem += competitors.length
    } else if (query.query_framing === 'solution') {
      vd.totalCompetitorMentionsOnSolution += competitors.length
    }

    for (const comp of competitors) {
      if (!comp || typeof comp !== 'string') continue
      const key = comp.toLowerCase()
      // Skip if it's the brand itself
      if (key === brandNameLower) continue

      const existing = vd.competitorMentions.get(key) || { count: 0, problemCount: 0, solutionCount: 0 }
      existing.count++
      if (query.query_framing === 'problem') existing.problemCount++
      if (query.query_framing === 'solution') existing.solutionCount++
      vd.competitorMentions.set(key, existing)
    }
  }

  // Build market objects
  const markets: Market[] = []
  const allCompetitors = new Map<string, { totalCount: number; markets: Set<string>; strongMarkets: number }>()

  for (const [vertical, vd] of verticalMap) {
    if (vd.scanCount === 0 && vd.queryCount === 0) continue

    // Calculate awareness
    const { stage: awareness, score: awarenessScore } = calculateAwareness(
      vd.totalCompetitorMentionsOnProblem,
      vd.totalCompetitorMentionsOnSolution,
      vd.problemQueryCount,
      vd.solutionQueryCount,
    )

    // Build competitor list for this market
    const marketCompetitors: MarketCompetitor[] = []
    for (const [compKey, metrics] of vd.competitorMentions) {
      const sov = vd.scanCount > 0 ? metrics.count / vd.scanCount : 0
      const strength: 'strong' | 'moderate' | 'weak' =
        sov >= 0.6 ? 'strong' : sov >= 0.2 ? 'moderate' : 'weak'

      const entity = entityMap.get(compKey)
      marketCompetitors.push({
        name: entity?.name || compKey.charAt(0).toUpperCase() + compKey.slice(1),
        domain: entity?.domain || null,
        entityType: entity?.entity_type || 'competitor',
        mentionCount: metrics.count,
        sov: Math.round(sov * 100) / 100,
        strength,
        problemMentions: metrics.problemCount,
        solutionMentions: metrics.solutionCount,
      })

      // Aggregate across markets
      const global = allCompetitors.get(compKey) || { totalCount: 0, markets: new Set<string>(), strongMarkets: 0 }
      global.totalCount += metrics.count
      global.markets.add(vertical)
      if (strength === 'strong') global.strongMarkets++
      allCompetitors.set(compKey, global)
    }

    // Sort competitors by SOV descending
    marketCompetitors.sort((a, b) => b.sov - a.sov)

    const brandSov = vd.scanCount > 0 ? vd.brandMentionCount / vd.scanCount : 0

    markets.push({
      vertical,
      queryCount: vd.queryCount,
      scanCount: vd.scanCount,
      awareness,
      awarenessScore,
      brandSov: Math.round(brandSov * 100) / 100,
      brandMentionCount: vd.brandMentionCount,
      competitors: marketCompetitors.slice(0, 10), // Top 10 per market
    })
  }

  // Sort markets by brand SOV descending (strongest first)
  markets.sort((a, b) => b.brandSov - a.brandSov)

  // Build global competitor summary
  const totalScans = scanResults.length
  const competitorSummaries: CompetitorSummary[] = Array.from(allCompetitors.entries())
    .map(([compKey, data]) => {
      const entity = entityMap.get(compKey)
      return {
        name: entity?.name || compKey.charAt(0).toUpperCase() + compKey.slice(1),
        domain: entity?.domain || null,
        entityType: entity?.entity_type || 'competitor',
        totalMentionCount: data.totalCount,
        totalSov: totalScans > 0 ? Math.round((data.totalCount / totalScans) * 100) / 100 : 0,
        marketReach: data.strongMarkets,
        totalMarkets: markets.length,
        markets: Array.from(data.markets),
      }
    })
    .sort((a, b) => b.totalMentionCount - a.totalMentionCount)
    .slice(0, 20)

  // Build summary
  const strongestMarket = markets.length > 0 ? markets[0] : null
  const weakestMarket = markets.length > 0 ? markets[markets.length - 1] : null

  // Biggest opportunity: market with fewest strong competitors (most whitespace)
  const biggestOpportunity = markets.length > 0
    ? [...markets].sort((a, b) => {
        const aStrong = a.competitors.filter(c => c.strength === 'strong').length
        const bStrong = b.competitors.filter(c => c.strength === 'strong').length
        return aStrong - bStrong // fewer strong competitors = more opportunity
      })[0]
    : null

  return NextResponse.json({
    markets,
    competitors: competitorSummaries,
    summary: {
      totalMarkets: markets.length,
      totalEntities: competitorSummaries.length,
      totalQueries: taggedQueries.length,
      totalScans: scanResults.length,
      strongestMarket: strongestMarket ? {
        vertical: strongestMarket.vertical,
        brandSov: strongestMarket.brandSov,
      } : null,
      weakestMarket: weakestMarket && weakestMarket !== strongestMarket ? {
        vertical: weakestMarket.vertical,
        brandSov: weakestMarket.brandSov,
      } : null,
      biggestOpportunity: biggestOpportunity ? {
        vertical: biggestOpportunity.vertical,
        reason: biggestOpportunity.competitors.filter(c => c.strength === 'strong').length === 0
          ? 'No dominant player'
          : `Only ${biggestOpportunity.competitors.filter(c => c.strength === 'strong').length} strong competitor(s)`,
      } : null,
    },
  })
}
