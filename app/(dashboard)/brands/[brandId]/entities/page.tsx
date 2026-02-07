import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityList } from '@/components/dashboard/entity-list'
import { CompetitiveIntelligence } from '@/components/dashboard/competitive-intelligence'
import { CompetitorContentFeed } from '@/components/dashboard/competitor-content-feed'
import { AutomationStatusBar } from '@/components/dashboard/automation-status-bar'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function EntitiesPage({ params }: Props) {
  const { brandId } = await params
  const supabase = await createClient()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [
    { data: brand, error },
    { data: allCompetitors },
    { data: queries },
    { data: allScans },
    { data: brandSettings },
  ] = await Promise.all([
    supabase
      .from('brands')
      .select('name')
      .eq('id', brandId)
      .single(),
    supabase
      .from('competitors')
      .select('*')
      .eq('brand_id', brandId),
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
      .from('brand_settings')
      .select('competitor_content_enabled, competitor_content_schedule, auto_expand_network')
      .eq('brand_id', brandId)
      .single(),
  ])

  if (error || !brand) notFound()

  const competitors = allCompetitors?.filter(c => c.is_active) || []
  const recentScans = allScans?.slice(0, 100) || []

  // Build citation counts per entity
  const entityDomains = (allCompetitors || [])
    .filter(c => c.domain)
    .map(c => ({ id: c.id, domain: c.domain!.toLowerCase(), isActive: c.is_active }))
    .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0))

  const citationsByEntity: Record<string, string[]> = {}
  for (const scan of (allScans || [])) {
    if (!scan.citations) continue
    for (const citation of scan.citations as string[]) {
      try {
        const url = new URL(citation)
        const domain = url.hostname.replace('www.', '').toLowerCase()
        const entity = entityDomains.find(e => domain.includes(e.domain) || e.domain.includes(domain))
        if (entity) {
          if (!citationsByEntity[entity.id]) citationsByEntity[entity.id] = []
          if (!citationsByEntity[entity.id].includes(citation)) citationsByEntity[entity.id].push(citation)
        }
      } catch { /* skip invalid URLs */ }
    }
  }

  const citationCountsByEntity: Record<string, number> = {}
  for (const [id, urls] of Object.entries(citationsByEntity)) {
    citationCountsByEntity[id] = urls.length
  }

  // Build mention counts per entity
  const entityNameToId = new Map<string, string>()
  for (const entity of (allCompetitors || []).sort((a, b) => (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0))) {
    entityNameToId.set(entity.name.toLowerCase(), entity.id)
  }

  const mentionCountsByEntity: Record<string, number> = {}
  const mentionQueryIdsByEntity: Record<string, Set<string>> = {}
  for (const scan of (allScans || [])) {
    const mentioned = scan.competitors_mentioned as string[] | null
    if (!mentioned) continue
    for (const name of mentioned) {
      const entityId = entityNameToId.get(name.toLowerCase())
      if (entityId) {
        mentionCountsByEntity[entityId] = (mentionCountsByEntity[entityId] || 0) + 1
        if (!mentionQueryIdsByEntity[entityId]) mentionQueryIdsByEntity[entityId] = new Set()
        if (scan.query_id) mentionQueryIdsByEntity[entityId].add(scan.query_id)
      }
    }
  }

  const uniqueQueryCountsByEntity: Record<string, number> = {}
  for (const [id, queryIds] of Object.entries(mentionQueryIdsByEntity)) {
    uniqueQueryCountsByEntity[id] = queryIds.size
  }

  // Get competitor content and feeds
  const competitorIds = competitors.map(c => c.id)
  const [
    { data: competitorContent },
    { data: competitorFeeds },
  ] = await Promise.all([
    competitorIds.length > 0
      ? supabase
          .from('competitor_content')
          .select('*, competitor:competitor_id(id, name, domain), response_memo:response_memo_id(id, title, slug, status)')
          .in('competitor_id', competitorIds)
          .order('first_seen_at', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as any[] }),
    competitorIds.length > 0
      ? supabase
          .from('competitor_feeds')
          .select('*')
          .in('competitor_id', competitorIds)
          .eq('is_active', true)
          .order('discovered_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
  ])

  return (
    <div className="space-y-4">
      <AutomationStatusBar items={[
        { label: 'Competitor Intel', enabled: brandSettings?.competitor_content_enabled ?? true, schedule: brandSettings?.competitor_content_schedule ?? 'daily' },
        { label: 'Auto Expand', enabled: brandSettings?.auto_expand_network ?? false },
      ]} />
      <EntityList
        brandId={brandId}
        entities={allCompetitors || []}
        citationCounts={citationCountsByEntity}
        citationUrls={citationsByEntity}
        mentionCounts={mentionCountsByEntity}
        uniqueQueryCounts={uniqueQueryCountsByEntity}
      />
      <CompetitiveIntelligence
        brandName={brand.name}
        competitors={competitors}
        scanResults={recentScans}
        queries={queries || []}
      />
      <CompetitorContentFeed
        brandId={brandId}
        content={competitorContent || []}
        competitors={competitors}
        feeds={competitorFeeds || []}
      />
    </div>
  )
}
