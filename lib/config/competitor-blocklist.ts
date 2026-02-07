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
  
  // Common English words that are NOT real entities
  // These get matched via substring and pollute competitor lists
  'brand',
  'brands',
  'branding',
  'read',
  'reads',
  'reader',
  'sat',
  'set',
  'run',
  'factors',
  'factor',
  'results',
  'result',
  'search',
  'report',
  'reports',
  'reporting',
  'track',
  'tracking',
  'tracker',
  'test',
  'testing',
  'link',
  'links',
  'rank',
  'ranking',
  'rankings',
  'score',
  'scores',
  'page',
  'pages',
  'site',
  'sites',
  'keyword',
  'keywords',
  'audit',
  'audits',
  'dashboard',
  'monitor',
  'monitoring',
  'alert',
  'alerts',
  'compare',
  'comparison',
  'review',
  'reviews',
  'rate',
  'rating',
  'ratings',
  'plan',
  'plans',
  'pricing',
  'free',
  'pro',
  'premium',
  'basic',
  'team',
  'teams',
  'agency',
  'startup',
  'startups',
  'growth',
  'scale',
  'insight',
  'insights',
  'metric',
  'metrics',
  'funnel',
  'lead',
  'leads',
  'campaign',
  'campaigns',
  'channel',
  'channels',
  'social',
  'email',
  'ads',
  'paid',
  'organic',
  'traffic',
  'convert',
  'conversion',
  'conversions',
  'revenue',
  'roi',
  'performance',
  'optimize',
  'optimization',
  'strategy',
  'feature',
  'features',
  'user',
  'users',
  'client',
  'clients',
  'account',
  'accounts',
  'pipeline',
  'workflow',
  'workflows',
  'report',
  'api',
  'crm',
  'cms',
  'erp',
  'saas',
  'b2b',
  'b2c',
  
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
// Common short words that should never be competitors (all lowercase)
// These are words <=5 chars that frequently match as substrings in AI responses
const COMMON_SHORT_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'has', 'his', 'how', 'its', 'may',
  'new', 'now', 'old', 'see', 'way', 'who', 'did', 'get', 'let', 'say',
  'she', 'too', 'use', 'top', 'best', 'most', 'more', 'also', 'been',
  'call', 'come', 'each', 'find', 'from', 'give', 'have', 'help', 'here',
  'high', 'just', 'know', 'like', 'look', 'made', 'make', 'many', 'much',
  'must', 'name', 'need', 'next', 'only', 'over', 'part', 'real', 'same',
  'some', 'such', 'sure', 'take', 'tell', 'than', 'that', 'them', 'then',
  'they', 'this', 'time', 'turn', 'very', 'want', 'well', 'what', 'when',
  'will', 'with', 'work', 'year', 'your', 'about', 'after', 'being',
  'could', 'every', 'first', 'found', 'great', 'house', 'large', 'later',
  'learn', 'never', 'other', 'place', 'point', 'right', 'small', 'still',
  'study', 'their', 'there', 'these', 'thing', 'think', 'those', 'three',
  'today', 'under', 'using', 'value', 'where', 'which', 'while', 'world',
  'would', 'write', 'above', 'below', 'check', 'clear', 'close', 'cover',
  'early', 'given', 'going', 'green', 'group', 'human', 'ideal', 'image',
  'issue', 'known', 'level', 'light', 'limit', 'local', 'major', 'match',
  'might', 'model', 'money', 'month', 'night', 'noted', 'offer', 'often',
  'order', 'paper', 'power', 'press', 'price', 'quick', 'range', 'ready',
  'short', 'since', 'space', 'start', 'state', 'stock', 'store', 'table',
  'taken', 'total', 'until', 'video', 'visit', 'watch', 'white', 'young',
  // Marketing/SEO jargon that aren't entities
  'boost', 'drive', 'click', 'share', 'reach', 'brand', 'trend', 'audit',
  'score', 'index', 'cache', 'crawl', 'links', 'ranks', 'reads', 'serve',
  'query', 'pixel', 'event', 'leads', 'churn', 'spend', 'yield', 'setup',
])

export function isBlockedCompetitorName(name: string): boolean {
  if (!name) return true
  
  const normalized = name.toLowerCase().trim()
  
  // Check exact match in blocklist
  if (BLOCKED_COMPETITOR_NAMES.has(normalized)) {
    return true
  }
  
  // Check if it's a single generic word (less than 3 chars)
  if (normalized.length < 3) {
    return true
  }
  
  // Block common short English words that are never real product names
  if (!normalized.includes(' ') && COMMON_SHORT_WORDS.has(normalized)) {
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
