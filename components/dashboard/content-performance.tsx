'use client'

import { useState } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Bot,
  Globe,
  ExternalLink,
  ArrowUpFromLine,
  Radar,
  Search,
  Scan,
  ChevronDown,
  ChevronUp,
  MousePointerClick,
  MessageSquare,
  Database,
  MapPin,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { AI_SOURCE_LABELS, type AIReferrerSource } from '@/lib/supabase/types'
import { BOT_CATEGORY_COLORS, BOT_CATEGORY_DESCRIPTIONS, BOT_CATEGORY_LABELS, type BotCategory } from '@/lib/bot-detection'
import { classifyOrg, type OrgType } from '@/lib/ip-enrichment'

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
  ip_org_name: string | null
}

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
  ip_org_name: string | null
  ip_asn: string | null
  created_at: string
}

interface ContentPerformanceProps {
  brandId: string
  brandName: string
  brandSubdomain: string
  brandCustomDomain?: string | null
  brandDomainVerified?: boolean | null
  memos: Memo[]
  traffic: TrafficEvent[]
  crawlEvents?: CrawlEvent[]
}

const TYPE_LABELS: Record<string, string> = {
  comparison: 'Comparison',
  industry: 'Guide',
  guide: 'Guide',
  how_to: 'How-To',
  how: 'How-To',
  alternative: 'Alternative',
  response: 'Response',
  resource: 'Resource',
  gap_fill: 'Gap Fill',
}

const DEFAULT_AI_BOTS: Array<{ name: string; displayName: string; category: BotCategory; provider: string }> = [
  { name: 'chatgpt-user', displayName: 'ChatGPT User', category: 'ai_user_browse', provider: 'OpenAI' },
  { name: 'oai-searchbot', displayName: 'ChatGPT Search', category: 'ai_search', provider: 'OpenAI' },
  { name: 'gptbot', displayName: 'GPTBot', category: 'ai_training', provider: 'OpenAI' },
  { name: 'claudebot', displayName: 'ClaudeBot', category: 'ai_training', provider: 'Anthropic' },
  { name: 'claude-searchbot', displayName: 'Claude Search', category: 'ai_search', provider: 'Anthropic' },
  { name: 'perplexitybot', displayName: 'PerplexityBot', category: 'ai_search', provider: 'Perplexity' },
  { name: 'google-extended', displayName: 'Google AI', category: 'ai_training', provider: 'Google' },
  { name: 'applebot-extended', displayName: 'Apple Intelligence', category: 'ai_training', provider: 'Apple' },
  { name: 'meta-externalagent', displayName: 'Meta AI', category: 'ai_training', provider: 'Meta' },
  { name: 'googlebot', displayName: 'Googlebot', category: 'search_engine', provider: 'Google' },
  { name: 'bingbot', displayName: 'Bingbot', category: 'search_engine', provider: 'Microsoft' },
]

const CATEGORY_LABEL: Record<string, string> = {
  ai_training: 'training',
  ai_search: 'search',
  ai_user_browse: 'user',
  search_engine: 'search',
  seo_tool: 'seo',
}

function isAICategory(cat: string) {
  return cat === 'ai_training' || cat === 'ai_search' || cat === 'ai_user_browse'
}

