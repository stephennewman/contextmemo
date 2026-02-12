import { Suspense } from 'react'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { FeedContainer } from '@/components/v2/feed/feed-container'
import { BrandPauseToggle } from '@/components/v2/brand-pause-toggle'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  FileText, 
  Search, 
  Users,
  ExternalLink,
  Settings,
  Play,
  Loader2,
  Building2,
  AlertTriangle,
} from 'lucide-react'
import type { BrandContext } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function V2BrandPage({ params }: Props) {
  const { brandId } = await params
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

  // Get brand
  const { data: brand, error } = await serviceClient
    .from('brands')
    .select('*, is_paused')
    .eq('id', brandId)
    .single()

  if (error || !brand) {
    notFound()
  }

  // Get recent scan results for citation rate
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  
  const { data: recentScans } = await serviceClient
    .from('scan_results')
    .select('brand_mentioned, brand_in_citations')
    .eq('brand_id', brandId)
    .gte('scanned_at', ninetyDaysAgo.toISOString())

  // Calculate citation rate
  const scansWithCitations = (recentScans || []).filter(s => s.brand_in_citations !== null)
  const brandCitedCount = scansWithCitations.filter(s => s.brand_in_citations === true).length
  const citationRate = scansWithCitations.length > 0 
    ? Math.round((brandCitedCount / scansWithCitations.length) * 100)
    : 0

  // Get counts
  const [memoResult, promptResult, competitorResult] = await Promise.all([
    serviceClient
      .from('memos')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('status', 'published'),
    serviceClient
      .from('queries')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('is_active', true),
    serviceClient
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('is_active', true),
  ])

  const context = brand.context as BrandContext

  return (
    <div className="h-full flex flex-col">
      {/* Brand Header */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A]">Dashboard</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">{brand.name}</span>
              {brand.verified ? (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#10B981] text-white rounded">VERIFIED</span>
              ) : (
                <span className="px-1.5 py-0.5 text-[10px] font-bold border border-[#0F172A] text-[#0F172A] rounded">PENDING</span>
              )}
              <span className="text-muted-foreground">·</span>
              <a 
                href={brand.custom_domain && brand.domain_verified ? `https://${brand.custom_domain}` : `https://${brand.subdomain}.contextmemo.com`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-[#0EA5E9] flex items-center gap-1"
              >
                {brand.custom_domain && brand.domain_verified ? brand.custom_domain : `${brand.subdomain}.contextmemo.com`}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <BrandPauseToggle brandId={brandId} initialPaused={brand.is_paused || false} />
            <Button variant="outline" size="sm" asChild>
              <Link href={`/v2/brands/${brandId}/profile`}>
                <Building2 className="h-4 w-4 mr-2" />
                Profile
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/brands/${brandId}/settings`}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
            <Button size="sm" className="bg-[#0EA5E9] hover:bg-[#0284C7]" disabled={brand.is_paused}>
              <Play className="h-4 w-4 mr-2" />
              Run Scan
            </Button>
          </div>
        </div>
        
        {/* Paused Warning Banner */}
        {brand.is_paused && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Brand is paused</p>
              <p className="text-xs text-amber-600">All automated scans and workflows are stopped. Click &quot;Resume&quot; to restart.</p>
            </div>
          </div>
        )}
        
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-[#0F172A] rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-[#0EA5E9]" />
              <span className="text-xs font-medium text-slate-400">CITATION RATE</span>
            </div>
            <p className="text-2xl font-bold text-[#0EA5E9]">{citationRate}%</p>
            <p className="text-xs text-slate-500 mt-1">
              {recentScans?.length || 0} scans (90d)
            </p>
          </div>
          
          <Link 
            href={`/v2/brands/${brandId}/memos`}
            className="p-4 border rounded-lg hover:border-purple-300 hover:bg-purple-50/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-medium text-muted-foreground">MEMOS</span>
            </div>
            <p className="text-2xl font-bold text-[#0F172A]">{memoResult.count || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">published</p>
          </Link>
          
          <Link 
            href={`/v2/brands/${brandId}/prompts`}
            className="p-4 border rounded-lg hover:border-green-300 hover:bg-green-50/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-1">
              <Search className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">PROMPTS</span>
            </div>
            <p className="text-2xl font-bold text-[#0F172A]">{promptResult.count || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">tracked</p>
          </Link>
          
          <Link 
            href={`/v2/brands/${brandId}/competitors`}
            className="p-4 border rounded-lg hover:border-orange-300 hover:bg-orange-50/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-orange-500" />
              <span className="text-xs font-medium text-muted-foreground">COMPETITORS</span>
            </div>
            <p className="text-2xl font-bold text-[#0F172A]">{competitorResult.count || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">monitored</p>
          </Link>
        </div>
      </div>
      
      {/* Feed - This Brand Only */}
      <div className="flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
          </div>
        }>
          <FeedContainer brandId={brandId} />
        </Suspense>
      </div>
    </div>
  )
}
