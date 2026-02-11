import { marked, Renderer } from 'marked'

// Custom renderer to open all links in new tab
const renderer = new Renderer()
renderer.link = ({ href, title, text }) => {
  const titleAttr = title ? ` title="${title}"` : ''
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
}
import { AITrafficTracker } from '@/components/tracking/ai-traffic-tracker'
import { GtagBrandPageView } from '@/components/tracking/google-analytics'

// Context Memo brand ID - used for main domain content
export const CONTEXT_MEMO_BRAND_ID = '9fa32d64-e1c6-4be3-b12c-1be824a6c63f'

// Map memo types to URL prefixes
export const MEMO_TYPE_TO_ROUTE: Record<string, string> = {
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

// Human-readable labels for memo types (used in breadcrumbs)
export const MEMO_TYPE_LABELS: Record<string, string> = {
  comparison: 'Compare',
  alternative: 'Alternatives',
  how_to: 'Guides',
  gap_fill: 'Guides',
  product_deploy: 'Insights',
  industry: 'Industry',
  resource: 'Resources',
  response: 'Resources',
}

// Map old slug prefixes to new routes
export const OLD_SLUG_PREFIX_MAP: Record<string, string> = {
  'vs/': '/compare/',
  'alternatives-to/': '/alternatives/',
  'how/': '/guides/',
  'gap/': '/tools/',
  'insights/': '/insights/',
  'for/': '/for/',
  'resources/': '/resources/',
}

// Convert old slug format to new clean slug
export function normalizeSlug(slug: string, memoType: string): string {
  // Remove old prefixes if present
  for (const [oldPrefix] of Object.entries(OLD_SLUG_PREFIX_MAP)) {
    if (slug.startsWith(oldPrefix)) {
      return slug.slice(oldPrefix.length)
    }
  }
  return slug
}

// Generate canonical URL for a memo
export function getMemoUrl(slug: string, memoType: string): string {
  const route = MEMO_TYPE_TO_ROUTE[memoType] || '/tools'
  const cleanSlug = normalizeSlug(slug, memoType)
  return `${route}/${cleanSlug}`
}

// Pre-process markdown content
export function processMarkdownContent(content: string): string {
  let processedContent = content || ''
  
  // If content doesn't have proper markdown headers, try to add them
  if (!processedContent.includes('## ') && !processedContent.includes('# ')) {
    const headerPatterns = [
      'Overview', 'Key Capabilities', 'Customer Examples', 'Getting Started', 
      'Sources', 'Key Difference', 'Key Differences', 'How to Choose',
      'What is', 'Why', 'Steps to', 'Tools for', 'About', 'Top Alternatives',
      'Quick Comparison', 'The Short Answer', 'Understanding the Problem',
      'How Tools Compare', 'What to Consider', 'Key Considerations',
      'IoT Temperature Monitoring', 'Digital Checklists',
      'Workflow Management', 'Predictive Analytics', 'Mobile-First', 'Mobile-first',
      'Real-time Monitoring', 'Implementation', 'Benefits', 'Features', 'Pricing',
      'Use Cases', 'Integration', 'Security', 'Support', 'Conclusion'
    ]
    
    const lines = processedContent.split('\n')
    const processedLines = lines.map((line: string, i: number) => {
      const trimmed = line.trim()
      
      if (!trimmed) return line
      
      if (i === 0 && trimmed.length < 80 && !trimmed.startsWith('#')) {
        return `# ${trimmed}`
      }
      
      if (trimmed.toLowerCase().startsWith('last verified')) {
        return `**${trimmed}**`
      }
      
      for (const pattern of headerPatterns) {
        if (trimmed === pattern || trimmed.startsWith(`${pattern}:`)) {
          const isMainSection = ['Overview', 'Key Capabilities', 'Customer Examples', 
            'Getting Started', 'Sources', 'How to Choose', 'About', 'Top Alternatives',
            'Quick Comparison', 'Key Difference', 'Key Differences', 'The Short Answer',
            'Understanding the Problem', 'How Tools Compare', 'What to Consider',
            'Key Considerations'].includes(pattern)
          return isMainSection ? `\n## ${trimmed}\n` : `\n### ${trimmed}\n`
        }
      }
      
      return line
    })
    
    processedContent = processedLines.join('\n')
  }
  
  return processedContent
}

// Convert markdown to HTML
export async function markdownToHtml(content: string): Promise<string> {
  const processed = processMarkdownContent(content)
  return await marked(processed, { renderer })
}

// Memo content styles
export const memoContentStyles = `memo-content text-slate-600 text-[1.0625rem] leading-7
  [&>h1]:hidden
  [&>p:first-child]:hidden
  [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-slate-900 [&>h2]:mt-14 [&>h2]:mb-5 [&>h2]:pb-3 [&>h2]:border-b [&>h2]:border-slate-200
  [&>h2:first-of-type]:mt-0
  [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-slate-800 [&>h3]:mt-10 [&>h3]:mb-4
  [&>h3+p]:mt-0
  [&>p]:mb-6 [&>p]:leading-relaxed
  [&_strong]:text-slate-800 [&_strong]:font-semibold
  [&>ul]:my-8 [&>ul]:space-y-3 [&>ul]:list-none [&>ul]:pl-0
  [&>ul>li]:relative [&>ul>li]:pl-7 [&>ul>li]:leading-relaxed
  [&>ul>li]:before:content-[''] [&>ul>li]:before:absolute [&>ul>li]:before:left-0 [&>ul>li]:before:top-[0.6rem] [&>ul>li]:before:w-1.5 [&>ul>li]:before:h-1.5 [&>ul>li]:before:bg-blue-500 [&>ul>li]:before:rounded-full
  [&>ol]:my-8 [&>ol]:pl-6 [&>ol]:space-y-4
  [&_a]:text-blue-600 [&_a]:font-medium [&_a]:no-underline [&_a:hover]:underline
  [&>table]:w-full [&>table]:my-10 [&>table]:border-collapse [&>table]:text-[0.9375rem] [&>table]:rounded-lg [&>table]:overflow-hidden [&>table]:border [&>table]:border-slate-200
  [&_thead]:bg-slate-50
  [&_th]:p-4 [&_th]:text-left [&_th]:border-b [&_th]:border-slate-200 [&_th]:font-semibold [&_th]:text-slate-800
  [&_td]:p-4 [&_td]:border-b [&_td]:border-slate-100
  [&_tbody_tr:last-child_td]:border-b-0
  [&_tr:nth-child(even)_td]:bg-slate-50/50
  [&>blockquote]:my-8 [&>blockquote]:py-4 [&>blockquote]:px-6 [&>blockquote]:bg-blue-50 [&>blockquote]:border-l-4 [&>blockquote]:border-blue-500 [&>blockquote]:rounded-r-lg
  [&>blockquote_p]:m-0 [&>blockquote_p]:text-blue-900
  [&>hr]:my-12 [&>hr]:border-0 [&>hr]:border-t [&>hr]:border-slate-200
  [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
  [&>p>em:only-child]:text-slate-400 [&>p>em:only-child]:text-xs [&>p>em:only-child]:block [&>p>em:only-child]:mb-8
  [&_em]:text-slate-500 [&_em]:italic
  [&_img]:w-full [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:my-8 [&_img]:shadow-sm [&_img]:border [&_img]:border-slate-200
  [&>p>img]:block [&>p>img]:mx-auto
  [&>p:has(>img)+p>em:only-child]:mt-[-1.5rem] [&>p:has(>img)+p>em:only-child]:mb-6 [&>p:has(>img)+p>em:only-child]:text-[11px] [&>p:has(>img)+p>em:only-child]:text-slate-400`

interface MemoData {
  id: string
  title: string
  slug: string
  memo_type: string
  content_markdown: string
  meta_description?: string
  schema_json?: Record<string, unknown>
  last_verified_at?: string
  updated_at: string
  published_at?: string
  generation_model?: string
  generation_duration_ms?: number
  generation_tokens?: { total?: number }
  provenance?: { source_competitor?: string; source_url?: string; generated_at?: string }
  review_status?: string
  reviewed_at?: string
  reviewer_notes?: string
  human_edits_count?: number
}

interface BrandData {
  id: string
  name: string
  domain?: string
}

interface MemoPageProps {
  memo: MemoData
  brand: BrandData
  contentHtml: string
}

export function MemoPageContent({ memo, brand, contentHtml }: MemoPageProps) {
  const formattedDate = new Date(memo.last_verified_at || memo.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const memoTypeLabel = MEMO_TYPE_LABELS[memo.memo_type] || memo.memo_type.replace('_', ' ')
  const route = MEMO_TYPE_TO_ROUTE[memo.memo_type] || '/tools'

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white">
      {/* Schema.org JSON-LD */}
      {memo.schema_json && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(memo.schema_json) }}
        />
      )}
      
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <a 
              href="/" 
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              {brand.name}
            </a>
            <span className="text-slate-300">/</span>
            <a 
              href={route}
              className="text-slate-400 hover:text-slate-600 capitalize transition-colors"
            >
              {memoTypeLabel}
            </a>
          </nav>
        </div>
      </header>
      
      {/* Hero */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
            {memo.title}
          </h1>
          
          {/* Author and verification byline */}
          <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{brand.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {memo.review_status === 'human_approved' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Human Approved
                  </span>
                )}
                {memo.review_status === 'human_reviewed' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Human Reviewed
                  </span>
                )}
                {memo.review_status === 'human_edited' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Human Edited
                  </span>
                )}
                <span className="text-sm text-slate-500">
                  Verified {formattedDate}
                </span>
              </div>
            </div>
            
            {/* Reviewer notes if present */}
            {memo.reviewer_notes && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-blue-800 mb-1">Editor&apos;s Note</p>
                    <p className="text-sm text-blue-900">{memo.reviewer_notes}</p>
                    {memo.reviewed_at && (
                      <p className="text-xs text-blue-600 mt-2">
                        Reviewed {new Date(memo.reviewed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
      
      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <article 
          className={memoContentStyles}
          dangerouslySetInnerHTML={{ __html: contentHtml }} 
        />
      </main>
      
      {/* Brand link — hide for contextmemo's own memos */}
      {brand.domain && !brand.domain.toLowerCase().includes('contextmemo') && (
        <div className="max-w-3xl mx-auto px-6 pb-12">
          <div className="border-t border-slate-200 pt-8">
            <a 
              href={`https://${brand.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Learn more at {brand.domain}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}
      
      {/* Footer */}
      <footer className="border-t bg-slate-50">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Context Memo</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="/" className="hover:text-slate-700 transition-colors">
                Home
              </a>
              <span className="text-slate-300">·</span>
              <a href="mailto:support@contextmemo.com" className="hover:text-slate-700 transition-colors">
                Report Issue
              </a>
            </div>
          </div>
        </div>
      </footer>
      
      {/* AI Traffic Tracking */}
      <AITrafficTracker brandId={brand.id} memoId={memo.id} />
      <GtagBrandPageView
        brandName={brand.name}
        brandSubdomain={brand.domain || brand.name}
        memoType={memo.memo_type}
        memoTitle={memo.title}
      />
    </div>
  )
}

// Memo list card component for index pages
interface MemoListCardProps {
  memo: {
    id: string
    title: string
    slug: string
    memo_type: string
    meta_description?: string
    published_at?: string
  }
  route: string
}

export function MemoListCard({ memo, route }: MemoListCardProps) {
  const cleanSlug = normalizeSlug(memo.slug, memo.memo_type)
  
  return (
    <a
      href={`${route}/${cleanSlug}`}
      className="block p-6 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              {memo.memo_type.replace('_', ' ')}
            </span>
            {memo.published_at && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-400">
                  {new Date(memo.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </>
            )}
          </div>
          <h3 className="font-semibold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
            {memo.title}
          </h3>
          {memo.meta_description && (
            <p className="text-slate-600 mt-2 text-sm line-clamp-2">
              {memo.meta_description}
            </p>
          )}
        </div>
        <svg 
          className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all shrink-0 mt-1" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  )
}

// Branded content styles for Context Memo's "Bold Electric" theme
export const brandedMemoContentStyles = `memo-content text-slate-300 text-[1.0625rem] leading-7
  [&>h1]:hidden
  [&>p:first-child]:hidden
  [&>h2]:text-2xl [&>h2]:font-black [&>h2]:text-white [&>h2]:mt-14 [&>h2]:mb-5 [&>h2]:pb-3 [&>h2]:border-b-2 [&>h2]:border-white/20
  [&>h2:first-of-type]:mt-0
  [&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-white [&>h3]:mt-10 [&>h3]:mb-4
  [&>h3+p]:mt-0
  [&>p]:mb-6 [&>p]:leading-relaxed
  [&_strong]:text-white [&_strong]:font-semibold
  [&>ul]:my-8 [&>ul]:space-y-3 [&>ul]:list-none [&>ul]:pl-0
  [&>ul>li]:relative [&>ul>li]:pl-7 [&>ul>li]:leading-relaxed
  [&>ul>li]:before:content-[''] [&>ul>li]:before:absolute [&>ul>li]:before:left-0 [&>ul>li]:before:top-[0.6rem] [&>ul>li]:before:w-2 [&>ul>li]:before:h-2 [&>ul>li]:before:bg-[#0EA5E9]
  [&>ol]:my-8 [&>ol]:pl-6 [&>ol]:space-y-4
  [&_a]:text-[#0EA5E9] [&_a]:font-medium [&_a]:no-underline [&_a:hover]:underline
  [&>table]:w-full [&>table]:my-10 [&>table]:border-collapse [&>table]:text-[0.9375rem] [&>table]:overflow-hidden [&>table]:border-2 [&>table]:border-white/20
  [&_thead]:bg-white/10
  [&_th]:p-4 [&_th]:text-left [&_th]:border-b-2 [&_th]:border-white/20 [&_th]:font-bold [&_th]:text-white [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-sm
  [&_td]:p-4 [&_td]:border-b [&_td]:border-white/10
  [&_tbody_tr:last-child_td]:border-b-0
  [&_tr:nth-child(even)_td]:bg-white/5
  [&>blockquote]:my-8 [&>blockquote]:py-4 [&>blockquote]:px-6 [&>blockquote]:bg-[#0EA5E9]/10 [&>blockquote]:border-l-4 [&>blockquote]:border-[#0EA5E9]
  [&>blockquote_p]:m-0 [&>blockquote_p]:text-white
  [&>hr]:my-12 [&>hr]:border-0 [&>hr]:border-t-2 [&>hr]:border-white/20
  [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:text-[#0EA5E9]
  [&>p>em:only-child]:text-slate-500 [&>p>em:only-child]:text-xs [&>p>em:only-child]:block [&>p>em:only-child]:mb-8
  [&_em]:text-slate-400 [&_em]:italic
  [&_img]:w-full [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-xl [&_img]:my-8 [&_img]:shadow-lg [&_img]:border-2 [&_img]:border-white/10
  [&>p>img]:block [&>p>img]:mx-auto
  [&>p:has(>img)+p>em:only-child]:mt-[-1.5rem] [&>p:has(>img)+p>em:only-child]:mb-6 [&>p:has(>img)+p>em:only-child]:text-[11px] [&>p:has(>img)+p>em:only-child]:text-slate-500`

// Context Memo branded memo page - "Bold Electric" theme
export function BrandedMemoPageContent({ memo, brand, contentHtml }: MemoPageProps) {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Schema.org JSON-LD */}
      {memo.schema_json && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(memo.schema_json) }}
        />
      )}
      
      {/* Header */}
      <header className="border-b-2 border-white/10 bg-[#0F172A]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a 
            href="/" 
            className="flex items-center gap-2 text-white hover:text-[#0EA5E9] transition-colors"
          >
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
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight mb-6">
            {memo.title}
          </h1>
          {memo.meta_description && (
            <p className="text-xl text-slate-400 leading-relaxed max-w-3xl">
              {memo.meta_description}
            </p>
          )}
        </div>
      </div>
      
      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <article 
          className={brandedMemoContentStyles}
          dangerouslySetInnerHTML={{ __html: contentHtml }} 
        />
      </main>
      
      {/* Footer */}
      <footer className="border-t-2 border-white/10 bg-[#0F172A]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <svg className="w-5 h-5 text-[#0EA5E9]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="font-bold text-white">Context Memo</span>
            </div>
            <div className="flex items-center gap-6 font-semibold tracking-wide">
              <a href="/" className="text-slate-400 hover:text-white transition-colors uppercase text-xs">
                Home
              </a>
              <span className="text-white/20">·</span>
              <a href="mailto:support@contextmemo.com" className="text-slate-400 hover:text-white transition-colors uppercase text-xs">
                Report Issue
              </a>
            </div>
          </div>
        </div>
      </footer>
      
      {/* AI Traffic Tracking */}
      <AITrafficTracker brandId={brand.id} memoId={memo.id} />
      <GtagBrandPageView
        brandName={brand.name}
        brandSubdomain={brand.domain || brand.name}
        memoType={memo.memo_type}
        memoTitle={memo.title}
      />
    </div>
  )
}

// Branded memo list card for Context Memo index pages
export function BrandedMemoListCard({ memo, route }: MemoListCardProps) {
  const cleanSlug = normalizeSlug(memo.slug, memo.memo_type)
  
  return (
    <a
      href={`${route}/${cleanSlug}`}
      className="block p-6 bg-white/5 border-2 border-white/10 hover:border-[#0EA5E9]/50 hover:bg-white/10 transition-all group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              {memo.memo_type.replace('_', ' ')}
            </span>
            {memo.published_at && (
              <>
                <span className="text-white/20">·</span>
                <span className="text-xs text-slate-500">
                  {new Date(memo.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </>
            )}
          </div>
          <h3 className="font-bold text-lg text-white group-hover:text-[#0EA5E9] transition-colors">
            {memo.title}
          </h3>
          {memo.meta_description && (
            <p className="text-slate-400 mt-2 text-sm line-clamp-2">
              {memo.meta_description}
            </p>
          )}
        </div>
        <svg 
          className="w-5 h-5 text-white/20 group-hover:text-[#0EA5E9] group-hover:translate-x-1 transition-all shrink-0 mt-1" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </a>
  )
}
