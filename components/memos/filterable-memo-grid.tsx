'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'

// Memo type → display config
const MEMO_TYPE_CONFIG: Record<string, { label: string; color: string; accent: string }> = {
  product_deploy: { label: 'Product Updates', color: '#10B981', accent: 'from-emerald-500/20 to-emerald-600/5' },
  response: { label: 'Responses', color: '#3B82F6', accent: 'from-blue-500/20 to-blue-600/5' },
  citation_response: { label: 'Citations', color: '#8B5CF6', accent: 'from-violet-500/20 to-violet-600/5' },
  guide: { label: 'Guides', color: '#F59E0B', accent: 'from-amber-500/20 to-amber-600/5' },
  industry: { label: 'Industry', color: '#F59E0B', accent: 'from-amber-500/20 to-amber-600/5' },
  comparison: { label: 'Comparisons', color: '#EC4899', accent: 'from-pink-500/20 to-pink-600/5' },
  alternative: { label: 'Alternatives', color: '#EC4899', accent: 'from-pink-500/20 to-pink-600/5' },
  how_to: { label: 'How-To', color: '#0EA5E9', accent: 'from-sky-500/20 to-sky-600/5' },
  gap_fill: { label: 'Original Research', color: '#A855F7', accent: 'from-purple-500/20 to-purple-600/5' },
  resource: { label: 'Resources', color: '#6366F1', accent: 'from-indigo-500/20 to-indigo-600/5' },
  synthesis: { label: 'Synthesis', color: '#14B8A6', accent: 'from-teal-500/20 to-teal-600/5' },
}

// SVG pattern per type for visual differentiation
function TypePattern({ type }: { type: string }) {
  const color = MEMO_TYPE_CONFIG[type]?.color || '#0EA5E9'
  
  const patterns: Record<string, React.ReactNode> = {
    product_deploy: (
      <svg className="absolute top-0 right-0 w-24 h-24 opacity-[0.07]" viewBox="0 0 80 80">
        <circle cx="60" cy="20" r="18" fill={color} />
        <rect x="10" y="50" width="20" height="20" rx="2" fill={color} />
        <path d="M45 45 L65 65" stroke={color} strokeWidth="3" />
      </svg>
    ),
    response: (
      <svg className="absolute top-0 right-0 w-24 h-24 opacity-[0.07]" viewBox="0 0 80 80">
        <path d="M20 15h40a5 5 0 015 5v25a5 5 0 01-5 5H35l-10 10V50H20a5 5 0 01-5-5V20a5 5 0 015-5z" fill={color} />
      </svg>
    ),
    citation_response: (
      <svg className="absolute top-0 right-0 w-24 h-24 opacity-[0.07]" viewBox="0 0 80 80">
        <text x="15" y="50" fontSize="50" fontWeight="bold" fill={color}>&ldquo;</text>
        <circle cx="60" cy="55" r="12" stroke={color} strokeWidth="3" fill="none" />
        <path d="M68 63l8 8" stroke={color} strokeWidth="3" />
      </svg>
    ),
    guide: (
      <svg className="absolute top-0 right-0 w-24 h-24 opacity-[0.07]" viewBox="0 0 80 80">
        <rect x="20" y="10" width="35" height="55" rx="3" stroke={color} strokeWidth="3" fill="none" />
        <line x1="28" y1="25" x2="48" y2="25" stroke={color} strokeWidth="2" />
        <line x1="28" y1="33" x2="48" y2="33" stroke={color} strokeWidth="2" />
        <line x1="28" y1="41" x2="40" y2="41" stroke={color} strokeWidth="2" />
      </svg>
    ),
    comparison: (
      <svg className="absolute top-0 right-0 w-24 h-24 opacity-[0.07]" viewBox="0 0 80 80">
        <rect x="10" y="25" width="25" height="40" rx="3" stroke={color} strokeWidth="3" fill="none" />
        <rect x="45" y="15" width="25" height="50" rx="3" stroke={color} strokeWidth="3" fill="none" />
        <path d="M35 45h10" stroke={color} strokeWidth="2" strokeDasharray="3 3" />
      </svg>
    ),
    how_to: (
      <svg className="absolute top-0 right-0 w-24 h-24 opacity-[0.07]" viewBox="0 0 80 80">
        <circle cx="25" cy="25" r="8" stroke={color} strokeWidth="3" fill="none" />
        <text x="22" y="29" fontSize="12" fontWeight="bold" fill={color}>1</text>
        <circle cx="55" cy="40" r="8" stroke={color} strokeWidth="3" fill="none" />
        <text x="52" y="44" fontSize="12" fontWeight="bold" fill={color}>2</text>
        <circle cx="30" cy="58" r="8" stroke={color} strokeWidth="3" fill="none" />
        <text x="27" y="62" fontSize="12" fontWeight="bold" fill={color}>3</text>
        <path d="M32 28l16 8M48 44l-12 10" stroke={color} strokeWidth="2" />
      </svg>
    ),
    gap_fill: (
      <svg className="absolute top-0 right-0 w-24 h-24 opacity-[0.07]" viewBox="0 0 80 80">
        <circle cx="40" cy="35" r="20" stroke={color} strokeWidth="3" fill="none" />
        <path d="M40 22v26M27 35h26" stroke={color} strokeWidth="3" />
      </svg>
    ),
  }

  return patterns[type] || patterns.response || null
}

export interface FilterableMemo {
  id: string
  title: string
  slug: string
  memo_type: string
  meta_description: string | null
  published_at: string | null
}

type SortOption = 'newest' | 'oldest' | 'alpha'

