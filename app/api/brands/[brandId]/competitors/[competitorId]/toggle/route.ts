import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

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
    const body = await request.json()
    const { is_active } = body

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
