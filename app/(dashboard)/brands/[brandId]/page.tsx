import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExternalLink, AlertTriangle } from 'lucide-react'
import { BrandContext } from '@/lib/supabase/types'
import { OnboardingFlow } from '@/components/dashboard/onboarding-flow'
import { BrandPauseToggle } from '@/components/v2/brand-pause-toggle'
import { BrandLiveFeed } from '@/components/dashboard/brand-live-feed'

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

  // Get competitors (active only for counts)
  const { data: allCompetitors } = await supabase
    .from('competitors')
    .select('id, name, is_active')
    .eq('brand_id', brandId)
  
  const competitors = allCompetitors?.filter(c => c.is_active) || []

  // Get active queries for counts
  const { data: queries } = await supabase
    .from('queries')
    .select('id, query_text')
    .eq('brand_id', brandId)
    .eq('is_active', true)

  // Get recent scans for citation score calculation
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  
  const { data: recentScans } = await supabase
    .from('scan_results')
    .select('brand_mentioned, brand_in_citations, citations, query_id')
    .eq('brand_id', brandId)
    .gte('scanned_at', ninetyDaysAgo.toISOString())

  // Get memo count
  const { count: memoCount } = await supabase
    .from('memos')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', brandId)

  // Calculate citation score
  const brandNameLower = brand.name.toLowerCase()
  const brandedQueryIds = new Set(
    (queries || [])
      .filter(q => q.query_text.toLowerCase().includes(brandNameLower))
      .map(q => q.id)
  )
  const unbiasedScans = (recentScans || []).filter(s => !brandedQueryIds.has(s.query_id))
  const scansWithCitations = unbiasedScans.filter(s => s.citations && (s.citations as string[]).length > 0)
  const brandCitedCount = scansWithCitations.filter(s => s.brand_in_citations === true).length
  const citationScore = scansWithCitations.length > 0 
    ? Math.round((brandCitedCount / scansWithCitations.length) * 100)
    : 0

  const context = brand.context as BrandContext
  const hasContext = context && Object.keys(context).length > 0
  
  // Determine onboarding state
  const hasCompletedOnboarding = hasContext && !!competitors?.length && !!queries?.length

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
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-[#0F172A]">{brand.name}</h1>
          {brand.verified && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#10B981] text-white">VERIFIED</span>
          )}
          {brand.is_paused && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white">PAUSED</span>
          )}
          <a 
            href={`/memo/${brand.subdomain}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 hover:text-[#0EA5E9] flex items-center gap-1"
          >
            {brand.subdomain}.contextmemo.com
            <ExternalLink className="h-3 w-3" />
          </a>
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

      {/* Live Feed - Single Terminal View */}
      <BrandLiveFeed
        brandId={brandId}
        brandName={brand.name}
        brandDomain={brand.domain}
        stats={{
          citationScore,
          promptCount: queries?.length || 0,
          memoCount: memoCount || 0,
          scanCount: recentScans?.length || 0,
          entityCount: allCompetitors?.length || 0,
        }}
      />
    </div>
  )
}
