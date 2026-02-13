import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ subdomain: string }> }
) {
  const { subdomain } = await params

  // Get brand + custom domain + proxy info
  const { data: brand } = await supabase
    .from('brands')
    .select('id, name, custom_domain, domain_verified, proxy_origin, proxy_base_path, updated_at')
    .eq('subdomain', subdomain)
    .single()

  if (!brand) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Determine base URL: proxy origin (subfolder) > custom domain > subdomain
  let baseUrl: string
  if (brand.proxy_origin && brand.proxy_base_path) {
    baseUrl = `${brand.proxy_origin.replace(/\/$/, '')}${brand.proxy_base_path.replace(/\/$/, '')}`
  } else if (brand.custom_domain && brand.domain_verified) {
    baseUrl = `https://${brand.custom_domain}`
  } else {
    baseUrl = `https://${subdomain}.contextmemo.com`
  }

  // Get all published memos for this brand
  const { data: memos } = await supabase
    .from('memos')
    .select('slug, updated_at, published_at, memo_type')
    .eq('brand_id', brand.id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const urls = [
    // Brand index page
    `  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date(brand.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`,
    // Individual memo pages
    ...(memos || []).map((memo) => `  <url>
    <loc>${baseUrl}/${memo.slug}</loc>
    <lastmod>${new Date(memo.updated_at || memo.published_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
