import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'

interface RouteParams {
  params: Promise<{ brandId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params
  const supabase = await createClient()
  
  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify brand ownership
  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const body = await request.json()
  const { action } = body

  try {
    switch (action) {
      case 'extract_context':
        await inngest.send({
          name: 'context/extract',
          data: { brandId, domain: brand.domain },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Context extraction started' 
        })

      case 'discover_competitors':
        await inngest.send({
          name: 'competitor/discover',
          data: { brandId },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Competitor discovery started' 
        })

      case 'generate_queries':
        await inngest.send({
          name: 'query/generate',
          data: { brandId },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Query generation started' 
        })

      case 'run_scan':
        await inngest.send({
          name: 'scan/run',
          data: { brandId, queryIds: body.queryIds, autoGenerateMemos: true },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'AI search scan started' 
        })

      case 'generate_memo':
        if (!body.memoType) {
          return NextResponse.json({ error: 'memoType required' }, { status: 400 })
        }
        await inngest.send({
          name: 'memo/generate',
          data: { 
            brandId, 
            queryId: body.queryId,
            memoType: body.memoType,
          },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Memo generation started' 
        })

      case 'regenerate_memo': {
        // Regenerate an existing memo that may have failed
        if (!body.memoId) {
          return NextResponse.json({ error: 'memoId required' }, { status: 400 })
        }

        // Get the existing memo to find its details
        const { data: existingMemo, error: memoError } = await supabase
          .from('memos')
          .select('id, slug, memo_type, source_query_id')
          .eq('id', body.memoId)
          .eq('brand_id', brandId)
          .single()

        if (memoError || !existingMemo) {
          return NextResponse.json({ error: 'Memo not found' }, { status: 404 })
        }

        // Delete the existing memo so a new one can be generated with the same slug
        await supabase
          .from('memos')
          .delete()
          .eq('id', body.memoId)

        // Trigger new memo generation with the same type
        await inngest.send({
          name: 'memo/generate',
          data: { 
            brandId, 
            queryId: existingMemo.source_query_id,
            memoType: existingMemo.memo_type,
          },
        })

        return NextResponse.json({ 
          success: true, 
          message: 'Memo regeneration started. The page will update when complete.' 
        })
      }

      case 'full_setup':
        // Trigger the full setup pipeline
        await inngest.send({
          name: 'context/extract',
          data: { brandId, domain: brand.domain },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Full setup pipeline started' 
        })

      case 'run_daily':
        // Daily scan only - just run scans and generate memos for gaps
        await inngest.send({
          name: 'daily/brand-scan',
          data: { brandId },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Daily scan triggered (scan + auto memo generation)' 
        })

      case 'run_weekly':
        // Weekly update - discover new competitors, generate new queries, then scan
        await inngest.send({
          name: 'daily/brand-update',
          data: { brandId, discoverCompetitors: true, generateQueries: true },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Weekly update triggered (competitors → queries → scan)' 
        })

      case 'run_full_refresh':
        // Full refresh - re-extract context, discover competitors, generate queries, scan
        await inngest.send({
          name: 'daily/brand-full-refresh',
          data: { brandId },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Full refresh triggered (context → competitors → queries → scan)' 
        })

      case 'scan_and_generate':
        // Run scan with auto memo generation enabled
        await inngest.send({
          name: 'scan/run',
          data: { brandId, queryIds: body.queryIds, autoGenerateMemos: true },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Scan started with auto memo generation' 
        })

      case 'discovery_scan':
        // Discovery scan - find where brand IS being mentioned
        await inngest.send({
          name: 'discovery/scan',
          data: { brandId },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Discovery scan started - testing 50+ query variations to find brand mentions' 
        })

      case 'update_backlinks':
        // Batch update backlinks for all memos
        await inngest.send({
          name: 'memo/batch-backlink',
          data: { brandId },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Backlink update started for all memos' 
        })

      case 'sync_bing':
        // Sync Bing Webmaster data
        await inngest.send({
          name: 'bing/sync',
          data: { brandId },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Bing Webmaster sync started' 
        })

      case 'sync_google':
        // Sync Google Search Console data
        await inngest.send({
          name: 'google-search-console/sync',
          data: { brandId },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Google Search Console sync started' 
        })

      case 'content-scan':
        // Scan competitor content
        await inngest.send({
          name: 'competitor/content-scan',
          data: { brandId },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Competitor content scan started' 
        })

      case 'ai_overview_scan':
        // Scan Google AI Overviews (requires SERPAPI_KEY)
        await inngest.send({
          name: 'ai-overview/scan',
          data: { brandId, maxQueries: body.maxQueries || 10 },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Google AI Overview scan started (checking top queries)' 
        })

      case 'update_themes': {
        // Update prompt themes in brand context
        const currentContext = brand.context as Record<string, unknown> | null || {}
        const updatedContext = {
          ...currentContext,
          prompt_themes: body.themes || [],
        }
        
        const { error: updateError } = await supabase
          .from('brands')
          .update({
            context: updatedContext,
            updated_at: new Date().toISOString(),
          })
          .eq('id', brandId)
        
        if (updateError) {
          throw updateError
        }
        
        return NextResponse.json({ 
          success: true, 
          message: 'Themes updated' 
        })
      }

      case 'check_status': {
        // Check onboarding status - used by terminal to poll for completion
        const context = brand.context as Record<string, unknown> | null
        const hasContext = context && Object.keys(context).length > 0
        
        // Count competitors
        const { count: competitorCount } = await supabase
          .from('competitors')
          .select('*', { count: 'exact', head: true })
          .eq('brand_id', brandId)
          .eq('is_active', true)
        
        // Count queries
        const { count: queryCount } = await supabase
          .from('queries')
          .select('*', { count: 'exact', head: true })
          .eq('brand_id', brandId)
          .eq('is_active', true)
        
        // Count scans (last 90 days)
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
        const { count: scanCount } = await supabase
          .from('scan_results')
          .select('*', { count: 'exact', head: true })
          .eq('brand_id', brandId)
          .gte('scanned_at', ninetyDaysAgo.toISOString())
        
        // Build context summary if available
        let contextSummary = ''
        if (hasContext) {
          const products = (context.products as unknown[])?.length || 0
          const personas = (context.personas as unknown[])?.length || 0
          contextSummary = `${products} products, ${personas} personas detected`
        }
        
        return NextResponse.json({
          hasContext,
          hasCompetitors: (competitorCount || 0) > 0,
          hasQueries: (queryCount || 0) > 0,
          hasScans: (scanCount || 0) > 0,
          competitorCount: competitorCount || 0,
          queryCount: queryCount || 0,
          scanCount: scanCount || 0,
          contextSummary,
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Action error:', error)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}
