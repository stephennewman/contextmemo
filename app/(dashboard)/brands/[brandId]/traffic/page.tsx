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

  const { data: brand, error } = await supabase
    .from('brands')
    .select('name')
    .eq('id', brandId)
    .single()

  if (error || !brand) notFound()

  // Fetch last 90 days of traffic
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: traffic } = await supabase
    .from('ai_traffic')
    .select('id, memo_id, page_url, referrer, referrer_source, country, city, region, timestamp, memo:memo_id(title, slug)')
    .eq('brand_id', brandId)
    .gte('timestamp', ninetyDaysAgo.toISOString())
    .order('timestamp', { ascending: false })
    .limit(500)

  const trafficEvents = (traffic || []).map(t => ({
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
      traffic={trafficEvents}
      brandName={brand.name}
    />
  )
}
