import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CitationInsights } from '@/components/dashboard/citation-insights'
import { AutomationStatusBar } from '@/components/dashboard/automation-status-bar'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function CitationsPage({ params }: Props) {
  const { brandId } = await params
  const supabase = await createClient()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [
    { data: brand, error },
    { data: allScans },
    { data: allQueries },
    { data: memos },
    { data: brandSettings },
  ] = await Promise.all([
    supabase
      .from('brands')
      .select('name, domain, subdomain')
      .eq('id', brandId)
      .single(),
    supabase
      .from('scan_results')
      .select('id, brand_id, query_id, model, response_text, brand_mentioned, brand_position, brand_context, brand_in_citations, competitors_mentioned, citations, scanned_at, is_first_citation, citation_status_changed, previous_cited, new_competitors_found, position_change, brand_sentiment, sentiment_reason')
      .eq('brand_id', brandId)
      .gte('scanned_at', ninetyDaysAgo.toISOString())
      .order('scanned_at', { ascending: false })
      .limit(5000),
    supabase
      .from('queries')
      .select('id, query_text, query_type, persona, priority, funnel_stage')
      .eq('brand_id', brandId),
    supabase
      .from('memos')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false }),
    supabase
      .from('brand_settings')
      .select('auto_verify_citations')
      .eq('brand_id', brandId)
      .single(),
  ])

  if (error || !brand) notFound()

  return (
    <div className="space-y-4">
      <AutomationStatusBar items={[
        { label: 'Citation Verify', enabled: brandSettings?.auto_verify_citations ?? true },
      ]} />
      <CitationInsights
        brandId={brandId}
        brandName={brand.name}
        brandDomain={brand.domain}
        brandSubdomain={brand.subdomain}
        scanResults={allScans || []}
        queries={allQueries || []}
        memos={memos || []}
      />
    </div>
  )
}
