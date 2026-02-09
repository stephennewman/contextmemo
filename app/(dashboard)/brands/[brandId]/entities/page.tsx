import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityList } from '@/components/dashboard/entity-list'
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

  // Build citation counts per entity
  const entityDomains = (allCompetitors || [])
    .filter(c => c.domain)
    .map(c => ({ id: c.id, domain: c.domain!.toLowerCase(), isActive: c.is_active }))
    .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0))

  // Track both citation URLs and query IDs per entity from citation domain matching
  const citationsByEntity: Record<string, string[]> = {}
  const queryIdsByEntity: Record<string, Set<string>> = {}
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
          // Track which queries cited this entity
          if (scan.query_id) {
            if (!queryIdsByEntity[entity.id]) queryIdsByEntity[entity.id] = new Set()
            queryIdsByEntity[entity.id].add(scan.query_id)
          }
        }
      } catch { /* skip invalid URLs */ }
    }
  }

  const citationCountsByEntity: Record<string, number> = {}
  for (const [id, urls] of Object.entries(citationsByEntity)) {
    citationCountsByEntity[id] = urls.length
  }

  // Also count mentions by name from competitors_mentioned field
  const entityNameToId = new Map<string, string>()
  for (const entity of (allCompetitors || []).sort((a, b) => (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0))) {
    entityNameToId.set(entity.name.toLowerCase(), entity.id)
  }

  const mentionCountsByEntity: Record<string, number> = {}
  for (const scan of (allScans || [])) {
    const mentioned = scan.competitors_mentioned as string[] | null
    if (!mentioned) continue
    for (const name of mentioned) {
      const entityId = entityNameToId.get(name.toLowerCase())
      if (entityId) {
        mentionCountsByEntity[entityId] = (mentionCountsByEntity[entityId] || 0) + 1
        // Merge name-based mentions into the same query tracking
        if (scan.query_id) {
          if (!queryIdsByEntity[entityId]) queryIdsByEntity[entityId] = new Set()
          queryIdsByEntity[entityId].add(scan.query_id)
        }
      }
    }
  }

  // Unique prompts = union of queries where entity was cited by URL OR mentioned by name
  const uniqueQueryCountsByEntity: Record<string, number> = {}
  for (const [id, queryIds] of Object.entries(queryIdsByEntity)) {
    uniqueQueryCountsByEntity[id] = queryIds.size
  }

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
    </div>
  )
}
