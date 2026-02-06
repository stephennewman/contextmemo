import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  ExternalLink,
  TrendingUp,
  Pencil,
  AlertTriangle,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { BrandContext } from '@/lib/supabase/types'
import { ScanButton, GenerateMemoDropdown, PushToHubSpotButton, FindContentGapsButton, GenerateMemosButton } from '@/components/dashboard/brand-actions'
import { ProfileSection } from '@/components/dashboard/profile-section'
import { OnboardingFlow } from '@/components/dashboard/onboarding-flow'
import { ScanResultsView, PromptVisibilityList } from '@/components/dashboard/scan-results-view'
import { CompetitiveIntelligence } from '@/components/dashboard/competitive-intelligence'
import { SearchConsoleView } from '@/components/dashboard/search-console-view'
import { CompetitorContentFeed } from '@/components/dashboard/competitor-content-feed'
import { EntityList } from '@/components/dashboard/entity-list'
import { CompetitorWatch } from '@/components/dashboard/competitor-watch'
import { ExportDropdown } from '@/components/dashboard/export-dropdown'
import { AITrafficView } from '@/components/dashboard/ai-traffic-view'
import { AlertsList } from '@/components/dashboard/alerts-list'
import { ActivityTab } from '@/components/dashboard/activity-feed'
import { AttributionDashboard } from '@/components/dashboard/attribution-dashboard'
import { PromptIntelligenceFeed } from '@/components/dashboard/prompt-intelligence-feed'
import { ModelInsightsPanel } from '@/components/dashboard/model-insights-panel'
import { PromptLab } from '@/components/dashboard/prompt-lab'
import { QueryFanOut } from '@/components/dashboard/query-fan-out'
import { EntityMap } from '@/components/dashboard/entity-map'
import { StrategyPlaybook } from '@/components/dashboard/strategy-playbook'
import { BrandPauseToggle } from '@/components/v2/brand-pause-toggle'

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

  // Get all competitors (including excluded for display)
  const { data: allCompetitors } = await supabase
    .from('competitors')
    .select('*')
    .eq('brand_id', brandId)
  
  // Filter for active competitors (used in scans and content monitoring)
  const competitors = allCompetitors?.filter(c => c.is_active) || []

  // Get queries
  const { data: queries } = await supabase
    .from('queries')
    .select('*')
    .eq('brand_id', brandId)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  // Get all scans for history (up to last 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  
  const { data: allScans } = await supabase
    .from('scan_results')
    .select('*')
    .eq('brand_id', brandId)
    .gte('scanned_at', ninetyDaysAgo.toISOString())
    .order('scanned_at', { ascending: true })

  // Get recent scans for the summary
  const recentScans = allScans?.slice(-100) || []

  // Build citation counts per entity (competitor) from scan results
  const entityDomains = (allCompetitors || [])
    .filter(c => c.domain)
    .map(c => ({ id: c.id, domain: c.domain!.toLowerCase() }))
  
  // Collect citations per entity (with full URLs)
  const citationsByEntity: Record<string, string[]> = {}
  for (const scan of (allScans || [])) {
    if (!scan.citations) continue
    for (const citation of scan.citations as string[]) {
      try {
        const url = new URL(citation)
        const domain = url.hostname.replace('www.', '').toLowerCase()
        // Find matching entity
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

  // Get memos
  const { data: memos } = await supabase
    .from('memos')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })

  // Get search console stats (last 90 days)
  const { data: searchConsoleStats } = await supabase
    .from('search_console_stats')
    .select('*')
    .eq('brand_id', brandId)
    .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  // Get competitor content (for content intelligence and watch tab)
  const competitorIds = (competitors || []).map(c => c.id)
  const { data: competitorContent } = competitorIds.length > 0 
    ? await supabase
        .from('competitor_content')
        .select('*, competitor:competitor_id(id, name, domain), response_memo:response_memo_id(id, title, slug, status)')
        .in('competitor_id', competitorIds)
        .order('first_seen_at', { ascending: false })
        .limit(100) // Increased for watch tab filtering
    : { data: [] }

  // Get competitor RSS feeds
  const { data: competitorFeeds } = competitorIds.length > 0
    ? await supabase
        .from('competitor_feeds')
        .select('*')
        .in('competitor_id', competitorIds)
        .eq('is_active', true)
        .order('discovered_at', { ascending: false })
    : { data: [] }

  // Get AI traffic data (last 90 days)
  const { data: aiTraffic } = await supabase
    .from('ai_traffic')
    .select('*, memo:memo_id(title, slug)')
    .eq('brand_id', brandId)
    .gte('timestamp', ninetyDaysAgo.toISOString())
    .order('timestamp', { ascending: false })
    .limit(500)

  // Get alerts for this brand
  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .limit(100)

  const unreadAlerts = alerts?.filter(a => !a.read) || []

  // Get attribution events
  const { data: attributionEvents } = await supabase
    .from('attribution_events')
    .select('*')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })
    .limit(100)

  // Get prompt intelligence
  const { data: promptIntelligence } = await supabase
    .from('prompt_intelligence')
    .select('*')
    .eq('brand_id', brandId)
    .order('opportunity_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  // Get model insights from most recent alert
  const { data: modelInsightsAlert } = await supabase
    .from('alerts')
    .select('*')
    .eq('brand_id', brandId)
    .eq('alert_type', 'model_insights')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const modelInsights = modelInsightsAlert?.data as {
    models?: Array<{
      model: string
      displayName: string
      totalScans: number
      brandMentions: number
      brandCitations: number
      mentionRate: number
      citationRate: number
      avgPosition: number | null
      topQueryTypes: Array<{ type: string; successRate: number }>
      contentPreferences: Array<{ pattern: string; score: number }>
    }>
    recommendations?: Array<{
      model: string
      priority: 'high' | 'medium' | 'low'
      title: string
      description: string
      actionItems: string[]
    }>
    overallCitationRate?: number
    totalScans?: number
  } | null

  // Get latest discovery scan result
  const { data: discoveryAlert } = await supabase
    .from('alerts')
    .select('*')
    .eq('brand_id', brandId)
    .eq('alert_type', 'discovery_complete')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  const discoveryResults = discoveryAlert?.data as {
    totalQueries?: number
    totalScans?: number
    totalMentions?: number
    mentionRate?: number
    byCategory?: Array<{ category: string; mentions: number; total: number; rate: number }>
    winningQueries?: Array<{ query: string; category: string; model: string; context: string | null }>
    sampleFailures?: Array<{ query: string; category: string }>
  } | null

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

  // Calculate visibility per query to find low-performers (exclude branded queries)
  const queryVisibility = new Map<string, { mentioned: number; total: number }>()
  unbiasedScans.forEach(scan => {
    if (!scan.query_id) return
    const current = queryVisibility.get(scan.query_id) || { mentioned: 0, total: 0 }
    current.total++
    if (scan.brand_mentioned) current.mentioned++
    queryVisibility.set(scan.query_id, current)
  })

  // Find queries with low visibility (< 30%) that need memos (exclude branded queries)
  const lowVisibilityQueries = (queries || [])
    .filter(q => !queryContainsBrand(q.query_text)) // Exclude branded queries
    .map(q => {
      const stats = queryVisibility.get(q.id)
      const visibility = stats && stats.total > 0 
        ? Math.round((stats.mentioned / stats.total) * 100) 
        : 0
      return {
        id: q.id,
        query_text: q.query_text,
        query_type: q.query_type,
        visibility,
        competitor_name: undefined, // Would need to join with competitors table
        hasScans: stats ? stats.total > 0 : false,
      }
    })
    .filter(q => q.hasScans && q.visibility < 30) // Only queries with scans and < 30% visibility
    .sort((a, b) => a.visibility - b.visibility) // Worst first
    .slice(0, 10)

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
          <BrandPauseToggle brandId={brandId} initialPaused={brand.is_paused || false} />
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
      {/* Bold Electric Header */}
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
        <BrandPauseToggle brandId={brandId} initialPaused={brand.is_paused || false} />
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

      {/* Citation Score Hero - only show if we have scans */}
      {hasAnyScans ? (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-6 bg-[#0F172A] text-white" style={{ borderLeft: '8px solid #0EA5E9' }}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-[#0EA5E9]" strokeWidth={2.5} />
              <span className="text-xs font-bold tracking-widest text-slate-400">CITATION SCORE</span>
            </div>
            <div className="text-5xl font-bold text-[#0EA5E9]">{citationScore}%</div>
            <div className="w-full h-2 bg-slate-700 mt-3">
              <div className="h-2 bg-[#0EA5E9]" style={{ width: `${citationScore}%` }} />
            </div>
          </div>
          <div className="p-6 border-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #8B5CF6' }}>
            <span className="text-xs font-bold tracking-widest text-zinc-500">MEMOS</span>
            <div className="text-4xl font-bold text-[#0F172A] mt-1">{memos?.length || 0}</div>
            <div className="text-sm text-zinc-500">published</div>
          </div>
          <div className="p-6 border-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #10B981' }}>
            <span className="text-xs font-bold tracking-widest text-zinc-500">PROMPTS</span>
            <div className="text-4xl font-bold text-[#0F172A] mt-1">{queries?.length || 0}</div>
            <div className="text-sm text-zinc-500">tracked</div>
          </div>
          <div className="p-6 border-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #F59E0B' }}>
            <span className="text-xs font-bold tracking-widest text-zinc-500">SCANS</span>
            <div className="text-4xl font-bold text-[#0F172A] mt-1">{recentScans?.length || 0}</div>
            <div className="text-sm text-zinc-500">last 90 days</div>
          </div>
        </div>
      ) : (
        /* No scans yet - prompt to run first scan */
        <div className="p-6 border-[3px] border-[#0EA5E9] bg-[#F0F9FF]" style={{ borderLeft: '8px solid #0EA5E9' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#0F172A] mb-1">Ready to scan!</h3>
              <p className="text-sm text-zinc-600">
                Setup complete. Run your first scan to see how visible {brand.name} is across AI assistants.
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                {queries?.length || 0} prompts • {competitors?.length || 0} competitors • 1 AI model (GPT-4o Mini)
              </p>
            </div>
            <div className="flex gap-2">
              <ScanButton brandId={brandId} brandName={brand.name} />
              <FindContentGapsButton brandId={brandId} brandName={brand.name} competitorCount={competitors?.length || 0} />
              <GenerateMemosButton brandId={brandId} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-transparent border-b-[3px] border-[#0F172A] rounded-none p-0 h-auto flex-wrap">
          <TabsTrigger value="profile" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">PROFILE</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">ACTIVITY</TabsTrigger>
          <TabsTrigger value="scans" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">SCANS{(recentScans?.length || 0) > 0 && ` (${recentScans?.length})`}</TabsTrigger>
          <TabsTrigger value="memos" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">MEMOS{(memos?.length || 0) > 0 && ` (${memos?.length})`}</TabsTrigger>
          <TabsTrigger value="prompts" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">PROMPTS{(queries?.length || 0) > 0 && ` (${queries?.length})`}</TabsTrigger>
          <TabsTrigger value="entities" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">ENTITIES{(allCompetitors?.length || 0) > 0 && ` (${allCompetitors?.length})`}</TabsTrigger>
          <TabsTrigger value="watch" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs relative">
            WATCH
            {/* Show badge if there's new content today */}
            {competitorContent && competitorContent.filter(c => {
              const d = new Date(c.published_at || c.first_seen_at)
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              return d >= today
            }).length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#0EA5E9] text-[9px] font-bold text-white flex items-center justify-center">
                {competitorContent.filter(c => {
                  const d = new Date(c.published_at || c.first_seen_at)
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  return d >= today
                }).length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs relative">
            ALERTS{(alerts?.length || 0) > 0 && ` (${alerts?.length})`}
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#F59E0B] text-[9px] font-bold text-white flex items-center justify-center">
                {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
              </span>
            )}
          </TabsTrigger>
          {/* Only show Search tab if Google or Bing is configured */}
          {(context?.search_console?.google?.enabled || context?.search_console?.bing?.enabled) && (
            <TabsTrigger value="search" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">SEARCH{(searchConsoleStats?.length || 0) > 0 && ` (${searchConsoleStats?.length})`}</TabsTrigger>
          )}
          {/* Only show AI Traffic tab if there's data */}
          {(aiTraffic?.length || 0) > 0 && (
            <TabsTrigger value="traffic" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs">AI TRAFFIC ({aiTraffic?.length})</TabsTrigger>
          )}
          {/* Only show Intelligence tab if there's data */}
          {((promptIntelligence?.length || 0) > 0 || (attributionEvents?.length || 0) > 0 || modelInsights?.models?.length) && (
            <TabsTrigger value="intelligence" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-4 py-2 font-bold text-xs relative">
              INTELLIGENCE
              {(promptIntelligence?.filter(p => p.status === 'new')?.length || 0) > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#F59E0B] text-[9px] font-bold text-white flex items-center justify-center">
                  {promptIntelligence?.filter(p => p.status === 'new')?.length}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="qfo" className="rounded-none border-0 data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white px-4 py-2 font-bold text-xs">
            QFO
          </TabsTrigger>
          <TabsTrigger value="map" className="rounded-none border-0 data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white px-4 py-2 font-bold text-xs">
            MAP
          </TabsTrigger>
          <TabsTrigger value="lab" className="rounded-none border-0 data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white px-4 py-2 font-bold text-xs">
            LAB
          </TabsTrigger>
          <TabsTrigger value="strategy" className="rounded-none border-0 data-[state=active]:bg-[#10B981] data-[state=active]:text-white px-4 py-2 font-bold text-xs">
            STRATEGY
          </TabsTrigger>
        </TabsList>

        {/* Brand Profile Tab - All extracted brand information */}
        <TabsContent value="profile" className="space-y-6">
          <ProfileSection
            brandId={brandId}
            brandName={brand.name}
            brandDomain={brand.domain}
            context={context}
            contextExtractedAt={brand.context_extracted_at}
            hasContext={hasContext}
            competitors={allCompetitors || []}
          />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <ActivityTab brandId={brandId} brandName={brand.name} />
        </TabsContent>

        <TabsContent value="scans" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Scan Results</h2>
              <p className="text-sm text-muted-foreground">See what AI models say when asked about your industry</p>
            </div>
            <div className="flex gap-2">
              <ExportDropdown brandId={brandId} />
              <FindContentGapsButton brandId={brandId} brandName={brand.name} competitorCount={competitors?.length || 0} />
              <GenerateMemosButton brandId={brandId} />
              <ScanButton brandId={brandId} brandName={brand.name} />
            </div>
          </div>
          <ScanResultsView 
            scanResults={recentScans} 
            queries={queries || []} 
            brandName={brand.name}
            brandDomain={brand.domain}
            competitors={competitors || []}
          />
        </TabsContent>

        <TabsContent value="memos">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Memos</CardTitle>
                  <CardDescription>
                    {memos?.length || 0} total &middot; {memos?.filter(m => m.status === 'published').length || 0} published &middot; {memos?.filter(m => m.status === 'draft').length || 0} drafts
                  </CardDescription>
                </div>
                <GenerateMemoDropdown brandId={brandId} />
              </div>
            </CardHeader>
            <CardContent>
              {memos && memos.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-[35%]">Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memos.map((memo) => {
                      const schemaJson = memo.schema_json as { 
                        hubspot_synced_at?: string
                      } | null
                      const liveUrl = `https://${brand.subdomain}.contextmemo.com/${memo.slug}`
                      const memoTypeFormatted = memo.memo_type
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (l: string) => l.toUpperCase())
                      
                      return (
                        <TableRow key={memo.id} className="group">
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              {memo.status === 'published' ? (
                                <a 
                                  href={liveUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="font-medium hover:text-primary hover:underline flex items-center gap-1 group/link"
                                >
                                  <span className="truncate max-w-[280px]">{memo.title}</span>
                                  <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0" />
                                </a>
                              ) : (
                                <span className="font-medium truncate max-w-[280px]">{memo.title}</span>
                              )}
                              <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                                /{memo.slug}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-normal">
                              {memoTypeFormatted}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={memo.status === 'published' ? 'default' : 'secondary'} 
                              className={`text-xs font-normal ${memo.status === 'published' ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}`}
                            >
                              {memo.status === 'published' ? 'Published' : 'Draft'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <span title={format(new Date(memo.created_at), 'PPpp')}>
                              {formatDistanceToNow(new Date(memo.created_at), { addSuffix: true })}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {memo.status === 'published' && (
                                <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                                  <a href={liveUrl} target="_blank" rel="noopener noreferrer" title="View live">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              <PushToHubSpotButton 
                                brandId={brandId}
                                memoId={memo.id}
                                hubspotEnabled={hubspotEnabled}
                                hubspotAutoPublish={hubspotAutoPublish}
                                hubspotSyncedAt={schemaJson?.hubspot_synced_at}
                              />
                              <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                                <Link href={`/brands/${brandId}/memos/${memo.id}`} title="Edit memo">
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  No memos yet. Generate your first memo to improve AI visibility.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompts">
          <PromptVisibilityList 
            queries={queries || []} 
            scanResults={recentScans}
            brandName={brand.name}
            brandId={brandId}
            themes={context?.prompt_themes || []}
          />
        </TabsContent>

        <TabsContent value="entities" className="space-y-4">
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
          
          {/* Entity List */}
          <EntityList 
            brandId={brandId} 
            entities={allCompetitors || []}
            citationCounts={citationCountsByEntity}
            citationUrls={citationsByEntity}
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

        <TabsContent value="search">
          <SearchConsoleView
            brandId={brandId}
            stats={searchConsoleStats || []}
            queries={queries || []}
            bingEnabled={!!(context?.search_console?.bing?.enabled && context?.search_console?.bing?.api_key)}
            bingLastSyncedAt={context?.search_console?.bing?.last_synced_at}
            googleEnabled={!!(context?.search_console?.google?.enabled && context?.search_console?.google?.refresh_token)}
            googleLastSyncedAt={context?.search_console?.google?.last_synced_at}
          />
        </TabsContent>

        <TabsContent value="traffic">
          <AITrafficView
            traffic={(aiTraffic || []) as Array<{
              id: string
              memo_id: string | null
              page_url: string
              referrer: string | null
              referrer_source: 'chatgpt' | 'perplexity' | 'claude' | 'gemini' | 'copilot' | 'meta_ai' | 'poe' | 'you' | 'phind' | 'direct' | 'unknown_ai' | 'organic' | 'direct_nav'
              timestamp: string
              memo?: { title: string; slug: string } | null
            }>}
            brandName={brand.name}
          />
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-6">
          {/* Attribution Dashboard */}
          <AttributionDashboard
            events={(attributionEvents || []) as Array<{
              id: string
              event_type: 'traffic' | 'contact' | 'deal' | 'closed_won'
              ai_source: string | null
              memo_id: string | null
              deal_value: number | null
              created_at: string
              metadata?: Record<string, unknown>
            }>}
            brandName={brand.name}
            hubspotEnabled={hubspotEnabled}
          />

          {/* Prompt Intelligence Feed */}
          <PromptIntelligenceFeed
            items={(promptIntelligence || []) as Array<{
              id: string
              category: 'trending' | 'competitor_win' | 'emerging' | 'declining'
              prompt_text: string
              insight_title: string
              insight_description: string
              competitors_winning: string[]
              opportunity_score: number
              action_suggestion: string
              status: 'new' | 'reviewed' | 'actioned' | 'dismissed'
              created_at: string
            }>}
            brandName={brand.name}
          />

          {/* Model Insights Panel */}
          <ModelInsightsPanel
            models={modelInsights?.models || []}
            recommendations={modelInsights?.recommendations || []}
            overallCitationRate={modelInsights?.overallCitationRate || citationScore}
            totalScans={modelInsights?.totalScans || recentScans?.length || 0}
          />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsList 
            alerts={(alerts || []) as Array<{
              id: string
              brand_id: string
              alert_type: string
              title: string
              message: string | null
              read: boolean
              data: Record<string, unknown> | null
              created_at: string
            }>}
            unreadCount={unreadAlerts.length}
          />
        </TabsContent>

        {/* Query Fan-Out - Sub-query analysis */}
        <TabsContent value="qfo">
          <QueryFanOut 
            brandId={brandId} 
            brandName={brand.name}
            existingPrompts={(queries || []).map(q => ({ id: q.id, query_text: q.query_text }))}
          />
        </TabsContent>

        {/* Entity Discovery Map - Visual entity relationships */}
        <TabsContent value="map">
          <EntityMap brandId={brandId} brandName={brand.name} />
        </TabsContent>

        {/* Prompt Lab - High-volume citation research */}
        <TabsContent value="lab">
          <PromptLab brandId={brandId} brandName={brand.name} />
        </TabsContent>

        {/* Strategy Playbook - AI Visibility Roadmap */}
        <TabsContent value="strategy">
          <StrategyPlaybook 
            brandId={brandId} 
            brandName={brand.name}
            metrics={{
              totalPrompts: queries?.length || 0,
              gapsIdentified: lowVisibilityQueries.length,
              memosGenerated: memos?.length || 0,
              visibilityScore: visibilityScore,
              aiTrafficVisits: aiTraffic?.length || 0,
              daysActive: Math.floor((Date.now() - new Date(brand.created_at).getTime()) / (1000 * 60 * 60 * 24)),
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
