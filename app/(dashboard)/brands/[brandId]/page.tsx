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
import { BrandContext, PERSONA_CONFIGS, CorePersona, CustomPersona } from '@/lib/supabase/types'
import { VisibilityChart } from '@/components/dashboard/visibility-chart'
import { ScanButton, GenerateMemoDropdown, PushToHubSpotButton, RefreshContextButton } from '@/components/dashboard/brand-actions'
import { OnboardingFlow } from '@/components/dashboard/onboarding-flow'
import { ScanResultsView, PromptVisibilityList } from '@/components/dashboard/scan-results-view'
import { CompetitiveIntelligence } from '@/components/dashboard/competitive-intelligence'
import { SearchConsoleView } from '@/components/dashboard/search-console-view'
import { CompetitorContentFeed } from '@/components/dashboard/competitor-content-feed'
import { CompetitorList } from '@/components/dashboard/competitor-list'
import { CitationAnalysis } from '@/components/dashboard/citation-analysis'

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

        {/* Onboarding Flow with Terminal */}
        <OnboardingFlow
          brandId={brandId}
          brandName={brand.name}
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
        <TabsList className="bg-transparent border-b-[3px] border-[#0F172A] rounded-none p-0 h-auto">
          <TabsTrigger value="overview" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">OVERVIEW</TabsTrigger>
          <TabsTrigger value="scans" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">SCANS{(recentScans?.length || 0) > 0 && ` (${recentScans?.length})`}</TabsTrigger>
          <TabsTrigger value="memos" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">MEMOS{(memos?.length || 0) > 0 && ` (${memos?.length})`}</TabsTrigger>
          <TabsTrigger value="prompts" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">PROMPTS{(queries?.length || 0) > 0 && ` (${queries?.length})`}</TabsTrigger>
          <TabsTrigger value="competitors" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">COMPETITORS{(competitors?.length || 0) > 0 && ` (${competitors?.length})`}</TabsTrigger>
          <TabsTrigger value="search" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">SEARCH{(searchConsoleStats?.length || 0) > 0 && ` (${searchConsoleStats?.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Visibility Chart - the main focus */}
          <VisibilityChart 
            scanResults={allScans || []} 
            brandName={brand.name}
            queries={queries || []}
          />

          {/* Target Personas - show who we're generating prompts for */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Target Personas</CardTitle>
                  <CardDescription>
                    User types detected from your website - prompts are tailored to how each persona searches
                  </CardDescription>
                </div>
                <RefreshContextButton brandId={brandId} />
              </div>
            </CardHeader>
            <CardContent>
              {context?.target_personas && context.target_personas.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {context.target_personas.map((personaId: string) => {
                    // Check if it's a core persona
                    const corePersona = PERSONA_CONFIGS.find(p => p.id === personaId)
                    // Check if it's a custom persona
                    const customPersona = context.custom_personas?.find((cp: CustomPersona) => cp.id === personaId)
                    
                    if (corePersona) {
                      return (
                        <div 
                          key={personaId}
                          className="px-3 py-2 border rounded-lg bg-muted/50"
                        >
                          <div className="font-medium text-sm">{corePersona.name}</div>
                          <div className="text-xs text-muted-foreground">{corePersona.description}</div>
                        </div>
                      )
                    }
                    
                    if (customPersona) {
                      return (
                        <div 
                          key={personaId}
                          className="px-3 py-2 border rounded-lg bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800"
                        >
                          <div className="font-medium text-sm flex items-center gap-2">
                            {customPersona.name}
                            <Badge variant="outline" className="text-[10px] px-1 py-0">Custom</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">{customPersona.description}</div>
                          <div className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                            Detected from: {customPersona.detected_from}
                          </div>
                        </div>
                      )
                    }
                    
                    // Unknown persona (shouldn't happen but fallback)
                    return (
                      <div key={personaId} className="px-3 py-2 border rounded-lg bg-muted/50">
                        <div className="font-medium text-sm">
                          {personaId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-3">
                    No personas detected yet. Click &quot;Refresh Context&quot; to analyze your website and identify target user types.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Personas help generate prompts tailored to how different users search (B2B marketers, developers, SMB owners, etc.)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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
      </Tabs>
    </div>
  )
}
