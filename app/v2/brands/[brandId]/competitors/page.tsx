import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft,
  Plus,
  Users,
  Scale,
} from 'lucide-react'
import { CompetitorsListClient } from './competitors-list-client'
import { CompetitorsPageClient } from './competitors-page-client'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function V2CompetitorsPage({ params }: Props) {
  const { brandId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get brand
  const { data: brand, error } = await serviceClient
    .from('brands')
    .select('id, name')
    .eq('id', brandId)
    .single()

  if (error || !brand) {
    notFound()
  }

  // Get ALL competitors for this brand (both tracked and discovered)
  const { data: allCompetitors } = await serviceClient
    .from('competitors')
    .select('*')
    .eq('brand_id', brandId)
    .order('is_active', { ascending: false }) // Tracked first
    .order('context->citation_count', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  // Separate tracked and discovered
  const trackedCompetitors = allCompetitors?.filter(c => c.is_active) || []
  const discoveredCompetitors = allCompetitors?.filter(c => !c.is_active && c.auto_discovered) || []

  // Get citation counts per competitor domain from scan_results
  // This shows how many times each competitor's domain was cited
  const competitorDomains = (allCompetitors || [])
    .filter(c => c.domain)
    .map(c => ({ id: c.id, domain: c.domain!.toLowerCase() }))
  
  // Query scan_results to count citations per competitor domain
  const { data: scanResults } = await serviceClient
    .from('scan_results')
    .select('citations')
    .eq('brand_id', brandId)
    .not('citations', 'is', null)
  
  // Collect citations per competitor (with full URLs)
  const citationsByCompetitor: Record<string, string[]> = {}
  for (const scan of (scanResults || [])) {
    if (!scan.citations) continue
    for (const citation of scan.citations) {
      try {
        const url = new URL(citation)
        const domain = url.hostname.replace('www.', '').toLowerCase()
        // Find matching competitor
        const competitor = competitorDomains.find(c => domain.includes(c.domain) || c.domain.includes(domain))
        if (competitor) {
          if (!citationsByCompetitor[competitor.id]) {
            citationsByCompetitor[competitor.id] = []
          }
          // Add unique URLs only
          if (!citationsByCompetitor[competitor.id].includes(citation)) {
            citationsByCompetitor[competitor.id].push(citation)
          }
        }
      } catch {
        // Invalid URL
      }
    }
  }
  
  // Count citations per competitor
  const citationCountsByCompetitor: Record<string, number> = {}
  for (const [id, urls] of Object.entries(citationsByCompetitor)) {
    citationCountsByCompetitor[id] = urls.length
  }

  return (
    <CompetitorsPageClient
      brandId={brandId}
      brandName={brand.name}
      trackedCompetitors={trackedCompetitors}
      discoveredCompetitors={discoveredCompetitors}
      citationCounts={citationCountsByCompetitor}
      citationUrls={citationsByCompetitor}
    />
  )
}
