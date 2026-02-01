'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  TrendingUp, 
  MousePointer, 
  BarChart3,
  RefreshCw,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface SearchConsoleStat {
  id: string
  brand_id: string
  provider: string
  query: string
  page_url: string | null
  impressions: number
  clicks: number
  position: number | null
  ctr: number | null
  date: string
}

interface Query {
  id: string
  query_text: string
}

interface SearchConsoleViewProps {
  brandId: string
  stats: SearchConsoleStat[]
  queries: Query[]  // Generated queries to compare against
  bingEnabled: boolean
  bingLastSyncedAt?: string
  googleEnabled: boolean
  googleLastSyncedAt?: string
}

export function SearchConsoleView({ 
  brandId, 
  stats, 
  queries,
  bingEnabled,
  bingLastSyncedAt,
  googleEnabled,
  googleLastSyncedAt
}: SearchConsoleViewProps) {
  const [syncingBing, setSyncingBing] = useState(false)
  const [syncingGoogle, setSyncingGoogle] = useState(false)

  const handleBingSync = async () => {
    setSyncingBing(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_bing' }),
      })

      if (response.ok) {
        toast.success('Bing sync started - data will update shortly')
      } else {
        toast.error('Failed to start Bing sync')
      }
    } catch {
      toast.error('Failed to start Bing sync')
    } finally {
      setSyncingBing(false)
    }
  }

  const handleGoogleSync = async () => {
    setSyncingGoogle(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_google' }),
      })

      if (response.ok) {
        toast.success('Google sync started - data will update shortly')
      } else {
        toast.error('Failed to start Google sync')
      }
    } catch {
      toast.error('Failed to start Google sync')
    } finally {
      setSyncingGoogle(false)
    }
  }

  // Separate stats by provider
  const bingStats = stats.filter(s => s.provider === 'bing')
  const googleStats = stats.filter(s => s.provider === 'google')

  // Group stats by query and aggregate
  const queryAggregates = new Map<string, {
    query: string
    totalImpressions: number
    totalClicks: number
    avgPosition: number
    positionCount: number
    avgCtr: number
    dates: Set<string>
  }>()

  stats.forEach(stat => {
    const existing = queryAggregates.get(stat.query)
    if (existing) {
      existing.totalImpressions += stat.impressions
      existing.totalClicks += stat.clicks
      if (stat.position) {
        existing.avgPosition = (existing.avgPosition * existing.positionCount + stat.position) / (existing.positionCount + 1)
        existing.positionCount++
      }
      existing.dates.add(stat.date)
    } else {
      queryAggregates.set(stat.query, {
        query: stat.query,
        totalImpressions: stat.impressions,
        totalClicks: stat.clicks,
        avgPosition: stat.position || 0,
        positionCount: stat.position ? 1 : 0,
        avgCtr: stat.ctr || 0,
        dates: new Set([stat.date]),
      })
    }
  })

  const sortedQueries = Array.from(queryAggregates.values())
    .sort((a, b) => b.totalImpressions - a.totalImpressions)

  // Calculate totals
  const totalImpressions = sortedQueries.reduce((sum, q) => sum + q.totalImpressions, 0)
  const totalClicks = sortedQueries.reduce((sum, q) => sum + q.totalClicks, 0)
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  // Find queries that match generated queries (correlation)
  const generatedQueryTexts = new Set(queries.map(q => q.query_text.toLowerCase()))
  const matchedQueries = sortedQueries.filter(q => 
    generatedQueryTexts.has(q.query.toLowerCase()) ||
    queries.some(gq => q.query.toLowerCase().includes(gq.query_text.toLowerCase().split(' ').slice(0, 3).join(' ')))
  )

  // Find queries in Bing but NOT in generated queries (opportunities)
  const newOpportunities = sortedQueries.filter(q => 
    !matchedQueries.includes(q) && q.totalImpressions >= 10
  ).slice(0, 10)

  const hasAnyProvider = bingEnabled || googleEnabled

  if (!hasAnyProvider) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
          <h3 className="font-medium mb-2">Search Console Not Configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Connect Bing Webmaster or Google Search Console to see which queries drive traffic to your memos.
          </p>
          <Button variant="outline" asChild>
            <a href={`/brands/${brandId}/settings`}>
              Configure in Settings
            </a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with sync buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Search Console Data</h3>
          <p className="text-sm text-muted-foreground">
            Queries driving traffic from search engines (upstream signal for AI visibility)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {bingEnabled && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBingSync}
              disabled={syncingBing}
            >
              {syncingBing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Bing</span>
            </Button>
          )}
          {googleEnabled && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGoogleSync}
              disabled={syncingGoogle}
            >
              {syncingGoogle ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Google</span>
            </Button>
          )}
        </div>
      </div>

      {/* Provider status */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        {bingEnabled && (
          <span>Bing: {bingLastSyncedAt ? `synced ${new Date(bingLastSyncedAt).toLocaleDateString()}` : 'not synced'}</span>
        )}
        {googleEnabled && (
          <span>Google: {googleLastSyncedAt ? `synced ${new Date(googleLastSyncedAt).toLocaleDateString()}` : 'not synced'}</span>
        )}
      </div>

      {stats.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-3 text-amber-500" />
            <h3 className="font-medium mb-2">No Data Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click &quot;Sync&quot; to pull data from Bing Webmaster Tools, or wait for the weekly automatic sync.
            </p>
            <p className="text-xs text-muted-foreground">
              Note: New sites may take a few weeks to accumulate data in Bing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Queries</span>
                </div>
                <div className="text-2xl font-bold mt-1">{sortedQueries.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Impressions</span>
                </div>
                <div className="text-2xl font-bold mt-1">{totalImpressions.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <MousePointer className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Clicks</span>
                </div>
                <div className="text-2xl font-bold mt-1">{totalClicks.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-muted-foreground">Avg CTR</span>
                </div>
                <div className="text-2xl font-bold mt-1">{avgCtr.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Query Correlation */}
          {matchedQueries.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">Match</Badge>
                  Queries Matching Your Prompts
                </CardTitle>
                <CardDescription>
                  Search queries that align with your generated prompts - validation that your strategy is working
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {matchedQueries.slice(0, 5).map((q, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm font-medium truncate flex-1">{q.query}</span>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{q.totalImpressions} imp</span>
                        <span>{q.totalClicks} clicks</span>
                        {q.positionCount > 0 && (
                          <span>#{q.avgPosition.toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* New Opportunities */}
          {newOpportunities.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Badge variant="outline" className="border-amber-500 text-amber-600">Opportunity</Badge>
                  New Query Opportunities
                </CardTitle>
                <CardDescription>
                  Queries bringing traffic that you&apos;re not explicitly tracking - consider adding prompts for these
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {newOpportunities.map((q, i) => (
                    <div key={i} className="flex items-center justify-between p-2 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded">
                      <span className="text-sm font-medium truncate flex-1">{q.query}</span>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{q.totalImpressions} imp</span>
                        <span>{q.totalClicks} clicks</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* All Queries */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All Search Queries</CardTitle>
              <CardDescription>
                Ranked by impressions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {sortedQueries.slice(0, 50).map((q, i) => (
                  <div key={i} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded text-sm">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-muted-foreground w-6 text-right">{i + 1}</span>
                      <span className="truncate">{q.query}</span>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                      <span className="w-16 text-right">{q.totalImpressions.toLocaleString()} imp</span>
                      <span className="w-12 text-right">{q.totalClicks} clicks</span>
                      {q.positionCount > 0 && (
                        <span className="w-8 text-right">#{q.avgPosition.toFixed(0)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {sortedQueries.length > 50 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Showing top 50 of {sortedQueries.length} queries
                </p>
              )}
            </CardContent>
          </Card>

          {/* Bing Webmaster Link */}
          <div className="flex justify-center">
            <a 
              href="https://www.bing.com/webmasters" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              View full data in Bing Webmaster Tools
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </>
      )}
    </div>
  )
}
