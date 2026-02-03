/**
 * Per-Model Insights & Optimization
 * 
 * Analyzes scan results to understand:
 * - Which AI models cite the brand most frequently
 * - What content types each model prefers
 * - Content structure patterns that lead to citations
 * - Model-specific optimization recommendations
 */

import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ModelPerformance {
  model: string
  displayName: string
  totalScans: number
  brandMentions: number
  brandCitations: number
  mentionRate: number
  citationRate: number
  avgPosition: number | null
  topQueryTypes: Array<{ type: string; successRate: number }>
  contentPreferences: Array<{ pattern: string; score: number }>
}

interface ModelInsights {
  brandId: string
  analyzedAt: string
  totalScans: number
  overallCitationRate: number
  models: ModelPerformance[]
  recommendations: ModelRecommendation[]
  contentGaps: ModelContentGap[]
}

interface ModelRecommendation {
  model: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionItems: string[]
}

interface ModelContentGap {
  model: string
  queryType: string
  currentRate: number
  potentialRate: number
  suggestion: string
}

// Model display names and characteristics
const MODEL_INFO: Record<string, { displayName: string; traits: string[] }> = {
  'gpt-4o-mini': { 
    displayName: 'GPT-4o Mini',
    traits: ['Prefers structured content', 'Values recent sources', 'FAQ-friendly']
  },
  'claude-3-5-haiku': { 
    displayName: 'Claude 3.5 Haiku',
    traits: ['Prefers detailed explanations', 'Values authoritative sources', 'Comparison-friendly']
  },
  'grok-4-fast': { 
    displayName: 'Grok 4 Fast',
    traits: ['Real-time data preference', 'Values X/Twitter citations', 'News-friendly']
  },
  'perplexity-sonar': { 
    displayName: 'Perplexity Sonar',
    traits: ['Citation-heavy', 'Prefers primary sources', 'Research-oriented']
  },
  'gemini-2-flash': {
    displayName: 'Gemini 2.0 Flash',
    traits: ['Google ecosystem aware', 'Values structured data', 'Schema-friendly']
  },
}

/**
 * Analyze per-model performance for a brand
 */
