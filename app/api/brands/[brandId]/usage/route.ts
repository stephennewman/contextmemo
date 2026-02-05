import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Get detailed usage breakdown for a specific brand
 * Shows all costs attributed to this brand
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  // Verify user owns this brand
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, name, tenant_id')
    .eq('id', brandId)
    .single()

  if (brandError || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  // Get usage events for this brand
  const { data: usageEvents, error: usageError } = await supabase
    .from('usage_events')
    .select('*')
    .eq('brand_id', brandId)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false })

  if (usageError) {
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }

  // Aggregate by event type
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
  }> = {}

  // Aggregate by day
  const byDay: Record<string, {
    count: number
    totalCostCents: number
  }> = {}

  let totalCostCents = 0
  let totalCalls = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (const event of usageEvents || []) {
    totalCalls++
    totalCostCents += event.total_cost_cents || 0
    totalInputTokens += event.input_tokens || 0
    totalOutputTokens += event.output_tokens || 0

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
      byModel[model] = { count: 0, totalCostCents: 0 }
    }
    byModel[model].count++
    byModel[model].totalCostCents += event.total_cost_cents || 0

    // By day
    const day = new Date(event.created_at).toISOString().split('T')[0]
    if (!byDay[day]) {
      byDay[day] = { count: 0, totalCostCents: 0 }
    }
    byDay[day].count++
    byDay[day].totalCostCents += event.total_cost_cents || 0
  }

  // Get lab runs for this brand
  const { data: labRuns } = await supabase
    .from('prompt_lab_runs')
    .select('id, status, stats, created_at')
    .eq('brand_id', brandId)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: false })

  const labCostCents = (labRuns || []).reduce((sum, run) => {
    const stats = run.stats as { totalCostCents?: number } | null
    return sum + (stats?.totalCostCents || 0)
  }, 0)

  // Get query count for this brand
  const { count: queryCount } = await supabase
    .from('queries')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .eq('is_active', true)

  // Get scan count for this brand in period
  const { count: scanCount } = await supabase
    .from('scan_results')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .gte('scanned_at', cutoffDate.toISOString())

  // Calculate margin (5x markup for display to users)
  const MARGIN_MULTIPLIER = 5
  const displayCostCents = (totalCostCents + labCostCents) * MARGIN_MULTIPLIER

  return NextResponse.json({
    brand: {
      id: brand.id,
      name: brand.name,
    },
    period: {
      days,
      since: cutoffDate.toISOString(),
    },
    
    // Raw costs (what we pay)
    actualCost: {
      totalCents: totalCostCents + labCostCents,
      totalDollars: ((totalCostCents + labCostCents) / 100).toFixed(2),
      usageEventsCents: totalCostCents,
      labRunsCents: labCostCents,
    },
    
    // Display costs (what users would pay - 5x margin)
    displayCost: {
      totalCents: displayCostCents,
      totalDollars: (displayCostCents / 100).toFixed(2),
      marginMultiplier: MARGIN_MULTIPLIER,
    },
    
    // Usage stats
    usage: {
      totalCalls,
      totalInputTokens,
      totalOutputTokens,
      queryCount: queryCount || 0,
      scanCount: scanCount || 0,
      labRuns: labRuns?.length || 0,
    },
    
    // Breakdowns
    byEventType: Object.entries(byEventType)
      .map(([type, data]) => ({ 
        type, 
        ...data, 
        actualCostDollars: (data.totalCostCents / 100).toFixed(3),
        displayCostDollars: ((data.totalCostCents * MARGIN_MULTIPLIER) / 100).toFixed(2),
      }))
      .sort((a, b) => b.totalCostCents - a.totalCostCents),
    
    byModel: Object.entries(byModel)
      .map(([model, data]) => ({ 
        model, 
        ...data, 
        actualCostDollars: (data.totalCostCents / 100).toFixed(3),
        displayCostDollars: ((data.totalCostCents * MARGIN_MULTIPLIER) / 100).toFixed(2),
      }))
      .sort((a, b) => b.totalCostCents - a.totalCostCents),
    
    byDay: Object.entries(byDay)
      .map(([date, data]) => ({ 
        date, 
        ...data, 
        actualCostDollars: (data.totalCostCents / 100).toFixed(3),
        displayCostDollars: ((data.totalCostCents * MARGIN_MULTIPLIER) / 100).toFixed(2),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    
    // Recent events (last 20)
    recentEvents: (usageEvents || []).slice(0, 20).map(e => ({
      type: e.event_type,
      model: e.model,
      costCents: e.total_cost_cents,
      tokens: (e.input_tokens || 0) + (e.output_tokens || 0),
      createdAt: e.created_at,
    })),
  })
}
