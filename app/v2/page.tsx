import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { FeedContainer } from '@/components/v2/feed/feed-container'
import { TrendingUp, FileText, Search, Users, Loader2 } from 'lucide-react'

export default async function V2DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Use service client for queries
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all brands for this tenant
  const { data: brands } = await serviceClient
    .from('brands')
    .select('id, name')
    .eq('tenant_id', user.id)

  // Scope all stats to the primary brand so counts match what the user sees when clicking through
  const primaryBrandId = brands?.[0]?.id
  
  // Get recent scan results for citation rate
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  
  const { data: recentScans } = primaryBrandId
    ? await serviceClient
        .from('scan_results')
        .select('brand_mentioned, brand_in_citations')
        .eq('brand_id', primaryBrandId)
        .gte('scanned_at', ninetyDaysAgo.toISOString())
    : { data: [] }

  // Calculate citation rate
  const scansWithCitations = (recentScans || []).filter(s => s.brand_in_citations !== null)
  const brandCitedCount = scansWithCitations.filter(s => s.brand_in_citations === true).length
  const citationRate = scansWithCitations.length > 0 
    ? Math.round((brandCitedCount / scansWithCitations.length) * 100)
    : 0

  // Get memo count - scoped to primary brand to match linked page
  const { count: memoCount } = primaryBrandId
    ? await serviceClient
        .from('memos')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', primaryBrandId)
        .eq('status', 'published')
    : { count: 0 }

  // Get prompt count - scoped to primary brand to match linked page
  const { count: promptCount } = primaryBrandId
    ? await serviceClient
        .from('queries')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', primaryBrandId)
        .eq('is_active', true)
    : { count: 0 }

  // Get competitor count - scoped to primary brand to match linked page
  const { count: competitorCount } = primaryBrandId
    ? await serviceClient
        .from('competitors')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', primaryBrandId)
        .eq('is_active', true)
    : { count: 0 }

  return (
    <div className="h-full flex flex-col">
      {/* Stats Header */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Brands</h1>
            <p className="text-sm text-muted-foreground">
              Activity across all {brands?.length || 0} brand{(brands?.length || 0) !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-[#0F172A] rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-[#0EA5E9]" />
              <span className="text-xs font-medium text-slate-400">CITATION RATE</span>
            </div>
            <p className="text-2xl font-bold text-[#0EA5E9]">{citationRate}%</p>
          </div>
          
          {brands && brands[0] ? (
            <Link 
              href={`/v2/brands/${brands[0].id}/memos`}
              className="p-4 border rounded-lg hover:border-purple-300 hover:bg-purple-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground">MEMOS</span>
              </div>
              <p className="text-2xl font-bold text-[#0F172A]">{memoCount || 0}</p>
            </Link>
          ) : (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground">MEMOS</span>
              </div>
              <p className="text-2xl font-bold text-[#0F172A]">{memoCount || 0}</p>
            </div>
          )}
          
          {brands && brands[0] ? (
            <Link 
              href={`/v2/brands/${brands[0].id}/prompts`}
              className="p-4 border rounded-lg hover:border-green-300 hover:bg-green-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                <Search className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-muted-foreground">PROMPTS</span>
              </div>
              <p className="text-2xl font-bold text-[#0F172A]">{promptCount || 0}</p>
            </Link>
          ) : (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Search className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-muted-foreground">PROMPTS</span>
              </div>
              <p className="text-2xl font-bold text-[#0F172A]">{promptCount || 0}</p>
            </div>
          )}
          
          {brands && brands[0] ? (
            <Link 
              href={`/v2/brands/${brands[0].id}/competitors`}
              className="p-4 border rounded-lg hover:border-orange-300 hover:bg-orange-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium text-muted-foreground">COMPETITORS</span>
              </div>
              <p className="text-2xl font-bold text-[#0F172A]">{competitorCount || 0}</p>
            </Link>
          ) : (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-orange-500" />
                <span className="text-xs font-medium text-muted-foreground">COMPETITORS</span>
              </div>
              <p className="text-2xl font-bold text-[#0F172A]">{competitorCount || 0}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Feed - All Brands */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
          </div>
        }>
          <FeedContainer />
        </Suspense>
      </div>
    </div>
  )
}
