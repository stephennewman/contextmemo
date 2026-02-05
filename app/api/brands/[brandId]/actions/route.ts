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
    .select('*, is_paused')
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
        // Scan competitor content (incremental)
        await inngest.send({
          name: 'competitor/content-scan',
          data: { brandId, retroactive: false },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Competitor content scan started' 
        })

      case 'content-backfill':
        // Backfill all historical competitor content
        await inngest.send({
          name: 'competitor/content-backfill',
          data: { brandId },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Historical content backfill started - fetching all available content from competitor feeds' 
        })

      case 'content-classify':
        // Classify competitor content and generate response memos
        await inngest.send({
          name: 'competitor/content-classify',
          data: { brandId },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Content classification started - will generate memos for respondable content' 
        })

      case 'content-generate':
        // Full content pipeline: scan → classify → generate memos
        // First trigger content scan, it will chain to classify → respond
        await inngest.send({
          name: 'competitor/content-scan',
          data: { brandId, retroactive: false },
        })
        // Also trigger classification for existing unclassified content
        await inngest.send({
          name: 'competitor/content-classify',
          data: { brandId },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Content generation pipeline started - scanning, classifying, and generating memos' 
        })

      case 'content-respond':
        // Just trigger memo generation for pending content
        await inngest.send({
          name: 'competitor/content-respond',
          data: { brandId },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Memo generation started for pending content' 
        })

      case 'generate-response': {
        // Generate a response for a specific competitor content item
        const { contentId } = body
        if (!contentId) {
          return NextResponse.json({ error: 'contentId required' }, { status: 400 })
        }

        // Verify content exists and belongs to this brand's competitors
        const { data: content, error: contentError } = await supabase
          .from('competitor_content')
          .select('*, competitor:competitor_id(brand_id)')
          .eq('id', contentId)
          .single()

        if (contentError || !content) {
          return NextResponse.json({ error: 'Content not found' }, { status: 404 })
        }

        const competitor = content.competitor as { brand_id: string } | null
        if (!competitor || competitor.brand_id !== brandId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Update status to pending_response so it gets picked up
        await supabase
          .from('competitor_content')
          .update({ status: 'pending_response' })
          .eq('id', contentId)

        // Trigger response generation
        await inngest.send({
          name: 'competitor/content-respond',
          data: { brandId, limit: 1 },
        })

        return NextResponse.json({ 
          success: true, 
          message: 'Response generation started for this content' 
        })
      }

      case 'skip-content': {
        // Skip a specific competitor content item
        const { contentId } = body
        if (!contentId) {
          return NextResponse.json({ error: 'contentId required' }, { status: 400 })
        }

        // Verify content exists and belongs to this brand's competitors
        const { data: content, error: contentError } = await supabase
          .from('competitor_content')
          .select('*, competitor:competitor_id(brand_id)')
          .eq('id', contentId)
          .single()

        if (contentError || !content) {
          return NextResponse.json({ error: 'Content not found' }, { status: 404 })
        }

        const competitor = content.competitor as { brand_id: string } | null
        if (!competitor || competitor.brand_id !== brandId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        // Mark as skipped
        await supabase
          .from('competitor_content')
          .update({ status: 'skipped' })
          .eq('id', contentId)

        return NextResponse.json({ 
          success: true, 
          message: 'Content skipped' 
        })
      }

      case 'add-feed': {
        // Manually add an RSS feed for a competitor
        const { competitorId, feedUrl } = body
        if (!competitorId || !feedUrl) {
          return NextResponse.json({ error: 'competitorId and feedUrl required' }, { status: 400 })
        }

        // Verify competitor belongs to this brand
        const { data: competitor } = await supabase
          .from('competitors')
          .select('id')
          .eq('id', competitorId)
          .eq('brand_id', brandId)
          .single()

        if (!competitor) {
          return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })
        }

        // Insert the feed
        const { error: feedError } = await supabase
          .from('competitor_feeds')
          .insert({
            competitor_id: competitorId,
            feed_url: feedUrl,
            feed_type: feedUrl.includes('atom') ? 'atom' : 'rss',
            is_active: true,
            is_manually_added: true,
          })

        if (feedError) {
          if (feedError.code === '23505') {
            return NextResponse.json({ error: 'This feed already exists' }, { status: 400 })
          }
          throw feedError
        }

        return NextResponse.json({ 
          success: true, 
          message: 'RSS feed added' 
        })
      }

      case 'remove-feed': {
        // Remove a manually-added RSS feed
        const { feedId } = body
        if (!feedId) {
          return NextResponse.json({ error: 'feedId required' }, { status: 400 })
        }

        // Only allow removing manually-added feeds, verify it belongs to a competitor of this brand
        const { data: feed } = await supabase
          .from('competitor_feeds')
          .select('id, competitor_id, is_manually_added')
          .eq('id', feedId)
          .single()

        if (!feed) {
          return NextResponse.json({ error: 'Feed not found' }, { status: 404 })
        }

        if (!feed.is_manually_added) {
          return NextResponse.json({ error: 'Cannot remove auto-discovered feeds' }, { status: 400 })
        }

        // Verify the competitor belongs to this brand
        const { data: feedCompetitor } = await supabase
          .from('competitors')
          .select('id')
          .eq('id', feed.competitor_id)
          .eq('brand_id', brandId)
          .single()

        if (!feedCompetitor) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        await supabase
          .from('competitor_feeds')
          .delete()
          .eq('id', feedId)

        return NextResponse.json({ 
          success: true, 
          message: 'Feed removed' 
        })
      }

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

      case 'add_prompt': {
        // Add a custom prompt/query
        const { query_text } = body
        if (!query_text || typeof query_text !== 'string') {
          return NextResponse.json({ error: 'query_text required' }, { status: 400 })
        }

        // Check for duplicates
        const { data: existingQuery } = await supabase
          .from('queries')
          .select('id')
          .eq('brand_id', brandId)
          .ilike('query_text', query_text.trim())
          .single()

        if (existingQuery) {
          return NextResponse.json({ error: 'This prompt already exists' }, { status: 400 })
        }

        // Insert the new query
        const { error: insertError } = await supabase
          .from('queries')
          .insert({
            brand_id: brandId,
            query_text: query_text.trim(),
            query_type: 'custom',
            priority: 5,
            is_active: true,
          })

        if (insertError) {
          throw insertError
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Prompt added' 
        })
      }

      case 'delete_memo': {
        // Delete a memo
        const { memoId } = body
        if (!memoId) {
          return NextResponse.json({ error: 'memoId required' }, { status: 400 })
        }

        // Verify memo belongs to this brand
        const { data: memoToDelete, error: memoFetchError } = await supabase
          .from('memos')
          .select('id')
          .eq('id', memoId)
          .eq('brand_id', brandId)
          .single()

        if (memoFetchError || !memoToDelete) {
          return NextResponse.json({ error: 'Memo not found' }, { status: 404 })
        }

        const { error: deleteError } = await supabase
          .from('memos')
          .delete()
          .eq('id', memoId)

        if (deleteError) {
          throw deleteError
        }

        return NextResponse.json({ 
          success: true, 
          message: 'Memo deleted' 
        })
      }

      case 'pause': {
        // Pause a brand - stops all automated workflows
        const { error: pauseError } = await supabase
          .from('brands')
          .update({ is_paused: true, updated_at: new Date().toISOString() })
          .eq('id', brandId)

        if (pauseError) throw pauseError

        return NextResponse.json({ 
          success: true, 
          message: 'Brand paused - all automated workflows stopped',
          is_paused: true,
        })
      }

      case 'unpause': {
        // Unpause a brand - resumes automated workflows
        const { error: unpauseError } = await supabase
          .from('brands')
          .update({ is_paused: false, updated_at: new Date().toISOString() })
          .eq('id', brandId)

        if (unpauseError) throw unpauseError

        return NextResponse.json({ 
          success: true, 
          message: 'Brand unpaused - automated workflows resumed',
          is_paused: false,
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
          brandName: brand.name,
          isPaused: brand.is_paused || false,
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
