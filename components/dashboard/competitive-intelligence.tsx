'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Trophy,
  Target,
  Users,
  BarChart3
} from 'lucide-react'

interface Competitor {
  id: string
  name: string
  domain: string | null
}

interface ScanResult {
  id: string
  query_id: string
  model: string
  brand_mentioned: boolean
  competitors_mentioned: string[] | null
  scanned_at: string
}

interface Query {
  id: string
  query_text: string
  query_type: string | null
}

interface CompetitiveIntelligenceProps {
  brandName: string
  competitors: Competitor[]
  scanResults: ScanResult[]
  queries: Query[]
}

interface CompetitorStats {
  name: string
  mentionCount: number
  mentionRate: number
  winsAgainstBrand: number  // Queries where competitor is mentioned but brand isn't
  headToHead: number        // Both mentioned
  lossesToBrand: number     // Brand mentioned, competitor isn't
}

interface QueryBattle {
  queryId: string
  queryText: string
  queryType: string | null
  brandMentioned: boolean
  competitorsMentioned: string[]
  winner: 'brand' | 'competitor' | 'both' | 'neither'
}

export function CompetitiveIntelligence({ 
  brandName, 
  competitors, 
  scanResults,
  queries 
}: CompetitiveIntelligenceProps) {
  // Build query lookup
  const queryLookup = new Map(queries.map(q => [q.id, q]))
  
  // Calculate competitor stats
  const competitorStats = calculateCompetitorStats(brandName, competitors, scanResults)
  
  // Calculate share of voice
  const shareOfVoice = calculateShareOfVoice(brandName, competitorStats, scanResults)
  
  // Find query battles (where competitors beat brand)
  const queryBattles = analyzeQueryBattles(brandName, scanResults, queryLookup)
  
  // Get top competitor threats (highest mention rate competitors)
  const topThreats = [...competitorStats]
    .sort((a, b) => b.winsAgainstBrand - a.winsAgainstBrand)
    .slice(0, 5)

  if (scanResults.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Run scans to see competitive intelligence</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Share of Voice */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <CardTitle className="text-base">Share of Voice</CardTitle>
          </div>
          <CardDescription>
            Who gets mentioned most in AI responses to your queries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {shareOfVoice.map((item, index) => (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {index === 0 && <Trophy className="h-3 w-3 text-amber-500" />}
                    <span className={item.name === brandName ? 'font-semibold' : ''}>
                      {item.name}
                      {item.name === brandName && (
                        <Badge variant="outline" className="ml-2 text-[10px] py-0">You</Badge>
                      )}
                    </span>
                  </div>
                  <span className="font-medium">{item.percentage}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      item.name === brandName 
                        ? 'bg-primary' 
                        : 'bg-slate-400'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Based on {scanResults.length} scans across {queries.length} queries
          </p>
        </CardContent>
      </Card>

      {/* Competitor Threat Analysis */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-red-500" />
            <CardTitle className="text-base">Competitive Threats</CardTitle>
          </div>
          <CardDescription>
            Competitors winning queries where you&apos;re not mentioned
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topThreats.length > 0 ? (
            <div className="space-y-3">
              {topThreats.map((competitor) => (
                <div 
                  key={competitor.name} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{competitor.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Mentioned in {competitor.mentionRate}% of scans
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-red-600">{competitor.winsAgainstBrand}</p>
                        <p className="text-[10px] text-muted-foreground">Wins</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-amber-600">{competitor.headToHead}</p>
                        <p className="text-[10px] text-muted-foreground">Ties</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-green-600">{competitor.lossesToBrand}</p>
                        <p className="text-[10px] text-muted-foreground">Losses</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No competitor data available yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Query Battles - Where Competitors Beat You */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-base">Queries to Improve</CardTitle>
          </div>
          <CardDescription>
            Queries where competitors are mentioned but you&apos;re not
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queryBattles.losses.length > 0 ? (
            <div className="space-y-2">
              {queryBattles.losses.slice(0, 8).map((battle) => (
                <div 
                  key={battle.queryId} 
                  className="p-3 border border-red-200 bg-red-50 dark:bg-red-950/20 rounded-lg"
                >
                  <p className="text-sm font-medium">&quot;{battle.queryText}&quot;</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px]">
                      {battle.queryType || 'general'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Winners: {battle.competitorsMentioned.slice(0, 3).join(', ')}
                      {battle.competitorsMentioned.length > 3 && ` +${battle.competitorsMentioned.length - 3}`}
                    </span>
                  </div>
                </div>
              ))}
              {queryBattles.losses.length > 8 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{queryBattles.losses.length - 8} more queries where competitors win
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm text-muted-foreground">
                Great! No queries where competitors beat you exclusively
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              {queryBattles.wins.length > queryBattles.losses.length ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : queryBattles.wins.length < queryBattles.losses.length ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : (
                <Minus className="h-4 w-4 text-amber-500" />
              )}
              <span className="text-2xl font-bold">{queryBattles.wins.length}</span>
            </div>
            <p className="text-xs text-muted-foreground">Queries You Win</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{queryBattles.ties.length}</div>
            <p className="text-xs text-muted-foreground">Shared Queries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-red-600">{queryBattles.losses.length}</div>
            <p className="text-xs text-muted-foreground">Queries to Improve</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Calculate stats for each competitor
function calculateCompetitorStats(
  brandName: string,
  competitors: Competitor[],
  scanResults: ScanResult[]
): CompetitorStats[] {
  const brandNameLower = brandName.toLowerCase()
  const stats = new Map<string, CompetitorStats>()
  
  // Initialize stats for known competitors
  competitors.forEach(c => {
    stats.set(c.name.toLowerCase(), {
      name: c.name,
      mentionCount: 0,
      mentionRate: 0,
      winsAgainstBrand: 0,
      headToHead: 0,
      lossesToBrand: 0,
    })
  })
  
  // Process each scan
  scanResults.forEach(scan => {
    const brandMentioned = scan.brand_mentioned
    const competitorsMentioned = (scan.competitors_mentioned || []).map(c => c.toLowerCase())
    
    competitorsMentioned.forEach(compName => {
      // Get or create stats entry
      let compStats = stats.get(compName)
      if (!compStats) {
        // Competitor mentioned but not in our known list
        compStats = {
          name: compName,
          mentionCount: 0,
          mentionRate: 0,
          winsAgainstBrand: 0,
          headToHead: 0,
          lossesToBrand: 0,
        }
        stats.set(compName, compStats)
      }
      
      compStats.mentionCount++
      
      if (brandMentioned) {
        compStats.headToHead++
      } else {
        compStats.winsAgainstBrand++
      }
    })
    
    // Track brand wins (brand mentioned, competitor not)
    if (brandMentioned) {
      stats.forEach((compStats, compNameLower) => {
        if (!competitorsMentioned.includes(compNameLower)) {
          compStats.lossesToBrand++
        }
      })
    }
  })
  
  // Calculate mention rates
  const totalScans = scanResults.length
  stats.forEach(compStats => {
    compStats.mentionRate = totalScans > 0 
      ? Math.round((compStats.mentionCount / totalScans) * 100)
      : 0
  })
  
  return Array.from(stats.values())
}

// Calculate share of voice (percentage of total mentions)
function calculateShareOfVoice(
  brandName: string,
  competitorStats: CompetitorStats[],
  scanResults: ScanResult[]
): { name: string; mentions: number; percentage: number }[] {
  const brandMentions = scanResults.filter(s => s.brand_mentioned).length
  
  const allMentions = [
    { name: brandName, mentions: brandMentions },
    ...competitorStats.map(c => ({ name: c.name, mentions: c.mentionCount }))
  ]
  
  const totalMentions = allMentions.reduce((sum, item) => sum + item.mentions, 0)
  
  return allMentions
    .map(item => ({
      ...item,
      percentage: totalMentions > 0 
        ? Math.round((item.mentions / totalMentions) * 100)
        : 0
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 6) // Top 6
}

// Analyze which queries brand wins/loses vs competitors
function analyzeQueryBattles(
  brandName: string,
  scanResults: ScanResult[],
  queryLookup: Map<string, Query>
): { wins: QueryBattle[]; ties: QueryBattle[]; losses: QueryBattle[] } {
  // Group scans by query
  const queryScans = new Map<string, ScanResult[]>()
  scanResults.forEach(scan => {
    const existing = queryScans.get(scan.query_id) || []
    existing.push(scan)
    queryScans.set(scan.query_id, existing)
  })
  
  const wins: QueryBattle[] = []
  const ties: QueryBattle[] = []
  const losses: QueryBattle[] = []
  
  queryScans.forEach((scans, queryId) => {
    const query = queryLookup.get(queryId)
    if (!query) return
    
    // Aggregate across all models for this query
    const brandMentionedAny = scans.some(s => s.brand_mentioned)
    const allCompetitorsMentioned = new Set<string>()
    scans.forEach(s => {
      (s.competitors_mentioned || []).forEach(c => allCompetitorsMentioned.add(c))
    })
    const competitorMentionedAny = allCompetitorsMentioned.size > 0
    
    const battle: QueryBattle = {
      queryId,
      queryText: query.query_text,
      queryType: query.query_type,
      brandMentioned: brandMentionedAny,
      competitorsMentioned: Array.from(allCompetitorsMentioned),
      winner: 'neither'
    }
    
    if (brandMentionedAny && !competitorMentionedAny) {
      battle.winner = 'brand'
      wins.push(battle)
    } else if (brandMentionedAny && competitorMentionedAny) {
      battle.winner = 'both'
      ties.push(battle)
    } else if (!brandMentionedAny && competitorMentionedAny) {
      battle.winner = 'competitor'
      losses.push(battle)
    }
    // Skip 'neither' - not interesting
  })
  
  return { wins, ties, losses }
}