export function ContentPerformance({ brandId, brandName, brandSubdomain, brandCustomDomain, brandDomainVerified, memos, traffic, crawlEvents = [] }: ContentPerformanceProps) {
  const published = memos.filter(m => m.status === 'published')
  const drafts = memos.filter(m => m.status === 'draft')
  const onHubSpot = memos.filter(m => m.schema_json?.hubspot_post_id)
  const onContextMemo = published.filter(m => !m.schema_json?.hubspot_post_id)

  // Normalize type aliases so they group together
  const TYPE_ALIASES: Record<string, string> = { industry: 'guide', how: 'how_to' }
  const byType = memos.reduce((acc, m) => {
    let t = (m.memo_type || 'other').toLowerCase()
    t = TYPE_ALIASES[t] || t
    acc[t] = (acc[t] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const aiTraffic = traffic.filter(t => !['organic', 'direct_nav', 'direct'].includes(t.referrer_source))
  const organicTraffic = traffic.filter(t => t.referrer_source === 'organic')

  const bySource = traffic.reduce((acc, t) => {
    acc[t.referrer_source] = (acc[t.referrer_source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

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

  const hasTraffic = traffic.length > 0

  // Bot crawl
  const aiCrawlEvents = crawlEvents.filter(e => isAICategory(e.bot_category))

  const crawlsByBot: Record<string, { count: number; displayName: string; category: BotCategory; provider: string; lastSeen: string | null }> = {}
  for (const e of crawlEvents) {
    if (!crawlsByBot[e.bot_name]) {
      crawlsByBot[e.bot_name] = { count: 0, displayName: e.bot_display_name, category: e.bot_category as BotCategory, provider: e.bot_provider, lastSeen: e.created_at }
    }
    crawlsByBot[e.bot_name].count++
  }
  for (const bot of DEFAULT_AI_BOTS) {
    if (!crawlsByBot[bot.name]) {
      crawlsByBot[bot.name] = { count: 0, displayName: bot.displayName, category: bot.category, provider: bot.provider, lastSeen: null }
    }
  }
  const sortedBots = Object.entries(crawlsByBot).sort(([, a], [, b]) => {
    if (b.count !== a.count) return b.count - a.count
    return a.displayName.localeCompare(b.displayName)
  })

  // 7-day sparkline
  const now = new Date()
  const days7: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    days7.push(d.toISOString().split('T')[0])
  }
  const sparklineByBot: Record<string, number[]> = {}
  for (const [botName] of sortedBots) sparklineByBot[botName] = days7.map(() => 0)
  for (const e of crawlEvents) {
    const day = new Date(e.created_at).toISOString().split('T')[0]
    const idx = days7.indexOf(day)
    if (idx !== -1 && sparklineByBot[e.bot_name]) sparklineByBot[e.bot_name][idx]++
  }

  // ── By AI provider (for provider breakdown section) ──
  const byProvider: Record<string, { count: number; categories: Record<string, number> }> = {}
  for (const e of crawlEvents) {
    if (!isAICategory(e.bot_category)) continue
    if (!byProvider[e.bot_provider]) {
      byProvider[e.bot_provider] = { count: 0, categories: {} }
    }
    byProvider[e.bot_provider].count++
    byProvider[e.bot_provider].categories[e.bot_category] = (byProvider[e.bot_provider].categories[e.bot_category] || 0) + 1
  }
  const sortedProviders = Object.entries(byProvider).sort(([, a], [, b]) => b.count - a.count)
  const totalAIProviderCrawls = sortedProviders.reduce((sum, [, d]) => sum + d.count, 0)

  // ── Visitor organizations (IP-to-company intelligence) ──
  // Combine orgs from both bot crawls and human traffic
  const orgCounts: Record<string, { count: number; orgType: OrgType; sources: Set<string>; lastSeen: string }> = {}
  for (const e of crawlEvents) {
    if (!e.ip_org_name) continue
    if (!orgCounts[e.ip_org_name]) {
      orgCounts[e.ip_org_name] = { count: 0, orgType: classifyOrg(e.ip_org_name), sources: new Set(), lastSeen: e.created_at }
    }
    orgCounts[e.ip_org_name].count++
    orgCounts[e.ip_org_name].sources.add(e.bot_category)
  }
  for (const t of traffic) {
    if (!t.ip_org_name) continue
    if (!orgCounts[t.ip_org_name]) {
      orgCounts[t.ip_org_name] = { count: 0, orgType: classifyOrg(t.ip_org_name), sources: new Set(), lastSeen: t.timestamp }
    }
    orgCounts[t.ip_org_name].count++
    orgCounts[t.ip_org_name].sources.add('human_visit')
  }
  // Business orgs first (the interesting ones), then everything else
  const businessOrgs = Object.entries(orgCounts)
    .filter(([, d]) => d.orgType === 'business')
    .sort(([, a], [, b]) => b.count - a.count)
  const otherOrgs = Object.entries(orgCounts)
    .filter(([, d]) => d.orgType !== 'business')
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 6)

  // ── Recent crawl events (for geo-tagged event list) ──
  const recentCrawlEvents = crawlEvents.slice(0, 15)

  // Per-memo last AI crawl — index by exact slug AND by base name (after prefix)
  // so "resources/sales-strategies" matches both the exact slug and just "sales-strategies"
  const lastAICrawlBySlug: Record<string, { botDisplayName: string; botCategory: string; timestamp: string }> = {}
  for (const event of aiCrawlEvents) {
    if (event.memo_slug && !lastAICrawlBySlug[event.memo_slug]) {
      lastAICrawlBySlug[event.memo_slug] = { botDisplayName: event.bot_display_name, botCategory: event.bot_category, timestamp: event.created_at }
    }
  }

  // Helper to find last crawl for a memo — tries exact slug, then base name match
  function findLastCrawl(memoSlug: string) {
    if (lastAICrawlBySlug[memoSlug]) return lastAICrawlBySlug[memoSlug]
    // Try matching on base name (everything after first /)
    const baseName = memoSlug.includes('/') ? memoSlug.split('/').slice(1).join('/') : memoSlug
    for (const [crawlSlug, data] of Object.entries(lastAICrawlBySlug)) {
      const crawlBase = crawlSlug.includes('/') ? crawlSlug.split('/').slice(1).join('/') : crawlSlug
      if (crawlBase === baseName) return data
    }
    return null
  }

  // Helper to match crawl slug → memo slug (base name fallback)
  function slugMatchesMemo(crawlSlug: string, memoSlug: string): boolean {
    if (crawlSlug === memoSlug) return true
    const crawlBase = crawlSlug.includes('/') ? crawlSlug.split('/').slice(1).join('/') : crawlSlug
    const memoBase = memoSlug.includes('/') ? memoSlug.split('/').slice(1).join('/') : memoSlug
    return crawlBase === memoBase
  }

  // Precompute crawl counts per memo by category
  const memoCrawls: Record<string, { training: number; searches: number; clicks: number }> = {}
  for (const memo of published) {
    const counts = { training: 0, searches: 0, clicks: 0 }
    for (const event of crawlEvents) {
      if (event.memo_slug && slugMatchesMemo(event.memo_slug, memo.slug)) {
        if (event.bot_category === 'ai_training') counts.training++
        else if (event.bot_category === 'ai_search') counts.searches++
        else if (event.bot_category === 'ai_user_browse') counts.clicks++
      }
    }
    memoCrawls[memo.id] = counts
  }

  // ── Sort state ──
  type SortColumn = 'title' | 'type' | 'where' | 'views' | 'ai' | 'training' | 'searches' | 'clicks' | 'lastCrawled' | 'created'
  type SortDirection = 'asc' | 'desc'
  const [sortColumn, setSortColumn] = useState<SortColumn>('created')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  function handleSort(col: SortColumn) {
    if (sortColumn === col) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(col)
      // Default direction: text columns → asc, numeric/date → desc
      setSortDirection(col === 'title' || col === 'type' ? 'asc' : 'desc')
    }
  }

  function getSortValue(memo: Memo) {
    const views = viewsByMemo[memo.id] || { total: 0, ai: 0, organic: 0 }
    const crawl = findLastCrawl(memo.slug)
    const mc = memoCrawls[memo.id] || { training: 0, searches: 0, clicks: 0 }
    switch (sortColumn) {
      case 'title': return memo.title.toLowerCase()
      case 'type': return (TYPE_LABELS[(TYPE_ALIASES[(memo.memo_type || 'other').toLowerCase()] || (memo.memo_type || 'other').toLowerCase())] || memo.memo_type || 'other').toLowerCase()
      case 'where': return memo.schema_json?.hubspot_post_id ? 1 : 0
      case 'views': return views.total
      case 'ai': return views.ai
      case 'training': return mc.training
      case 'searches': return mc.searches
      case 'clicks': return mc.clicks
      case 'lastCrawled': return crawl ? new Date(crawl.timestamp).getTime() : 0
      case 'created': return new Date(memo.created_at).getTime()
    }
  }

  const sortedMemos = [...published].sort((a, b) => {
    const va = getSortValue(a)
    const vb = getSortValue(b)
    const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
    return sortDirection === 'asc' ? cmp : -cmp
  })

  return (
    <Card className="gap-4">
      {/* ── Card Header ── */}
      <CardHeader>
        <CardTitle className="text-base">Performance</CardTitle>
        <CardDescription>
          {published.length} published memo{published.length !== 1 ? 's' : ''}
          {hasTraffic && ` · ${traffic.length} view${traffic.length !== 1 ? 's' : ''} (90d)`}
          {aiCrawlEvents.length > 0 && ` · ${aiCrawlEvents.length} AI bot crawl${aiCrawlEvents.length !== 1 ? 's' : ''}`}
        </CardDescription>
      </CardHeader>

      {/* ── Summary Stats (only show non-zero) ── */}
      {(() => {
        const stats: { label: string; value: number; color: string; sub?: string }[] = []
        if (published.length > 0) stats.push({ label: 'Published', value: published.length, color: '#0EA5E9', sub: drafts.length > 0 ? `${drafts.length} draft${drafts.length !== 1 ? 's' : ''}` : undefined })
        if (traffic.length > 0) stats.push({ label: 'Visitors', value: traffic.length, color: '#8B5CF6', sub: 'last 90 days' })
        if (businessOrgs.length > 0) stats.push({ label: 'Companies', value: businessOrgs.length, color: '#0EA5E9', sub: 'identified' })
        if (aiTraffic.length > 0) stats.push({ label: 'AI Referrals', value: aiTraffic.length, color: '#10B981', sub: traffic.length > 0 ? `${Math.round((aiTraffic.length / traffic.length) * 100)}% of visitors` : undefined })
        if (stats.length === 0) return null
        const colClass = stats.length <= 2 ? 'grid-cols-2' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'
        return (
          <>
            <div className="mx-6 border-t border-zinc-200" />
            <div className={`px-6 grid ${colClass} gap-4`}>
              {stats.map(s => <InlineStat key={s.label} label={s.label} value={s.value} color={s.color} sub={s.sub} />)}
            </div>
          </>
        )
      })()}

      {/* ── Trending Bot Activity (prominent charts for bots with data) ── */}
      {(() => {
        // Get bots with actual crawl data, ChatGPT User first
        const trendingBots = sortedBots
          .filter(([, info]) => info.count > 0)
          .sort(([nameA, a], [nameB, b]) => {
            // ChatGPT User always first
            if (nameA === 'chatgpt-user') return -1
            if (nameB === 'chatgpt-user') return 1
            return b.count - a.count
          })
          .slice(0, 6)
        if (trendingBots.length === 0) return null
        return (
          <>
            <div className="mx-6 border-t border-zinc-200" />
            <div className="px-6">
              <SectionHeader icon={<Radar className="h-4 w-4 text-emerald-500" />} title="Trending Activity" sub="7-day bot crawl trends" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
                {trendingBots.map(([botName, info]) => {
                  const sparkline = sparklineByBot[botName] || days7.map(() => 0)
                  const sparkMax = Math.max(1, ...sparkline)
                  const categoryColor = BOT_CATEGORY_COLORS[info.category] || '#6B7280'
                  return (
                    <div key={botName} className="border border-zinc-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <Scan className="h-3.5 w-3.5" style={{ color: categoryColor }} />
                          <span className="text-xs font-semibold text-zinc-700">{info.displayName}</span>
                          <Badge variant="outline" className="text-[8px] font-medium px-1 py-0" style={{ borderColor: categoryColor, color: categoryColor }}>
                            {CATEGORY_LABEL[info.category] || info.category}
                          </Badge>
                        </div>
                        <span className="text-sm font-bold tabular-nums" style={{ color: categoryColor }}>{info.count}</span>
                      </div>
                      <div className="flex items-end gap-1 h-10">
                        {sparkline.map((val, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                            <div
                              className="w-full rounded-sm"
                              style={{
                                height: val > 0 ? `${Math.max(15, (val / sparkMax) * 100)}%` : '2px',
                                backgroundColor: val > 0 ? categoryColor : '#e4e4e7',
                                opacity: val > 0 ? 0.6 : 0.25,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-zinc-300">{days7[0].slice(5)}</span>
                        <span className="text-[9px] text-zinc-300">{days7[6].slice(5)}</span>
                      </div>
                      {info.lastSeen && (
                        <p className="text-[10px] text-zinc-400 mt-1">Last seen {formatDistanceToNow(new Date(info.lastSeen), { addSuffix: true })}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )
      })()}

      {/* ── Company Intelligence (hero section) ── */}
      {(businessOrgs.length > 0 || otherOrgs.length > 0) && (
        <>
          <div className="mx-6 border-t border-zinc-200" />
          <div className="px-6">
            {businessOrgs.length > 0 && (
              <>
                <SectionHeader icon={<Globe className="h-4 w-4 text-sky-500" />} title="Companies Visiting Your Content" sub={`${businessOrgs.length} identified`} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                  {businessOrgs.slice(0, 12).map(([org, data]) => {
                    const sources = Array.from(data.sources)
                    return (
                      <div key={org} className="flex items-center justify-between p-2.5 border-2 border-sky-100 bg-sky-50/30 rounded">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-zinc-800 truncate">{org}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {sources.map(src => (
                              <div
                                key={src}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: BOT_CATEGORY_COLORS[src as BotCategory] || (src === 'human_visit' ? '#F59E0B' : '#6B7280') }}
                                title={src === 'human_visit' ? 'Human Visit' : (BOT_CATEGORY_LABELS[src as BotCategory] || src)}
                              />
                            ))}
                            <span className="text-[10px] text-zinc-400 ml-0.5">
                              {formatDistanceToNow(new Date(data.lastSeen), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-bold tabular-nums text-sky-700 ml-2">{data.count}</span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {otherOrgs.length > 0 && (
              <div className={businessOrgs.length > 0 ? 'mt-4' : ''}>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Infrastructure &amp; ISPs
                </p>
                <div className="flex flex-wrap gap-2">
                  {otherOrgs.map(([org, data]) => (
                    <span key={org} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-50 border border-zinc-100 rounded text-[10px] text-zinc-500">
                      {org}
                      <span className="font-semibold text-zinc-400">{data.count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-zinc-400 mt-3">
              Companies identified via IP network registration. Corporate network visitors show their company name. Remote/home workers show under their ISP.
            </p>
          </div>
        </>
      )}

      {/* ── Visitor Traffic by Source + Content Breakdown ── */}
      <div className="mx-6 border-t border-zinc-200" />
      <div className={`px-6 grid grid-cols-1 ${hasTraffic ? 'md:grid-cols-2' : ''} gap-8`}>
        {hasTraffic && Object.keys(bySource).length > 0 && (
          <div>
            <SectionHeader icon={<MousePointerClick className="h-4 w-4 text-amber-500" />} title="Visitor Sources" sub="Last 90 days" />
            <div className="space-y-2 mt-3">
              {Object.entries(bySource).sort(([, a], [, b]) => b - a).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {!['organic', 'direct_nav', 'direct'].includes(source) ? <Bot className="h-3.5 w-3.5 text-emerald-500" /> : <Globe className="h-3.5 w-3.5 text-amber-500" />}
                    <span className="text-sm text-zinc-600">{AI_SOURCE_LABELS[source as AIReferrerSource] || source}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-zinc-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${!['organic', 'direct_nav', 'direct'].includes(source) ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.max(8, (count / traffic.length) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-medium text-zinc-700 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <SectionHeader icon={<FileText className="h-4 w-4 text-[#0EA5E9]" />} title="Content Breakdown" />
          <div className="space-y-2 mt-3">
            {Object.entries(byType).sort(([, a], [, b]) => b - a).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-zinc-600">{TYPE_LABELS[type] || type}</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-zinc-100 rounded-full h-1.5">
                    <div className="bg-[#0EA5E9] h-1.5 rounded-full" style={{ width: `${Math.max(8, (count / memos.length) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-medium text-zinc-700 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
            <div className="pt-2 space-y-1.5 border-t border-zinc-100 mt-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#0EA5E9]" /><span className="text-zinc-500">contextmemo.com</span></div>
                <span className="font-medium text-zinc-700">{onContextMemo.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#F97316]" /><span className="text-zinc-500">HubSpot</span></div>
                <span className="font-medium text-zinc-700">{onHubSpot.length}</span>
              </div>
              {drafts.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-zinc-300" /><span className="text-zinc-500">Drafts</span></div>
                  <span className="font-medium text-zinc-700">{drafts.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Memo Performance ── */}
      <div className="mx-6 border-t border-zinc-200" />
      <div className="px-6">
        <SectionHeader icon={<FileText className="h-4 w-4 text-[#0EA5E9]" />} title="Memo Performance" sub={`${published.length} published`} />
        {published.length > 0 ? (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <SortableTH column="title" label="MEMO" active={sortColumn} direction={sortDirection} onSort={handleSort} />
                  <SortableTH column="type" label="TYPE" active={sortColumn} direction={sortDirection} onSort={handleSort} align="text-center" className="w-20" />
                  <SortableTH column="where" label="WHERE" active={sortColumn} direction={sortDirection} onSort={handleSort} align="text-center" className="w-16" />
                  <SortableTH column="views" label="VIEWS" active={sortColumn} direction={sortDirection} onSort={handleSort} align="text-right" className="w-16" />
                  <SortableTH column="ai" label="AI" active={sortColumn} direction={sortDirection} onSort={handleSort} align="text-right" className="w-12" />
                  <SortableTH column="training" label="TRAINING" active={sortColumn} direction={sortDirection} onSort={handleSort} align="text-right" className="w-16" />
                  <SortableTH column="searches" label="SEARCHES" active={sortColumn} direction={sortDirection} onSort={handleSort} align="text-right" className="w-16" />
                  <SortableTH column="clicks" label="CLICKS" active={sortColumn} direction={sortDirection} onSort={handleSort} align="text-right" className="w-14" />
                  <SortableTH column="lastCrawled" label="LAST CRAWLED" active={sortColumn} direction={sortDirection} onSort={handleSort} align="text-right" className="w-32" />
                  <SortableTH column="created" label="CREATED" active={sortColumn} direction={sortDirection} onSort={handleSort} align="text-right" className="w-20" />
                </tr>
              </thead>
              <tbody>
                {sortedMemos.map(memo => {
                    const views = viewsByMemo[memo.id] || { total: 0, ai: 0, organic: 0 }
                    const isOnHubSpot = !!memo.schema_json?.hubspot_post_id
                    const memoUrl = brandCustomDomain && brandDomainVerified
                      ? `https://${brandCustomDomain}/${memo.slug}`
                      : `/memo/${brandSubdomain}/${memo.slug}`
                    const mc = memoCrawls[memo.id] || { training: 0, searches: 0, clicks: 0 }
                    return (
                      <tr key={memo.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 group">
                        <td className="py-2 pr-3">
                          <a href={memoUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-700 hover:text-[#0EA5E9] font-medium flex items-center gap-1">
                            <span className="line-clamp-1">{memo.title}</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 shrink-0" />
                          </a>
                        </td>
                        <td className="py-2 text-center">
                          <Badge variant="outline" className="text-[10px] font-medium">{TYPE_LABELS[(TYPE_ALIASES[(memo.memo_type || '').toLowerCase()] || (memo.memo_type || '').toLowerCase())] || memo.memo_type}</Badge>
                        </td>
                        <td className="py-2 text-center">
                          {isOnHubSpot ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600"><ArrowUpFromLine className="h-3 w-3" />HS</span>
                          ) : (
                            <span className="text-[10px] font-bold text-sky-600">CM</span>
                          )}
                        </td>
                        <td className="py-2 text-right font-medium tabular-nums">{views.total > 0 ? views.total : <span className="text-zinc-300">—</span>}</td>
                        <td className="py-2 text-right tabular-nums">{views.ai > 0 ? <span className="text-emerald-600 font-medium">{views.ai}</span> : <span className="text-zinc-300">—</span>}</td>
                        <td className="py-2 text-right tabular-nums">{mc.training > 0 ? <span className="text-indigo-600 font-medium">{mc.training}</span> : <span className="text-zinc-300">—</span>}</td>
                        <td className="py-2 text-right tabular-nums">{mc.searches > 0 ? <span className="text-emerald-600 font-medium">{mc.searches}</span> : <span className="text-zinc-300">—</span>}</td>
                        <td className="py-2 text-right tabular-nums">{mc.clicks > 0 ? <span className="text-amber-500 font-medium">{mc.clicks}</span> : <span className="text-zinc-300">—</span>}</td>
                        <td className="py-2 text-right">
                          {(() => {
                            const crawl = findLastCrawl(memo.slug)
                            if (!crawl) return <span className="text-zinc-300 text-xs">—</span>
                            return (
                              <div className="text-right">
                                <span className="text-xs text-zinc-600" title={new Date(crawl.timestamp).toLocaleString()}>
                                  {formatDistanceToNow(new Date(crawl.timestamp), { addSuffix: true })}
                                </span>
                                <p className="text-[10px] text-zinc-400">{crawl.botDisplayName}</p>
                              </div>
                            )
                          })()}
                        </td>
                        <td className="py-2 text-right text-zinc-400 text-xs">{formatDistanceToNow(new Date(memo.created_at), { addSuffix: true })}</td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-400 py-4 text-center">No published memos yet</p>
        )}
      </div>

      {/* ── AI Visibility (only show if there are crawl events) ── */}
      {crawlEvents.length > 0 && (
        <>
          <div className="mx-6 border-t border-zinc-200" />
          <div className="px-6">
            <SectionHeader icon={<Radar className="h-4 w-4 text-zinc-400" />} title="AI Platform Activity" sub={`${crawlEvents.length} bot crawls detected`} />
            <AIFunnel crawlEvents={crawlEvents} publishedCount={published.length} publishedSlugs={new Set(published.map(m => m.slug))} />
          </div>
        </>
      )}

      {/* ── Bot Crawl Activity (only show if there are active bots) ── */}
      {sortedBots.some(([, info]) => info.count > 0) && (
        <>
          <div className="mx-6 border-t border-zinc-200" />
          <div className="px-6">
            <SectionHeader icon={<Radar className="h-4 w-4 text-zinc-400" />} title="Bot Crawl Details" sub="Individual bot activity" />
            <BotCrawlList sortedBots={sortedBots} sparklineByBot={sparklineByBot} days7={days7} />
          </div>
        </>
      )}

      {/* ── Footer note ── */}
      <div className="mx-6 border-t border-zinc-200" />
      <div className="px-6 pb-5 text-[11px] text-zinc-400">
        <span className="font-semibold text-zinc-500">Tracking:</span>{' '}
        Visitor traffic tracked via client-side JS on {brandCustomDomain && brandDomainVerified ? brandCustomDomain : `${brandSubdomain}.contextmemo.com`}.
        Company identification via IP network registration. Bot crawls detected server-side.
      </div>
    </Card>
  )
}

/* ── Inner Components ── */

function SortableTH({ column, label, active, direction, onSort, align, className }: {
  column: string
  label: string
  active: string
  direction: 'asc' | 'desc'
  onSort: (col: any) => void
  align?: string
  className?: string
}) {
  const isActive = active === column
  return (
    <th
      className={`pb-2 font-semibold text-xs cursor-pointer select-none hover:text-zinc-700 transition-colors ${isActive ? 'text-zinc-700' : 'text-zinc-400'} ${align || ''} ${className || ''}`}
      onClick={() => onSort(column)}
    >
      <span className={`inline-flex items-center gap-0.5 ${align === 'text-right' ? 'justify-end' : align === 'text-center' ? 'justify-center' : ''}`}>
        {label}
        {isActive ? (
          direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-30" />
        )}
      </span>
    </th>
  )
}

function SectionHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="text-sm font-semibold text-[#0F172A]">{title}</span>
      {sub && <span className="text-xs text-zinc-400 ml-1">· {sub}</span>}
    </div>
  )
}

function InlineStat({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <div className="py-2">
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-400">{sub}</p>}
    </div>
  )
}

function BotCrawlList({ sortedBots, sparklineByBot, days7 }: {
  sortedBots: [string, { count: number; displayName: string; category: BotCategory; provider: string; lastSeen: string | null }][]
  sparklineByBot: Record<string, number[]>
  days7: string[]
}) {
  const [showInactive, setShowInactive] = useState(false)
  const activeBots = sortedBots.filter(([, info]) => info.count > 0)
  const inactiveBots = sortedBots.filter(([, info]) => info.count === 0)

  function renderBot([botName, info]: [string, { count: number; displayName: string; category: BotCategory; provider: string; lastSeen: string | null }]) {
    const isAI = isAICategory(info.category)
    const categoryColor = BOT_CATEGORY_COLORS[info.category] || '#6B7280'
    const sparkline = sparklineByBot[botName] || days7.map(() => 0)
    const sparkMax = Math.max(1, ...sparkline)
    return (
      <div key={botName} className="flex items-center py-1.5">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {isAI ? <Scan className="h-3 w-3 shrink-0" style={{ color: categoryColor }} /> : <Search className="h-3 w-3 shrink-0 text-zinc-400" />}
          <span className={`text-xs truncate ${info.count > 0 ? 'text-zinc-700 font-medium' : 'text-zinc-400'}`}>{info.displayName}</span>
          <Badge
            variant="outline"
            className="text-[8px] font-medium px-1 py-0 shrink-0 cursor-help"
            style={{ borderColor: categoryColor, color: categoryColor }}
            title={BOT_CATEGORY_DESCRIPTIONS[info.category] || info.category}
          >
            {CATEGORY_LABEL[info.category] || info.category}
          </Badge>
        </div>
        <div className="flex items-end gap-px h-3 mx-2">
          {sparkline.map((val, i) => (
            <div key={i} className="w-1.5 rounded-[1px]" style={{
              height: val > 0 ? `${Math.max(25, (val / sparkMax) * 100)}%` : '1px',
              backgroundColor: val > 0 ? categoryColor : '#e4e4e7',
              opacity: val > 0 ? 0.7 : 0.25,
            }} title={`${days7[i]}: ${val}`} />
          ))}
        </div>
        <span className={`text-xs tabular-nums w-6 text-right ${info.count > 0 ? 'font-semibold text-zinc-700' : 'text-zinc-300'}`}>{info.count}</span>
      </div>
    )
  }

  return (
    <div className="mt-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
        {activeBots.map(renderBot)}
      </div>
      {inactiveBots.length > 0 && (
        <button
          onClick={() => setShowInactive(!showInactive)}
          className="mt-2 flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          {showInactive ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showInactive ? 'Hide' : 'Show'} {inactiveBots.length} bot{inactiveBots.length !== 1 ? 's' : ''} with no crawls
        </button>
      )}
      {showInactive && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5 mt-1">
          {inactiveBots.map(renderBot)}
        </div>
      )}
    </div>
  )
}

function AIFunnel({ crawlEvents, publishedCount, publishedSlugs }: { crawlEvents: CrawlEvent[]; publishedCount: number; publishedSlugs: Set<string> }) {
  // Helper: resolve a crawl slug to a published memo slug (exact match or base-name match)
  function resolveToPublished(crawlSlug: string): string | null {
    if (publishedSlugs.has(crawlSlug)) return crawlSlug
    const baseName = crawlSlug.includes('/') ? crawlSlug.split('/').slice(1).join('/') : crawlSlug
    for (const slug of publishedSlugs) {
      const memoBase = slug.includes('/') ? slug.split('/').slice(1).join('/') : slug
      if (memoBase === baseName) return slug
    }
    return null
  }

  // Chart 1: Content Discovery — unique pages
  const aiEvents = crawlEvents.filter(e => ['ai_training', 'ai_search', 'ai_user_browse'].includes(e.bot_category))
  const discoveredMemos = new Set(
    aiEvents.filter(e => e.memo_slug).map(e => resolveToPublished(e.memo_slug!)).filter(Boolean)
  ).size
  const discoveryPct = publishedCount > 0 ? Math.round((discoveredMemos / publishedCount) * 100) : 0

  // Chart 2: AI Engagement — raw event counts
  const trainingCrawls = crawlEvents.filter(e => e.bot_category === 'ai_training').length
  const searchQueries = crawlEvents.filter(e => e.bot_category === 'ai_search').length
  const clickThroughs = crawlEvents.filter(e => e.bot_category === 'ai_user_browse').length

  return (
    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Chart 1: Content Discovery */}
      <div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Content Discovery</p>
        <div className="space-y-2">
          {/* Published bar */}
          <div className="flex items-center gap-3">
            <div className="w-24 shrink-0 text-right">
              <p className="text-xs font-medium text-zinc-700">Published</p>
            </div>
            <div className="flex-1 relative h-7 bg-zinc-50 rounded overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded flex items-center px-2"
                style={{ width: '100%', backgroundColor: '#0EA5E918' }}
              >
                <span className="text-xs font-bold tabular-nums" style={{ color: '#0EA5E9' }}>{publishedCount}</span>
              </div>
            </div>
          </div>
          {/* AI Discovered bar (only show if discovered > 0) */}
          {discoveredMemos > 0 && (
            <div className="flex items-center gap-3">
              <div className="w-24 shrink-0 text-right">
                <p className="text-xs font-medium text-zinc-700">AI Discovered</p>
              </div>
              <div className="flex-1 relative h-7 bg-zinc-50 rounded overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded flex items-center px-2"
                  style={{ width: `${Math.max(2, (discoveredMemos / Math.max(1, publishedCount)) * 100)}%`, backgroundColor: '#6366F118', minWidth: '24px' }}
                >
                  <span className="text-xs font-bold tabular-nums" style={{ color: '#6366F1' }}>{discoveredMemos}</span>
                </div>
              </div>
              <span className="text-[10px] tabular-nums text-zinc-400 w-10 text-right shrink-0">{discoveryPct}%</span>
            </div>
          )}
        </div>
        <p className="text-[10px] text-zinc-400 mt-2 ml-[calc(6rem+0.75rem)]">
          {discoveredMemos} of {publishedCount} pages found by AI
          {publishedCount - discoveredMemos > 0 && ` · ${publishedCount - discoveredMemos} not yet discovered`}
        </p>
      </div>

      {/* Chart 2: AI Engagement (only show rows with data) */}
      <div>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">AI Engagement</p>
        {(() => {
          const allRows = [
            { label: 'Training Crawls', value: trainingCrawls, color: '#6366F1', sub: 'GPTBot, Google AI, etc.' },
            { label: 'Search Queries', value: searchQueries, color: '#10B981', sub: 'PerplexityBot, ChatGPT Search' },
            { label: 'Click-throughs', value: clickThroughs, color: '#F59E0B', sub: 'Real users from AI apps' },
          ]
          const rows = allRows.filter(row => row.value > 0)
          if (rows.length === 0) return <p className="text-xs text-zinc-300">No AI engagement yet</p>
          const engagementMax = Math.max(1, ...rows.map(r => r.value))
          return (
            <div className="space-y-2">
              {rows.map(row => (
                <div key={row.label} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 text-right">
                    <p className="text-xs font-medium text-zinc-700">{row.label}</p>
                  </div>
                  <div className="flex-1 relative h-7 bg-zinc-50 rounded overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded flex items-center px-2"
                      style={{
                        width: `${Math.max(8, (row.value / engagementMax) * 100)}%`,
                        backgroundColor: `${row.color}18`,
                        minWidth: '24px',
                      }}
                    >
                      <span className="text-xs font-bold tabular-nums" style={{ color: row.color }}>{row.value}</span>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-[10px] text-zinc-400 mt-1 ml-[calc(6rem+0.75rem)]">
                {rows.reduce((sum, r) => sum + r.value, 0)} total AI interactions
              </p>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
