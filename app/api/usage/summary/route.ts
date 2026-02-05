import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Quick usage summary - shows what's tracked vs what might be missing
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const hours = parseInt(searchParams.get('hours') || '24')
  const cutoffDate = new Date()
  cutoffDate.setTime(cutoffDate.getTime() - (hours * 60 * 60 * 1000))

  // Get tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
  }

  // Get all brands for this tenant
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .eq('tenant_id', tenant.id)

  const brandIds = (brands || []).map(b => b.id)
  const brandMap = new Map((brands || []).map(b => [b.id, b.name]))

  // Query multiple data sources in parallel
  const [
    usageEventsResult,
    scanResultsResult,
    alertsResult,
    labRunsResult,
    feedEventsResult,
  ] = await Promise.all([
    // Tracked usage events
    supabase
      .from('usage_events')
      .select('model, event_type, total_cost_cents, brand_id, created_at')
      .eq('tenant_id', tenant.id)
      .gte('created_at', cutoffDate.toISOString()),
    
    // All scan results (might not all be tracked)
    supabase
      .from('scan_results')
      .select('model, brand_id, scanned_at')
      .in('brand_id', brandIds)
      .gte('scanned_at', cutoffDate.toISOString()),
    
    // Alerts showing job completions
    supabase
      .from('alerts')
      .select('alert_type, data, brand_id, created_at')
      .in('brand_id', brandIds)
      .gte('created_at', cutoffDate.toISOString()),
    
    // Lab runs (separate cost tracking)
    supabase
      .from('prompt_lab_runs')
      .select('id, status, stats, brand_id, created_at')
      .in('brand_id', brandIds)
      .gte('created_at', cutoffDate.toISOString()),
    
    // Feed events (can indicate job activity)
    supabase
      .from('feed_events')
      .select('event_type, workflow, brand_id, created_at')
      .in('brand_id', brandIds)
      .gte('created_at', cutoffDate.toISOString()),
  ])

  const usageEvents = usageEventsResult.data || []
  const scanResults = scanResultsResult.data || []
  const alerts = alertsResult.data || []
  const labRuns = labRunsResult.data || []
  const feedEvents = feedEventsResult.data || []

  // Calculate tracked cost
  const trackedCostCents = usageEvents.reduce((sum, e) => sum + (e.total_cost_cents || 0), 0)

  // Calculate lab costs
  const labCostCents = labRuns.reduce((sum, run) => {
    const stats = run.stats as { totalCostCents?: number } | null
    return sum + (stats?.totalCostCents || 0)
  }, 0)

  // Group scan results by model
  const scansByModel: Record<string, number> = {}
  for (const scan of scanResults) {
    scansByModel[scan.model] = (scansByModel[scan.model] || 0) + 1
  }

  // Group alerts by type
  const alertsByType: Record<string, number> = {}
  for (const alert of alerts) {
    alertsByType[alert.alert_type] = (alertsByType[alert.alert_type] || 0) + 1
  }

  // Group feed events by type
  const feedByType: Record<string, number> = {}
  for (const event of feedEvents) {
    feedByType[event.event_type] = (feedByType[event.event_type] || 0) + 1
  }

  // Estimate untracked usage
  // Known functions that use OpenRouter but don't always track:
  // - discovery-scan: ~75 queries per run with GPT-4o + GPT-4o-mini
  // - citation-loop: ~10-20 calls per competitor analyzed
  // - prompt-enrich: ~2 calls per run
  // - gap-to-content: ~1 call per gap

  const discoveryScans = alertsByType['discovery_complete'] || 0
  const citationLoops = alertsByType['citation_loop_complete'] || 0
  const enrichments = alertsByType['enrichment_complete'] || 0

  // Rough cost estimates (in cents) for untracked functions
  const estimatedUntrackedCents = {
    // Discovery scan: ~75 queries x 2 models x $0.01 avg = ~$1.50 per run
    discovery: discoveryScans * 150,
    // Citation loop: ~5 competitors x 4 queries x 3 calls = ~60 calls x $0.01 = ~$0.60 per run
    citationLoop: citationLoops * 60,
    // Prompt enrich: ~2 calls x $0.01 = ~$0.02 per run
    enrichment: enrichments * 2,
  }

  const totalEstimatedUntrackedCents = 
    estimatedUntrackedCents.discovery + 
    estimatedUntrackedCents.citationLoop + 
    estimatedUntrackedCents.enrichment

  return NextResponse.json({
    period: {
      hours,
      since: cutoffDate.toISOString(),
    },
    
    summary: {
      // What we've tracked
      trackedCostCents,
      trackedCostDollars: (trackedCostCents / 100).toFixed(2),
      trackedApiCalls: usageEvents.length,
      
      // Lab runs (tracked separately)
      labCostCents,
      labCostDollars: (labCostCents / 100).toFixed(2),
      labRuns: labRuns.length,
      
      // Total tracked
      totalTrackedCents: trackedCostCents + labCostCents,
      totalTrackedDollars: ((trackedCostCents + labCostCents) / 100).toFixed(2),
      
      // Estimated untracked
      estimatedUntrackedCents: totalEstimatedUntrackedCents,
      estimatedUntrackedDollars: (totalEstimatedUntrackedCents / 100).toFixed(2),
      
      // Total estimated
      totalEstimatedCents: trackedCostCents + labCostCents + totalEstimatedUntrackedCents,
      totalEstimatedDollars: ((trackedCostCents + labCostCents + totalEstimatedUntrackedCents) / 100).toFixed(2),
    },
    
    activity: {
      scanResults: scanResults.length,
      scansByModel,
      alertsByType,
      feedEventsByType: feedByType,
    },
    
    untrackedEstimates: {
      discoveryScansRun: discoveryScans,
      discoveryEstimatedCents: estimatedUntrackedCents.discovery,
      citationLoopsRun: citationLoops,
      citationLoopEstimatedCents: estimatedUntrackedCents.citationLoop,
      enrichmentsRun: enrichments,
      enrichmentEstimatedCents: estimatedUntrackedCents.enrichment,
    },
    
    details: {
      labRuns: labRuns.map(run => ({
        id: run.id,
        status: run.status,
        brand: brandMap.get(run.brand_id) || 'Unknown',
        costCents: (run.stats as { totalCostCents?: number } | null)?.totalCostCents || 0,
        promptsRun: (run.stats as { promptsRun?: number } | null)?.promptsRun || 0,
        createdAt: run.created_at,
      })),
    },
    
    warning: totalEstimatedUntrackedCents > 0 
      ? `Estimated $${(totalEstimatedUntrackedCents / 100).toFixed(2)} in untracked OpenRouter usage from: discovery scans, citation loops, and enrichment jobs.`
      : null,
  })
}
