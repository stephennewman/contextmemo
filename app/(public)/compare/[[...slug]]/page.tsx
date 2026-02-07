import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { AITrafficTracker } from '@/components/tracking/ai-traffic-tracker'
import { 
  CONTEXT_MEMO_BRAND_ID, 
  MemoPageContent, 
  MemoListCard,
  markdownToHtml
} from '@/lib/memo/render'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const MEMO_TYPE = 'comparison'
const ROUTE = '/compare'
const PAGE_TITLE = 'Comparisons'
const PAGE_DESCRIPTION = 'Side-by-side comparisons to help you choose the right solution'

interface Props {
  params: Promise<{ slug?: string[] }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const slugPath = slug?.join('/') || ''

  // Get brand
  const { data: brand } = await supabase
    .from('brands')
    .select('name, domain')
    .eq('id', CONTEXT_MEMO_BRAND_ID)
    .single()

  if (!brand) {
    return { title: 'Not Found' }
  }

  // Index page
  if (!slugPath) {
    return {
      title: `${PAGE_TITLE} - ${brand.name}`,
      description: PAGE_DESCRIPTION,
    }
  }

  // Try to find memo with new slug format first, then old format
  const possibleSlugs = [
    slugPath,
    `vs/${slugPath}`,
  ]

  const { data: memo } = await supabase
    .from('memos')
    .select('title, meta_description, schema_json')
    .eq('brand_id', CONTEXT_MEMO_BRAND_ID)
    .eq('memo_type', MEMO_TYPE)
    .in('slug', possibleSlugs)
    .eq('status', 'published')
    .single()

  if (!memo) {
    return { title: 'Not Found' }
  }

  return {
    title: memo.title,
    description: memo.meta_description || `${memo.title} - ${brand.name}`,
    openGraph: {
      title: memo.title,
      description: memo.meta_description || '',
      type: 'article',
    },
  }
}

export default async function ComparePage({ params }: Props) {
  const { slug } = await params
  const slugPath = slug?.join('/') || ''

  // Get brand
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('*')
    .eq('id', CONTEXT_MEMO_BRAND_ID)
    .single()

  if (brandError || !brand) {
    notFound()
  }

  // Index page - show all comparison memos
  if (!slugPath) {
    const { data: memos } = await supabase
      .from('memos')
      .select('id, title, slug, memo_type, meta_description, published_at')
      .eq('brand_id', CONTEXT_MEMO_BRAND_ID)
      .eq('memo_type', MEMO_TYPE)
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    return (
      <div className="min-h-screen bg-linear-to-b from-slate-50 to-white">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="max-w-3xl mx-auto px-6 py-12">
            <nav className="text-sm text-slate-500 mb-4">
              <a href="/" className="hover:text-slate-700">Home</a>
              <span className="mx-2">/</span>
              <span className="text-slate-900">{PAGE_TITLE}</span>
            </nav>
            <h1 className="text-3xl font-bold text-slate-900">{PAGE_TITLE}</h1>
            <p className="text-slate-600 mt-2">{PAGE_DESCRIPTION}</p>
          </div>
        </header>
        
        {/* Content */}
        <main className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-6">
            {memos?.length || 0} {PAGE_TITLE}
          </p>
          {memos && memos.length > 0 ? (
            <div className="space-y-4">
              {memos.map((memo) => (
                <MemoListCard key={memo.id} memo={memo} route={ROUTE} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500">No comparisons published yet.</p>
            </div>
          )}
        </main>
        
        {/* Footer */}
        <footer className="border-t bg-slate-50 mt-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Context Memo</span>
              </div>
              <a href="/" className="hover:text-slate-700 transition-colors">
                Home
              </a>
            </div>
          </div>
        </footer>
        
        <AITrafficTracker brandId={brand.id} />
      </div>
    )
  }

  // Try to find memo with new slug format first, then old format
  const possibleSlugs = [
    slugPath,
    `vs/${slugPath}`,
  ]

  const { data: memo, error: memoError } = await supabase
    .from('memos')
    .select('*')
    .eq('brand_id', CONTEXT_MEMO_BRAND_ID)
    .eq('memo_type', MEMO_TYPE)
    .in('slug', possibleSlugs)
    .eq('status', 'published')
    .single()

  if (memoError || !memo) {
    notFound()
  }

  const contentHtml = await markdownToHtml(memo.content_markdown || '')

  return <MemoPageContent memo={memo} brand={brand} contentHtml={contentHtml} />
}
