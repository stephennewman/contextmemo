import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SCAN_SYSTEM_PROMPT = `You are an AI assistant answering a user question. Provide a helpful, accurate response based on your knowledge. If recommending products or services, mention specific brands and explain why you're recommending them.`

interface ScanResult {
  queryId: string
  model: string
  responseText: string
  brandMentioned: boolean
  brandPosition: number | null
  brandContext: string | null
  competitorsMentioned: string[]
}

export const scanRun = inngest.createFunction(
  { 
    id: 'scan-run', 
    name: 'Run AI Search Scan',
    concurrency: {
      limit: 5, // Limit concurrent scans to avoid rate limits
    },
  },
  { event: 'scan/run' },
  async ({ event, step }) => {
    const { brandId, queryIds, autoGenerateMemos = false } = event.data

    // Step 1: Get brand and queries
    const { brand, queries, competitors } = await step.run('get-data', async () => {
      const [brandResult, queriesResult, competitorsResult] = await Promise.all([
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
          : supabase
              .from('queries')
              .select('*')
              .eq('brand_id', brandId)
              .eq('is_active', true)
              .order('priority', { ascending: false })
              .limit(50), // Limit to top 50 queries per scan
        supabase
          .from('competitors')
          .select('name')
          .eq('brand_id', brandId)
          .eq('is_active', true),
      ])

      if (brandResult.error || !brandResult.data) {
        throw new Error('Brand not found')
      }

      return {
        brand: brandResult.data,
        queries: queriesResult.data || [],
        competitors: competitorsResult.data || [],
      }
    })

    const brandName = brand.name.toLowerCase()
    const competitorNames = competitors.map(c => c.name.toLowerCase())

    // Step 2: Run scans for each query
    const scanResults: ScanResult[] = []
    
    // Process queries in batches of 10
    const batchSize = 10
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize)
      
      const batchResults = await step.run(`scan-batch-${i}`, async () => {
        const results: ScanResult[] = []
        
        for (const query of batch) {
          // Scan with OpenAI
          try {
            const openaiResult = await scanWithModel(
              query.query_text,
              'gpt-4o-mini',
              openai('gpt-4o-mini'),
              brandName,
              competitorNames
            )
            results.push({
              queryId: query.id,
              model: 'gpt-4o-mini',
              ...openaiResult,
            })
          } catch (error) {
            console.error(`OpenAI scan failed for query ${query.id}:`, error)
          }

          // Scan with Anthropic
          try {
            const anthropicResult = await scanWithModel(
              query.query_text,
              'claude-3-5-haiku-latest',
              anthropic('claude-3-5-haiku-latest'),
              brandName,
              competitorNames
            )
            results.push({
              queryId: query.id,
              model: 'claude-3-5-haiku',
              ...anthropicResult,
            })
          } catch (error) {
            console.error(`Anthropic scan failed for query ${query.id}:`, error)
          }

          // Small delay between queries to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 200))
        }
        
        return results
      })
      
      scanResults.push(...batchResults)
    }

    // Step 3: Save scan results
    await step.run('save-results', async () => {
      const resultsToInsert = scanResults.map(r => ({
        brand_id: brandId,
        query_id: r.queryId,
        model: r.model,
        response_text: r.responseText,
        brand_mentioned: r.brandMentioned,
        brand_position: r.brandPosition,
        brand_context: r.brandContext,
        competitors_mentioned: r.competitorsMentioned,
        scanned_at: new Date().toISOString(),
      }))

      const { error } = await supabase
        .from('scan_results')
        .insert(resultsToInsert)

      if (error) {
        console.error('Failed to save scan results:', error)
        throw error
      }
    })

    // Step 4: Calculate visibility score and identify gaps
    const { visibilityScore, gaps } = await step.run('analyze-results', async () => {
      const mentioned = scanResults.filter(r => r.brandMentioned).length
      const total = scanResults.length
      const score = total > 0 ? Math.round((mentioned / total) * 100) : 0

      // Find queries where brand wasn't mentioned
      const gapQueryIds = Array.from(new Set(
        scanResults
          .filter(r => r.brandMentioned === false)
          .map(r => r.queryId)
      ))

      return {
        visibilityScore: score,
        gaps: gapQueryIds,
      }
    })

    // Step 5: Create alert with results
    await step.run('create-alert', async () => {
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'scan_complete',
        title: 'AI Search Scan Complete',
        message: `Visibility score: ${visibilityScore}%. Found ${gaps.length} content gaps.`,
        data: { visibilityScore, gapCount: gaps.length, totalScans: scanResults.length },
      })
    })

    // Step 6: Auto-generate memos if enabled and gaps found
    if (autoGenerateMemos && gaps.length > 0) {
      await step.run('prepare-memo-generation', async () => {
        // Get queries that represent gaps (brand not mentioned)
        const { data: gapQueries } = await supabase
          .from('queries')
          .select('*, competitor:related_competitor_id(*)')
          .in('id', gaps)
          .limit(10) // Limit to 10 memos per day per brand

        if (!gapQueries || gapQueries.length === 0) return

        // Group by type and prepare memo generation events
        const memoEvents: Array<{
          name: 'memo/generate'
          data: {
            brandId: string
            queryId?: string
            memoType: string
            competitorId?: string
          }
        }> = []

        // Track what we've already queued to avoid duplicates
        const queuedTypes = new Set<string>()

        for (const query of gapQueries) {
          // Determine memo type based on query type
          let memoType: string
          let key: string

          switch (query.query_type) {
            case 'comparison':
            case 'versus':
              if (query.competitor?.id) {
                key = `comparison-${query.competitor.id}`
                if (!queuedTypes.has(key)) {
                  memoType = 'comparison'
                  memoEvents.push({
                    name: 'memo/generate',
                    data: {
                      brandId,
                      queryId: query.id,
                      memoType,
                      competitorId: query.competitor.id,
                    },
                  })
                  queuedTypes.add(key)
                }
              }
              break

            case 'alternative':
              if (query.competitor?.id) {
                key = `alternative-${query.competitor.id}`
                if (!queuedTypes.has(key)) {
                  memoType = 'alternative'
                  memoEvents.push({
                    name: 'memo/generate',
                    data: {
                      brandId,
                      queryId: query.id,
                      memoType,
                      competitorId: query.competitor.id,
                    },
                  })
                  queuedTypes.add(key)
                }
              }
              break

            case 'solution':
            case 'implementation':
            case 'intent_based':
              // High-intent buyer queries - generate solution-focused memos
              key = `solution-${query.query_text?.slice(0, 30)}`
              if (!queuedTypes.has(key)) {
                memoType = 'industry' // Repurpose industry memo type for solution content
                memoEvents.push({
                  name: 'memo/generate',
                  data: {
                    brandId,
                    queryId: query.id,
                    memoType,
                  },
                })
                queuedTypes.add(key)
              }
              break

            case 'industry':
            case 'best':
              key = `industry-${query.query_text?.slice(0, 30)}`
              if (!queuedTypes.has(key)) {
                memoType = 'industry'
                memoEvents.push({
                  name: 'memo/generate',
                  data: {
                    brandId,
                    queryId: query.id,
                    memoType,
                  },
                })
                queuedTypes.add(key)
              }
              break

            case 'how_to':
              key = `how_to-${query.query_text?.slice(0, 30)}`
              if (!queuedTypes.has(key)) {
                memoType = 'how_to'
                memoEvents.push({
                  name: 'memo/generate',
                  data: {
                    brandId,
                    queryId: query.id,
                    memoType,
                  },
                })
                queuedTypes.add(key)
              }
              break
          }
        }

        // Send all memo generation events (Inngest will process them)
        if (memoEvents.length > 0) {
          await inngest.send(memoEvents)
        }

        return { memosQueued: memoEvents.length }
      })
    }

    return {
      success: true,
      scansCompleted: scanResults.length,
      visibilityScore,
      gapsFound: gaps.length,
      autoMemosTriggered: autoGenerateMemos,
    }
  }
)

