import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ExternalLink,
  TrendingUp,
} from 'lucide-react'
import { BrandContext } from '@/lib/supabase/types'
import { ScanButton, GenerateMemoDropdown, PushToHubSpotButton, FindContentGapsButton } from '@/components/dashboard/brand-actions'
import { ProfileSection } from '@/components/dashboard/profile-section'
import { OnboardingFlow } from '@/components/dashboard/onboarding-flow'
import { ScanResultsView, PromptVisibilityList } from '@/components/dashboard/scan-results-view'
import { CompetitiveIntelligence } from '@/components/dashboard/competitive-intelligence'
import { SearchConsoleView } from '@/components/dashboard/search-console-view'
import { CompetitorContentFeed } from '@/components/dashboard/competitor-content-feed'
import { CompetitorList } from '@/components/dashboard/competitor-list'
import { ExportDropdown } from '@/components/dashboard/export-dropdown'
import { AITrafficView } from '@/components/dashboard/ai-traffic-view'
import { AlertsList } from '@/components/dashboard/alerts-list'
import { ActivityTab } from '@/components/dashboard/activity-feed'
import { AttributionDashboard } from '@/components/dashboard/attribution-dashboard'
import { PromptIntelligenceFeed } from '@/components/dashboard/prompt-intelligence-feed'
import { ModelInsightsPanel } from '@/components/dashboard/model-insights-panel'

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
    .select('*')
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

  // Get competitor content (for content intelligence)
  const competitorIds = (competitors || []).map(c => c.id)
  const { data: competitorContent } = competitorIds.length > 0 
    ? await supabase
        .from('competitor_content')
        .select('*, response_memo:response_memo_id(id, title, slug, status)')
        .in('competitor_id', competitorIds)
        .order('first_seen_at', { ascending: false })
        .limit(50)
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
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">{brand.name.toUpperCase()}</h1>
              {brand.verified ? (
                <span className="px-2 py-1 text-xs font-bold bg-[#10B981] text-white">VERIFIED</span>
              ) : (
                <span className="px-2 py-1 text-xs font-bold border-2 border-[#0F172A] text-[#0F172A]">PENDING</span>
              )}
            </div>
            <a 
              href={process.env.NODE_ENV === 'development' 
                ? `http://localhost:3000/memo/${brand.subdomain}` 
                : `https://${brand.subdomain}.contextmemo.com`
              } 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-zinc-500 hover:text-[#0EA5E9] flex items-center gap-1 font-medium"
            >
              {brand.subdomain}.contextmemo.com
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
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
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">{brand.name.toUpperCase()}</h1>
            {brand.verified ? (
              <span className="px-2 py-1 text-xs font-bold bg-[#10B981] text-white">VERIFIED</span>
            ) : (
              <span className="px-2 py-1 text-xs font-bold border-2 border-[#0F172A] text-[#0F172A]">PENDING</span>
            )}
          </div>
          <a 
            href={process.env.NODE_ENV === 'development' 
              ? `http://localhost:3000/memo/${brand.subdomain}` 
              : `https://${brand.subdomain}.contextmemo.com`
            } 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-[#0EA5E9] flex items-center gap-1 font-medium"
          >
            {brand.subdomain}.contextmemo.com
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

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
              <FindContentGapsButton brandId={brandId} competitorCount={competitors?.length || 0} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-transparent border-b-[3px] border-[#0F172A] rounded-none p-0 h-auto flex-wrap">
          <TabsTrigger value="profile" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">PROFILE</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">ACTIVITY</TabsTrigger>
          <TabsTrigger value="scans" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">SCANS{(recentScans?.length || 0) > 0 && ` (${recentScans?.length})`}</TabsTrigger>
          <TabsTrigger value="memos" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">MEMOS{(memos?.length || 0) > 0 && ` (${memos?.length})`}</TabsTrigger>
          <TabsTrigger value="prompts" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">PROMPTS{(queries?.length || 0) > 0 && ` (${queries?.length})`}</TabsTrigger>
          <TabsTrigger value="competitors" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">COMPETITORS{(competitors?.length || 0) > 0 && ` (${competitors?.length})`}</TabsTrigger>
          {/* Only show Search tab if Google or Bing is configured */}
          {(context?.search_console?.google?.enabled || context?.search_console?.bing?.enabled) && (
            <TabsTrigger value="search" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">SEARCH{(searchConsoleStats?.length || 0) > 0 && ` (${searchConsoleStats?.length})`}</TabsTrigger>
          )}
          {/* Only show AI Traffic tab if there's data */}
          {(aiTraffic?.length || 0) > 0 && (
            <TabsTrigger value="traffic" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">AI TRAFFIC ({aiTraffic?.length})</TabsTrigger>
          )}
          {/* Only show Intelligence tab if there's data */}
          {((promptIntelligence?.length || 0) > 0 || (attributionEvents?.length || 0) > 0 || modelInsights?.models?.length) && (
            <TabsTrigger value="intelligence" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide relative">
              INTELLIGENCE
              {(promptIntelligence?.filter(p => p.status === 'new')?.length || 0) > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#F59E0B] text-[10px] font-bold text-white flex items-center justify-center">
                  {promptIntelligence?.filter(p => p.status === 'new')?.length}
                </span>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="alerts" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide relative">
            ALERTS{(alerts?.length || 0) > 0 && ` (${alerts?.length})`}
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#F59E0B] text-[10px] font-bold text-white flex items-center justify-center">
                {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
              </span>
            )}
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
              <FindContentGapsButton brandId={brandId} competitorCount={competitors?.length || 0} />
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
          <div className="grid gap-4 md:grid-cols-3">
            {/* Generate New Memo */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Generate New Memo</CardTitle>
                <CardDescription>
                  Create AI-optimized content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GenerateMemoDropdown 
                  brandId={brandId} 
                  lowVisibilityQueries={lowVisibilityQueries}
                />
              </CardContent>
            </Card>
            
            {/* Existing Memos */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Published Memos</CardTitle>
                <CardDescription>
                  Factual reference documents for AI to cite
                </CardDescription>
              </CardHeader>
              <CardContent>
                {memos && memos.length > 0 ? (
                  <div className="space-y-2">
                    {memos.map((memo) => {
                      const schemaJson = memo.schema_json as { 
                        hubspot_synced_at?: string
                        source_gap_id?: string
                        verification?: {
                          verified?: boolean
                          verified_at?: string
                          time_to_citation_hours?: number | null
                          citation_rate?: number
                          mention_rate?: number
                          models_citing?: string[]
                        }
                      } | null
                      const liveUrl = `https://${brand.subdomain}.contextmemo.com/${memo.slug}`
                      return (
                        <div key={memo.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="min-w-0 flex-1">
                            {memo.status === 'published' ? (
                              <a 
                                href={liveUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="font-medium truncate hover:text-primary hover:underline flex items-center gap-1 group"
                              >
                                {memo.title}
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                            ) : (
                              <p className="font-medium truncate">{memo.title}</p>
                            )}
                            <p className="text-xs text-muted-foreground truncate">
                              {brand.subdomain}.contextmemo.com/{memo.slug}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Badge variant={memo.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                              {memo.status}
                            </Badge>
                            {memo.status === 'published' && (
                              <Button variant="ghost" size="sm" asChild>
                                <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <PushToHubSpotButton 
                              brandId={brandId}
                              memoId={memo.id}
                              hubspotEnabled={hubspotEnabled}
                              hubspotSyncedAt={schemaJson?.hubspot_synced_at}
                            />
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/brands/${brandId}/memos/${memo.id}`}>
                                Edit
                              </Link>
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm py-8 text-center">
                    No memos yet. Generate your first memo to improve AI visibility.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
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

        <TabsContent value="competitors" className="space-y-4">
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
          
          {/* Competitor List */}
          <CompetitorList 
            brandId={brandId} 
            competitors={allCompetitors || []} 
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
      </Tabs>
    </div>
  )
}
