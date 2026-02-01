import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { checkGoogleAIOverview, AIOverviewResult } from '@/lib/utils/serpapi'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Scan Google AI Overviews for a brand's tracked queries
 * Uses SerpAPI - free tier is 100 searches/month, so we prioritize high-value queries
 */
export const aiOverviewScan = inngest.createFunction(
  {
    id: 'ai-overview-scan',
    name: 'Scan Google AI Overviews',
    concurrency: { limit: 1 }, // Strict limit to avoid burning API quota
  },
  { event: 'ai-overview/scan' },
  async ({ event, step }) => {
    const { brandId, queryIds, maxQueries = 10 } = event.data

    // Check if SerpAPI key is configured
    if (!process.env.SERPAPI_KEY) {
      console.log('SERPAPI_KEY not configured, skipping AI Overview scan')
      return { success: false, reason: 'no_api_key' }
    }

    // Step 1: Get brand and queries
    const { brand, queries } = await step.run('get-data', async () => {
      const [brandResult, queriesResult] = await Promise.all([
        supabase
          .from('brands')
          .select('*')
          .eq('id', brandId)
          .single(),
        queryIds
          ? supabase
              .from('queries')
              .select('*')
              .in('id', queryIds)
              .eq('is_active', true)
          : supabase
              .from('queries')
              .select('*')
              .eq('brand_id', brandId)
              .eq('is_active', true)
              .order('priority', { ascending: false })
              .limit(maxQueries), // Limit to conserve API quota
      ])

      if (brandResult.error || !brandResult.data) {
        throw new Error('Brand not found')
      }

      return {
        brand: brandResult.data,
        queries: queriesResult.data || [],
      }
    })

    // Step 2: Scan each query (with delays to respect rate limits)
    const results: Array<{
      queryId: string
      queryText: string
      result: AIOverviewResult
    }> = []

    // Process queries one at a time with delays
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i]
      
      const scanResult = await step.run(`scan-query-${i}`, async () => {
        const result = await checkGoogleAIOverview(
          query.query_text,
          brand.name,
          brand.domain
        )
        
        // Delay between requests (1 second)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        return {
          queryId: query.id,
          queryText: query.query_text,
          result,
        }
      })
      
      results.push(scanResult)
    }

    // Step 3: Save results to database
    await step.run('save-results', async () => {
      const resultsToInsert = results.map(r => ({
        brand_id: brandId,
        query_id: r.queryId,
        model: 'google-ai-overview',
        response_text: r.result.overviewText,
        brand_mentioned: r.result.brandMentioned,
        brand_position: r.result.brandPosition,
        brand_context: r.result.hasAIOverview 
          ? `AI Overview present. Brand in sources: ${r.result.brandInSources}. Organic position: ${r.result.organicPosition || 'not found'}`
          : 'No AI Overview for this query',
        competitors_mentioned: [], // Could extract from overview text
        citations: r.result.overviewSources.map(s => s.link),
        brand_in_citations: r.result.brandInSources,
        scanned_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('scan_results')
        .insert(resultsToInsert)

      if (error) {
        console.error('Failed to save AI Overview results:', error)
        throw error
      }
    })

    // Step 4: Create summary alert
    const summary = await step.run('create-alert', async () => {
      const withOverview = results.filter(r => r.result.hasAIOverview).length
      const brandMentioned = results.filter(r => r.result.brandMentioned).length
      const brandInSources = results.filter(r => r.result.brandInSources).length

      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'ai_overview_scan_complete',
        title: 'Google AI Overviews Scanned',
        message: `Checked ${results.length} queries. ${withOverview} had AI Overviews, ${brandMentioned} mentioned ${brand.name}, ${brandInSources} cited your site.`,
        data: {
          totalQueries: results.length,
          withAIOverview: withOverview,
          brandMentioned,
          brandInSources,
        },
      })

      return { withOverview, brandMentioned, brandInSources }
    })

    return {
      success: true,
      scanned: results.length,
      ...summary,
    }
  }
)
