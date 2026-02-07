import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ExternalLink,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'
import { BrandContext } from '@/lib/supabase/types'
import { ScanButton, GenerateMemoDropdown, FindContentGapsButton, GenerateMemosButton } from '@/components/dashboard/brand-actions'
import { MemoFeed } from '@/components/dashboard/memo-feed'
import { ProfileSection } from '@/components/dashboard/profile-section'
import { OnboardingFlow } from '@/components/dashboard/onboarding-flow'
import { PromptVisibilityList } from '@/components/dashboard/scan-results-view'
import { CompetitiveIntelligence } from '@/components/dashboard/competitive-intelligence'
import { CompetitorContentFeed } from '@/components/dashboard/competitor-content-feed'
import { EntityList } from '@/components/dashboard/entity-list'
import { CompetitorWatch } from '@/components/dashboard/competitor-watch'
import { ActivityTab } from '@/components/dashboard/activity-feed'
import { BrandPauseToggle } from '@/components/v2/brand-pause-toggle'
import { BrandLogo } from '@/components/dashboard/brand-logo'
import { CitationInsights } from '@/components/dashboard/citation-insights'
import { CoverageAudit } from '@/components/dashboard/coverage-audit'
import { TopicUniverse, CoverageScore, TopicCategory } from '@/lib/supabase/types'

