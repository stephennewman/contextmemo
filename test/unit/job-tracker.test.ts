import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the service role client before importing the module
vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: vi.fn(),
}))

const { createServiceRoleClient } = await import('@/lib/supabase/service')

// Create a more flexible mock builder
interface MockResult {
  data: Record<string, unknown> | null
  error: { message: string } | null
}

interface TrackedOperation {
  type: 'insert' | 'delete'
  table: string
  data?: Record<string, unknown>
  filters?: Record<string, unknown>
}

function createMockSupabaseClient() {
  const operations: TrackedOperation[] = []
  let mockResult: MockResult = { data: { id: 'test-job-id' }, error: null }

  const builder = {
    from: vi.fn((table: string) => {
      let currentData: Record<string, unknown> = {}
      const currentFilters: Record<string, unknown> = {}
      let operationType: 'insert' | 'delete' | null = null

      const trackOperation = () => {
        if (operationType) {
          operations.push({
            type: operationType,
            table,
            data: { ...currentData },
            filters: { ...currentFilters },
          })
        }
      }

      const chain = {
        insert: vi.fn((data: Record<string, unknown>) => {
          operationType = 'insert'
          currentData = data
          return chain
        }),
        delete: vi.fn(() => {
          operationType = 'delete'
          return chain
        }),
        select: vi.fn(() => chain),
        eq: vi.fn((column: string, value: unknown) => {
          currentFilters[column] = value
          return chain
        }),
        lt: vi.fn((column: string, value: unknown) => {
          currentFilters[column] = value
          return chain
        }),
        single: vi.fn(async () => {
          trackOperation()
          return mockResult
        }),
        // Make the chain thenable so it can be awaited directly
        then: vi.fn((resolve: (value: MockResult) => void) => {
          trackOperation()
          return Promise.resolve(resolve(mockResult))
        }),
      }

      return chain
    }),
  }

  return {
    ...builder,
    getOperations: () => operations,
    setResult: (result: MockResult) => {
      mockResult = result
    },
    reset: () => {
      operations.length = 0
      mockResult = { data: { id: 'test-job-id' }, error: null }
    },
  }
}

describe('job-tracker', () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>

  beforeEach(async () => {
    vi.resetAllMocks()
    mockClient = createMockSupabaseClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(mockClient as unknown as ReturnType<typeof createServiceRoleClient>)
    
    // Re-import the module to get fresh instance with new mock
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('trackJobStart', () => {
    it('should insert a job record and return the job id', async () => {
      const { trackJobStart } = await import('@/lib/utils/job-tracker')
      
      const brandId = 'brand-123'
      const result = await trackJobStart(brandId, 'scan')
      
      expect(result).toBe('test-job-id')
      const operations = mockClient.getOperations()
      expect(operations).toHaveLength(1)
      expect(operations[0].type).toBe('insert')
      expect(operations[0].table).toBe('active_jobs')
      expect(operations[0].data).toEqual({
        brand_id: brandId,
        job_type: 'scan',
        job_name: 'AI Visibility Scan',
        metadata: {},
      })
    })

    it('should insert a job record with custom metadata', async () => {
      const { trackJobStart } = await import('@/lib/utils/job-tracker')
      
      const brandId = 'brand-456'
      const metadata = { source: 'manual', priority: 'high' }
      
      const result = await trackJobStart(brandId, 'classify', metadata)
      
      expect(result).toBe('test-job-id')
      const operations = mockClient.getOperations()
      expect(operations[0].data?.metadata).toEqual(metadata)
    })

    it.each([
      ['scan', 'AI Visibility Scan'],
      ['classify', 'Content Classification'],
      ['generate', 'Memo Generation'],
      ['extract', 'Context Extraction'],
      ['discover', 'Competitor Discovery'],
    ] as const)('should use correct job name for jobType "%s"', async (jobType, expectedName) => {
      const { trackJobStart } = await import('@/lib/utils/job-tracker')
      
      await trackJobStart('brand-1', jobType)
      
      const operations = mockClient.getOperations()
      expect(operations[0].data?.job_name).toBe(expectedName)
    })

    it('should return empty string when insert fails', async () => {
      const { trackJobStart } = await import('@/lib/utils/job-tracker')
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockClient.setResult({ data: null, error: { message: 'Database error' } })
      
      const result = await trackJobStart('brand-1', 'scan')
      
      expect(result).toBe('')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to track job start:', { message: 'Database error' })
    })

    it('should return empty string when data is null', async () => {
      const { trackJobStart } = await import('@/lib/utils/job-tracker')
      
      mockClient.setResult({ data: null, error: null })
      
      const result = await trackJobStart('brand-1', 'scan')
      
      expect(result).toBe('')
    })
  })

  describe('trackJobEnd', () => {
    it('should delete the job record by id', async () => {
      const { trackJobEnd } = await import('@/lib/utils/job-tracker')
      
      const jobId = 'job-123'
      
      await trackJobEnd(jobId)
      
      const operations = mockClient.getOperations()
      expect(operations).toHaveLength(1)
      expect(operations[0].type).toBe('delete')
      expect(operations[0].table).toBe('active_jobs')
      expect(operations[0].filters?.id).toBe(jobId)
    })

    it('should return early when jobId is empty string', async () => {
      const { trackJobEnd } = await import('@/lib/utils/job-tracker')
      
      await trackJobEnd('')
      
      const operations = mockClient.getOperations()
      expect(operations).toHaveLength(0)
    })

    it('should log error when delete fails', async () => {
      const { trackJobEnd } = await import('@/lib/utils/job-tracker')
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockClient.setResult({ data: null, error: { message: 'Delete failed' } })
      
      await trackJobEnd('job-123')
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to track job end:', { message: 'Delete failed' })
    })
  })

  describe('cleanupStaleJobs', () => {
    it('should delete jobs older than 10 minutes', async () => {
      const { cleanupStaleJobs } = await import('@/lib/utils/job-tracker')
      
      const now = new Date('2026-02-10T18:00:00.000Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)
      
      await cleanupStaleJobs()
      
      const operations = mockClient.getOperations()
      expect(operations).toHaveLength(1)
      expect(operations[0].type).toBe('delete')
      expect(operations[0].table).toBe('active_jobs')
      
      // The filter should be for started_at < 10 minutes ago
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
      expect(operations[0].filters?.started_at).toBe(tenMinutesAgo)
    })

    it('should use correct time calculation for stale threshold', async () => {
      const { cleanupStaleJobs } = await import('@/lib/utils/job-tracker')
      
      // Test at a different time to ensure the calculation is dynamic
      const now = new Date('2026-02-10T12:30:00.000Z')
      vi.useFakeTimers()
      vi.setSystemTime(now)
      
      await cleanupStaleJobs()
      
      const operations = mockClient.getOperations()
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString()
      expect(operations[0].filters?.started_at).toBe(tenMinutesAgo)
    })
  })
})
