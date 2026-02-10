import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'


const supabase = await createClient()

interface ExportParams {
  params: Promise<{ brandId: string }>
}

export async function GET(request: NextRequest, { params }: ExportParams) {
  const { brandId } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(brandId)) {
    return NextResponse.json({ error: 'Invalid brandId' }, { status: 400 })
  }

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('id, tenant_id, organization_id')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  let hasAccess = brand.tenant_id === user.id
  if (!hasAccess && brand.organization_id) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', brand.organization_id)
      .eq('user_id', user.id)
      .single()
    hasAccess = !!membership
  }

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const type = searchParams.get('type') || 'scans' // scans, prompts, memos, competitors
  const format = searchParams.get('format') || 'csv' // csv, json
  const rawDays = parseInt(searchParams.get('days') || '90')
  const days = Number.isNaN(rawDays) ? 90 : Math.min(Math.max(rawDays, 1), 365)

  // Calculate date range
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  let data: Record<string, unknown>[] = []
  let filename = ''

  try {
    switch (type) {
      case 'scans': {
        const { data: scans, error } = await supabase
          .from('scan_results')
          .select(`
            id,
            model,
            brand_mentioned,
            brand_position,
            brand_context,
            competitors_mentioned,
            citations,
            brand_in_citations,
            scanned_at,
            query:query_id(query_text, query_type, persona)
          `)
          .eq('brand_id', brandId)
          .gte('scanned_at', startDate.toISOString())
          .order('scanned_at', { ascending: false })

        if (error) throw error

        // Flatten the data for export
        data = (scans || []).map(scan => ({
          scan_id: scan.id,
          query_text: (scan.query as { query_text?: string })?.query_text || '',
          query_type: (scan.query as { query_type?: string })?.query_type || '',
          persona: (scan.query as { persona?: string })?.persona || '',
          model: scan.model,
          brand_mentioned: scan.brand_mentioned,
          brand_position: scan.brand_position,
          brand_context: scan.brand_context,
          competitors_mentioned: Array.isArray(scan.competitors_mentioned) 
            ? scan.competitors_mentioned.join(', ') 
            : '',
          citations: Array.isArray(scan.citations) 
            ? scan.citations.join(', ') 
            : '',
          brand_in_citations: scan.brand_in_citations,
          scanned_at: scan.scanned_at,
        }))
        filename = `scans-${brandId}-${days}days`
        break
      }

      case 'prompts': {
        const { data: prompts, error } = await supabase
          .from('queries')
          .select(`
            id,
            query_text,
            query_type,
            persona,
            priority,
            is_active,
            auto_discovered,
            created_at,
            competitor:related_competitor_id(name)
          `)
          .eq('brand_id', brandId)
          .order('priority', { ascending: false })

        if (error) throw error

        // Calculate visibility for each prompt from recent scans
        const { data: recentScans } = await supabase
          .from('scan_results')
          .select('query_id, brand_mentioned')
          .eq('brand_id', brandId)
          .gte('scanned_at', startDate.toISOString())

        const visibilityByQuery = new Map<string, { mentioned: number; total: number }>()
        ;(recentScans || []).forEach(scan => {
          const current = visibilityByQuery.get(scan.query_id) || { mentioned: 0, total: 0 }
          current.total++
          if (scan.brand_mentioned) current.mentioned++
          visibilityByQuery.set(scan.query_id, current)
        })

        data = (prompts || []).map(prompt => {
          const stats = visibilityByQuery.get(prompt.id)
          const visibility = stats && stats.total > 0 
            ? Math.round((stats.mentioned / stats.total) * 100) 
            : null
          return {
            prompt_id: prompt.id,
            query_text: prompt.query_text,
            query_type: prompt.query_type,
            persona: prompt.persona,
            related_competitor: (prompt.competitor as { name?: string })?.name || '',
            priority: prompt.priority,
            is_active: prompt.is_active,
            auto_discovered: prompt.auto_discovered,
            visibility_percent: visibility,
            total_scans: stats?.total || 0,
            brand_mentions: stats?.mentioned || 0,
            created_at: prompt.created_at,
          }
        })
        filename = `prompts-${brandId}`
        break
      }

      case 'memos': {
        const { data: memos, error } = await supabase
          .from('memos')
          .select('*')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false })

        if (error) throw error

        data = (memos || []).map(memo => ({
          memo_id: memo.id,
          title: memo.title,
          slug: memo.slug,
          memo_type: memo.memo_type,
          status: memo.status,
          meta_description: memo.meta_description,
          version: memo.version,
          verified_accurate: memo.verified_accurate,
          published_at: memo.published_at,
          created_at: memo.created_at,
          updated_at: memo.updated_at,
        }))
        filename = `memos-${brandId}`
        break
      }

      case 'competitors': {
        const { data: competitors, error } = await supabase
          .from('competitors')
          .select('*')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Calculate share of voice from recent scans
        const { data: recentScans } = await supabase
          .from('scan_results')
          .select('competitors_mentioned')
          .eq('brand_id', brandId)
          .gte('scanned_at', startDate.toISOString())

        const mentionCounts = new Map<string, number>()
        let totalScans = 0
        ;(recentScans || []).forEach(scan => {
          totalScans++
          const mentioned = scan.competitors_mentioned as string[] | null
          if (mentioned) {
            mentioned.forEach(name => {
              const lower = name.toLowerCase()
              mentionCounts.set(lower, (mentionCounts.get(lower) || 0) + 1)
            })
          }
        })

        data = (competitors || []).map(comp => {
          const mentions = mentionCounts.get(comp.name.toLowerCase()) || 0
          const shareOfVoice = totalScans > 0 ? Math.round((mentions / totalScans) * 100) : 0
          return {
            competitor_id: comp.id,
            name: comp.name,
            domain: comp.domain,
            description: comp.description,
            is_active: comp.is_active,
            auto_discovered: comp.auto_discovered,
            share_of_voice_percent: shareOfVoice,
            mention_count: mentions,
            total_scans: totalScans,
            created_at: comp.created_at,
          }
        })
        filename = `competitors-${brandId}`
        break
      }

      case 'visibility': {
        // Export visibility history over time
        const { data: history, error } = await supabase
          .from('visibility_history')
          .select('*')
          .eq('brand_id', brandId)
          .gte('recorded_at', startDate.toISOString())
          .order('recorded_at', { ascending: true })

        if (error) throw error

        data = (history || []).map(h => ({
          date: h.recorded_date,
          visibility_score: h.visibility_score,
          total_scans: h.total_scans,
          brand_mentions: h.brand_mentions,
          recorded_at: h.recorded_at,
        }))
        filename = `visibility-${brandId}-${days}days`
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    if (format === 'json') {
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      })
    }

    // CSV format
    if (data.length === 0) {
      return new NextResponse('No data to export', {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })
    }

    // Get headers from first row
    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header]
          // Escape quotes and wrap in quotes if contains comma or quote
          if (value === null || value === undefined) return ''
          const str = String(value)
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        }).join(',')
      )
    ]

    return new NextResponse(csvRows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    })

  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
