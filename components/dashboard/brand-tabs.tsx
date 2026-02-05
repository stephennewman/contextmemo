'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalLink, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { BrandContext, ScanResult, Query } from '@/lib/supabase/types'
import { ProfileSection } from './profile-section'
import { ScanResultsView, PromptVisibilityList } from './scan-results-view'
import { CompetitiveIntelligence } from './competitive-intelligence'
import { CompetitorContentFeed } from './competitor-content-feed'
import { CompetitorList } from './competitor-list'
import { SearchConsoleView } from './search-console-view'
import { AITrafficView } from './ai-traffic-view'
import { AlertsList } from './alerts-list'
import { AttributionDashboard } from './attribution-dashboard'
import { PromptIntelligenceFeed } from './prompt-intelligence-feed'
import { ModelInsightsPanel } from './model-insights-panel'
import { PushToHubSpotButton } from './brand-actions'

interface BrandTabsProps {
  brandId: string
  brandName: string
  brandDomain: string
  brandSubdomain: string
  context: BrandContext | null
  contextExtractedAt: string | null
  hasContext: boolean
  competitors: Array<{
    id: string
    name: string
    domain: string | null
    description: string | null
    auto_discovered: boolean
    is_active: boolean
  }>
}

type TabData = {
  scans?: unknown[]
  queries?: unknown[]
  memos?: unknown[]
  searchConsoleStats?: unknown[]
  competitorContent?: unknown[]
  competitorFeeds?: unknown[]
  aiTraffic?: unknown[]
  alerts?: unknown[]
  attributionEvents?: unknown[]
  promptIntelligence?: unknown[]
  modelInsights?: unknown
  lowVisibilityQueries?: unknown[]
}

