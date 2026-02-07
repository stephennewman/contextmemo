import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { marked, Renderer } from 'marked'

// Custom renderer to open all links in new tab
const renderer = new Renderer()
renderer.link = ({ href, title, text }) => {
  const titleAttr = title ? ` title="${title}"` : ''
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`
}
import { headers } from 'next/headers'
import { AITrafficTracker } from '@/components/tracking/ai-traffic-tracker'

// Use service role client for public access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Helper to detect if accessed via subdomain
async function isSubdomainAccess(subdomain: string): Promise<boolean> {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || ''
  const hostParts = host.split('.')
  
  // Check if first part matches subdomain (e.g., checkit.contextmemo.com)
  if (hostParts.length >= 3 && hostParts[0] === subdomain) {
    return true
  }
  // Local dev: checkit.localhost:3000
  if (hostParts.length === 2 && hostParts[0] === subdomain && hostParts[1].startsWith('localhost')) {
    return true
  }
  return false
}

interface Props {
  params: Promise<{ subdomain: string; slug?: string[] }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdomain, slug } = await params
  const slugPath = slug?.join('/') || ''
  
  // Get brand (include id for memo lookup)
  const { data: brand } = await supabase
    .from('brands')
    .select('id, name, domain')
    .eq('subdomain', subdomain)
    .single()

  if (!brand) {
    return { title: 'Not Found' }
  }

  // If no slug, return brand homepage metadata
  if (!slugPath) {
    return {
      title: `${brand.name} - Context Memos`,
      description: `Factual reference memos about ${brand.name}`,
    }
  }

  // Get memo
  const { data: memo } = await supabase
    .from('memos')
    .select('title, meta_description, schema_json')
    .eq('brand_id', brand.id)
    .eq('slug', slugPath)
    .eq('status', 'published')
    .single()

  if (!memo) {
    return { title: 'Not Found' }
  }

  return {
    title: memo.title,
    description: memo.meta_description || `${memo.title} - Context Memo for ${brand.name}`,
    openGraph: {
      title: memo.title,
      description: memo.meta_description || '',
      type: 'article',
    },
  }
}

export default async function MemoPage({ params }: Props) {
  const { subdomain, slug } = await params
  const slugPath = slug?.join('/') || ''

  // Detect if accessed via subdomain for correct link generation
  const viaSubdomain = await isSubdomainAccess(subdomain)
  
  // Generate link prefix based on access method
  const linkPrefix = viaSubdomain ? '' : `/memo/${subdomain}`

  // Get brand
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (brandError || !brand) {
    notFound()
  }

  // If no slug, show brand memo index
  if (!slugPath) {
    // Get all published memos for this brand
    const { data: memos } = await supabase
      .from('memos')
      .select('id, title, slug, memo_type, meta_description, published_at')
      .eq('brand_id', brand.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    return (
      <div className="min-h-screen bg-linear-to-b from-slate-50 to-white">
        {/* Header */}
        <header className="bg-white border-b">
          <div className="max-w-3xl mx-auto px-6 py-12">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-linear-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                <span className="text-white font-bold text-xl">
                  {brand.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{brand.name}</h1>
                <p className="text-slate-500">Context Memos</p>
              </div>
            </div>
            <p className="text-slate-600 mt-4 max-w-xl">
              Factual reference documents about {brand.name} for AI assistants and search engines.
            </p>
          </div>
        </header>
        
        {/* Content */}
        <main className="max-w-3xl mx-auto px-6 py-12">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-6">
            {memos?.length || 0} Published Memos
          </h2>
          {memos && memos.length > 0 ? (
            <div className="space-y-4">
              {memos.map((memo) => (
                <a
                  key={memo.id}
                  href={`${linkPrefix}/${memo.slug}`}
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
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500">No memos published yet.</p>
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
              <a href="https://contextmemo.com" className="hover:text-slate-700 transition-colors">
                Learn more
              </a>
            </div>
          </div>
        </footer>
        
        {/* AI Traffic Tracking */}
        <AITrafficTracker brandId={brand.id} />
      </div>
    )
  }

  // Get specific memo
  const { data: memo, error: memoError } = await supabase
    .from('memos')
    .select('*')
    .eq('brand_id', brand.id)
    .eq('slug', slugPath)
    .eq('status', 'published')
    .single()

  if (memoError || !memo) {
    notFound()
  }

  // Pre-process content to ensure proper markdown formatting
  let processedContent = memo.content_markdown || ''
  
  // If content doesn't have proper markdown headers, try to add them
  if (!processedContent.includes('## ') && !processedContent.includes('# ')) {
    // Common header patterns to convert
    const headerPatterns = [
      'Overview', 'Key Capabilities', 'Customer Examples', 'Getting Started', 
      'Sources', 'Key Difference', 'Key Differences', 'How to Choose',
      'What is', 'Why', 'Steps to', 'Tools for', 'About', 'Top Alternatives',
      'Quick Comparison', 'IoT Temperature Monitoring', 'Digital Checklists',
      'Workflow Management', 'Predictive Analytics', 'Mobile-First', 'Mobile-first',
      'Real-time Monitoring', 'Implementation', 'Benefits', 'Features', 'Pricing',
      'Use Cases', 'Integration', 'Security', 'Support', 'Conclusion'
    ]
    
    // Process line by line
    const lines = processedContent.split('\n')
    const processedLines = lines.map((line: string, i: number) => {
      const trimmed = line.trim()
      
      // Skip empty lines
      if (!trimmed) return line
      
      // Check if this looks like a main title (first non-empty line, short)
      if (i === 0 && trimmed.length < 80 && !trimmed.startsWith('#')) {
        return `# ${trimmed}`
      }
      
      // Check for "Last verified" line
      if (trimmed.toLowerCase().startsWith('last verified')) {
        return `**${trimmed}**`
      }
      
      // Check if line matches a header pattern
      for (const pattern of headerPatterns) {
        if (trimmed === pattern || trimmed.startsWith(`${pattern}:`)) {
          // Determine header level based on pattern
          const isMainSection = ['Overview', 'Key Capabilities', 'Customer Examples', 
            'Getting Started', 'Sources', 'How to Choose', 'About', 'Top Alternatives',
            'Quick Comparison', 'Key Difference', 'Key Differences'].includes(pattern)
          return isMainSection ? `\n## ${trimmed}\n` : `\n### ${trimmed}\n`
        }
      }
      
      return line
    })
    
    processedContent = processedLines.join('\n')
  }
  
  // Convert markdown to HTML
  const contentHtml = await marked(processedContent, { renderer })
  
  const formattedDate = new Date(memo.last_verified_at || memo.updated_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

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
              href={`${linkPrefix}/`} 
              className="text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              {brand.name}
            </a>
            <span className="text-slate-300">/</span>
            <span className="text-slate-400 capitalize">{memo.memo_type.replace('_', ' ')}</span>
          </nav>
        </div>
      </header>
      
      {/* Hero */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-6">
            {memo.title}
          </h1>
          {memo.meta_description && (
            <p className="text-lg text-slate-600 leading-relaxed mb-6">
              {memo.meta_description}
            </p>
          )}
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
            
            {/* Transparency statement */}
            {memo.generation_model && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800 mb-1">About This Article</p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {memo.provenance?.source_competitor ? (
                        <>
                          This article was inspired by content from <strong>{memo.provenance.source_competitor}</strong> and 
                          generated using <strong>{brand.name}&apos;s</strong> verified brand profile to create authentic, 
                          accurate content that reflects our expertise and perspective.
                        </>
                      ) : (
                        <>
                          This article was generated using <strong>{brand.name}&apos;s</strong> verified brand profile 
                          to create authentic, accurate content that reflects our expertise and perspective.
                        </>
                      )}
                    </p>
                    
                    <details className="mt-3 text-xs text-slate-500">
                      <summary className="cursor-pointer hover:text-slate-700 font-medium">View full provenance</summary>
                      <div className="mt-2 p-3 bg-white rounded border border-slate-100 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500">AI Model</span>
                          <span className="font-mono">{memo.generation_model}</span>
                        </div>
                        {memo.generation_duration_ms && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Generation time</span>
                            <span>{(memo.generation_duration_ms / 1000).toFixed(1)}s</span>
                          </div>
                        )}
                        {memo.generation_tokens?.total && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tokens used</span>
                            <span>{memo.generation_tokens.total.toLocaleString()}</span>
                          </div>
                        )}
                        {memo.provenance?.source_url && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Inspired by</span>
                            <a href={memo.provenance.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-48">
                              {new URL(memo.provenance.source_url).hostname}
                            </a>
                          </div>
                        )}
                        {memo.provenance?.generated_at && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Generated</span>
                            <span>{new Date(memo.provenance.generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        )}
                        {(memo.human_edits_count || 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Human edits</span>
                            <span>{memo.human_edits_count} revision{memo.human_edits_count > 1 ? 's' : ''}</span>
                          </div>
                        )}
                        {memo.reviewed_at && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Human verified</span>
                            <span>{new Date(memo.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        )}
                      </div>
                    </details>
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
          className="memo-content text-slate-600 text-[1.0625rem] leading-7
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
            [&_a]:text-blue-600 [&_a]:font-medium [&_a]:no-underline hover:[&_a]:underline
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
            [&>p>em:only-child]:text-slate-500 [&>p>em:only-child]:text-sm [&>p>em:only-child]:block [&>p>em:only-child]:mb-8
            [&_em]:text-slate-500 [&_em]:italic"
          dangerouslySetInnerHTML={{ __html: contentHtml }} 
        />
      </main>
      
      {/* Source Attribution */}
      <div className="max-w-3xl mx-auto px-6 pb-12">
        <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
              <span className="text-slate-600 font-semibold text-sm">
                {brand.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-slate-900">{brand.name}</p>
              <p className="text-sm text-slate-500 mt-1">
                This memo contains factual information about {brand.name}, auto-generated from verified brand sources.
              </p>
              {brand.domain && (
                <a 
                  href={`https://${brand.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-2"
                >
                  Visit {brand.domain}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      
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
              <a href="https://contextmemo.com" className="hover:text-slate-700 transition-colors">
                About
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
    </div>
  )
}
