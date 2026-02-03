import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
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
      url: `${baseUrl}/pricing/calculator`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
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
  const { data: memos } = await supabase
    .from('memos')
    .select(`
      slug,
      updated_at,
      published_at,
      brand_id,
      brands!memos_brand_id_fkey(subdomain)
    `)
    .eq('status', 'published')

  const memoPages: MetadataRoute.Sitemap = (memos || [])
    .filter((memo) => {
      const brand = memo.brands as { subdomain: string } | null
      return brand?.subdomain
    })
    .map((memo) => {
      const brand = memo.brands as { subdomain: string }
      return {
        url: `${baseUrl}/memo/${brand.subdomain}/${memo.slug}`,
        lastModified: new Date(memo.updated_at || memo.published_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }
    })

  return [...staticPages, ...brandPages, ...memoPages]
}
