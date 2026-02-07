import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * GET /api/brands/automations
 * Returns all brands with their automation settings in one call
 */
export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get brands the user owns
  const { data: brands } = await serviceClient
    .from('brands')
    .select('id, name, domain, is_paused, last_scan_at, visibility_score')
    .eq('tenant_id', user.id)
    .order('created_at', { ascending: true })

  if (!brands || brands.length === 0) {
    return NextResponse.json({ brands: [] })
  }

  const brandIds = brands.map(b => b.id)

  // Get settings for all brands
  const { data: settings } = await serviceClient
    .from('brand_settings')
    .select('*')
    .in('brand_id', brandIds)

  const settingsMap = new Map((settings || []).map(s => [s.brand_id, s]))

  // Map DB event_types to UI job keys
  const EVENT_TYPE_TO_JOB: Record<string, string> = {
    'scan': 'scan',
    'discovery_scan': 'discovery',
    'enrichment': 'prompt_enrich',
    'prompt_enrichment': 'prompt_enrich',
    'citation_verify': 'citation_verify',
    'citation_loop': 'citation_verify',
    'competitor_content': 'competitor_content',
    'content_generation': 'content_gen',
    'gap_to_content': 'content_gen',
    'prompt_intelligence': 'prompt_intel',
    'topic_universe': 'discovery',
  }

  // Get recent usage costs per brand (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: usageEvents } = await serviceClient
    .from('usage_events')
    .select('brand_id, event_type, total_cost_cents')
    .in('brand_id', brandIds)
    .gte('created_at', sevenDaysAgo.toISOString())

  // Aggregate costs by brand and normalized job key
  const costsByBrand = new Map<string, { total: number; byType: Record<string, number> }>()
  for (const event of usageEvents || []) {
    if (!event.brand_id) continue
    if (!costsByBrand.has(event.brand_id)) {
      costsByBrand.set(event.brand_id, { total: 0, byType: {} })
    }
    const entry = costsByBrand.get(event.brand_id)!
    const cost = Number(event.total_cost_cents) || 0
    entry.total += cost
    // Map event_type to UI job key
    const jobKey = EVENT_TYPE_TO_JOB[event.event_type] || event.event_type
    entry.byType[jobKey] = (entry.byType[jobKey] || 0) + cost
  }

  // Get last run timestamps per brand for key jobs
  const lastRunsByBrand = new Map<string, Record<string, string | null>>()
  for (const brandId of brandIds) {
    const [lastScan, lastDiscovery, lastCompContent, lastVerify] = await Promise.all([
      serviceClient.from('scan_results').select('scanned_at').eq('brand_id', brandId)
        .order('scanned_at', { ascending: false }).limit(1),
      serviceClient.from('alerts').select('created_at').eq('brand_id', brandId)
        .eq('alert_type', 'discovery_complete').order('created_at', { ascending: false }).limit(1),
      serviceClient.from('competitor_content').select('created_at')
        .in('competitor_id', 
          (await serviceClient.from('competitors').select('id').eq('brand_id', brandId)).data?.map(c => c.id) || []
        )
        .order('created_at', { ascending: false }).limit(1),
      serviceClient.from('content_gaps').select('verified_at').eq('brand_id', brandId)
        .not('verified_at', 'is', null).order('verified_at', { ascending: false }).limit(1),
    ])

    lastRunsByBrand.set(brandId, {
      scan: lastScan.data?.[0]?.scanned_at || null,
      discovery: lastDiscovery.data?.[0]?.created_at || null,
      competitor_content: lastCompContent.data?.[0]?.created_at || null,
      citation_verify: lastVerify.data?.[0]?.verified_at || null,
    })
  }

  // Build response
  const result = brands.map(brand => {
    const s = settingsMap.get(brand.id)
    const costs = costsByBrand.get(brand.id) || { total: 0, byType: {} }

    return {
      brand: {
        id: brand.id,
        name: brand.name,
        domain: brand.domain,
        is_paused: brand.is_paused || false,
        last_scan_at: brand.last_scan_at,
        visibility_score: brand.visibility_score,
      },
      settings: s ? {
        // Scans
        auto_scan_enabled: s.auto_scan_enabled ?? true,
        daily_scan_cap: s.daily_scan_cap ?? 100,
        scan_schedule: s.scan_schedule ?? 'daily',
        // Discovery
        weekly_greenspace_enabled: s.weekly_greenspace_enabled ?? false,
        discovery_schedule: s.discovery_schedule ?? 'weekly',
        // Competitor content
        competitor_content_enabled: s.competitor_content_enabled ?? true,
        competitor_content_schedule: s.competitor_content_schedule ?? 'daily',
        // Content generation
        auto_respond_content: s.auto_respond_content ?? false,
        content_generation_schedule: s.content_generation_schedule ?? 'weekdays',
        // Verification
        auto_verify_citations: s.auto_verify_citations ?? true,
        verification_retry_days: s.verification_retry_days ?? 3,
        // Network
        auto_expand_network: s.auto_expand_network ?? false,
        // Prompt workflows
        prompt_enrichment_enabled: s.prompt_enrichment_enabled ?? true,
        prompt_intelligence_enabled: s.prompt_intelligence_enabled ?? true,
        // Memos
        auto_memo_enabled: s.auto_memo_enabled ?? false,
        daily_memo_cap: s.daily_memo_cap ?? 2,
        // Models
        scan_models: s.scan_models ?? null, // null = use global defaults
        // Cost controls
        monthly_credit_cap: s.monthly_credit_cap ?? null,
        pause_at_cap: s.pause_at_cap ?? true,
      } : null,
      costs7d: {
        totalCents: costs.total,
        totalDollars: (costs.total / 100).toFixed(2),
        projectedMonthlyCents: Math.round(costs.total * (30 / 7)),
        projectedMonthlyDollars: ((costs.total * (30 / 7)) / 100).toFixed(2),
        byType: costs.byType,
      },
      lastRuns: lastRunsByBrand.get(brand.id) || {},
    }
  })

  return NextResponse.json({ brands: result })
}

