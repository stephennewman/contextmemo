import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExternalLink } from 'lucide-react'
import { BrandContext } from '@/lib/supabase/types'
import { ScanButton } from '@/components/dashboard/brand-actions'
import { OnboardingFlow } from '@/components/dashboard/onboarding-flow'
import { ExportDropdown } from '@/components/dashboard/export-dropdown'
import { BrandTabs } from '@/components/dashboard/brand-tabs'

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

  // Load brand and essential data in parallel (only what's needed for profile tab)
  const [brandResult, competitorsResult, queriesCountResult, scansCountResult] = await Promise.all([
    supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single(),
    supabase
      .from('competitors')
      .select('id, name, domain, is_active')
      .eq('brand_id', brandId),
    supabase
      .from('queries')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('is_active', true),
    supabase
      .from('scan_results')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId)
  ])

  const brand = brandResult.data
  if (brandResult.error || !brand) {
    notFound()
  }

  const allCompetitors = competitorsResult.data || []
  const activeCompetitors = allCompetitors.filter(c => c.is_active)
  const queryCount = queriesCountResult.count || 0
  const scanCount = scansCountResult.count || 0

  const context = brand.context as BrandContext
  const hasContext = context && Object.keys(context).length > 0
  
  // Determine onboarding state
  const hasCompletedOnboarding = hasContext && activeCompetitors.length > 0 && queryCount > 0
  const hasAnyScans = scanCount > 0

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
          hasCompetitors={activeCompetitors.length > 0}
          hasQueries={queryCount > 0}
          competitorCount={activeCompetitors.length}
          queryCount={queryCount}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <ScanButton brandId={brandId} />
        </div>
      </div>

      {/* Ready to scan prompt if no scans yet */}
      {!hasAnyScans && (
        <div className="p-6 border-[3px] border-[#0EA5E9] bg-[#F0F9FF]" style={{ borderLeft: '8px solid #0EA5E9' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#0F172A] mb-1">Ready to scan!</h3>
              <p className="text-sm text-zinc-600">
                Setup complete. Run your first scan to see how visible {brand.name} is across AI assistants.
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                {queryCount} prompts • {activeCompetitors.length} competitors • 6 AI models
              </p>
            </div>
            <ScanButton brandId={brandId} />
          </div>
        </div>
      )}

      {/* Main Content - Tabs with lazy loading */}
      <BrandTabs
        brandId={brandId}
        brandName={brand.name}
        brandDomain={brand.domain}
        brandSubdomain={brand.subdomain}
        context={context}
        contextExtractedAt={brand.context_extracted_at}
        hasContext={hasContext}
        competitors={allCompetitors}
      />
    </div>
  )
}
