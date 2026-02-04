import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus } from 'lucide-react'
import { PromptsListClient } from './prompts-list-client'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function V2PromptsPage({ params }: Props) {
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

  // Get prompts/queries for this brand with all tracking fields
  const { data: allPrompts } = await serviceClient
    .from('queries')
    .select('*')
    .eq('brand_id', brandId)
    .order('is_active', { ascending: false })
    .order('citation_streak', { ascending: false })
    .order('created_at', { ascending: false })

  // Get the most recent scan result for each query to get competitor data
  const promptIds = allPrompts?.map(p => p.id) || []
  
  // Fetch latest scan results with competitors and citations for each prompt
  const { data: latestScans } = promptIds.length > 0 ? await serviceClient
    .from('scan_results')
    .select('query_id, competitors_mentioned, brand_position, brand_in_citations, brand_mentioned, citations, search_results, scanned_at')
    .in('query_id', promptIds)
    .order('scanned_at', { ascending: false }) : { data: [] }
  
  // Create a map of query_id -> latest scan data
  const latestScanMap = new Map<string, {
    competitors_mentioned: string[] | null
    brand_position: number | null
    brand_in_citations: boolean | null
    brand_mentioned: boolean | null
    citations: string[] | null
    search_results: Array<{ url: string; title: string; snippet: string; date?: string }> | null
  }>()
  
  // Only keep the most recent scan for each query
  latestScans?.forEach(scan => {
    if (!latestScanMap.has(scan.query_id)) {
      latestScanMap.set(scan.query_id, {
        competitors_mentioned: scan.competitors_mentioned,
        brand_position: scan.brand_position,
        brand_in_citations: scan.brand_in_citations,
        brand_mentioned: scan.brand_mentioned,
        citations: scan.citations,
        search_results: scan.search_results as Array<{ url: string; title: string; snippet: string; date?: string }> | null,
      })
    }
  })
  
  // Enrich prompts with latest scan data
  const enrichedPrompts = allPrompts?.map(p => ({
    ...p,
    latest_competitors: latestScanMap.get(p.id)?.competitors_mentioned || [],
    latest_position: latestScanMap.get(p.id)?.brand_position,
    latest_cited: latestScanMap.get(p.id)?.brand_in_citations,
    latest_mentioned: latestScanMap.get(p.id)?.brand_mentioned,
    latest_citations: latestScanMap.get(p.id)?.citations || [],
    latest_sources: latestScanMap.get(p.id)?.search_results || [],
  })) || []

  // Separate active and excluded prompts
  const activePrompts = enrichedPrompts?.filter(p => p.is_active) || []
  const excludedPrompts = enrichedPrompts?.filter(p => !p.is_active) || []

  // Get all competitors for this brand with their tracking status
  const { data: allCompetitors } = await serviceClient
    .from('competitors')
    .select('id, name, domain, is_active, auto_discovered, description, context, created_at')
    .eq('brand_id', brandId)
    .order('name')

  // Create a map of lowercase competitor name -> competitor data
  const competitorMap: Record<string, {
    id: string
    name: string
    domain: string | null
    is_active: boolean
    auto_discovered: boolean | null
    description: string | null
    context: Record<string, unknown> | null
    created_at: string
  }> = {}
  
  allCompetitors?.forEach(c => {
    competitorMap[c.name.toLowerCase()] = c
  })

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link 
                href={`/v2/brands/${brandId}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-2xl font-bold text-[#0F172A]">Prompts</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {activePrompts.length} active prompts for {brand.name}
              {excludedPrompts.length > 0 && ` • ${excludedPrompts.length} excluded`}
            </p>
          </div>
          
          <Button className="bg-[#0EA5E9] hover:bg-[#0284C7]">
            <Plus className="h-4 w-4 mr-2" />
            Add Prompt
          </Button>
        </div>
        
      </div>
      
      {/* Prompts List - Client Component for interactivity */}
      <PromptsListClient 
        brandId={brandId}
        activePrompts={activePrompts}
        excludedPrompts={excludedPrompts}
        competitorMap={competitorMap}
      />
    </div>
  )
}
