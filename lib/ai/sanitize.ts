export function sanitizeForAI(input: string): string {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: URIs
    .replace(/on\w+\s*=/gi, '') // Remove onEvent handlers (e.g., onerror, onload)
    .slice(0, 10000) // Limit length to prevent excessively long prompts
}
