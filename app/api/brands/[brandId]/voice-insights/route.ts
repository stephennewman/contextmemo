import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VoiceInsight, VoiceInsightTopic } from '@/lib/supabase/types'
import { z } from 'zod'

// GET - List voice insights for a brand
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(brandId)) {
    return NextResponse.json({ error: 'Invalid brandId format' }, { status: 400 })
  }
  const supabase = await createClient()
  
  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get query params for filtering
  const { searchParams } = new URL(request.url)
  const topic = searchParams.get('topic') as VoiceInsightTopic | null
  const status = searchParams.get('status') || 'active'
  
  // Build query
  let query = supabase
    .from('voice_insights')
    .select('*')
    .eq('brand_id', brandId)
    .eq('status', status)
    .order('recorded_at', { ascending: false })
  
  if (topic) {
    query = query.eq('topic', topic)
  }
  
  const { data: insights, error } = await query
  
  if (error) {
    console.error('Error fetching voice insights:', error)
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 })
  }
  
  return NextResponse.json({ insights })
}

// POST - Create a new voice insight
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(brandId)) {
    return NextResponse.json({ error: 'Invalid brandId format' }, { status: 400 })
  }
  const supabase = await createClient()
  
  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get brand to verify ownership and get tenant_id
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, tenant_id')
    .eq('id', brandId)
    .single()
  
  if (brandError || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }
  
  // Parse request body
  const schema = z.object({
    title: z.string().min(2).max(200),
    transcript: z.string().min(10),
    topic: z.string().min(2),
    tags: z.array(z.string()).optional(),
    audio_url: z.string().url().optional(),
    audio_duration_seconds: z.number().nonnegative().optional(),
    recorded_by_name: z.string().min(2).max(100),
    recorded_by_title: z.string().optional(),
    recorded_by_email: z.string().email().optional(),
    recorded_by_linkedin_url: z.string().url().optional(),
    status: z.string().optional(),
  })

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Missing or invalid fields for voice insight' },
      { status: 400 }
    )
  }

  const {
    title,
    transcript,
    topic,
    tags = [],
    audio_url,
    audio_duration_seconds,
    recorded_by_name,
    recorded_by_title,
    recorded_by_email,
    recorded_by_linkedin_url,
    status = 'active',
  } = parsed.data
  
  // Get IP and geolocation from request headers
  const ip_address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip')
    || null
  
  // Get geolocation from Vercel headers (if available)
  const geolocation = {
    city: request.headers.get('x-vercel-ip-city') || undefined,
    region: request.headers.get('x-vercel-ip-country-region') || undefined,
    country: request.headers.get('x-vercel-ip-country') || undefined,
    timezone: request.headers.get('x-vercel-ip-timezone') || undefined,
    lat: request.headers.get('x-vercel-ip-latitude') 
      ? parseFloat(request.headers.get('x-vercel-ip-latitude')!) 
      : undefined,
    lng: request.headers.get('x-vercel-ip-longitude')
      ? parseFloat(request.headers.get('x-vercel-ip-longitude')!)
      : undefined,
  }
  
  // Clean up empty geolocation
  const hasGeolocation = Object.values(geolocation).some(v => v !== undefined)
  
  // Create the insight
  const { data: insight, error: insertError } = await supabase
    .from('voice_insights')
    .insert({
      brand_id: brandId,
      tenant_id: brand.tenant_id,
      title,
      transcript,
      topic,
      tags,
      audio_url,
      audio_duration_seconds,
      recorded_at: new Date().toISOString(),
      recorded_by_user_id: user.id,
      recorded_by_name,
      recorded_by_title,
      recorded_by_email: recorded_by_email || user.email,
      recorded_by_linkedin_url,
      ip_address,
      geolocation: hasGeolocation ? geolocation : null,
      status,
      cited_in_memos: [],
      citation_count: 0,
    })
    .select()
    .single()
  
  if (insertError) {
    console.error('Error creating voice insight:', insertError)
    return NextResponse.json({ error: 'Failed to create insight' }, { status: 500 })
  }
  
  return NextResponse.json({ insight, message: 'Voice insight created successfully' })
}
