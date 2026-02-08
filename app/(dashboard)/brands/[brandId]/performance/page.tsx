import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContentPerformance } from '@/components/dashboard/content-performance'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function PerformancePage({ params }: Props) {
  const { brandId } = await params
  const supabase = await createClient()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [
    { data: brand, error },
    { data: memos },
    { data: traffic },
    { data: crawlEvents },
  ] = await Promise.all([
    supabase
      .from('brands')
      .select('name, subdomain')
      .eq('id', brandId)
      .single(),
    supabase
      .from('memos')
      .select('id, title, slug, status, memo_type, created_at, published_at, schema_json')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false }),
    supabase
      .from('ai_traffic')
      .select('id, memo_id, page_url, referrer, referrer_source, country, timestamp')
      .eq('brand_id', brandId)
      .gte('timestamp', ninetyDaysAgo.toISOString())
      .order('timestamp', { ascending: false })
      .limit(2000),
    // We need the brand subdomain first, so we do a second query
    // after getting the brand. For now, fetch all and filter client-side.
    supabase
      .from('bot_crawl_events')
      .select('id, bot_name, bot_category, bot_display_name, bot_provider, brand_subdomain, memo_slug, page_path, ip_country, created_at')
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5000),
  ])

  if (error || !brand) notFound()

  // Filter crawl events to this brand's subdomain
  const brandCrawlEvents = (crawlEvents || []).filter(
    e => e.brand_subdomain === brand.subdomain
  )

  return (
    <ContentPerformance
      brandId={brandId}
      brandName={brand.name}
      brandSubdomain={brand.subdomain}
      memos={(memos || []) as Array<{
        id: string
        title: string
        slug: string
        status: string
        memo_type: string
        created_at: string
        published_at: string | null
        schema_json: Record<string, unknown> | null
      }>}
      traffic={(traffic || []) as Array<{
        id: string
        memo_id: string | null
        page_url: string
        referrer: string | null
        referrer_source: string
        country: string | null
        timestamp: string
      }>}
      crawlEvents={brandCrawlEvents as Array<{
        id: string
        bot_name: string
        bot_category: string
        bot_display_name: string
        bot_provider: string
        brand_subdomain: string | null
        memo_slug: string | null
        page_path: string
        ip_country: string | null
        created_at: string
      }>}
    />
  )
}
