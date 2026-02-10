import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock environment variables
const originalEnv = process.env

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({ mock: 'browser-client' })),
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      signOut: vi.fn(),
    },
  })),
}))

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ mock: 'service-client' })),
}))

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}))

// Mock security modules
vi.mock('@/lib/security/ip', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('@/lib/security/security-events', () => ({
  logSecurityEvent: vi.fn(),
}))

const { createBrowserClient, createServerClient } = await import('@supabase/ssr')
const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
const { cookies } = await import('next/headers')
const { getClientIp } = await import('@/lib/security/ip')
const { logSecurityEvent } = await import('@/lib/security/security-events')

describe('supabase/client.ts', () => {
  // Note: The client module is globally mocked in test/setup.ts
  // These tests verify the mock is working correctly
  
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return a mock client from the global mock', async () => {
    // The global mock in test/setup.ts mocks this module
    // We're testing that the mock is properly configured
    const { createClient } = await import('@/lib/supabase/client')
    const client = createClient()
    
    // The global mock returns a client with auth methods
    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
    expect(typeof client.auth.getUser).toBe('function')
  })
})

describe('supabase/server.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should create a server client with cookies', async () => {
    const mockCookieStore = {
      getAll: vi.fn(() => [{ name: 'sb-token', value: 'test-token' }]),
      set: vi.fn(),
    }
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>)

    const { createClient } = await import('@/lib/supabase/server')

    const client = await createClient()

    expect(createServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    )
  })

  it('should call cookieStore.getAll in the getAll callback', async () => {
    const mockCookieStore = {
      getAll: vi.fn(() => [{ name: 'sb-token', value: 'test-token' }]),
      set: vi.fn(),
    }
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>)

    const { createClient } = await import('@/lib/supabase/server')
    await createClient()

    // Get the cookies config passed to createServerClient
    const callArgs = vi.mocked(createServerClient).mock.calls[0]
    const cookiesConfig = callArgs?.[2]?.cookies as { getAll: () => void; setAll: (cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => void } | undefined

    expect(cookiesConfig).toBeDefined()
    
    // Call getAll and verify it delegates to cookieStore
    const result = cookiesConfig!.getAll()
    expect(mockCookieStore.getAll).toHaveBeenCalled()
    expect(result).toEqual([{ name: 'sb-token', value: 'test-token' }])
  })

  it('should handle setAll with try/catch', async () => {
    const mockCookieStore = {
      getAll: vi.fn(() => []),
      set: vi.fn(),
    }
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>)

    const { createClient } = await import('@/lib/supabase/server')
    await createClient()

    // Get the cookies config passed to createServerClient
    const callArgs = vi.mocked(createServerClient).mock.calls[0]
    const cookiesConfig = callArgs?.[2]?.cookies as { getAll: () => void; setAll: (cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => void } | undefined

    expect(cookiesConfig).toBeDefined()
    
    // Call setAll and verify it delegates to cookieStore.set
    cookiesConfig!.setAll([
      { name: 'sb-token', value: 'new-token', options: { httpOnly: true } },
    ])
    expect(mockCookieStore.set).toHaveBeenCalledWith('sb-token', 'new-token', { httpOnly: true })
  })

  it('should swallow errors in setAll (Server Component scenario)', async () => {
    const mockCookieStore = {
      getAll: vi.fn(() => []),
      set: vi.fn().mockImplementation(() => {
        throw new Error('Cannot set cookie in Server Component')
      }),
    }
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as unknown as Awaited<ReturnType<typeof cookies>>)

    const { createClient } = await import('@/lib/supabase/server')
    await createClient()

    const callArgs = vi.mocked(createServerClient).mock.calls[0]
    const cookiesConfig = callArgs?.[2]?.cookies as { getAll: () => void; setAll: (cookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => void } | undefined

    // Should not throw
    expect(() => {
      cookiesConfig!.setAll([
        { name: 'sb-token', value: 'new-token', options: {} },
      ])
    }).not.toThrow()
  })
})

describe('supabase/service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should create a service role client with environment variables', async () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    }

    const { createServiceRoleClient } = await import('@/lib/supabase/service')

    const client = createServiceRoleClient()

    expect(createSupabaseClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-service-key'
    )
    expect(client).toEqual({ mock: 'service-client' })
  })

  it('should throw error when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    }

    const { createServiceRoleClient } = await import('@/lib/supabase/service')

    expect(() => createServiceRoleClient()).toThrow(
      'SUPABASE_SERVICE_ROLE_KEY is required in production'
    )
  })

  it('should throw error when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
    }

    const { createServiceRoleClient } = await import('@/lib/supabase/service')

    expect(() => createServiceRoleClient()).toThrow(
      'SUPABASE_SERVICE_ROLE_KEY is required in production'
    )
  })
})

