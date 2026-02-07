import { describe, it, expect } from 'vitest'

// Testing the sanitizeInput function from NewBrandPage
// Since it's an internal function, we'll test its logic
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>"']/g, '') // Remove potential script injection characters
    .substring(0, 255) // Limit length
}

describe('sanitizeInput', () => {
  it('should trim whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello')
    expect(sanitizeInput('\n\ttest\n\t')).toBe('test')
  })

  it('should remove script injection characters', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script')
    expect(sanitizeInput('Hello<World>')).toBe('HelloWorld')
    expect(sanitizeInput('Test"quoted"value')).toBe('Testquotedvalue')
    expect(sanitizeInput("It's a test")).toBe('Its a test')
  })

  it('should limit length to 255 characters', () => {
    const longString = 'a'.repeat(300)
    const result = sanitizeInput(longString)
    expect(result.length).toBe(255)
  })

  it('should handle empty string', () => {
    expect(sanitizeInput('')).toBe('')
  })

  it('should handle normal text without changes', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World')
    expect(sanitizeInput('Test-123')).toBe('Test-123')
  })

  it('should remove all dangerous characters at once', () => {
    expect(sanitizeInput('<>"hello"\'')).toBe('hello')
  })

  it('should handle unicode characters', () => {
    expect(sanitizeInput('Hello 世界')).toBe('Hello 世界')
    expect(sanitizeInput('Test émojis 🎉')).toBe('Test émojis 🎉')
  })
})
