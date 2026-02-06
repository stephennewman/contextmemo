import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { AITrafficTracker } from '@/components/tracking/ai-traffic-tracker'
import { CONTEXT_MEMO_BRAND_ID } from '@/lib/memo/render'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const metadata: Metadata = {
  title: 'Memos - Context Memo',
  description: 'Structured memos built for people, AI models, and search engines. Fresh, factual, and cross-referenced with brand data.',
}

const MEMO_CATEGORIES = [
  {
    slug: 'guides',
    title: 'Guides',
    description: 'In-depth memos explaining concepts and strategies',
    memoTypes: ['guide', 'industry'],
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
    memoTypes: ['how_to', 'response'],
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
]

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

  // Get latest memos
  const { data: latestMemos } = await supabase
    .from('memos')
    .select('id, title, slug, memo_type, meta_description, published_at')
    .eq('brand_id', CONTEXT_MEMO_BRAND_ID)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(6)

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Header */}
      <header className="border-b-2 border-white/10 bg-[#0F172A]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <svg className="w-6 h-6 text-[#0EA5E9]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="font-black text-lg tracking-tight">CONTEXT MEMO</span>
          </a>
          <a 
            href="/signup" 
            className="hidden sm:block bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white font-bold text-sm px-4 py-2 transition-colors"
          >
            START FREE
          </a>
        </div>
      </header>
      
      {/* Hero */}
      <div className="border-b-2 border-white/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-[#0EA5E9]/10 to-transparent" />
        <div className="max-w-5xl mx-auto px-6 py-20 relative">
          <nav className="text-sm font-semibold text-slate-500 mb-6 uppercase tracking-wide">
            <a href="/" className="hover:text-white transition-colors">Home</a>
            <span className="mx-2 text-white/20">/</span>
            <span className="text-white">Memos</span>
          </nav>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight">Memos</h1>
          <p className="text-slate-400 mt-6 text-xl max-w-2xl leading-relaxed">
            Structured memos built for people, AI models, and search engines. Fresh, factual, and cross-referenced for accuracy.
          </p>
        </div>
      </div>
      
      {/* Categories */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-8">Browse by Type</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {MEMO_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/memos/${cat.slug}`}
              className="group p-8 bg-white/5 border-2 border-white/10 hover:border-[#0EA5E9]/50 hover:bg-white/10 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-[#0EA5E9]">{cat.icon}</div>
                <span className="text-sm font-bold text-slate-500">{countMap[cat.slug]} memos</span>
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-[#0EA5E9] transition-colors mb-2">
                {cat.title}
              </h3>
              <p className="text-slate-400 text-sm">{cat.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Latest Memos */}
      {latestMemos && latestMemos.length > 0 && (
        <div className="max-w-5xl mx-auto px-6 pb-20">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-8">Latest Memos</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {latestMemos.map((memo) => {
              // Determine the route based on memo_type
              let route = '/memos/how-to'
              if (['guide', 'industry'].includes(memo.memo_type)) route = '/memos/guides'
              else if (['comparison', 'alternative'].includes(memo.memo_type)) route = '/memos/compare'
              
              // Clean the slug
              const cleanSlug = memo.slug.replace(/^(guides|compare|how-to|resources)\//, '')
              
              return (
                <a
                  key={memo.id}
                  href={`${route}/${cleanSlug}`}
                  className="block p-6 bg-white/5 border-2 border-white/10 hover:border-[#0EA5E9]/50 hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-[#0EA5E9] uppercase tracking-wide">
                      {memo.memo_type.replace('_', ' ')}
                    </span>
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
                </a>
              )
            })}
          </div>
        </div>
      )}
      
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
            <a href="/" className="text-slate-400 hover:text-white transition-colors font-semibold uppercase text-xs tracking-wide">
              Home
            </a>
          </div>
        </div>
      </footer>
      
      {brand && <AITrafficTracker brandId={brand.id} />}
    </div>
  )
}
