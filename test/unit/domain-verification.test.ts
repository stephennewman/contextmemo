import { describe, it, expect } from 'vitest'
import {
  getRootDomain,
  getEmailDomain,
  verifyDomainOwnership,
  generateSubdomain,
  isValidSubdomain,
} from '@/lib/utils/domain-verification'

describe('getRootDomain', () => {
  it('should extract root domain from subdomain', () => {
    expect(getRootDomain('marketing.checkit.net')).toBe('checkit.net')
    expect(getRootDomain('blog.example.com')).toBe('example.com')
  })

  it('should return domain as-is if already root', () => {
    expect(getRootDomain('checkit.net')).toBe('checkit.net')
    expect(getRootDomain('example.com')).toBe('example.com')
  })

  it('should handle protocols', () => {
    expect(getRootDomain('https://www.checkit.net')).toBe('checkit.net')
    expect(getRootDomain('http://checkit.net')).toBe('checkit.net')
  })

  it('should handle ports', () => {
    expect(getRootDomain('checkit.net:3000')).toBe('checkit.net')
    // localhost is special-cased as a valid domain
    expect(getRootDomain('localhost:3000')).toBe('localhost')
  })

  it('should handle paths', () => {
    expect(getRootDomain('checkit.net/path/to/page')).toBe('checkit.net')
    expect(getRootDomain('www.example.com/about')).toBe('example.com')
  })

  it('should handle multi-part TLDs', () => {
    expect(getRootDomain('www.example.co.uk')).toBe('example.co.uk')
    expect(getRootDomain('blog.company.com.au')).toBe('company.com.au')
  })
})

describe('getEmailDomain', () => {
  it('should extract domain from email', () => {
    expect(getEmailDomain('user@example.com')).toBe('example.com')
    expect(getEmailDomain('stephen@checkit.net')).toBe('checkit.net')
  })

  it('should handle subdomains in email', () => {
    expect(getEmailDomain('user@mail.example.com')).toBe('mail.example.com')
  })

  it('should return empty string for invalid email', () => {
    expect(getEmailDomain('notanemail')).toBe('')
    expect(getEmailDomain('')).toBe('')
  })
})

describe('verifyDomainOwnership', () => {
  it('should verify exact domain match', () => {
    expect(verifyDomainOwnership('stephen@checkit.net', 'checkit.net')).toBe(true)
    expect(verifyDomainOwnership('user@example.com', 'example.com')).toBe(true)
  })

  it('should verify subdomain match', () => {
    expect(verifyDomainOwnership('stephen@marketing.checkit.net', 'checkit.net')).toBe(true)
    expect(verifyDomainOwnership('user@mail.example.com', 'example.com')).toBe(true)
  })

  it('should reject non-matching domains', () => {
    expect(verifyDomainOwnership('stephen@gmail.com', 'checkit.net')).toBe(false)
    expect(verifyDomainOwnership('user@different.com', 'example.com')).toBe(false)
  })

  it('should be case insensitive', () => {
    expect(verifyDomainOwnership('user@EXAMPLE.COM', 'example.com')).toBe(true)
    expect(verifyDomainOwnership('user@example.com', 'EXAMPLE.COM')).toBe(true)
  })

  it('should handle complex scenarios', () => {
    expect(verifyDomainOwnership('user@www.example.com', 'example.com')).toBe(true)
    expect(verifyDomainOwnership('user@example.com', 'www.example.com')).toBe(true)
  })
})

describe('generateSubdomain', () => {
  it('should convert brand name to lowercase', () => {
    expect(generateSubdomain('Checkit')).toBe('checkit')
    expect(generateSubdomain('MyBrand')).toBe('mybrand')
  })

  it('should replace spaces with hyphens', () => {
    expect(generateSubdomain('My Brand')).toBe('my-brand')
    expect(generateSubdomain('Context Memo')).toBe('context-memo')
  })

  it('should remove special characters', () => {
    expect(generateSubdomain('My Brand!')).toBe('my-brand')
    expect(generateSubdomain('Test@123')).toBe('test123')
  })

  it('should handle multiple spaces', () => {
    expect(generateSubdomain('My   Brand')).toBe('my-brand')
  })

  it('should remove leading/trailing hyphens', () => {
    expect(generateSubdomain('-Brand-')).toBe('brand')
    expect(generateSubdomain('--Test--')).toBe('test')
  })

  it('should trim whitespace', () => {
    expect(generateSubdomain('  Brand  ')).toBe('brand')
  })

  it('should handle empty string', () => {
    expect(generateSubdomain('')).toBe('')
  })
})

describe('isValidSubdomain', () => {
  it('should accept valid subdomains', () => {
    expect(isValidSubdomain('checkit')).toBe(true)
    expect(isValidSubdomain('my-brand')).toBe(true)
    expect(isValidSubdomain('test123')).toBe(true)
    expect(isValidSubdomain('a-b-c-123')).toBe(true)
  })

  it('should reject subdomains that are too short', () => {
    expect(isValidSubdomain('ab')).toBe(false)
    expect(isValidSubdomain('a')).toBe(false)
  })

  it('should reject subdomains that are too long', () => {
    const longSubdomain = 'a'.repeat(64)
    expect(isValidSubdomain(longSubdomain)).toBe(false)
  })

  it('should reject subdomains with invalid characters', () => {
    expect(isValidSubdomain('my_brand')).toBe(false)
    expect(isValidSubdomain('my.brand')).toBe(false)
    expect(isValidSubdomain('my brand')).toBe(false)
    expect(isValidSubdomain('my@brand')).toBe(false)
  })

  it('should reject subdomains with uppercase letters', () => {
    expect(isValidSubdomain('MyBrand')).toBe(false)
    expect(isValidSubdomain('CHECKIT')).toBe(false)
  })

  it('should reject subdomains starting or ending with hyphen', () => {
    expect(isValidSubdomain('-brand')).toBe(false)
    expect(isValidSubdomain('brand-')).toBe(false)
  })

  it('should reject reserved subdomains', () => {
    expect(isValidSubdomain('www')).toBe(false)
    expect(isValidSubdomain('api')).toBe(false)
    expect(isValidSubdomain('admin')).toBe(false)
    expect(isValidSubdomain('mail')).toBe(false)
  })

  it('should accept 3-character minimum length', () => {
    expect(isValidSubdomain('abc')).toBe(true)
  })

  it('should accept 63-character maximum length', () => {
    const maxSubdomain = 'a'.repeat(63)
    expect(isValidSubdomain(maxSubdomain)).toBe(true)
  })
})
