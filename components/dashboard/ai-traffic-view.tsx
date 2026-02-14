'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AI_SOURCE_LABELS, AI_SOURCE_COLORS, AIReferrerSource } from '@/lib/supabase/types'
import {
  BOT_CATEGORY_COLORS,
  BOT_CATEGORY_LABELS,
  BOT_CATEGORY_DESCRIPTIONS,
  type BotCategory,
  isAIBot,
} from '@/lib/bot-detection'
import { Bot, TrendingUp, Globe, MapPin, Database, Search, MousePointerClick, Scan, Radar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CrawlEvent {
  id: string
  bot_name: string
  bot_category: string
  bot_display_name: string
  bot_provider: string
  brand_subdomain: string | null
  memo_slug: string | null
  page_path: string
  ip_country: string | null
  ip_city: string | null
  ip_region: string | null
  ip_latitude: number | null
  ip_longitude: number | null
  ip_timezone: string | null
  created_at: string
}

interface HumanTrafficEvent {
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
  crawlEvents: CrawlEvent[]
  humanTraffic: HumanTrafficEvent[]
  brandName: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCrawlLocation(event: CrawlEvent): string | null {
  const parts: string[] = []
  if (event.ip_city) parts.push(event.ip_city)
  if (event.ip_region) parts.push(event.ip_region)
  if (parts.length === 0 && event.ip_country) parts.push(event.ip_country)
  return parts.length > 0 ? parts.join(', ') : null
}

function formatHumanLocation(event: HumanTrafficEvent): string | null {
  const parts: string[] = []
  if (event.city) parts.push(event.city)
  if (event.region) parts.push(event.region)
  if (parts.length === 0 && event.country) parts.push(event.country)
  return parts.length > 0 ? parts.join(', ') : null
}

function formatMemoSlug(slug: string | null): string {
  if (!slug) return '(homepage)'
  // Clean up slug for display — remove prefix paths like "resources/" etc.
  return slug.split('/').pop() || slug
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  ai_training: <Database className="h-3.5 w-3.5" style={{ color: BOT_CATEGORY_COLORS.ai_training }} />,
  ai_search: <Search className="h-3.5 w-3.5" style={{ color: BOT_CATEGORY_COLORS.ai_search }} />,
  ai_user_browse: <MousePointerClick className="h-3.5 w-3.5" style={{ color: BOT_CATEGORY_COLORS.ai_user_browse }} />,
  search_engine: <Globe className="h-3.5 w-3.5" style={{ color: BOT_CATEGORY_COLORS.search_engine }} />,
  seo_tool: <Scan className="h-3.5 w-3.5" style={{ color: BOT_CATEGORY_COLORS.seo_tool }} />,
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AITrafficView({ crawlEvents, humanTraffic, brandName }: AITrafficViewProps) {
  // ── Crawl event stats ──
  const trainingCrawls = crawlEvents.filter(e => e.bot_category === 'ai_training').length
  const searchRetrievals = crawlEvents.filter(e => e.bot_category === 'ai_search').length
  const userClicks = crawlEvents.filter(e => e.bot_category === 'ai_user_browse').length
  const totalAICrawls = trainingCrawls + searchRetrievals + userClicks
  const totalCrawls = crawlEvents.length

  // ── By provider ──
  const byProvider: Record<string, { count: number; categories: Record<string, number> }> = {}
  for (const e of crawlEvents) {
    if (!isAIBot(e.bot_category as BotCategory)) continue
    if (!byProvider[e.bot_provider]) {
      byProvider[e.bot_provider] = { count: 0, categories: {} }
    }
    byProvider[e.bot_provider].count++
    byProvider[e.bot_provider].categories[e.bot_category] = (byProvider[e.bot_provider].categories[e.bot_category] || 0) + 1
  }
  const sortedProviders = Object.entries(byProvider).sort(([, a], [, b]) => b.count - a.count)

  // ── By bot ──
  const byBot: Record<string, { count: number; displayName: string; category: BotCategory; provider: string }> = {}
  for (const e of crawlEvents) {
    if (!byBot[e.bot_name]) {
      byBot[e.bot_name] = { count: 0, displayName: e.bot_display_name, category: e.bot_category as BotCategory, provider: e.bot_provider }
    }
    byBot[e.bot_name].count++
  }
  const sortedBots = Object.entries(byBot).sort(([, a], [, b]) => b.count - a.count)

  // ── Top pages by AI crawls ──
  const pageHits: Record<string, { slug: string; count: number; training: number; search: number; clicks: number }> = {}
  for (const e of crawlEvents) {
    if (!isAIBot(e.bot_category as BotCategory)) continue
    const key = e.memo_slug || '(homepage)'
    if (!pageHits[key]) {
      pageHits[key] = { slug: e.memo_slug || '', count: 0, training: 0, search: 0, clicks: 0 }
    }
    pageHits[key].count++
    if (e.bot_category === 'ai_training') pageHits[key].training++
    else if (e.bot_category === 'ai_search') pageHits[key].search++
    else if (e.bot_category === 'ai_user_browse') pageHits[key].clicks++
  }
  const topPages = Object.entries(pageHits).sort(([, a], [, b]) => b.count - a.count).slice(0, 8)

  // ── Recent crawl events ──
  const recentCrawls = crawlEvents.slice(0, 20)

  // ── Empty state ──
  if (totalCrawls === 0 && humanTraffic.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radar className="h-5 w-5" />
            Traffic Intelligence
          </CardTitle>
          <CardDescription>
            Track bot crawls and visitor traffic to your published content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Radar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No traffic data yet.</p>
            <p className="text-sm mt-2">
              Bot crawls and visitor traffic are tracked automatically once you publish content.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Stats Row: AI Funnel ── */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-[3px] border-[#0F172A]" style={{ borderLeft: `8px solid ${BOT_CATEGORY_COLORS.ai_training}` }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">TRAINING</p>
                <p className="text-3xl font-bold">{trainingCrawls}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Model data collection</p>
              </div>
              <Database className="h-8 w-8" style={{ color: BOT_CATEGORY_COLORS.ai_training }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[3px] border-[#0F172A]" style={{ borderLeft: `8px solid ${BOT_CATEGORY_COLORS.ai_search}` }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">SEARCH</p>
                <p className="text-3xl font-bold">{searchRetrievals}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Real-time retrieval</p>
              </div>
              <Search className="h-8 w-8" style={{ color: BOT_CATEGORY_COLORS.ai_search }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[3px] border-[#0F172A]" style={{ borderLeft: `8px solid ${BOT_CATEGORY_COLORS.ai_user_browse}` }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">CLICKS</p>
                <p className="text-3xl font-bold">{userClicks}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">Human click-throughs</p>
              </div>
              <MousePointerClick className="h-8 w-8" style={{ color: BOT_CATEGORY_COLORS.ai_user_browse }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #6B7280' }}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold tracking-widest text-zinc-500">TOTAL CRAWLS</p>
                <p className="text-3xl font-bold">{totalCrawls}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">All bots (90 days)</p>
              </div>
              <Bot className="h-8 w-8 text-zinc-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── AI Funnel Visualization ── */}
      {totalAICrawls > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              AI Funnel
            </CardTitle>
            <CardDescription>Training → Search → Click — how AI platforms engage with your content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Training Crawls', value: trainingCrawls, color: BOT_CATEGORY_COLORS.ai_training, desc: 'Bots collecting data for model training' },
                { label: 'Search Retrievals', value: searchRetrievals, color: BOT_CATEGORY_COLORS.ai_search, desc: 'AI fetching content to cite in answers' },
                { label: 'User Click-throughs', value: userClicks, color: BOT_CATEGORY_COLORS.ai_user_browse, desc: 'Humans clicking links from AI apps' },
              ].map(row => {
                const max = Math.max(1, trainingCrawls, searchRetrievals, userClicks)
                return (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className="w-36 shrink-0 text-right">
                      <p className="text-xs font-medium text-zinc-700">{row.label}</p>
                      <p className="text-[10px] text-zinc-400">{row.desc}</p>
                    </div>
                    <div className="flex-1 relative h-8 bg-zinc-50 rounded overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded flex items-center px-3"
                        style={{
                          width: row.value > 0 ? `${Math.max(8, (row.value / max) * 100)}%` : '0%',
                          backgroundColor: `${row.color}20`,
                          minWidth: row.value > 0 ? '32px' : '0px',
                        }}
                      >
                        {row.value > 0 && (
                          <span className="text-sm font-bold tabular-nums" style={{ color: row.color }}>{row.value}</span>
                        )}
                      </div>
                      {row.value === 0 && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-300">0</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── Traffic by AI Provider ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Traffic by AI Provider</CardTitle>
            <CardDescription>Which AI platforms are crawling your content</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedProviders.length > 0 ? (
              <div className="space-y-3">
                {sortedProviders.map(([provider, data]) => {
                  const percentage = totalAICrawls > 0 ? Math.round((data.count / totalAICrawls) * 100) : 0
                  return (
                    <div key={provider} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{provider}</span>
                        <span className="text-muted-foreground tabular-nums">{data.count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                        {Object.entries(data.categories)
                          .sort(([, a], [, b]) => b - a)
                          .map(([cat, count]) => (
                            <div
                              key={cat}
                              className="h-full first:rounded-l-full last:rounded-r-full"
                              style={{
                                width: `${(count / data.count) * (percentage > 0 ? percentage : 0)}%`,
                                minWidth: count > 0 ? '2px' : '0',
                                backgroundColor: BOT_CATEGORY_COLORS[cat as BotCategory] || '#6B7280',
                              }}
                              title={`${BOT_CATEGORY_LABELS[cat as BotCategory] || cat}: ${count}`}
                            />
                          ))}
                      </div>
                    </div>
                  )
                })}
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-zinc-100">
                  {(['ai_training', 'ai_search', 'ai_user_browse'] as BotCategory[]).map(cat => (
                    <div key={cat} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: BOT_CATEGORY_COLORS[cat] }} />
                      <span className="text-[10px] text-zinc-400">{BOT_CATEGORY_LABELS[cat]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No AI crawls detected yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Top Pages ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Pages (AI Crawls)</CardTitle>
            <CardDescription>Content getting the most AI attention</CardDescription>
          </CardHeader>
          <CardContent>
            {topPages.length > 0 ? (
              <div className="space-y-2">
                {topPages.map(([key, page]) => (
                  <div key={key} className="flex items-center justify-between p-2 border rounded">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{formatMemoSlug(page.slug)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {page.training > 0 && (
                          <span className="text-[10px] tabular-nums" style={{ color: BOT_CATEGORY_COLORS.ai_training }}>
                            {page.training} train
                          </span>
                        )}
                        {page.search > 0 && (
                          <span className="text-[10px] tabular-nums" style={{ color: BOT_CATEGORY_COLORS.ai_search }}>
                            {page.search} search
                          </span>
                        )}
                        {page.clicks > 0 && (
                          <span className="text-[10px] tabular-nums" style={{ color: BOT_CATEGORY_COLORS.ai_user_browse }}>
                            {page.clicks} click
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="ml-2 tabular-nums">
                      {page.count}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No AI crawls to specific pages yet
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Crawl Events ── */}
      {recentCrawls.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Radar className="h-4 w-4 text-emerald-500" />
              Recent Crawl Events
            </CardTitle>
            <CardDescription>Latest bot and AI crawl activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentCrawls.map((event) => {
                const color = BOT_CATEGORY_COLORS[event.bot_category as BotCategory] || '#6B7280'
                const location = formatCrawlLocation(event)
                const isAI = isAIBot(event.bot_category as BotCategory)
                return (
                  <div key={event.id} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {CATEGORY_ICONS[event.bot_category] || <Bot className="h-3.5 w-3.5 text-zinc-400" />}
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {event.memo_slug ? formatMemoSlug(event.memo_slug) : event.page_path}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium" style={{ color }}>{event.bot_display_name}</span>
                          <span className="mx-1">·</span>
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0"
                            style={{ borderColor: color, color }}
                          >
                            {BOT_CATEGORY_LABELS[event.bot_category as BotCategory] || event.bot_category}
                          </Badge>
                          {location && (
                            <span className="inline-flex items-center gap-0.5 ml-1.5">
                              <MapPin className="h-3 w-3 inline" />
                              {location}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2" title={new Date(event.created_at).toLocaleString()}>
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Bot Breakdown ── */}
      {sortedBots.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Bot Breakdown</CardTitle>
            <CardDescription>Individual bot crawl counts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              {sortedBots.map(([name, info]) => {
                const color = BOT_CATEGORY_COLORS[info.category] || '#6B7280'
                return (
                  <div key={name} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {CATEGORY_ICONS[info.category] || <Bot className="h-3.5 w-3.5 text-zinc-400" />}
                      <span className="text-xs font-medium text-zinc-700 truncate">{info.displayName}</span>
                      <Badge
                        variant="outline"
                        className="text-[8px] font-medium px-1 py-0 shrink-0 cursor-help"
                        style={{ borderColor: color, color }}
                        title={BOT_CATEGORY_DESCRIPTIONS[info.category] || info.category}
                      >
                        {BOT_CATEGORY_LABELS[info.category] || info.category}
                      </Badge>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-zinc-700 ml-2">{info.count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Supplementary: Human Traffic from ai_traffic ── */}
      {humanTraffic.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4 text-amber-500" />
              Human Visitor Traffic
            </CardTitle>
            <CardDescription>Client-side tracked visits (organic search, direct, AI click-throughs where JS executed)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {humanTraffic.slice(0, 15).map((visit) => {
                const isAI = !['organic', 'direct_nav', 'direct'].includes(visit.referrer_source)
                const color = AI_SOURCE_COLORS[visit.referrer_source] || '#6B7280'
                const location = formatHumanLocation(visit)
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
                          {isAI && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mr-1.5">AI</Badge>
                          )}
                          {AI_SOURCE_LABELS[visit.referrer_source] || visit.referrer_source}
                          {location && (
                            <span className="inline-flex items-center gap-0.5 ml-1.5">
                              <MapPin className="h-3 w-3 inline" />
                              {location}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {formatDistanceToNow(new Date(visit.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
