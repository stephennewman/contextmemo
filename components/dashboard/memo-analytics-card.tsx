'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AI_SOURCE_LABELS, AI_SOURCE_COLORS, AIReferrerSource } from '@/lib/supabase/types'
import { Bot, TrendingUp, Globe, Eye, Users, Loader2, Search, MapPin } from 'lucide-react'

interface MemoAnalytics {
  summary: {
    totalViews: number
    aiViews: number
    organicViews: number
    directViews: number
    aiPercentage: number
  }
  bySource: Record<string, number>
  byDate: Record<string, { total: number; ai: number; organic: number }>
  byCountry: Record<string, number>
  recentVisits: Array<{
    id: string
    source: AIReferrerSource
    referrer: string | null
    country: string | null
    city: string | null
    region: string | null
    timestamp: string
  }>
  seoStats: {
    totalImpressions: number
    totalClicks: number
    avgPosition: number
    ctr: number
    topQueries: Array<{ query: string; impressions: number; clicks: number }>
    provider: string
  } | null
  period: {
    days: number
    startDate: string
    endDate: string
  }
}

interface MemoAnalyticsCardProps {
  brandId: string
  memoId: string
}

export function MemoAnalyticsCard({ brandId, memoId }: MemoAnalyticsCardProps) {
  const [analytics, setAnalytics] = useState<MemoAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch(`/api/brands/${brandId}/memos/${memoId}/analytics`)
        if (!response.ok) {
          throw new Error('Failed to fetch analytics')
        }
        const data = await response.json()
        setAnalytics(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [brandId, memoId])

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <CardTitle className="text-base">Analytics</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) return null

  const { summary, bySource, recentVisits, seoStats } = analytics

  // Get AI sources only (sorted by count)
  const aiSources = Object.entries(bySource)
    .filter(([source]) => !['organic', 'direct_nav', 'direct'].includes(source))
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const hasTraffic = summary.totalViews > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Page Analytics
        </CardTitle>
        <CardDescription>
          Last {analytics.period.days} days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Globe className="h-3 w-3" />
              <span className="text-[10px] font-medium uppercase tracking-wider">Views</span>
            </div>
            <p className="text-2xl font-bold">{summary.totalViews}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
              <Bot className="h-3 w-3" />
              <span className="text-[10px] font-medium uppercase tracking-wider">AI</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{summary.aiViews}</p>
          </div>
        </div>

        {hasTraffic && (
          <>
            {/* AI Percentage Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">AI Traffic</span>
                <span className="font-medium">{summary.aiPercentage}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${summary.aiPercentage}%` }}
                />
              </div>
            </div>

            {/* Traffic Breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Organic Search</span>
                <span className="font-mono">{summary.organicViews}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Direct</span>
                <span className="font-mono">{summary.directViews}</span>
              </div>
            </div>

            {/* AI Source Breakdown */}
            {aiSources.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  AI Sources
                </p>
                <div className="space-y-1.5">
                  {aiSources.map(([source, count]) => {
                    const color = AI_SOURCE_COLORS[source as AIReferrerSource] || '#6B7280'
                    const label = AI_SOURCE_LABELS[source as AIReferrerSource] || source
                    return (
                      <div key={source} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span>{label}</span>
                        </div>
                        <span className="font-mono text-muted-foreground">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* SEO Stats */}
            {seoStats && (
              <div className="pt-2 border-t">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  SEO Performance
                </p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-blue-50 rounded p-2 text-center">
                    <p className="text-lg font-bold text-blue-600">{seoStats.totalImpressions.toLocaleString()}</p>
                    <p className="text-[10px] text-blue-500">Impressions</p>
                  </div>
                  <div className="bg-blue-50 rounded p-2 text-center">
                    <p className="text-lg font-bold text-blue-600">{seoStats.totalClicks.toLocaleString()}</p>
                    <p className="text-[10px] text-blue-500">Clicks</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Avg Position</span>
                    <span className="font-mono">{seoStats.avgPosition}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">CTR</span>
                    <span className="font-mono">{seoStats.ctr}%</span>
                  </div>
                </div>
                {seoStats.topQueries.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[10px] text-muted-foreground mb-1.5">Top Queries</p>
                    <div className="space-y-1">
                      {seoStats.topQueries.slice(0, 3).map((q, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="truncate flex-1 mr-2">{q.query}</span>
                          <span className="text-muted-foreground font-mono shrink-0">{q.clicks}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recent AI Visits */}
            {recentVisits.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Recent Visits
                </p>
                <div className="space-y-1.5">
                  {recentVisits.slice(0, 5).map((visit) => {
                    const color = AI_SOURCE_COLORS[visit.source] || '#6B7280'
                    const isAI = !['organic', 'direct_nav', 'direct'].includes(visit.source)
                    const locationParts: string[] = []
                    if (visit.city) locationParts.push(visit.city)
                    if (visit.region) locationParts.push(visit.region)
                    if (locationParts.length === 0 && visit.country) locationParts.push(visit.country)
                    const location = locationParts.length > 0 ? locationParts.join(', ') : null
                    return (
                      <div key={visit.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div 
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className={`truncate ${isAI ? 'font-medium' : 'text-muted-foreground'}`}>
                            {AI_SOURCE_LABELS[visit.source]}
                            {location && (
                              <span className="font-normal text-muted-foreground ml-1">
                                <MapPin className="h-2.5 w-2.5 inline -mt-px" /> {location}
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-muted-foreground shrink-0 ml-2">
                          {new Date(visit.timestamp).toLocaleDateString(undefined, { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {!hasTraffic && (
          <div className="text-center py-4 text-muted-foreground">
            <Bot className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">No traffic recorded yet</p>
            <p className="text-[10px] mt-1">
              Publish this memo to start tracking visits
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
