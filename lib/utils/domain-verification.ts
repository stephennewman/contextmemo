/**
 * Extract the root domain from a full domain string
 * e.g., "marketing.checkit.net" -> "checkit.net"
 * e.g., "checkit.net" -> "checkit.net"
 */
export function getRootDomain(domain: string): string {
  // Remove protocol if present
  let cleanDomain = domain.replace(/^https?:\/\//, '')
  
  // Remove port if present
  cleanDomain = cleanDomain.split(':')[0]
  
  // Remove path if present
  cleanDomain = cleanDomain.split('/')[0]
  
  // Split into parts
  const parts = cleanDomain.split('.')
  
  // Handle common TLDs (simplified - in production use a proper public suffix list)
  const commonTLDs = ['com', 'net', 'org', 'io', 'co', 'app', 'dev', 'ai']
  const commonSLDs = ['co.uk', 'com.au', 'co.nz']
  
  // Check for two-part SLDs
  if (parts.length >= 3) {
    const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`
    if (commonSLDs.includes(lastTwo)) {
      return parts.slice(-3).join('.')
    }
  }
  
  // Return last two parts for standard TLDs
  if (parts.length >= 2) {
    return parts.slice(-2).join('.')
  }
  
  return cleanDomain
}

/**
 * Extract domain from email address
 */
export function getEmailDomain(email: string): string {
  const parts = email.split('@')
  return parts[1] || ''
}

/**
 * Verify if an email domain matches a brand domain
 * - Exact match: stephen@checkit.net + checkit.net ✓
 * - Subdomain: stephen@marketing.checkit.net + checkit.net ✓
 * - No match: stephen@gmail.com + checkit.net ✗
 */
export function verifyDomainOwnership(email: string, brandDomain: string): boolean {
  const emailDomain = getEmailDomain(email)
  const emailRoot = getRootDomain(emailDomain)
  const brandRoot = getRootDomain(brandDomain)
  
  return emailRoot.toLowerCase() === brandRoot.toLowerCase()
}

/**
 * Generate a subdomain slug from a brand name
 * e.g., "Checkit" -> "checkit"
 * e.g., "My Brand Name" -> "my-brand-name"
 */
export function generateSubdomain(brandName: string): string {
  return brandName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Check if a subdomain is valid (alphanumeric and hyphens only)
 */
export function isValidSubdomain(subdomain: string): boolean {
  // Must be 3-63 characters
  if (subdomain.length < 3 || subdomain.length > 63) {
    return false
  }
  
  // Must only contain lowercase letters, numbers, and hyphens
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return false
  }
  
  // Cannot start or end with hyphen
  if (subdomain.startsWith('-') || subdomain.endsWith('-')) {
    return false
  }
  
  // Reserved subdomains
  const reserved = ['www', 'app', 'api', 'admin', 'mail', 'ftp', 'blog', 'shop', 'store']
  if (reserved.includes(subdomain)) {
    return false
  }
  
  return true
}
