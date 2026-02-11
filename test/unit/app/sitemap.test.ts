import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Set environment variables at the top level
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://mock.supabase.url'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key'

describe('sitemap', () => {
  const MOCK_DATE = new Date('2024-01-01T12:00:00.000Z')
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  // Declare mocks outside beforeEach but inside describe to retain their state across beforeEach calls
  let mockSupabaseQueryThen: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockNot: ReturnType<typeof vi.fn>;
  let mockIn: ReturnType<typeof vi.fn>;
  let resolvedValuesQueue: { data: unknown[] }[];

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(MOCK_DATE);
    vi.clearAllMocks(); // Clear all mocks, including dynamic ones
    vi.resetModules(); // Reset module registry to ensure fresh imports

    // Initialize mock variables for each test
    mockSupabaseQueryThen = vi.fn(async (onFulfilled, onRejected) => {
        const value = resolvedValuesQueue.shift();
        if (value === undefined) {
          return new Promise(() => {}); // Return a hanging promise to cause timeout if values are not set
        }
        try {
          const result = await Promise.resolve(value);
          return onFulfilled ? onFulfilled(result) : result;
        } catch (error) {
          return onRejected ? onRejected(error) : Promise.reject(error);
        }
    });
    mockFrom = vi.fn();
    mockSelect = vi.fn();
    mockEq = vi.fn();
    mockNot = vi.fn();
    mockIn = vi.fn();
    resolvedValuesQueue = []; // Initialize empty queue for each test

    await vi.doMock('@/lib/supabase/service', () => ({
      createServiceRoleClient: vi.fn(() => ({
        from: mockFrom.mockReturnValue({
          select: mockSelect.mockReturnThis(),
          eq: mockEq.mockReturnThis(),
          not: mockNot.mockReturnThis(),
          in: mockIn.mockReturnThis(),
          then: mockSupabaseQueryThen,
        }),
      })),
    }));
  });

  afterEach(() => {
    vi.useRealTimers()
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    consoleErrorSpy.mockRestore(); // Restore console.error after each test
    vi.restoreAllMocks(); // Restore all mocks after each test
    vi.resetModules(); // Reset module registry
  })

  it('should return a valid sitemap with static pages only if no data', async () => {
    resolvedValuesQueue = [
      { data: [] }, // For brands query
      { data: [] }, // For memos query
      { data: [] }, // For memoBrands query
    ];
    const { default: sitemap } = await import('@/app/sitemap');
    const sitemapResult = await sitemap()

    expect(sitemapResult).toBeDefined()
    expect(sitemapResult.length).toBe(7) // Only static pages
    expect(sitemapResult[0].url).toBe('https://contextmemo.com')
    expect(sitemapResult[0].lastModified).toEqual(MOCK_DATE)
  })

  it('should include brand pages when brands data is available', async () => {
    const mockBrands = [
      { subdomain: 'brand1', updated_at: '2023-12-01T00:00:00.000Z' },
      { subdomain: 'brand2', updated_at: '2023-12-02T00:00:00.000Z' },
    ]

    resolvedValuesQueue = [
      { data: mockBrands }, // For brands query
      { data: [] }, // For memos query
      { data: [] }, // For memoBrands query
    ];
    const { default: sitemap } = await import('@/app/sitemap');
    const sitemapResult = await sitemap()

    expect(sitemapResult.length).toBe(7 + mockBrands.length)
    expect(sitemapResult).toContainEqual({
      url: 'https://contextmemo.com/memo/brand1',
      lastModified: new Date('2023-12-01T00:00:00.000Z'),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
    expect(sitemapResult).toContainEqual({
      url: 'https://contextmemo.com/memo/brand2',
      lastModified: new Date('2023-12-02T00:00:00.000Z'),
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  })

  it('should include memo pages when memo and brand data is available', async () => {
    const mockBrands = [
      { id: 'brand-id-1', subdomain: 'brand1', updated_at: '2023-12-01T00:00:00.000Z' },
    ];
    const mockMemos = [
      { slug: 'memo-slug-1', updated_at: '2023-12-01T01:00:00:00.000Z', published_at: '2023-11-30T00:00:00.000Z', brand_id: 'brand-id-1' },
      { slug: 'memo-slug-2', updated_at: '2023-12-01T02:00:00:00.000Z', published_at: '2023-11-29T00:00:00.000Z', brand_id: 'brand-id-1' },
    ];

    resolvedValuesQueue = [
      { data: mockBrands }, // For brands query
      { data: mockMemos }, // For memos query
      { data: [{ id: 'brand-id-1', subdomain: 'brand1' }] }, // For memoBrands query
    ];
    const { default: sitemap } = await import('@/app/sitemap');
    const sitemapResult = await sitemap();

    expect(sitemapResult.length).toBe(7 + mockBrands.length + mockMemos.length);
    expect(sitemapResult).toContainEqual({
      url: 'https://contextmemo.com/memo/brand1/memo-slug-1',
      lastModified: new Date('2023-12-01T01:00:00:00.000Z'),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
    expect(sitemapResult).toContainEqual({
      url: 'https://contextmemo.com/memo/brand1/memo-slug-2',
      lastModified: new Date('2023-12-01T02:00:00:00.000Z'),
      changeFrequency: 'weekly',
      priority: 0.8,
    });
  });

  it('should handle memos with null updated_at and use published_at', async () => {
    const mockBrands = [
      { id: 'brand-id-1', subdomain: 'brand1', updated_at: '2023-12-01T00:00:00.000Z' },
    ];
    const mockMemos = [
      { slug: 'memo-slug-1', updated_at: null, published_at: '2023-11-30T00:00:00.000Z', brand_id: 'brand-id-1' },
    ];

    resolvedValuesQueue = [
      { data: mockBrands }, // For brands query
      { data: mockMemos }, // For memos query
      { data: [{ id: 'brand-id-1', subdomain: 'brand1' }] }, // For memoBrands query
    ];
    const { default: sitemap } = await import('@/app/sitemap');
    const sitemapResult = await sitemap()

    expect(sitemapResult).toContainEqual({
      url: 'https://contextmemo.com/memo/brand1/memo-slug-1',
      lastModified: new Date('2023-11-30T00:00:00.000Z'),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  })

  it('should not include memos without a brand_id or valid subdomain', async () => {
    const mockBrands = [
      { id: 'brand-id-1', subdomain: 'brand1', updated_at: '2023-12-01T00:00:00.000Z' },
    ]
    const mockMemos = [
      { slug: 'memo-slug-valid', updated_at: '2023-12-01T01:00:00:00.000Z', published_at: '2023-11-30T00:00:00.000Z', brand_id: 'brand-id-1' },
      { slug: 'memo-slug-no-brand-id', updated_at: '2023-12-01T02:00:00:00.000Z', published_at: '2023-11-29T00:00:00.000Z', brand_id: null },
      { slug: 'memo-slug-invalid-brand', updated_at: '2023-12-01T03:00:00:00.000Z', published_at: '2023-11-28T00:00:00.000Z', brand_id: 'brand-id-unknown' },
    ]

    resolvedValuesQueue = [
      { data: mockBrands }, // For brands query
      { data: mockMemos }, // For memos query
      { data: [{ id: 'brand-id-1', subdomain: 'brand1' }] }, // For memoBrands query
    ];
    const { default: sitemap } = await import('@/app/sitemap');
    const sitemapResult = await sitemap()

    expect(sitemapResult.length).toBe(7 + mockBrands.length + 1) // 7 static, 1 brand, 1 valid memo
    expect(sitemapResult).toContainEqual({
      url: 'https://contextmemo.com/memo/brand1/memo-slug-valid',
      lastModified: new Date('2023-12-01T01:00:00:00.000Z'),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
    expect(sitemapResult.some(page => page.url.includes('memo-slug-no-brand-id'))).toBe(false)
    expect(sitemapResult.some(page => page.url.includes('memo-slug-invalid-brand'))).toBe(false)
  })

  it('should throw error if SUPABASE_SERVICE_ROLE_KEY is not set', async () => {
    vi.restoreAllMocks(); // Restore all mocks to unmock service
    vi.doUnmock('@/lib/supabase/service'); // Ensure the real module is loaded
    vi.resetModules(); // Reset module registry to ensure fresh imports

    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    consoleErrorSpy.mockRestore(); 

    await expect(async () => {
      const { default: sitemap } = await import('@/app/sitemap');
      await sitemap();
    }).rejects.toThrow('SUPABASE_SERVICE_ROLE_KEY is required in production');

    // Restore the key so other tests don't fail (though it's set in the outer scope, better safe)
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-key';
  });
})
