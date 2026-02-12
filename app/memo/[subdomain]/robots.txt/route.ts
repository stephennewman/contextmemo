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

  // Get brand + custom domain info
  const { data: brand } = await supabase
    .from('brands')
    .select('custom_domain, domain_verified')
    .eq('subdomain', subdomain)
    .single()

  if (!brand) {
    return new NextResponse('Not found', { status: 404 })
  }

  const baseUrl = brand.custom_domain && brand.domain_verified
    ? `https://${brand.custom_domain}`
    : `https://${subdomain}.contextmemo.com`

  const robots = `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Amazonbot
Allow: /

User-agent: Bytespider
Allow: /

User-agent: cohere-ai
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
