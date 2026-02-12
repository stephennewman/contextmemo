import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { BrandContext } from '@/lib/supabase/types'

const supabase = createServiceRoleClient()

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

interface GoogleSearchAnalyticsRow {
  keys: string[]  // [query] or [query, page] depending on dimensions
  clicks: number
  impressions: number
  ctr: number
  position: number
}

interface GoogleSearchAnalyticsResponse {
  rows?: GoogleSearchAnalyticsRow[]
  responseAggregationType?: string
}

// Refresh access token using refresh token
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      console.error('Failed to refresh token:', await response.text())
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Token refresh error:', error)
    return null
  }
}

export const googleSearchConsoleSync = inngest.createFunction(
  { 
    id: 'google-search-console-sync', 
    name: 'Sync Google Search Console Data',
    concurrency: {
      limit: 2,
    },
  },
  { event: 'google-search-console/sync' },
  async ({ event, step }) => {
    const { brandId } = event.data

    // Step 1: Get brand with Google config
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
    const googleConfig = context?.search_console?.google

    if (!googleConfig?.enabled || !googleConfig?.refresh_token) {
      return {
        success: false,
        error: 'Google Search Console not configured for this brand',
      }
    }

    // Step 2: Refresh access token
    const tokens = await step.run('refresh-token', async () => {
      const newTokens = await refreshAccessToken(googleConfig.refresh_token!)
      if (!newTokens) {
        throw new Error('Failed to refresh access token')
      }
      return newTokens
    })

    // Update access token in brand context
    await step.run('update-token', async () => {
      const updatedContext: BrandContext = {
        ...context,
        search_console: {
          ...context.search_console,
          google: {
            ...googleConfig,
            access_token: tokens.access_token,
            token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          },
        },
      }

      await supabase
        .from('brands')
        .update({ context: updatedContext })
        .eq('id', brandId)
    })

    // Determine site URL - use configured one or memo subdomain
    const siteUrl = googleConfig.site_url || (brand.custom_domain && brand.domain_verified
      ? `https://${brand.custom_domain}/`
      : `https://${brand.subdomain}.contextmemo.com/`)

    // Step 3: Fetch search analytics data
    const analyticsData = await step.run('fetch-gsc-data', async () => {
      // Get data for the last 28 days (Google's standard range)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 28)

      const response = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            dimensions: ['query', 'date'],
            rowLimit: 1000,
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('GSC API error:', response.status, errorText)
        
        // Check if it's a permission error
        if (response.status === 403) {
          throw new Error('Permission denied - make sure the site is verified in Google Search Console')
        }
        
        throw new Error(`Google Search Console API error: ${response.status}`)
      }

      const data = await response.json() as GoogleSearchAnalyticsResponse
      return data.rows || []
    })

    if (analyticsData.length === 0) {
      // Update last_synced_at even if no data
      await step.run('update-last-synced-empty', async () => {
        const updatedContext: BrandContext = {
          ...context,
          search_console: {
            ...context.search_console,
            google: {
              ...googleConfig,
              access_token: tokens.access_token,
              token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
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
        message: 'No query data available from Google (site may be new or have low traffic)',
      }
    }

    // Step 4: Save stats to database
    const savedCount = await step.run('save-stats', async () => {
      const statsToInsert = analyticsData.map(row => ({
        brand_id: brandId,
        provider: 'google',
        query: row.keys[0], // First key is query
        date: row.keys[1],  // Second key is date
        impressions: row.impressions,
        clicks: row.clicks,
        position: row.position,
        ctr: row.ctr,
        synced_at: new Date().toISOString(),
      }))

      // Use upsert to avoid duplicates
      const { data, error } = await supabase
        .from('search_console_stats')
        .upsert(statsToInsert, {
          onConflict: 'brand_id,provider,query,date',
          ignoreDuplicates: false,
        })
        .select()

      if (error) {
        console.error('Failed to save Google stats:', error)
      }

      return data?.length || 0
    })

    // Step 5: Update last_synced_at timestamp
    await step.run('update-last-synced', async () => {
      const updatedContext: BrandContext = {
        ...context,
        search_console: {
          ...context.search_console,
          google: {
            ...googleConfig,
            access_token: tokens.access_token,
            token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            last_synced_at: new Date().toISOString(),
          },
        },
      }

      await supabase
        .from('brands')
        .update({ context: updatedContext })
        .eq('id', brandId)
    })

    // Step 6: Create alert with results
    await step.run('create-alert', async () => {
      // Get unique queries
      const uniqueQueries = new Set(analyticsData.map(row => row.keys[0]))
      const topQueries = analyticsData
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 5)
        .map(row => row.keys[0])

      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'google_sync_complete',
        title: 'Google Search Console Sync Complete',
        message: `Synced ${uniqueQueries.size} unique queries. Top queries: ${topQueries.join(', ')}`,
        data: { 
          statsCount: analyticsData.length,
          uniqueQueries: uniqueQueries.size,
          savedCount,
          topQueries,
        },
      })
    })

    return {
      success: true,
      statsCount: analyticsData.length,
      savedCount,
    }
  }
)

// Weekly sync for all brands with Google enabled
export const googleWeeklySync = inngest.createFunction(
  { 
    id: 'google-weekly-sync', 
    name: 'Weekly Google Search Console Sync for All Brands',
  },
  { cron: '0 9 * * 0' }, // Every Sunday at 9 AM UTC (after Bing at 8 AM)
  async ({ step }) => {
    // Get all brands with Google enabled
    const brands = await step.run('get-google-enabled-brands', async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, context')

      if (error) {
        throw new Error('Failed to fetch brands')
      }

      // Filter to brands with Google enabled and refresh token
      return (data || []).filter(brand => {
        const context = brand.context as BrandContext
        return context?.search_console?.google?.enabled && context?.search_console?.google?.refresh_token
      })
    })

    if (brands.length === 0) {
      return { success: true, synced: 0, message: 'No brands with Google Search Console enabled' }
    }

    // Trigger sync for each brand
    await step.run('trigger-syncs', async () => {
      const events = brands.map(brand => ({
        name: 'google-search-console/sync' as const,
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
