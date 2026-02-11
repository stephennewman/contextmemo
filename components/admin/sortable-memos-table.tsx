'use client'

import { useState, useMemo } from 'react'

export type MemoRow = {
  memoId: string
  slug: string
  title: string
  memoType: string
  brandName: string
  brandSubdomain: string
  memoCreatedAt: string
  totalCrawls: number
  aiSearch: number
  aiTraining: number
  aiUser: number
  searchEngine: number
  seoTool: number
  uniqueBots: number
  lastCrawl: string | null
  humanVisits: number
}

type SortKey = keyof MemoRow
type SortDir = 'asc' | 'desc'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  gap_fill: { label: 'Gap Fill', color: 'bg-blue-100 text-blue-700' },
  response: { label: 'Response', color: 'bg-violet-100 text-violet-700' },
  how_to: { label: 'How-To', color: 'bg-teal-100 text-teal-700' },
  comparison: { label: 'Compare', color: 'bg-amber-100 text-amber-700' },
  alternative: { label: 'Alt', color: 'bg-orange-100 text-orange-700' },
  listicle: { label: 'Listicle', color: 'bg-pink-100 text-pink-700' },
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'never'
  const diffMs = Date.now() - new Date(dateStr).getTime()
  if (diffMs < 0) return 'just now'
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right'; tooltip?: string }[] = [
  { key: 'title', label: 'Memo', align: 'left' },
  { key: 'brandName', label: 'Brand', align: 'left' },
  { key: 'memoType', label: 'Type', align: 'left' },
  { key: 'totalCrawls', label: 'Total', align: 'right', tooltip: 'Total bot crawl events on this memo' },
  { key: 'aiSearch', label: 'AI Search', align: 'right', tooltip: 'AI search platforms fetching this memo to answer queries (Perplexity, ChatGPT Search, Claude)' },
  { key: 'aiTraining', label: 'AI Train', align: 'right', tooltip: 'Bots scraping this memo for model training data (GPTBot, ClaudeBot)' },
  { key: 'aiUser', label: 'AI User', align: 'right', tooltip: 'Humans inside AI apps who clicked to browse this memo' },
  { key: 'searchEngine', label: 'Search', align: 'right', tooltip: 'Traditional search engine indexing (Googlebot, Bingbot)' },
  { key: 'uniqueBots', label: 'Bots', align: 'right', tooltip: 'Number of distinct bot types that have crawled this memo' },
  { key: 'lastCrawl', label: 'Last Crawl', align: 'right' },
  { key: 'memoCreatedAt', label: 'Published', align: 'right' },
]

