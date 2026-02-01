import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, TrendingUp, FileText, Search, AlertCircle } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get brands with stats
  const { data: brands } = await supabase
    .from('brands')
    .select(`
      *,
      memos:memos(count),
      queries:queries(count),
      scan_results:scan_results(count)
    `)
    .order('created_at', { ascending: false })

  // If no brands, redirect to create one
  if (!brands || brands.length === 0) {
    redirect('/brands/new')
  }

  // Calculate visibility score for each brand (excluding branded queries)
  const brandsWithStats = await Promise.all(
    brands.map(async (brand) => {
      // Get queries to identify branded ones
      const { data: queries } = await supabase
        .from('queries')
        .select('id, query_text')
        .eq('brand_id', brand.id)
        .eq('is_active', true)

      // Create set of branded query IDs (queries containing the brand name)
      const brandNameLower = brand.name.toLowerCase()
      const brandedQueryIds = new Set(
        (queries || [])
          .filter(q => q.query_text.toLowerCase().includes(brandNameLower))
          .map(q => q.id)
      )

      // Get latest scan results with query_id
      const { data: scans } = await supabase
        .from('scan_results')
        .select('brand_mentioned, query_id')
        .eq('brand_id', brand.id)
        .order('scanned_at', { ascending: false })
        .limit(100)

      // Filter out branded queries for unbiased visibility calculation
      const unbiasedScans = (scans || []).filter(s => !brandedQueryIds.has(s.query_id))
      const mentionedCount = unbiasedScans.filter(s => s.brand_mentioned).length
      const totalScans = unbiasedScans.length
      const visibilityScore = totalScans > 0 
        ? Math.round((mentionedCount / totalScans) * 100)
        : 0

      // Get unread alerts count
      const { count: alertsCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', brand.id)
        .eq('read', false)

      return {
        ...brand,
        visibilityScore,
        alertsCount: alertsCount || 0,
      }
    })
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your AI search visibility across all brands
          </p>
        </div>
        <Button asChild>
          <Link href="/brands/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Brand
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {brandsWithStats.map((brand) => (
          <Link key={brand.id} href={`/brands/${brand.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{brand.name}</CardTitle>
                  {brand.verified ? (
                    <Badge variant="secondary">Verified</Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </div>
                <CardDescription>{brand.subdomain}.contextmemo.com</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-primary/10">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{brand.visibilityScore}%</p>
                      <p className="text-xs text-muted-foreground">Visibility</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-blue-500/10">
                      <FileText className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{brand.memos?.[0]?.count || 0}</p>
                      <p className="text-xs text-muted-foreground">Memos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-green-500/10">
                      <Search className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{brand.queries?.[0]?.count || 0}</p>
                      <p className="text-xs text-muted-foreground">Queries</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-orange-500/10">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{brand.alertsCount}</p>
                      <p className="text-xs text-muted-foreground">Alerts</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
