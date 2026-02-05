import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params

    // Get brand details
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, name, created_at, visibility_score')
      .eq('id', brandId)
      .single()

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Calculate days active
    const daysActive = Math.floor(
      (Date.now() - new Date(brand.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    // Get prompt count
    const { count: totalPrompts } = await supabase
      .from('queries')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)

    // Get gaps (prompts where brand is not mentioned)
    const { data: recentScans } = await supabase
      .from('scan_results')
      .select('query_id, brand_mentioned')
      .eq('brand_id', brandId)
      .gte('scanned_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    // Group by query and check if any scan had brand mentioned
    const queryMentions = new Map<string, boolean>()
    recentScans?.forEach(scan => {
      const current = queryMentions.get(scan.query_id) || false
      queryMentions.set(scan.query_id, current || scan.brand_mentioned)
    })
    
    const gapsIdentified = Array.from(queryMentions.values()).filter(mentioned => !mentioned).length

    // Get memo count
    const { count: memosGenerated } = await supabase
      .from('memos')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)

    // Get AI traffic if available (from ai_traffic table)
    const { data: aiTraffic } = await supabase
      .from('ai_traffic')
      .select('visits')
      .eq('brand_id', brandId)
      .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])

    const aiTrafficVisits = aiTraffic?.reduce((sum, row) => sum + (row.visits || 0), 0) || 0

    // Get competitor count
    const { count: competitorCount } = await supabase
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId)

    // Determine current phase
    let currentPhase = 'discovery'
    if (daysActive >= 120 && memosGenerated! >= 30) {
      currentPhase = 'scale'
    } else if (daysActive >= 56 && memosGenerated! >= 20) {
      currentPhase = 'optimization'
    } else if (daysActive >= 28 && memosGenerated! >= 10) {
      currentPhase = 'foundation'
    }

    // Calculate progress for current phase
    let phaseProgress = 0
    switch (currentPhase) {
      case 'discovery':
        // Progress based on prompts discovered (target: 100)
        phaseProgress = Math.min(100, ((totalPrompts || 0) / 100) * 100)
        break
      case 'foundation':
        // Progress based on memos generated (target: 30)
        phaseProgress = Math.min(100, ((memosGenerated || 0) / 30) * 100)
        break
      case 'optimization':
        // Progress based on visibility score (target: 50%)
        phaseProgress = Math.min(100, (brand.visibility_score || 0) * 2)
        break
      case 'scale':
        // Progress based on maintaining 60%+ visibility
        phaseProgress = brand.visibility_score >= 60 ? 100 : (brand.visibility_score / 60) * 100
        break
    }

    return NextResponse.json({
      brandId,
      brandName: brand.name,
      metrics: {
        totalPrompts: totalPrompts || 0,
        gapsIdentified,
        memosGenerated: memosGenerated || 0,
        visibilityScore: brand.visibility_score || 0,
        aiTrafficVisits,
        daysActive,
        competitorCount: competitorCount || 0,
      },
      currentPhase,
      phaseProgress: Math.round(phaseProgress),
      recommendations: getRecommendations(currentPhase, {
        totalPrompts: totalPrompts || 0,
        gapsIdentified,
        memosGenerated: memosGenerated || 0,
        visibilityScore: brand.visibility_score || 0,
      }),
    })
  } catch (error) {
    console.error('Strategy API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getRecommendations(
  phase: string,
  metrics: {
    totalPrompts: number
    gapsIdentified: number
    memosGenerated: number
    visibilityScore: number
  }
): string[] {
  const recommendations: string[] = []

  switch (phase) {
    case 'discovery':
      if (metrics.totalPrompts < 50) {
        recommendations.push('Generate more prompts to expand your coverage map')
      }
      if (metrics.gapsIdentified > 0) {
        recommendations.push(`You have ${metrics.gapsIdentified} gaps to address`)
      }
      recommendations.push('Run a baseline scan across all models to establish visibility')
      break

    case 'foundation':
      if (metrics.memosGenerated < 10) {
        recommendations.push('Generate memos for your highest-priority gaps')
      }
      if (metrics.gapsIdentified > 20) {
        recommendations.push('Focus on the top 20 gaps with competitor presence')
      }
      recommendations.push('Create comparison content against top competitors')
      break

    case 'optimization':
      if (metrics.visibilityScore < 40) {
        recommendations.push('Refine existing memos with more specific data and examples')
      }
      recommendations.push('Monitor weekly to track visibility improvements')
      recommendations.push('Generate responses to new competitor content')
      break

    case 'scale':
      recommendations.push('Maintain weekly monitoring cadence')
      recommendations.push('Continue discovering new prompts (5-10/week)')
      recommendations.push('Keep content fresh with current year references')
      break
  }

  return recommendations
}
