import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { inngest } from '@/lib/inngest/client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET - Fetch lab runs and stats for a brand
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params
  
  try {
    // Get lab runs
    const { data: runs, error: runsError } = await supabase
      .from('prompt_lab_runs')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (runsError) {
      console.error('Error fetching lab runs:', runsError)
      // Table might not exist yet
      return NextResponse.json({ 
        runs: [], 
        modelComparison: [], 
        topEntities: [],
        message: 'Lab tables not yet created. Run the SQL migration first.',
      })
    }

    // Get model comparison stats
    const { data: modelComparison } = await supabase
      .from('lab_scan_results')
      .select('model, brand_cited, brand_mentioned')
      .eq('brand_id', brandId)

    // Calculate stats
    const modelStats: Record<string, { total: number; cited: number; mentioned: number }> = {}
    for (const row of (modelComparison || [])) {
      if (!modelStats[row.model]) {
        modelStats[row.model] = { total: 0, cited: 0, mentioned: 0 }
      }
      modelStats[row.model].total++
      if (row.brand_cited) modelStats[row.model].cited++
      if (row.brand_mentioned) modelStats[row.model].mentioned++
    }

    // Get top entities with prompt associations
    const { data: results } = await supabase
      .from('lab_scan_results')
      .select('entities_mentioned, prompt_text, brand_cited')
      .eq('brand_id', brandId)
      .not('entities_mentioned', 'is', null)
      .limit(2000)

    // Build entity stats with associated prompts
    const entityData: Record<string, { 
      count: number
      prompts: Set<string>
      promptsWhereBrandNotCited: Set<string>
    }> = {}
    
    for (const row of (results || [])) {
      for (const entity of (row.entities_mentioned || [])) {
        if (!entityData[entity]) {
          entityData[entity] = { count: 0, prompts: new Set(), promptsWhereBrandNotCited: new Set() }
        }
        entityData[entity].count++
        entityData[entity].prompts.add(row.prompt_text)
        if (!row.brand_cited) {
          entityData[entity].promptsWhereBrandNotCited.add(row.prompt_text)
        }
      }
    }
    
    const topEntities = Object.entries(entityData)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30)
      .map(([entity, data]) => ({ 
        entity, 
        count: data.count,
        promptCount: data.prompts.size,
        prompts: Array.from(data.prompts).slice(0, 10), // Top 10 prompts for this entity
        gapPrompts: Array.from(data.promptsWhereBrandNotCited).slice(0, 5), // Prompts where entity won but brand didn't
      }))

    // Get prompts with citation stats and full response data
    const { data: promptResults } = await supabase
      .from('lab_scan_results')
      .select('prompt_text, brand_cited, brand_mentioned, model, response_text, citations, entities_mentioned')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false })

    // Aggregate by prompt with response details
    const promptStats: Record<string, { 
      total: number
      cited: number
      mentioned: number
      responses: Array<{
        model: string
        response: string
        citations: string[]
        brandCited: boolean
        brandMentioned: boolean
        entities: string[]
      }>
    }> = {}
    
    for (const row of (promptResults || [])) {
      if (!promptStats[row.prompt_text]) {
        promptStats[row.prompt_text] = { total: 0, cited: 0, mentioned: 0, responses: [] }
      }
      promptStats[row.prompt_text].total++
      if (row.brand_cited) promptStats[row.prompt_text].cited++
      if (row.brand_mentioned) promptStats[row.prompt_text].mentioned++
      
      // Add response details (limit to avoid huge payloads)
      if (promptStats[row.prompt_text].responses.length < 4) {
        promptStats[row.prompt_text].responses.push({
          model: row.model,
          response: row.response_text?.substring(0, 1500) || '', // Truncate long responses
          citations: row.citations || [],
          brandCited: row.brand_cited,
          brandMentioned: row.brand_mentioned,
          entities: row.entities_mentioned || [],
        })
      }
    }

    const topPrompts = Object.entries(promptStats)
      .map(([prompt, stats]) => ({
        prompt,
        total: stats.total,
        cited: stats.cited,
        mentioned: stats.mentioned,
        citationRate: stats.total > 0 ? Math.round(100 * stats.cited / stats.total) : 0,
        responses: stats.responses,
      }))
      .sort((a, b) => b.citationRate - a.citationRate || b.cited - a.cited)
      .slice(0, 50)

    // Summary stats
    const totalScans = promptResults?.length || 0
    const totalCited = promptResults?.filter(r => r.brand_cited).length || 0
    const totalMentioned = promptResults?.filter(r => r.brand_mentioned).length || 0

    // Generate memo recommendations based on gaps
    const recommendations: Array<{
      type: 'comparison' | 'alternative' | 'how-to' | 'industry'
      title: string
      reason: string
      targetPrompts: string[]
      competingEntities: string[]
      priority: 'high' | 'medium' | 'low'
    }> = []

    // Find prompts where brand is NOT cited but competitors are winning
    const gapPrompts = topPrompts.filter(p => p.citationRate < 50 && p.total >= 2)
    
    // Get top competing entities (those mentioned most when brand isn't cited)
    const competitorWins = Object.entries(entityData)
      .filter(([entity]) => !entity.toLowerCase().includes('blog') && entity.length > 3)
      .sort((a, b) => b[1].promptsWhereBrandNotCited.size - a[1].promptsWhereBrandNotCited.size)
      .slice(0, 5)

    // Recommendation 1: Comparison memo against top competitor
    if (competitorWins.length > 0) {
      const topCompetitor = competitorWins[0]
      recommendations.push({
        type: 'comparison',
        title: `${topCompetitor[0].charAt(0).toUpperCase() + topCompetitor[0].slice(1)} vs [Your Brand] Comparison`,
        reason: `${topCompetitor[0]} appears in ${topCompetitor[1].count} responses where your brand isn't cited. A direct comparison memo could capture these queries.`,
        targetPrompts: Array.from(topCompetitor[1].promptsWhereBrandNotCited).slice(0, 3),
        competingEntities: [topCompetitor[0]],
        priority: 'high',
      })
    }

    // Recommendation 2: Alternative-to memo for second competitor
    if (competitorWins.length > 1) {
      const competitor = competitorWins[1]
      recommendations.push({
        type: 'alternative',
        title: `Best ${competitor[0].charAt(0).toUpperCase() + competitor[0].slice(1)} Alternatives`,
        reason: `${competitor[0]} wins ${competitor[1].promptsWhereBrandNotCited.size} prompts where you're not cited. Position as a strong alternative.`,
        targetPrompts: Array.from(competitor[1].promptsWhereBrandNotCited).slice(0, 3),
        competingEntities: [competitor[0]],
        priority: 'high',
      })
    }

    // Recommendation 3: How-to based on gap prompts
    const howToPrompts = gapPrompts.filter(p => 
      p.prompt.toLowerCase().includes('how') || 
      p.prompt.toLowerCase().includes('what should') ||
      p.prompt.toLowerCase().includes('best way')
    ).slice(0, 3)
    
    if (howToPrompts.length > 0) {
      recommendations.push({
        type: 'how-to',
        title: 'Practical Implementation Guide',
        reason: `${howToPrompts.length} "how-to" style prompts have low citation rates. A practical guide could capture these searches.`,
        targetPrompts: howToPrompts.map(p => p.prompt),
        competingEntities: competitorWins.slice(0, 3).map(c => c[0]),
        priority: 'medium',
      })
    }

    // Recommendation 4: Industry-specific memo based on verticals in prompts
    const industryKeywords = ['healthcare', 'pharmaceutical', 'biotech', 'food', 'senior living', 'retail', 'hospitality']
    const industryMentions: Record<string, string[]> = {}
    
    for (const p of gapPrompts) {
      for (const keyword of industryKeywords) {
        if (p.prompt.toLowerCase().includes(keyword)) {
          if (!industryMentions[keyword]) industryMentions[keyword] = []
          if (industryMentions[keyword].length < 3) {
            industryMentions[keyword].push(p.prompt)
          }
        }
      }
    }

    const topIndustry = Object.entries(industryMentions)
      .sort((a, b) => b[1].length - a[1].length)[0]
    
    if (topIndustry && topIndustry[1].length >= 2) {
      recommendations.push({
        type: 'industry',
        title: `${topIndustry[0].charAt(0).toUpperCase() + topIndustry[0].slice(1)} Industry Guide`,
        reason: `${topIndustry[1].length} ${topIndustry[0]} prompts have gaps. Industry-specific content could improve visibility.`,
        targetPrompts: topIndustry[1],
        competingEntities: competitorWins.slice(0, 2).map(c => c[0]),
        priority: 'medium',
      })
    }

    return NextResponse.json({
      runs: runs || [],
      modelComparison: Object.entries(modelStats).map(([model, stats]) => ({
        model,
        total: stats.total,
        cited: stats.cited,
        mentioned: stats.mentioned,
        citationRate: stats.total > 0 ? Math.round(100 * stats.cited / stats.total) : 0,
        mentionRate: stats.total > 0 ? Math.round(100 * stats.mentioned / stats.total) : 0,
      })),
      topEntities,
      topPrompts,
      recommendations,
      summary: {
        totalScans,
        totalCited,
        totalMentioned,
        citationRate: totalScans > 0 ? Math.round(100 * totalCited / totalScans) : 0,
      },
    })
  } catch (error) {
    console.error('Lab API error:', error)
    return NextResponse.json({ error: 'Failed to fetch lab data' }, { status: 500 })
  }
}

