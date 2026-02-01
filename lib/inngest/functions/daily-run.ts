import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'

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
    
    // Step 1: Get all active brands
    const brands = await step.run('get-active-brands', async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, domain, context_extracted_at, created_at, updated_at')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to get brands:', error)
        return []
      }

      return data || []
    })

    if (brands.length === 0) {
      return { success: true, message: 'No brands to process', brandsProcessed: 0 }
    }

    // Step 2: Categorize brands by what they need
    const brandTasks = await step.run('categorize-brands', async () => {
      const tasks: Array<{
        brandId: string
        brandName: string
        needsContextRefresh: boolean
        needsCompetitorDiscovery: boolean
        needsQueryGeneration: boolean
        needsScan: boolean
        needsDiscoveryScan: boolean
        isNewBrand: boolean
      }> = []

      for (const brand of brands) {
        const isNew = !brand.context_extracted_at
        const contextAge = brand.context_extracted_at 
          ? Math.floor((Date.now() - new Date(brand.context_extracted_at).getTime()) / (1000 * 60 * 60 * 24))
          : 999

        // Get last competitor discovery, query generation, scan, and discovery scan times
        const [competitorsResult, queriesResult, lastScanResult, lastDiscoveryScanResult] = await Promise.all([
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
          // Check last discovery scan via alerts table
          supabase
            .from('alerts')
            .select('created_at')
            .eq('brand_id', brand.id)
            .eq('alert_type', 'discovery_complete')
            .order('created_at', { ascending: false })
            .limit(1),
        ])

        const lastCompetitorDiscovery = competitorsResult.data?.[0]?.created_at
        const lastQueryGeneration = queriesResult.data?.[0]?.created_at
        const lastScan = lastScanResult.data?.[0]?.scanned_at
        const lastDiscoveryScan = lastDiscoveryScanResult.data?.[0]?.created_at

        tasks.push({
          brandId: brand.id,
          brandName: brand.name,
          isNewBrand: isNew,
          // Refresh context weekly (every 7 days) or if never done
          needsContextRefresh: isOlderThanDays(brand.context_extracted_at, 7),
          // Discover competitors weekly or if never done
          needsCompetitorDiscovery: isOlderThanDays(lastCompetitorDiscovery, 7),
          // Generate new queries weekly or if never done
          needsQueryGeneration: isOlderThanDays(lastQueryGeneration, 7),
          // Scan daily (or if never scanned)
          needsScan: isOlderThanDays(lastScan, 1),
          // Discovery scan weekly (or if never done) - explores new query patterns
          needsDiscoveryScan: isOlderThanDays(lastDiscoveryScan, 7),
        })
      }

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

    // Step 5: Process brands that just need daily scan
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
        return events.length
      })
    }

    // Step 6: Trigger competitor content scanning for all brands
    await step.run('trigger-competitor-content-scan', async () => {
      const events = brands.map(brand => ({
        name: 'competitor/content-scan' as const,
        data: { brandId: brand.id },
      }))
      await inngest.send(events)
      return events.length
    })

    // Step 6b: Trigger discovery scans for brands that need them (weekly)
    // Discovery scans explore new query patterns and add winning queries to the database
    const discoveryBrands = brandTasks.filter(b => 
      b.needsDiscoveryScan && 
      !b.isNewBrand && // Skip new brands - they'll get discovery after initial setup
      !b.needsContextRefresh // Skip brands getting full refresh
    )

    if (discoveryBrands.length > 0) {
      await step.run('trigger-discovery-scans', async () => {
        const events = discoveryBrands.map(brand => ({
          name: 'discovery/scan' as const,
          data: { brandId: brand.brandId },
        }))
        await inngest.send(events)
        return events.length
      })
    }

    // Step 6c: Trigger Google AI Overview scans (weekly, if SERPAPI_KEY is configured)
    // Only runs on specific days to conserve API quota (100 free/month)
    // Runs on Mondays and Thursdays for twice-weekly coverage
    if (process.env.SERPAPI_KEY && (dayOfWeek === 1 || dayOfWeek === 4)) {
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

    // Step 7: Record daily snapshot for trend tracking
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

    // Step 8: Log completion
    await step.run('log-completion', async () => {
      const summary = {
        fullRefresh: fullRefreshBrands.length,
        updates: updateBrands.length,
        scansOnly: scanOnlyBrands.length,
        discoveryScans: discoveryBrands.length,
        total: brands.length,
      }

      if (brands.length > 0) {
        await supabase.from('alerts').insert({
          brand_id: brands[0].id,
          alert_type: 'system',
          title: 'Daily Automation Complete',
          message: `Processed ${brands.length} brands: ${summary.fullRefresh} full refresh, ${summary.updates} updates, ${summary.scansOnly} scans, ${summary.discoveryScans} discovery scans.`,
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

