import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string; competitorId: string }> }
) {
  try {
    const { brandId, competitorId } = await params
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(brandId) || !uuidRegex.test(competitorId)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const schema = z.object({
      is_active: z.boolean(),
    })

    const body = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { is_active } = parsed.data

    // Verify user is authenticated
    const serverClient = await createServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify competitor belongs to brand
    const { data: competitor, error: fetchError } = await supabase
      .from('competitors')
      .select('id, brand_id, name')
      .eq('id', competitorId)
      .eq('brand_id', brandId)
      .single()

    if (fetchError || !competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 })
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
      return NextResponse.json({ error: 'Failed to update competitor' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      is_active,
      message: is_active 
        ? `Now tracking ${competitor.name}` 
        : `Stopped tracking ${competitor.name}`
    })

  } catch (error) {
    console.error('Toggle competitor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
