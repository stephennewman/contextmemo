import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { emitPromptExcluded } from '@/lib/feed/emit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string; promptId: string }> }
) {
  const supabase = await createClient()
  const { brandId, promptId } = await params
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const reason = body.reason || 'manual'

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify the prompt belongs to this brand and user has access
  const { data: prompt, error: promptError } = await serviceClient
    .from('queries')
    .select('*, brand:brands!inner(tenant_id)')
    .eq('id', promptId)
    .eq('brand_id', brandId)
    .single()

  if (promptError || !prompt) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 })
  }

  // Verify user owns this brand
  if (prompt.brand.tenant_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Exclude the prompt
  const { error: updateError } = await serviceClient
    .from('queries')
    .update({
      is_active: false,
      excluded_at: new Date().toISOString(),
      excluded_reason: reason,
    })
    .eq('id', promptId)

  if (updateError) {
    console.error('Failed to exclude prompt:', updateError)
    return NextResponse.json({ error: 'Failed to exclude prompt' }, { status: 500 })
  }

  // Emit feed event
  try {
    await emitPromptExcluded({
      tenant_id: user.id,
      brand_id: brandId,
      query_id: promptId,
      query_text: prompt.query_text,
      reason,
    })
  } catch (err) {
    console.error('Failed to emit prompt excluded event:', err)
    // Don't fail the request
  }

  return NextResponse.json({ 
    success: true, 
    prompt_id: promptId,
    reason,
  })
}
