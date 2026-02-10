import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { detectAISource } from '@/lib/supabase/types'
import { z } from 'zod'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const supabase = createServiceRoleClient()

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const isValidUrl = (value: string) => {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

const trackSchema = z.object({
  brandId: z.string().regex(uuidRegex, 'Invalid brandId'),
  memoId: z.string().regex(uuidRegex, 'Invalid memoId').optional(),
  pageUrl: z.string().refine(isValidUrl, 'Invalid pageUrl'),
  referrer: z.string().optional(),
})

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '60 s'), // 100 requests per 60 seconds
  analytics: true,
})

export async function POST(request: NextRequest) {
  // Get IP for rate limiting (defined outside try block so it's accessible in catch)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  try {
    // Distributed Rate limiting
    const { success } = await ratelimit.limit(ip)
    
    if (!success) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
    }

    const body = await request.json().catch(() => null)
    const parsed = trackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { brandId, memoId, pageUrl, referrer } = parsed.data
    

    // Get user agent from request
    const userAgent = request.headers.get('user-agent')
    
    // Detect AI source
    const referrerSource = detectAISource(referrer ?? null, userAgent)
    
    // Only track AI traffic and organic (skip direct_nav to reduce noise)
    if (referrerSource === 'direct_nav') {
      return NextResponse.json({ tracked: false, reason: 'direct_nav_ignored' })
    }

    // Get country from headers (if using Vercel/Cloudflare)
    const country = request.headers.get('x-vercel-ip-country') || 
                   request.headers.get('cf-ipcountry') ||
                   null

    // Insert tracking event
    const { error } = await supabase
      .from('ai_traffic')
      .insert({
        brand_id: brandId,
        memo_id: memoId || null,
        page_url: pageUrl,
        referrer: referrer || null,
        referrer_source: referrerSource,
        user_agent: userAgent,
        country,
        timestamp: new Date().toISOString(),
      })

    if (error) {
      // Table might not exist yet - fail silently in production
      console.error('Track error in Supabase insert', { error: error.message, brandId, memoId })
      return NextResponse.json({ tracked: false, error: 'An unexpected error occurred' })
    }

    return NextResponse.json({ 
      tracked: true, 
      source: referrerSource,
      isAI: !['organic', 'direct_nav'].includes(referrerSource)
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Track error in POST handler', { error: errorMessage, ip })
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

// GET endpoint for simple pixel tracking (1x1 gif)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const brandId = searchParams.get('b')
  const memoId = searchParams.get('m')
  const pageUrl = searchParams.get('u')
  
  if (brandId && pageUrl && uuidRegex.test(brandId)) {
    // Fire and forget - don't wait for DB
    const userAgent = request.headers.get('user-agent')
    const referrer = request.headers.get('referer')
    const referrerSource = detectAISource(referrer, userAgent)
    
    if (referrerSource !== 'direct_nav') {
      const country = request.headers.get('x-vercel-ip-country') || 
                     request.headers.get('cf-ipcountry') ||
                     null

      let decodedUrl: string | null = null
      try {
        decodedUrl = decodeURIComponent(pageUrl)
      } catch {
        decodedUrl = null
      }

      if (decodedUrl && isValidUrl(decodedUrl)) {
        const safeMemoId = memoId && uuidRegex.test(memoId) ? memoId : null
        // Fire and forget - don't block the pixel response
        void supabase.from('ai_traffic').insert({
          brand_id: brandId,
          memo_id: safeMemoId,
          page_url: decodedUrl,
          referrer: referrer || null,
          referrer_source: referrerSource,
          user_agent: userAgent,
          country,
          timestamp: new Date().toISOString(),
        })
      }
    }
  }

  // Return 1x1 transparent GIF
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  return new NextResponse(gif, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
