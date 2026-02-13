/**
 * Shared utility for constructing brand public URLs.
 * Priority: proxy origin (subfolder) > verified custom domain > subdomain.contextmemo.com
 */

interface BrandDomainInfo {
  subdomain: string
  custom_domain?: string | null
  domain_verified?: boolean | null
  proxy_origin?: string | null
  proxy_base_path?: string | null
}

/**
 * Get the base public URL for a brand site.
 * Priority: proxy origin + base path > custom domain > subdomain.contextmemo.com
 *
 * For subfolder proxy setups (e.g., acme.com/memos), returns the full proxied base URL.
 * This is the preferred URL for AI search pickup since it inherits domain authority.
 */
export function getBrandBaseUrl(brand: BrandDomainInfo): string {
  if (brand.proxy_origin && brand.proxy_base_path) {
    const origin = brand.proxy_origin.replace(/\/$/, '')
    const path = brand.proxy_base_path.replace(/\/$/, '')
    return `${origin}${path}`
  }
  if (brand.custom_domain && brand.domain_verified) {
    return `https://${brand.custom_domain}`
  }
  return `https://${brand.subdomain}.contextmemo.com`
}

/**
 * Get the display hostname for a brand (no protocol).
 */
export function getBrandDisplayHost(brand: BrandDomainInfo): string {
  if (brand.proxy_origin && brand.proxy_base_path) {
    const origin = brand.proxy_origin.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const path = brand.proxy_base_path.replace(/\/$/, '')
    return `${origin}${path}`
  }
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

/**
 * Check if a brand has subfolder proxy publishing configured.
 */
export function hasProxyPublishing(brand: BrandDomainInfo): boolean {
  return !!(brand.proxy_origin && brand.proxy_base_path)
}
