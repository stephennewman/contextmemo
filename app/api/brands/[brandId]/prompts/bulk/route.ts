import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { inngest } from '@/lib/inngest/client'
import { z } from 'zod'

const bulkActionSchema = z.object({
  action: z.enum(['exclude', 'delete', 'reenable', 'rescan', 'regenerate']),
  promptIds: z.array(z.string().uuid()).min(1).max(500),
  reason: z.enum(['irrelevant', 'duplicate', 'low_value', 'other', 'manual']).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(brandId)) {
    return NextResponse.json({ error: 'Invalid brand ID format' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = bulkActionSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const { action, promptIds, reason } = parsed.data

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify brand ownership
  const { data: brand, error: brandError } = await serviceClient
    .from('brands')
    .select('id, tenant_id')
    .eq('id', brandId)
    .single()

  if (brandError || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  if (brand.tenant_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Verify all prompts belong to this brand
  const { data: prompts, error: promptsError } = await serviceClient
    .from('queries')
    .select('id')
    .eq('brand_id', brandId)
    .in('id', promptIds)

  if (promptsError) {
    return NextResponse.json({ error: 'Failed to verify prompts' }, { status: 500 })
  }

  const validIds = prompts?.map(p => p.id) || []
  if (validIds.length === 0) {
    return NextResponse.json({ error: 'No valid prompts found' }, { status: 404 })
  }

  try {
    switch (action) {
      case 'exclude': {
        const { error: updateError } = await serviceClient
          .from('queries')
          .update({
            is_active: false,
            excluded_at: new Date().toISOString(),
            excluded_reason: reason || 'manual',
          })
          .in('id', validIds)

        if (updateError) throw updateError

        return NextResponse.json({
          success: true,
          action: 'exclude',
          count: validIds.length,
        })
      }

      case 'delete': {
        const { error: deleteError } = await serviceClient
          .from('queries')
          .delete()
          .in('id', validIds)

        if (deleteError) throw deleteError

        return NextResponse.json({
          success: true,
          action: 'delete',
          count: validIds.length,
        })
      }

      case 'reenable': {
        const { error: updateError } = await serviceClient
          .from('queries')
          .update({
            is_active: true,
            excluded_at: null,
            excluded_reason: null,
          })
          .in('id', validIds)

        if (updateError) throw updateError

        return NextResponse.json({
          success: true,
          action: 'reenable',
          count: validIds.length,
        })
      }

      case 'rescan': {
        await inngest.send({
          name: 'scan/run',
          data: { brandId, queryIds: validIds, autoGenerateMemos: true },
        })

        return NextResponse.json({
          success: true,
          action: 'rescan',
          count: validIds.length,
          message: 'Scan queued for selected prompts',
        })
      }

      case 'regenerate': {
        await inngest.send({
          name: 'query/generate',
          data: { brandId },
        })

        return NextResponse.json({
          success: true,
          action: 'regenerate',
          message: 'New prompt generation queued',
        })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error(`Bulk ${action} failed:`, error)
    return NextResponse.json({ error: `Failed to ${action} prompts` }, { status: 500 })
  }
}
