import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/brands/[brandId]/voice-insights/upload-audio/route'
import { createClient } from '@/lib/supabase/server'
import { logSecurityEvent } from '@/lib/security/security-events'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock logSecurityEvent
vi.mock('@/lib/security/security-events', () => ({
  logSecurityEvent: vi.fn(),
}))

describe('POST /api/brands/[brandId]/voice-insights/upload-audio', () => {
  // Use valid UUIDs that pass standard UUID validation
  const MOCK_BRAND_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01'
  const MOCK_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a0a'
  const MOCK_FILE_NAME = 'test_audio.webm'
  const MOCK_FILE_CONTENT = Buffer.from('mock audio content')
  const MAX_REQUEST_SIZE = 25 * 1024 * 1024 // 25MB

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabaseMock: any
  let logSecurityEventMock: ReturnType<typeof vi.mocked<typeof logSecurityEvent>>
  let uploadMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    // Create a fresh upload mock for each test
    uploadMock = vi.fn().mockResolvedValue({ data: { path: MOCK_FILE_NAME }, error: null })

    supabaseMock = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: MOCK_USER_ID } } }),
      },
      from: vi.fn(() => supabaseMock),
      select: vi.fn(() => supabaseMock),
      eq: vi.fn(() => supabaseMock),
      single: vi.fn(),
      storage: {
        from: vi.fn(() => ({
          upload: uploadMock,
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: `http://localhost/${MOCK_FILE_NAME}` } }),
        })),
      },
    }
    vi.mocked(createClient).mockResolvedValue(supabaseMock)
    logSecurityEventMock = vi.mocked(logSecurityEvent)
    // Make logSecurityEvent resolve immediately
    logSecurityEventMock.mockResolvedValue(undefined)
  })

  it('should return 401 if unauthenticated', async () => {
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } })

    const request = new NextRequest(new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights/upload-audio`), {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: new FormData(),
    })
    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
    // Route calls logSecurityEvent with a single object argument
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'unauthorized', details: { reason: 'user_not_authenticated' } })
    )
  })

  it('should return 404 if brand not found or unauthorized (IDOR)', async () => {
    supabaseMock.single.mockResolvedValueOnce({ data: null, error: null }) // for brand check

    const request = new NextRequest(new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights/upload-audio`), {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: new FormData(),
    })
    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('Brand not found')
    // Route calls logSecurityEvent with a single object argument
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'access_denied', details: { reason: 'brand_not_found_or_unauthorized', brandId: MOCK_BRAND_ID } })
    )
  })

  it('should return 400 if no audio file is provided', async () => {
    supabaseMock.single.mockResolvedValueOnce({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_USER_ID }, error: null }) // for brand check

    // Create a request with empty FormData
    const formData = new FormData()
    const request = new NextRequest(new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights/upload-audio`), {
      method: 'POST',
      body: formData,
    })
    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('No audio file provided')
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'invalid_request', details: { reason: 'no_audio_file_provided' } })
    )
  })

  it('should return 413 if content-length exceeds MAX_REQUEST_SIZE', async () => {
    const oversizedRequest = new NextRequest(new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights/upload-audio`), {
      method: 'POST',
      headers: { 
        'Content-Type': 'multipart/form-data',
        'Content-Length': (MAX_REQUEST_SIZE + 1).toString(),
      },
      body: new FormData(),
    })

    const response = await POST(oversizedRequest, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(413)
    const body = await response.json()
    expect(body.error).toContain('Request too large')
    // Route calls logSecurityEvent with a single object argument
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'request_too_large' })
    )
  }, 10000)

  it('should return 400 if audioFile.size exceeds MAX_REQUEST_SIZE (fallback check)', async () => {
    supabaseMock.single.mockResolvedValueOnce({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_USER_ID }, error: null }) // for brand check

    // Mock formData to return a file that's too large
    const mockFormData = {
      get: vi.fn((key: string) => {
        if (key === 'audio') {
          // Create a mock file with size over the limit and arrayBuffer method
          const mockFile = new File([MOCK_FILE_CONTENT], MOCK_FILE_NAME, { type: 'audio/webm' })
          Object.defineProperty(mockFile, 'size', { value: MAX_REQUEST_SIZE + 1024, writable: false })
          return mockFile
        }
        return null
      }),
    }
    
    const request = new NextRequest(new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights/upload-audio`), {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    
    vi.spyOn(request, 'formData').mockResolvedValueOnce(mockFormData as unknown as FormData)

    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('File too large')
    // The route includes fileSize in details
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'invalid_request', details: expect.objectContaining({ reason: 'file_too_large_after_parse', fileSize: MAX_REQUEST_SIZE + 1024 }) })
    )
  }, 10000)

  it('should successfully upload audio and return public URL', async () => {
    supabaseMock.single.mockResolvedValueOnce({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_USER_ID }, error: null }) // for brand check

    // Create a mock file with arrayBuffer method
    const mockFileContent = new Uint8Array(MOCK_FILE_CONTENT)
    const mockFile = {
      name: MOCK_FILE_NAME,
      type: 'audio/webm',
      size: MOCK_FILE_CONTENT.length,
      arrayBuffer: vi.fn().mockResolvedValue(mockFileContent.buffer),
    }
    
    const mockFormData = {
      get: vi.fn((key: string) => {
        if (key === 'audio') return mockFile
        if (key === 'insightId') return 'insight-123'
        return null
      }),
    }
    
    const request = new NextRequest(new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights/upload-audio`), {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    
    vi.spyOn(request, 'formData').mockResolvedValueOnce(mockFormData as unknown as FormData)

    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.message).toBe('Audio uploaded successfully')
    expect(supabaseMock.storage.from).toHaveBeenCalledWith('voice-recordings')
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'audio_upload_success' })
    )
  }, 10000)

  it('should return 500 with generic error on Supabase upload error', async () => {
    supabaseMock.single.mockResolvedValueOnce({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_USER_ID }, error: null }) // for brand check
    
    // Override the upload mock to return an error for this test
    uploadMock.mockResolvedValueOnce({ data: null, error: { message: 'Supabase storage error' } })

    // Create a mock file with arrayBuffer method
    const mockFileContent = new Uint8Array(MOCK_FILE_CONTENT)
    const mockFile = {
      name: MOCK_FILE_NAME,
      type: 'audio/webm',
      size: MOCK_FILE_CONTENT.length,
      arrayBuffer: vi.fn().mockResolvedValue(mockFileContent.buffer),
    }
    
    const mockFormData = {
      get: vi.fn((key: string) => {
        if (key === 'audio') return mockFile
        return null
      }),
    }
    
    const request = new NextRequest(new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights/upload-audio`), {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    
    vi.spyOn(request, 'formData').mockResolvedValueOnce(mockFormData as unknown as FormData)

    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Failed to upload audio')
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'upload_failed', details: expect.objectContaining({ reason: 'supabase_upload_error' }) })
    )
  }, 10000)

  it('should return 500 with generic error on unexpected internal error during processing', async () => {
    supabaseMock.single.mockResolvedValueOnce({ data: { id: MOCK_BRAND_ID, tenant_id: MOCK_USER_ID }, error: null }) // for brand check

    const formData = new FormData()
    formData.append('insightId', 'insight-123')

    const request = new NextRequest(new URL(`http://localhost/api/brands/${MOCK_BRAND_ID}/voice-insights/upload-audio`), {
      method: 'POST',
      body: formData,
    })
    
    // Force an error in formData parsing
    vi.spyOn(request, 'formData').mockImplementationOnce(() => {
      throw new Error('Simulated formData parse error')
    })

    const response = await POST(request, { params: Promise.resolve({ brandId: MOCK_BRAND_ID }) })
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('An unexpected error occurred during upload')
    // Route calls logSecurityEvent with a single object argument that includes errorMessage
    expect(logSecurityEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'upload_failed', details: expect.objectContaining({ reason: 'internal_server_error' }) })
    )
  })
})
