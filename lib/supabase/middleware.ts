import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getClientIp } from '@/lib/security/ip'
import { logSecurityEvent } from '@/lib/security/security-events'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Only call auth.getUser() when needed — skip for public pages to save egress
  const protectedPaths = ['/dashboard', '/brands', '/admin']
  const authPaths = ['/login', '/signup', '/verify-email']
  const needsAuth = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p)) ||
    authPaths.some(p => request.nextUrl.pathname === p) ||
    request.nextUrl.pathname.startsWith('/api')

  let user: import('@supabase/supabase-js').User | null = null
  if (needsAuth) {
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  const csrfBypassPaths = ['/api/billing/webhook', '/api/inngest', '/api/track']
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  const isBypassed = csrfBypassPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isStateChanging && isApiRoute && !isBypassed) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
    const allowedOrigins = (process.env.CSRF_ALLOWED_ORIGINS || '')
      .split(',')
      .map(entry => entry.trim())
      .filter(Boolean)

    if (origin) {
      const originHost = new URL(origin).host
      const isAllowed = originHost === host || allowedOrigins.includes(originHost) || allowedOrigins.includes(origin)

      if (!isAllowed) {
        await logSecurityEvent({
          type: 'csrf_blocked',
          ip: getClientIp(request),
          userId: user?.id || null,
          path: request.nextUrl.pathname,
          details: { origin },
        })
        return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
      }
    }
  }

  if (user) {
    const maxAgeHours = Number(process.env.SESSION_MAX_AGE_HOURS || 168)
    const lastSignInAt = user.last_sign_in_at

    if (maxAgeHours > 0 && lastSignInAt) {
      const lastSignInMs = new Date(lastSignInAt).getTime()
      const ageMs = Date.now() - lastSignInMs

      if (ageMs > maxAgeHours * 60 * 60 * 1000) {
        await logSecurityEvent({
          type: 'session_expired',
          ip: getClientIp(request),
          userId: user.id,
          path: request.nextUrl.pathname,
        })
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('reason', 'session_expired')
        return NextResponse.redirect(url)
      }
    }
  }

  // Get hostname for subdomain routing (check x-forwarded-host for Vercel)
  const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const hostParts = hostname.split('.')
  
  // Determine if this is a subdomain request
  // Valid subdomain patterns: checkit.contextmemo.com (3+ parts) or checkit.localhost:3000 (2+ parts for local)
  let subdomain: string | null = null
  
  if (hostParts.length >= 3) {
    // Production: checkit.contextmemo.com -> subdomain is 'checkit'
    const potentialSubdomain = hostParts[0]
    // Ensure it's not 'www' and the remaining parts form a valid domain
    if (potentialSubdomain !== 'www' && potentialSubdomain !== 'app') {
      subdomain = potentialSubdomain
    }
  } else if (hostParts.length === 2 && hostParts[1].startsWith('localhost')) {
    // Local dev: checkit.localhost:3000 -> subdomain is 'checkit'
    const potentialSubdomain = hostParts[0]
    if (potentialSubdomain !== 'localhost') {
      subdomain = potentialSubdomain
    }
  }

  // If it's a subdomain request, rewrite to memo pages
  if (subdomain) {
    const url = request.nextUrl.clone()
    // Preserve the original path
    const originalPath = request.nextUrl.pathname === '/' ? '' : request.nextUrl.pathname
    url.pathname = `/memo/${subdomain}${originalPath}`
    return NextResponse.rewrite(url)
  }

  // Protected routes that require authentication
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Check if user has verified their email for protected routes
  if (user && isProtectedPath) {
    const emailConfirmedAt = user.email_confirmed_at
    
    if (!emailConfirmedAt) {
      const url = request.nextUrl.clone()
      url.pathname = '/verify-email'
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated users away from auth pages (but allow verify-email for unverified)
  const isAuthPath = authPaths.some(path => 
    request.nextUrl.pathname === path
  )

  if (user && isAuthPath) {
    // If not verified, send to verify-email page
    if (!user.email_confirmed_at) {
      const url = request.nextUrl.clone()
      url.pathname = '/verify-email'
      return NextResponse.redirect(url)
    }
    // If verified, send to dashboard
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // If user is verified and tries to access verify-email, redirect to dashboard
  if (user && user.email_confirmed_at && request.nextUrl.pathname === '/verify-email') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
