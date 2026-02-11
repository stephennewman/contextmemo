import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { AITrafficTracker } from '@/components/tracking/ai-traffic-tracker'
import { 
  CONTEXT_MEMO_BRAND_ID, 
  BrandedMemoPageContent, 
  BrandedMemoListCard,
  markdownToHtml
} from '@/lib/memo/render'

export const revalidate = 3600 // ISR: regenerate at most once per hour

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const MEMO_TYPES = ['gap_fill', 'guide']
const ROUTE = '/tools'
const PAGE_TITLE = 'Tools & Resources'
const PAGE_DESCRIPTION = 'Curated tools, best practices, and resources for AI visibility'

interface Props {
  params: Promise<{ slug?: string[] }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const slugPath = slug?.join('/') || ''

  if (!slugPath) {
    return {
      title: `${PAGE_TITLE} - Context Memo`,
      description: PAGE_DESCRIPTION,
    }
  }

  const possibleSlugs = [
    slugPath,
    `gap/${slugPath}`,
    `guides/${slugPath}`,
  ]

  const { data: memo } = await supabase
    .from('memos')
    .select('title, meta_description, schema_json')
    .eq('brand_id', CONTEXT_MEMO_BRAND_ID)
    .in('memo_type', MEMO_TYPES)
    .in('slug', possibleSlugs)
    .eq('status', 'published')
    .single()

  if (!memo) {
    return { title: 'Not Found' }
  }

  return {
    title: `${memo.title} - Context Memo`,
    description: memo.meta_description || `${memo.title} - Context Memo`,
    openGraph: {
      title: memo.title,
      description: memo.meta_description || '',
      type: 'article',
    },
  }
}

export default async function ToolsPage({ params }: Props) {
  const { slug } = await params
  const slugPath = slug?.join('/') || ''

  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('*')
    .eq('id', CONTEXT_MEMO_BRAND_ID)
    .single()

  if (brandError || !brand) {
    notFound()
  }

  if (!slugPath) {
    const { data: memos } = await supabase
      .from('memos')
      .select('id, title, slug, memo_type, meta_description, published_at')
      .eq('brand_id', CONTEXT_MEMO_BRAND_ID)
      .in('memo_type', MEMO_TYPES)
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    return (
      <div className="min-h-screen bg-[#0F172A] text-white">
        {/* Header */}
        <header className="border-b-2 border-white/10 bg-[#0F172A]/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <svg className="w-6 h-6 text-[#0EA5E9]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-black text-lg tracking-tight">CONTEXT MEMO</span>
            </a>
            <a 
              href="/request-access" 
              className="hidden sm:block bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white font-bold text-sm px-4 py-2 transition-colors"
            >
              REQUEST ACCESS
            </a>
          </div>
        </header>
        
        {/* Hero */}
        <div className="border-b-2 border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-linear-to-b from-[#0EA5E9]/10 to-transparent" />
          <div className="max-w-4xl mx-auto px-6 py-16 relative">
            <nav className="text-sm font-semibold text-slate-500 mb-6 uppercase tracking-wide">
              <a href="/" className="hover:text-white transition-colors">Home</a>
              <span className="mx-2 text-white/20">/</span>
              <span className="text-white">{PAGE_TITLE}</span>
            </nav>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">{PAGE_TITLE}</h1>
            <p className="text-slate-400 mt-4 text-lg max-w-2xl">{PAGE_DESCRIPTION}</p>
          </div>
        </div>
        
        {/* Content */}
        <main className="max-w-4xl mx-auto px-6 py-12">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-8">
            {memos?.length || 0} Resources
          </p>
          {memos && memos.length > 0 ? (
            <div className="space-y-4">
              {memos.map((memo) => (
                <BrandedMemoListCard key={memo.id} memo={memo} route={ROUTE} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white/5 border-2 border-white/10">
              <svg className="w-12 h-12 text-white/20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500">No resources published yet.</p>
            </div>
          )}
        </main>
        
        {/* Footer */}
        <footer className="border-t-2 border-white/10 mt-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
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
        
        <AITrafficTracker brandId={brand.id} />
      </div>
    )
  }

  const possibleSlugs = [
    slugPath,
    `gap/${slugPath}`,
    `guides/${slugPath}`,
  ]

  const { data: memo, error: memoError } = await supabase
    .from('memos')
    .select('*')
    .eq('brand_id', CONTEXT_MEMO_BRAND_ID)
    .in('memo_type', MEMO_TYPES)
    .in('slug', possibleSlugs)
    .eq('status', 'published')
    .single()

  if (memoError || !memo) {
    notFound()
  }

  const contentHtml = await markdownToHtml(memo.content_markdown || '')

  return <BrandedMemoPageContent memo={memo} brand={brand} contentHtml={contentHtml} />
}
