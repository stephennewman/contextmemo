import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { submitUrlsToIndexNow, buildMemoUrl } from '@/lib/utils/indexnow'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * POST /api/indexnow
 * Submit all published memos for a brand to IndexNow
 * Body: { brandId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { brandId } = await request.json()

    if (!brandId) {
      return NextResponse.json({ error: 'brandId required' }, { status: 400 })
    }

    // Get brand subdomain
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('subdomain')
      .eq('id', brandId)
      .single()

    if (brandError || !brand?.subdomain) {
      return NextResponse.json({ error: 'Brand not found or no subdomain' }, { status: 404 })
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

    // Build URLs
    const urls = [
      // Brand index page
      `https://contextmemo.com/memo/${brand.subdomain}`,
      // All memo pages
      ...memos.map(memo => buildMemoUrl(brand.subdomain, memo.slug)),
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
