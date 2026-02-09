import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Get OpenRouter usage directly from their API
 * This shows ACTUAL spend, not just what we've logged
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Get URL params for date filtering
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '7')

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 })
  }

  try {
    // Fetch credits/usage from OpenRouter
    const creditsResponse = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!creditsResponse.ok) {
      throw new Error(`OpenRouter API error: ${creditsResponse.status}`)
    }

    const credits = await creditsResponse.json()

    // Fetch activity/generation history (if available)
    // Note: OpenRouter may have rate limits on this endpoint
    let activity: { data?: Array<{
      id: string
      model: string
      created_at: string
      generation_time: number
      tokens_prompt: number
      tokens_completion: number
      native_tokens_prompt?: number
      native_tokens_completion?: number
      total_cost: number
      usage?: number
    }> } = { data: [] }
    try {
      const activityResponse = await fetch('https://openrouter.ai/api/v1/activity', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })
      
      if (activityResponse.ok) {
        activity = await activityResponse.json()
      }
    } catch (e) {
      console.error('Failed to fetch OpenRouter activity:', e)
    }

    // Calculate usage breakdown by model
    const modelBreakdown: Record<string, { 
      count: number
      totalCost: number
      inputTokens: number
      outputTokens: number
    }> = {}
    
    // Calculate usage by day
    const dailyUsage: Record<string, { 
      count: number
      totalCost: number
    }> = {}

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    let totalCostInPeriod = 0
    let totalCallsInPeriod = 0

    if (activity.data) {
      for (const item of activity.data) {
        const itemDate = new Date(item.created_at)
        if (itemDate < cutoffDate) continue

        totalCallsInPeriod++
        totalCostInPeriod += item.total_cost || item.usage || 0

        // Model breakdown
        const model = item.model || 'unknown'
        if (!modelBreakdown[model]) {
          modelBreakdown[model] = { count: 0, totalCost: 0, inputTokens: 0, outputTokens: 0 }
        }
        modelBreakdown[model].count++
        modelBreakdown[model].totalCost += item.total_cost || item.usage || 0
        modelBreakdown[model].inputTokens += item.tokens_prompt || item.native_tokens_prompt || 0
        modelBreakdown[model].outputTokens += item.tokens_completion || item.native_tokens_completion || 0

        // Daily breakdown
        const day = itemDate.toISOString().split('T')[0]
        if (!dailyUsage[day]) {
          dailyUsage[day] = { count: 0, totalCost: 0 }
        }
        dailyUsage[day].count++
        dailyUsage[day].totalCost += item.total_cost || item.usage || 0
      }
    }

    // Sort model breakdown by cost
    const sortedModels = Object.entries(modelBreakdown)
      .map(([model, data]) => ({ model, ...data }))
      .sort((a, b) => b.totalCost - a.totalCost)

    // Sort daily usage by date
    const sortedDaily = Object.entries(dailyUsage)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const totalCredits = credits.data?.total_credits ?? 0
    const totalUsage = credits.data?.total_usage ?? 0

    return NextResponse.json({
      // Current balance info
      credits: {
        balance: totalCredits - totalUsage,
        usage: totalUsage,
        limit: totalCredits > 0 ? totalCredits : null,
      },
      
      // Usage in the specified period
      period: {
        days,
        totalCost: totalCostInPeriod,
        totalCalls: totalCallsInPeriod,
        avgCostPerCall: totalCallsInPeriod > 0 ? totalCostInPeriod / totalCallsInPeriod : 0,
      },
      
      // Breakdown by model
      byModel: sortedModels,
      
      // Breakdown by day
      byDay: sortedDaily,
      
      // Raw activity data (last 50 items for debugging)
      recentActivity: activity.data?.slice(0, 50) || [],
    })
  } catch (error) {
    console.error('Failed to fetch OpenRouter usage:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch OpenRouter usage',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