export function SortableMemosTable({ memos }: { memos: MemoRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('totalCrawls')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showAll, setShowAll] = useState(false)
  const [brandFilter, setBrandFilter] = useState<string>('all')

  const brands = useMemo(() => {
    const set = new Set(memos.map(m => m.brandName))
    return Array.from(set).sort()
  }, [memos])

  const withActivity = useMemo(() => memos.filter(m => m.totalCrawls > 0 || m.humanVisits > 0), [memos])
  const displayed = useMemo(() => {
    let list = showAll ? memos : withActivity
    if (brandFilter !== 'all') {
      list = list.filter(m => m.brandName === brandFilter)
    }
    return list
  }, [memos, withActivity, showAll, brandFilter])

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'title' || key === 'brandName' || key === 'memoType' ? 'asc' : 'desc')
    }
  }

  const sorted = useMemo(() => {
    return [...displayed].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      const diff = (av as number) - (bv as number)
      return sortDir === 'asc' ? diff : -diff
    })
  }, [displayed, sortKey, sortDir])

  const arrow = (key: SortKey) => {
    if (key !== sortKey) return ''
    return sortDir === 'desc' ? ' ▼' : ' ▲'
  }

  const totals = useMemo(() => ({
    crawls: displayed.reduce((s, m) => s + m.totalCrawls, 0),
    aiSearch: displayed.reduce((s, m) => s + m.aiSearch, 0),
    aiTraining: displayed.reduce((s, m) => s + m.aiTraining, 0),
    aiUser: displayed.reduce((s, m) => s + m.aiUser, 0),
    search: displayed.reduce((s, m) => s + m.searchEngine, 0),
  }), [displayed])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A]">Memo Activity</h2>
          <p className="text-xs text-slate-500">
            {withActivity.length} of {memos.length} published memos have bot activity
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Brand filter */}
          <select
            value={brandFilter}
            onChange={e => setBrandFilter(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300"
          >
            <option value="all">All brands</option>
            {brands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {/* Toggle */}
          <button
            onClick={() => setShowAll(prev => !prev)}
            className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
              showAll
                ? 'border-slate-300 bg-slate-100 text-slate-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {showAll ? `All ${displayed.length} memos` : `${displayed.length} with activity`}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mb-4 flex flex-wrap gap-4 rounded-lg bg-slate-50 px-4 py-2 text-xs">
        <span className="text-slate-500">Total crawls: <span className="font-semibold text-slate-700">{totals.crawls}</span></span>
        <span className="text-slate-500">AI Search: <span className="font-semibold text-emerald-600">{totals.aiSearch}</span></span>
        <span className="text-slate-500">AI Training: <span className="font-semibold text-violet-600">{totals.aiTraining}</span></span>
        <span className="text-slate-500">AI User: <span className="font-semibold text-sky-600">{totals.aiUser}</span></span>
        <span className="text-slate-500">Search: <span className="font-semibold text-amber-600">{totals.search}</span></span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`cursor-pointer select-none pb-3 pr-4 font-medium hover:text-slate-800 ${col.align === 'right' ? 'text-right' : ''}`}
                  onClick={() => handleSort(col.key)}
                  title={col.tooltip}
                >
                  <span className={`inline-flex items-center gap-0.5 ${col.tooltip ? 'border-b border-dotted border-slate-300' : ''}`}>
                    {col.label}{arrow(col.key)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(memo => {
              const typeInfo = TYPE_LABELS[memo.memoType] || { label: memo.memoType, color: 'bg-slate-100 text-slate-600' }
              const memoUrl = `https://${memo.brandSubdomain}.contextmemo.com/memo/${memo.slug}`
              return (
                <tr key={memo.memoId} className="border-b border-slate-50 hover:bg-slate-50">
                  {/* Title */}
                  <td className="max-w-[280px] py-3 pr-4">
                    <a
                      href={memoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate font-medium text-[#0F172A] hover:text-blue-600 hover:underline"
                      title={memo.title}
                    >
                      {memo.title}
                    </a>
                    <div className="truncate text-[10px] text-slate-400" title={memo.slug}>{memo.slug}</div>
                  </td>
                  {/* Brand */}
                  <td className="py-3 pr-4 text-xs text-slate-600">{memo.brandName}</td>
                  {/* Type */}
                  <td className="py-3 pr-4">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                  </td>
                  {/* Total */}
                  <td className="py-3 pr-4 text-right font-mono text-xs">
                    {memo.totalCrawls > 0 ? (
                      <span className="font-medium text-slate-700">{memo.totalCrawls}</span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </td>
                  {/* AI Search */}
                  <td className="py-3 pr-4 text-right font-mono text-xs">
                    {memo.aiSearch > 0 ? (
                      <span className={memo.aiSearch >= 3 ? 'font-semibold text-emerald-600' : 'text-emerald-500'}>
                        {memo.aiSearch}
                      </span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </td>
                  {/* AI Training */}
                  <td className="py-3 pr-4 text-right font-mono text-xs">
                    {memo.aiTraining > 0 ? (
                      <span className={memo.aiTraining >= 3 ? 'font-medium text-violet-600' : 'text-violet-500'}>
                        {memo.aiTraining}
                      </span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </td>
                  {/* AI User */}
                  <td className="py-3 pr-4 text-right font-mono text-xs">
                    {memo.aiUser > 0 ? (
                      <span className={memo.aiUser >= 2 ? 'font-medium text-sky-600' : 'text-sky-500'}>
                        {memo.aiUser}
                      </span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </td>
                  {/* Search Engine */}
                  <td className="py-3 pr-4 text-right font-mono text-xs">
                    {memo.searchEngine > 0 ? (
                      <span className="text-amber-600">{memo.searchEngine}</span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </td>
                  {/* Unique Bots */}
                  <td className="py-3 pr-4 text-right font-mono text-xs text-slate-500">
                    {memo.uniqueBots > 0 ? memo.uniqueBots : <span className="text-slate-300">0</span>}
                  </td>
                  {/* Last Crawl */}
                  <td className="py-3 pr-4 text-right text-xs text-slate-400"
                      title={memo.lastCrawl ? new Date(memo.lastCrawl).toLocaleString() : undefined}
                  >
                    {memo.lastCrawl ? timeAgo(memo.lastCrawl) : <span className="text-slate-300">never</span>}
                  </td>
                  {/* Published */}
                  <td className="py-3 text-right text-xs text-slate-400">
                    {new Date(memo.memoCreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={11} className="py-8 text-center text-sm text-slate-400">
                  {showAll ? 'No published memos yet.' : 'No memos with bot activity yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
