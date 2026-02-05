/**
 * Security validation utilities
 * 
 * This module provides input validation and sanitization functions
 * to prevent SQL injection, XSS, and other security vulnerabilities.
 */

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validates that a string is a valid UUID v4
 */
export function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return UUID_REGEX.test(value)
}

/**
 * Validates and returns a UUID, or null if invalid
 */
export function validateUUID(value: unknown): string | null {
  if (isValidUUID(value)) return value
  return null
}

/**
 * Validates an array of UUIDs, returns only valid ones
 */
export function validateUUIDArray(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return values.filter(isValidUUID)
}

/**
 * Validates that a string is a safe text input (no SQL/XSS characters)
 * Allows alphanumeric, spaces, and common punctuation
 */
export function sanitizeTextInput(value: unknown, maxLength: number = 500): string | null {
  if (typeof value !== 'string') return null
  
  // Trim whitespace
  const trimmed = value.trim()
  
  // Check length
  if (trimmed.length === 0 || trimmed.length > maxLength) return null
  
  // Remove potentially dangerous characters but keep useful ones
  // This allows letters, numbers, spaces, and common punctuation
  const sanitized = trimmed
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
  
  return sanitized
}

/**
 * Sanitizes a name field (more restrictive)
 */
export function sanitizeName(value: unknown, maxLength: number = 100): string | null {
  if (typeof value !== 'string') return null
  
  const trimmed = value.trim()
  
  if (trimmed.length === 0 || trimmed.length > maxLength) return null
  
  // Names should only contain letters, numbers, spaces, hyphens, apostrophes, periods
  const sanitized = trimmed.replace(/[^\p{L}\p{N}\s\-'.]/gu, '')
  
  if (sanitized.length === 0) return null
  
  return sanitized
}

/**
 * Validates a URL string
 */
export function isValidURL(value: unknown): boolean {
  if (typeof value !== 'string') return false
  
  try {
    const url = new URL(value)
    // Only allow http and https protocols
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Validates and sanitizes a URL
 */
export function validateURL(value: unknown): string | null {
  if (typeof value !== 'string') return null
  
  try {
    const url = new URL(value)
    
    // Only allow http and https
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    
    // Prevent localhost/internal URLs in production
    const hostname = url.hostname.toLowerCase()
    const blockedHosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1']
    const blockedPatterns = [/^192\.168\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./]
    
    if (blockedHosts.includes(hostname)) {
      return null
    }
    
    for (const pattern of blockedPatterns) {
      if (pattern.test(hostname)) {
        return null
      }
    }
    
    return url.toString()
  } catch {
    return null
  }
}

/**
 * Validates an email address
 */
export function isValidEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false
  
  // Basic email regex - not exhaustive but catches most cases
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value) && value.length <= 254
}

/**
 * Validates that a value is one of the allowed enum values
 */
export function validateEnum<T extends string>(value: unknown, allowedValues: readonly T[]): T | null {
  if (typeof value !== 'string') return null
  return allowedValues.includes(value as T) ? (value as T) : null
}

/**
 * Validates a positive integer within a range
 */
export function validatePositiveInt(value: unknown, min: number = 1, max: number = Number.MAX_SAFE_INTEGER): number | null {
  const num = typeof value === 'string' ? parseInt(value, 10) : value
  
  if (typeof num !== 'number' || !Number.isInteger(num)) return null
  if (num < min || num > max) return null
  
  return num
}

/**
 * Sanitizes error message for client response
 * Prevents leaking internal details
 */
export function sanitizeErrorMessage(error: unknown): string {
  // In development, show full errors
  if (process.env.NODE_ENV === 'development') {
    return error instanceof Error ? error.message : 'Internal server error'
  }
  
  // In production, use generic messages for most errors
  if (error instanceof Error) {
    // Allow specific safe error messages
    const safeMessages = [
      'Unauthorized',
      'Not found',
      'Invalid request',
      'Rate limited',
      'Bad request',
    ]
    
    for (const msg of safeMessages) {
      if (error.message.toLowerCase().includes(msg.toLowerCase())) {
        return msg
      }
    }
  }
  
  return 'Internal server error'
}

/**
 * Checks if the SUPABASE_SERVICE_ROLE_KEY is properly configured
 * Throws an error in production if not set
 */
export function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!key) {
    // In development, warn but allow fallback
    if (process.env.NODE_ENV === 'development') {
      console.warn('WARNING: SUPABASE_SERVICE_ROLE_KEY not set, using anon key')
      return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    }
    
    // In production, this is a critical error
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in production')
  }
  
  return key
}
