import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { getAllBrandSettings, shouldRunOnSchedule, type BrandAutomationSettings } from '@/lib/utils/brand-settings'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Helper to check if a date is older than X days
function isOlderThanDays(date: string | null, days: number): boolean {
  if (!date) return true
  const then = new Date(date)
  const now = new Date()
  const diffDays = (now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays >= days
}

/**
 * Daily Scheduler - Runs every day at 6 AM ET
 * Comprehensive automation that:
 * 1. Refreshes brand context (weekly)
 * 2. Discovers new competitors (weekly)
 * 3. Generates new queries (weekly)
 * 4. Runs AI scans (daily)
 * 5. Tracks visibility trends over time
 * 6. Auto-generates memos for gaps
 */
export const dailyRun = inngest.createFunction(
  { 
    id: 'daily-run', 
    name: 'Daily Automation Run',
  },
  { cron: '0 11 * * *' }, // 6 AM ET = 11 AM UTC
  async ({ step }) => {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Step 1: Get all active brands (excluding paused ones)
    const brands = await step.run('get-active-brands', async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, domain, context_extracted_at, created_at, updated_at, is_paused')
        .or('is_paused.is.null,is_paused.eq.false') // Only get non-paused brands
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to get brands:', error)
        return []
      }

      console.log(`[Daily Run] Found ${data?.length || 0} active brands (paused brands excluded)`)
      return data || []
    })

    if (brands.length === 0) {
      return { success: true, message: 'No brands to process', brandsProcessed: 0 }
    }

    // Step 1b: Load brand automation settings for all brands
    const allSettings = await step.run('load-brand-settings', async () => {
      const brandIds = brands.map(b => b.id)
      const settingsMap = await getAllBrandSettings(brandIds)
      // Convert Map to serializable object for step return
      const result: Record<string, BrandAutomationSettings> = {}
      for (const [id, settings] of settingsMap) {
        result[id] = settings
      }
      return result
    })

    // Step 2: Categorize brands by what they need (respecting per-brand settings)
    const brandTasks = await step.run('categorize-brands', async () => {
      const tasks: Array<{
        brandId: string
        brandName: string
        needsContextRefresh: boolean
        needsCompetitorDiscovery: boolean
        needsQueryGeneration: boolean
        needsScan: boolean
        needsDiscoveryScan: boolean
        needsCompetitorContent: boolean
        isNewBrand: boolean
        settings: BrandAutomationSettings
      }> = []

      for (const brand of brands) {
        const settings = allSettings[brand.id]
        const isNew = !brand.context_extracted_at

        // Get last competitor discovery, query generation, scan, and discovery scan times
        const [competitorsResult, queriesResult, lastScanResult, lastDiscoveryScanResult, lastCompContentResult] = await Promise.all([
          supabase
            .from('competitors')
            .select('created_at')
            .eq('brand_id', brand.id)
            .order('created_at', { ascending: false })
            .limit(1),
          supabase
            .from('queries')
            .select('created_at')
            .eq('brand_id', brand.id)
            .eq('auto_discovered', true)
            .order('created_at', { ascending: false })
            .limit(1),
          supabase
            .from('scan_results')
            .select('scanned_at')
            .eq('brand_id', brand.id)
            .order('scanned_at', { ascending: false })
            .limit(1),
          supabase
            .from('alerts')
            .select('created_at')
            .eq('brand_id', brand.id)
            .eq('alert_type', 'discovery_complete')
            .order('created_at', { ascending: false })
            .limit(1),
          supabase
            .from('alerts')
            .select('created_at')
            .eq('brand_id', brand.id)
            .eq('alert_type', 'competitor_content_scan')
            .order('created_at', { ascending: false })
            .limit(1),
        ])

        const lastCompetitorDiscovery = competitorsResult.data?.[0]?.created_at
        const lastQueryGeneration = queriesResult.data?.[0]?.created_at
        const lastScan = lastScanResult.data?.[0]?.scanned_at
        const lastDiscoveryScan = lastDiscoveryScanResult.data?.[0]?.created_at
        const lastCompContent = lastCompContentResult.data?.[0]?.created_at

        // Use per-brand settings for scan scheduling
        const scanEnabled = settings.auto_scan_enabled
        const scanShouldRun = scanEnabled && shouldRunOnSchedule(settings.scan_schedule, lastScan)

        // Discovery scan respects per-brand schedule
        const discoveryShouldRun = settings.weekly_greenspace_enabled && 
          shouldRunOnSchedule(settings.discovery_schedule, lastDiscoveryScan)

        // Competitor content respects per-brand schedule
        const compContentShouldRun = settings.competitor_content_enabled &&
          shouldRunOnSchedule(settings.competitor_content_schedule, lastCompContent)

        tasks.push({
          brandId: brand.id,
          brandName: brand.name,
          isNewBrand: isNew,
          settings,
          // Refresh context weekly (every 7 days) or if never done
          needsContextRefresh: isOlderThanDays(brand.context_extracted_at, 7),
          // Discover competitors weekly or if never done (only if network expansion enabled)
          needsCompetitorDiscovery: settings.auto_expand_network && isOlderThanDays(lastCompetitorDiscovery, 7),
          // Generate new queries weekly or if never done
          needsQueryGeneration: isOlderThanDays(lastQueryGeneration, 7),
          // Scan based on per-brand schedule
          needsScan: scanShouldRun,
          // Discovery scan based on per-brand schedule
          needsDiscoveryScan: discoveryShouldRun,
          // Competitor content based on per-brand schedule
          needsCompetitorContent: compContentShouldRun,
        })
      }

      console.log(`[Daily Run] Brand settings summary:`, tasks.map(t => ({
        brand: t.brandName,
        scan: t.needsScan ? `yes (${t.settings.scan_schedule})` : 'skip',
        discovery: t.needsDiscoveryScan ? `yes (${t.settings.discovery_schedule})` : 'skip',
        compContent: t.needsCompetitorContent ? `yes (${t.settings.competitor_content_schedule})` : 'skip',
      })))

      return tasks
    })

    // Step 3: Process brands that need full refresh (context → competitors → queries → scan)
    const fullRefreshBrands = brandTasks.filter(b => b.needsContextRefresh || b.isNewBrand)
    
    if (fullRefreshBrands.length > 0) {
      await step.run('trigger-full-refresh', async () => {
        const events = fullRefreshBrands.map(brand => ({
          name: 'daily/brand-full-refresh' as const,
          data: { brandId: brand.brandId },
        }))
        await inngest.send(events)
        return events.length
      })
    }

    // Step 4: Process brands that just need competitor/query updates
    const updateBrands = brandTasks.filter(b => 
      !b.needsContextRefresh && 
      !b.isNewBrand && 
      (b.needsCompetitorDiscovery || b.needsQueryGeneration)
    )

    if (updateBrands.length > 0) {
      await step.run('trigger-updates', async () => {
        const events = updateBrands.map(brand => ({
          name: 'daily/brand-update' as const,
          data: { 
            brandId: brand.brandId,
            discoverCompetitors: brand.needsCompetitorDiscovery,
            generateQueries: brand.needsQueryGeneration,
          },
        }))
        await inngest.send(events)
        return events.length
      })
    }

    // Step 5: Process brands that just need a scan (respects per-brand scan_schedule)
    const scanOnlyBrands = brandTasks.filter(b => 
      !b.needsContextRefresh && 
      !b.isNewBrand && 
      !b.needsCompetitorDiscovery && 
      !b.needsQueryGeneration && 
      b.needsScan
    )

    if (scanOnlyBrands.length > 0) {
      await step.run('trigger-scans', async () => {
        const events = scanOnlyBrands.map(brand => ({
          name: 'daily/brand-scan' as const,
          data: { brandId: brand.brandId },
        }))
        await inngest.send(events)
        console.log(`[Daily Run] Scan triggered for ${events.length} brands (${scanOnlyBrands.map(b => `${b.brandName}:${b.settings.scan_schedule}`).join(', ')})`)
        return events.length
      })
    }

    // Step 6: Trigger competitor content scanning (only for brands with it enabled + on schedule)
    const compContentBrands = brandTasks.filter(b => b.needsCompetitorContent && !b.isNewBrand && !b.needsContextRefresh)
    
    if (compContentBrands.length > 0) {
      await step.run('trigger-competitor-content-scan', async () => {
        const events = compContentBrands.map(brand => ({
          name: 'competitor/content-scan' as const,
          data: { brandId: brand.brandId },
        }))
        await inngest.send(events)
        console.log(`[Daily Run] Competitor content scan triggered for ${events.length} brands (${compContentBrands.map(b => b.brandName).join(', ')})`)
        return events.length
      })
    }

    // Step 6b: Trigger discovery scans (respects per-brand schedule)
    const discoveryBrands = brandTasks.filter(b => 
      b.needsDiscoveryScan && 
      !b.isNewBrand &&
      !b.needsContextRefresh
    )

    if (discoveryBrands.length > 0) {
      await step.run('trigger-discovery-scans', async () => {
        const events = discoveryBrands.map(brand => ({
          name: 'discovery/scan' as const,
          data: { brandId: brand.brandId },
        }))
        await inngest.send(events)
        console.log(`[Daily Run] Discovery scan triggered for ${events.length} brands (${discoveryBrands.map(b => b.brandName).join(', ')})`)
        return events.length
      })
    }

    // Step 6c: Trigger Google AI Overview scans (DISABLED)
    // Set ENABLE_AI_OVERVIEW_SCANS=true to re-enable
    // Previously: Only runs on specific days to conserve API quota (100 free/month)
    // Runs on Mondays and Thursdays for twice-weekly coverage
    const enableAIOverviews = process.env.ENABLE_AI_OVERVIEW_SCANS === 'true'
    if (enableAIOverviews && process.env.SERPAPI_KEY && (dayOfWeek === 1 || dayOfWeek === 4)) {
      await step.run('trigger-ai-overview-scans', async () => {
        // Only scan top 10 queries per brand to conserve quota
        const events = brands.map(brand => ({
          name: 'ai-overview/scan' as const,
          data: { brandId: brand.id, maxQueries: 10 },
        }))
        await inngest.send(events)
        return events.length
      })
    }

    // Step 7: Verify content gaps that have matured (24+ hours since publish)
    // Only for brands with citation verification enabled
    const verifyBrands = brandTasks.filter(b => b.settings.auto_verify_citations)
    
    if (verifyBrands.length > 0) {
      await step.run('trigger-gap-verification', async () => {
        const events = verifyBrands.map(brand => ({
          name: 'gap/verify-all' as const,
          data: { brandId: brand.brandId, minAgeHours: 24 },
        }))
        await inngest.send(events)
        return events.length
      })
    }

    // Step 8: Record daily snapshot for trend tracking
    await step.run('record-daily-snapshot', async () => {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      
      // Get latest visibility scores for all brands
      for (const brand of brands) {
        const { data: latestScan } = await supabase
          .from('scan_results')
          .select('brand_mentioned, competitors_mentioned')
          .eq('brand_id', brand.id)
          .gte('scanned_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

        if (latestScan && latestScan.length > 0) {
          const mentioned = latestScan.filter(s => s.brand_mentioned).length
          const total = latestScan.length
          const score = total > 0 ? Math.round((mentioned / total) * 100) : 0

          // Count competitor mentions
          const competitorCounts: Record<string, number> = {}
          for (const scan of latestScan) {
            if (scan.competitors_mentioned) {
              for (const comp of scan.competitors_mentioned) {
                competitorCounts[comp] = (competitorCounts[comp] || 0) + 1
              }
            }
          }
          
          // Get top 5 competitors by mention count
          const topCompetitors = Object.entries(competitorCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }))

          // Update brand's visibility_score
          await supabase
            .from('brands')
            .update({ 
              visibility_score: score,
              last_scan_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', brand.id)

          // Record visibility history (upsert to handle re-runs)
          await supabase
            .from('visibility_history')
            .upsert({
              brand_id: brand.id,
              visibility_score: score,
              total_scans: total,
              brand_mentions: mentioned,
              top_competitors_mentioned: topCompetitors,
              recorded_date: today,
              recorded_at: new Date().toISOString(),
            }, {
              onConflict: 'brand_id,recorded_date',
            })
        }
      }
    })

    // Step 9: Log completion
    await step.run('log-completion', async () => {
      const summary = {
        fullRefresh: fullRefreshBrands.length,
        updates: updateBrands.length,
        scansOnly: scanOnlyBrands.length,
        discoveryScans: discoveryBrands.length,
        competitorContentScans: compContentBrands.length,
        verifications: verifyBrands.length,
        total: brands.length,
        skippedBySettings: brands.length - (fullRefreshBrands.length + updateBrands.length + scanOnlyBrands.length),
      }

      if (brands.length > 0) {
        await supabase.from('alerts').insert({
          brand_id: brands[0].id,
          alert_type: 'system',
          title: 'Daily Automation Complete',
          message: `Processed ${brands.length} brands: ${summary.scansOnly} scans, ${summary.discoveryScans} discovery, ${summary.competitorContentScans} competitor content, ${summary.verifications} verify. ${summary.skippedBySettings} brands skipped by schedule settings.`,
          data: { ...summary, timestamp: new Date().toISOString() },
        })
      }

      return summary
    })

    return {
      success: true,
      brandsProcessed: brands.length,
      fullRefresh: fullRefreshBrands.length,
      updates: updateBrands.length,
      scansOnly: scanOnlyBrands.length,
      discoveryScans: discoveryBrands.length,
      competitorContentScans: compContentBrands.length,
      timestamp: new Date().toISOString(),
    }
  }
)

