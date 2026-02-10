import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getClientIp, isAdminIP } from '@/lib/security/ip'

describe('getClientIp', () => {
  it('returns the first IP from x-forwarded-for header', () => {
    const request = new NextRequest(new URL('http://localhost/test'), {
      headers: {
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      },
    })
    expect(getClientIp(request)).toBe('192.168.1.1')
  })

  it('trims whitespace from x-forwarded-for IP', () => {
    const request = new NextRequest(new URL('http://localhost/test'), {
      headers: {
        'x-forwarded-for': '  192.168.1.2  , 10.0.0.1',
      },
    })
    expect(getClientIp(request)).toBe('192.168.1.2')
  })

  it('falls back to x-real-ip when x-forwarded-for is not present', () => {
    const request = new NextRequest(new URL('http://localhost/test'), {
      headers: {
        'x-real-ip': '10.0.0.2',
      },
    })
    expect(getClientIp(request)).toBe('10.0.0.2')
  })

  it('returns "unknown" when no IP headers are present', () => {
    const request = new NextRequest(new URL('http://localhost/test'))
    expect(getClientIp(request)).toBe('unknown')
  })

  it('returns "unknown" when x-forwarded-for is empty string', () => {
    const request = new NextRequest(new URL('http://localhost/test'), {
      headers: {
        'x-forwarded-for': '',
      },
    })
    expect(getClientIp(request)).toBe('unknown')
  })
})

describe('isAdminIP', () => {
  const originalEnv = process.env.ADMIN_IP_WHITELIST

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ADMIN_IP_WHITELIST = originalEnv
    } else {
      delete process.env.ADMIN_IP_WHITELIST
    }
  })

  it('returns true when no whitelist is configured', () => {
    delete process.env.ADMIN_IP_WHITELIST
    expect(isAdminIP('192.168.1.1')).toBe(true)
  })

  it('returns true when whitelist is empty string', () => {
    process.env.ADMIN_IP_WHITELIST = ''
    expect(isAdminIP('192.168.1.1')).toBe(true)
  })

  it('returns true when IP is in whitelist', () => {
    process.env.ADMIN_IP_WHITELIST = '192.168.1.1, 10.0.0.1'
    expect(isAdminIP('192.168.1.1')).toBe(true)
    expect(isAdminIP('10.0.0.1')).toBe(true)
  })

  it('returns false when IP is not in whitelist', () => {
    process.env.ADMIN_IP_WHITELIST = '192.168.1.1, 10.0.0.1'
    expect(isAdminIP('192.168.1.2')).toBe(false)
  })

  it('handles whitespace in whitelist', () => {
    process.env.ADMIN_IP_WHITELIST = '  192.168.1.1  ,  10.0.0.1  '
    expect(isAdminIP('192.168.1.1')).toBe(true)
    expect(isAdminIP('10.0.0.1')).toBe(true)
  })

  it('handles single IP in whitelist', () => {
    process.env.ADMIN_IP_WHITELIST = '192.168.1.1'
    expect(isAdminIP('192.168.1.1')).toBe(true)
    expect(isAdminIP('192.168.1.2')).toBe(false)
  })
})
