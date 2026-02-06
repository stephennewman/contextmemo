import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { classifySentiment } from '@/lib/utils/sentiment'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * One-time backfill route to classify sentiment for existing scan results.
 * Only processes scans where brand was mentioned but sentiment is null.
 * 
 * POST /api/backfill-sentiment
 */
export async function POST(request: Request) {
  // Simple auth check — require a secret header
  const authHeader = request.headers.get('x-admin-key')
  if (authHeader !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch scans that need sentiment backfill
  const { data: scans, error } = await supabase
    .from('scan_results')
    .select('id, brand_context, response_text, brand_id')
    .eq('brand_mentioned', true)
    .is('brand_sentiment', null)
    .limit(500)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!scans || scans.length === 0) {
    return NextResponse.json({ message: 'No scans to backfill', count: 0 })
  }

  // Get brand names for each brand_id
  const brandIds = [...new Set(scans.map(s => s.brand_id))]
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .in('id', brandIds)
  
  const brandNameMap = new Map<string, string>()
  for (const b of brands || []) {
    brandNameMap.set(b.id, b.name.toLowerCase())
  }

  // Classify and update each scan
  let updated = 0
  let errors = 0

  for (const scan of scans) {
    const brandName = brandNameMap.get(scan.brand_id) || ''
    if (!brandName) {
      errors++
      continue
    }

    const result = classifySentiment(
      scan.response_text || '',
      brandName,
      scan.brand_context
    )

    const { error: updateError } = await supabase
      .from('scan_results')
      .update({
        brand_sentiment: result.sentiment,
        sentiment_reason: result.reason,
      })
      .eq('id', scan.id)

    if (updateError) {
      errors++
    } else {
      updated++
    }
  }

  return NextResponse.json({
    message: `Backfilled sentiment for ${updated} scans`,
    total: scans.length,
    updated,
    errors,
  })
}
