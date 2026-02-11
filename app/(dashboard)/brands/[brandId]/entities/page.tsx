import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EntityList } from '@/components/dashboard/entity-list'
import { AutomationStatusBar } from '@/components/dashboard/automation-status-bar'
import { detectProfilesFromUrls, aggregatePlatformPresence } from '@/lib/utils/review-platforms'

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
      .select('id, query_id, competitors_mentioned, citations, scanned_at')
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

  // Detect external review/marketplace profiles per entity from citation URLs
  const entityProfiles: Record<string, ReturnType<typeof detectProfilesFromUrls>> = {}
  for (const [entityId, urls] of Object.entries(citationsByEntity)) {
    const profiles = detectProfilesFromUrls(urls)
    if (profiles.size > 0) {
      entityProfiles[entityId] = profiles
    }
  }

  // Serialize profiles for client component (Map -> Record)
  const serializedEntityProfiles: Record<string, Array<{
    platformId: string
    platformName: string
    shortName: string
    icon: string
    color: string
    bgColor: string
    category: string
    urls: string[]
    citationCount: number
  }>> = {}
  for (const [entityId, profileMap] of Object.entries(entityProfiles)) {
    serializedEntityProfiles[entityId] = Array.from(profileMap.values()).map(p => ({
      platformId: p.platform.id,
      platformName: p.platform.name,
      shortName: p.platform.shortName,
      icon: p.platform.icon,
      color: p.platform.color,
      bgColor: p.platform.bgColor,
      category: p.platform.category,
      urls: p.urls,
      citationCount: p.citationCount,
    }))
  }

  // Aggregate: which review platforms are cited most across ALL scan citations
  const allCitationUrls: string[] = []
  for (const scan of (allScans || [])) {
    if (!scan.citations) continue
    for (const citation of scan.citations as string[]) {
      allCitationUrls.push(citation)
    }
  }
  const platformSummary = aggregatePlatformPresence(allCitationUrls).map(p => ({
    platformId: p.platform.id,
    platformName: p.platform.name,
    shortName: p.platform.shortName,
    icon: p.platform.icon,
    color: p.platform.color,
    bgColor: p.platform.bgColor,
    category: p.platform.category,
    totalCitations: p.totalCitations,
    uniqueUrls: p.uniqueUrls,
  }))

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
        entityProfiles={serializedEntityProfiles}
        platformSummary={platformSummary}
      />
    </div>
  )
}
