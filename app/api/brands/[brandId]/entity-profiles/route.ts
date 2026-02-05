import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/brands/[brandId]/entity-profiles?competitorId=xxx
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params
    const { searchParams } = new URL(request.url)
    const competitorId = searchParams.get('competitorId')

    if (!competitorId) {
      return NextResponse.json(
        { error: 'competitorId is required' },
        { status: 400 }
      )
    }

    const { data: profiles, error } = await supabase
      .from('entity_profiles')
      .select('*')
      .eq('brand_id', brandId)
      .eq('competitor_id', competitorId)
      .order('importance', { ascending: false })

    if (error) {
      console.error('Failed to fetch entity profiles:', error)
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profiles: profiles || [] })
  } catch (error) {
    console.error('Error in entity profiles GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/brands/[brandId]/entity-profiles
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params
    const body = await request.json()

    const {
      competitor_id,
      attribute_name,
      brand_value,
      competitor_value,
      comparison_result,
      notes,
      importance,
      source,
    } = body

    if (!competitor_id || !attribute_name) {
      return NextResponse.json(
        { error: 'competitor_id and attribute_name are required' },
        { status: 400 }
      )
    }

    // Upsert the profile
    const { data: profile, error } = await supabase
      .from('entity_profiles')
      .upsert({
        brand_id: brandId,
        competitor_id,
        attribute_name,
        brand_value: brand_value || null,
        competitor_value: competitor_value || null,
        comparison_result: comparison_result || 'unknown',
        notes: notes || null,
        importance: importance || 50,
        source: source || 'manual',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'brand_id,competitor_id,attribute_name',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save entity profile:', error)
      return NextResponse.json(
        { error: 'Failed to save profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error in entity profiles POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/brands/[brandId]/entity-profiles
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params
    const body = await request.json()
    const { competitor_id, attribute_name } = body

    if (!competitor_id || !attribute_name) {
      return NextResponse.json(
        { error: 'competitor_id and attribute_name are required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('entity_profiles')
      .delete()
      .eq('brand_id', brandId)
      .eq('competitor_id', competitor_id)
      .eq('attribute_name', attribute_name)

    if (error) {
      console.error('Failed to delete entity profile:', error)
      return NextResponse.json(
        { error: 'Failed to delete profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in entity profiles DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
