import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { inngest } from '@/lib/inngest/client'
import { isValidUUID, validateURL, sanitizeTextInput, validateUUIDArray, validatePositiveInt } from '@/lib/security/validation'

interface RouteParams {
  params: Promise<{ brandId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params
  
  // Validate brandId is a proper UUID
  if (!isValidUUID(brandId)) {
    return NextResponse.json({ error: 'Invalid brand ID format' }, { status: 400 })
  }

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

  // Validate action is a string
  if (typeof action !== 'string') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

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

      case 'run_scan': {
        // Validate queryIds if provided
        const validQueryIds = body.queryIds ? validateUUIDArray(body.queryIds) : undefined
        await inngest.send({
          name: 'scan/run',
          data: { brandId, queryIds: validQueryIds, autoGenerateMemos: true },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'AI search scan started' 
        })
      }

      case 'generate_memo': {
        if (!body.memoType) {
          return NextResponse.json({ error: 'memoType required' }, { status: 400 })
        }
        // Validate memoType is one of allowed values
        const allowedMemoTypes = ['comparison', 'industry', 'how_to', 'alternative', 'response'] as const
        if (!allowedMemoTypes.includes(body.memoType)) {
          return NextResponse.json({ error: 'Invalid memoType' }, { status: 400 })
        }
        // Validate queryId if provided
        if (body.queryId && !isValidUUID(body.queryId)) {
          return NextResponse.json({ error: 'Invalid queryId format' }, { status: 400 })
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
      }

      case 'regenerate_memo': {
        // Regenerate an existing memo that may have failed
        if (!body.memoId) {
          return NextResponse.json({ error: 'memoId required' }, { status: 400 })
        }

        // Validate memoId is a proper UUID
        if (!isValidUUID(body.memoId)) {
          return NextResponse.json({ error: 'Invalid memoId format' }, { status: 400 })
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

      case 'scan_and_generate': {
        // Run scan with auto memo generation enabled
        const validScanQueryIds = body.queryIds ? validateUUIDArray(body.queryIds) : undefined
        await inngest.send({
          name: 'scan/run',
          data: { brandId, queryIds: validScanQueryIds, autoGenerateMemos: true },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Scan started with auto memo generation' 
        })
      }

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

        // Validate contentId is a proper UUID
        if (!isValidUUID(contentId)) {
          return NextResponse.json({ error: 'Invalid contentId format' }, { status: 400 })
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

        // Validate contentId is a proper UUID
        if (!isValidUUID(contentId)) {
          return NextResponse.json({ error: 'Invalid contentId format' }, { status: 400 })
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

        // Validate competitorId is a proper UUID
        if (!isValidUUID(competitorId)) {
          return NextResponse.json({ error: 'Invalid competitorId format' }, { status: 400 })
        }

        // Validate feedUrl is a proper URL
        const validatedFeedUrl = validateURL(feedUrl)
        if (!validatedFeedUrl) {
          return NextResponse.json({ error: 'Invalid feed URL format' }, { status: 400 })
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

        // Insert the feed (use validated URL)
        const { error: feedError } = await supabase
          .from('competitor_feeds')
          .insert({
            competitor_id: competitorId,
            feed_url: validatedFeedUrl,
            feed_type: validatedFeedUrl.includes('atom') ? 'atom' : 'rss',
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

        // Validate feedId is a proper UUID
        if (!isValidUUID(feedId)) {
          return NextResponse.json({ error: 'Invalid feedId format' }, { status: 400 })
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

      case 'ai_overview_scan': {
        // Scan Google AI Overviews (requires SERPAPI_KEY)
        // Validate maxQueries if provided (must be 1-100)
        const maxQueries = validatePositiveInt(body.maxQueries, 1, 100) ?? 10
        await inngest.send({
          name: 'ai-overview/scan',
          data: { brandId, maxQueries },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Google AI Overview scan started (checking top queries)' 
        })
      }

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
        
        // Validate and sanitize the query text
        const sanitizedQueryText = sanitizeTextInput(query_text, 500)
        if (!sanitizedQueryText) {
          return NextResponse.json({ error: 'query_text must be between 1 and 500 characters' }, { status: 400 })
        }

        // Check for duplicates (use sanitized text)
        const { data: existingQuery } = await supabase
          .from('queries')
          .select('id')
          .eq('brand_id', brandId)
          .ilike('query_text', sanitizedQueryText)
          .single()

        if (existingQuery) {
          return NextResponse.json({ error: 'This prompt already exists' }, { status: 400 })
        }

        // Insert the new query (use sanitized text)
        const { error: insertError } = await supabase
          .from('queries')
          .insert({
            brand_id: brandId,
            query_text: sanitizedQueryText,
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

        // Validate memoId is a proper UUID
        if (!isValidUUID(memoId)) {
          return NextResponse.json({ error: 'Invalid memoId format' }, { status: 400 })
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
        // Check for actual extracted context (not just the search_console config set at creation)
        const hasContext = context && !!(
          context.company_name || context.description || 
          (Array.isArray(context.products) && context.products.length > 0)
        )
        
        // Count queries, scans, memos in parallel
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
        
        const [
          { count: queryCount },
          { data: scanData },
          { count: memoCount },
          { data: competitorData },
        ] = await Promise.all([
          supabase
            .from('queries')
            .select('*', { count: 'exact', head: true })
            .eq('brand_id', brandId)
            .eq('is_active', true),
          supabase
            .from('scan_results')
            .select('brand_mentioned, brand_in_citations, citations, competitors_mentioned')
            .eq('brand_id', brandId)
            .gte('scanned_at', ninetyDaysAgo.toISOString()),
          supabase
            .from('memos')
            .select('*', { count: 'exact', head: true })
            .eq('brand_id', brandId),
          supabase
            .from('competitors')
            .select('name, domain')
            .eq('brand_id', brandId),
        ])
        
        const scanCount = scanData?.length || 0
        
        // Build context summary if available
        let contextSummary = ''
        if (hasContext) {
          const products = (context.products as unknown[])?.length || 0
          const personas = (context.personas as unknown[])?.length || 0
          contextSummary = `${products} products, ${personas} personas detected`
        }
        
        // Build scan summary if scans exist
        let scanSummary = null
        if (scanData && scanData.length > 0) {
          const mentioned = scanData.filter(s => s.brand_mentioned).length
          const withCitations = scanData.filter(s => s.citations && (s.citations as string[]).length > 0).length
          const brandCited = scanData.filter(s => s.brand_in_citations).length
          
          // Count unique cited domains
          const domainCounts = new Map<string, number>()
          for (const scan of scanData) {
            for (const url of (scan.citations as string[] || [])) {
              try {
                const domain = new URL(url).hostname.replace(/^www\./, '')
                domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)
              } catch { /* skip bad URLs */ }
            }
          }
          const topDomains = [...domainCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([domain, count]) => ({ domain, count }))
          
          // Count gaps (queries where brand never mentioned)
          const queryMentionMap = new Map<string, boolean>()
          // We don't have query_id in this lightweight query, so estimate from mention rate
          const gapEstimate = Math.round(scanCount * (1 - mentioned / scanCount))
          
          scanSummary = {
            totalScans: scanCount,
            mentionRate: Math.round((mentioned / scanCount) * 100),
            citationRate: withCitations > 0 ? Math.round((brandCited / withCitations) * 100) : 0,
            mentioned,
            brandCited,
            gapEstimate,
            totalCitations: scanData.reduce((sum, s) => sum + ((s.citations as string[])?.length || 0), 0),
            uniqueDomains: domainCounts.size,
            topDomains,
          }
        }
        
        return NextResponse.json({
          brandName: brand.name,
          isPaused: brand.is_paused || false,
          hasContext,
          hasQueries: (queryCount || 0) > 0,
          hasScans: scanCount > 0,
          queryCount: queryCount || 0,
          scanCount,
          contextSummary,
          memoCount: memoCount || 0,
          competitorCount: competitorData?.length || 0,
          competitors: (competitorData || []).slice(0, 5).map(c => c.name),
          scanSummary,
        })
      }

      case 'hubspot-resync-all': {
        // Bulk resync all memos to HubSpot (updates images, content, author)
        const { getHubSpotToken } = await import('@/lib/hubspot/oauth')
        const { sanitizeContentForHubspot, formatHtmlForHubspot } = await import('@/lib/hubspot/content-sanitizer')
        const { selectImageForMemo } = await import('@/lib/hubspot/image-selector')
        const { marked } = await import('marked')
        
        const hubspotConfig = (brand.context as Record<string, unknown>)?.hubspot as Record<string, unknown> | undefined
        
        if (!hubspotConfig?.enabled) {
          return NextResponse.json({ error: 'HubSpot not enabled' }, { status: 400 })
        }
        
        const accessToken = await getHubSpotToken(brandId)
        if (!accessToken) {
          return NextResponse.json({ error: 'HubSpot token expired' }, { status: 401 })
        }
        
        // Get user for author
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name, email')
          .eq('id', user.id)
          .single()
        
        const userName = tenant?.name || 'Unknown'
        
        // Get or create author
        const authorsResponse = await fetch(
          'https://api.hubapi.com/cms/v3/blogs/authors?limit=100',
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
        
        let authorId: string | null = null
        if (authorsResponse.ok) {
          const authorsData = await authorsResponse.json()
          const existing = authorsData.results?.find((a: { name?: string }) => 
            a.name?.toLowerCase() === userName.toLowerCase()
          )
          authorId = existing?.id || null
        }
        
        if (!authorId) {
          const createResponse = await fetch('https://api.hubapi.com/cms/v3/blogs/authors', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: userName, displayName: userName }),
          })
          if (createResponse.ok) {
            const newAuthor = await createResponse.json()
            authorId = newAuthor.id
          }
        }
        
        // Get all memos with HubSpot post IDs
        const { data: memos } = await supabase
          .from('memos')
          .select('id, title, slug, content_markdown, memo_type, meta_description, schema_json')
          .eq('brand_id', brandId)
          .not('schema_json->hubspot_post_id', 'is', null)
        
        if (!memos?.length) {
          return NextResponse.json({ message: 'No HubSpot posts to resync', updated: 0 })
        }
        
        let updated = 0
        let failed = 0
        
        for (const memo of memos) {
          const hubspotPostId = (memo.schema_json as Record<string, unknown>)?.hubspot_post_id
          if (!hubspotPostId) continue
          
          try {
            // Select unique image based on title
            const selectedImage = selectImageForMemo(memo.title, memo.content_markdown || '', memo.memo_type || '')
            
            // Sanitize and format content
            const sanitizedMarkdown = sanitizeContentForHubspot(memo.content_markdown || '', { 
              brandName: brand.name,
              title: memo.title,
            })
            const rawHtml = await marked(sanitizedMarkdown, { gfm: true, breaks: true })
            const htmlContent = formatHtmlForHubspot(rawHtml)
            
            // Create summary
            const contentParagraphs = sanitizedMarkdown.split('\n\n')
            const firstParagraph = contentParagraphs.find((p: string) => p.trim() && !p.startsWith('#'))
            const postSummary = firstParagraph
              ? firstParagraph.replace(/[*_`#]/g, '').trim().slice(0, 300)
              : memo.meta_description || ''
            
            // Update HubSpot post
            const updateResponse = await fetch(
              `https://api.hubapi.com/cms/v3/blogs/posts/${hubspotPostId}`,
              {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  postBody: htmlContent,
                  postSummary,
                  featuredImage: selectedImage.url,
                  featuredImageAltText: selectedImage.alt,
                  useFeaturedImage: true,
                  ...(authorId ? { blogAuthorId: authorId } : {}),
                }),
              }
            )
            
            if (updateResponse.ok) {
              updated++
              // Update memo schema_json
              await supabase
                .from('memos')
                .update({
                  schema_json: {
                    ...(memo.schema_json as Record<string, unknown>),
                    hubspot_author_id: authorId,
                    hubspot_synced_at: new Date().toISOString(),
                    hubspot_synced_by: userName,
                  },
                })
                .eq('id', memo.id)
            } else {
              failed++
              console.error(`Failed to resync ${memo.title}:`, await updateResponse.text())
            }
          } catch (err) {
            failed++
            console.error(`Error resyncing ${memo.title}:`, err)
          }
        }
        
        return NextResponse.json({
          success: true,
          message: `Resynced ${updated} HubSpot posts`,
          updated,
          failed,
          total: memos.length,
        })
      }

      case 'hubspot-update-authors': {
        // Bulk update HubSpot posts with correct author
        const { getHubSpotToken } = await import('@/lib/hubspot/oauth')
        
        const hubspotConfig = (brand.context as Record<string, unknown>)?.hubspot as Record<string, unknown> | undefined
        
        if (!hubspotConfig?.enabled) {
          return NextResponse.json({ error: 'HubSpot not enabled' }, { status: 400 })
        }
        
        const accessToken = await getHubSpotToken(brandId)
        if (!accessToken) {
          return NextResponse.json({ error: 'HubSpot token expired' }, { status: 401 })
        }
        
        // Get user name
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name, email')
          .eq('id', user.id)
          .single()
        
        const userName = tenant?.name || body.authorName || 'Unknown'
        
        // Get or create author in HubSpot
        const authorsResponse = await fetch(
          'https://api.hubapi.com/cms/v3/blogs/authors?limit=100',
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        )
        
        let authorId: string | null = null
        if (authorsResponse.ok) {
          const authorsData = await authorsResponse.json()
          const existing = authorsData.results?.find((a: { name?: string; displayName?: string }) => 
            a.name?.toLowerCase() === userName.toLowerCase() ||
            a.displayName?.toLowerCase() === userName.toLowerCase()
          )
          if (existing) {
            authorId = existing.id
          }
        }
        
        // Create author if not found
        if (!authorId) {
          const createResponse = await fetch('https://api.hubapi.com/cms/v3/blogs/authors', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: userName, displayName: userName }),
          })
          if (createResponse.ok) {
            const newAuthor = await createResponse.json()
            authorId = newAuthor.id
          }
        }
        
        if (!authorId) {
          return NextResponse.json({ error: 'Could not get/create HubSpot author' }, { status: 500 })
        }
        
        // Get all memos with HubSpot post IDs
        const { data: memos } = await supabase
          .from('memos')
          .select('id, title, schema_json')
          .eq('brand_id', brandId)
          .not('schema_json->hubspot_post_id', 'is', null)
        
        if (!memos?.length) {
          return NextResponse.json({ message: 'No HubSpot posts to update', updated: 0 })
        }
        
        // Update each HubSpot post with the author
        let updated = 0
        let failed = 0
        for (const memo of memos) {
          const hubspotPostId = (memo.schema_json as Record<string, unknown>)?.hubspot_post_id
          if (!hubspotPostId) continue
          
          const updateResponse = await fetch(
            `https://api.hubapi.com/cms/v3/blogs/posts/${hubspotPostId}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ blogAuthorId: authorId }),
            }
          )
          
          if (updateResponse.ok) {
            updated++
            // Update memo schema_json with author ID
            await supabase
              .from('memos')
              .update({
                schema_json: {
                  ...(memo.schema_json as Record<string, unknown>),
                  hubspot_author_id: authorId,
                },
              })
              .eq('id', memo.id)
          } else {
            failed++
            console.error(`Failed to update HubSpot post ${hubspotPostId}:`, await updateResponse.text())
          }
        }
        
        return NextResponse.json({
          success: true,
          message: `Updated ${updated} HubSpot posts with author "${userName}"`,
          authorId,
          updated,
          failed,
          total: memos.length,
        })
      }

      case 'enrich_competitors':
        await inngest.send({
          name: 'competitor/enrich-batch',
          data: { brandId },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Competitor enrichment started. Crawling competitor websites...' 
        })

      case 'generate_topic_universe':
        await inngest.send({
          name: 'topic/universe-generate',
          data: { brandId },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Content coverage audit started. This may take 1-2 minutes.' 
        })

      case 'batch_generate_memos': {
        // Generate memos for top N gap topics
        const topicIds = body.topicIds as string[] | undefined
        const limit = Math.min(body.limit || 10, 10) // Cap at 10

        if (!topicIds || topicIds.length === 0) {
          return NextResponse.json({ error: 'topicIds required' }, { status: 400 })
        }

        // Get the topics
        const { data: topics } = await supabase
          .from('topic_universe')
          .select('*')
          .eq('brand_id', brandId)
          .in('id', topicIds.slice(0, limit))
          .eq('status', 'gap')

        if (!topics || topics.length === 0) {
          return NextResponse.json({ error: 'No gap topics found' }, { status: 400 })
        }

        // Map topic content_type to memo_type
        const typeMap: Record<string, string> = {
          comparison: 'comparison',
          alternative: 'alternative',
          how_to: 'how_to',
          industry: 'industry',
          definition: 'how_to', // definitions use how_to template
          guide: 'industry', // guides use industry template
        }

        // Find matching competitors for comparison/alternative topics
        const competitorNames = topics
          .filter(t => t.competitor_relevance?.length > 0)
          .flatMap(t => t.competitor_relevance as string[])

        const { data: competitors } = competitorNames.length > 0
          ? await supabase
              .from('competitors')
              .select('id, name')
              .eq('brand_id', brandId)
              .eq('is_active', true)
          : { data: [] }

        const competitorLookup = new Map(
          (competitors || []).map(c => [c.name.toLowerCase(), c.id])
        )

        // Trigger memo generation for each topic
        const events = topics.map(topic => {
          const memoType = typeMap[topic.content_type] || 'industry'
          
          // Find competitor ID for comparison/alternative topics
          let competitorId: string | undefined
          if (['comparison', 'alternative'].includes(topic.content_type) && topic.competitor_relevance?.length > 0) {
            const compName = (topic.competitor_relevance as string[])[0]
            competitorId = competitorLookup.get(compName.toLowerCase()) || undefined
          }

          return {
            name: 'memo/generate' as const,
            data: {
              brandId,
              memoType,
              competitorId,
              // Pass topic context for the memo generator
              topicTitle: topic.title,
              topicDescription: topic.description,
            },
          }
        })

        await inngest.send(events)

        // Mark topics as having content in progress
        await supabase
          .from('topic_universe')
          .update({ status: 'partial', updated_at: new Date().toISOString() })
          .in('id', topics.map(t => t.id))

        return NextResponse.json({ 
          success: true, 
          message: `Generating ${events.length} memos from coverage gaps`,
          count: events.length,
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
