import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { isValidUUID } from '@/lib/security/validation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_ENTITY_TYPES = [
  'product_competitor',
  'technology',
  'consultant',
  'publisher',
  'marketplace',
  'infrastructure',
  'analyst',
  'association',
  'news_outlet',
  'research_institution',
  'irrelevant',
] as const

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  updates: z.object({
    entity_type: z.enum(VALID_ENTITY_TYPES).optional(),
    is_active: z.boolean().optional(),
  }).refine(data => data.entity_type !== undefined || data.is_active !== undefined, {
    message: 'At least one update field required (entity_type or is_active)',
  }),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params

    if (!isValidUUID(brandId)) {
      return NextResponse.json({ error: 'Invalid brand ID format' }, { status: 400 })
    }

    // Verify authentication
    const serverClient = await createServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const parsed = bulkUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: parsed.error.issues 
      }, { status: 400 })
    }

    const { ids, updates } = parsed.data

    // Verify all competitors belong to this brand
    const { data: competitors, error: fetchError } = await supabase
      .from('competitors')
      .select('id')
      .eq('brand_id', brandId)
      .in('id', ids)

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to verify competitors' }, { status: 500 })
    }

    const validIds = new Set((competitors || []).map(c => c.id))
    const invalidIds = ids.filter(id => !validIds.has(id))

    if (invalidIds.length > 0) {
      return NextResponse.json({ 
        error: `${invalidIds.length} competitor(s) not found for this brand` 
      }, { status: 404 })
    }

    // Build update object
    const updateObj: Record<string, unknown> = {}
    if (updates.entity_type !== undefined) updateObj.entity_type = updates.entity_type
    if (updates.is_active !== undefined) updateObj.is_active = updates.is_active

    // Apply bulk update
    const { error: updateError } = await supabase
      .from('competitors')
      .update(updateObj)
      .in('id', ids)

    if (updateError) {
      console.error('Bulk update failed:', updateError)
      return NextResponse.json({ error: 'Bulk update failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      updated: ids.length,
      updates,
    })

  } catch (error) {
    console.error('Bulk update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
