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

      case 'enrich_positioning': {
        // Run positioning enrichment on existing brand context (no re-crawl)
        const ctx = brand.context as Record<string, unknown> | null
        if (!ctx?.company_name) {
          return NextResponse.json({ error: 'Brand has no extracted context. Run extract_context first.' }, { status: 400 })
        }
        
        // Import and run enrichment inline
        const { generateText } = await import('ai')
        const { openai } = await import('@ai-sdk/openai')
        const { POSITIONING_ENRICHMENT_PROMPT } = await import('@/lib/ai/prompts/context-extraction')
        
        const cp = (ctx.corporate_positioning || {}) as Record<string, unknown>
        
        // Build missing fields list
        const missingInstructions: string[] = []
        const missingFields: string[] = []
        
        if (!cp.vision_statement) { missingFields.push('vision_statement'); missingInstructions.push(`"vision_statement": Generate a 1-2 sentence vision statement — the future state the company is creating.`) }
        if (!(cp.primary_verticals as string[])?.length) { missingFields.push('primary_verticals'); missingInstructions.push(`"primary_verticals": List 2-4 industries/verticals with sub-segments. Format: "• Industry - sub-segments".`) }
        if (!(cp.buyer_personas as string[])?.length) { missingFields.push('buyer_personas'); missingInstructions.push(`"buyer_personas": List 2-3 decision-maker personas. Format: "• Title - responsibilities, pain points".`) }
        if (!(cp.user_personas as string[])?.length) { missingFields.push('user_personas'); missingInstructions.push(`"user_personas": List 2-3 end-user personas. Format: "• User type - daily interactions".`) }
        if (!cp.core_value_promise) { missingFields.push('core_value_promise'); missingInstructions.push(`"core_value_promise": One sentence: what we do and why it matters.`) }
        if (!(cp.key_benefits as string[])?.length) { missingFields.push('key_benefits'); missingInstructions.push(`"key_benefits": 4-6 specific, outcome-oriented benefit statements.`) }
        if (!(cp.proof_points as string[])?.length) { missingFields.push('proof_points'); missingInstructions.push(`"proof_points": 3-5 trust signals — customer logos, stats, awards.`) }
        if (!(cp.differentiators as unknown[])?.length || ((cp.differentiators as unknown[])?.length || 0) < 3) { missingFields.push('differentiators'); missingInstructions.push(`"differentiators": Array of differentiator objects with "name" and "detail". Be specific.`) }
        if (!(cp.messaging_pillars as unknown[])?.length) { missingFields.push('messaging_pillars'); missingInstructions.push(`"messaging_pillars": Array of 3 objects with "name" (one word) and "supporting_points" (array of 3-4 capabilities).`) }
        if (!cp.pitch_10_second) { missingFields.push('pitch_10_second'); missingInstructions.push(`"pitch_10_second": One sentence — who, what, for whom.`) }
        if (!cp.pitch_30_second) { missingFields.push('pitch_30_second'); missingInstructions.push(`"pitch_30_second": 3-4 sentences: problem → solution → differentiator.`) }
        if (!cp.pitch_2_minute) { missingFields.push('pitch_2_minute'); missingInstructions.push(`"pitch_2_minute": 5-8 sentences: problem, solution, how it works, benefits, proof, CTA.`) }
        if (!(cp.objection_responses as unknown[])?.length) { missingFields.push('objection_responses'); missingInstructions.push(`"objection_responses": Array of 3 objects with "objection" and "response".`) }
        if (!cp.competitive_positioning) { missingFields.push('competitive_positioning'); missingInstructions.push(`"competitive_positioning": One paragraph on positioning vs competitors.`) }
        if (!(cp.win_themes as string[])?.length) { missingFields.push('win_themes'); missingInstructions.push(`"win_themes": 3-5 themes that win deals.`) }
        if (!(cp.competitive_landmines as string[])?.length) { missingFields.push('competitive_landmines'); missingInstructions.push(`"competitive_landmines": 3 questions to ask competitors that expose weaknesses.`) }
        
        if (missingFields.length === 0) {
          return NextResponse.json({ success: true, message: 'All positioning fields already filled', filled: 0 })
        }
        
        const diffs = (cp.differentiators as Array<{name: string; detail: string}>) || []
        const prompt = POSITIONING_ENRICHMENT_PROMPT
          .replace('{{company_name}}', String(ctx.company_name || ''))
          .replace('{{description}}', String(ctx.description || ''))
          .replace('{{products}}', (ctx.products as string[] || []).join(', '))
          .replace('{{markets}}', (ctx.markets as string[] || []).join(', '))
          .replace('{{features}}', (ctx.features as string[] || []).join(', '))
          .replace('{{customers}}', (ctx.customers as string[] || []).join(', '))
          .replace('{{mission_statement}}', String(cp.mission_statement || 'Not available'))
          .replace('{{core_value_promise}}', String(cp.core_value_promise || 'Not available'))
          .replace('{{differentiators}}', diffs.map(d => `${d.name}: ${d.detail}`).join('; ') || 'None')
          .replace('{{missing_fields_instructions}}', `Generate these missing fields:\n\n${missingInstructions.join('\n\n')}`)
        
        const { text: enrichText } = await generateText({
          model: openai('gpt-4o'),
          prompt,
          temperature: 0.3,
        })
        
        const jsonMatch = enrichText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          return NextResponse.json({ error: 'Enrichment failed — no valid JSON response' }, { status: 500 })
        }
        
        const enriched = JSON.parse(jsonMatch[0])
        const mergedPositioning = { ...cp, ...enriched }
        
        // For differentiators, append rather than replace
        if (enriched.differentiators && diffs.length > 0) {
          mergedPositioning.differentiators = [...diffs, ...enriched.differentiators].slice(0, 3)
        }
        
        // Save back to brand context
        const { createServiceRoleClient } = await import('@/lib/supabase/service')
        const adminDb = createServiceRoleClient()
        await adminDb.from('brands').update({
          context: { ...ctx, corporate_positioning: mergedPositioning },
          updated_at: new Date().toISOString(),
        }).eq('id', brandId)
        
        return NextResponse.json({ 
          success: true, 
          message: `Enriched ${Object.keys(enriched).length} positioning fields`,
          filled: Object.keys(enriched).length,
          fields: Object.keys(enriched)
        })
      }

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

      case 'suggest_next_memo': {
        // Find the best next memo based on TOP CITED CONTENT from scan results.
        // Logic: what URLs are AI models citing instead of this brand? Respond to those.
        
        const brandDomain = brand.domain?.replace(/^www\./, '') || ''

        // Get recent scan results with citations (last 90 days)
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        const { data: recentScans } = await supabase
          .from('scan_results')
          .select('citations, query_id')
          .eq('brand_id', brandId)
          .gte('scanned_at', ninetyDaysAgo)
          .not('citations', 'is', null)

        if (!recentScans || recentScans.length === 0) {
          return NextResponse.json({
            success: true,
            suggestion: null,
            message: 'No scan data yet. Run an AI scan first to discover citation opportunities.',
          })
        }

        // Aggregate citations by URL, excluding brand's own domain
        const citationCounts: Record<string, { count: number; queryIds: Set<string> }> = {}
        for (const scan of recentScans) {
          if (!scan.citations) continue
          for (const url of scan.citations as string[]) {
            try {
              const domain = new URL(url).hostname.replace(/^www\./, '')
              // Skip the brand's own domain
              if (brandDomain && domain === brandDomain) continue
              // Skip common non-content domains
              if (['google.com', 'youtube.com', 'wikipedia.org', 'reddit.com', 'twitter.com', 'x.com', 'linkedin.com', 'facebook.com'].includes(domain)) continue
              
              if (!citationCounts[url]) {
                citationCounts[url] = { count: 0, queryIds: new Set() }
              }
              citationCounts[url].count++
              citationCounts[url].queryIds.add(scan.query_id)
            } catch {
              // Skip malformed URLs
            }
          }
        }

        // Sort by citation count descending
        const topCitations = Object.entries(citationCounts)
          .map(([url, data]) => ({ url, count: data.count, queryIds: Array.from(data.queryIds) }))
          .sort((a, b) => b.count - a.count)

        if (topCitations.length === 0) {
          return NextResponse.json({
            success: true,
            suggestion: null,
            message: 'No competitor citations found. Your brand may already be well-cited.',
          })
        }

        // Check which queries already have a memo
        const { data: existingMemos } = await supabase
          .from('memos')
          .select('source_query_id, title')
          .eq('brand_id', brandId)
          .eq('status', 'published')
        
        const coveredQueryIds = new Set(
          (existingMemos || []).map(m => m.source_query_id).filter(Boolean)
        )

        // Walk through top citations and find one whose queries are NOT already covered
        let selectedCitation = topCitations[0]
        let topQuery: { id: string; query_text: string; query_type?: string; funnel_stage?: string; prompt_score?: number } | null = null

        for (const citation of topCitations) {
          // Get the queries associated with this citation
          const queryIds = citation.queryIds.slice(0, 5)
          const { data: relatedQueries } = await supabase
            .from('queries')
            .select('id, query_text, query_type, funnel_stage, prompt_score')
            .in('id', queryIds)
            .order('prompt_score', { ascending: false })

          // Find a query that doesn't already have a memo
          const uncoveredQuery = (relatedQueries || []).find(q => !coveredQueryIds.has(q.id))
          
          if (uncoveredQuery) {
            selectedCitation = citation
            topQuery = uncoveredQuery
            break
          }
        }

        // If everything is covered, tell the user
        if (!topQuery) {
          return NextResponse.json({
            success: true,
            suggestion: null,
            message: 'All top-cited queries already have response memos. Run a new scan to discover fresh opportunities.',
          })
        }
        
        // Build a descriptive title from the top-cited URL
        let citedDomain = ''
        try {
          citedDomain = new URL(selectedCitation.url).hostname.replace(/^www\./, '')
        } catch { /* ignore */ }

        // Collect the top 5 cited URLs as context for the memo
        const topCitedUrls = topCitations.slice(0, 5).map(c => c.url)

        return NextResponse.json({
          success: true,
          suggestion: {
            source: 'citation_response',
            queryId: topQuery?.id,
            title: topQuery?.query_text || `Response to ${citedDomain} content`,
            description: `${citedDomain} is cited ${selectedCitation.count} times across ${selectedCitation.queryIds.length} queries. Top cited URL: ${selectedCitation.url}`,
            memoType: 'gap_fill',
            citedUrls: topCitedUrls,
            citedDomain,
            citationCount: selectedCitation.count,
            queryCount: selectedCitation.queryIds.length,
            priorityScore: selectedCitation.count,
          },
        })
      }

      case 'check_recent_memo': {
        // Lightweight poll: check if a new memo was created in the last 2 minutes
        const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
        const { data: recentMemo } = await supabase
          .from('memos')
          .select('id, title, created_at')
          .eq('brand_id', brandId)
          .gte('created_at', twoMinAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        return NextResponse.json({
          success: true,
          found: !!recentMemo,
          memo: recentMemo || null,
        })
      }

      case 'generate_memo': {
        if (!body.memoType) {
          return NextResponse.json({ error: 'memoType required' }, { status: 400 })
        }
        // Validate memoType is one of allowed values
        const allowedMemoTypes = ['comparison', 'industry', 'how_to', 'alternative', 'response', 'gap_fill', 'product_deploy'] as const
        if (!allowedMemoTypes.includes(body.memoType)) {
          return NextResponse.json({ error: 'Invalid memoType' }, { status: 400 })
        }
        // Validate queryId if provided
        if (body.queryId && !isValidUUID(body.queryId)) {
          return NextResponse.json({ error: 'Invalid queryId format' }, { status: 400 })
        }
        // Validate competitorId if provided
        if (body.competitorId && !isValidUUID(body.competitorId)) {
          return NextResponse.json({ error: 'Invalid competitorId format' }, { status: 400 })
        }
        await inngest.send({
          name: 'memo/generate',
          data: { 
            brandId, 
            queryId: body.queryId,
            memoType: body.memoType,
            ...(body.competitorId && { competitorId: body.competitorId }),
            ...(body.topicTitle && { topicTitle: body.topicTitle }),
            ...(body.topicDescription && { topicDescription: body.topicDescription }),
            ...(body.citedUrls && { citedUrls: body.citedUrls }),
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

      case 'generate_gap_memos': {
        // Generate memos directly for top gap queries using cited content as reference
        // Direct generation (not Inngest) for speed during onboarding
        const { generateText } = await import('ai')
        const { openai } = await import('@ai-sdk/openai')
        const { GAP_FILL_MEMO_PROMPT, formatBrandContextForPrompt, generateToneInstructions } = await import('@/lib/ai/prompts/memo-generation')
        
        const memoLimit = Math.min(body.limit || 5, 10)
        
        // Fetch queries, scan results, and brand context in parallel
        const [{ data: allQueries }, { data: scanData }] = await Promise.all([
          supabase
            .from('queries')
            .select('id, query_text, funnel_stage, priority')
            .eq('brand_id', brandId)
            .eq('is_active', true)
            .order('priority', { ascending: false }),
          supabase
            .from('scan_results')
            .select('query_id, brand_mentioned, citations')
            .eq('brand_id', brandId),
        ])
        
        if (!allQueries || allQueries.length === 0) {
          return NextResponse.json({ success: true, memosQueued: 0, reason: 'no_queries' })
        }
        
        // Find gap queries (brand never mentioned)
        const mentionedQueryIds = new Set(
          (scanData || []).filter(s => s.brand_mentioned).map(s => s.query_id)
        )
        const scannedQueryIds = new Set((scanData || []).map(s => s.query_id))
        const gapQueries = allQueries.filter(q => scannedQueryIds.has(q.id) && !mentionedQueryIds.has(q.id))
        
        if (gapQueries.length === 0) {
          return NextResponse.json({ success: true, memosQueued: 0, reason: 'no_gaps' })
        }
        
        // Build citation map: for each gap query, what IS cited?
        const gapCitationMap = new Map<string, string[]>()
        for (const scan of (scanData || [])) {
          if (!scan.citations || scan.brand_mentioned) continue
          const existing = gapCitationMap.get(scan.query_id) || []
          gapCitationMap.set(scan.query_id, [...existing, ...(scan.citations as string[])])
        }
        
        // Rank gaps by citation count (most reference material = best memos)
        const rankedGaps = gapQueries
          .map(q => ({
            ...q,
            citedUrls: gapCitationMap.get(q.id) || [],
            citationCount: (gapCitationMap.get(q.id) || []).length,
          }))
          .sort((a, b) => b.citationCount - a.citationCount)
          .slice(0, memoLimit)
        
        // Prepare brand context for prompts
        const brandContext = brand.context as Record<string, unknown> & { brand_tone?: unknown; brand_personality?: unknown }
        const toneInstructions = generateToneInstructions(
          brandContext.brand_tone as Parameters<typeof generateToneInstructions>[0],
          brandContext.brand_personality as Parameters<typeof generateToneInstructions>[1]
        )
        const brandContextText = formatBrandContextForPrompt(brandContext as Parameters<typeof formatBrandContextForPrompt>[0])
        const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        
        // Fetch entities for domain → name mapping
        const { data: entityData } = await supabase
          .from('competitors')
          .select('name, domain, entity_type')
          .eq('brand_id', brandId)
        const domainToEntity = new Map<string, { name: string; type: string }>()
        for (const e of (entityData || [])) {
          if (e.domain) domainToEntity.set(e.domain.replace(/^www\./, '').toLowerCase(), { name: e.name, type: e.entity_type || 'other' })
        }
        
        // Generate memos directly (parallel, up to 3 at a time)
        const results: Array<{ queryId: string; queryText: string; success: boolean; memoId?: string }> = []
        
        // Helper to sanitize slug
        const sanitizeSlug = (text: string) => text
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .slice(0, 60)
        
        // Process in batches of 3
        for (let i = 0; i < rankedGaps.length; i += 3) {
          const batch = rankedGaps.slice(i, i + 3)
          
          const batchResults = await Promise.allSettled(
            batch.map(async (gap) => {
              // Build cited content summary with entity names + types
              const uniqueUrls = [...new Set(gap.citedUrls)]
              const citedDomains = new Map<string, number>()
              for (const url of uniqueUrls) {
                try {
                  const domain = new URL(url).hostname.replace(/^www\./, '')
                  citedDomains.set(domain, (citedDomains.get(domain) || 0) + 1)
                } catch { /* skip */ }
              }
              const citedContent = [...citedDomains.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([domain, count]) => {
                  const entity = domainToEntity.get(domain)
                  if (entity) {
                    const typeLabel = entity.type === 'product_competitor' ? 'competitor'
                      : entity.type === 'publisher' ? 'publisher/blog'
                      : entity.type === 'analyst' ? 'analyst firm'
                      : entity.type === 'marketplace' ? 'review site'
                      : 'other'
                    return `- ${entity.name} (${domain}) — ${typeLabel}, cited ${count}x`
                  }
                  return `- ${domain} — cited ${count}x`
                })
                .join('\n')
              
              // Build prompt
              const prompt = GAP_FILL_MEMO_PROMPT
                .replace('{{query_text}}', gap.query_text)
                .replace('{{cited_content}}', citedContent || 'No specific citations found for this query.')
                .replace('{{tone_instructions}}', toneInstructions)
                .replace('{{verified_insights}}', '')
                .replace('{{brand_context}}', brandContextText)
                .replace(/\{\{brand_name\}\}/g, brand.name)
                .replace(/\{\{brand_domain\}\}/g, brand.domain || '')
                .replace(/\{\{date\}\}/g, today)
              
              // Generate content (gpt-4o for quality — this is published brand content)
              const { text: content } = await generateText({
                model: openai('gpt-4o'),
                prompt,
                temperature: 0.4,
              })
              
              if (!content || content.length < 400) {
                throw new Error('Generated content too short')
              }
              
              // Build slug and title from query
              const querySlug = sanitizeSlug(gap.query_text.slice(0, 50))
              const slug = `gap/${querySlug}`
              const title = gap.query_text
              
              // Save memo directly
              const { data: memo, error } = await supabase
                .from('memos')
                .upsert({
                  brand_id: brandId,
                  source_query_id: gap.id,
                  memo_type: 'gap_fill',
                  slug,
                  title,
                  content_markdown: content,
                  meta_description: `${brand.name} — ${gap.query_text.slice(0, 120)}`,
                  sources: [{ url: `https://${brand.domain}`, title: brand.name, accessed_at: today }],
                  status: brand.auto_publish ? 'published' : 'draft',
                  published_at: brand.auto_publish ? new Date().toISOString() : null,
                  last_verified_at: new Date().toISOString(),
                  version: 1,
                }, { onConflict: 'brand_id,slug' })
                .select('id')
                .single()
              
              if (error) throw error
              
              return { queryId: gap.id, queryText: gap.query_text, success: true, memoId: memo?.id }
            })
          )
          
          for (const result of batchResults) {
            if (result.status === 'fulfilled') {
              results.push(result.value)
            } else {
              results.push({ queryId: '', queryText: '', success: false })
            }
          }
        }
        
        const successCount = results.filter(r => r.success).length
        
        return NextResponse.json({
          success: true,
          memosGenerated: successCount,
          memosQueued: 0, // Direct generation, not queued
          totalGaps: gapQueries.length,
          gapQueries: rankedGaps.map(q => ({
            id: q.id,
            text: q.query_text,
            funnel: q.funnel_stage,
            citationsFound: q.citationCount,
          })),
          results,
        })
      }

      case 'regenerate_memos': {
        // Regenerate all existing gap_fill memos through the updated prompt
        const { generateText: genText } = await import('ai')
        const { openai: openaiProvider } = await import('@ai-sdk/openai')
        const { GAP_FILL_MEMO_PROMPT: regenPromptTemplate, formatBrandContextForPrompt: formatCtx, generateToneInstructions: genTone } = await import('@/lib/ai/prompts/memo-generation')
        
        // Fetch all gap_fill memos for this brand
        const { data: existingMemos } = await supabase
          .from('memos')
          .select('id, slug, title, source_query_id, memo_type, status, version')
          .eq('brand_id', brandId)
          .eq('memo_type', 'gap_fill')
        
        if (!existingMemos || existingMemos.length === 0) {
          return NextResponse.json({ success: true, regenerated: 0, reason: 'no_gap_fill_memos' })
        }
        
        // Fetch source queries for these memos
        const queryIds = existingMemos.map(m => m.source_query_id).filter(Boolean)
        const { data: sourceQueries } = await supabase
          .from('queries')
          .select('id, query_text, funnel_stage')
          .in('id', queryIds)
        const queryMap = new Map((sourceQueries || []).map(q => [q.id, q]))
        
        // Fetch scan data for citations
        const { data: regenScanData } = await supabase
          .from('scan_results')
          .select('query_id, brand_mentioned, citations')
          .eq('brand_id', brandId)
        
        // Build citation map per query
        const regenCitationMap = new Map<string, string[]>()
        for (const scan of (regenScanData || [])) {
          if (!scan.citations) continue
          const existing = regenCitationMap.get(scan.query_id) || []
          regenCitationMap.set(scan.query_id, [...existing, ...(scan.citations as string[])])
        }
        
        // Prepare brand context
        const regenBrandCtx = brand.context as Record<string, unknown> & { brand_tone?: unknown; brand_personality?: unknown }
        const regenTone = genTone(
          regenBrandCtx.brand_tone as Parameters<typeof genTone>[0],
          regenBrandCtx.brand_personality as Parameters<typeof genTone>[1]
        )
        const regenCtxText = formatCtx(regenBrandCtx as Parameters<typeof formatCtx>[0])
        const regenDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        
        // Fetch entities for domain → name mapping
        const { data: regenEntities } = await supabase
          .from('competitors')
          .select('name, domain, entity_type')
          .eq('brand_id', brandId)
        const regenDomainMap = new Map<string, { name: string; type: string }>()
        for (const e of (regenEntities || [])) {
          if (e.domain) regenDomainMap.set(e.domain.replace(/^www\./, '').toLowerCase(), { name: e.name, type: e.entity_type || 'other' })
        }
        
        // Regenerate in batches of 3
        const regenResults: Array<{ memoId: string; title: string; success: boolean }> = []
        
        for (let i = 0; i < existingMemos.length; i += 3) {
          const batch = existingMemos.slice(i, i + 3)
          
          const batchResults = await Promise.allSettled(
            batch.map(async (memo) => {
              const query = queryMap.get(memo.source_query_id)
              if (!query) throw new Error(`No source query for memo ${memo.id}`)
              
              // Build cited content with entity names
              const citedUrls = regenCitationMap.get(query.id) || []
              const uniqueUrls = [...new Set(citedUrls)]
              const citedDomains = new Map<string, number>()
              for (const url of uniqueUrls) {
                try {
                  const domain = new URL(url).hostname.replace(/^www\./, '')
                  citedDomains.set(domain, (citedDomains.get(domain) || 0) + 1)
                } catch { /* skip */ }
              }
              const citedContent = [...citedDomains.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([domain, count]) => {
                  const entity = regenDomainMap.get(domain)
                  if (entity) {
                    const typeLabel = entity.type === 'product_competitor' ? 'competitor'
                      : entity.type === 'publisher' ? 'publisher/blog'
                      : entity.type === 'analyst' ? 'analyst firm'
                      : entity.type === 'marketplace' ? 'review site'
                      : 'other'
                    return `- ${entity.name} (${domain}) — ${typeLabel}, cited ${count}x`
                  }
                  return `- ${domain} — cited ${count}x`
                })
                .join('\n')
              
              // Build prompt
              const prompt = regenPromptTemplate
                .replace('{{query_text}}', query.query_text)
                .replace('{{cited_content}}', citedContent || 'No specific citations found for this query.')
                .replace('{{tone_instructions}}', regenTone)
                .replace('{{verified_insights}}', '')
                .replace('{{brand_context}}', regenCtxText)
                .replace(/\{\{brand_name\}\}/g, brand.name)
                .replace(/\{\{brand_domain\}\}/g, brand.domain || '')
                .replace(/\{\{date\}\}/g, regenDate)
              
              // Generate new content (gpt-4o for quality)
              const { text: content } = await genText({
                model: openaiProvider('gpt-4o'),
                prompt,
                temperature: 0.4,
              })
              
              if (!content || content.length < 400) {
                throw new Error('Generated content too short')
              }
              
              // Update memo in-place
              const { error } = await supabase
                .from('memos')
                .update({
                  content_markdown: content,
                  last_verified_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  version: (memo.version || 1) + 1,
                })
                .eq('id', memo.id)
              
              if (error) throw error
              
              return { memoId: memo.id, title: memo.title, success: true }
            })
          )
          
          for (const result of batchResults) {
            if (result.status === 'fulfilled') {
              regenResults.push(result.value)
            } else {
              regenResults.push({ memoId: '', title: '', success: false })
            }
          }
        }
        
        const regenSuccess = regenResults.filter(r => r.success).length
        
        return NextResponse.json({
          success: true,
          regenerated: regenSuccess,
          total: existingMemos.length,
          results: regenResults,
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

      case 'respond_to_citation': {
        // Generate a strategic variation of a specific cited URL
        const { url: citationUrl, queryIds: citationQueryIds } = body
        if (!citationUrl) {
          return NextResponse.json({ error: 'url is required' }, { status: 400 })
        }

        // Basic URL validation
        try {
          new URL(citationUrl)
        } catch {
          return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
        }

        await inngest.send({
          name: 'citation/respond',
          data: {
            brandId,
            url: citationUrl,
            queryIds: citationQueryIds || undefined,
          },
        })

        return NextResponse.json({
          success: true,
          message: `Citation response generation started for ${citationUrl}`,
        })
      }

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
        
        // Fetch all data needed for onboarding narrative in parallel
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
        
        const [
          { data: queryData, count: queryCount },
          { data: scanData },
          { count: memoCount },
          { data: competitorData },
        ] = await Promise.all([
          supabase
            .from('queries')
            .select('id, query_text, funnel_stage, priority', { count: 'exact' })
            .eq('brand_id', brandId)
            .eq('is_active', true)
            .order('priority', { ascending: false })
            .limit(50),
          supabase
            .from('scan_results')
            .select('query_id, brand_mentioned, brand_in_citations, citations, competitors_mentioned')
            .eq('brand_id', brandId)
            .gte('scanned_at', ninetyDaysAgo.toISOString()),
          supabase
            .from('memos')
            .select('*', { count: 'exact', head: true })
            .eq('brand_id', brandId),
          supabase
            .from('competitors')
            .select('name, domain, entity_type')
            .eq('brand_id', brandId),
        ])
        
        const scanCount = scanData?.length || 0
        
        // ── 1. Brand context details ──
        let contextSummary = ''
        let brandDetails = null
        if (hasContext) {
          const products = (context.products as Array<{ name?: string }>) || []
          const personas = (context.personas as Array<{ title?: string }>) || []
          const markets = (context.target_markets as string[]) || []
          contextSummary = `${products.length} products, ${personas.length} personas detected`
          brandDetails = {
            companyName: context.company_name as string || brand.name,
            description: context.description as string || '',
            products: products.slice(0, 5).map(p => typeof p === 'string' ? p : (p.name || '')).filter(Boolean),
            personas: personas.slice(0, 3).map(p => typeof p === 'string' ? p : (p.title || '')).filter(Boolean),
            markets: markets.slice(0, 3),
          }
        }
        
        // ── 2. Prompts by funnel ──
        const queries = queryData || []
        const promptsByFunnel = {
          top_funnel: queries.filter(q => q.funnel_stage === 'top_funnel'),
          mid_funnel: queries.filter(q => q.funnel_stage === 'mid_funnel'),
          bottom_funnel: queries.filter(q => q.funnel_stage === 'bottom_funnel'),
        }
        const promptSamples = {
          top_funnel: promptsByFunnel.top_funnel.slice(0, 3).map(q => q.query_text),
          mid_funnel: promptsByFunnel.mid_funnel.slice(0, 3).map(q => q.query_text),
          bottom_funnel: promptsByFunnel.bottom_funnel.slice(0, 3).map(q => q.query_text),
          counts: {
            top: promptsByFunnel.top_funnel.length,
            mid: promptsByFunnel.mid_funnel.length,
            bottom: promptsByFunnel.bottom_funnel.length,
          },
        }
        
        // ── 3-4. Scan summary + entities ──
        let scanSummary = null
        let gapQueries: { id: string; text: string; funnel: string }[] = []
        if (scanData && scanData.length > 0) {
          const mentioned = scanData.filter(s => s.brand_mentioned).length
          const withCitations = scanData.filter(s => s.citations && (s.citations as string[]).length > 0).length
          const brandCited = scanData.filter(s => s.brand_in_citations).length
          
          // Unique cited domains
          const domainCounts = new Map<string, number>()
          for (const scan of scanData) {
            for (const url of (scan.citations as string[] || [])) {
              try {
                const domain = new URL(url).hostname.replace(/^www\./, '')
                domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)
              } catch { /* skip */ }
            }
          }
          const topDomains = [...domainCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([domain, count]) => ({ domain, count }))
          
          // ── 5. Find actual gap queries (not mentioned in ANY scan) ──
          const mentionedQueryIds = new Set(
            scanData.filter(s => s.brand_mentioned).map(s => s.query_id)
          )
          const scannedQueryIds = new Set(scanData.map(s => s.query_id))
          const gaps = queries.filter(q => scannedQueryIds.has(q.id) && !mentionedQueryIds.has(q.id))
          gapQueries = gaps.slice(0, 5).map(q => ({
            id: q.id,
            text: q.query_text,
            funnel: q.funnel_stage || 'unknown',
          }))
          
          scanSummary = {
            totalScans: scanCount,
            mentionRate: Math.round((mentioned / scanCount) * 100),
            citationRate: withCitations > 0 ? Math.round((brandCited / withCitations) * 100) : 0,
            mentioned,
            brandCited,
            gapCount: gaps.length,
            totalCitations: scanData.reduce((sum, s) => sum + ((s.citations as string[])?.length || 0), 0),
            uniqueDomains: domainCounts.size,
            topDomains,
          }
        }
        
        // Entities grouped by type
        const entities = (competitorData || []).map(c => ({
          name: c.name,
          domain: c.domain,
          type: c.entity_type || 'product_competitor',
        }))
        
        // Group entities by type for display
        const entityGroups: Record<string, string[]> = {}
        for (const e of entities) {
          const label = e.type === 'product_competitor' ? 'Competitors'
            : e.type === 'publisher' ? 'Publishers'
            : e.type === 'analyst' ? 'Analysts'
            : e.type === 'marketplace' ? 'Marketplaces'
            : e.type === 'association' ? 'Associations'
            : e.type === 'news_outlet' ? 'News'
            : e.type === 'research_institution' ? 'Research'
            : 'Other'
          if (!entityGroups[label]) entityGroups[label] = []
          entityGroups[label].push(e.name)
        }
        
        // Top cited URLs across all scans (what AI trusts)
        const urlCounts = new Map<string, number>()
        if (scanData) {
          for (const scan of scanData) {
            for (const url of (scan.citations as string[] || [])) {
              urlCounts.set(url, (urlCounts.get(url) || 0) + 1)
            }
          }
        }
        const topCitedUrls = [...urlCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([url, count]) => {
            try {
              const domain = new URL(url).hostname.replace(/^www\./, '')
              return { url, domain, count }
            } catch {
              return { url, domain: url, count }
            }
          })
        
        return NextResponse.json({
          brandName: brand.name,
          isPaused: brand.is_paused || false,
          hasContext,
          hasQueries: (queryCount || 0) > 0,
          hasScans: scanCount > 0,
          queryCount: queryCount || 0,
          scanCount,
          contextSummary,
          brandDetails,
          promptSamples,
          memoCount: memoCount || 0,
          competitorCount: entities.length,
          competitors: entities.filter(e => e.type === 'product_competitor').slice(0, 8).map(c => c.name),
          entities,
          entityGroups,
          topCitedUrls,
          scanSummary,
          gapQueries,
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

      case 'verify_content': {
        // Verify published memos are getting cited by AI models
        const verifyMemoIds = body.memoIds as string[] | undefined
        await inngest.send({
          name: 'memo/verify-content',
          data: { 
            brandId,
            ...(verifyMemoIds && verifyMemoIds.length > 0 && { memoIds: verifyMemoIds }),
          },
        })
        return NextResponse.json({ 
          success: true, 
          message: 'Content verification started. Generating verification prompts and scanning across AI models...' 
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
