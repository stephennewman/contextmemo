import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ActivitySavedView } from '@/lib/supabase/types'

// GET - List saved views for current user
export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: views, error } = await supabase
      .from('activity_saved_views')
      .select('*')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      // Table may not exist yet
      if (error.code === '42P01') {
        return NextResponse.json({ views: [] })
      }
      throw error
    }

    return NextResponse.json({ views: views || [] })
  } catch (error) {
    console.error('Failed to fetch saved views:', error)
    return NextResponse.json({ error: 'Failed to fetch saved views' }, { status: 500 })
  }
}

// POST - Create a new saved view
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, filters, is_default } = body

    if (!name || !filters) {
      return NextResponse.json({ error: 'Name and filters are required' }, { status: 400 })
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabase
        .from('activity_saved_views')
        .update({ is_default: false })
        .eq('tenant_id', user.id)
        .eq('is_default', true)
    }

    const { data: view, error } = await supabase
      .from('activity_saved_views')
      .insert({
        tenant_id: user.id,
        name,
        filters,
        is_default: is_default || false,
      })
      .select()
      .single()

    if (error) {
      // Table may not exist yet - fallback to localStorage on client
      if (error.code === '42P01') {
        return NextResponse.json({ 
          view: { id: crypto.randomUUID(), name, filters, is_default, tenant_id: user.id },
          warning: 'Saved views table not yet created. View stored locally.'
        })
      }
      throw error
    }

    return NextResponse.json({ view })
  } catch (error) {
    console.error('Failed to create saved view:', error)
    return NextResponse.json({ error: 'Failed to create saved view' }, { status: 500 })
  }
}

// DELETE - Delete a saved view
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const viewId = searchParams.get('id')

    if (!viewId) {
      return NextResponse.json({ error: 'View ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('activity_saved_views')
      .delete()
      .eq('id', viewId)
      .eq('tenant_id', user.id) // Ensure user owns the view

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, warning: 'Table not found' })
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete saved view:', error)
    return NextResponse.json({ error: 'Failed to delete saved view' }, { status: 500 })
  }
}