export const analyzeModelPerformance = inngest.createFunction(
  {
    id: 'analyze-model-performance',
    name: 'Analyze Per-Model Performance',
    concurrency: { limit: 3 },
  },
  { event: 'model-insights/analyze' },
  async ({ event, step }) => {
    const { brandId, days = 30 } = event.data

    // Get scan results for the period
    const scans = await step.run('get-scans', async () => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('scan_results')
        .select(`
          id,
          model,
          brand_mentioned,
          brand_in_citations,
          brand_position,
          competitors_mentioned,
          citations,
          scanned_at,
          query:query_id(query_type, query_text)
        `)
        .eq('brand_id', brandId)
        .gte('scanned_at', startDate)

      if (error) throw error
      return data || []
    })

    if (scans.length === 0) {
      return { success: false, message: 'No scans found for analysis' }
    }

    // Analyze by model
    const modelStats = await step.run('analyze-models', async () => {
      const stats: Record<string, {
        scans: typeof scans
        mentions: number
        citations: number
        positions: number[]
        queryTypeSuccess: Record<string, { total: number; cited: number }>
      }> = {}

      for (const scan of scans) {
        const model = scan.model
        if (!stats[model]) {
          stats[model] = {
            scans: [],
            mentions: 0,
            citations: 0,
            positions: [],
            queryTypeSuccess: {},
          }
        }

        stats[model].scans.push(scan)
        
        if (scan.brand_mentioned) {
          stats[model].mentions++
          if (scan.brand_position) {
            stats[model].positions.push(scan.brand_position)
          }
        }

        if (scan.brand_in_citations) {
          stats[model].citations++
        }

        // Track success by query type
        const queryData = scan.query as unknown as { query_type: string } | null
        const queryType = queryData?.query_type || 'unknown'
        if (!stats[model].queryTypeSuccess[queryType]) {
          stats[model].queryTypeSuccess[queryType] = { total: 0, cited: 0 }
        }
        stats[model].queryTypeSuccess[queryType].total++
        if (scan.brand_in_citations) {
          stats[model].queryTypeSuccess[queryType].cited++
        }
      }

      return stats
    })

    // Calculate model performance metrics
    const modelPerformance: ModelPerformance[] = await step.run('calculate-metrics', async () => {
      return Object.entries(modelStats).map(([model, stats]) => {
        const totalScans = stats.scans.length
        const mentionRate = totalScans > 0 ? Math.round((stats.mentions / totalScans) * 100) : 0
        const citationRate = totalScans > 0 ? Math.round((stats.citations / totalScans) * 100) : 0
        const avgPosition = stats.positions.length > 0 
          ? Math.round(stats.positions.reduce((a, b) => a + b, 0) / stats.positions.length * 10) / 10
          : null

        // Top query types by success rate
        const topQueryTypes = Object.entries(stats.queryTypeSuccess)
          .map(([type, data]) => ({
            type,
            successRate: data.total > 0 ? Math.round((data.cited / data.total) * 100) : 0,
          }))
          .sort((a, b) => b.successRate - a.successRate)
          .slice(0, 5)

        // Content preferences based on successful citations
        const contentPreferences = analyzeContentPreferences(stats.scans, model)

        return {
          model,
          displayName: MODEL_INFO[model]?.displayName || model,
          totalScans,
          brandMentions: stats.mentions,
          brandCitations: stats.citations,
          mentionRate,
          citationRate,
          avgPosition,
          topQueryTypes,
          contentPreferences,
        }
      }).sort((a, b) => b.citationRate - a.citationRate)
    })

    // Generate recommendations
    const recommendations = await step.run('generate-recommendations', async () => {
      const recs: ModelRecommendation[] = []

      for (const perf of modelPerformance) {
        const modelTraits = MODEL_INFO[perf.model]?.traits || []

        // Low citation rate recommendation
        if (perf.citationRate < 20 && perf.totalScans >= 10) {
          recs.push({
            model: perf.displayName,
            priority: 'high',
            title: `Improve ${perf.displayName} Citation Rate`,
            description: `Only ${perf.citationRate}% citation rate. ${perf.displayName} ${modelTraits.length > 0 ? modelTraits.join(', ').toLowerCase() : 'may need different content structure'}.`,
            actionItems: generateActionItems(perf, modelTraits),
          })
        }

        // High mention but low citation
        if (perf.mentionRate > 50 && perf.citationRate < 30) {
          recs.push({
            model: perf.displayName,
            priority: 'medium',
            title: `Convert Mentions to Citations for ${perf.displayName}`,
            description: `${perf.mentionRate}% mention rate but only ${perf.citationRate}% citation rate. Content is being recognized but not cited with sources.`,
            actionItems: [
              'Add more authoritative source links to content',
              'Include more specific data and statistics',
              'Ensure content is indexable and recently updated',
            ],
          })
        }

        // Poor position even when mentioned
        if (perf.avgPosition && perf.avgPosition > 5 && perf.mentionRate > 20) {
          recs.push({
            model: perf.displayName,
            priority: 'medium',
            title: `Improve Ranking in ${perf.displayName} Responses`,
            description: `Average position ${perf.avgPosition} when mentioned. Aim for top 3 positions.`,
            actionItems: [
              'Strengthen unique value proposition in content',
              'Add more comparison content vs. top competitors',
              'Include customer testimonials and case studies',
            ],
          })
        }
      }

      return recs.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })
    })

    // Identify content gaps by model
    const contentGaps = await step.run('identify-gaps', async () => {
      const gaps: ModelContentGap[] = []

      for (const perf of modelPerformance) {
        // Find query types with low success rate
        for (const qt of perf.topQueryTypes) {
          if (qt.successRate < 30) {
            // Estimate potential based on other models' success
            const otherModelAvg = modelPerformance
              .filter(m => m.model !== perf.model)
              .flatMap(m => m.topQueryTypes.filter(t => t.type === qt.type))
              .reduce((sum, t) => sum + t.successRate, 0) / (modelPerformance.length - 1) || 50

            if (otherModelAvg > qt.successRate + 20) {
              gaps.push({
                model: perf.displayName,
                queryType: qt.type,
                currentRate: qt.successRate,
                potentialRate: Math.round(otherModelAvg),
                suggestion: `${perf.displayName} underperforms on "${qt.type}" queries (${qt.successRate}% vs ${Math.round(otherModelAvg)}% avg). Consider ${getQueryTypeAdvice(qt.type)}.`,
              })
            }
          }
        }
      }

      return gaps.slice(0, 10) // Top 10 gaps
    })

    // Save insights
    const insights: ModelInsights = {
      brandId,
      analyzedAt: new Date().toISOString(),
      totalScans: scans.length,
      overallCitationRate: scans.length > 0 
        ? Math.round((scans.filter(s => s.brand_in_citations).length / scans.length) * 100)
        : 0,
      models: modelPerformance,
      recommendations,
      contentGaps,
    }

    await step.run('save-insights', async () => {
      // Update brand with latest insights
      await supabase
        .from('brands')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', brandId)

      // Create alert with summary
      await supabase.from('alerts').insert({
        brand_id: brandId,
        alert_type: 'model_insights',
        title: 'Model Performance Analysis Complete',
        message: `Analyzed ${scans.length} scans across ${modelPerformance.length} models. Found ${recommendations.length} recommendations.`,
        data: insights,
      })
    })

    return {
      success: true,
      insights,
    }
  }
)

