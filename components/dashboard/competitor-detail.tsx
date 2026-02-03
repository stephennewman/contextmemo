'use client'

import { useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Target,
  MessageSquare,
  ExternalLink,
  Sparkles,
  CheckCircle,
  XCircle,
} from 'lucide-react'

interface ScanResult {
  id: string
  query_id: string
  model: string
  brand_mentioned: boolean
  competitors_mentioned: string[] | null
  scanned_at: string
  brand_context?: string | null
}

interface Query {
  id: string
  query_text: string
  query_type: string | null
}

interface CompetitorStats {
  name: string
  domain?: string | null
  description?: string | null
  auto_discovered?: boolean
  mentionCount: number
  mentionRate: number
  winsAgainstBrand: number
  headToHead: number
  lossesToBrand: number
}

interface CompetitorDetailProps {
  competitor: CompetitorStats | null
  isOpen: boolean
  onClose: () => void
  brandName: string
  scanResults: ScanResult[]
  queries: Query[]
}

export function CompetitorDetail({
  competitor,
  isOpen,
  onClose,
  brandName,
  scanResults,
  queries,
}: CompetitorDetailProps) {
  // Build query lookup
  const queryLookup = useMemo(() => 
    new Map(queries.map(q => [q.id, q])),
    [queries]
  )

  // Find all queries where this competitor was mentioned
  const competitorQueries = useMemo(() => {
    if (!competitor) return []
    
    const competitorNameLower = competitor.name.toLowerCase()
    const queryResults = new Map<string, {
      query: Query
      brandMentioned: boolean
      competitorMentioned: boolean
      models: string[]
    }>()

    scanResults.forEach(scan => {
      const competitorsMentioned = (scan.competitors_mentioned || []).map(c => c.toLowerCase())
      if (competitorsMentioned.includes(competitorNameLower)) {
        const query = queryLookup.get(scan.query_id)
        if (!query) return

        const existing = queryResults.get(scan.query_id)
        if (existing) {
          if (scan.brand_mentioned) existing.brandMentioned = true
          if (!existing.models.includes(scan.model)) existing.models.push(scan.model)
        } else {
          queryResults.set(scan.query_id, {
            query,
            brandMentioned: scan.brand_mentioned,
            competitorMentioned: true,
            models: [scan.model],
          })
        }
      }
    })

    return Array.from(queryResults.values())
  }, [competitor, scanResults, queryLookup])

  // Categorize queries
  const winsQueries = competitorQueries.filter(q => q.competitorMentioned && !q.brandMentioned)
  const tiesQueries = competitorQueries.filter(q => q.competitorMentioned && q.brandMentioned)

  if (!competitor) return null

  const totalBattles = competitor.winsAgainstBrand + competitor.headToHead + competitor.lossesToBrand
  const winRate = totalBattles > 0 
    ? Math.round((competitor.winsAgainstBrand / totalBattles) * 100) 
    : 0

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <div className="p-6 border-b bg-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{competitor.name}</h2>
              {competitor.domain && (
                <a 
                  href={`https://${competitor.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5 mt-1"
                >
                  <Globe className="h-4 w-4" />
                  {competitor.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {competitor.auto_discovered && (
              <Badge variant="secondary" className="shrink-0">
                <Sparkles className="h-3 w-3 mr-1" />
                Auto-discovered
              </Badge>
            )}
          </div>
          {competitor.description && (
            <p className="text-sm text-muted-foreground mt-3">{competitor.description}</p>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Head-to-Head Stats */}
          <div>
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Head-to-Head vs {brandName}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-xl text-center border border-red-200 dark:border-red-900">
                <p className="text-3xl font-bold text-red-600">{competitor.winsAgainstBrand}</p>
                <p className="text-sm text-muted-foreground mt-1">They Win</p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-center border border-amber-200 dark:border-amber-900">
                <p className="text-3xl font-bold text-amber-600">{competitor.headToHead}</p>
                <p className="text-sm text-muted-foreground mt-1">Ties</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-xl text-center border border-green-200 dark:border-green-900">
                <p className="text-3xl font-bold text-green-600">{competitor.lossesToBrand}</p>
                <p className="text-sm text-muted-foreground mt-1">You Win</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm p-3 bg-muted/50 rounded-lg">
              <span className="text-muted-foreground">Their win rate against you:</span>
              <span className={`text-lg font-bold ${winRate > 50 ? 'text-red-600' : winRate < 50 ? 'text-green-600' : 'text-amber-600'}`}>
                {winRate}%
              </span>
            </div>
          </div>

          {/* Overall Stats */}
          <div>
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Overall Visibility
            </h3>
            <div className="p-5 border rounded-xl space-y-4 bg-background">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Mention Rate</span>
                <span className="text-lg font-bold">{competitor.mentionRate}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all rounded-full"
                  style={{ width: `${competitor.mentionRate}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Mentioned in {competitor.mentionCount} of {scanResults.length} total scans
              </p>
            </div>
          </div>

          {/* Queries Where They Win */}
          {winsQueries.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Prompts Where {competitor.name} Beats You ({winsQueries.length})
              </h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {winsQueries.map(({ query, models }) => (
                  <div 
                    key={query.id}
                    className="p-4 border border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900 rounded-xl"
                  >
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">"{query.query_text}"</p>
                        <div className="flex items-center gap-3 mt-3">
                          <Badge variant="outline" className="text-xs">
                            {query.query_type || 'general'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {models.length} model{models.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Queries Where Both Mentioned */}
          {tiesQueries.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Minus className="h-4 w-4 text-amber-500" />
                Shared Mentions ({tiesQueries.length})
              </h3>
              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
                {tiesQueries.slice(0, 10).map(({ query, models }) => (
                  <div 
                    key={query.id}
                    className="p-4 border rounded-xl bg-background"
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">"{query.query_text}"</p>
                        <div className="flex items-center gap-3 mt-3">
                          <Badge variant="outline" className="text-xs">
                            {query.query_type || 'general'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {models.length} model{models.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {tiesQueries.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    +{tiesQueries.length - 10} more shared prompts
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Empty State */}
          {competitorQueries.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-base">No scan data available for this competitor yet.</p>
              <p className="text-sm mt-1">Run scans to see head-to-head comparisons.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
