'use client'

import { useState } from 'react'

export type BrandRow = {
  id: string
  name: string
  domain: string | null
  owner: string
  spendAllTime: number
  spend7d: number
  scans24h: number
  prompts: number
  citedPrompts: number
  totalScans: number
  mentionRate: number
  citationRate: number
  publishedMemos: number
  totalMemos: number
  aiCrawls: number
  aiSearchCrawls: number
  aiTrainingCrawls: number
  aiUserCrawls: number
  searchCrawls: number
  totalCrawls: number
  lastCrawl: string | null
  lastScanned: string | null
}

type SortKey = keyof BrandRow
type SortDir = 'asc' | 'desc'

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right'; tooltip?: string }[] = [
  { key: 'name', label: 'Brand', align: 'left' },
  { key: 'owner', label: 'Owner', align: 'left' },
  { key: 'spendAllTime', label: 'All-Time $', align: 'right', tooltip: 'Total AI API spend across all usage events' },
  { key: 'spend7d', label: '7d $', align: 'right', tooltip: 'AI API spend in the last 7 days' },
  { key: 'prompts', label: 'Prompts', align: 'right', tooltip: 'Active prompts tracked (cited prompts in green)' },
  { key: 'totalScans', label: 'Scans', align: 'right', tooltip: 'Total AI model scans run across all prompts' },
  { key: 'mentionRate', label: 'Mention %', align: 'right', tooltip: 'Percentage of scans where the brand is mentioned by name' },
  { key: 'citationRate', label: 'Citation %', align: 'right', tooltip: 'Percentage of scans where the brand\'s domain appears in citations' },
  { key: 'publishedMemos', label: 'Memos', align: 'right', tooltip: 'Published memos on contextmemo.com' },
  { key: 'aiSearchCrawls', label: 'AI Search', align: 'right', tooltip: 'AI platforms fetching content to answer a user query right now (PerplexityBot, ChatGPT Search, Claude Search). Directly leads to citations.' },
  { key: 'aiTrainingCrawls', label: 'AI Training', align: 'right', tooltip: 'Bots scraping for future model training data (GPTBot, ClaudeBot, Google AI). Content may appear in model outputs months later.' },
  { key: 'aiUserCrawls', label: 'AI User', align: 'right', tooltip: 'A human inside ChatGPT/Perplexity/Claude clicked to browse the page. Strongest signal of real engagement.' },
  { key: 'searchCrawls', label: 'Search', align: 'right', tooltip: 'Traditional search engine indexing (Googlebot, Bingbot). Required for search results and AI Overviews.' },
  { key: 'lastCrawl', label: 'Last Crawl', align: 'right', tooltip: 'Most recent crawl from any bot' },
]

