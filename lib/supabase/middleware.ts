import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
  const protectedPaths = ['/dashboard', '/brands']
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
  const authPaths = ['/login', '/signup']
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
