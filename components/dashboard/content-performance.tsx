'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Eye,
  Bot,
  Globe,
  ExternalLink,
  ArrowUpFromLine,
  TrendingUp,
  BarChart3,
  Clock,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { AI_SOURCE_LABELS, type AIReferrerSource } from '@/lib/supabase/types'

interface Memo {
  id: string
  title: string
  slug: string
  status: string
  memo_type: string
  created_at: string
  published_at: string | null
  schema_json: Record<string, unknown> | null
}

interface TrafficEvent {
  id: string
  memo_id: string | null
  page_url: string
  referrer: string | null
  referrer_source: string
  country: string | null
  timestamp: string
}

interface ContentPerformanceProps {
  brandId: string
  brandName: string
  brandSubdomain: string
  memos: Memo[]
  traffic: TrafficEvent[]
}

const TYPE_LABELS: Record<string, string> = {
  comparison: 'Comparison',
  industry: 'Guide',
  how_to: 'How-To',
  alternative: 'Alternative',
  response: 'Response',
  resource: 'Resource',
}

export function ContentPerformance({ brandId, brandName, brandSubdomain, memos, traffic }: ContentPerformanceProps) {
  // --- Content stats ---
  const published = memos.filter(m => m.status === 'published')
  const drafts = memos.filter(m => m.status === 'draft')
  const onHubSpot = memos.filter(m => m.schema_json?.hubspot_post_id)
  const onContextMemo = published.filter(m => !m.schema_json?.hubspot_post_id)

  // By type
  const byType = memos.reduce((acc, m) => {
    const t = m.memo_type || 'other'
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // --- Traffic stats ---
  const aiTraffic = traffic.filter(t =>
    !['organic', 'direct_nav', 'direct'].includes(t.referrer_source)
  )
  const organicTraffic = traffic.filter(t => t.referrer_source === 'organic')

  // By source
  const bySource = traffic.reduce((acc, t) => {
    acc[t.referrer_source] = (acc[t.referrer_source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Per-memo view counts
  const viewsByMemo = traffic.reduce((acc, t) => {
    if (t.memo_id) {
      if (!acc[t.memo_id]) acc[t.memo_id] = { total: 0, ai: 0, organic: 0 }
      acc[t.memo_id].total++
      if (!['organic', 'direct_nav', 'direct'].includes(t.referrer_source)) {
        acc[t.memo_id].ai++
      } else if (t.referrer_source === 'organic') {
        acc[t.memo_id].organic++
      }
    }
    return acc
  }, {} as Record<string, { total: number; ai: number; organic: number }>)

  // Traffic by date for sparkline
  const trafficByDate = traffic.reduce((acc, t) => {
    const date = new Date(t.timestamp).toISOString().split('T')[0]
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Recent traffic events
  const recentTraffic = traffic.slice(0, 15)

  // Content creation timeline (last 8 weeks)
  const eightWeeksAgo = new Date()
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)
  const weeklyCreation = memos
    .filter(m => new Date(m.created_at) >= eightWeeksAgo)
    .reduce((acc, m) => {
      const date = new Date(m.created_at)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const key = weekStart.toISOString().split('T')[0]
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  const hasTraffic = traffic.length > 0

  return (
    <div className="space-y-4">
      {/* Summary Story */}
      <Card className="border-l-4 border-l-[#0EA5E9]">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <BarChart3 className="h-5 w-5 text-[#0EA5E9] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#0F172A]">
                {brandName} has {published.length} published memo{published.length !== 1 ? 's' : ''}
                {onHubSpot.length > 0 && ` (${onHubSpot.length} on HubSpot, ${onContextMemo.length} on contextmemo.com)`}
                {onHubSpot.length === 0 && ` on contextmemo.com`}
              </p>
              {hasTraffic ? (
                <p className="text-sm text-zinc-500 mt-1">
                  {traffic.length} tracked view{traffic.length !== 1 ? 's' : ''} in the last 90 days
                  {aiTraffic.length > 0 && ` · ${aiTraffic.length} from AI platforms`}
                  {organicTraffic.length > 0 && ` · ${organicTraffic.length} organic`}
                </p>
              ) : (
                <p className="text-sm text-zinc-400 mt-1">
                  No external traffic tracked yet. Views from AI platforms, search engines, and social media will appear here as your content gets discovered.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Published"
          value={published.length}
          icon={<FileText className="h-4 w-4" />}
          color="#0EA5E9"
          sub={drafts.length > 0 ? `${drafts.length} draft${drafts.length !== 1 ? 's' : ''}` : undefined}
        />
        <StatCard
          label="Total Views"
          value={traffic.length}
          icon={<Eye className="h-4 w-4" />}
          color="#8B5CF6"
          sub={hasTraffic ? `last 90 days` : 'awaiting traffic'}
        />
        <StatCard
          label="AI Traffic"
          value={aiTraffic.length}
          icon={<Bot className="h-4 w-4" />}
          color="#10B981"
          sub={hasTraffic && traffic.length > 0
            ? `${Math.round((aiTraffic.length / traffic.length) * 100)}% of total`
            : undefined}
        />
        <StatCard
          label="Organic"
          value={organicTraffic.length}
          icon={<Globe className="h-4 w-4" />}
          color="#F59E0B"
          sub={hasTraffic && traffic.length > 0
            ? `${Math.round((organicTraffic.length / traffic.length) * 100)}% of total`
            : undefined}
        />
      </div>

      {/* Content Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Content By Type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Content by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(byType).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(byType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-zinc-600">{TYPE_LABELS[type] || type}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-zinc-100 rounded-full h-2">
                          <div
                            className="bg-[#0EA5E9] h-2 rounded-full"
                            style={{ width: `${Math.max(8, (count / memos.length) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-zinc-700 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No memos yet</p>
            )}
          </CardContent>
        </Card>

        {/* Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9]" />
                  <span className="text-sm text-zinc-600">contextmemo.com</span>
                </div>
                <span className="text-sm font-medium">{onContextMemo.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F97316]" />
                  <span className="text-sm text-zinc-600">HubSpot</span>
                </div>
                <span className="text-sm font-medium">{onHubSpot.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-300" />
                  <span className="text-sm text-zinc-600">Drafts</span>
                </div>
                <span className="text-sm font-medium">{drafts.length}</span>
              </div>

              {/* Visual bar */}
              {published.length > 0 && (
                <div className="flex h-3 rounded-full overflow-hidden bg-zinc-100 mt-2">
                  {onContextMemo.length > 0 && (
                    <div
                      className="bg-[#0EA5E9] transition-all"
                      style={{ width: `${(onContextMemo.length / memos.length) * 100}%` }}
                      title={`${onContextMemo.length} on contextmemo.com`}
                    />
                  )}
                  {onHubSpot.length > 0 && (
                    <div
                      className="bg-[#F97316] transition-all"
                      style={{ width: `${(onHubSpot.length / memos.length) * 100}%` }}
                      title={`${onHubSpot.length} on HubSpot`}
                    />
                  )}
                  {drafts.length > 0 && (
                    <div
                      className="bg-zinc-300 transition-all"
                      style={{ width: `${(drafts.length / memos.length) * 100}%` }}
                      title={`${drafts.length} drafts`}
                    />
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic by Source (only show if there's traffic) */}
      {hasTraffic && Object.keys(bySource).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Traffic by Source</CardTitle>
            <CardDescription>Last 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(bySource)
                .sort(([, a], [, b]) => b - a)
                .map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {!['organic', 'direct_nav', 'direct'].includes(source) ? (
                        <Bot className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Globe className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      <span className="text-sm text-zinc-600">
                        {AI_SOURCE_LABELS[source as AIReferrerSource] || source}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-zinc-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            !['organic', 'direct_nav', 'direct'].includes(source)
                              ? 'bg-emerald-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.max(8, (count / traffic.length) * 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-zinc-700 w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-Memo Performance Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">Memo Performance</CardTitle>
          <CardDescription>
            {published.length} published memo{published.length !== 1 ? 's' : ''} · sorted by views
          </CardDescription>
        </CardHeader>
        <CardContent>
          {published.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-semibold text-zinc-500 text-xs">MEMO</th>
                    <th className="pb-2 font-semibold text-zinc-500 text-xs text-center w-16">TYPE</th>
                    <th className="pb-2 font-semibold text-zinc-500 text-xs text-center w-16">WHERE</th>
                    <th className="pb-2 font-semibold text-zinc-500 text-xs text-right w-16">VIEWS</th>
                    <th className="pb-2 font-semibold text-zinc-500 text-xs text-right w-12">AI</th>
                    <th className="pb-2 font-semibold text-zinc-500 text-xs text-right w-20">CREATED</th>
                  </tr>
                </thead>
                <tbody>
                  {published
                    .sort((a, b) => {
                      const va = viewsByMemo[a.id]?.total || 0
                      const vb = viewsByMemo[b.id]?.total || 0
                      if (vb !== va) return vb - va
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    })
                    .map(memo => {
                      const views = viewsByMemo[memo.id] || { total: 0, ai: 0, organic: 0 }
                      const isOnHubSpot = !!memo.schema_json?.hubspot_post_id
                      const memoUrl = `/memo/${brandSubdomain}/${memo.slug}`

                      return (
                        <tr key={memo.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 group">
                          <td className="py-2 pr-3">
                            <a
                              href={memoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-700 hover:text-[#0EA5E9] font-medium flex items-center gap-1"
                            >
                              <span className="line-clamp-1">{memo.title}</span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 shrink-0" />
                            </a>
                          </td>
                          <td className="py-2 text-center">
                            <Badge variant="outline" className="text-[10px] font-medium">
                              {TYPE_LABELS[memo.memo_type] || memo.memo_type}
                            </Badge>
                          </td>
                          <td className="py-2 text-center">
                            {isOnHubSpot ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600">
                                <ArrowUpFromLine className="h-3 w-3" />
                                HS
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-sky-600">CM</span>
                            )}
                          </td>
                          <td className="py-2 text-right font-medium tabular-nums">
                            {views.total > 0 ? views.total : (
                              <span className="text-zinc-300">—</span>
                            )}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {views.ai > 0 ? (
                              <span className="text-emerald-600 font-medium">{views.ai}</span>
                            ) : (
                              <span className="text-zinc-300">—</span>
                            )}
                          </td>
                          <td className="py-2 text-right text-zinc-400 text-xs">
                            {formatDistanceToNow(new Date(memo.created_at), { addSuffix: true })}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-zinc-400 py-4 text-center">No published memos yet</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Traffic Events (only show if there's traffic) */}
      {recentTraffic.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Recent Traffic</CardTitle>
            <CardDescription>Latest visits to your content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentTraffic.map(event => {
                const memo = memos.find(m => m.id === event.memo_id)
                const isAI = !['organic', 'direct_nav', 'direct'].includes(event.referrer_source)
                return (
                  <div key={event.id} className="flex items-center gap-3 py-1.5 border-b border-zinc-50 last:border-0">
                    {isAI ? (
                      <Bot className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Globe className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-700 truncate">
                        {memo?.title || event.page_url}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {AI_SOURCE_LABELS[event.referrer_source as AIReferrerSource] || event.referrer_source}
                        {event.country && ` · ${event.country}`}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-400 shrink-0">
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracking Info Note */}
      <div className="px-3 py-2 bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-400">
        <span className="font-semibold text-zinc-500">Tracking:</span>{' '}
        Views are tracked on all {brandSubdomain}.contextmemo.com pages. 
        AI traffic from ChatGPT, Perplexity, Claude, Gemini, and other AI platforms is identified automatically. 
        HubSpot-hosted content is tracked separately in HubSpot&apos;s own analytics.
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color, sub }: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  sub?: string
}) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <span style={{ color }} className="opacity-70">{icon}</span>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-2xl font-bold text-[#0F172A] tabular-nums">{value}</p>
        {sub && <p className="text-[11px] text-zinc-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}
