import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ExternalLink,
  Settings,
  TrendingUp
} from 'lucide-react'
import { BrandContext } from '@/lib/supabase/types'
import { VisibilityChart } from '@/components/dashboard/visibility-chart'
import { ScanButton, GenerateMemoDropdown, PushToHubSpotButton, RefreshContextButton, AIOverviewScanButton } from '@/components/dashboard/brand-actions'
import { OnboardingFlow } from '@/components/dashboard/onboarding-flow'
import { ScanResultsView, PromptVisibilityList } from '@/components/dashboard/scan-results-view'
import { PersonaManager } from '@/components/dashboard/persona-manager'
import { CompetitiveIntelligence } from '@/components/dashboard/competitive-intelligence'
import { SearchConsoleView } from '@/components/dashboard/search-console-view'
import { CompetitorContentFeed } from '@/components/dashboard/competitor-content-feed'
import { CompetitorList } from '@/components/dashboard/competitor-list'
import { CitationAnalysis } from '@/components/dashboard/citation-analysis'
import { ExportDropdown } from '@/components/dashboard/export-dropdown'
import { AITrafficView } from '@/components/dashboard/ai-traffic-view'

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

  // Get AI traffic data (last 90 days)
  const { data: aiTraffic } = await supabase
    .from('ai_traffic')
    .select('*, memo:memo_id(title, slug)')
    .eq('brand_id', brandId)
    .gte('timestamp', ninetyDaysAgo.toISOString())
    .order('timestamp', { ascending: false })
    .limit(500)

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

  // Filter scans to exclude branded queries for visibility calculation
  const unbiasedScans = recentScans.filter(s => !brandedQueryIds.has(s.query_id))

  // Calculate visibility score from unbiased scans only
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
          <Button variant="outline" size="sm" asChild className="rounded-none border-2 border-[#0F172A] hover:bg-[#0F172A] hover:text-white">
            <Link href={`/brands/${brandId}/settings`}>
              <Settings className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </Button>
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
        <div className="flex gap-2">
          <ExportDropdown brandId={brandId} />
          <AIOverviewScanButton brandId={brandId} />
          <Button variant="outline" size="sm" asChild className="rounded-none border-2 border-[#0F172A] hover:bg-[#0F172A] hover:text-white">
            <Link href={`/brands/${brandId}/settings`}>
              <Settings className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </Button>
          <ScanButton brandId={brandId} />
        </div>
      </div>

      {/* Visibility Score Hero - only show if we have scans */}
      {hasAnyScans ? (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-6 bg-[#0F172A] text-white" style={{ borderLeft: '8px solid #0EA5E9' }}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-[#0EA5E9]" strokeWidth={2.5} />
              <span className="text-xs font-bold tracking-widest text-slate-400">VISIBILITY SCORE</span>
            </div>
            <div className="text-5xl font-bold text-[#0EA5E9]">{visibilityScore}%</div>
            <div className="w-full h-2 bg-slate-700 mt-3">
              <div className="h-2 bg-[#0EA5E9]" style={{ width: `${visibilityScore}%` }} />
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
                {queries?.length || 0} prompts • {competitors?.length || 0} competitors • 6 AI models
              </p>
            </div>
            <ScanButton brandId={brandId} />
          </div>
        </div>
      )}

      {/* Main Content - Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-transparent border-b-[3px] border-[#0F172A] rounded-none p-0 h-auto flex-wrap">
          <TabsTrigger value="overview" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">OVERVIEW</TabsTrigger>
          <TabsTrigger value="profile" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">PROFILE</TabsTrigger>
          <TabsTrigger value="scans" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">SCANS{(recentScans?.length || 0) > 0 && ` (${recentScans?.length})`}</TabsTrigger>
          <TabsTrigger value="memos" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">MEMOS{(memos?.length || 0) > 0 && ` (${memos?.length})`}</TabsTrigger>
          <TabsTrigger value="prompts" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">PROMPTS{(queries?.length || 0) > 0 && ` (${queries?.length})`}</TabsTrigger>
          <TabsTrigger value="competitors" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">COMPETITORS{(competitors?.length || 0) > 0 && ` (${competitors?.length})`}</TabsTrigger>
          <TabsTrigger value="search" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">SEARCH{(searchConsoleStats?.length || 0) > 0 && ` (${searchConsoleStats?.length})`}</TabsTrigger>
          <TabsTrigger value="traffic" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">AI TRAFFIC{(aiTraffic?.length || 0) > 0 && ` (${aiTraffic?.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Visibility Chart - the main focus */}
          <VisibilityChart 
            scanResults={allScans || []} 
            brandName={brand.name}
            queries={queries || []}
          />

          {/* Brand Profile Summary */}
          {hasContext && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Brand Profile</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/brands/${brandId}?tab=profile`}>View Full Profile →</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  {/* Personas Summary */}
                  <div className="p-3 border rounded-lg">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Personas</div>
                    <div className="text-2xl font-bold">{(context?.target_personas || []).length - (context?.disabled_personas || []).length}</div>
                    <div className="text-xs text-muted-foreground">active of {(context?.target_personas || []).length}</div>
                  </div>
                  {/* Primary Offer */}
                  <div className="p-3 border rounded-lg">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Primary Offer</div>
                    {context?.offers?.primary ? (
                      <>
                        <div className="font-medium truncate">{context.offers.primary.label}</div>
                        <Badge variant="outline" className="text-xs capitalize mt-1">
                          {context.offers.primary.type.replace('_', ' ')}
                        </Badge>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">Not detected</div>
                    )}
                  </div>
                  {/* Pricing */}
                  <div className="p-3 border rounded-lg">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Pricing</div>
                    {context?.offers?.pricing_model ? (
                      <div className="font-medium capitalize">{context.offers.pricing_model.replace('_', ' ')}</div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Not detected</div>
                    )}
                  </div>
                  {/* Products */}
                  <div className="p-3 border rounded-lg">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Products</div>
                    <div className="text-2xl font-bold">{(context?.products || []).length}</div>
                    <div className="text-xs text-muted-foreground">detected</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discovery Scan Results */}
          {discoveryResults && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Discovery Scan Results</CardTitle>
                    <CardDescription>
                      Where is {brand.name} being mentioned in AI responses?
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{discoveryResults.mentionRate}%</div>
                    <div className="text-xs text-muted-foreground">mention rate</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-semibold">{discoveryResults.totalQueries}</div>
                    <div className="text-xs text-muted-foreground">Prompts tested</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-semibold">{discoveryResults.totalMentions}</div>
                    <div className="text-xs text-muted-foreground">Brand mentions</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-semibold">{discoveryResults.totalScans}</div>
                    <div className="text-xs text-muted-foreground">Total scans</div>
                  </div>
                </div>

                {/* Winning Prompts */}
                {discoveryResults.winningQueries && discoveryResults.winningQueries.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-green-600">Winning Prompts (Brand Mentioned)</h4>
                    <div className="space-y-2">
                      {discoveryResults.winningQueries.slice(0, 5).map((q, i) => (
                        <div key={i} className="p-3 border border-green-200 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <p className="font-medium text-sm">&quot;{q.query}&quot;</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {q.category} • {q.model}
                          </p>
                          {q.context && (
                            <p className="text-xs mt-2 text-green-700 dark:text-green-400 italic">
                              ...{q.context}...
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Failed Prompts */}
                {discoveryResults.sampleFailures && discoveryResults.sampleFailures.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">Prompts Where Not Mentioned (samples)</h4>
                    <div className="space-y-1">
                      {discoveryResults.sampleFailures.slice(0, 5).map((q, i) => (
                        <div key={i} className="p-2 text-sm text-muted-foreground border rounded">
                          &quot;{q.query}&quot;
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* By Category */}
                {discoveryResults.byCategory && discoveryResults.byCategory.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Performance by Category</h4>
                    <div className="space-y-1">
                      {discoveryResults.byCategory.map((cat, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="capitalize">{cat.category.replace('_', ' ')}</span>
                          <span className={cat.rate > 0 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                            {cat.mentions}/{cat.total} ({cat.rate}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Brand Profile Tab - All extracted brand information */}
        <TabsContent value="profile" className="space-y-6">
          {/* Header with refresh button */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Brand Profile</h2>
              <p className="text-sm text-muted-foreground">
                All information extracted from {brand.domain}
                {brand.context_extracted_at && (
                  <span> • Last updated {new Date(brand.context_extracted_at).toLocaleDateString()}</span>
                )}
              </p>
            </div>
            <RefreshContextButton brandId={brandId} />
          </div>

          {hasContext ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Company Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Company Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Name</label>
                      <p className="font-medium">{context?.company_name || brand.name}</p>
                    </div>
                    {context?.description && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
                        <p className="text-sm">{context.description}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      {context?.founded && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Founded</label>
                          <p className="text-sm">{context.founded}</p>
                        </div>
                      )}
                      {context?.headquarters && (
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Headquarters</label>
                          <p className="text-sm">{context.headquarters}</p>
                        </div>
                      )}
                    </div>
                    {context?.brand_voice && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Brand Voice</label>
                        <Badge variant="outline" className="capitalize mt-1">{context.brand_voice}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Products & Services */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Products & Services</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {context?.products && context.products.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {context.products.map((product: string, i: number) => (
                        <Badge key={i} variant="secondary">{product}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No products detected</p>
                  )}
                  {context?.features && context.features.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Key Features</label>
                      <div className="flex flex-wrap gap-2">
                        {context.features.map((feature: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{feature}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Markets & Customers */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Markets & Customers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {context?.markets && context.markets.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Target Markets</label>
                      <div className="flex flex-wrap gap-2">
                        {context.markets.map((market: string, i: number) => (
                          <Badge key={i} variant="secondary">{market}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {context?.customers && context.customers.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Notable Customers</label>
                      <div className="flex flex-wrap gap-2">
                        {context.customers.map((customer: string, i: number) => (
                          <Badge key={i} variant="outline">{customer}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!context?.markets || context.markets.length === 0) && (!context?.customers || context.customers.length === 0) && (
                    <p className="text-sm text-muted-foreground">No markets or customers detected</p>
                  )}
                </CardContent>
              </Card>

              {/* Certifications */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Certifications & Compliance</CardTitle>
                </CardHeader>
                <CardContent>
                  {context?.certifications && context.certifications.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {context.certifications.map((cert: string, i: number) => (
                        <Badge key={i} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{cert}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No certifications detected</p>
                  )}
                </CardContent>
              </Card>

              {/* Target Personas - Full width */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Target Personas</CardTitle>
                  <CardDescription>User types this brand targets - used for generating relevant prompts</CardDescription>
                </CardHeader>
                <CardContent>
                  <PersonaManager 
                    brandId={brandId}
                    targetPersonas={context?.target_personas || []}
                    customPersonas={context?.custom_personas || []}
                    disabledPersonas={context?.disabled_personas || []}
                  />
                </CardContent>
              </Card>

              {/* Offers/CTAs */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Offers & Pricing</CardTitle>
                  <CardDescription>Primary and secondary calls-to-action detected from the website</CardDescription>
                </CardHeader>
                <CardContent>
                  {context?.offers ? (
                    <div className="grid gap-4 md:grid-cols-3">
                      {/* Primary Offer */}
                      <div className={`p-4 border rounded-lg ${context.offers.primary ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-muted/30'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-emerald-600 text-xs">Primary Offer</Badge>
                        </div>
                        {context.offers.primary ? (
                          <>
                            <Badge variant="outline" className="text-xs capitalize mb-2">
                              {context.offers.primary.type.replace('_', ' ')}
                            </Badge>
                            <div className="font-semibold text-lg">{context.offers.primary.label}</div>
                            {context.offers.primary.details && (
                              <p className="text-sm text-muted-foreground mt-1">{context.offers.primary.details}</p>
                            )}
                            {context.offers.primary.url && (
                              <a 
                                href={context.offers.primary.url.startsWith('http') ? context.offers.primary.url : `https://${brand.domain}${context.offers.primary.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-emerald-600 hover:underline mt-2 inline-block"
                              >
                                {context.offers.primary.url} →
                              </a>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Not detected</p>
                        )}
                      </div>

                      {/* Secondary Offer */}
                      <div className={`p-4 border rounded-lg ${context.offers.secondary ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : 'bg-muted/30'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">Secondary Offer</Badge>
                        </div>
                        {context.offers.secondary ? (
                          <>
                            <Badge variant="outline" className="text-xs capitalize mb-2">
                              {context.offers.secondary.type.replace('_', ' ')}
                            </Badge>
                            <div className="font-semibold text-lg">{context.offers.secondary.label}</div>
                            {context.offers.secondary.details && (
                              <p className="text-sm text-muted-foreground mt-1">{context.offers.secondary.details}</p>
                            )}
                            {context.offers.secondary.url && (
                              <a 
                                href={context.offers.secondary.url.startsWith('http') ? context.offers.secondary.url : `https://${brand.domain}${context.offers.secondary.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                              >
                                {context.offers.secondary.url} →
                              </a>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Not detected</p>
                        )}
                      </div>

                      {/* Pricing */}
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">Pricing Model</Badge>
                        </div>
                        {context.offers.pricing_model ? (
                          <>
                            <div className="font-semibold text-lg capitalize">{context.offers.pricing_model.replace('_', ' ')}</div>
                            {context.offers.pricing_url && (
                              <a 
                                href={context.offers.pricing_url.startsWith('http') ? context.offers.pricing_url : `https://${brand.domain}${context.offers.pricing_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                              >
                                View pricing page →
                              </a>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Not detected</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No offers detected. Click &quot;Refresh Context&quot; to analyze the website.</p>
                  )}
                </CardContent>
              </Card>

              {/* Social Links */}
              {context?.social_links && Object.keys(context.social_links).length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Social & External Links</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {context.social_links.linkedin && (
                        <a href={context.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border rounded-lg hover:bg-muted/50 text-sm">
                          LinkedIn →
                        </a>
                      )}
                      {context.social_links.twitter && (
                        <a href={context.social_links.twitter} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border rounded-lg hover:bg-muted/50 text-sm">
                          Twitter/X →
                        </a>
                      )}
                      {context.social_links.crunchbase && (
                        <a href={context.social_links.crunchbase} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border rounded-lg hover:bg-muted/50 text-sm">
                          Crunchbase →
                        </a>
                      )}
                      {context.social_links.wikipedia && (
                        <a href={context.social_links.wikipedia} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border rounded-lg hover:bg-muted/50 text-sm">
                          Wikipedia →
                        </a>
                      )}
                      {context.social_links.github && (
                        <a href={context.social_links.github} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border rounded-lg hover:bg-muted/50 text-sm">
                          GitHub →
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No brand context extracted yet. Click &quot;Refresh Context&quot; to analyze {brand.domain}.
                </p>
                <RefreshContextButton brandId={brandId} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scans" className="space-y-4">
          {/* Citation Analysis - Perplexity-specific insights */}
          <CitationAnalysis
            scanResults={recentScans}
            brandDomain={brand.domain}
            brandName={brand.name}
          />
          
          <ScanResultsView 
            scanResults={recentScans} 
            queries={queries || []} 
            brandName={brand.name}
            brandDomain={brand.domain}
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
                      const schemaJson = memo.schema_json as { hubspot_synced_at?: string } | null
                      return (
                        <div key={memo.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{memo.title}</p>
                            <p className="text-xs text-muted-foreground">
                              /{memo.slug}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <Badge variant={memo.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                              {memo.status}
                            </Badge>
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
      </Tabs>
    </div>
  )
}
