/**
 * Prompt Intelligence Feed
 * 
 * Tracks and analyzes:
 * - Trending prompts in your industry (from scan data)
 * - Which prompts competitors are winning
 * - Emerging query patterns to target
 * - Prompt effectiveness over time
 */

import { inngest } from '../client'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { canBrandSpend } from '@/lib/utils/budget-guard'
import { logSingleUsage, normalizeModelId } from '@/lib/utils/usage-logger'

const supabase = createServiceRoleClient()

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

interface PromptIntelligence {
  id?: string
  brand_id: string
  category: 'trending' | 'competitor_win' | 'emerging' | 'declining'
  prompt_text: string
  insight_title: string
  insight_description: string
  competitors_winning: string[]
  opportunity_score: number // 0-100
  action_suggestion: string
  metadata: Record<string, unknown>
  created_at?: string
}

interface CompetitorWinAnalysis {
  competitor: string
  winningPrompts: string[]
  commonPatterns: string[]
  contentTypes: string[]
}

/**
 * Analyze prompt trends and competitor wins
 */
export const analyzePromptIntelligence = inngest.createFunction(
  {
    id: 'analyze-prompt-intelligence',
    name: 'Analyze Prompt Intelligence',
    concurrency: { limit: 2 },
  },
  { event: 'prompt-intelligence/analyze' },
  async ({ event, step }) => {
    const { brandId, days = 14 } = event.data

    // Budget check
    const canSpend = await step.run('check-budget', async () => canBrandSpend(brandId))
    if (!canSpend) {
      return { success: true, skipped: true, reason: 'budget_exceeded' }
    }

    // Get brand info
    const brand = await step.run('get-brand', async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (error || !data) throw new Error('Brand not found')
      return data
    })

    // Get recent scans with query details
    const scans = await step.run('get-scans', async () => {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      const { data } = await supabase
        .from('scan_results')
        .select(`
          id,
          model,
          brand_mentioned,
          brand_in_citations,
          competitors_mentioned,
          scanned_at,
          query:query_id(id, query_text, query_type)
        `)
        .eq('brand_id', brandId)
        .gte('scanned_at', startDate)
        .order('scanned_at', { ascending: false })

      return data || []
    })

    if (scans.length < 10) {
      return { success: false, message: 'Insufficient scan data for analysis' }
    }

    // Analyze competitor wins
    const competitorWins = await step.run('analyze-competitor-wins', async () => {
      const wins: Record<string, {
        prompts: string[]
        scanCount: number
        citationCount: number
      }> = {}

      for (const scan of scans) {
        // Scans where brand wasn't cited but competitors were mentioned
        if (!scan.brand_in_citations && scan.competitors_mentioned?.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const queryText = (scan as any).query?.query_text as string | undefined
          if (!queryText) continue

          for (const competitor of scan.competitors_mentioned) {
            if (!wins[competitor]) {
              wins[competitor] = { prompts: [], scanCount: 0, citationCount: 0 }
            }
            wins[competitor].scanCount++
            if (!wins[competitor].prompts.includes(queryText)) {
              wins[competitor].prompts.push(queryText)
            }
          }
        }
      }

      return Object.entries(wins)
        .map(([competitor, data]) => ({
          competitor,
          winningPrompts: data.prompts.slice(0, 10),
          scanCount: data.scanCount,
        }))
        .sort((a, b) => b.scanCount - a.scanCount)
        .slice(0, 5) // Top 5 winning competitors
    })

    // Identify emerging patterns (prompts with increasing competitor mentions)
    const emergingPatterns = await step.run('identify-emerging', async () => {
      // Group by query and track trends
      const queryStats: Record<string, {
        text: string
        type: string
        recentMentions: number
        olderMentions: number
        competitorWins: number
      }> = {}

      const midpoint = new Date(Date.now() - (days / 2) * 24 * 60 * 60 * 1000)

      for (const scan of scans) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query = (scan as any).query as { id: string; query_text: string; query_type: string } | null
        if (!query?.id) continue

        if (!queryStats[query.id]) {
          queryStats[query.id] = {
            text: query.query_text,
            type: query.query_type,
            recentMentions: 0,
            olderMentions: 0,
            competitorWins: 0,
          }
        }

        const scanDate = new Date(scan.scanned_at)
        if (scanDate > midpoint) {
          queryStats[query.id].recentMentions++
        } else {
          queryStats[query.id].olderMentions++
        }

        if (!scan.brand_in_citations && scan.competitors_mentioned?.length > 0) {
          queryStats[query.id].competitorWins++
        }
      }

      // Find emerging patterns (more recent activity, competitors winning)
      return Object.values(queryStats)
        .filter(q => q.recentMentions > q.olderMentions && q.competitorWins > 0)
        .sort((a, b) => b.competitorWins - a.competitorWins)
        .slice(0, 10)
    })

    // Generate AI-powered insights
    const aiInsights = await step.run('generate-ai-insights', async () => {
      const competitorWinSummary = competitorWins
        .map(c => `- ${c.competitor}: winning on "${c.winningPrompts.slice(0, 3).join('", "')}"`)
        .join('\n')

      const emergingSummary = emergingPatterns
        .map(p => `- "${p.text}" (${p.competitorWins} competitor wins)`)
        .join('\n')

      const prompt = `Analyze these AI search patterns for "${brand.name}" and provide strategic insights:

COMPETITOR WINS (prompts where competitors are cited but ${brand.name} isn't):
${competitorWinSummary || 'No significant competitor wins detected'}

EMERGING PATTERNS (increasing activity, competitors winning):
${emergingSummary || 'No emerging patterns detected'}

BRAND CONTEXT:
- Industry: ${brand.context?.markets?.join(', ') || 'Unknown'}
- Products: ${brand.context?.products?.join(', ') || 'Unknown'}

Provide 3-5 strategic insights in JSON format:
{
  "insights": [
    {
      "title": "Brief insight title",
      "description": "Detailed explanation of the opportunity",
      "competitors": ["competitor1", "competitor2"],
      "opportunity_score": 75,
      "action": "Specific action to take"
    }
  ]
}`

      try {
        const { text, usage } = await generateText({
          model: openrouter('openai/gpt-4o-mini'),
          prompt,
          temperature: 0.5,
        })

        // Log usage
        await logSingleUsage(
          brand.tenant_id, brandId, 'prompt_intelligence',
          normalizeModelId('openai/gpt-4o-mini'),
          usage?.promptTokens || 0, usage?.completionTokens || 0
        )

        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]).insights || []
        }
      } catch (e) {
        console.error('AI insights generation failed:', e)
      }

      return []
    })

    // Save intelligence items
    const intelligenceItems: PromptIntelligence[] = []

    // Add competitor win insights
    for (const win of competitorWins) {
      intelligenceItems.push({
        brand_id: brandId,
        category: 'competitor_win',
        prompt_text: win.winningPrompts[0] || '',
        insight_title: `${win.competitor} Winning on ${win.scanCount} Prompts`,
        insight_description: `${win.competitor} is being cited instead of you on prompts like: "${win.winningPrompts.slice(0, 3).join('", "')}"`,
        competitors_winning: [win.competitor],
        opportunity_score: Math.min(90, 50 + win.scanCount * 5),
        action_suggestion: `Create content targeting: ${win.winningPrompts[0]}`,
        metadata: { all_prompts: win.winningPrompts, scan_count: win.scanCount },
      })
    }

    // Add emerging pattern insights
    for (const pattern of emergingPatterns.slice(0, 5)) {
      intelligenceItems.push({
        brand_id: brandId,
        category: 'emerging',
        prompt_text: pattern.text,
        insight_title: `Emerging Query: "${pattern.text.slice(0, 50)}..."`,
        insight_description: `This ${pattern.type} query is seeing increased activity with ${pattern.competitorWins} competitor wins.`,
        competitors_winning: [],
        opportunity_score: Math.min(85, 40 + pattern.competitorWins * 10),
        action_suggestion: `Create targeted content for this emerging query before competitors dominate`,
        metadata: { query_type: pattern.type, competitor_wins: pattern.competitorWins },
      })
    }

    // Add AI-generated insights
    for (const insight of aiInsights) {
      intelligenceItems.push({
        brand_id: brandId,
        category: 'trending',
        prompt_text: '',
        insight_title: insight.title,
        insight_description: insight.description,
        competitors_winning: insight.competitors || [],
        opportunity_score: insight.opportunity_score || 70,
        action_suggestion: insight.action,
        metadata: { ai_generated: true },
      })
    }

    // Save to database
    if (intelligenceItems.length > 0) {
      await step.run('save-intelligence', async () => {
        await supabase.from('prompt_intelligence').insert(intelligenceItems)
      })

      // Create summary alert
      await step.run('create-alert', async () => {
        const topOpportunity = intelligenceItems.sort((a, b) => b.opportunity_score - a.opportunity_score)[0]
        
        await supabase.from('alerts').insert({
          brand_id: brandId,
          alert_type: 'prompt_intelligence',
          title: 'New Prompt Intelligence',
          message: `Found ${intelligenceItems.length} insights. Top opportunity: ${topOpportunity.insight_title}`,
          data: {
            total_insights: intelligenceItems.length,
            competitor_wins: competitorWins.length,
            emerging_patterns: emergingPatterns.length,
            top_opportunity: topOpportunity,
          },
        })
      })
    }

    return {
      success: true,
      scansAnalyzed: scans.length,
      competitorWins: competitorWins.length,
      emergingPatterns: emergingPatterns.length,
      insightsGenerated: intelligenceItems.length,
    }
  }
)

