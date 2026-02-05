import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Get usage breakdown from our database
 * Shows what we've tracked (scan-run mainly) vs what might be untracked
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '7')
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  // Get tenant (tenant.id IS the user.id)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
  }

  // Get all usage events in period
  const { data: usageEvents, error: usageError } = await supabase
    .from('usage_events')
    .select('*')
    .eq('tenant_id', tenant.id)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false })

  if (usageError) {
    console.error('Failed to fetch usage events:', usageError)
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }

  // Aggregate by event_type
  const byEventType: Record<string, {
    count: number
    totalCostCents: number
    inputTokens: number
    outputTokens: number
  }> = {}

  // Aggregate by model
  const byModel: Record<string, {
    count: number
    totalCostCents: number
    inputTokens: number
    outputTokens: number
  }> = {}

  // Aggregate by brand
  const byBrand: Record<string, {
    brandId: string
    count: number
    totalCostCents: number
  }> = {}

  // Aggregate by day
  const byDay: Record<string, {
    count: number
    totalCostCents: number
  }> = {}

  let totalCostCents = 0
  let totalCalls = 0

  for (const event of usageEvents || []) {
    totalCalls++
    totalCostCents += event.total_cost_cents || 0

    // By event type
    const eventType = event.event_type || 'unknown'
    if (!byEventType[eventType]) {
      byEventType[eventType] = { count: 0, totalCostCents: 0, inputTokens: 0, outputTokens: 0 }
    }
    byEventType[eventType].count++
    byEventType[eventType].totalCostCents += event.total_cost_cents || 0
    byEventType[eventType].inputTokens += event.input_tokens || 0
    byEventType[eventType].outputTokens += event.output_tokens || 0

    // By model
    const model = event.model || 'unknown'
    if (!byModel[model]) {
      byModel[model] = { count: 0, totalCostCents: 0, inputTokens: 0, outputTokens: 0 }
    }
    byModel[model].count++
    byModel[model].totalCostCents += event.total_cost_cents || 0
    byModel[model].inputTokens += event.input_tokens || 0
    byModel[model].outputTokens += event.output_tokens || 0

    // By brand
    const brandId = event.brand_id || 'unknown'
    if (!byBrand[brandId]) {
      byBrand[brandId] = { brandId, count: 0, totalCostCents: 0 }
    }
    byBrand[brandId].count++
    byBrand[brandId].totalCostCents += event.total_cost_cents || 0

    // By day
    const day = new Date(event.created_at).toISOString().split('T')[0]
    if (!byDay[day]) {
      byDay[day] = { count: 0, totalCostCents: 0 }
    }
    byDay[day].count++
    byDay[day].totalCostCents += event.total_cost_cents || 0
  }

  // Get brand names
  const brandIds = Object.keys(byBrand).filter(id => id !== 'unknown')
  let brandNames: Record<string, string> = {}
  if (brandIds.length > 0) {
    const { data: brands } = await supabase
      .from('brands')
      .select('id, name')
      .in('id', brandIds)
    
    brandNames = (brands || []).reduce((acc, b) => ({ ...acc, [b.id]: b.name }), {})
  }

  // Get recent scans count (to estimate untracked usage)
  const { count: scanResultsCount } = await supabase
    .from('scan_results')
    .select('id', { count: 'exact', head: true })
    .gte('scanned_at', cutoffDate.toISOString())

  // Get recent alerts to see what jobs ran
  const { data: recentAlerts } = await supabase
    .from('alerts')
    .select('alert_type, title, message, data, created_at, brand_id')
    .in('alert_type', [
      'scan_complete',
      'discovery_complete', 
      'lab_complete',
      'citation_loop_complete',
      'enrichment_complete',
      'memo_created',
    ])
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(100)

  // Summarize job activity from alerts
  const jobSummary: Record<string, { count: number; lastRun: string }> = {}
  for (const alert of recentAlerts || []) {
    const type = alert.alert_type
    if (!jobSummary[type]) {
      jobSummary[type] = { count: 0, lastRun: alert.created_at }
    }
    jobSummary[type].count++
  }

  // Get lab runs (these can have significant cost)
  const { data: labRuns } = await supabase
    .from('prompt_lab_runs')
    .select('id, status, stats, created_at, completed_at, brand_id')
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false })

  const labCostCents = (labRuns || []).reduce((sum, run) => {
    const stats = run.stats as { totalCostCents?: number } | null
    return sum + (stats?.totalCostCents || 0)
  }, 0)

  return NextResponse.json({
    period: { days },
    
    // What we've logged to usage_events
    tracked: {
      totalCostCents,
      totalCostDollars: totalCostCents / 100,
      totalCalls,
      
      byEventType: Object.entries(byEventType)
        .map(([type, data]) => ({ type, ...data, costDollars: data.totalCostCents / 100 }))
        .sort((a, b) => b.totalCostCents - a.totalCostCents),
      
      byModel: Object.entries(byModel)
        .map(([model, data]) => ({ model, ...data, costDollars: data.totalCostCents / 100 }))
        .sort((a, b) => b.totalCostCents - a.totalCostCents),
      
      byBrand: Object.entries(byBrand)
        .map(([id, data]) => ({ ...data, brandName: brandNames[id] || 'Unknown', costDollars: data.totalCostCents / 100 }))
        .sort((a, b) => b.totalCostCents - a.totalCostCents),
      
      byDay: Object.entries(byDay)
        .map(([date, data]) => ({ date, ...data, costDollars: data.totalCostCents / 100 }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    },
    
    // Evidence of untracked activity
    untracked: {
      scanResultsCount: scanResultsCount || 0,
      trackedEventCount: totalCalls,
      // If scan_results > tracked events, there's a gap
      potentialGap: (scanResultsCount || 0) - totalCalls,
      
      // Lab runs may not be fully tracked
      labRuns: (labRuns || []).map(run => ({
        id: run.id,
        status: run.status,
        costCents: (run.stats as { totalCostCents?: number } | null)?.totalCostCents || 0,
        costDollars: ((run.stats as { totalCostCents?: number } | null)?.totalCostCents || 0) / 100,
        promptsRun: (run.stats as { promptsRun?: number } | null)?.promptsRun || 0,
        createdAt: run.created_at,
      })),
      labTotalCostCents: labCostCents,
      labTotalCostDollars: labCostCents / 100,
    },
    
    // Job activity (from alerts)
    jobActivity: jobSummary,
    
    // Recent alerts for context
    recentAlerts: (recentAlerts || []).slice(0, 20).map(a => ({
      type: a.alert_type,
      title: a.title,
      createdAt: a.created_at,
      data: a.data,
    })),
  })
}
