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
import { GtagBrandPageView } from '@/components/tracking/google-analytics'
import { MEMO_TYPE_LABELS } from '@/lib/memo/render'
import { BrandTheme } from '@/lib/supabase/types'

// Use service role client for public access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Helper to detect access method: subdomain, custom domain, or reverse proxy
async function getAccessContext(subdomain: string): Promise<{
  viaSubdomain: boolean
  proxyBasePath: string | null
}> {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || ''
  const hostParts = host.split('.')
  
  // Check for reverse proxy via X-Forwarded-Prefix header
  // (set by customer's proxy to indicate the base path, e.g., /memos)
  const forwardedPrefix = headersList.get('x-forwarded-prefix') || headersList.get('x-cm-base-path')
  
  // Check if first part matches subdomain (e.g., checkit.contextmemo.com)
  if (hostParts.length >= 3 && hostParts[0] === subdomain) {
    return { viaSubdomain: true, proxyBasePath: forwardedPrefix }
  }
  // Local dev: checkit.localhost:3000
  if (hostParts.length === 2 && hostParts[0] === subdomain && hostParts[1].startsWith('localhost')) {
    return { viaSubdomain: true, proxyBasePath: forwardedPrefix }
  }
  // Custom domain: check if host matches brand's custom_domain (e.g., ai.krezzo.com)
  if (!host.includes('contextmemo.com') && !host.includes('localhost')) {
    const { data: brand } = await supabase
      .from('brands')
      .select('subdomain, proxy_base_path')
      .eq('custom_domain', host)
      .eq('domain_verified', true)
      .single()
    if (brand?.subdomain === subdomain) {
      return { viaSubdomain: true, proxyBasePath: forwardedPrefix || brand.proxy_base_path }
    }
    
    // Could be a reverse proxy from the brand's main domain — check proxy_origin
    // The proxy forwards with the original host, so we check if any brand has this as proxy_origin
    const { data: proxyBrand } = await supabase
      .from('brands')
      .select('subdomain, proxy_base_path')
      .eq('subdomain', subdomain)
      .not('proxy_origin', 'is', null)
      .single()
    if (proxyBrand) {
      return { viaSubdomain: true, proxyBasePath: forwardedPrefix || proxyBrand.proxy_base_path }
    }
  }
  return { viaSubdomain: false, proxyBasePath: forwardedPrefix }
}

interface Props {
  params: Promise<{ subdomain: string; slug?: string[] }>
}

