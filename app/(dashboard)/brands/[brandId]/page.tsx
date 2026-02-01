import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  AlertCircle,
  ExternalLink,
  Settings
} from 'lucide-react'
import { BrandContext } from '@/lib/supabase/types'
import { VisibilityChart } from '@/components/dashboard/visibility-chart'
import { BrandActions, ScanButton, GenerateMemoDropdown, PushToHubSpotButton } from '@/components/dashboard/brand-actions'

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

  // Get competitors
  const { data: competitors } = await supabase
    .from('competitors')
    .select('*')
    .eq('brand_id', brandId)
    .eq('is_active', true)

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

  // Calculate visibility score from recent scans
  const mentionedCount = recentScans.filter(s => s.brand_mentioned).length
  const totalScans = recentScans.length
  const visibilityScore = totalScans > 0 
    ? Math.round((mentionedCount / totalScans) * 100)
    : 0

  // Calculate visibility per query to find low-performers
  const queryVisibility = new Map<string, { mentioned: number; total: number }>()
  recentScans.forEach(scan => {
    if (!scan.query_id) return
    const current = queryVisibility.get(scan.query_id) || { mentioned: 0, total: 0 }
    current.total++
    if (scan.brand_mentioned) current.mentioned++
    queryVisibility.set(scan.query_id, current)
  })

  // Find queries with low visibility (< 30%) that need memos
  const lowVisibilityQueries = (queries || [])
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{brand.name}</h1>
            {brand.verified ? (
              <Badge className="bg-green-500 text-xs">Verified</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">Unverified</Badge>
            )}
          </div>
          <a 
            href={process.env.NODE_ENV === 'development' 
              ? `http://localhost:3000/memo/${brand.subdomain}` 
              : `https://${brand.subdomain}.contextmemo.com`
            } 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:underline flex items-center gap-1"
          >
            {brand.subdomain}.contextmemo.com
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/brands/${brandId}/settings`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <ScanButton brandId={brandId} />
        </div>
      </div>

      {/* Setup Progress - only show if incomplete */}
      {(!hasContext || !competitors?.length || !queries?.length) && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-700 dark:text-orange-400">Complete setup to start tracking</span>
            </div>
            <BrandActions 
              brandId={brandId}
              hasContext={hasContext}
              hasCompetitors={!!competitors?.length}
              hasQueries={!!queries?.length}
            />
          </CardContent>
        </Card>
      )}

      {/* Main Content - Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="memos">Memos{(memos?.length || 0) > 0 && ` (${memos?.length})`}</TabsTrigger>
          <TabsTrigger value="queries">Queries{(queries?.length || 0) > 0 && ` (${queries?.length})`}</TabsTrigger>
          <TabsTrigger value="competitors">Competitors{(competitors?.length || 0) > 0 && ` (${competitors?.length})`}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Visibility Chart - the main focus */}
          <VisibilityChart scanResults={allScans || []} />
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

        <TabsContent value="queries">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Monitored Queries</CardTitle>
                  <CardDescription>
                    Search queries your prospects ask AI
                  </CardDescription>
                </div>
                <Button variant="outline">Add Query</Button>
              </div>
            </CardHeader>
            <CardContent>
              {queries && queries.length > 0 ? (
                <div className="space-y-2">
                  {queries.map((query) => (
                    <div key={query.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">&quot;{query.query_text}&quot;</p>
                        <p className="text-sm text-muted-foreground">
                          {query.query_type}
                        </p>
                      </div>
                      <Badge variant="outline">
                        Priority: {query.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No queries generated yet. Complete the setup to auto-generate relevant queries.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Competitors</CardTitle>
                  <CardDescription>
                    Brands competing for the same AI recommendations
                  </CardDescription>
                </div>
                <Button variant="outline">Add Competitor</Button>
              </div>
            </CardHeader>
            <CardContent>
              {competitors && competitors.length > 0 ? (
                <div className="space-y-3">
                  {competitors.map((competitor) => (
                    <div key={competitor.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{competitor.name}</p>
                        {competitor.domain && (
                          <p className="text-sm text-muted-foreground">
                            {competitor.domain}
                          </p>
                        )}
                      </div>
                      {competitor.auto_discovered && (
                        <Badge variant="secondary">Auto-discovered</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No competitors identified yet. Run competitor discovery to find them.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
