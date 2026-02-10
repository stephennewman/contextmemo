import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isValidUUID } from '@/lib/security/validation'

interface RouteParams {
  params: Promise<{ brandId: string }>
}

// Lightweight endpoint for polling memo count during generation
// ?include_latest=true also returns the most recently created memo
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { brandId } = await params

  if (!isValidUUID(brandId)) {
    return NextResponse.json({ error: 'Invalid brand ID' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const includeLatest = request.nextUrl.searchParams.get('include_latest') === 'true'

  const [countResult, latestResult] = await Promise.all([
    supabase
      .from('memos')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId),
    includeLatest
      ? supabase
          .from('memos')
          .select('id, title, slug, memo_type, status')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (countResult.error) {
    return NextResponse.json({ error: 'Failed to check memo count' }, { status: 500 })
  }

  return NextResponse.json({ 
    count: countResult.count ?? 0,
    ...(latestResult.data && { latest: latestResult.data }),
  })
}