// SUNSET: These features had zero usage and have been removed from the UI
// - SearchConsoleView (0 rows in search_console_stats)
// - AITrafficView (0 rows in ai_traffic)
// - AttributionDashboard (0 rows in attribution_events)
// - PromptIntelligenceFeed (0 rows in prompt_intelligence)
// - ModelInsightsPanel (requires multi-model, only 1 enabled)
// - PromptLab (only 2 runs ever)
// - QueryFanOut (experimental)
// - EntityMap (experimental)
// - StrategyPlaybook (marketing fluff)

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function BrandPage({ params }: Props) {
  const { brandId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get brand with related data
  const { data: brand, error } = await supabase
    .from('brands')
    .select('*, is_paused')
    .eq('id', brandId)
    .single()

  if (error || !brand) {
    notFound()
  }

  // Run independent queries in parallel for speed
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [
    { data: allCompetitors },
    { data: queries },
    { data: allQueries },
    { data: allScans },
    { data: memos },
    { data: topicUniverseData },
  ] = await Promise.all([
    // All competitors (including excluded for display)
    supabase
      .from('competitors')
      .select('*')
      .eq('brand_id', brandId),
    // Active queries for UI display
    supabase
      .from('queries')
      .select('*')
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .order('priority', { ascending: false }),
    // ALL queries including inactive (for citation-to-prompt mapping)
    supabase
      .from('queries')
      .select('id, query_text, query_type, persona, priority, funnel_stage')
      .eq('brand_id', brandId),
    // Scans last 90 days
    supabase
      .from('scan_results')
      .select('id, brand_id, query_id, model, response_text, brand_mentioned, brand_position, brand_context, brand_in_citations, competitors_mentioned, citations, search_results, scanned_at, is_first_citation, citation_status_changed, previous_cited, new_competitors_found, position_change, brand_sentiment, sentiment_reason')
      .eq('brand_id', brandId)
      .gte('scanned_at', ninetyDaysAgo.toISOString())
      .order('scanned_at', { ascending: false })
      .limit(5000),
    // Memos
    supabase
      .from('memos')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false }),
    // Topic universe data for coverage tab
    supabase
      .from('topic_universe')
      .select('*')
      .eq('brand_id', brandId)
      .order('priority_score', { ascending: false }),
  ])

  // Filter for active competitors (used in scans and content monitoring)
  const competitors = allCompetitors?.filter(c => c.is_active) || []

  // Recent scans for the summary (most recent first, take last 100)
  const recentScans = allScans?.slice(0, 100) || []

  // Build citation counts per entity (competitor) from scan results
  // Prefer active entities when multiple share the same domain
  const entityDomains = (allCompetitors || [])
    .filter(c => c.domain)
    .map(c => ({ id: c.id, domain: c.domain!.toLowerCase(), isActive: c.is_active }))
    .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0))
  
  // Collect citations per entity (with full URLs)
  const citationsByEntity: Record<string, string[]> = {}
  for (const scan of (allScans || [])) {
    if (!scan.citations) continue
    for (const citation of scan.citations as string[]) {
      try {
        const url = new URL(citation)
        const domain = url.hostname.replace('www.', '').toLowerCase()
        // Find matching entity (active entities come first due to sort above)
        const entity = entityDomains.find(e => domain.includes(e.domain) || e.domain.includes(domain))
        if (entity) {
          if (!citationsByEntity[entity.id]) {
            citationsByEntity[entity.id] = []
          }
          // Add unique URLs only
          if (!citationsByEntity[entity.id].includes(citation)) {
            citationsByEntity[entity.id].push(citation)
          }
        }
      } catch {
        // Invalid URL, skip
      }
    }
  }
  
  // Count citations per entity
  const citationCountsByEntity: Record<string, number> = {}
  for (const [id, urls] of Object.entries(citationsByEntity)) {
    citationCountsByEntity[id] = urls.length
  }

  // Build mention counts per entity from scan results
  // competitors_mentioned is an array of entity names (strings)
  // Active entities take priority when names collide (case-insensitive)
  const entityNameToId = new Map<string, string>()
  // Insert inactive first, then active overwrites — active wins
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
        // Track unique query IDs where this entity was mentioned
        if (!mentionQueryIdsByEntity[entityId]) {
          mentionQueryIdsByEntity[entityId] = new Set()
        }
        if (scan.query_id) {
          mentionQueryIdsByEntity[entityId].add(scan.query_id)
        }
      }
    }
  }
  
  // Count unique queries per entity (more useful than raw mention count)
  const uniqueQueryCountsByEntity: Record<string, number> = {}
  for (const [id, queryIds] of Object.entries(mentionQueryIdsByEntity)) {
    uniqueQueryCountsByEntity[id] = queryIds.size
  }

  // SUNSET: Search console stats, AI traffic, Alerts, Attribution, prompt intelligence, model insights removed (0 usage)

  // Get competitor content and feeds in parallel (depends on competitors)
  const competitorIds = (competitors || []).map(c => c.id)
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

  const topicTopics = (topicUniverseData || []) as TopicUniverse[]
  const hasTopicUniverse = topicTopics.length > 0

  // Calculate coverage score if topics exist
  let coverageScore: CoverageScore | null = null
  if (hasTopicUniverse) {
    const categories: TopicCategory[] = ['comparisons', 'alternatives', 'how_tos', 'industry_guides', 'definitions', 'use_cases']
    const byCategory: CoverageScore['by_category'] = {} as CoverageScore['by_category']
    for (const cat of categories) {
      const catTopics = topicTopics.filter(t => t.category === cat)
      byCategory[cat] = {
        total: catTopics.length,
        covered: catTopics.filter(t => t.status === 'covered').length,
        gaps: catTopics.filter(t => t.status === 'gap').length,
      }
    }
    coverageScore = {
      total_topics: topicTopics.length,
      covered: topicTopics.filter(t => t.status === 'covered').length,
      partial: topicTopics.filter(t => t.status === 'partial').length,
      gaps: topicTopics.filter(t => t.status === 'gap').length,
      coverage_percent: Math.round((topicTopics.filter(t => t.status === 'covered').length / topicTopics.length) * 100),
      by_category: byCategory,
    }
  }

  // Helper to check if a query contains the brand name (case-insensitive)
  // These queries skew visibility data since they'll always mention the brand
  const brandNameLower = brand.name.toLowerCase()
  const queryContainsBrand = (queryText: string) => {
    return queryText.toLowerCase().includes(brandNameLower)
  }

  // Create a set of query IDs that contain the brand name
  const brandedQueryIds = new Set(
    (queries || [])
      .filter(q => queryContainsBrand(q.query_text))
      .map(q => q.id)
  )

  // Filter scans to exclude branded queries for score calculation
  const unbiasedScans = recentScans.filter(s => !brandedQueryIds.has(s.query_id))

  // Calculate citation score from unbiased scans (primary metric)
  // Citation score = % of scans with citations where brand was cited
  const scansWithCitations = unbiasedScans.filter(s => s.citations && s.citations.length > 0)
  const brandCitedCount = scansWithCitations.filter(s => s.brand_in_citations === true).length
  const citationScore = scansWithCitations.length > 0 
    ? Math.round((brandCitedCount / scansWithCitations.length) * 100)
    : 0

  // Calculate visibility score (secondary metric - for backwards compatibility)
  const mentionedCount = unbiasedScans.filter(s => s.brand_mentioned).length
  const totalScans = unbiasedScans.length
  const visibilityScore = totalScans > 0 
    ? Math.round((mentionedCount / totalScans) * 100)
    : 0

  // SUNSET: queryVisibility and lowVisibilityQueries removed (only used by Strategy Playbook)


  const context = brand.context as BrandContext
  const hasContext = context && Object.keys(context).length > 0
  const hubspotEnabled = !!(context?.hubspot?.enabled && context?.hubspot?.access_token && context?.hubspot?.blog_id)
  const hubspotAutoPublish = !!(context?.hubspot?.auto_publish)
  
  // Determine onboarding state
  const hasCompletedOnboarding = hasContext && !!competitors?.length && !!queries?.length
  const hasAnyScans = (recentScans?.length || 0) > 0

  // Show onboarding flow for new brands
  if (!hasCompletedOnboarding) {
    return (
      <div className="space-y-6">
        {/* Minimal Header for Onboarding */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">DASHBOARD</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-zinc-500 font-medium">{brand.name}</span>
              {brand.verified ? (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#10B981] text-white">VERIFIED</span>
              ) : (
                <span className="px-1.5 py-0.5 text-[10px] font-bold border border-[#0F172A] text-[#0F172A]">PENDING</span>
              )}
              {brand.is_paused && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white">PAUSED</span>
              )}
              <span className="text-zinc-400">·</span>
              <a 
                href={`/memo/${brand.subdomain}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-zinc-500 hover:text-[#0EA5E9] flex items-center gap-1 font-medium"
              >
                {brand.subdomain}.contextmemo.com
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <BrandPauseToggle brandId={brandId} initialPaused={brand.is_paused || false} lastScanAt={brand.last_scan_at} />
        </div>

        {/* Onboarding Flow - Auto-runs full pipeline */}
        <OnboardingFlow
          brandId={brandId}
          brandName={brand.name}
          brandDomain={brand.domain}
          hasContext={hasContext}
          hasCompetitors={!!competitors?.length}
          hasQueries={!!queries?.length}
          competitorCount={competitors?.length || 0}
          queryCount={queries?.length || 0}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Brand Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo domain={brand.domain} name={brand.name} size={40} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">{brand.name.toUpperCase()}</h1>
            <div className="flex items-center gap-2 mt-0.5">
            {brand.verified ? (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#10B981] text-white">VERIFIED</span>
            ) : (
              <span className="px-1.5 py-0.5 text-[10px] font-bold border border-[#0F172A] text-[#0F172A]">PENDING</span>
            )}
            {brand.is_paused && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white">PAUSED</span>
            )}
            <span className="text-zinc-400">·</span>
              <a 
                href={`/memo/${brand.subdomain}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-zinc-500 hover:text-[#0EA5E9] flex items-center gap-1 font-medium"
              >
                {brand.subdomain}.contextmemo.com
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
        <BrandPauseToggle brandId={brandId} initialPaused={brand.is_paused || false} lastScanAt={brand.last_scan_at} />
      </div>

      {/* Paused Warning Banner */}
      {brand.is_paused && (
        <div className="p-3 bg-amber-50 border-[3px] border-amber-400 flex items-center gap-3" style={{ borderLeft: '8px solid #F59E0B' }}>
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">Brand is paused</p>
            <p className="text-xs text-amber-600">All automated scans and workflows are stopped. Click &quot;Resume&quot; to restart.</p>
          </div>
        </div>
      )}


      {/* No scans CTA */}
      {!hasAnyScans && (
        <div className="p-4 border-[3px] border-[#0EA5E9] bg-[#F0F9FF]" style={{ borderLeft: '8px solid #0EA5E9' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#0F172A] mb-1">Ready to scan!</h3>
              <p className="text-sm text-zinc-600">
                Run your first scan to see how visible {brand.name} is across AI assistants.
              </p>
            </div>
            <div className="flex gap-2">
              <ScanButton brandId={brandId} brandName={brand.name} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Tabs */}
      <Tabs defaultValue="prompts" className="space-y-4">
        <TabsList className="w-full justify-start bg-transparent border-b-[3px] border-[#0F172A] rounded-none p-0 h-auto flex-wrap">
          <TabsTrigger value="profile" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">PROFILE</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">ACTIVITY</TabsTrigger>
          <TabsTrigger value="prompts" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">PROMPTS{(queries?.length || 0) > 0 && ` (${queries?.length})`}</TabsTrigger>
          <TabsTrigger value="memos" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">MEMOS{(memos?.length || 0) > 0 && ` (${memos?.length})`}</TabsTrigger>
          <TabsTrigger value="entities" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">ENTITIES{(allCompetitors?.length || 0) > 0 && ` (${allCompetitors?.length})`}</TabsTrigger>
          <TabsTrigger value="sources" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">CITATIONS{(allScans?.reduce((sum, s) => sum + ((s.citations as string[])?.length || 0), 0) || 0) > 0 && ` (${allScans?.reduce((sum, s) => sum + ((s.citations as string[])?.length || 0), 0)})`}</TabsTrigger>
          <TabsTrigger value="watch" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">
            WATCH
          </TabsTrigger>
          <TabsTrigger value="coverage" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">
            COVERAGE
          </TabsTrigger>
          {/* SUNSET: Alerts, Search, AI Traffic, Intelligence, QFO, MAP, LAB, Strategy tabs removed (zero usage) */}
        </TabsList>

        {/* Brand Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <ProfileSection
            brandId={brandId}
            brandName={brand.name}
            brandDomain={brand.domain}
            context={context}
            contextExtractedAt={brand.context_extracted_at}
            hasContext={hasContext}
          />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <ActivityTab brandId={brandId} brandName={brand.name} />
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="memos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Memos</CardTitle>
                  <CardDescription>
                    {(memos || []).length} total · {(memos || []).filter((m: { status: string }) => m.status === 'published').length} published · {(memos || []).filter((m: { status: string }) => m.status === 'draft').length} drafts
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <GenerateMemoDropdown brandId={brandId} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <MemoFeed
                brandId={brandId}
                brandName={brand.name}
                brandSubdomain={brand.subdomain}
                initialMemos={(memos || []) as Array<{
                  id: string
                  brand_id: string
                  title: string
                  slug: string
                  content_markdown: string
                  content_html: string | null
                  meta_description: string | null
                  status: 'draft' | 'published'
                  memo_type: string
                  published_at: string | null
                  created_at: string
                  updated_at: string
                  sources: unknown[] | null
                  verified_accurate: boolean
                  version: number
                  schema_json: Record<string, unknown> | null
                }>}
                hubspotEnabled={hubspotEnabled}
                hubspotAutoPublish={hubspotAutoPublish}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entities" className="space-y-4">
          {/* Entity List - Primary view showing all entities with citations/mentions */}
          <EntityList 
            brandId={brandId} 
            entities={allCompetitors || []}
            citationCounts={citationCountsByEntity}
            citationUrls={citationsByEntity}
            mentionCounts={mentionCountsByEntity}
            uniqueQueryCounts={uniqueQueryCountsByEntity}
          />

          {/* Competitive Intelligence Dashboard */}
          <CompetitiveIntelligence
            brandName={brand.name}
            competitors={competitors || []}
            scanResults={recentScans}
            queries={queries || []}
          />

          {/* Competitor Content Intelligence */}
          <CompetitorContentFeed
            brandId={brandId}
            content={competitorContent || []}
            competitors={competitors || []}
            feeds={competitorFeeds || []}
          />
        </TabsContent>

        {/* SOURCES Tab - Citation insights and top sources */}
        <TabsContent value="sources">
          <CitationInsights
            brandName={brand.name}
            brandDomain={brand.domain}
            scanResults={allScans || []}
            queries={allQueries || []}
            memos={memos || []}
          />
        </TabsContent>

        {/* WATCH Tab - Monitor competitor content activity */}
        <TabsContent value="watch">
          <CompetitorWatch
            brandId={brandId}
            content={(competitorContent || []) as Array<{
              id: string
              competitor_id: string
              url: string
              title: string
              content_summary: string | null
              topics: string[] | null
              content_type: string | null
              is_competitor_specific: boolean
              universal_topic: string | null
              status: string
              first_seen_at: string
              published_at?: string | null
              word_count?: number | null
              author?: string | null
              response_memo_id: string | null
              competitor?: { id: string; name: string; domain: string | null }
              response_memo?: { id: string; title: string; slug: string; status: string }
            }>}
            competitors={competitors || []}
          />
        </TabsContent>

        {/* Coverage Audit Tab */}
        <TabsContent value="coverage">
          <CoverageAudit
            brandId={brandId}
            brandName={brand.name}
            brandDomain={brand.domain || ''}
            initialTopics={topicTopics}
            initialScore={coverageScore}
            hasTopics={hasTopicUniverse}
          />
        </TabsContent>

        {/* SUNSET: Search, Traffic, Intelligence, Alerts, QFO, MAP, LAB, STRATEGY tabs removed (zero usage) */}
      </Tabs>
    </div>
  )
}
