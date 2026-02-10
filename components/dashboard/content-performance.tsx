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
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { AI_SOURCE_LABELS, type AIReferrerSource } from '@/lib/supabase/types'
import { BOT_CATEGORY_COLORS, BOT_CATEGORY_DESCRIPTIONS, type BotCategory } from '@/lib/bot-detection'

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
  created_at: string
}

interface ContentPerformanceProps {
  brandId: string
  brandName: string
  brandSubdomain: string
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

export function ContentPerformance({ brandId, brandName, brandSubdomain, memos, traffic, crawlEvents = [] }: ContentPerformanceProps) {
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

  // Precompute crawl count per memo
  const crawlCountByMemoId: Record<string, number> = {}
  for (const memo of published) {
    let count = 0
    for (const event of crawlEvents) {
      if (event.memo_slug && slugMatchesMemo(event.memo_slug, memo.slug)) count++
    }
    crawlCountByMemoId[memo.id] = count
  }

  // ── Sort state ──
  type SortColumn = 'title' | 'type' | 'where' | 'views' | 'ai' | 'crawls' | 'lastCrawled' | 'created'
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
    switch (sortColumn) {
      case 'title': return memo.title.toLowerCase()
      case 'type': return (TYPE_LABELS[(TYPE_ALIASES[(memo.memo_type || 'other').toLowerCase()] || (memo.memo_type || 'other').toLowerCase())] || memo.memo_type || 'other').toLowerCase()
      case 'where': return memo.schema_json?.hubspot_post_id ? 1 : 0
      case 'views': return views.total
      case 'ai': return views.ai
      case 'crawls': return crawlCountByMemoId[memo.id] || 0
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

      {/* ── Summary Stats ── */}
      <div className="mx-6 border-t border-zinc-200" />
      <div className="px-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <InlineStat label="Published" value={published.length} color="#0EA5E9" sub={drafts.length > 0 ? `${drafts.length} draft${drafts.length !== 1 ? 's' : ''}` : undefined} />
        <InlineStat label="Total Views" value={traffic.length} color="#8B5CF6" sub={hasTraffic ? 'last 90 days' : 'awaiting'} />
        <InlineStat label="AI Traffic" value={aiTraffic.length} color="#10B981" sub={hasTraffic && traffic.length > 0 ? `${Math.round((aiTraffic.length / traffic.length) * 100)}%` : undefined} />
        <InlineStat label="Organic" value={organicTraffic.length} color="#F59E0B" sub={hasTraffic && traffic.length > 0 ? `${Math.round((organicTraffic.length / traffic.length) * 100)}%` : undefined} />
      </div>

      {/* ── AI Visibility Funnel ── */}
      <div className="mx-6 border-t border-zinc-200" />
      <div className="px-6">
        <SectionHeader icon={<Radar className="h-4 w-4 text-emerald-500" />} title="AI Visibility Funnel" sub="How AI platforms interact with your content" />
        <AIFunnel crawlEvents={crawlEvents} publishedCount={published.length} publishedSlugs={new Set(published.map(m => m.slug))} />
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
                  <SortableTH column="crawls" label="CRAWLS" active={sortColumn} direction={sortDirection} onSort={handleSort} align="text-right" className="w-16" />
                  <SortableTH column="lastCrawled" label="LAST CRAWLED" active={sortColumn} direction={sortDirection} onSort={handleSort} align="text-right" className="w-32" />
                  <SortableTH column="created" label="CREATED" active={sortColumn} direction={sortDirection} onSort={handleSort} align="text-right" className="w-20" />
                </tr>
              </thead>
              <tbody>
                {sortedMemos.map(memo => {
                    const views = viewsByMemo[memo.id] || { total: 0, ai: 0, organic: 0 }
                    const isOnHubSpot = !!memo.schema_json?.hubspot_post_id
                    const memoUrl = `/memo/${brandSubdomain}/${memo.slug}`
                    const crawlCount = crawlCountByMemoId[memo.id] || 0
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
                        <td className="py-2 text-right tabular-nums">{crawlCount > 0 ? <span className="text-indigo-600 font-medium">{crawlCount}</span> : <span className="text-zinc-300">—</span>}</td>
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

      {/* ── Bot Crawl Activity ── */}
      <div className="mx-6 border-t border-zinc-200" />
      <div className="px-6">
        <SectionHeader icon={<Radar className="h-4 w-4 text-emerald-500" />} title="Bot Crawl Activity" sub={crawlEvents.length > 0 ? `${crawlEvents.length} total crawls detected` : 'Tracking active · crawls will appear here'} />
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0.5">
          {sortedBots.map(([botName, info]) => {
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
          })}
        </div>
      </div>

      {/* ── Traffic by Source + Content Breakdown ── */}
      <div className="mx-6 border-t border-zinc-200" />
      <div className="px-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Traffic by Source */}
        <div>
          <SectionHeader icon={<Bot className="h-4 w-4 text-emerald-500" />} title="Traffic by Source" sub="Last 90 days" />
          {hasTraffic && Object.keys(bySource).length > 0 ? (
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
          ) : (
            <p className="text-sm text-zinc-400 mt-3">No traffic yet</p>
          )}
        </div>

        {/* Content Breakdown */}
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

      {/* ── Footer note ── */}
      <div className="mx-6 border-t border-zinc-200" />
      <div className="px-6 pb-5 text-[11px] text-zinc-400">
        <span className="font-semibold text-zinc-500">Tracking:</span>{' '}
        Bot crawls detected server-side. Human views tracked via referrer on {brandSubdomain}.contextmemo.com.
        HubSpot content tracked in HubSpot analytics.
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

function AIFunnel({ crawlEvents, publishedCount, publishedSlugs }: { crawlEvents: CrawlEvent[]; publishedCount: number; publishedSlugs: Set<string> }) {
  // Helper: resolve a crawl slug to a published memo slug (exact match or base-name match)
  function resolveToPublished(crawlSlug: string): string | null {
    if (publishedSlugs.has(crawlSlug)) return crawlSlug
    // Try base-name match (strip prefix, e.g. "how-to/xyz" → "xyz" matches "resources/xyz")
    const baseName = crawlSlug.includes('/') ? crawlSlug.split('/').slice(1).join('/') : crawlSlug
    for (const slug of publishedSlugs) {
      const memoBase = slug.includes('/') ? slug.split('/').slice(1).join('/') : slug
      if (memoBase === baseName) return slug
    }
    return null
  }

  // All stages count UNIQUE PUBLISHED MEMOS — deduped against real memo slugs
  // so multiple URLs pointing to the same memo count as 1
  const aiEvents = crawlEvents.filter(e => ['ai_training', 'ai_search', 'ai_user_browse'].includes(e.bot_category))
  const discoveredMemos = new Set(
    aiEvents.filter(e => e.memo_slug).map(e => resolveToPublished(e.memo_slug!)).filter(Boolean)
  ).size
  const referencedMemos = new Set(
    crawlEvents.filter(e => e.bot_category === 'ai_search' && e.memo_slug)
      .map(e => resolveToPublished(e.memo_slug!)).filter(Boolean)
  ).size
  const clickedMemos = new Set(
    crawlEvents.filter(e => e.bot_category === 'ai_user_browse' && e.memo_slug)
      .map(e => resolveToPublished(e.memo_slug!)).filter(Boolean)
  ).size

  // Event counts for supplementary info
  const totalSearchEvents = crawlEvents.filter(e => e.bot_category === 'ai_search').length
  const totalClickEvents = crawlEvents.filter(e => e.bot_category === 'ai_user_browse').length
  const trainingCrawls = crawlEvents.filter(e => e.bot_category === 'ai_training').length

  const stages = [
    { label: 'Published', value: publishedCount, color: '#0EA5E9', extra: 'total pages', tooltip: 'Total published memos available for AI discovery' },
    { label: 'AI Discovered', value: discoveredMemos, color: '#6366F1', extra: trainingCrawls > 0 ? `incl. ${trainingCrawls} training crawls` : 'unique memos', tooltip: 'Memos crawled by any AI bot (training, search, or user browse). First step to getting cited.' },
    { label: 'Query Referenced', value: referencedMemos, color: '#10B981', extra: totalSearchEvents > referencedMemos ? `${totalSearchEvents} total queries` : 'unique memos', tooltip: 'Memos fetched by AI search bots (PerplexityBot, ChatGPT Search) to answer a real user query. Directly leads to citations.' },
    { label: 'Click-through', value: clickedMemos, color: '#F59E0B', extra: totalClickEvents > clickedMemos ? `${totalClickEvents} total clicks` : 'unique memos', tooltip: 'Memos where a human inside an AI app clicked through to read the full page. Strongest engagement signal.' },
  ]

  const maxVal = Math.max(1, publishedCount)

  return (
    <div className="mt-4 space-y-2">
      {stages.map((stage, i) => {
        const barPct = maxVal > 0 ? Math.max(2, (stage.value / maxVal) * 100) : 0
        const prevValue = i > 0 ? stages[i - 1].value : null
        const convPct = prevValue && prevValue > 0 ? Math.round((stage.value / prevValue) * 100) : null

        return (
          <div key={stage.label} className="flex items-center gap-3">
            {/* Label */}
            <div className="w-28 shrink-0 text-right" title={stage.tooltip}>
              <p className="text-xs font-medium text-zinc-700 cursor-help border-b border-dotted border-zinc-300 inline">{stage.label}</p>
            </div>

            {/* Bar */}
            <div className="flex-1 relative h-7 bg-zinc-50 rounded overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded transition-all flex items-center px-2"
                style={{ width: `${barPct}%`, backgroundColor: `${stage.color}18`, minWidth: stage.value > 0 ? '24px' : '0px' }}
              >
                {barPct > 15 && (
                  <span className="text-xs font-bold tabular-nums" style={{ color: stage.color }}>{stage.value}</span>
                )}
              </div>
              {barPct <= 15 && stage.value > 0 && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold tabular-nums" style={{ color: stage.color, marginLeft: `${barPct}%` }}>{stage.value}</span>
              )}
              {stage.value === 0 && (
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-zinc-300">0</span>
              )}
            </div>

            {/* Conversion % */}
            <div className="w-14 shrink-0 text-right">
              {convPct !== null ? (
                <span className="text-[10px] tabular-nums text-zinc-400">{convPct}%</span>
              ) : (
                <span className="text-[10px] text-zinc-300">—</span>
              )}
            </div>
          </div>
        )
      })}

      {/* Extra context line */}
      <div className="flex items-center gap-3 pt-1">
        <div className="w-28 shrink-0" />
        <p className="text-[10px] text-zinc-400">
          Unique pages at each stage
          {trainingCrawls > 0 && ` · ${trainingCrawls} training crawl${trainingCrawls !== 1 ? 's' : ''} from GPTBot/Google AI`}
          {totalSearchEvents > 0 && ` · ${totalSearchEvents} search quer${totalSearchEvents !== 1 ? 'ies' : 'y'}`}
          {totalClickEvents > 0 && ` · ${totalClickEvents} click${totalClickEvents !== 1 ? 's' : ''}`}
        </p>
      </div>
    </div>
  )
}
