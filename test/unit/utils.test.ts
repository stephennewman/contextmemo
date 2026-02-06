import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2')
  })

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'active')).toBe('base active')
    expect(cn('base', false && 'hidden')).toBe('base')
  })

  it('should resolve conflicting tailwind classes', () => {
    const result = cn('px-4', 'px-8')
    expect(result).toContain('px-8')
    expect(result).not.toContain('px-4')
  })

  it('should handle arrays', () => {
    expect(cn(['px-4', 'py-2'])).toBe('px-4 py-2')
  })

  it('should handle objects', () => {
    expect(cn({ 'px-4': true, 'py-2': false })).toBe('px-4')
  })

  it('should handle empty input', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
  })
})