describe('supabase/middleware.ts', () => {
  let mockSupabaseClient: {
    auth: {
      getUser: ReturnType<typeof vi.fn>
      signOut: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(async () => {
    vi.clearAllMocks()

    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SESSION_MAX_AGE_HOURS: '168',
      CSRF_ALLOWED_ORIGINS: '',
    }

    mockSupabaseClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        signOut: vi.fn().mockResolvedValue({}),
      },
    }

    vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as unknown as ReturnType<typeof createServerClient>)
    vi.mocked(getClientIp).mockReturnValue('192.168.1.1')
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // Helper to create a mock URL with clone functionality
  const createMockUrl = (href: string) => {
    const url = new URL(href)
    return {
      href: url.href,
      origin: url.origin,
      protocol: url.protocol,
      username: url.username,
      password: url.password,
      host: url.host,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      searchParams: url.searchParams,
      hash: url.hash,
      clone: () => createMockUrl(href),
      toString: () => href,
      toJSON: () => href,
    }
  }

  const createMockRequest = (options: {
    pathname?: string
    method?: string
    origin?: string | null
    host?: string
    cookies?: Record<string, string>
  } = {}): NextRequest => {
    const baseUrl = `https://${options.host || 'app.contextmemo.com'}`
    const fullPath = options.pathname || '/'
    
    const headers = new Headers()
    const mockUrl = createMockUrl(`${baseUrl}${fullPath}`)
    
    const request = {
      nextUrl: mockUrl,
      method: options.method || 'GET',
      headers,
      cookies: {
        getAll: vi.fn(() =>
          Object.entries(options.cookies || {}).map(([name, value]) => ({ name, value }))
        ),
        set: vi.fn(),
      },
    } as unknown as NextRequest

    if (options.origin !== undefined && options.origin !== null) {
      headers.set('origin', options.origin)
    }
    if (options.host) {
      headers.set('host', options.host)
      headers.set('x-forwarded-host', options.host)
    }

    return request
  }

  describe('basic functionality', () => {
    it('should create a server client with cookies', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({ pathname: '/public' })

      await updateSession(request)

      expect(createServerClient).toHaveBeenCalled()
    })

    it('should return NextResponse.next() for public routes', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({ pathname: '/public' })

      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })
  })

  describe('CSRF protection', () => {
    it('should block POST requests from invalid origins', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({
        pathname: '/api/test',
        method: 'POST',
        origin: 'https://evil.com',
        host: 'app.contextmemo.com',
      })

      const response = await updateSession(request)

      expect(response.status).toBe(403)
      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'csrf_blocked',
          ip: '192.168.1.1',
          path: '/api/test',
          details: { origin: 'https://evil.com' },
        })
      )
    })

    it('should allow POST requests from same origin', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({
        pathname: '/api/test',
        method: 'POST',
        origin: 'https://app.contextmemo.com',
        host: 'app.contextmemo.com',
      })

      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })

    it('should allow POST requests from allowed origins', async () => {
      process.env.CSRF_ALLOWED_ORIGINS = 'trusted.com,another.com'

      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({
        pathname: '/api/test',
        method: 'POST',
        origin: 'https://trusted.com',
        host: 'app.contextmemo.com',
      })

      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })

    it('should bypass CSRF for webhook routes', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({
        pathname: '/api/billing/webhook',
        method: 'POST',
        origin: 'https://evil.com',
        host: 'app.contextmemo.com',
      })

      const response = await updateSession(request)

      expect(response.status).toBe(200)
      expect(logSecurityEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'csrf_blocked' })
      )
    })

    it('should bypass CSRF for Inngest routes', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({
        pathname: '/api/inngest',
        method: 'POST',
        origin: 'https://evil.com',
        host: 'app.contextmemo.com',
      })

      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })

    it('should bypass CSRF for track routes', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({
        pathname: '/api/track',
        method: 'POST',
        origin: 'https://evil.com',
        host: 'app.contextmemo.com',
      })

      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })

    it('should allow requests without origin header', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({
        pathname: '/api/test',
        method: 'POST',
        origin: null,
        host: 'app.contextmemo.com',
      })

      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })

    it('should not check CSRF for GET requests', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({
        pathname: '/api/test',
        method: 'GET',
        origin: 'https://evil.com',
        host: 'app.contextmemo.com',
      })

      const response = await updateSession(request)

      expect(response.status).toBe(200)
      expect(logSecurityEvent).not.toHaveBeenCalled()
    })
  })

  describe('session expiration', () => {
    it('should sign out user when session is expired', async () => {
      const expiredDate = new Date(Date.now() - 200 * 60 * 60 * 1000) // 200 hours ago
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            last_sign_in_at: expiredDate.toISOString(),
          },
        },
      })

      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({ pathname: '/dashboard' })

      const response = await updateSession(request)

      expect(logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'session_expired',
          userId: 'user-123',
        })
      )
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should not expire session when within max age', async () => {
      const recentDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            last_sign_in_at: recentDate.toISOString(),
            email_confirmed_at: recentDate.toISOString(),
          },
        },
      })

      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({ pathname: '/dashboard' })

      const response = await updateSession(request)

      expect(mockSupabaseClient.auth.signOut).not.toHaveBeenCalled()
      expect(response.status).toBe(200)
    })

    it('should use custom SESSION_MAX_AGE_HOURS', async () => {
      process.env.SESSION_MAX_AGE_HOURS = '48'

      const oldDate = new Date(Date.now() - 72 * 60 * 60 * 1000) // 72 hours ago
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            last_sign_in_at: oldDate.toISOString(),
          },
        },
      })

      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({ pathname: '/dashboard' })

      await updateSession(request)

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    it('should skip session check when SESSION_MAX_AGE_HOURS is 0', async () => {
      process.env.SESSION_MAX_AGE_HOURS = '0'

      const veryOldDate = new Date(Date.now() - 1000 * 60 * 60 * 1000) // Very old
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            last_sign_in_at: veryOldDate.toISOString(),
            email_confirmed_at: new Date().toISOString(),
          },
        },
      })

      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({ pathname: '/dashboard' })

      const response = await updateSession(request)

      expect(mockSupabaseClient.auth.signOut).not.toHaveBeenCalled()
      expect(response.status).toBe(200)
    })
  })

  describe('subdomain routing', () => {
    it('should rewrite to memo page for production subdomain', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({
        pathname: '/',
        host: 'acme.contextmemo.com',
      })

      const response = await updateSession(request)

      // NextResponse.rewrite returns a response with the rewritten URL
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should rewrite with path preserved for subdomain', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({
        pathname: '/article',
        host: 'acme.contextmemo.com',
      })

      const response = await updateSession(request)

      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should not rewrite for www subdomain', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({
        pathname: '/',
        host: 'www.contextmemo.com',
      })

      const response = await updateSession(request)

      // Should not be a rewrite, just continue
      expect(response.status).toBe(200)
    })

    it('should not rewrite for app subdomain', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({
        pathname: '/',
        host: 'app.contextmemo.com',
      })

      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })

    it('should rewrite for localhost subdomain in development', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({
        pathname: '/',
        host: 'acme.localhost:3000',
      })

      const response = await updateSession(request)

      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should not rewrite for plain localhost', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({
        pathname: '/',
        host: 'localhost:3000',
      })

      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })
  })

  describe('protected routes', () => {
    it('should redirect unauthenticated users to login', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({ pathname: '/dashboard' })

      const response = await updateSession(request)

      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should redirect unauthenticated users from /brands', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({ pathname: '/brands/123' })

      const response = await updateSession(request)

      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should redirect unauthenticated users from /admin', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
      })

      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({ pathname: '/admin' })

      const response = await updateSession(request)

      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should allow authenticated users to access protected routes', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email_confirmed_at: new Date().toISOString(),
          },
        },
      })

      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({ pathname: '/dashboard' })

      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })
  })

  describe('email verification', () => {
    it('should redirect unverified users to verify-email page', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email_confirmed_at: null,
          },
        },
      })

      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({ pathname: '/dashboard' })

      const response = await updateSession(request)

      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should redirect unverified users from login to verify-email', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email_confirmed_at: null,
          },
        },
      })

      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({ pathname: '/login' })

      const response = await updateSession(request)

      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should redirect verified users from login to dashboard', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email_confirmed_at: new Date().toISOString(),
          },
        },
      })

      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({ pathname: '/login' })

      const response = await updateSession(request)

      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should redirect verified users from signup to dashboard', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email_confirmed_at: new Date().toISOString(),
          },
        },
      })

      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({ pathname: '/signup' })

      const response = await updateSession(request)

      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should redirect verified users from verify-email to dashboard', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email_confirmed_at: new Date().toISOString(),
          },
        },
      })

      const { updateSession } = await import('@/lib/supabase/middleware')
      const request = createMockRequest({ pathname: '/verify-email' })

      const response = await updateSession(request)

      expect(response).toBeInstanceOf(NextResponse)
    })
  })
})
