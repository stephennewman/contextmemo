import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the service role client before importing the module
vi.mock('@/lib/supabase/service', () => ({
  createServiceRoleClient: vi.fn(),
}))

const { createServiceRoleClient } = await import('@/lib/supabase/service')

// Create a flexible mock builder for Supabase client
interface MockResult {
  data: Record<string, unknown> | null
  error: { message: string; code?: string } | null
}

interface TrackedOperation {
  type: 'insert' | 'delete'
  table: string
  data?: Record<string, unknown>
}

function createMockSupabaseClient() {
  const operations: TrackedOperation[] = []
  let mockResult: MockResult = { data: {}, error: null }

  const builder = {
    from: vi.fn((table: string) => {
      let currentData: Record<string, unknown> = {}
      let operationType: 'insert' | 'delete' | null = null

      const trackOperation = () => {
        if (operationType) {
          operations.push({
            type: operationType,
            table,
            data: { ...currentData },
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
        eq: vi.fn(() => chain),
        single: vi.fn(async () => {
          trackOperation()
          return mockResult
        }),
        // Make the chain thenable so it can be awaited directly
        then: vi.fn((onFulfilled: (value: MockResult) => void) => {
          trackOperation()
          return Promise.resolve(mockResult).then(onFulfilled)
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
      mockResult = { data: {}, error: null }
    },
  }
}

describe('activity-logger', () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>

  beforeEach(async () => {
    vi.resetAllMocks()
    mockClient = createMockSupabaseClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(
      mockClient as unknown as ReturnType<typeof createServiceRoleClient>
    )

    // Re-import the module to get fresh instance with new mock
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('logActivity', () => {
    it('should log an activity with all parameters', async () => {
      const { logActivity } = await import('@/lib/utils/activity-logger')

      const result = await logActivity({
        brandId: 'brand-123',
        tenantId: 'tenant-456',
        activityType: 'scan_completed',
        title: 'AI Scan Complete',
        description: '85% visibility across 9 models',
        linkUrl: '/brands/brand-123',
        linkLabel: 'View Results',
        metadata: { visibility: 85, models: 9 },
      })

      expect(result.success).toBe(true)
      const operations = mockClient.getOperations()
      expect(operations).toHaveLength(1)
      expect(operations[0].type).toBe('insert')
      expect(operations[0].table).toBe('activity_log')
      expect(operations[0].data).toMatchObject({
        brand_id: 'brand-123',
        tenant_id: 'tenant-456',
        activity_type: 'scan_completed',
        category: 'scan',
        title: 'AI Scan Complete',
        description: '85% visibility across 9 models',
        link_url: '/brands/brand-123',
        link_label: 'View Results',
        metadata: { visibility: 85, models: 9 },
      })
    })

    it('should use default empty metadata when not provided', async () => {
      const { logActivity } = await import('@/lib/utils/activity-logger')

      await logActivity({
        brandId: 'brand-1',
        tenantId: 'tenant-1',
        activityType: 'memo_generated',
        title: 'Memo Generated',
      })

      const operations = mockClient.getOperations()
      expect(operations[0].data?.metadata).toEqual({})
    })

    it('should handle null description and link fields', async () => {
      const { logActivity } = await import('@/lib/utils/activity-logger')

      await logActivity({
        brandId: 'brand-1',
        tenantId: 'tenant-1',
        activityType: 'scan_started',
        title: 'Scan Started',
        description: null,
        linkUrl: null,
        linkLabel: null,
      })

      const operations = mockClient.getOperations()
      expect(operations[0].data?.description).toBeNull()
      expect(operations[0].data?.link_url).toBeNull()
      expect(operations[0].data?.link_label).toBeNull()
    })

    it('should return error for unknown activity type', async () => {
      const { logActivity } = await import('@/lib/utils/activity-logger')

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await logActivity({
        brandId: 'brand-1',
        tenantId: 'tenant-1',
        activityType: 'unknown_type' as never,
        title: 'Unknown Activity',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown activity type')
      expect(consoleWarnSpy).toHaveBeenCalledWith('Unknown activity type: unknown_type')
    })

    it('should return success when table does not exist (error code 42P01)', async () => {
      const { logActivity } = await import('@/lib/utils/activity-logger')

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      mockClient.setResult({ data: null, error: { message: 'Table not found', code: '42P01' } })

      const result = await logActivity({
        brandId: 'brand-1',
        tenantId: 'tenant-1',
        activityType: 'scan_completed',
        title: 'Scan Complete',
      })

      expect(result.success).toBe(true)
      expect(consoleLogSpy).toHaveBeenCalledWith('Activity log table not yet created, skipping...')
    })

    it('should return error on database insert failure', async () => {
      const { logActivity } = await import('@/lib/utils/activity-logger')

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockClient.setResult({ data: null, error: { message: 'Database connection error' } })

      const result = await logActivity({
        brandId: 'brand-1',
        tenantId: 'tenant-1',
        activityType: 'scan_completed',
        title: 'Scan Complete',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to log activity:', {
        message: 'Database connection error',
      })
    })

    it('should handle unexpected errors', async () => {
      const { logActivity } = await import('@/lib/utils/activity-logger')

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Make the from() function throw an error
      mockClient.from.mockImplementationOnce(() => {
        throw new Error('Unexpected failure')
      })

      const result = await logActivity({
        brandId: 'brand-1',
        tenantId: 'tenant-1',
        activityType: 'scan_completed',
        title: 'Scan Complete',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unexpected error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Activity logging error:', expect.any(Error))
    })

    it.each([
      ['scan_started', 'scan', 'Play'],
      ['scan_completed', 'scan', 'CheckCircle'],
      ['scan_failed', 'scan', 'XCircle'],
      ['memo_generated', 'content', 'FileText'],
      ['memo_published', 'content', 'Globe'],
      ['competitor_discovered', 'discovery', 'Users'],
      ['query_generated', 'discovery', 'Search'],
      ['ai_traffic_detected', 'traffic', 'Zap'],
      ['brand_created', 'system', 'Plus'],
    ] as const)(
      'should use correct metadata for activity type "%s"',
      async (activityType, expectedCategory, expectedIcon) => {
        const { logActivity } = await import('@/lib/utils/activity-logger')

        await logActivity({
          brandId: 'brand-1',
          tenantId: 'tenant-1',
          activityType,
          title: 'Test Activity',
        })

        const operations = mockClient.getOperations()
        expect(operations[0].data?.category).toBe(expectedCategory)
        expect(operations[0].data?.icon).toBe(expectedIcon)
      }
    )
  })

  describe('logActivities', () => {
    it('should log multiple activities and return counts', async () => {
      const { logActivities } = await import('@/lib/utils/activity-logger')

      const result = await logActivities([
        {
          brandId: 'brand-1',
          tenantId: 'tenant-1',
          activityType: 'scan_completed',
          title: 'Scan 1',
        },
        {
          brandId: 'brand-1',
          tenantId: 'tenant-1',
          activityType: 'memo_generated',
          title: 'Memo 1',
        },
      ])

      expect(result.success).toBe(true)
      expect(result.logged).toBe(2)
      expect(result.errors).toBe(0)
    })

    it('should track errors for failed activities', async () => {
      const { logActivities } = await import('@/lib/utils/activity-logger')

      const result = await logActivities([
        {
          brandId: 'brand-1',
          tenantId: 'tenant-1',
          activityType: 'scan_completed',
          title: 'Good Activity',
        },
        {
          brandId: 'brand-1',
          tenantId: 'tenant-1',
          activityType: 'invalid_type' as never,
          title: 'Bad Activity',
        },
      ])

      expect(result.success).toBe(false)
      expect(result.logged).toBe(1)
      expect(result.errors).toBe(1)
    })

    it('should return success: true when all activities succeed', async () => {
      const { logActivities } = await import('@/lib/utils/activity-logger')

      const result = await logActivities([
        {
          brandId: 'brand-1',
          tenantId: 'tenant-1',
          activityType: 'scan_completed',
          title: 'Activity 1',
        },
      ])

      expect(result.success).toBe(true)
    })

    it('should handle empty array', async () => {
      const { logActivities } = await import('@/lib/utils/activity-logger')

      const result = await logActivities([])

      expect(result.success).toBe(true)
      expect(result.logged).toBe(0)
      expect(result.errors).toBe(0)
    })
  })

  describe('ActivityLoggers', () => {
    describe('scanCompleted', () => {
      it('should log scan completed activity with stats', async () => {
        const { ActivityLoggers } = await import('@/lib/utils/activity-logger')

        await ActivityLoggers.scanCompleted('brand-1', 'tenant-1', {
          visibility: 85,
          models: 9,
          mentioned: 7,
          total: 10,
        })

        const operations = mockClient.getOperations()
        expect(operations[0].data).toMatchObject({
          activity_type: 'scan_completed',
          title: 'AI Scan Complete',
          description: '85% visibility across 9 models (7/10 mentions)',
          link_url: '/brands/brand-1',
          link_label: 'View Results',
          metadata: { visibility: 85, models: 9, mentioned: 7, total: 10 },
        })
      })
    })

    describe('memoGenerated', () => {
      it('should log memo generated activity', async () => {
        const { ActivityLoggers } = await import('@/lib/utils/activity-logger')

        await ActivityLoggers.memoGenerated('brand-1', 'tenant-1', {
          id: 'memo-123',
          title: 'How to Build AI Agents',
          memoType: 'guide',
        })

        const operations = mockClient.getOperations()
        expect(operations[0].data).toMatchObject({
          activity_type: 'memo_generated',
          title: 'Memo Generated',
          description: 'How to Build AI Agents',
          link_url: '/brands/brand-1/memos/memo-123',
          link_label: 'View Memo',
          metadata: { memo_type: 'guide' },
        })
      })
    })

    describe('memoPublished', () => {
      it('should log memo published activity with subdomain', async () => {
        const { ActivityLoggers } = await import('@/lib/utils/activity-logger')

        await ActivityLoggers.memoPublished('brand-1', 'tenant-1', {
          id: 'memo-123',
          title: 'AI Guide',
          slug: 'ai-guide',
          subdomain: 'acme',
        })

        const operations = mockClient.getOperations()
        expect(operations[0].data).toMatchObject({
          activity_type: 'memo_published',
          title: 'Memo Published',
          description: '"AI Guide" is now live at acme.contextmemo.com/ai-guide',
          link_url: '/brands/brand-1/memos/memo-123',
          link_label: 'View Memo',
          metadata: { slug: 'ai-guide' },
        })
      })
    })

    describe('competitorDiscovered', () => {
      it('should log auto-discovered competitor', async () => {
        const { ActivityLoggers } = await import('@/lib/utils/activity-logger')

        await ActivityLoggers.competitorDiscovered('brand-1', 'tenant-1', {
          name: 'Competitor Inc',
          domain: 'competitor.com',
          auto: true,
        })

        const operations = mockClient.getOperations()
        expect(operations[0].data).toMatchObject({
          activity_type: 'competitor_discovered',
          title: 'Competitor Auto-Discovered',
          description: 'Competitor Inc',
          link_url: '/brands/brand-1?tab=competitors',
          link_label: 'View Competitors',
          metadata: { domain: 'competitor.com', auto: true },
        })
      })

      it('should log manually added competitor', async () => {
        const { ActivityLoggers } = await import('@/lib/utils/activity-logger')

        await ActivityLoggers.competitorDiscovered('brand-1', 'tenant-1', {
          name: 'Manual Competitor',
          auto: false,
        })

        const operations = mockClient.getOperations()
        expect(operations[0].data?.title).toBe('Competitor Added')
      })
    })

    describe('queryGenerated', () => {
      it('should log query generated activity with sample', async () => {
        const { ActivityLoggers } = await import('@/lib/utils/activity-logger')

        await ActivityLoggers.queryGenerated(
          'brand-1',
          'tenant-1',
          5,
          'What is the best AI tool?'
        )

        const operations = mockClient.getOperations()
        expect(operations[0].data).toMatchObject({
          activity_type: 'query_generated',
          title: '5 Queries Generated',
          description: 'Including "What is the best AI tool?" and 4 more',
          link_url: '/brands/brand-1?tab=prompts',
          link_label: 'View Prompts',
          metadata: { count: 5, sample: 'What is the best AI tool?' },
        })
      })

      it('should handle single query', async () => {
        const { ActivityLoggers } = await import('@/lib/utils/activity-logger')

        await ActivityLoggers.queryGenerated('brand-1', 'tenant-1', 1, 'Single query?')

        const operations = mockClient.getOperations()
        expect(operations[0].data?.description).toBe('Including "Single query?"')
      })

      it('should handle queries without sample', async () => {
        const { ActivityLoggers } = await import('@/lib/utils/activity-logger')

        await ActivityLoggers.queryGenerated('brand-1', 'tenant-1', 3)

        const operations = mockClient.getOperations()
        // When sampleQuery is undefined, description becomes null (via logActivity's null handling)
        expect(operations[0].data?.description).toBeNull()
      })
    })

    describe('contextExtracted', () => {
      it('should log context extracted activity', async () => {
        const { ActivityLoggers } = await import('@/lib/utils/activity-logger')

        await ActivityLoggers.contextExtracted('brand-1', 'tenant-1', 'example.com')

        const operations = mockClient.getOperations()
        expect(operations[0].data).toMatchObject({
          activity_type: 'context_extracted',
          title: 'Brand Context Extracted',
          description: 'AI analyzed example.com and extracted brand information',
          link_url: '/brands/brand-1/settings',
          link_label: 'View Context',
          metadata: { domain: 'example.com' },
        })
      })
    })

    describe('aiTrafficDetected', () => {
      it('should log AI traffic with memo link', async () => {
        const { ActivityLoggers } = await import('@/lib/utils/activity-logger')

        await ActivityLoggers.aiTrafficDetected(
          'brand-1',
          'tenant-1',
          'chatgpt',
          'https://example.com/memo/ai-guide',
          'memo-123'
        )

        const operations = mockClient.getOperations()
        expect(operations[0].data).toMatchObject({
          activity_type: 'ai_traffic_detected',
          title: 'Visit from Chatgpt',
          description: 'https://example.com/memo/ai-guide',
          link_url: '/brands/brand-1/memos/memo-123',
          link_label: 'View Memo',
          metadata: { source: 'chatgpt' },
        })
      })

      it('should log AI traffic without memo (brand link)', async () => {
        const { ActivityLoggers } = await import('@/lib/utils/activity-logger')

        await ActivityLoggers.aiTrafficDetected(
          'brand-1',
          'tenant-1',
          'perplexity',
          'https://example.com/page'
        )

        const operations = mockClient.getOperations()
        expect(operations[0].data).toMatchObject({
          title: 'Visit from Perplexity',
          link_url: '/brands/brand-1',
          link_label: 'View Brand',
        })
      })

      it('should capitalize source name', async () => {
        const { ActivityLoggers } = await import('@/lib/utils/activity-logger')

        await ActivityLoggers.aiTrafficDetected(
          'brand-1',
          'tenant-1',
          'claude',
          'https://example.com'
        )

        const operations = mockClient.getOperations()
        expect(operations[0].data?.title).toBe('Visit from Claude')
      })
    })
  })
})
