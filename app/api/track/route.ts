import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { detectAISource } from '@/lib/supabase/types'
import { z } from 'zod'

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

// Rate limiting: track IPs to prevent abuse
const recentRequests = new Map<string, number>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    // Rate limiting
    const now = Date.now()
    const lastRequest = recentRequests.get(ip)
    if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW) {
      const count = Array.from(recentRequests.entries())
        .filter(([key, time]) => key === ip && now - time < RATE_LIMIT_WINDOW)
        .length
      if (count >= MAX_REQUESTS_PER_WINDOW) {
        return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
      }
    }
    recentRequests.set(ip, now)
    
    // Clean old entries periodically
    if (Math.random() < 0.1) {
      for (const [key, time] of recentRequests.entries()) {
        if (now - time > RATE_LIMIT_WINDOW) {
          recentRequests.delete(key)
        }
      }
    }

    const body = await request.json().catch(() => null)
    const parsed = trackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { brandId, memoId, pageUrl, referrer } = parsed.data
    
    if (!brandId || !pageUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

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
      console.error('Track error:', error)
      return NextResponse.json({ tracked: false, error: 'db_error' })
    }

    return NextResponse.json({ 
      tracked: true, 
      source: referrerSource,
      isAI: !['organic', 'direct_nav'].includes(referrerSource)
    })
  } catch (error) {
    console.error('Track error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
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
