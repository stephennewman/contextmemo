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

    // Get top entities
    const { data: results } = await supabase
      .from('lab_scan_results')
      .select('entities_mentioned')
      .eq('brand_id', brandId)
      .not('entities_mentioned', 'is', null)
      .limit(1000)

    const entityCounts: Record<string, number> = {}
    for (const row of (results || [])) {
      for (const entity of (row.entities_mentioned || [])) {
        entityCounts[entity] = (entityCounts[entity] || 0) + 1
      }
    }
    const topEntities = Object.entries(entityCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([entity, count]) => ({ entity, count }))

    // Get prompts with citation stats
    const { data: promptResults } = await supabase
      .from('lab_scan_results')
      .select('prompt_text, brand_cited, brand_mentioned')
      .eq('brand_id', brandId)

    // Aggregate by prompt
    const promptStats: Record<string, { total: number; cited: number; mentioned: number }> = {}
    for (const row of (promptResults || [])) {
      if (!promptStats[row.prompt_text]) {
        promptStats[row.prompt_text] = { total: 0, cited: 0, mentioned: 0 }
      }
      promptStats[row.prompt_text].total++
      if (row.brand_cited) promptStats[row.prompt_text].cited++
      if (row.brand_mentioned) promptStats[row.prompt_text].mentioned++
    }

    const topPrompts = Object.entries(promptStats)
      .map(([prompt, stats]) => ({
        prompt,
        total: stats.total,
        cited: stats.cited,
        mentioned: stats.mentioned,
        citationRate: stats.total > 0 ? Math.round(100 * stats.cited / stats.total) : 0,
      }))
      .sort((a, b) => b.citationRate - a.citationRate || b.cited - a.cited)
      .slice(0, 50)

    // Summary stats
    const totalScans = promptResults?.length || 0
    const totalCited = promptResults?.filter(r => r.brand_cited).length || 0
    const totalMentioned = promptResults?.filter(r => r.brand_mentioned).length || 0

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
