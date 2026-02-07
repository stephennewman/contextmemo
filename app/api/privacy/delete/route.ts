import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

const deleteSchema = z.object({
  confirm: z.literal(true),
})

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const parsed = deleteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: brands } = await supabase
      .from('brands')
      .select('id')
      .eq('tenant_id', user.id)

    const brandIds = (brands || []).map(brand => brand.id)

    const { data: competitors } = brandIds.length > 0
      ? await supabase
        .from('competitors')
        .select('id')
        .in('brand_id', brandIds)
      : { data: [] as Array<{ id: string }> }

    const competitorIds = (competitors || []).map(competitor => competitor.id)

    const { data: memos } = brandIds.length > 0
      ? await supabase
        .from('memos')
        .select('id')
        .in('brand_id', brandIds)
      : { data: [] as Array<{ id: string }> }

    const memoIds = (memos || []).map(memo => memo.id)

    if (memoIds.length > 0) {
      await supabase.from('memo_versions').delete().in('memo_id', memoIds)
    }

    if (competitorIds.length > 0) {
      await supabase.from('competitor_content').delete().in('competitor_id', competitorIds)
      await supabase.from('competitor_feeds').delete().in('competitor_id', competitorIds)
    }

    if (brandIds.length > 0) {
      await supabase.from('ai_traffic').delete().in('brand_id', brandIds)
      await supabase.from('search_console_stats').delete().in('brand_id', brandIds)
      await supabase.from('visibility_history').delete().in('brand_id', brandIds)
      await supabase.from('alerts').delete().in('brand_id', brandIds)
      await supabase.from('scan_results').delete().in('brand_id', brandIds)
      await supabase.from('queries').delete().in('brand_id', brandIds)
      await supabase.from('memos').delete().in('brand_id', brandIds)
      await supabase.from('brand_settings').delete().in('brand_id', brandIds)
      await supabase.from('competitors').delete().in('brand_id', brandIds)
      await supabase.from('brands').delete().in('id', brandIds)
    }

    await supabase.from('tenants').delete().eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Privacy delete error:', error)
    return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 })
  }
}
