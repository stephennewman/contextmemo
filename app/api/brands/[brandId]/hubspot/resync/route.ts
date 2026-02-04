import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { marked } from 'marked'
import { BrandContext, HubSpotConfig } from '@/lib/supabase/types'
import { getHubSpotToken } from '@/lib/hubspot/oauth'
import { sanitizeContentForHubspot, hasContextmemoReferences } from '@/lib/hubspot/content-sanitizer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * POST /api/brands/[brandId]/hubspot/resync
 * 
 * Re-syncs all memos that have been previously synced to HubSpot
 * with sanitized content (removes Contextmemo references).
 * 
 * Options:
 * - dryRun: boolean - If true, just returns which memos would be updated
 * - memoIds: string[] - Optional list of specific memo IDs to resync
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params
    const body = await request.json().catch(() => ({}))
    const { dryRun = false, memoIds } = body

    // Get brand with HubSpot config
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single()

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    const context = brand.context as BrandContext
    const hubspotConfig = context?.hubspot as HubSpotConfig | undefined

    if (!hubspotConfig?.enabled) {
      return NextResponse.json(
        { error: 'HubSpot integration is not enabled for this brand' },
        { status: 400 }
      )
    }

    // Get a fresh/refreshed access token
    const accessToken = await getHubSpotToken(brandId)
    if (!accessToken) {
      return NextResponse.json(
        { error: 'HubSpot connection expired. Please reconnect HubSpot in settings.' },
        { status: 401 }
      )
    }

    // Build query for memos
    let query = supabase
      .from('memos')
      .select('*')
      .eq('brand_id', brandId)
      .not('schema_json->hubspot_post_id', 'is', null) // Only memos that have been synced

    if (memoIds && memoIds.length > 0) {
      query = query.in('id', memoIds)
    }

    const { data: memos, error: memosError } = await query

    if (memosError) {
      return NextResponse.json({ error: 'Failed to fetch memos' }, { status: 500 })
    }

    if (!memos || memos.length === 0) {
      return NextResponse.json({ 
        message: 'No memos found that have been synced to HubSpot',
        updated: 0 
      })
    }

    // Analyze which memos have Contextmemo references
    const memosNeedingUpdate = memos.filter(memo => 
      hasContextmemoReferences(memo.content_markdown)
    )

    const results = {
      total: memos.length,
      needsUpdate: memosNeedingUpdate.length,
      updated: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{
        memoId: string
        title: string
        hubspotPostId: string
        status: 'updated' | 'failed' | 'skipped' | 'dry_run'
        error?: string
      }>
    }

    if (dryRun) {
      // Just return analysis without making changes
      results.details = memos.map(memo => ({
        memoId: memo.id,
        title: memo.title,
        hubspotPostId: memo.schema_json?.hubspot_post_id || 'unknown',
        status: hasContextmemoReferences(memo.content_markdown) ? 'dry_run' : 'skipped' as const,
      }))
      
      return NextResponse.json({
        message: `Dry run complete. ${results.needsUpdate} of ${results.total} memos have Contextmemo references.`,
        ...results,
      })
    }

    // Process each memo that needs updating
    for (const memo of memos) {
      const hubspotPostId = memo.schema_json?.hubspot_post_id
      
      if (!hubspotPostId) {
        results.skipped++
        results.details.push({
          memoId: memo.id,
          title: memo.title,
          hubspotPostId: 'none',
          status: 'skipped',
        })
        continue
      }

      try {
        // Sanitize and convert content
        const sanitizedMarkdown = sanitizeContentForHubspot(memo.content_markdown, { brandName: brand.name })
        const htmlContent = await marked(sanitizedMarkdown, {
          gfm: true,
          breaks: true,
        })

        // Update in HubSpot
        const response = await fetch(
          `https://api.hubapi.com/cms/v3/blogs/posts/${hubspotPostId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: memo.title,
              postBody: htmlContent,
              metaDescription: memo.meta_description || undefined,
            }),
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          
          // If post was deleted in HubSpot, skip it
          if (response.status === 404) {
            results.skipped++
            results.details.push({
              memoId: memo.id,
              title: memo.title,
              hubspotPostId,
              status: 'skipped',
              error: 'Post no longer exists in HubSpot',
            })
            continue
          }
          
          throw new Error(errorData.message || `HTTP ${response.status}`)
        }

        // Update timestamp in our DB
        await supabase
          .from('memos')
          .update({
            schema_json: {
              ...memo.schema_json,
              hubspot_synced_at: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', memo.id)

        results.updated++
        results.details.push({
          memoId: memo.id,
          title: memo.title,
          hubspotPostId,
          status: 'updated',
        })
      } catch (error) {
        results.failed++
        results.details.push({
          memoId: memo.id,
          title: memo.title,
          hubspotPostId,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      message: `Resync complete. Updated ${results.updated} of ${results.total} memos.`,
      ...results,
    })
  } catch (error) {
    console.error('HubSpot resync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
