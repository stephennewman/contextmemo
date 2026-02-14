import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { AITrafficTracker } from '@/components/tracking/ai-traffic-tracker'
import { CONTEXT_MEMO_BRAND_ID, getMemoUrl } from '@/lib/memo/render'
import { FilterableMemoGrid } from '@/components/memos/filterable-memo-grid'
import Link from 'next/link'

export const revalidate = 3600 // ISR: regenerate at most once per hour

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const metadata: Metadata = {
  title: 'Memos',
  description: 'Structured memos built for people, AI models, and search engines. Fresh, factual, and cross-referenced with brand data.',
  openGraph: {
    title: 'Memos | Context Memo',
    description: 'Structured memos built for people, AI models, and search engines. Fresh, factual, and cross-referenced with brand data.',
    url: 'https://contextmemo.com/memos',
  },
  alternates: {
    canonical: 'https://contextmemo.com/memos',
  },
}

const MEMO_CATEGORIES = [
  {
    slug: 'insights',
    title: 'Product Updates',
    description: 'Feature launches, platform improvements, and product capabilities',
    memoTypes: ['product_deploy'],
    color: '#10B981',
    href: '/memos/insights',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    slug: 'responses',
    title: 'AI Responses',
    description: 'AI-generated responses to common industry queries and topics',
    memoTypes: ['response'],
    color: '#3B82F6',
    href: null, // no dedicated route — use filter grid
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },
  {
    slug: 'citations',
    title: 'Citations',
    description: 'Memos optimized for AI citation and brand visibility in search',
    memoTypes: ['citation_response'],
    color: '#8B5CF6',
    href: null,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    slug: 'guides',
    title: 'Guides',
    description: 'In-depth memos explaining concepts and strategies',
    memoTypes: ['guide', 'industry'],
    color: '#F59E0B',
    href: '/memos/guides',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    slug: 'compare',
    title: 'Comparisons',
    description: 'Side-by-side analysis of tools, strategies, and approaches',
    memoTypes: ['comparison', 'alternative'],
    color: '#EC4899',
    href: '/memos/compare',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    slug: 'how-to',
    title: 'How-To',
    description: 'Step-by-step tactical guides and tutorials',
    memoTypes: ['how_to'],
    color: '#0EA5E9',
    href: '/memos/how-to',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    slug: 'original',
    title: 'Original Research',
    description: 'Exclusive analysis filling gaps in AI knowledge bases',
    memoTypes: ['gap_fill'],
    color: '#A855F7',
    href: null,
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
]

type MemoRow = {
  id: string
  title: string
  slug: string
  memo_type: string
  meta_description: string | null
  published_at: string | null
}

function MemoCard({ memo, badge }: { memo: MemoRow; badge?: string }) {
  const url = getMemoUrl(memo.slug, memo.memo_type)

  // Type color mapping
  const typeColors: Record<string, string> = {
    product_deploy: '#10B981',
    response: '#3B82F6',
    citation_response: '#8B5CF6',
    guide: '#F59E0B',
    industry: '#F59E0B',
    comparison: '#EC4899',
    alternative: '#EC4899',
    how_to: '#0EA5E9',
    gap_fill: '#A855F7',
    resource: '#6366F1',
    synthesis: '#14B8A6',
  }
  const typeLabels: Record<string, string> = {
    product_deploy: 'Product Update',
    response: 'Response',
    citation_response: 'Citation',
    guide: 'Guide',
    industry: 'Industry',
    comparison: 'Comparison',
    alternative: 'Alternative',
    how_to: 'How-To',
    gap_fill: 'Original Research',
    resource: 'Resource',
    synthesis: 'Synthesis',
  }
  const color = typeColors[memo.memo_type] || '#0EA5E9'
  const label = typeLabels[memo.memo_type] || memo.memo_type.replace('_', ' ')

  return (
    <Link
      href={url}
      className="block relative overflow-hidden bg-white/5 border-2 border-white/10 hover:border-white/20 transition-all group"
    >
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: color }} />

      <div className="p-6 pt-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color }}>
            {label}
          </span>
          {badge && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-xs font-bold text-[#10B981] uppercase tracking-wide">{badge}</span>
            </>
          )}
          {memo.published_at && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-xs text-slate-500">
                {new Date(memo.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </>
          )}
        </div>
        <h3 className="font-bold text-white group-hover:text-[#0EA5E9] transition-colors line-clamp-2">
          {memo.title}
        </h3>
        {memo.meta_description && (
          <p className="text-slate-500 text-sm mt-2 line-clamp-2">{memo.meta_description}</p>
        )}
      </div>
    </Link>
  )
}