// Helper to build canonical URL for a brand's memo
function getCanonicalUrl(brand: { subdomain: string; custom_domain?: string | null; domain_verified?: boolean | null; proxy_origin?: string | null; proxy_base_path?: string | null }, slugPath?: string): string {
  // Priority: proxy origin (subfolder on brand's domain) > custom domain > subdomain
  if (brand.proxy_origin && brand.proxy_base_path) {
    const base = brand.proxy_origin.replace(/\/$/, '')
    const path = brand.proxy_base_path.replace(/\/$/, '')
    return slugPath ? `${base}${path}/${slugPath}` : `${base}${path}`
  }
  if (brand.custom_domain && brand.domain_verified) {
    return slugPath ? `https://${brand.custom_domain}/${slugPath}` : `https://${brand.custom_domain}`
  }
  return slugPath
    ? `https://${brand.subdomain}.contextmemo.com/${slugPath}`
    : `https://${brand.subdomain}.contextmemo.com`
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subdomain, slug } = await params
  const slugPath = slug?.join('/') || ''
  
  // Get brand (include id and domain fields for canonical URL)
  const { data: brand } = await supabase
    .from('brands')
    .select('id, name, domain, subdomain, custom_domain, domain_verified, proxy_origin, proxy_base_path')
    .eq('subdomain', subdomain)
    .single()

  if (!brand) {
    return { title: 'Not Found' }
  }

  // If no slug, return brand homepage metadata
  if (!slugPath) {
    const canonical = getCanonicalUrl(brand)
    return {
      title: `${brand.name} Knowledge Base`,
      description: `Factual reference memos about ${brand.name}`,
      alternates: { canonical },
      openGraph: {
        title: `${brand.name} Knowledge Base`,
        description: `Factual reference memos about ${brand.name}`,
        url: canonical,
        type: 'website',
      },
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

  const canonical = getCanonicalUrl(brand, slugPath)

  return {
    title: memo.title,
    description: memo.meta_description || `${memo.title} - ${brand.name}`,
    alternates: { canonical },
    openGraph: {
      title: memo.title,
      description: memo.meta_description || '',
      url: canonical,
      type: 'article',
    },
  }
}

export default async function MemoPage({ params }: Props) {
  const { subdomain, slug } = await params
  const slugPath = slug?.join('/') || ''

  // Detect access method: subdomain, custom domain, or reverse proxy
  const { viaSubdomain, proxyBasePath } = await getAccessContext(subdomain)
  
  // Generate link prefix based on access method
  // Priority: proxy base path > subdomain (no prefix) > fallback path
  const linkPrefix = proxyBasePath
    ? proxyBasePath.replace(/\/$/, '')  // e.g., /memos
    : viaSubdomain
      ? ''
      : `/memo/${subdomain}`

  // Get brand
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('*')
    .eq('subdomain', subdomain)
    .single()

  if (brandError || !brand) {
    notFound()
  }

  // Extract brand theme from context (if configured)
  const brandContext = brand.context as Record<string, unknown> | null
  const theme = (brandContext?.theme as BrandTheme) || null

  // If no slug, show brand memo index
  if (!slugPath) {
    // Get all published memos for this brand
    const { data: memos } = await supabase
      .from('memos')
      .select('id, title, slug, memo_type, meta_description, published_at')
      .eq('brand_id', brand.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    // Determine if this is a dark theme
    const isDark = !!theme?.bg_color
    const bgColor = theme?.bg_color || '#f8fafc'
    const textColor = theme?.text_color || (isDark ? '#e5e5e5' : '#475569')
    const headingColor = isDark ? '#ffffff' : '#0f172a'
    const mutedColor = isDark ? '#a3a3a3' : '#94a3b8'
    const borderColor = isDark ? '#262626' : '#e2e8f0'
    const cardBg = isDark ? '#171717' : '#ffffff'
    const accentColor = theme?.primary_color || (isDark ? '#86efac' : '#3b82f6')

    return (
      <div className="min-h-screen" style={{ background: bgColor, color: textColor, fontFamily: theme?.font_family ? `'${theme.font_family}', system-ui, sans-serif` : undefined }}>
        {/* Brand font */}
        {theme?.font_url && (
          <link rel="stylesheet" href={theme.font_url} />
        )}
        {/* External CSS */}
        {theme?.external_css_url && (
          <link rel="stylesheet" href={theme.external_css_url} />
        )}

        {/* Custom header or default */}
        {theme?.header_html ? (
          <div dangerouslySetInnerHTML={{ __html: theme.header_html }} />
        ) : (
          <header style={{ background: cardBg, borderBottom: `1px solid ${borderColor}` }}>
            <div className="max-w-3xl mx-auto px-6 py-12">
              <div className="flex items-center gap-4 mb-4">
                {theme?.logo_url ? (
                  <>
                    <img src={theme.logo_url} alt={brand.name} className="h-10 w-auto" />
                    <p style={{ color: mutedColor }} className="text-lg">Knowledge Base</p>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accentColor}, ${theme?.primary_text || accentColor})` }}>
                      <span className="text-white font-bold text-xl">
                        {brand.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold" style={{ color: headingColor }}>{theme?.site_name || brand.name}</h1>
                      <p style={{ color: mutedColor }}>Knowledge Base</p>
                    </div>
                  </>
                )}
              </div>
              <p style={{ color: mutedColor }} className="mt-4 max-w-xl">
                Factual reference documents about {brand.name} for AI assistants and search engines.
              </p>
            </div>
          </header>
        )}
        
        {/* Content */}
        <main className="max-w-3xl mx-auto px-6 py-12">
          <h2 className="text-sm font-medium uppercase tracking-wide mb-6" style={{ color: mutedColor }}>
            {memos?.length || 0} Published Memos
          </h2>
          {memos && memos.length > 0 ? (
            <div className="space-y-4">
              {memos.map((memo) => (
                  <a
                    key={memo.id}
                    href={`${linkPrefix}/${memo.slug}`}
                    className="block p-6 rounded-xl transition-all group"
                    style={{ background: cardBg, border: `1px solid ${borderColor}` }}
                  >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: mutedColor }}>
                          {memo.memo_type.replace('_', ' ')}
                        </span>
                        {memo.published_at && (
                          <>
                            <span style={{ color: borderColor }}>·</span>
                            <span className="text-xs" style={{ color: mutedColor }}>
                              {new Date(memo.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="font-semibold text-lg transition-colors" style={{ color: headingColor }}>
                        {memo.title}
                      </h3>
                      {memo.meta_description && (
                        <p className="mt-2 text-sm" style={{ color: textColor }}>
                          {memo.meta_description}
                        </p>
                      )}
                    </div>
                    <svg 
                      className="w-5 h-5 shrink-0 mt-1" 
                      style={{ color: mutedColor }}
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
            <div className="text-center py-16 rounded-xl" style={{ background: cardBg, border: `1px solid ${borderColor}` }}>
              <svg className="w-12 h-12 mx-auto mb-4" style={{ color: mutedColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p style={{ color: mutedColor }}>No memos published yet.</p>
            </div>
          )}
        </main>
        
        {/* Custom footer or default */}
        {theme?.footer_html ? (
          <div dangerouslySetInnerHTML={{ __html: theme.footer_html }} />
        ) : (
          <footer className="mt-auto" style={{ borderTop: `1px solid ${borderColor}`, background: isDark ? '#0a0a0a' : '#f8fafc' }}>
            <div className="max-w-3xl mx-auto px-6 py-6">
              <div className="flex items-center justify-between text-sm" style={{ color: mutedColor }}>
                <div className="flex items-center gap-2">
                  {theme?.logo_url ? (
                    <img src={theme.logo_url} alt={brand.name} className="h-5 w-auto opacity-60" />
                  ) : (
                    <span className="font-medium" style={{ color: theme?.primary_text || mutedColor }}>
                      {theme?.site_name || brand.name}
                    </span>
                  )}
                  {theme?.site_url && (
                    <>
                      <span style={{ color: borderColor }}>·</span>
                      <a href={theme.site_url} className="transition-colors hover:opacity-80" style={{ color: mutedColor }}>
                        {new URL(theme.site_url).hostname}
                      </a>
                    </>
                  )}
                </div>
                <a href="https://contextmemo.com" className="transition-colors hover:opacity-80 text-xs" style={{ color: mutedColor }}>
                  Powered by Context Memo
                </a>
              </div>
            </div>
          </footer>
        )}
        
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

  // Determine if this is a dark theme
  const isDark = !!theme?.bg_color
  const bgColor = theme?.bg_color || '#f8fafc'
  const textColor = theme?.text_color || (isDark ? '#e5e5e5' : '#475569')
  const headingColor = isDark ? '#ffffff' : '#0f172a'
  const mutedColor = isDark ? '#a3a3a3' : '#94a3b8'
  const borderColor = isDark ? '#262626' : '#e2e8f0'
  const cardBg = isDark ? '#171717' : '#ffffff'
  const accentColor = theme?.primary_color || (isDark ? '#86efac' : '#3b82f6')

  return (
    <div className="min-h-screen" style={{ background: bgColor, color: textColor, fontFamily: theme?.font_family ? `'${theme.font_family}', system-ui, sans-serif` : undefined }}>
      {/* Brand font */}
      {theme?.font_url && (
        <link rel="stylesheet" href={theme.font_url} />
      )}
      {/* External CSS */}
      {theme?.external_css_url && (
        <link rel="stylesheet" href={theme.external_css_url} />
      )}
      {/* Theme-aware styles for memo content */}
      <style dangerouslySetInnerHTML={{ __html: `
        .memo-content a { color: ${accentColor} !important; }
        .memo-content blockquote { border-left-color: ${accentColor} !important; background: ${isDark ? '#1a1a2e' : '#eff6ff'} !important; }
        .memo-content blockquote p { color: ${isDark ? '#d4d4d4' : '#1e3a5f'} !important; }
        .memo-content h2 { color: ${headingColor} !important; border-bottom-color: ${borderColor} !important; }
        .memo-content h3 { color: ${isDark ? '#e5e5e5' : '#1e293b'} !important; }
        .memo-content strong { color: ${isDark ? '#e5e5e5' : '#1e293b'} !important; }
        .memo-content em { color: ${mutedColor} !important; }
        .memo-content code { background: ${isDark ? '#262626' : '#f1f5f9'} !important; color: ${isDark ? '#e5e5e5' : '#334155'} !important; }
        .memo-content table { border-color: ${borderColor} !important; }
        .memo-content thead { background: ${isDark ? '#1a1a1a' : '#f8fafc'} !important; }
        .memo-content th { color: ${headingColor} !important; border-color: ${borderColor} !important; }
        .memo-content td { border-color: ${isDark ? '#1a1a1a' : '#f1f5f9'} !important; }
        .memo-content tr:nth-child(even) td { background: ${isDark ? '#0d0d0d' : '#fafbfc'} !important; }
        .memo-content hr { border-color: ${borderColor} !important; }
        .memo-content ul > li::before { background: ${accentColor} !important; }
      `}} />
      {/* Schema.org JSON-LD */}
      {memo.schema_json && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(memo.schema_json) }}
        />
      )}
      
      {/* Custom header or default */}
      {theme?.header_html ? (
        <div dangerouslySetInnerHTML={{ __html: theme.header_html }} />
      ) : (
        <header className="sticky top-0 z-10" style={{ background: isDark ? `${cardBg}ee` : `${cardBg}cc`, borderBottom: `1px solid ${borderColor}`, backdropFilter: 'blur(12px)' }}>
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
            <nav className="flex items-center gap-2 text-sm">
              <a href={`${linkPrefix}/`} className="flex items-center gap-2 font-medium transition-colors" style={{ color: isDark ? '#d4d4d4' : '#475569' }}>
                {theme?.logo_url ? (
                  <img src={theme.logo_url} alt={brand.name} className="h-5 w-auto" />
                ) : (
                  <span>{brand.name}</span>
                )}
              </a>
              <span style={{ color: borderColor }}>/</span>
              <span className="capitalize" style={{ color: mutedColor }}>{MEMO_TYPE_LABELS[memo.memo_type] || memo.memo_type.replace('_', ' ')}</span>
            </nav>
            {theme?.cta_url && (
              <a href={theme.cta_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium transition-colors" style={{ color: accentColor }}>
                {theme.cta_text || `Visit ${brand.name}`}
              </a>
            )}
          </div>
        </header>
      )}
      
      {/* Hero */}
      <div style={{ background: cardBg, borderBottom: `1px solid ${borderColor}` }}>
        <div className="max-w-3xl mx-auto px-6 py-12">
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-6" style={{ color: headingColor }}>
            {memo.title}
          </h1>
          {/* Author and verification byline */}
          <div className="flex flex-col gap-4 pt-4" style={{ borderTop: `1px solid ${borderColor}` }}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${accentColor}, ${theme?.primary_text || accentColor})` }}>
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: headingColor }}>{brand.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                {memo.review_status === 'human_approved' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full" style={{ background: isDark ? '#052e16' : '#dcfce7', color: isDark ? '#86efac' : '#166534' }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Human Approved
                  </span>
                )}
                {memo.review_status === 'human_reviewed' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full" style={{ background: isDark ? '#0c1929' : '#dbeafe', color: isDark ? '#93c5fd' : '#1e40af' }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Human Reviewed
                  </span>
                )}
                {memo.review_status === 'human_edited' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full" style={{ background: isDark ? '#1c1507' : '#fef3c7', color: isDark ? '#fcd34d' : '#92400e' }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Human Edited
                  </span>
                )}
                <span className="text-sm" style={{ color: mutedColor }}>
                  Verified {formattedDate}
                </span>
              </div>
            </div>
            
            {/* Reviewer notes if present */}
            {memo.reviewer_notes && (
              <div className="rounded-lg p-4" style={{ background: isDark ? '#0c1929' : '#eff6ff', border: `1px solid ${isDark ? '#1e3a5f' : '#bfdbfe'}` }}>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: isDark ? '#93c5fd' : '#2563eb' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: isDark ? '#93c5fd' : '#1e40af' }}>Editor&apos;s Note</p>
                    <p className="text-sm" style={{ color: isDark ? '#d4d4d4' : '#1e3a5f' }}>{memo.reviewer_notes}</p>
                    {memo.reviewed_at && (
                      <p className="text-xs mt-2" style={{ color: isDark ? '#60a5fa' : '#2563eb' }}>
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
          className="memo-content text-[1.0625rem] leading-7
            [&>h1]:hidden
            [&>p:first-child]:hidden
            [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:mt-14 [&>h2]:mb-5 [&>h2]:pb-3 [&>h2]:border-b
            [&>h2:first-of-type]:mt-0
            [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mt-10 [&>h3]:mb-4
            [&>h3+p]:mt-0
            [&>p]:mb-6 [&>p]:leading-relaxed
            [&_strong]:font-semibold
            [&>ul]:my-8 [&>ul]:space-y-3 [&>ul]:list-none [&>ul]:pl-0
            [&>ul>li]:relative [&>ul>li]:pl-7 [&>ul>li]:leading-relaxed
            [&>ul>li]:before:content-[''] [&>ul>li]:before:absolute [&>ul>li]:before:left-0 [&>ul>li]:before:top-[0.6rem] [&>ul>li]:before:w-1.5 [&>ul>li]:before:h-1.5 [&>ul>li]:before:rounded-full
            [&>ol]:my-8 [&>ol]:pl-6 [&>ol]:space-y-4
            [&_a]:font-medium [&_a]:no-underline [&_a:hover]:underline
            [&>table]:w-full [&>table]:my-10 [&>table]:border-collapse [&>table]:text-[0.9375rem] [&>table]:rounded-lg [&>table]:overflow-hidden [&>table]:border
            [&_th]:p-4 [&_th]:text-left [&_th]:border-b [&_th]:font-semibold
            [&_td]:p-4 [&_td]:border-b
            [&_tbody_tr:last-child_td]:border-b-0
            [&>blockquote]:my-8 [&>blockquote]:py-4 [&>blockquote]:px-6 [&>blockquote]:border-l-4 [&>blockquote]:rounded-r-lg
            [&>blockquote_p]:m-0
            [&>hr]:my-12 [&>hr]:border-0 [&>hr]:border-t
            [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm
            [&>p>em:only-child]:text-sm [&>p>em:only-child]:block [&>p>em:only-child]:mb-8
            [&_em]:italic"
          style={{ color: textColor }}
          dangerouslySetInnerHTML={{ __html: contentHtml }} 
        />
      </main>
      
      {/* Brand link — hide for contextmemo's own memos since visitor is already on the site */}
      {brand.domain && !brand.domain.toLowerCase().includes('contextmemo') && !theme?.header_html && (
        <div className="max-w-3xl mx-auto px-6 pb-12">
          <div className="pt-8" style={{ borderTop: `1px solid ${borderColor}` }}>
            <a 
              href={theme?.cta_url || `https://${brand.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: accentColor }}
            >
              {theme?.cta_text || `Learn more at ${brand.domain}`}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}
      
      {/* Custom footer or default */}
      {theme?.footer_html ? (
        <div dangerouslySetInnerHTML={{ __html: theme.footer_html }} />
      ) : (
        <footer className="mt-auto" style={{ borderTop: `1px solid ${borderColor}`, background: isDark ? '#0a0a0a' : '#f8fafc' }}>
          <div className="max-w-3xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between text-sm" style={{ color: mutedColor }}>
              <div className="flex items-center gap-2">
                {theme?.logo_url ? (
                  <img src={theme.logo_url} alt={brand.name} className="h-5 w-auto opacity-60" />
                ) : (
                  <span className="font-medium" style={{ color: theme?.primary_text || mutedColor }}>
                    {theme?.site_name || brand.name}
                  </span>
                )}
                {theme?.site_url && (
                  <>
                    <span style={{ color: borderColor }}>·</span>
                    <a href={theme.site_url} className="transition-colors hover:opacity-80" style={{ color: mutedColor }}>
                      {new URL(theme.site_url).hostname}
                    </a>
                  </>
                )}
              </div>
              <a href="https://contextmemo.com" className="transition-colors hover:opacity-80 text-xs" style={{ color: mutedColor }}>
                Powered by Context Memo
              </a>
            </div>
          </div>
        </footer>
      )}
      
      {/* AI Traffic Tracking */}
      <AITrafficTracker brandId={brand.id} memoId={memo.id} />
      <GtagBrandPageView
        brandName={brand.name}
        brandSubdomain={brand.subdomain}
        memoType={memo.memo_type}
        memoTitle={memo.title}
      />
    </div>
  )
}
