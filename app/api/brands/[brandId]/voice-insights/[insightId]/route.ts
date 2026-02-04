import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get a single voice insight
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string; insightId: string }> }
) {
  const { brandId, insightId } = await params
  const supabase = await createClient()
  
  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { data: insight, error } = await supabase
    .from('voice_insights')
    .select('*')
    .eq('id', insightId)
    .eq('brand_id', brandId)
    .single()
  
  if (error || !insight) {
    return NextResponse.json({ error: 'Insight not found' }, { status: 404 })
  }
  
  return NextResponse.json({ insight })
}

// PATCH - Update a voice insight
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string; insightId: string }> }
) {
  const { brandId, insightId } = await params
  const supabase = await createClient()
  
  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const body = await request.json()
  const allowedFields = [
    'title',
    'transcript',
    'topic',
    'tags',
    'recorded_by_name',
    'recorded_by_title',
    'recorded_by_linkedin_url',
    'status',
  ]
  
  // Filter to only allowed fields
  const updates: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }
  
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }
  
  updates.updated_at = new Date().toISOString()
  
  const { data: insight, error } = await supabase
    .from('voice_insights')
    .update(updates)
    .eq('id', insightId)
    .eq('brand_id', brandId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating voice insight:', error)
    return NextResponse.json({ error: 'Failed to update insight' }, { status: 500 })
  }
  
  return NextResponse.json({ insight, message: 'Voice insight updated' })
}

// DELETE - Delete (archive) a voice insight
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string; insightId: string }> }
) {
  const { brandId, insightId } = await params
  const supabase = await createClient()
  
  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Soft delete by setting status to archived
  const { error } = await supabase
    .from('voice_insights')
    .update({ 
      status: 'archived',
      updated_at: new Date().toISOString()
    })
    .eq('id', insightId)
    .eq('brand_id', brandId)
  
  if (error) {
    console.error('Error archiving voice insight:', error)
    return NextResponse.json({ error: 'Failed to delete insight' }, { status: 500 })
  }
  
  return NextResponse.json({ message: 'Voice insight archived' })
}