function getMemoUrl(slug: string, memoType: string): string {
  const routes: Record<string, string> = {
    comparison: '/compare',
    alternative: '/alternatives',
    how_to: '/guides',
    gap_fill: '/tools',
    product_deploy: '/insights',
    industry: '/for',
    resource: '/resources',
    response: '/resources',
    citation_response: '/resources',
  }
  const route = routes[memoType] || '/tools'
  // Strip old prefixes
  const prefixes = ['vs/', 'alternatives-to/', 'how/', 'gap/', 'insights/', 'for/', 'resources/']
  let cleanSlug = slug
  for (const p of prefixes) {
    if (cleanSlug.startsWith(p)) {
      cleanSlug = cleanSlug.slice(p.length)
      break
    }
  }
  return `${route}/${cleanSlug}`
}

interface FilterableMemoGridProps {
  memos: FilterableMemo[]
}

export function FilterableMemoGrid({ memos }: FilterableMemoGridProps) {
  const [activeType, setActiveType] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')

  // Derive available types from the actual memos, ordered by count
  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of memos) {
      counts.set(m.memo_type, (counts.get(m.memo_type) || 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        type,
        label: MEMO_TYPE_CONFIG[type]?.label || type.replace('_', ' '),
        color: MEMO_TYPE_CONFIG[type]?.color || '#0EA5E9',
        count,
      }))
  }, [memos])

  // Filter + sort
  const filtered = useMemo(() => {
    let result = memos

    if (activeType !== 'all') {
      result = result.filter((m) => m.memo_type === activeType)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          (m.meta_description && m.meta_description.toLowerCase().includes(q))
      )
    }

    result = [...result].sort((a, b) => {
      if (sort === 'newest') {
        return (
          new Date(b.published_at || 0).getTime() -
          new Date(a.published_at || 0).getTime()
        )
      }
      if (sort === 'oldest') {
        return (
          new Date(a.published_at || 0).getTime() -
          new Date(b.published_at || 0).getTime()
        )
      }
      return a.title.localeCompare(b.title)
    })

    return result
  }, [memos, activeType, search, sort])

  return (
    <div>
      {/* Controls */}
      <div className="mb-8 space-y-4">
        {/* Search + Sort row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search memos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border-2 border-white/10 text-white placeholder:text-slate-500 text-sm px-4 py-2.5 pl-10 focus:outline-none focus:border-[#0EA5E9]/50 transition-colors"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="bg-white/5 border-2 border-white/10 text-slate-300 text-sm px-4 py-2.5 focus:outline-none focus:border-[#0EA5E9]/50 transition-colors appearance-none cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="alpha">A → Z</option>
          </select>
        </div>

        {/* Type filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveType('all')}
            className={`text-xs font-bold uppercase tracking-wide px-3 py-1.5 border-2 transition-all ${
              activeType === 'all'
                ? 'bg-[#0EA5E9]/20 border-[#0EA5E9]/50 text-[#0EA5E9]'
                : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
            }`}
          >
            All ({memos.length})
          </button>
          {typeOptions.map((opt) => (
            <button
              key={opt.type}
              onClick={() => setActiveType(activeType === opt.type ? 'all' : opt.type)}
              className={`text-xs font-bold uppercase tracking-wide px-3 py-1.5 border-2 transition-all ${
                activeType === opt.type
                  ? 'border-current/50 bg-current/10'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
              }`}
              style={
                activeType === opt.type
                  ? { color: opt.color, borderColor: `${opt.color}50`, backgroundColor: `${opt.color}15` }
                  : undefined
              }
            >
              {opt.label} ({opt.count})
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-6">
        {filtered.length} {filtered.length === 1 ? 'memo' : 'memos'}
        {activeType !== 'all' && (
          <span className="text-slate-600">
            {' '}
            in {MEMO_TYPE_CONFIG[activeType]?.label || activeType}
          </span>
        )}
        {search && (
          <span className="text-slate-600"> matching &ldquo;{search}&rdquo;</span>
        )}
      </p>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((memo) => (
            <FilterableMemoCard key={memo.id} memo={memo} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white/5 border-2 border-white/10">
          <svg
            className="w-12 h-12 text-white/20 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-slate-500">No memos match your filters.</p>
          <button
            onClick={() => {
              setActiveType('all')
              setSearch('')
            }}
            className="text-[#0EA5E9] text-sm font-semibold mt-2 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}

function FilterableMemoCard({ memo }: { memo: FilterableMemo }) {
  const url = getMemoUrl(memo.slug, memo.memo_type)
  const config = MEMO_TYPE_CONFIG[memo.memo_type] || { label: memo.memo_type, color: '#0EA5E9', accent: 'from-sky-500/20 to-sky-600/5' }

  return (
    <Link
      href={url}
      className="block relative overflow-hidden bg-white/5 border-2 border-white/10 hover:border-white/20 transition-all group"
    >
      {/* Type color accent bar */}
      <div
        className="absolute top-0 left-0 w-full h-[3px]"
        style={{ backgroundColor: config.color }}
      />

      {/* Abstract pattern */}
      <TypePattern type={memo.memo_type} />

      {/* Content */}
      <div className="relative p-6 pt-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: config.color }}
          >
            {config.label}
          </span>
          {memo.published_at && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-xs text-slate-500">
                {new Date(memo.published_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </>
          )}
        </div>
        <h3 className="font-bold text-white group-hover:text-[#0EA5E9] transition-colors line-clamp-2">
          {memo.title}
        </h3>
        {memo.meta_description && (
          <p className="text-slate-500 text-sm mt-2 line-clamp-2">
            {memo.meta_description}
          </p>
        )}
      </div>
    </Link>
  )
}
