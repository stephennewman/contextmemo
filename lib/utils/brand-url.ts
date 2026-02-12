/**
 * Shared utility for constructing brand public URLs.
 * Prefers verified custom domain over default subdomain.contextmemo.com
 */

interface BrandDomainInfo {
  subdomain: string
  custom_domain?: string | null
  domain_verified?: boolean | null
}

/**
 * Get the base public URL for a brand site.
 * Returns custom domain if configured and verified, otherwise subdomain.contextmemo.com
 */
export function getBrandBaseUrl(brand: BrandDomainInfo): string {
  if (brand.custom_domain && brand.domain_verified) {
    return `https://${brand.custom_domain}`
  }
  return `https://${brand.subdomain}.contextmemo.com`
}

/**
 * Get the display hostname for a brand (no protocol).
 */
export function getBrandDisplayHost(brand: BrandDomainInfo): string {
  if (brand.custom_domain && brand.domain_verified) {
    return brand.custom_domain
  }
  return `${brand.subdomain}.contextmemo.com`
}

/**
 * Get the full public URL for a memo.
 */
export function getMemoPublicUrl(brand: BrandDomainInfo, slug: string): string {
  const baseUrl = getBrandBaseUrl(brand)
  return `${baseUrl}/${slug}`
}
