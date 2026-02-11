import { describe, it, expect, vi } from 'vitest'
import { middleware } from '@/middleware'
import { updateSession } from '@/lib/supabase/middleware'
import { NextRequest, NextResponse } from 'next/server'

// Mock the updateSession function
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(() => Promise.resolve(NextResponse.next())),
}))

describe('middleware', () => {
  it('should call updateSession with the request', async () => {
    const mockRequest = new NextRequest('http://localhost/', {
      headers: { cookie: 'my-cookie=123' },
    })

    await middleware(mockRequest)

    expect(updateSession).toHaveBeenCalledWith(mockRequest)
  })

  it('should return the response from updateSession', async () => {
    const mockRequest = new NextRequest('http://localhost/', {
      headers: { cookie: 'my-cookie=123' },
    })
    const mockResponse = NextResponse.next()
    vi.mocked(updateSession).mockResolvedValue(mockResponse)

    const response = await middleware(mockRequest)

    expect(response).toBe(mockResponse)
  })
})
