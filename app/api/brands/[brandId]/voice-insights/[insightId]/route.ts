import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// GET - Get a single voice insight
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string; insightId: string }> }
) {
  const { brandId, insightId } = await params
  if (!uuidRegex.test(brandId) || !uuidRegex.test(insightId)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
  }
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
  if (!uuidRegex.test(brandId) || !uuidRegex.test(insightId)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
  }
  const supabase = await createClient()
  
  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const schema = z.object({
    title: z.string().min(2).max(200).optional(),
    transcript: z.string().min(10).optional(),
    topic: z.string().min(2).optional(),
    tags: z.array(z.string()).optional(),
    recorded_by_name: z.string().min(2).max(100).optional(),
    recorded_by_title: z.string().optional(),
    recorded_by_linkedin_url: z.string().url().optional(),
    status: z.string().optional(),
  })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid update payload' }, { status: 400 })
  }

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
    if (parsed.data[field as keyof typeof parsed.data] !== undefined) {
      updates[field] = parsed.data[field as keyof typeof parsed.data]
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
  if (!uuidRegex.test(brandId) || !uuidRegex.test(insightId)) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
  }
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