/**
 * Full Brand Refresh - Complete re-extraction and discovery
 * Used for new brands or weekly refresh
 */
export const dailyBrandFullRefresh = inngest.createFunction(
  { 
    id: 'daily-brand-full-refresh', 
    name: 'Full Brand Refresh',
    concurrency: { limit: 3 },
    retries: 2,
  },
  { event: 'daily/brand-full-refresh' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Get brand details
    const brand = await step.run('get-brand', async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (error || !data) {
        throw new Error(`Brand not found: ${brandId}`)
      }
      return data
    })

    // Step 1: Re-extract context (this triggers competitor discovery automatically)
    await step.sendEvent('extract-context', {
      name: 'context/extract',
      data: { brandId, domain: brand.domain },
    })

    // The context/extract function chains to competitor/discover → query/generate → scan/run
    // So we don't need to trigger those separately

    return {
      success: true,
      brandId,
      brandName: brand.name,
      action: 'full-refresh',
      message: 'Full refresh pipeline started (context → competitors → queries → scan)',
    }
  }
)

/**
 * Brand Update - Discover new competitors and/or generate new queries
 * Used for weekly updates when context is still fresh
 */
export const dailyBrandUpdate = inngest.createFunction(
  { 
    id: 'daily-brand-update', 
    name: 'Brand Update',
    concurrency: { limit: 5 },
    retries: 2,
  },
  { event: 'daily/brand-update' },
  async ({ event, step }) => {
    const { brandId, discoverCompetitors, generateQueries } = event.data

    // Get brand details
    const brand = await step.run('get-brand', async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (error || !data) {
        throw new Error(`Brand not found: ${brandId}`)
      }
      return data
    })

    // If we need new competitors, trigger discovery (which chains to queries → scan)
    if (discoverCompetitors) {
      await step.sendEvent('discover-competitors', {
        name: 'competitor/discover',
        data: { brandId },
      })
      // This chains to query/generate → scan/run
    } else if (generateQueries) {
      // Just generate new queries (which chains to scan)
      await step.sendEvent('generate-queries', {
        name: 'query/generate',
        data: { brandId },
      })
      // This chains to scan/run
    }

    return {
      success: true,
      brandId,
      brandName: brand.name,
      action: 'update',
      discoverCompetitors,
      generateQueries,
    }
  }
)

/**
 * Daily Brand Scan - Just run scans and generate memos
 * Used for daily checks when everything else is up to date
 * Also handles 'daily/brand-run' event for backwards compatibility
 */
export const dailyBrandScan = inngest.createFunction(
  { 
    id: 'daily-brand-scan', 
    name: 'Daily Brand Scan',
    concurrency: { limit: 5 },
    retries: 2,
  },
  [{ event: 'daily/brand-scan' }, { event: 'daily/brand-run' }], // Listen to both events
  async ({ event, step }) => {
    const { brandId } = event.data

    // Get brand details
    const brand = await step.run('get-brand', async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('name')
        .eq('id', brandId)
        .single()

      if (error || !data) {
        throw new Error(`Brand not found: ${brandId}`)
      }
      return data
    })

    // Run scan with auto memo generation
    await step.sendEvent('run-scan', {
      name: 'scan/run',
      data: { 
        brandId,
        autoGenerateMemos: true,
      },
    })

    return {
      success: true,
      brandId,
      brandName: brand.name,
      action: 'scan',
      message: 'Daily scan triggered with auto memo generation',
    }
  }
)

