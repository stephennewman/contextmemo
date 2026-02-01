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

  // Get hostname for subdomain routing
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]
  
  // Check if this is a memo subdomain request
  const isSubdomainRequest = 
    subdomain && 
    subdomain !== 'www' && 
    subdomain !== 'contextmemo' &&
    subdomain !== 'localhost' &&
    !hostname.startsWith('localhost')

  // If it's a subdomain request, rewrite to memo pages
  if (isSubdomainRequest) {
    const url = request.nextUrl.clone()
    url.pathname = `/memo/${subdomain}${request.nextUrl.pathname}`
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
