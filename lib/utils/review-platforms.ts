// Review / marketplace / directory platform detection
// Used to identify which external profiles entities have based on citation URLs

export interface ReviewPlatform {
  id: string
  name: string
  shortName: string       // Short display name (e.g., "G2" not "G2.com")
  domains: string[]       // Domains to match against
  icon: string            // Emoji or short indicator
  color: string           // Brand color for UI
  bgColor: string         // Light background
  category: 'marketplace' | 'review' | 'analyst' | 'directory' | 'social'
}

// Registry of known review/marketplace platforms
export const REVIEW_PLATFORMS: ReviewPlatform[] = [
  {
    id: 'g2',
    name: 'G2',
    shortName: 'G2',
    domains: ['g2.com'],
    icon: '⭐',
    color: '#FF492C',
    bgColor: '#FFF1F0',
    category: 'marketplace',
  },
  {
    id: 'capterra',
    name: 'Capterra',
    shortName: 'Capterra',
    domains: ['capterra.com'],
    icon: '📊',
    color: '#FF8135',
    bgColor: '#FFF7ED',
    category: 'marketplace',
  },
  {
    id: 'trustradius',
    name: 'TrustRadius',
    shortName: 'TrustRadius',
    domains: ['trustradius.com'],
    icon: '🛡️',
    color: '#00B4D8',
    bgColor: '#F0FAFE',
    category: 'review',
  },
  {
    id: 'software_advice',
    name: 'Software Advice',
    shortName: 'SoftwareAdvice',
    domains: ['softwareadvice.com'],
    icon: '💡',
    color: '#E8590C',
    bgColor: '#FFF4ED',
    category: 'directory',
  },
  {
    id: 'getapp',
    name: 'GetApp',
    shortName: 'GetApp',
    domains: ['getapp.com'],
    icon: '📱',
    color: '#00B386',
    bgColor: '#EDFDF8',
    category: 'directory',
  },
  {
    id: 'gartner',
    name: 'Gartner Peer Insights',
    shortName: 'Gartner',
    domains: ['gartner.com'],
    icon: '🏛️',
    color: '#003DA5',
    bgColor: '#EDF2FF',
    category: 'analyst',
  },
  {
    id: 'forrester',
    name: 'Forrester',
    shortName: 'Forrester',
    domains: ['forrester.com'],
    icon: '📈',
    color: '#00694E',
    bgColor: '#EDFDF5',
    category: 'analyst',
  },
  {
    id: 'trustpilot',
    name: 'Trustpilot',
    shortName: 'Trustpilot',
    domains: ['trustpilot.com'],
    icon: '⭐',
    color: '#00B67A',
    bgColor: '#ECFDF5',
    category: 'review',
  },
  {
    id: 'sourceforge',
    name: 'SourceForge',
    shortName: 'SourceForge',
    domains: ['sourceforge.net'],
    icon: '🔧',
    color: '#FF6600',
    bgColor: '#FFF5ED',
    category: 'directory',
  },
  {
    id: 'peerspot',
    name: 'PeerSpot',
    shortName: 'PeerSpot',
    domains: ['peerspot.com'],
    icon: '👥',
    color: '#1A73E8',
    bgColor: '#EFF6FF',
    category: 'review',
  },
  {
    id: 'glassdoor',
    name: 'Glassdoor',
    shortName: 'Glassdoor',
    domains: ['glassdoor.com'],
    icon: '🏢',
    color: '#0CAA41',
    bgColor: '#ECFDF5',
    category: 'review',
  },
  {
    id: 'crunchbase',
    name: 'Crunchbase',
    shortName: 'Crunchbase',
    domains: ['crunchbase.com'],
    icon: '💰',
    color: '#146AFF',
    bgColor: '#EFF4FF',
    category: 'directory',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    shortName: 'LinkedIn',
    domains: ['linkedin.com'],
    icon: '💼',
    color: '#0A66C2',
    bgColor: '#EFF6FF',
    category: 'social',
  },
  {
    id: 'producthunt',
    name: 'Product Hunt',
    shortName: 'ProductHunt',
    domains: ['producthunt.com'],
    icon: '🚀',
    color: '#DA552F',
    bgColor: '#FFF5F0',
    category: 'directory',
  },
]

// Map domain -> platform for fast lookup
const domainToPlatform = new Map<string, ReviewPlatform>()
for (const platform of REVIEW_PLATFORMS) {
  for (const domain of platform.domains) {
    domainToPlatform.set(domain, platform)
  }
}

export interface DetectedProfile {
  platform: ReviewPlatform
  urls: string[]       // Unique URLs found
  citationCount: number // How many times these URLs were cited
}

/**
 * Detect which review platform a URL belongs to (if any).
 * Returns null if not a known review platform.
 */
export function detectPlatform(url: string): ReviewPlatform | null {
  try {
    const hostname = new URL(url).hostname.replace('www.', '').toLowerCase()
    for (const [domain, platform] of domainToPlatform) {
      if (hostname === domain || hostname.endsWith('.' + domain)) {
        return platform
      }
    }
  } catch {
    // invalid URL
  }
  return null
}

/**
 * Given a list of citation URLs, detect external profiles by platform.
 * Returns a map of platformId -> DetectedProfile.
 */
export function detectProfilesFromUrls(urls: string[]): Map<string, DetectedProfile> {
  const profiles = new Map<string, DetectedProfile>()

  for (const url of urls) {
    const platform = detectPlatform(url)
    if (!platform) continue

    const existing = profiles.get(platform.id)
    if (existing) {
      if (!existing.urls.includes(url)) {
        existing.urls.push(url)
      }
      existing.citationCount++
    } else {
      profiles.set(platform.id, {
        platform,
        urls: [url],
        citationCount: 1,
      })
    }
  }

  return profiles
}

/**
 * Aggregate platform presence across all entities.
 * Returns platforms sorted by total citation count (most cited first).
 */
export function aggregatePlatformPresence(
  allCitationUrls: string[]
): { platform: ReviewPlatform; totalCitations: number; uniqueUrls: number }[] {
  const platformStats = new Map<string, { platform: ReviewPlatform; totalCitations: number; uniqueUrls: Set<string> }>()

  for (const url of allCitationUrls) {
    const platform = detectPlatform(url)
    if (!platform) continue

    const existing = platformStats.get(platform.id)
    if (existing) {
      existing.totalCitations++
      existing.uniqueUrls.add(url)
    } else {
      platformStats.set(platform.id, {
        platform,
        totalCitations: 1,
        uniqueUrls: new Set([url]),
      })
    }
  }

  return Array.from(platformStats.values())
    .map(s => ({ platform: s.platform, totalCitations: s.totalCitations, uniqueUrls: s.uniqueUrls.size }))
    .sort((a, b) => b.totalCitations - a.totalCitations)
}