export function SortableBrandsTable({ brands }: { brands: BrandRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('spendAllTime')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortKey(key)
      // Default desc for numbers, asc for strings
      setSortDir(key === 'name' || key === 'owner' ? 'asc' : 'desc')
    }
  }

  const sorted = [...brands].sort((a, b) => {
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

  const arrow = (key: SortKey) => {
    if (key !== sortKey) return ''
    return sortDir === 'desc' ? ' \u25BC' : ' \u25B2'
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#0F172A]">All Brands</h2>
        <span className="text-xs text-slate-500">{brands.length} total</span>
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
            {sorted.map(brand => (
              <tr key={brand.id} className="border-b border-slate-50 hover:bg-slate-50">
                {/* Brand */}
                <td className="py-3 pr-4">
                  <div className="font-medium text-[#0F172A]">{brand.name}</div>
                  <div className="text-[10px] text-slate-400">{brand.domain || '—'}</div>
                </td>
                {/* Owner */}
                <td className="py-3 pr-4 text-xs text-slate-500">
                  {brand.owner.split('@')[0]}
                </td>
                {/* All-Time $ */}
                <td className="py-3 pr-4 text-right font-mono text-xs">
                  {brand.spendAllTime > 0 ? (
                    <span className={brand.spendAllTime > 5 ? 'font-semibold text-red-600' : brand.spendAllTime > 2 ? 'text-amber-600' : 'text-slate-600'}>
                      ${brand.spendAllTime.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-slate-300">$0.00</span>
                  )}
                </td>
                {/* 7d $ */}
                <td className="py-3 pr-4 text-right font-mono text-xs">
                  {brand.spend7d > 0 ? (
                    <span className={brand.spend7d > 2 ? 'text-amber-600' : 'text-slate-600'}>
                      ${brand.spend7d.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                {/* Prompts */}
                <td className="py-3 pr-4 text-right text-xs text-slate-600">
                  {brand.prompts > 0 ? (
                    <span>
                      {brand.prompts}
                      {brand.citedPrompts > 0 && (
                        <span className="ml-1 text-emerald-600">({brand.citedPrompts})</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-300">0</span>
                  )}
                </td>
                {/* Scans */}
                <td className="py-3 pr-4 text-right font-mono text-xs text-slate-600">
                  {brand.totalScans > 0 ? brand.totalScans.toLocaleString() : <span className="text-slate-300">0</span>}
                </td>
                {/* Mention % */}
                <td className="py-3 pr-4 text-right font-mono text-xs">
                  {brand.totalScans > 0 ? (
                    <span className={brand.mentionRate >= 5 ? 'font-medium text-emerald-600' : brand.mentionRate > 0 ? 'text-slate-600' : 'text-slate-300'}>
                      {brand.mentionRate}%
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                {/* Citation % */}
                <td className="py-3 pr-4 text-right font-mono text-xs">
                  {brand.totalScans > 0 ? (
                    <span className={brand.citationRate >= 5 ? 'font-medium text-emerald-600' : brand.citationRate > 0 ? 'text-slate-600' : 'text-slate-300'}>
                      {brand.citationRate}%
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                {/* Memos */}
                <td className="py-3 pr-4 text-right text-xs text-slate-600">
                  {brand.publishedMemos || <span className="text-slate-300">0</span>}
                </td>
                {/* AI Search Crawls */}
                <td className="py-3 pr-4 text-right font-mono text-xs">
                  {brand.aiSearchCrawls > 0 ? (
                    <span className={brand.aiSearchCrawls >= 5 ? 'font-semibold text-emerald-600' : 'text-emerald-500'}>
                      {brand.aiSearchCrawls}
                    </span>
                  ) : (
                    <span className="text-slate-300">0</span>
                  )}
                </td>
                {/* AI Training Crawls */}
                <td className="py-3 pr-4 text-right font-mono text-xs">
                  {brand.aiTrainingCrawls > 0 ? (
                    <span className={brand.aiTrainingCrawls >= 10 ? 'font-medium text-violet-600' : 'text-violet-500'}>
                      {brand.aiTrainingCrawls}
                    </span>
                  ) : (
                    <span className="text-slate-300">0</span>
                  )}
                </td>
                {/* AI User Crawls */}
                <td className="py-3 pr-4 text-right font-mono text-xs">
                  {brand.aiUserCrawls > 0 ? (
                    <span className={brand.aiUserCrawls >= 5 ? 'font-medium text-sky-600' : 'text-sky-500'}>
                      {brand.aiUserCrawls}
                    </span>
                  ) : (
                    <span className="text-slate-300">0</span>
                  )}
                </td>
                {/* Search Crawls */}
                <td className="py-3 pr-4 text-right font-mono text-xs">
                  {brand.searchCrawls > 0 ? (
                    <span className="text-amber-600">{brand.searchCrawls}</span>
                  ) : (
                    <span className="text-slate-300">0</span>
                  )}
                </td>
                {/* Last Crawl */}
                <td className="py-3 text-right text-xs text-slate-400">
                  {brand.lastCrawl
                    ? new Date(brand.lastCrawl).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : <span className="text-slate-300">never</span>
                  }
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={14} className="py-8 text-center text-sm text-slate-400">No brands yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