export default async function MemosIndexPage() {
  // Get brand
  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', CONTEXT_MEMO_BRAND_ID)
    .single()

  // Get counts for each category
  const counts = await Promise.all(
    MEMO_CATEGORIES.map(async (cat) => {
      const { count } = await supabase
        .from('memos')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', CONTEXT_MEMO_BRAND_ID)
        .in('memo_type', cat.memoTypes)
        .eq('status', 'published')
      return { slug: cat.slug, count: count || 0 }
    })
  )
  const countMap = Object.fromEntries(counts.map(c => [c.slug, c.count]))

  // Total count for "all" link
  const { count: totalCount } = await supabase
    .from('memos')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', CONTEXT_MEMO_BRAND_ID)
    .eq('status', 'published')

  // --- NEWLY PUBLISHED: 6 most recent ---
  const { data: newlyPublished } = await supabase
    .from('memos')
    .select('id, title, slug, memo_type, meta_description, published_at')
    .eq('brand_id', CONTEXT_MEMO_BRAND_ID)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(6)

  // --- HIGHEST INTEREST: ranked by AI bot crawl frequency ---
  const { data: topCrawled } = await supabase
    .from('bot_crawl_events')
    .select('memo_slug')
    .eq('brand_subdomain', 'contextmemo')
    .not('memo_slug', 'is', null)

  const crawlCounts = new Map<string, number>()
  for (const row of topCrawled || []) {
    const slug = row.memo_slug as string
    crawlCounts.set(slug, (crawlCounts.get(slug) || 0) + 1)
  }

  // Get all published memos
  const { data: allMemos } = await supabase
    .from('memos')
    .select('id, title, slug, memo_type, meta_description, published_at')
    .eq('brand_id', CONTEXT_MEMO_BRAND_ID)
    .eq('status', 'published')

  const highestInterest = (allMemos || [])
    .map((memo) => ({ ...memo, crawls: crawlCounts.get(memo.slug) || 0 }))
    .filter((memo) => memo.crawls > 0)
    .sort((a, b) => b.crawls - a.crawls)
    .slice(0, 6)

  // --- UNIQUE PERSPECTIVE: gap_fill memos ---
  const { data: uniquePerspective } = await supabase
    .from('memos')
    .select('id, title, slug, memo_type, meta_description, published_at')
    .eq('brand_id', CONTEXT_MEMO_BRAND_ID)
    .eq('status', 'published')
    .eq('memo_type', 'gap_fill')
    .order('published_at', { ascending: false })
    .limit(6)

  // --- ALL MEMOS for filterable listing ---
  const allMemosForListing = (allMemos || [])
    .sort((a, b) => {
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0
      return dateB - dateA
    })

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Header */}
      <header className="border-b-2 border-white/10 bg-[#0F172A]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-6 h-6 text-[#0EA5E9]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="font-black text-lg tracking-tight">CONTEXT MEMO</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="hidden sm:block text-sm font-semibold text-slate-400 hover:text-white transition-colors">
              HOME
            </Link>
            <Link 
              href="/request-access" 
              className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white font-bold text-sm px-4 py-2 transition-colors"
            >
              REQUEST ACCESS
            </Link>
          </div>
        </div>
      </header>
      
      <main>
        {/* Hero with abstract background */}
        <div className="border-b-2 border-white/10 relative overflow-hidden">
          {/* Multi-layer abstract background */}
          <div className="absolute inset-0">
            {/* Base gradient */}
            <div className="absolute inset-0 bg-linear-to-br from-[#0EA5E9]/15 via-[#8B5CF6]/8 to-transparent" />
            {/* Secondary gradient */}
            <div className="absolute inset-0 bg-linear-to-tl from-[#10B981]/10 via-transparent to-transparent" />
            {/* Grid pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hero-grid)" />
            </svg>
            {/* Floating abstract shapes */}
            <svg className="absolute right-0 top-0 w-[500px] h-[500px] opacity-[0.06]" viewBox="0 0 500 500">
              <circle cx="350" cy="100" r="120" fill="#0EA5E9" />
              <circle cx="420" cy="280" r="80" fill="#8B5CF6" />
              <circle cx="200" cy="350" r="60" fill="#10B981" />
              <rect x="100" y="50" width="150" height="150" rx="20" fill="#F59E0B" transform="rotate(15 175 125)" />
            </svg>
            {/* Dot pattern accent */}
            <svg className="absolute left-0 bottom-0 w-[300px] h-[200px] opacity-[0.05]" viewBox="0 0 300 200">
              {Array.from({ length: 8 }).map((_, row) =>
                Array.from({ length: 12 }).map((_, col) => (
                  <circle
                    key={`${row}-${col}`}
                    cx={col * 25 + 12}
                    cy={row * 25 + 12}
                    r="2"
                    fill="white"
                  />
                ))
              )}
            </svg>
          </div>
          
          <div className="max-w-5xl mx-auto px-6 py-20 relative">
            <nav className="text-sm font-semibold text-slate-500 mb-6 uppercase tracking-wide">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span className="mx-2 text-white/20">/</span>
              <span className="text-white">Memos</span>
            </nav>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight">Memos</h1>
            <p className="text-slate-400 mt-6 text-xl max-w-2xl leading-relaxed">
              Structured memos built for people, AI models, and search engines. Fresh, factual, and cross-referenced for accuracy.
            </p>
            <p className="text-slate-500 mt-3 text-sm font-semibold">
              {totalCount || 0} published memos
            </p>
          </div>
        </div>
        
        {/* Categories */}
        <div className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-8">Browse by Type</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {MEMO_CATEGORIES.filter(cat => countMap[cat.slug] > 0).map((cat) => (
              <Link
                key={cat.slug}
                href={cat.href || '#all-memos'}
                className="group relative overflow-hidden p-6 bg-white/5 border-2 border-white/10 hover:border-white/20 transition-all"
              >
                {/* Color accent */}
                <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: cat.color }} />
                
                {/* Subtle background glow */}
                <div
                  className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-[0.07] blur-2xl"
                  style={{ backgroundColor: cat.color }}
                />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div style={{ color: cat.color }}>{cat.icon}</div>
                    <span className="text-xs font-bold text-slate-600">{countMap[cat.slug]}</span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-[#0EA5E9] transition-colors mb-1.5">
                    {cat.title}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{cat.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Highest Interest */}
        {highestInterest.length > 0 && (
          <div className="max-w-5xl mx-auto px-6 pb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-[#F59E0B]/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Highest Interest</h2>
                <p className="text-xs text-slate-600">Ranked by AI crawler activity</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {highestInterest.map((memo) => (
                <MemoCard key={memo.id} memo={memo} />
              ))}
            </div>
          </div>
        )}

        {/* Newly Published */}
        {newlyPublished && newlyPublished.length > 0 && (
          <div className="max-w-5xl mx-auto px-6 pb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-[#0EA5E9]/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Newly Published</h2>
                <p className="text-xs text-slate-600">Latest memos added to the library</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {newlyPublished.map((memo) => (
                <MemoCard key={memo.id} memo={memo} badge="New" />
              ))}
            </div>
          </div>
        )}

        {/* Unique Perspective */}
        {uniquePerspective && uniquePerspective.length > 0 && (
          <div className="max-w-5xl mx-auto px-6 pb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 bg-[#8B5CF6]/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#8B5CF6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Unique Perspective</h2>
                <p className="text-xs text-slate-600">Original analysis filling gaps in AI knowledge</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {uniquePerspective.map((memo) => (
                <MemoCard key={memo.id} memo={memo} badge="Exclusive" />
              ))}
            </div>
          </div>
        )}

        {/* All Memos — Filterable */}
        <div id="all-memos" className="max-w-5xl mx-auto px-6 pb-20 border-t-2 border-white/10 pt-16 scroll-mt-20">
          <div className="mb-8">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide">
              All Memos
            </h2>
          </div>
          <FilterableMemoGrid memos={allMemosForListing} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-white/10 mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <svg className="w-5 h-5 text-[#0EA5E9]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-bold text-white">Context Memo</span>
            </div>
            <Link href="/" className="text-slate-400 hover:text-white transition-colors font-semibold uppercase text-xs tracking-wide">
              Home
            </Link>
          </div>
        </div>
      </footer>
      
      {brand && <AITrafficTracker brandId={brand.id} />}
    </div>
  )
}