// POST - Start a new lab run or control existing run
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params
  
  try {
    const body = await request.json()
    const { action, labRunId, ...options } = body

    if (action === 'start') {
      // Start a new lab run
      const { durationMinutes = 60, budgetCents = 5000, modelsToUse } = options

      // Check if there's already a running lab
      const { data: running } = await supabase
        .from('prompt_lab_runs')
        .select('id')
        .eq('brand_id', brandId)
        .eq('status', 'running')
        .single()

      if (running) {
        return NextResponse.json({ 
          error: 'A lab run is already in progress',
          runningId: running.id,
        }, { status: 400 })
      }

      // Trigger the lab run via Inngest
      await inngest.send({
        name: 'prompt-lab/run',
        data: {
          brandId,
          durationMinutes,
          budgetCents,
          modelsToUse: modelsToUse || ['perplexity-sonar', 'gpt-4o-mini', 'claude-3-5-haiku', 'grok-4-fast'],
        },
      })

      return NextResponse.json({ 
        success: true, 
        message: `Lab run started. Duration: ${durationMinutes} minutes, Budget: $${(budgetCents / 100).toFixed(2)}`,
      })
    }

    if (action === 'stop' && labRunId) {
      // Stop a running lab
      await inngest.send({
        name: 'prompt-lab/stop',
        data: { labRunId },
      })

      // Also update directly in case Inngest is slow
      await supabase
        .from('prompt_lab_runs')
        .update({ status: 'stopped' })
        .eq('id', labRunId)

      return NextResponse.json({ success: true, message: 'Lab run stopped' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Lab API error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