/**
 * Get prompt intelligence feed for a brand
 */
export const getPromptIntelligenceFeed = inngest.createFunction(
  {
    id: 'get-prompt-intelligence-feed',
    name: 'Get Prompt Intelligence Feed',
  },
  { event: 'prompt-intelligence/get-feed' },
  async ({ event, step }) => {
    const { brandId, limit = 20, category } = event.data

    const feed = await step.run('get-feed', async () => {
      let query = supabase
        .from('prompt_intelligence')
        .select('*')
        .eq('brand_id', brandId)
        .order('opportunity_score', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)

      if (category) {
        query = query.eq('category', category)
      }

      const { data } = await query
      return data || []
    })

    return { success: true, feed }
  }
)

/**
 * Weekly prompt intelligence analysis
 */
export const weeklyPromptIntelligence = inngest.createFunction(
  {
    id: 'weekly-prompt-intelligence',
    name: 'Weekly Prompt Intelligence',
  },
  { cron: '0 15 * * 1' }, // Mondays at 10 AM ET
  async ({ step }) => {
    // Get all active brands with enough scan data
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
        name: 'prompt-intelligence/analyze' as const,
        data: { brandId: brand.id, days: 14 },
      }))
    )

    return {
      success: true,
      brandsAnalyzed: brands.length,
    }
  }
)
