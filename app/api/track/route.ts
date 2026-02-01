import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { detectAISource } from '@/lib/supabase/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

    const body = await request.json()
    const { brandId, memoId, pageUrl, referrer } = body
    
    if (!brandId || !pageUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user agent from request
    const userAgent = request.headers.get('user-agent')
    
    // Detect AI source
    const referrerSource = detectAISource(referrer, userAgent)
    
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
  
  if (brandId && pageUrl) {
    // Fire and forget - don't wait for DB
    const userAgent = request.headers.get('user-agent')
    const referrer = request.headers.get('referer')
    const referrerSource = detectAISource(referrer, userAgent)
    
    if (referrerSource !== 'direct_nav') {
      const country = request.headers.get('x-vercel-ip-country') || 
                     request.headers.get('cf-ipcountry') ||
                     null
                     
      supabase.from('ai_traffic').insert({
        brand_id: brandId,
        memo_id: memoId || null,
        page_url: decodeURIComponent(pageUrl),
        referrer: referrer || null,
        referrer_source: referrerSource,
        user_agent: userAgent,
        country,
        timestamp: new Date().toISOString(),
      }).then(() => {}).catch(() => {})
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
