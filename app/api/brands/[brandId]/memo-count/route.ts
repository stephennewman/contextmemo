import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/security/validation'

interface RouteParams {
  params: Promise<{ brandId: string }>
}

// Lightweight endpoint for polling memo count during generation
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params

  if (!isValidUUID(brandId)) {
    return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { count, error } = await supabase
    .from('memos')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', brandId)

  if (error) {
    return NextResponse.json({ error: 'Failed to check memo count' }, { status: 500 })
  }

  return NextResponse.json({ count: count ?? 0 })
}
