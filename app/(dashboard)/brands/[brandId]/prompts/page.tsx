import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BrandContext } from '@/lib/supabase/types'
import { PromptVisibilityList } from '@/components/dashboard/scan-results-view'
import { AutomationStatusBar } from '@/components/dashboard/automation-status-bar'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function PromptsPage({ params }: Props) {
  const { brandId } = await params
  const supabase = await createClient()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [
    { data: brand, error },
    { data: queries },
    { data: allScans },
    { data: competitors },
    { data: memos },
    { data: brandSettings },
  ] = await Promise.all([
    supabase
      .from('brands')
      .select('name, domain, context')
      .eq('id', brandId)
      .single(),
    supabase
      .from('queries')
      .select('*')
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .order('priority', { ascending: false }),
    supabase
      .from('scan_results')
      .select('id, brand_id, query_id, model, response_text, brand_mentioned, brand_position, brand_context, brand_in_citations, competitors_mentioned, citations, search_results, scanned_at, is_first_citation, citation_status_changed, previous_cited, new_competitors_found, position_change, brand_sentiment, sentiment_reason')
      .eq('brand_id', brandId)
      .gte('scanned_at', ninetyDaysAgo.toISOString())
      .order('scanned_at', { ascending: false })
      .limit(5000),
    supabase
      .from('competitors')
      .select('*')
      .eq('brand_id', brandId)
      .eq('is_active', true),
    supabase
      .from('memos')
      .select('id, title, slug, source_query_id, status')
      .eq('brand_id', brandId),
    supabase
      .from('brand_settings')
      .select('auto_scan_enabled, scan_schedule, daily_scan_cap, weekly_greenspace_enabled, discovery_schedule, prompt_enrichment_enabled, prompt_intelligence_enabled')
      .eq('brand_id', brandId)
      .single(),
  ])

  if (error || !brand) notFound()

  const context = brand.context as BrandContext

  return (
    <div className="space-y-4">
      <AutomationStatusBar items={[
        { label: 'AI Scan', enabled: brandSettings?.auto_scan_enabled ?? true, schedule: brandSettings?.scan_schedule ?? 'daily' },
        { label: 'Discovery', enabled: brandSettings?.weekly_greenspace_enabled ?? false, schedule: brandSettings?.discovery_schedule ?? 'weekly' },
        { label: 'Enrichment', enabled: brandSettings?.prompt_enrichment_enabled ?? true },
        { label: 'Intelligence', enabled: brandSettings?.prompt_intelligence_enabled ?? true },
      ]} />
      <PromptVisibilityList
        queries={queries || []}
        scanResults={allScans || []}
        brandName={brand.name}
        brandId={brandId}
        brandDomain={brand.domain}
        competitors={competitors || []}
        themes={context?.prompt_themes || []}
        memos={(memos || []).map(m => ({ id: m.id, title: m.title, slug: m.slug, source_query_id: m.source_query_id, status: m.status }))}
      />
    </div>
  )
}
