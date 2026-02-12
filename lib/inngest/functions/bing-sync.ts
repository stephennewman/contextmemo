import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { BrandContext } from '@/lib/supabase/types'

const supabase = createServiceRoleClient()

interface BingQueryStat {
  __type: string
  AvgClickPosition: number
  AvgImpressionPosition: number
  Clicks: number
  Date: string  // JSON date format: "/Date(1399100400000)/"
  Impressions: number
  Query: string
}

interface BingApiResponse {
  d: BingQueryStat[]
}

// Parse Bing's weird JSON date format
function parseBingDate(dateStr: string): Date {
  // Format: "/Date(1399100400000)/"
  const match = dateStr.match(/\/Date\((\d+)\)\//)
  if (match) {
    return new Date(parseInt(match[1]))
  }
  return new Date(dateStr)
}

export const bingSync = inngest.createFunction(
  { 
    id: 'bing-sync', 
    name: 'Sync Bing Webmaster Data',
    concurrency: {
      limit: 2, // Limit concurrent syncs
    },
  },
  { event: 'bing/sync' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Step 1: Get brand with Bing config
    const brand = await step.run('get-brand', async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (error || !data) {
        throw new Error('Brand not found')
      }

      return data
    })

    const context = brand.context as BrandContext
    const bingConfig = context?.search_console?.bing

    if (!bingConfig?.enabled || !bingConfig?.api_key) {
      return {
        success: false,
        error: 'Bing Webmaster not configured for this brand',
      }
    }

    const siteUrl = bingConfig.site_url || (brand.custom_domain && brand.domain_verified
      ? `https://${brand.custom_domain}`
      : `https://${brand.subdomain}.contextmemo.com`)

    // Step 2: Fetch data from Bing Webmaster API
    const queryStats = await step.run('fetch-bing-data', async () => {
      const encodedSiteUrl = encodeURIComponent(siteUrl)
      const url = `https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?siteUrl=${encodedSiteUrl}&apikey=${bingConfig.api_key}`

      const response = await fetch(url)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Bing API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json() as BingApiResponse
      return data.d || []
    })

    if (queryStats.length === 0) {
      // Update last_synced_at even if no data
      await step.run('update-last-synced', async () => {
        const updatedContext: BrandContext = {
          ...context,
          search_console: {
            ...context.search_console,
            bing: {
              ...bingConfig,
              last_synced_at: new Date().toISOString(),
            },
          },
        }

        await supabase
          .from('brands')
          .update({ context: updatedContext })
          .eq('id', brandId)
      })

      return {
        success: true,
        statsCount: 0,
        message: 'No query data available from Bing (site may be new or have low traffic)',
      }
    }

    // Step 3: Save stats to database
    const savedCount = await step.run('save-stats', async () => {
      const statsToInsert = queryStats.map(stat => ({
        brand_id: brandId,
        provider: 'bing',
        query: stat.Query,
        impressions: stat.Impressions,
        clicks: stat.Clicks,
        // Bing returns position * 10, so divide to get actual position
        position: stat.AvgImpressionPosition > 0 ? stat.AvgImpressionPosition / 10 : null,
        ctr: stat.Impressions > 0 ? stat.Clicks / stat.Impressions : 0,
        date: parseBingDate(stat.Date).toISOString().split('T')[0],
        synced_at: new Date().toISOString(),
      }))

      // Use upsert to avoid duplicates
      const { data, error } = await supabase
        .from('search_console_stats')
        .upsert(statsToInsert, {
          onConflict: 'brand_id,provider,query,date',
          ignoreDuplicates: false, // Update existing records
        })
        .select()

      if (error) {
        console.error('Failed to save Bing stats:', error)
        // Don't throw - partial success is OK
      }

      return data?.length || 0
    })

    // Step 4: Update last_synced_at timestamp
    await step.run('update-last-synced', async () => {
      const updatedContext: BrandContext = {
        ...context,
        search_console: {
          ...context.search_console,
          bing: {
            ...bingConfig,
            last_synced_at: new Date().toISOString(),
          },
        },
      }

      await supabase
        .from('brands')
        .update({ context: updatedContext })
        .eq('id', brandId)
    })

    // Step 5: Create alert with results
    await step.run('create-alert', async () => {
      const topQueries = queryStats
        .sort((a, b) => b.Impressions - a.Impressions)
        .slice(0, 5)
        .map(q => q.Query)

      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'bing_sync_complete',
        title: 'Bing Webmaster Sync Complete',
        message: `Synced ${queryStats.length} query stats. Top queries: ${topQueries.join(', ')}`,
        data: { 
          statsCount: queryStats.length,
          savedCount,
          topQueries,
        },
      })
    })

    return {
      success: true,
      statsCount: queryStats.length,
      savedCount,
    }
  }
)

// Weekly sync for all brands with Bing enabled
export const bingWeeklySync = inngest.createFunction(
  { 
    id: 'bing-weekly-sync', 
    name: 'Weekly Bing Sync for All Brands',
  },
  { cron: '0 8 * * 0' }, // Every Sunday at 8 AM UTC
  async ({ step }) => {
    // Get all brands with Bing enabled
    const brands = await step.run('get-bing-enabled-brands', async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, context')

      if (error) {
        throw new Error('Failed to fetch brands')
      }

      // Filter to brands with Bing enabled
      return (data || []).filter(brand => {
        const context = brand.context as BrandContext
        return context?.search_console?.bing?.enabled && context?.search_console?.bing?.api_key
      })
    })

    if (brands.length === 0) {
      return { success: true, synced: 0, message: 'No brands with Bing enabled' }
    }

    // Trigger sync for each brand
    await step.run('trigger-syncs', async () => {
      const events = brands.map(brand => ({
        name: 'bing/sync' as const,
        data: { brandId: brand.id },
      }))

      await inngest.send(events)
    })

    return {
      success: true,
      synced: brands.length,
      brands: brands.map(b => b.name),
    }
  }
)