/**
 * Helper: Analyze content preferences for a model
 */
function analyzeContentPreferences(
  scans: Array<{ brand_in_citations: boolean | null; query: { query_text: string } | null }>,
  model: string
): Array<{ pattern: string; score: number }> {
  const patterns: Record<string, { total: number; success: number }> = {
    'comparison': { total: 0, success: 0 },
    'how-to': { total: 0, success: 0 },
    'best-of': { total: 0, success: 0 },
    'vs': { total: 0, success: 0 },
    'alternative': { total: 0, success: 0 },
    'guide': { total: 0, success: 0 },
  }

  for (const scan of scans) {
    const queryText = (scan.query as { query_text: string } | null)?.query_text?.toLowerCase() || ''
    
    if (queryText.includes(' vs ') || queryText.includes('versus') || queryText.includes('compared')) {
      patterns['comparison'].total++
      if (scan.brand_in_citations) patterns['comparison'].success++
    }
    if (queryText.includes('how to') || queryText.includes('how do')) {
      patterns['how-to'].total++
      if (scan.brand_in_citations) patterns['how-to'].success++
    }
    if (queryText.includes('best ') || queryText.includes('top ')) {
      patterns['best-of'].total++
      if (scan.brand_in_citations) patterns['best-of'].success++
    }
    if (queryText.includes('alternative')) {
      patterns['alternative'].total++
      if (scan.brand_in_citations) patterns['alternative'].success++
    }
    if (queryText.includes('guide') || queryText.includes('tutorial')) {
      patterns['guide'].total++
      if (scan.brand_in_citations) patterns['guide'].success++
    }
  }

  return Object.entries(patterns)
    .filter(([_, data]) => data.total >= 3) // Need at least 3 samples
    .map(([pattern, data]) => ({
      pattern,
      score: data.total > 0 ? Math.round((data.success / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.score - a.score)
}

/**
 * Helper: Generate action items based on model traits
 */
function generateActionItems(perf: ModelPerformance, traits: string[]): string[] {
  const items: string[] = []

  if (traits.includes('Prefers structured content')) {
    items.push('Add clear H2/H3 headings and bullet points to content')
  }
  if (traits.includes('Values recent sources')) {
    items.push('Update content with recent statistics and publication dates')
  }
  if (traits.includes('FAQ-friendly')) {
    items.push('Add FAQ sections with schema markup to memos')
  }
  if (traits.includes('Prefers detailed explanations')) {
    items.push('Expand content with more in-depth explanations and examples')
  }
  if (traits.includes('Values authoritative sources')) {
    items.push('Include citations from industry reports and official documentation')
  }
  if (traits.includes('Comparison-friendly')) {
    items.push('Create detailed comparison tables with feature breakdowns')
  }
  if (traits.includes('Citation-heavy')) {
    items.push('Ensure all claims have verifiable source links')
  }
  if (traits.includes('Schema-friendly')) {
    items.push('Implement comprehensive Schema.org markup')
  }

  // Add general advice if few specific items
  if (items.length < 2) {
    items.push('Increase content depth and specificity')
    items.push('Add more unique data and insights')
  }

  return items.slice(0, 4)
}

/**
 * Helper: Get advice for improving specific query types
 */
function getQueryTypeAdvice(queryType: string): string {
  const advice: Record<string, string> = {
    'comparison': 'creating more detailed comparison content with feature tables',
    'best': 'publishing comprehensive "best of" guides with clear ranking criteria',
    'alternative': 'creating dedicated alternative/competitor comparison pages',
    'how_to': 'adding step-by-step tutorials with practical examples',
    'industry': 'developing industry-specific use case content',
    'solution': 'creating problem-solution content with clear outcomes',
  }

  return advice[queryType] || 'creating more targeted content for this query type'
}

/**
 * Weekly model insights job
 */
export const weeklyModelInsights = inngest.createFunction(
  {
    id: 'weekly-model-insights',
    name: 'Weekly Model Insights',
  },
  { cron: '0 14 * * 0' }, // Sundays at 9 AM ET
  async ({ step }) => {
    // Get all active brands
    const brands = await step.run('get-brands', async () => {
      const { data } = await supabase
        .from('brands')
        .select('id')

      return data || []
    })

    if (brands.length === 0) {
      return { success: true, message: 'No brands', analyzed: 0 }
    }

    // Trigger analysis for each brand
    await step.sendEvent(
      'analyze-brands',
      brands.map(brand => ({
        name: 'model-insights/analyze' as const,
        data: { brandId: brand.id, days: 30 },
      }))
    )

    return {
      success: true,
      brandsAnalyzed: brands.length,
    }
  }
)
