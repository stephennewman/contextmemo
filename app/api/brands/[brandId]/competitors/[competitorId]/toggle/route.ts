import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateCSRFToken } from '@/lib/security/csrf'
import { logAuditEvent } from '@/lib/security/audit-events'
import { z } from 'zod'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string; competitorId: string }> }
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || request.ip || 'unknown'
  let userId = 'unknown'

  try {
    if (!await validateCSRFToken(request)) {
      await logAuditEvent({
        action: 'toggle_competitor_attempt',
        userId,
        resourceType: 'competitor',
        resourceId: await params.competitorId,
        metadata: { status: 'failed', reason: 'invalid_csrf' },
      }, request)
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
    }

    const { brandId, competitorId } = await params
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(brandId) || !uuidRegex.test(competitorId)) {
      await logAuditEvent({
        action: 'toggle_competitor_attempt',
        userId,
        resourceType: 'competitor',
        resourceId: competitorId,
        metadata: { status: 'failed', reason: 'invalid_id_format', brandId, competitorId },
      }, request)
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const schema = z.object({
      is_active: z.boolean(),
    })

    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      await logAuditEvent({
        action: 'toggle_competitor_attempt',
        userId,
        resourceType: 'competitor',
        resourceId: competitorId,
        metadata: { status: 'failed', reason: 'invalid_request_body', details: parsed.error.format() },
      }, request)
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { is_active } = parsed.data

    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id || 'unknown'
    
    if (!user) {
      await logAuditEvent({
        action: 'toggle_competitor_attempt',
        userId,
        resourceType: 'competitor',
        resourceId: competitorId,
        metadata: { status: 'failed', reason: 'unauthorized_user' },
      }, request)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify competitor belongs to brand AND user owns brand
    const { data: competitor, error: fetchError } = await supabase
      .from('competitors')
      .select('id, brand_id, name, is_active, brands!inner(tenant_id)')
      .eq('id', competitorId)
      .eq('brand_id', brandId)
      .single()

    if (fetchError || !competitor || (competitor.brands as any).tenant_id !== user.id) {
      await logAuditEvent({
        action: 'toggle_competitor_attempt',
        userId,
        resourceType: 'competitor',
        resourceId: competitorId,
        metadata: { status: 'failed', reason: 'competitor_not_found_or_unauthorized', brandId },
      }, request)
      return NextResponse.json({ error: 'Competitor not found or unauthorized' }, { status: 404 })
    }

    // If no change in active status, just return success
    if (competitor.is_active === is_active) {
      await logAuditEvent({
        action: 'toggle_competitor',
        userId,
        resourceType: 'competitor',
        resourceId: competitorId,
        metadata: { status: 'no_change', current_is_active: is_active, competitorName: competitor.name },
      }, request)
      return NextResponse.json({ 
        success: true, 
        is_active,
        message: `Competitor ${competitor.name} is already ${is_active ? 'active' : 'inactive'}`
      })
    }

    // Update competitor tracking status
    const { error: updateError } = await supabase
      .from('competitors')
      .update({ 
        is_active,
        // If enabling, clear any "discovered" status notes
        ...(is_active && { 
          description: null // Clear the auto-discovered description when user enables
        })
      })
      .eq('id', competitorId)

    if (updateError) {
      console.error('Failed to update competitor:', updateError)
      await logAuditEvent({
        action: 'toggle_competitor_attempt',
        userId,
        resourceType: 'competitor',
        resourceId: competitorId,
        metadata: { status: 'failed', reason: 'db_update_error', errorMessage: updateError.message, new_is_active: is_active },
      }, request)
      return NextResponse.json({ error: 'An unexpected error occurred while updating competitor' }, { status: 500 })
    }

    await logAuditEvent({
      action: 'toggle_competitor',
      userId,
      resourceType: 'competitor',
      resourceId: competitorId,
      changes: {
        is_active: { from: !is_active, to: is_active },
      },
      metadata: { status: 'success', competitorName: competitor.name, new_is_active: is_active },
    }, request)

    return NextResponse.json({ 
      success: true, 
      is_active,
      message: is_active 
        ? `Now tracking ${competitor.name}` 
        : `Stopped tracking ${competitor.name}`
    })

  } catch (error: any) {
    console.error('Toggle competitor error:', error)
    await logAuditEvent({
      action: 'toggle_competitor_attempt',
      userId,
      resourceType: 'competitor',
      resourceId: await params.competitorId,
      metadata: { status: 'failed', reason: 'internal_server_error', errorMessage: error.message },
    }, request)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
