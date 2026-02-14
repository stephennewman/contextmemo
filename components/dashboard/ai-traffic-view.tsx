'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AI_SOURCE_LABELS, AI_SOURCE_COLORS, AIReferrerSource } from '@/lib/supabase/types'
import { Bot, TrendingUp, Globe, ExternalLink, MapPin } from 'lucide-react'

interface TrafficEvent {
  id: string
  memo_id: string | null
  page_url: string
  referrer: string | null
  referrer_source: AIReferrerSource
  timestamp: string
  country?: string | null
  city?: string | null
  region?: string | null
  memo?: { title: string; slug: string } | null
}

interface AITrafficViewProps {
  traffic: TrafficEvent[]
  brandName: string
}

/** Format a visitor location string from available geo data */
function formatLocation(event: TrafficEvent): string | null {
  const parts: string[] = []
  if (event.city) parts.push(event.city)
  if (event.region) parts.push(event.region)
  if (parts.length === 0 && event.country) parts.push(event.country)
  return parts.length > 0 ? parts.join(', ') : null
}

export function AITrafficView({ traffic, brandName }: AITrafficViewProps) {
  // Calculate stats
  const totalVisits = traffic.length
  const aiVisits = traffic.filter(t => 
    !['organic', 'direct_nav', 'direct'].includes(t.referrer_source)
  ).length
  const aiPercentage = totalVisits > 0 ? Math.round((aiVisits / totalVisits) * 100) : 0

  // Group by source
  const bySource = traffic.reduce((acc, t) => {
    acc[t.referrer_source] = (acc[t.referrer_source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Sort sources by count
  const sortedSources = Object.entries(bySource)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  // Get AI sources only
  const aiSources = sortedSources.filter(([source]) => 
    !['organic', 'direct_nav', 'direct'].includes(source)
  )

  // Recent AI visits
  const recentAIVisits = traffic
    .filter(t => !['organic', 'direct_nav', 'direct'].includes(t.referrer_source))
    .slice(0, 10)

  // Top pages by AI traffic
  const pageVisits = traffic
    .filter(t => !['organic', 'direct_nav', 'direct'].includes(t.referrer_source))
    .reduce((acc, t) => {
      const key = t.memo?.slug || t.page_url
      if (!acc[key]) {
        acc[key] = { 
          url: t.page_url, 
          title: t.memo?.title || t.page_url,
          count: 0 
        }
      }
      acc[key].count++
      return acc
    }, {} as Record<string, { url: string; title: string; count: number }>)

  const topPages = Object.values(pageVisits)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  if (totalVisits === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Traffic Attribution
          </CardTitle>
          <CardDescription>
            Track visits to your content from AI platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No traffic data yet.</p>
            <p className="text-sm mt-2">
              Traffic to your public memos will be tracked automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #10B981' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">AI VISITS</p>
                <p className="text-3xl font-bold">{aiVisits}</p>
              </div>
              <Bot className="h-8 w-8 text-[#10B981]" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #8B5CF6' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">AI TRAFFIC %</p>
                <p className="text-3xl font-bold">{aiPercentage}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-[#8B5CF6]" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #0EA5E9' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">TOTAL VISITS</p>
                <p className="text-3xl font-bold">{totalVisits}</p>
              </div>
              <Globe className="h-8 w-8 text-[#0EA5E9]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* AI Sources Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Traffic by AI Source</CardTitle>
            <CardDescription>Which AI platforms are sending traffic</CardDescription>
          </CardHeader>
          <CardContent>
            {aiSources.length > 0 ? (
              <div className="space-y-3">
                {aiSources.map(([source, count]) => {
                  const percentage = Math.round((count / totalVisits) * 100)
                  const color = AI_SOURCE_COLORS[source as AIReferrerSource] || '#6B7280'
                  return (
                    <div key={source} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {AI_SOURCE_LABELS[source as AIReferrerSource] || source}
                        </span>
                        <span className="text-muted-foreground">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all"
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No AI traffic detected yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Pages (AI Traffic)</CardTitle>
            <CardDescription>Content getting the most AI referrals</CardDescription>
          </CardHeader>
          <CardContent>
            {topPages.length > 0 ? (
              <div className="space-y-2">
                {topPages.map((page, i) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{page.title}</p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {page.count} visits
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No AI traffic to specific pages yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent AI Visits */}
      {recentAIVisits.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent AI Visits</CardTitle>
            <CardDescription>Latest traffic from AI platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentAIVisits.map((visit) => {
                const color = AI_SOURCE_COLORS[visit.referrer_source] || '#6B7280'
                const location = formatLocation(visit)
                return (
                  <div key={visit.id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {visit.memo?.title || visit.page_url}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          from {AI_SOURCE_LABELS[visit.referrer_source]}
                          {location && (
                            <span className="inline-flex items-center gap-0.5 ml-1.5">
                              <MapPin className="h-3 w-3 inline" />
                              {location}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(visit.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Embed Code */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Track Your Own Domain
          </CardTitle>
          <CardDescription>
            Add this snippet to track AI traffic on your website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-3 rounded-lg overflow-x-auto">
            <code className="text-xs">
              {`<img src="${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://contextmemo.com' : 'http://localhost:3000'}/api/track?b=BRAND_ID&u={{PAGE_URL}}" style="display:none" />`}
            </code>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Replace BRAND_ID with your brand ID and {"{{PAGE_URL}}"} with the current page URL
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
