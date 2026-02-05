import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BrandContext, CorporatePositioning } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ brandId: string }>
}

// GET - Retrieve corporate positioning
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('context, name')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const context = (brand.context || {}) as BrandContext
  
  return NextResponse.json({ 
    positioning: context.corporate_positioning || null,
    brandName: brand.name
  })
}

// PATCH - Update corporate positioning (partial update)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const body = await request.json()
  const { section, data } = body

  if (!section || !data) {
    return NextResponse.json({ error: 'section and data are required' }, { status: 400 })
  }

  const context = (brand.context || {}) as BrandContext
  const positioning = context.corporate_positioning || {} as CorporatePositioning

  // Update the specific section
  switch (section) {
    case 'mission_vision':
      if (data.mission_statement !== undefined) positioning.mission_statement = data.mission_statement
      if (data.vision_statement !== undefined) positioning.vision_statement = data.vision_statement
      break
    
    case 'target_markets':
      if (data.primary_verticals !== undefined) positioning.primary_verticals = data.primary_verticals
      if (data.buyer_personas !== undefined) positioning.buyer_personas = data.buyer_personas
      if (data.user_personas !== undefined) positioning.user_personas = data.user_personas
      break
    
    case 'value_proposition':
      if (data.core_value_promise !== undefined) positioning.core_value_promise = data.core_value_promise
      if (data.key_benefits !== undefined) positioning.key_benefits = data.key_benefits
      if (data.proof_points !== undefined) positioning.proof_points = data.proof_points
      break
    
    case 'differentiators':
      if (data.differentiators !== undefined) positioning.differentiators = data.differentiators
      break
    
    case 'messaging_pillars':
      if (data.messaging_pillars !== undefined) positioning.messaging_pillars = data.messaging_pillars
      break
    
    case 'elevator_pitches':
      if (data.pitch_10_second !== undefined) positioning.pitch_10_second = data.pitch_10_second
      if (data.pitch_30_second !== undefined) positioning.pitch_30_second = data.pitch_30_second
      if (data.pitch_2_minute !== undefined) positioning.pitch_2_minute = data.pitch_2_minute
      break
    
    case 'objection_handling':
      if (data.objection_responses !== undefined) positioning.objection_responses = data.objection_responses
      break
    
    case 'competitive_stance':
      if (data.competitive_positioning !== undefined) positioning.competitive_positioning = data.competitive_positioning
      if (data.win_themes !== undefined) positioning.win_themes = data.win_themes
      if (data.competitive_landmines !== undefined) positioning.competitive_landmines = data.competitive_landmines
      break
    
    default:
      return NextResponse.json({ error: 'Unknown section' }, { status: 400 })
  }

  // Update metadata
  positioning.last_updated = new Date().toISOString().split('T')[0]
  positioning.version = (positioning.version || 0) + 1

  // Recalculate field count
  positioning.field_count = calculateFieldCount(positioning)

  // Update context
  context.corporate_positioning = positioning

  const { error } = await supabase
    .from('brands')
    .update({ 
      context,
      updated_at: new Date().toISOString()
    })
    .eq('id', brandId)

  if (error) {
    console.error('Failed to update corporate positioning:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    positioning,
    message: `${section} updated successfully`
  })
}

// PUT - Replace entire corporate positioning
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single()

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  const body = await request.json()
  const { positioning } = body

  if (!positioning) {
    return NextResponse.json({ error: 'positioning object is required' }, { status: 400 })
  }

  const context = (brand.context || {}) as BrandContext
  
  // Update metadata
  positioning.last_updated = new Date().toISOString().split('T')[0]
  positioning.version = ((context.corporate_positioning?.version || 0) + 1)
  positioning.field_count = calculateFieldCount(positioning)

  context.corporate_positioning = positioning

  const { error } = await supabase
    .from('brands')
    .update({ 
      context,
      updated_at: new Date().toISOString()
    })
    .eq('id', brandId)

  if (error) {
    console.error('Failed to update corporate positioning:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    positioning,
    message: 'Corporate positioning updated'
  })
}

// Helper to calculate filled field count
function calculateFieldCount(positioning: CorporatePositioning): number {
  let filled = 0
  
  // Section 1: Mission & Vision (2 fields)
  if (positioning.mission_statement) filled++
  if (positioning.vision_statement) filled++
  
  // Section 2: Target Markets (3 fields)
  if (positioning.primary_verticals?.length) filled++
  if (positioning.buyer_personas?.length) filled++
  if (positioning.user_personas?.length) filled++
  
  // Section 3: Value Proposition (3 fields)
  if (positioning.core_value_promise) filled++
  if (positioning.key_benefits?.length) filled++
  if (positioning.proof_points?.length) filled++
  
  // Section 4: Key Differentiators (6 fields - 3 pairs)
  const diffCount = positioning.differentiators?.length || 0
  filled += Math.min(diffCount * 2, 6)
  
  // Section 5: Messaging Pillars (6 fields - 3 pairs)
  const pillarCount = positioning.messaging_pillars?.length || 0
  filled += Math.min(pillarCount * 2, 6)
  
  // Section 6: Elevator Pitches (3 fields)
  if (positioning.pitch_10_second) filled++
  if (positioning.pitch_30_second) filled++
  if (positioning.pitch_2_minute) filled++
  
  // Section 7: Objection Handling (6 fields - 3 pairs)
  const objectionCount = positioning.objection_responses?.length || 0
  filled += Math.min(objectionCount * 2, 6)
  
  // Section 8: Competitive Stance (3 fields)
  if (positioning.competitive_positioning) filled++
  if (positioning.win_themes?.length) filled++
  if (positioning.competitive_landmines?.length) filled++
  
  return filled
}
