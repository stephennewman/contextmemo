import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#0F172A]">DASHBOARD</h1>
          <p className="text-zinc-500 font-medium">
            Monitor your AI search visibility across all brands
          </p>
        </div>
        <Button asChild className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold rounded-none px-6">
          <Link href="/brands/new">
            <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} />
            ADD BRAND
          </Link>
        </Button>
      </div>

      {/* Brand Cards - Bold Electric Style */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {brandsWithStats.map((brand) => (
          <Link key={brand.id} href={`/brands/${brand.id}`}>
            <div className="border-[3px] border-[#0F172A] bg-white hover:shadow-lg transition-shadow cursor-pointer">
              {/* Header */}
              <div className="p-5 border-b-[3px] border-[#0F172A]">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xl font-bold text-[#0F172A]">{brand.name.toUpperCase()}</h3>
                  {brand.verified ? (
                    <span className="px-2 py-1 text-xs font-bold bg-[#10B981] text-white">VERIFIED</span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-bold border-2 border-[#0F172A] text-[#0F172A]">PENDING</span>
                  )}
                </div>
                <p className="text-sm text-zinc-500">{brand.subdomain}.contextmemo.com</p>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 divide-x-[3px] divide-[#0F172A]">
                {/* Visibility */}
                <div className="p-4 border-b-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #0EA5E9' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-[#0EA5E9]" strokeWidth={2.5} />
                    <span className="text-xs font-bold text-zinc-500">VISIBILITY</span>
                  </div>
                  <p className="text-3xl font-bold text-[#0F172A]">{brand.visibilityScore}%</p>
                </div>
                
                {/* Memos */}
                <div className="p-4 border-b-[3px] border-[#0F172A]" style={{ borderLeft: '8px solid #8B5CF6' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-[#8B5CF6]" strokeWidth={2.5} />
                    <span className="text-xs font-bold text-zinc-500">MEMOS</span>
                  </div>
                  <p className="text-3xl font-bold text-[#0F172A]">{brand.memos?.[0]?.count || 0}</p>
                </div>
                
                {/* Queries */}
                <div className="p-4" style={{ borderLeft: '8px solid #10B981' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Search className="h-4 w-4 text-[#10B981]" strokeWidth={2.5} />
                    <span className="text-xs font-bold text-zinc-500">PROMPTS</span>
                  </div>
                  <p className="text-3xl font-bold text-[#0F172A]">{brand.queries?.[0]?.count || 0}</p>
                </div>
                
                {/* Alerts */}
                <div className="p-4" style={{ borderLeft: '8px solid #F59E0B' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-[#F59E0B]" strokeWidth={2.5} />
                    <span className="text-xs font-bold text-zinc-500">ALERTS</span>
                  </div>
                  <p className="text-3xl font-bold text-[#0F172A]">{brand.alertsCount}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
