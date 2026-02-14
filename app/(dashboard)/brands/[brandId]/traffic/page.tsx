import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AITrafficView } from '@/components/dashboard/ai-traffic-view'
import { AIReferrerSource } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function TrafficPage({ params }: Props) {
  const { brandId } = await params
  const supabase = await createClient()

  // Fetch brand with subdomain for bot_crawl_events filtering
  const { data: brand, error } = await supabase
    .from('brands')
    .select('name, subdomain, custom_domain, domain_verified')
    .eq('id', brandId)
    .single()

  if (error || !brand) notFound()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  // Fetch both data sources in parallel
  const [{ data: crawlEvents }, { data: traffic }] = await Promise.all([
    // Primary: bot_crawl_events (server-side middleware detection)
    supabase
      .from('bot_crawl_events')
      .select('id, bot_name, bot_category, bot_display_name, bot_provider, brand_subdomain, memo_slug, page_path, ip_country, ip_city, ip_region, ip_latitude, ip_longitude, ip_timezone, created_at')
      .eq('brand_subdomain', brand.subdomain)
      .gte('created_at', ninetyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5000),
    // Supplementary: ai_traffic (client-side JS tracking)
    supabase
      .from('ai_traffic')
      .select('id, memo_id, page_url, referrer, referrer_source, country, city, region, timestamp, memo:memo_id(title, slug)')
      .eq('brand_id', brandId)
      .gte('timestamp', ninetyDaysAgo.toISOString())
      .order('timestamp', { ascending: false })
      .limit(500),
  ])

  const typedCrawlEvents = (crawlEvents || []) as Array<{
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
  }>

  const humanTraffic = (traffic || []).map(t => ({
    id: t.id as string,
    memo_id: t.memo_id as string | null,
    page_url: t.page_url as string,
    referrer: t.referrer as string | null,
    referrer_source: t.referrer_source as AIReferrerSource,
    country: t.country as string | null,
    city: t.city as string | null,
    region: t.region as string | null,
    timestamp: t.timestamp as string,
    memo: Array.isArray(t.memo) ? t.memo[0] as { title: string; slug: string } : t.memo as { title: string; slug: string } | null,
  }))

  return (
    <AITrafficView
      crawlEvents={typedCrawlEvents}
      humanTraffic={humanTraffic}
      brandName={brand.name}
    />
  )
}
