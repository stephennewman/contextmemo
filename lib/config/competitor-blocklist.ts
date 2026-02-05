/**
 * Competitor Blocklist Configuration
 * 
 * This file defines entities that should NOT be auto-discovered as competitors.
 * These are filtered both during AI discovery and during validation.
 * 
 * Categories:
 * 1. Generic terms - Single words that are too vague (Customer, SEO, etc.)
 * 2. Common tools - Tools that most companies USE but aren't competitors (HubSpot, Salesforce)
 * 3. Review/marketplace sites - G2, Capterra, etc. (should be 'marketplace' type, not 'product_competitor')
 * 4. Analyst firms - Gartner, Forrester (should be 'analyst' type, not 'product_competitor')
 */

// Names that should NEVER be added as product_competitor
// These are either too generic or are common tools that most companies use
export const BLOCKED_COMPETITOR_NAMES = new Set([
  // Generic/vague terms
  'customer',
  'customers',
  'seo',
  'seamless',
  'integration',
  'integrations',
  'analytics',
  'automation',
  'ai',
  'marketing',
  'sales',
  'support',
  'platform',
  'solution',
  'solutions',
  'software',
  'tool',
  'tools',
  'app',
  'apps',
  'service',
  'services',
  'data',
  'cloud',
  'enterprise',
  'business',
  'blog',
  'blogs',
  'article',
  'articles',
  'content',
  'website',
  'websites',
  
  // Common CRM/Marketing tools that brands USE but aren't competitors
  // (unless they're actually in the same market)
  'hubspot',
  'salesforce',
  'salesforce seo',
  'marketo',
  'pardot',
  'mailchimp',
  'klaviyo',
  'intercom',
  'zendesk',
  'freshdesk',
  'drift',
  'segment',
  'mixpanel',
  'amplitude',
  'heap',
  
  // Integration/automation tools
  'zapier',
  'make',
  'integromat',
  'workato',
  'tray.io',
  'n8n',
  
  // Project management tools (rarely actual competitors)
  'monday',
  'monday.com',
  'asana',
  'trello',
  'notion',
  'clickup',
  'jira',
  'linear',
  'basecamp',
  'wrike',
  'hive',
  
  // Communication tools
  'slack',
  'teams',
  'microsoft teams',
  'zoom',
  'google meet',
  
  // Cloud providers
  'aws',
  'amazon web services',
  'azure',
  'microsoft azure',
  'gcp',
  'google cloud',
  'google cloud platform',
])

// Domains that are marketplaces/review sites - should be 'marketplace' type
export const MARKETPLACE_DOMAINS = new Set([
  'g2.com',
  'capterra.com',
  'getapp.com',
  'softwareadvice.com',
  'trustradius.com',
  'sourceforge.net',
  'productreview.com',
  'trustpilot.com',
])

// Domains that are analyst firms - should be 'analyst' type
export const ANALYST_DOMAINS = new Set([
  'gartner.com',
  'forrester.com',
  'idc.com',
])

// Domains that are news/publisher sites - should be 'publisher' type
export const PUBLISHER_DOMAINS = new Set([
  'techcrunch.com',
  'venturebeat.com',
  'theverge.com',
  'wired.com',
  'forbes.com',
  'businessinsider.com',
  'bloomberg.com',
  'reuters.com',
  'marketwatch.com',
])

/**
 * Check if a name should be blocked as a competitor
 * @param name The competitor name to check
 * @returns true if the name should be blocked
 */
export function isBlockedCompetitorName(name: string): boolean {
  if (!name) return true
  
  const normalized = name.toLowerCase().trim()
  
  // Check exact match in blocklist
  if (BLOCKED_COMPETITOR_NAMES.has(normalized)) {
    return true
  }
  
  // Check if it's a single generic word (less than 3 chars or very common)
  if (normalized.length < 3) {
    return true
  }
  
  // Check if it's just a generic term with common suffix
  const genericPatterns = [
    /^(the\s+)?[a-z]+\s+(platform|solution|tool|app|software)$/i,
    /^(best|top|leading|#1)\s+/i,
  ]
  
  for (const pattern of genericPatterns) {
    if (pattern.test(normalized)) {
      return true
    }
  }
  
  return false
}

/**
 * Get the correct entity type for a domain
 * Returns null if the domain should use the AI-determined type
 * @param domain The domain to check
 * @returns The correct entity type or null
 */
export function getEntityTypeForDomain(domain: string | null): string | null {
  if (!domain) return null
  
  const normalized = domain.toLowerCase().trim()
  
  if (MARKETPLACE_DOMAINS.has(normalized)) {
    return 'marketplace'
  }
  
  if (ANALYST_DOMAINS.has(normalized)) {
    return 'analyst'
  }
  
  if (PUBLISHER_DOMAINS.has(normalized)) {
    return 'publisher'
  }
  
  return null
}

/**
 * Validate and potentially correct a discovered competitor
 * @param competitor The competitor object to validate
 * @returns Object with isValid, correctedType, and reason
 */
export function validateCompetitor(competitor: {
  name: string
  domain?: string | null
  entity_type?: string
}): {
  isValid: boolean
  correctedType: string | null
  reason: string | null
} {
  const name = competitor.name?.toLowerCase().trim()
  
  // Check if name is blocked
  if (isBlockedCompetitorName(competitor.name)) {
    return {
      isValid: false,
      correctedType: null,
      reason: `"${competitor.name}" is a blocked term (too generic or common tool)`,
    }
  }
  
  // Check if domain should force a different entity type
  const domainType = getEntityTypeForDomain(competitor.domain || null)
  if (domainType && competitor.entity_type === 'product_competitor') {
    return {
      isValid: true,
      correctedType: domainType,
      reason: `Corrected entity type from product_competitor to ${domainType} based on domain`,
    }
  }
  
  return {
    isValid: true,
    correctedType: null,
    reason: null,
  }
}