/**
 * PATCH /api/brands/automations
 * Update settings for a specific brand
 * Body: { brandId: string, settings: Partial<BrandSettings> }
 */
export async function PATCH(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json()
  const { brandId, settings } = body

  if (!brandId || !settings) {
    return NextResponse.json({ error: 'brandId and settings are required' }, { status: 400 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify brand ownership
  const { data: brand } = await serviceClient
    .from('brands')
    .select('id, tenant_id')
    .eq('id', brandId)
    .eq('tenant_id', user.id)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found or not authorized' }, { status: 404 })
  }

  // Allowlist of updatable fields
  const allowedFields = [
    'auto_scan_enabled', 'daily_scan_cap', 'scan_schedule', 'scan_models',
    'weekly_greenspace_enabled', 'discovery_schedule',
    'competitor_content_enabled', 'competitor_content_schedule',
    'auto_respond_content', 'content_generation_schedule',
    'auto_verify_citations', 'verification_retry_days',
    'auto_expand_network', 'max_competitors_to_expand',
    'prompt_enrichment_enabled', 'prompt_intelligence_enabled',
    'auto_memo_enabled', 'daily_memo_cap',
    'monthly_credit_cap', 'pause_at_cap',
  ]

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowedFields) {
    if (key in settings) {
      updateData[key] = settings[key]
    }
  }

  const { error } = await serviceClient
    .from('brand_settings')
    .update(updateData)
    .eq('brand_id', brandId)

  if (error) {
    console.error('Failed to update brand settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }

  // Also update is_paused on brands table if provided
  if ('is_paused' in settings) {
    await serviceClient
      .from('brands')
      .update({ is_paused: settings.is_paused, updated_at: new Date().toISOString() })
      .eq('id', brandId)
  }

  return NextResponse.json({ success: true })
}