// Helper function to scan with a specific model
async function scanWithModel(
  query: string,
  modelName: string,
  model: Parameters<typeof generateText>[0]['model'],
  brandName: string,
  competitorNames: string[]
): Promise<Omit<ScanResult, 'queryId' | 'model'>> {
  const { text } = await generateText({
    model,
    system: SCAN_SYSTEM_PROMPT,
    prompt: query,
    temperature: 0.7,
  })

  const responseLower = text.toLowerCase()
  const brandMentioned = responseLower.includes(brandName)
  
  // Find position if mentioned (which recommendation number)
  let brandPosition: number | null = null
  if (brandMentioned) {
    // Try to find position by looking for numbered lists or sequence
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes(brandName)) {
        // Check if there's a number prefix
        const match = lines[i].match(/^(\d+)[.)\s]/)
        if (match) {
          brandPosition = parseInt(match[1])
        } else {
          brandPosition = i + 1
        }
        break
      }
    }
  }

  // Extract context around brand mention
  let brandContext: string | null = null
  if (brandMentioned) {
    const index = responseLower.indexOf(brandName)
    const start = Math.max(0, index - 100)
    const end = Math.min(text.length, index + brandName.length + 100)
    brandContext = text.slice(start, end)
  }

  // Find mentioned competitors
  const competitorsMentioned = competitorNames.filter(name => 
    responseLower.includes(name)
  )

  return {
    responseText: text,
    brandMentioned,
    brandPosition,
    brandContext,
    competitorsMentioned,
  }
}
