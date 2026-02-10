import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { FeedWorkflow, FeedSeverity, FeedEvent, FeedResponse } from '@/lib/feed/types'
import { getCacheValue, setCacheValue } from '@/lib/cache/redis-cache'
import { z } from 'zod'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const uuidSchema = z.string().regex(uuidRegex, 'Invalid UUID')
const patchSchema = z.object({
  event_ids: z.array(uuidSchema).min(1),
  action: z.enum(['mark_read', 'mark_unread', 'dismiss', 'pin', 'unpin']),
})
const postSchema = z.object({
  event_id: uuidSchema,
  action: z.string().min(1),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse query params
  const searchParams = request.nextUrl.searchParams
  const brandId = searchParams.get('brandId')
  const cursor = searchParams.get('cursor')
  const rawLimit = parseInt(searchParams.get('limit') || '20')
  const limit = Math.min(Number.isNaN(rawLimit) ? 20 : rawLimit, 50)
  const workflow = searchParams.get('workflow') as FeedWorkflow | 'all' | null
  const severity = searchParams.get('severity') as FeedSeverity | 'all' | null
  const unreadOnly = searchParams.get('unreadOnly') === 'true'
  const includeDismissed = searchParams.get('includeDismissed') === 'true'

  const cacheKey = `feed:${user.id}:${brandId || 'all'}:${cursor || 'none'}:${limit}:${workflow || 'all'}:${severity || 'all'}:${unreadOnly}:${includeDismissed}`
  const cached = await getCacheValue<FeedResponse>(cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  // Use service client for queries
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Build query
  let query = serviceClient
    .from('feed_events')
    .select('*', { count: 'exact' })
    .eq('tenant_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit + 1) // Fetch one extra to check if there are more

  // Filter by brand if specified
  if (brandId) {
    query = query.eq('brand_id', brandId)
  }

  // Filter by workflow
  if (workflow && workflow !== 'all') {
    query = query.eq('workflow', workflow)
  }

  // Filter by severity
  if (severity && severity !== 'all') {
    query = query.eq('severity', severity)
  }

  // Unread only
  if (unreadOnly) {
    query = query.eq('read', false)
  }

  // Exclude dismissed unless requested
  if (!includeDismissed) {
    query = query.eq('dismissed', false)
  }

  // Cursor-based pagination
  if (cursor) {
    // Cursor is the created_at timestamp of the last item
    query = query.lt('created_at', cursor)
  }

  const { data: events, error, count } = await query

  if (error) {
    console.error('Feed query error', { error: error.message })
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }

  // Check if there are more items
  const hasMore = events && events.length > limit
  const items = events?.slice(0, limit) || []
  
  // Next cursor is the created_at of the last item
  const nextCursor = hasMore && items.length > 0 
    ? items[items.length - 1].created_at 
    : null

  // Get unread count
  const { count: unreadCount } = await serviceClient
    .from('feed_events')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', user.id)
    .eq('read', false)
    .eq('dismissed', false)

  const response: FeedResponse = {
    items: items as FeedEvent[],
    next_cursor: nextCursor,
    has_more: hasMore,
    unread_count: unreadCount || 0,
    total_count: count || 0,
  }

  await setCacheValue(cacheKey, response, 30)

  return NextResponse.json(response)
}

// Mark events as read
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { event_ids, action } = parsed.data

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify events belong to user
  const { data: events } = await serviceClient
    .from('feed_events')
    .select('id')
    .eq('tenant_id', user.id)
    .in('id', event_ids)

  if (!events || events.length !== event_ids.length) {
    return NextResponse.json({ error: 'Invalid event_ids' }, { status: 400 })
  }

  let updateData: Partial<FeedEvent> = {}

  switch (action) {
    case 'mark_read':
      updateData = { read: true }
      break
    case 'mark_unread':
      updateData = { read: false }
      break
    case 'dismiss':
      updateData = { dismissed: true, read: true }
      break
    case 'pin':
      updateData = { pinned: true }
      break
    case 'unpin':
      updateData = { pinned: false }
      break
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { error } = await serviceClient
    .from('feed_events')
    .update(updateData)
    .in('id', event_ids)

  if (error) {
    console.error('Feed update error', { error: error.message })
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }

  return NextResponse.json({ success: true, updated: event_ids.length })
}

// Take action on a feed event
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = postSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { event_id, action } = parsed.data

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get the event
  const { data: event, error: eventError } = await serviceClient
    .from('feed_events')
    .select('*')
    .eq('id', event_id)
    .eq('tenant_id', user.id)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Check if action is available
  if (event.action_available && !event.action_available.includes(action)) {
    return NextResponse.json({ error: 'Action not available for this event' }, { status: 400 })
  }

  // Handle different actions
  let actionResult: { triggered?: string; job_id?: string } = {}

  if (action === 'generate_memo') {
    // Get the query for this gap event
    const queryId = event.related_query_id || event.data?.gap?.query_id || event.data?.prompt?.query_id
    
    if (!queryId && event.data?.gap?.query_text) {
      // If no query_id but we have the text, find the query
      const { data: query } = await serviceClient
        .from('queries')
        .select('id')
        .eq('brand_id', event.brand_id)
        .eq('query_text', event.data.gap.query_text)
        .single()
      
      if (query) {
        // Trigger memo generation via Inngest
        try {
          const { inngest } = await import('@/lib/inngest/client')
          await inngest.send({
            name: 'memo/generate',
            data: {
              brandId: event.brand_id,
              queryId: query.id,
              memoType: 'comparison',
            },
          })
          actionResult = { triggered: 'memo/generate', job_id: query.id }
        } catch (err: any) {
          console.error('Failed to trigger memo generation', { error: err.message })
          return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
        }
      }
    } else if (queryId) {
      // Trigger memo generation with existing query ID
      try {
        const { inngest } = await import('@/lib/inngest/client')
        await inngest.send({
          name: 'memo/generate',
          data: {
            brandId: event.brand_id,
            queryId: queryId,
            memoType: 'comparison',
          },
        })
        actionResult = { triggered: 'memo/generate', job_id: queryId }
      } catch (err: any) {
        console.error('Failed to trigger memo generation', { error: err.message })
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
      }
    }
  }

  // Handle exclude_prompt action
  if (action === 'exclude_prompt') {
    const queryId = event.related_query_id || event.data?.prompt?.query_id
    
    if (!queryId) {
      return NextResponse.json({ error: 'No query associated with this event' }, { status: 400 })
    }
    
    // Exclude the prompt (set is_active = false and track exclusion)
    const { error: excludeError } = await serviceClient
      .from('queries')
      .update({
        is_active: false,
        excluded_at: new Date().toISOString(),
        excluded_reason: body.reason || 'manual',
      })
      .eq('id', queryId)
    
    if (excludeError) {
      console.error('Failed to exclude prompt', { error: excludeError.message })
      return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
    }
    
    // Emit feed event for the exclusion
    try {
      const { emitPromptExcluded } = await import('@/lib/feed/emit')
      const queryText = event.data?.prompt?.query_text || event.data?.gap?.query_text || 'Unknown prompt'
      await emitPromptExcluded({
        tenant_id: event.tenant_id,
        brand_id: event.brand_id,
        query_id: queryId,
        query_text: queryText,
        reason: body.reason || 'manual',
      })
    } catch (err: any) {
      console.error('Failed to emit prompt excluded event', { error: err.message })
      // Don't fail the request, exclusion was successful
    }
    
    actionResult = { triggered: 'prompt_excluded', job_id: queryId }
  }

  // Handle reenable_prompt action
  if (action === 'reenable_prompt') {
    const queryId = event.related_query_id || event.data?.prompt?.query_id
    
    if (!queryId) {
      return NextResponse.json({ error: 'No query associated with this event' }, { status: 400 })
    }
    
    // Re-enable the prompt
    const { error: reenableError } = await serviceClient
      .from('queries')
      .update({
        is_active: true,
        excluded_at: null,
        excluded_reason: null,
      })
      .eq('id', queryId)
    
    if (reenableError) {
      console.error('Failed to re-enable prompt', { error: reenableError.message })
      return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
    }
    
    actionResult = { triggered: 'prompt_reenabled', job_id: queryId }
  }

  // Mark the action as taken
  const { error: updateError } = await serviceClient
    .from('feed_events')
    .update({
      action_taken: action,
      action_taken_at: new Date().toISOString(),
      read: true,
    })
    .eq('id', event_id)

      if (updateError) {
        console.error('Failed to record action', { error: updateError.message })
        return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
      }
  return NextResponse.json({ 
    success: true, 
    event_id,
    action,
    message: action === 'generate_memo' 
      ? 'Memo generation started - check your feed for updates'
      : `Action "${action}" completed`,
    ...actionResult,
  })
}
