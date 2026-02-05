import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { detectAISource } from '@/lib/supabase/types'
import { isValidUUID, isValidURL, requireServiceRoleKey } from '@/lib/security/validation'

const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  requireServiceRoleKey()
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
    
    // Validate required fields
    if (!brandId || !pageUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate UUIDs to prevent injection
    if (!isValidUUID(brandId)) {
      return NextResponse.json({ error: 'Invalid brandId format' }, { status: 400 })
    }

    if (memoId && !isValidUUID(memoId)) {
      return NextResponse.json({ error: 'Invalid memoId format' }, { status: 400 })
    }

    // Validate URL format
    if (!isValidURL(pageUrl)) {
      return NextResponse.json({ error: 'Invalid pageUrl format' }, { status: 400 })
    }

    // Validate referrer if provided
    if (referrer && typeof referrer !== 'string') {
      return NextResponse.json({ error: 'Invalid referrer format' }, { status: 400 })
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
    const supabase = getSupabase()
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
  
  // Validate inputs before processing
  if (brandId && pageUrl && isValidUUID(brandId)) {
    // Validate memoId if provided
    if (memoId && !isValidUUID(memoId)) {
      // Skip invalid memoId tracking
    } else {
      // Fire and forget - don't wait for DB
      const userAgent = request.headers.get('user-agent')
      const referrer = request.headers.get('referer')
      const referrerSource = detectAISource(referrer, userAgent)
      
      if (referrerSource !== 'direct_nav') {
        // Safely decode URL
        let decodedUrl: string
        try {
          decodedUrl = decodeURIComponent(pageUrl)
          // Validate the decoded URL
          if (!isValidURL(decodedUrl)) {
            decodedUrl = pageUrl // Use original if decode results in invalid URL
          }
        } catch {
          decodedUrl = pageUrl // Use original on decode error
        }

        const country = request.headers.get('x-vercel-ip-country') || 
                       request.headers.get('cf-ipcountry') ||
                       null
                       
        // Fire and forget - don't block the pixel response
        try {
          const supabase = getSupabase()
          void supabase.from('ai_traffic').insert({
            brand_id: brandId,
            memo_id: memoId || null,
            page_url: decodedUrl,
            referrer: referrer || null,
            referrer_source: referrerSource,
            user_agent: userAgent,
            country,
            timestamp: new Date().toISOString(),
          })
        } catch {
          // Silently fail for pixel tracking
        }
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
