import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExternalLink, AlertTriangle } from 'lucide-react'
import { BrandPauseToggle } from '@/components/v2/brand-pause-toggle'
import { BrandLogo } from '@/components/dashboard/brand-logo'
import { ScanButton } from '@/components/dashboard/brand-actions'
import { OnboardingFlow, TerminalWidget } from '@/components/dashboard/onboarding-flow'
import { ActivityBell } from '@/components/dashboard/activity-bell'
import { BrandContext } from '@/lib/supabase/types'
import { BrandTabNav } from './brand-tab-nav'

interface Props {
  params: Promise<{ brandId: string }>
  children: React.ReactNode
}

export default async function BrandLayout({ params, children }: Props) {
  const { brandId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch brand + lightweight counts in parallel
  // Get the date 90 days ago for citation counting
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [
    { data: brand, error },
    { count: queryCount },
    { count: memoCount },
    { count: entityCount },
    { data: citationCountData },
  ] = await Promise.all([
    supabase
      .from('brands')
      .select('id, name, domain, subdomain, custom_domain, domain_verified, verified, is_paused, last_scan_at, context')
      .eq('id', brandId)
      .single(),
    supabase
      .from('queries')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)
      .eq('is_active', true),
    supabase
      .from('memos')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId),
    supabase
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId),
    // Count total citations (scans that have any citations) for the tab badge
    supabase
      .from('scan_results')
      .select('citations')
      .eq('brand_id', brandId)
      .gte('scanned_at', ninetyDaysAgo.toISOString())
      .not('citations', 'is', null),
  ])

  // Count total unique citation URLs
  const citationUrls = new Set<string>()
  if (citationCountData) {
    for (const scan of citationCountData) {
      if (Array.isArray(scan.citations)) {
        for (const url of scan.citations) {
          citationUrls.add(url as string)
        }
      }
    }
  }
  const citationCount = citationUrls.size

  if (error || !brand) {
    notFound()
  }

  const context = brand.context as BrandContext
  // Check for actual extracted context (not just the search_console config set at creation)
  const hasContext = context && !!(context.company_name || context.description || context.products?.length)

  // Check for queries to determine onboarding state (competitors come later from scan results)
  const hasCompletedOnboarding = hasContext && (queryCount ?? 0) > 0

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
                href={brand.custom_domain && brand.domain_verified ? `https://${brand.custom_domain}` : `/memo/${brand.subdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-500 hover:text-[#0EA5E9] flex items-center gap-1 font-medium"
              >
                {brand.custom_domain && brand.domain_verified ? brand.custom_domain : `${brand.subdomain}.contextmemo.com`}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <BrandPauseToggle brandId={brandId} initialPaused={brand.is_paused || false} lastScanAt={brand.last_scan_at} />
        </div>

        <OnboardingFlow
          brandId={brandId}
          brandName={brand.name}
          brandDomain={brand.domain}
          hasContext={hasContext}
          hasQueries={(queryCount ?? 0) > 0}
          queryCount={queryCount ?? 0}
        />
      </div>
    )
  }

  // Check if any scans exist (lightweight)
  const { count: scanCount } = await supabase
    .from('scan_results')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .limit(1)

  const hasAnyScans = (scanCount ?? 0) > 0

  const tabs = [
    { slug: 'profile', label: 'PROFILE' },
    { slug: 'prompts', label: 'PROMPTS', count: queryCount },
    { slug: 'memos', label: 'MEMOS', count: memoCount },
    { slug: 'entities', label: 'ENTITIES', count: entityCount },
    { slug: 'citations', label: 'CITATIONS', count: citationCount || null },
    { slug: 'traffic', label: 'TRAFFIC' },
    { slug: 'performance', label: 'PERFORMANCE' },
    { slug: 'research', label: 'RESEARCH' },
    { slug: 'settings', label: 'SETTINGS' },
  ]

  return (
    <div className="space-y-6">
      {/* Brand Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo domain={brand.domain} name={brand.name} size={40} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">{brand.name.toUpperCase()}</h1>
            <div className="flex items-center gap-2 mt-0.5">
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
                href={brand.custom_domain && brand.domain_verified ? `https://${brand.custom_domain}` : `/memo/${brand.subdomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-500 hover:text-[#0EA5E9] flex items-center gap-1 font-medium"
              >
                {brand.custom_domain && brand.domain_verified ? brand.custom_domain : `${brand.subdomain}.contextmemo.com`}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ActivityBell brandId={brandId} brandName={brand.name} />
          <BrandPauseToggle brandId={brandId} initialPaused={brand.is_paused || false} lastScanAt={brand.last_scan_at} />
        </div>
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

      {/* No scans CTA */}
      {!hasAnyScans && (
        <div className="p-4 border-[3px] border-[#0EA5E9] bg-[#F0F9FF]" style={{ borderLeft: '8px solid #0EA5E9' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#0F172A] mb-1">Ready to scan!</h3>
              <p className="text-sm text-zinc-600">
                Run your first scan to see how visible {brand.name} is across AI assistants.
              </p>
            </div>
            <div className="flex gap-2">
              <ScanButton brandId={brandId} brandName={brand.name} />
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <BrandTabNav brandId={brandId} tabs={tabs} />

      {/* Tab Content */}
      <div>{children}</div>

      {/* Persistent Terminal Widget */}
      <TerminalWidget brandId={brandId} brandName={brand.name} />
    </div>
  )
}
