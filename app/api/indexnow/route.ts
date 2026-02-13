import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { submitUrlsToIndexNow, buildMemoUrl, buildBrandUrl } from '@/lib/utils/indexnow'
import { z } from 'zod'

const supabase = createServiceRoleClient()

/**
 * POST /api/indexnow
 * Submit all published memos for a brand to IndexNow
 * Body: { brandId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const schema = z.object({
      brandId: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
    })

    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'brandId required' }, { status: 400 })
    }

    const { brandId } = parsed.data

    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get brand subdomain, custom domain, and proxy info
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('subdomain, custom_domain, domain_verified, proxy_origin, proxy_base_path, tenant_id, organization_id')
      .eq('id', brandId)
      .single()

    if (brandError || !brand?.subdomain) {
      return NextResponse.json({ error: 'Brand not found or no subdomain' }, { status: 404 })
    }

    let hasAccess = brand.tenant_id === user.id
    if (!hasAccess && brand.organization_id) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', brand.organization_id)
        .eq('user_id', user.id)
        .single()
      hasAccess = !!membership
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all published memos for this brand
    const { data: memos, error: memosError } = await supabase
      .from('memos')
      .select('slug')
      .eq('brand_id', brandId)
      .eq('status', 'published')

    if (memosError || !memos?.length) {
      return NextResponse.json({ error: 'No published memos found' }, { status: 404 })
    }

    // Build URLs — priority: proxy origin > custom domain > subdomain
    const urls = [
      // Brand index page
      buildBrandUrl(brand.subdomain, brand.custom_domain, brand.domain_verified, brand.proxy_origin, brand.proxy_base_path),
      // All memo pages
      ...memos.map(memo => buildMemoUrl(brand.subdomain, memo.slug, brand.custom_domain, brand.domain_verified, brand.proxy_origin, brand.proxy_base_path)),
    ]

    // Submit to IndexNow
    const results = await submitUrlsToIndexNow(urls)

    return NextResponse.json({
      success: true,
      urlsSubmitted: urls.length,
      urls,
      results,
    })
  } catch (error) {
    console.error('IndexNow submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit to IndexNow' },
      { status: 500 }
    )
  }
}
