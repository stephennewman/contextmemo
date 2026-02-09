'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Users,
  BarChart3,
  ChevronRight,
} from 'lucide-react'
import { QueryDetail } from './query-detail'
import { QueriesListDrawer } from './queries-list-drawer'
import { isBlockedCompetitorName } from '@/lib/config/competitor-blocklist'

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
  priority: number
}

interface CompetitiveIntelligenceProps {
  brandName: string
  scanResults: ScanResult[]
  queries: Query[]
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
  scanResults,
  queries 
}: CompetitiveIntelligenceProps) {
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null)
  const [queriesListType, setQueriesListType] = useState<'wins' | 'ties' | 'losses' | null>(null)

  // Build query lookup
  const queryLookup = new Map(queries.map(q => [q.id, q]))
  
  // Find query battles (where competitors beat brand)
  const queryBattles = analyzeQueryBattles(brandName, scanResults, queryLookup)

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
      {/* Prompt Battles - Where Competitors Beat You */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-orange-500" />
            <CardTitle className="text-base">Prompts to Improve</CardTitle>
          </div>
          <CardDescription>
            Prompts where competitors are mentioned but you&apos;re not
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queryBattles.losses.length > 0 ? (
            <div className="space-y-2">
              {queryBattles.losses.slice(0, 8).map((battle) => {
                const query = queryLookup.get(battle.queryId)
                return (
                  <div 
                    key={battle.queryId} 
                    className="p-3 border border-red-200 bg-red-50 dark:bg-red-950/20 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors group"
                    onClick={() => query && setSelectedQuery(query)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">&quot;{battle.queryText}&quot;</p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
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
                )
              })}
              {queryBattles.losses.length > 8 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{queryBattles.losses.length - 8} more prompts where competitors win
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-sm text-muted-foreground">
                Great! No prompts where competitors beat you exclusively
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => queryBattles.wins.length > 0 && setQueriesListType('wins')}
        >
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
            <p className="text-xs text-muted-foreground">Prompts You Win</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => queryBattles.ties.length > 0 && setQueriesListType('ties')}
        >
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{queryBattles.ties.length}</div>
            <p className="text-xs text-muted-foreground">Shared Prompts</p>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => queryBattles.losses.length > 0 && setQueriesListType('losses')}
        >
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-red-600">{queryBattles.losses.length}</div>
            <p className="text-xs text-muted-foreground">Prompts to Improve</p>
          </CardContent>
        </Card>
      </div>

      {/* Query Detail Drawer */}
      <QueryDetail
        query={selectedQuery}
        isOpen={!!selectedQuery}
        onClose={() => setSelectedQuery(null)}
        brandName={brandName}
        scanResults={scanResults}
      />

      {/* Queries List Drawer */}
      <QueriesListDrawer
        isOpen={queriesListType !== null}
        onClose={() => setQueriesListType(null)}
        title={
          queriesListType === 'wins' ? 'Prompts You Win' :
          queriesListType === 'ties' ? 'Shared Prompts' :
          'Prompts to Improve'
        }
        description={
          queriesListType === 'wins' ? 'Prompts where you\'re mentioned but competitors aren\'t' :
          queriesListType === 'ties' ? 'Prompts where both you and competitors are mentioned' :
          'Prompts where competitors are mentioned but you aren\'t'
        }
        type={queriesListType || 'wins'}
        queries={
          queriesListType === 'wins' ? queryBattles.wins :
          queriesListType === 'ties' ? queryBattles.ties :
          queryBattles.losses
        }
        allQueries={queries}
        scanResults={scanResults}
        brandName={brandName}
      />
    </div>
  )
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
      // Filter out blocked/generic terms
      (s.competitors_mentioned || [])
        .filter(c => !isBlockedCompetitorName(c))
        .forEach(c => allCompetitorsMentioned.add(c))
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
