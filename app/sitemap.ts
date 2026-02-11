import { MetadataRoute } from 'next'
import { createServiceRoleClient } from '@/lib/supabase/service'

// Revalidate sitemap every hour to pick up new memos
export const revalidate = 3600

const supabase = createServiceRoleClient()

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://contextmemo.com'
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/memos`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/request-access`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/changelog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/about/editorial`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    // Public content category pages
    {
      url: `${baseUrl}/memos/compare`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/memos/guides`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/memos/how-to`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/resources`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  // Fetch all brands with subdomains for memo index pages
  const { data: brands } = await supabase
    .from('brands')
    .select('subdomain, updated_at')
    .not('subdomain', 'is', null)

  const brandPages: MetadataRoute.Sitemap = (brands || []).map((brand) => ({
    url: `${baseUrl}/memo/${brand.subdomain}`,
    lastModified: new Date(brand.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Fetch all published memos with their brand subdomain
  // Use a simple join approach - get memos then lookup brands
  const { data: memos } = await supabase
    .from('memos')
    .select('slug, updated_at, published_at, brand_id')
    .eq('status', 'published')

  // Get brand subdomains for memos
  const brandIds = [...new Set((memos || []).map(m => m.brand_id).filter(Boolean))]
  const { data: memoBrands } = await supabase
    .from('brands')
    .select('id, subdomain')
    .in('id', brandIds)
    .not('subdomain', 'is', null)

  const brandMap = new Map<string, string>()
  if (memoBrands) {
    for (const b of memoBrands) {
      if (b.subdomain) {
        brandMap.set(b.id, b.subdomain)
      }
    }
  }

  const memoPages: MetadataRoute.Sitemap = (memos || [])
    .filter((memo) => memo.brand_id && brandMap.has(memo.brand_id))
    .map((memo) => ({
      url: `${baseUrl}/memo/${brandMap.get(memo.brand_id)}/${memo.slug}`,
      lastModified: new Date(memo.updated_at || memo.published_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))

  return [...staticPages, ...brandPages, ...memoPages]
}