export function BrandTabs({
  brandId,
  brandName,
  brandDomain,
  brandSubdomain,
  context,
  contextExtractedAt,
  hasContext,
  competitors,
}: BrandTabsProps) {
  const [activeTab, setActiveTab] = useState('profile')
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['profile']))
  const [tabData, setTabData] = useState<TabData>({})
  const [loading, setLoading] = useState<string | null>(null)

  const hubspotEnabled = !!(context?.hubspot?.enabled && context?.hubspot?.access_token && context?.hubspot?.blog_id)
  const hubspotAutoPublish = !!(context?.hubspot?.auto_publish)
  const activeCompetitors = competitors.filter(c => c.is_active)

  // Load tab data when tab is selected
  useEffect(() => {
    if (activeTab === 'profile' || loadedTabs.has(activeTab)) return

    const loadTabData = async () => {
      setLoading(activeTab)
      try {
        const params = new URLSearchParams({ tab: activeTab })
        const response = await fetch(`/api/brands/${brandId}/tab-data?${params}`)
        if (response.ok) {
          const data = await response.json()
          setTabData(prev => ({ ...prev, ...data }))
          setLoadedTabs(prev => new Set([...prev, activeTab]))
        }
      } catch (error) {
        console.error('Failed to load tab data:', error)
      } finally {
        setLoading(null)
      }
    }

    loadTabData()
  }, [activeTab, brandId, loadedTabs])

  const TabLoader = () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="bg-transparent border-b-[3px] border-[#0F172A] rounded-none p-0 h-auto flex-wrap">
        <TabsTrigger value="profile" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">PROFILE</TabsTrigger>
        <TabsTrigger value="scans" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">SCANS</TabsTrigger>
        <TabsTrigger value="memos" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">MEMOS</TabsTrigger>
        <TabsTrigger value="prompts" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">PROMPTS</TabsTrigger>
        <TabsTrigger value="competitors" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">COMPETITORS</TabsTrigger>
        <TabsTrigger value="search" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">SEARCH</TabsTrigger>
        <TabsTrigger value="traffic" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">AI TRAFFIC</TabsTrigger>
        <TabsTrigger value="intelligence" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">INTELLIGENCE</TabsTrigger>
        <TabsTrigger value="alerts" className="rounded-none border-0 data-[state=active]:bg-[#0EA5E9] data-[state=active]:text-white px-6 py-3 font-bold text-sm tracking-wide">ALERTS</TabsTrigger>
      </TabsList>

      {/* Profile Tab - Always loaded */}
      <TabsContent value="profile" className="space-y-6">
        <ProfileSection
          brandId={brandId}
          brandName={brandName}
          brandDomain={brandDomain}
          context={context}
          contextExtractedAt={contextExtractedAt}
          hasContext={hasContext}
          competitors={competitors}
        />
      </TabsContent>

      {/* Scans Tab */}
      <TabsContent value="scans" className="space-y-4">
        {loading === 'scans' ? <TabLoader /> : (
          <ScanResultsView 
            scanResults={(tabData.scans || []) as ScanResult[]}
            queries={(tabData.queries || []) as Query[]}
            brandName={brandName}
            brandDomain={brandDomain}
            competitors={activeCompetitors}
          />
        )}
      </TabsContent>

      {/* Memos Tab */}
      <TabsContent value="memos">
        {loading === 'memos' ? <TabLoader /> : (
          <div className="grid gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Published Memos</CardTitle>
                <CardDescription>Factual reference documents for AI to cite</CardDescription>
              </CardHeader>
              <CardContent>
                {(tabData.memos as Array<{
                  id: string
                  title: string
                  slug: string
                  status: string
                  published_at: string | null
                  schema_json: Record<string, unknown> | null
                  content_markdown: string
                  meta_description: string | null
                }> || []).length > 0 ? (
                  <div className="space-y-4">
                    {(tabData.memos as Array<{
                      id: string
                      title: string
                      slug: string
                      status: string
                      published_at: string | null
                      schema_json: Record<string, unknown> | null
                      content_markdown: string
                      meta_description: string | null
                    }>).map((memo) => {
                      const schemaJson = memo.schema_json as { 
                        hubspot_synced_at?: string
                        verification?: {
                          verified?: boolean
                          verified_at?: string
                          time_to_citation_hours?: number | null
                          citation_rate?: number
                          mention_rate?: number
                          models_citing?: string[]
                        }
                      } | null
                      const liveUrl = `https://${brandSubdomain}.contextmemo.com/${memo.slug}`
                      // Get content preview - use meta_description or truncate content_markdown
                      const contentPreview = memo.meta_description || 
                        memo.content_markdown
                          .replace(/^#.*$/gm, '') // Remove headers
                          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
                          .replace(/[*_`]/g, '') // Remove markdown formatting
                          .trim()
                          .slice(0, 400)
                      return (
                        <div key={memo.id} className="p-4 border rounded-lg space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              {memo.status === 'published' ? (
                                <a 
                                  href={liveUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="font-medium hover:text-primary hover:underline flex items-center gap-1 group"
                                >
                                  {memo.title}
                                  <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </a>
                              ) : (
                                <p className="font-medium">{memo.title}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {brandSubdomain}.contextmemo.com/{memo.slug}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant={memo.status === 'published' ? 'default' : 'secondary'} className="text-xs">
                                {memo.status}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-4">
                            {contentPreview}{contentPreview.length >= 400 ? '...' : ''}
                          </p>
                          <div className="flex items-center gap-2 pt-2 border-t">
                            {memo.status === 'published' && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  View Live
                                </a>
                              </Button>
                            )}
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/brands/${brandId}/memos/${memo.id}`}>
                                Edit
                              </Link>
                            </Button>
                            <PushToHubSpotButton 
                              brandId={brandId}
                              memoId={memo.id}
                              hubspotEnabled={hubspotEnabled}
                              hubspotAutoPublish={hubspotAutoPublish}
                              hubspotSyncedAt={schemaJson?.hubspot_synced_at}
                            />
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
        )}
      </TabsContent>

      {/* Prompts Tab */}
      <TabsContent value="prompts">
        {loading === 'prompts' ? <TabLoader /> : (
          <PromptVisibilityList 
            queries={(tabData.queries || []) as Query[]}
            scanResults={(tabData.scans || []) as ScanResult[]}
            brandName={brandName}
          />
        )}
      </TabsContent>

      {/* Competitors Tab */}
      <TabsContent value="competitors" className="space-y-4">
        {loading === 'competitors' ? <TabLoader /> : (
          <>
            <CompetitiveIntelligence
              brandName={brandName}
              competitors={activeCompetitors}
              scanResults={(tabData.scans || []) as ScanResult[]}
              queries={(tabData.queries || []) as Query[]}
            />
            <CompetitorContentFeed
              brandId={brandId}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              content={(tabData.competitorContent || []) as any}
              competitors={activeCompetitors}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              feeds={(tabData.competitorFeeds || []) as any}
            />
            <CompetitorList brandId={brandId} competitors={competitors} />
          </>
        )}
      </TabsContent>

      {/* Search Tab */}
      <TabsContent value="search">
        {loading === 'search' ? <TabLoader /> : (
          <SearchConsoleView
            brandId={brandId}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            stats={(tabData.searchConsoleStats || []) as any}
            queries={(tabData.queries || []) as Query[]}
            bingEnabled={!!(context?.search_console?.bing?.enabled && context?.search_console?.bing?.api_key)}
            bingLastSyncedAt={context?.search_console?.bing?.last_synced_at}
            googleEnabled={!!(context?.search_console?.google?.enabled && context?.search_console?.google?.refresh_token)}
            googleLastSyncedAt={context?.search_console?.google?.last_synced_at}
          />
        )}
      </TabsContent>

      {/* AI Traffic Tab */}
      <TabsContent value="traffic">
        {loading === 'traffic' ? <TabLoader /> : (
          <AITrafficView
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            traffic={(tabData.aiTraffic || []) as any}
            brandName={brandName}
          />
        )}
      </TabsContent>

      {/* Intelligence Tab */}
      <TabsContent value="intelligence" className="space-y-6">
        {loading === 'intelligence' ? <TabLoader /> : (
          <>
            <AttributionDashboard
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              events={(tabData.attributionEvents || []) as any}
              brandName={brandName}
              hubspotEnabled={hubspotEnabled}
            />
            <PromptIntelligenceFeed
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              items={(tabData.promptIntelligence || []) as any}
              brandName={brandName}
            />
            <ModelInsightsPanel
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              models={((tabData.modelInsights as any)?.models || []) as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              recommendations={((tabData.modelInsights as any)?.recommendations || []) as any}
              overallCitationRate={((tabData.modelInsights as { overallCitationRate?: number })?.overallCitationRate) || 0}
              totalScans={((tabData.modelInsights as { totalScans?: number })?.totalScans) || 0}
            />
          </>
        )}
      </TabsContent>

      {/* Alerts Tab */}
      <TabsContent value="alerts">
        {loading === 'alerts' ? <TabLoader /> : (
          <AlertsList 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            alerts={(tabData.alerts || []) as any}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            unreadCount={((tabData.alerts as any) || []).filter((a: any) => !a.read).length}
          />
        )}
      </TabsContent>
    </Tabs>
  )
}
