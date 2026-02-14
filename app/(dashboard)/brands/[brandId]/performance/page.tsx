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

  // First fetch brand to get subdomain for crawl event filtering
  const { data: brand, error } = await supabase
    .from('brands')
    .select('name, subdomain, custom_domain, domain_verified')
    .eq('id', brandId)
    .single()

  if (error || !brand) notFound()

  const [
    { data: memos },
    { data: traffic },
    { data: crawlEvents },
  ] = await Promise.all([
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
    supabase
      .from('bot_crawl_events')
      .select('id, bot_name, bot_category, bot_display_name, bot_provider, brand_subdomain, memo_slug, page_path, ip_country, ip_city, ip_region, ip_latitude, ip_longitude, ip_timezone, created_at')
      .eq('brand_subdomain', brand.subdomain)
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5000),
  ])

  const brandCrawlEvents = crawlEvents || []

  return (
    <ContentPerformance
      brandId={brandId}
      brandName={brand.name}
      brandSubdomain={brand.subdomain}
      brandCustomDomain={brand.custom_domain}
      brandDomainVerified={brand.domain_verified}
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
        ip_city: string | null
        ip_region: string | null
        ip_latitude: number | null
        ip_longitude: number | null
        ip_timezone: string | null
        created_at: string
      }>}
    />
  )
}
