import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  it('should return status ok', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    
    const body = await response.json()
    expect(body.status).toBe('ok')
  })

  it('should return JSON content type', async () => {
    const response = await GET()
    expect(response.headers.get('content-type')).toContain('application/json')
  })
})
