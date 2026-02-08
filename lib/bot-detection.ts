import { type NextRequest } from 'next/server'

// =============================================================================
// Bot Registry
// =============================================================================

export type BotCategory = 'ai_training' | 'ai_search' | 'ai_user_browse' | 'search_engine' | 'seo_tool'

export interface BotInfo {
  name: string
  category: BotCategory
  displayName: string
  provider: string
}

// Ordered by specificity — more specific patterns first
const BOT_REGISTRY: Array<{ pattern: string; info: BotInfo }> = [
  // OpenAI
  { pattern: 'oai-searchbot', info: { name: 'oai-searchbot', category: 'ai_search', displayName: 'ChatGPT Search', provider: 'OpenAI' } },
  { pattern: 'chatgpt-user', info: { name: 'chatgpt-user', category: 'ai_user_browse', displayName: 'ChatGPT User', provider: 'OpenAI' } },
  { pattern: 'gptbot', info: { name: 'gptbot', category: 'ai_training', displayName: 'GPTBot', provider: 'OpenAI' } },

  // Anthropic
  { pattern: 'claude-searchbot', info: { name: 'claude-searchbot', category: 'ai_search', displayName: 'Claude Search', provider: 'Anthropic' } },
  { pattern: 'claude-user', info: { name: 'claude-user', category: 'ai_user_browse', displayName: 'Claude User', provider: 'Anthropic' } },
  { pattern: 'claudebot', info: { name: 'claudebot', category: 'ai_training', displayName: 'ClaudeBot', provider: 'Anthropic' } },
  { pattern: 'anthropic-ai', info: { name: 'anthropic-ai', category: 'ai_training', displayName: 'Anthropic AI', provider: 'Anthropic' } },

  // Perplexity
  { pattern: 'perplexity-user', info: { name: 'perplexity-user', category: 'ai_user_browse', displayName: 'Perplexity User', provider: 'Perplexity' } },
  { pattern: 'perplexitybot', info: { name: 'perplexitybot', category: 'ai_search', displayName: 'PerplexityBot', provider: 'Perplexity' } },

  // Google AI
  { pattern: 'google-extended', info: { name: 'google-extended', category: 'ai_training', displayName: 'Google AI', provider: 'Google' } },

  // Apple
  { pattern: 'applebot-extended', info: { name: 'applebot-extended', category: 'ai_training', displayName: 'Apple Intelligence', provider: 'Apple' } },

  // Meta
  { pattern: 'meta-externalagent', info: { name: 'meta-externalagent', category: 'ai_training', displayName: 'Meta AI', provider: 'Meta' } },

  // Amazon
  { pattern: 'amazonbot', info: { name: 'amazonbot', category: 'ai_search', displayName: 'Amazonbot', provider: 'Amazon' } },

  // ByteDance
  { pattern: 'bytespider', info: { name: 'bytespider', category: 'ai_training', displayName: 'Bytespider', provider: 'ByteDance' } },

  // Cohere
  { pattern: 'cohere-ai', info: { name: 'cohere-ai', category: 'ai_training', displayName: 'Cohere AI', provider: 'Cohere' } },

  // Microsoft
  { pattern: 'bingbot', info: { name: 'bingbot', category: 'search_engine', displayName: 'Bingbot', provider: 'Microsoft' } },

  // Google Search
  { pattern: 'googlebot', info: { name: 'googlebot', category: 'search_engine', displayName: 'Googlebot', provider: 'Google' } },

  // Yandex
  { pattern: 'yandexbot', info: { name: 'yandexbot', category: 'search_engine', displayName: 'YandexBot', provider: 'Yandex' } },

  // SEO tools
  { pattern: 'ahrefsbot', info: { name: 'ahrefsbot', category: 'seo_tool', displayName: 'AhrefsBot', provider: 'Ahrefs' } },
  { pattern: 'semrushbot', info: { name: 'semrushbot', category: 'seo_tool', displayName: 'SemrushBot', provider: 'Semrush' } },
]

/**
 * Detect if a request is from a known bot based on user-agent string.
 * Returns BotInfo if detected, null otherwise.
 * Pure string matching — ~0ms overhead.
 */
export function detectBot(userAgent: string | null): BotInfo | null {
  if (!userAgent) return null
  const ua = userAgent.toLowerCase()
  for (const entry of BOT_REGISTRY) {
    if (ua.includes(entry.pattern)) {
      return entry.info
    }
  }
  return null
}

// =============================================================================
// Path Resolution
// =============================================================================

export interface MemoPathInfo {
  brandSubdomain: string
  memoSlug: string | null
  pagePath: string
}

// Content paths that bots may crawl (these serve published memos)
const CONTENT_PATH_PREFIXES = [
  '/memo/',
  '/resources/',
  '/memos/',
  '/compare/',
  '/alternatives/',
  '/guides/',
  '/for/',
  '/how-to/',
  '/how/',
  '/vs/',
  '/gap/',
  '/alternatives-to/',
]

/**
 * Resolve a request to a memo path with brand subdomain and slug.
 * Handles both subdomain-based access (checkit.contextmemo.com/slug)
 * and direct path access (contextmemo.com/memo/checkit/slug).
 * Returns null if the request is not a content page.
 */
export function resolveMemoPath(request: NextRequest): MemoPathInfo | null {
  const pathname = request.nextUrl.pathname
  const hostname = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''

  // Check for subdomain-based access first
  const subdomain = extractSubdomain(hostname)
  if (subdomain) {
    // Subdomain request: checkit.contextmemo.com/some-slug
    // The middleware will rewrite this to /memo/checkit/some-slug
    // but at this point we see the original path
    const slug = pathname === '/' ? null : pathname.slice(1) // remove leading /
    return {
      brandSubdomain: subdomain,
      memoSlug: slug || null,
      pagePath: `/memo/${subdomain}${pathname === '/' ? '' : pathname}`,
    }
  }

  // Check for direct /memo/ path access
  if (pathname.startsWith('/memo/')) {
    const parts = pathname.split('/').filter(Boolean) // ['memo', 'subdomain', ...slug]
    if (parts.length >= 2) {
      const brandSubdomain = parts[1]
      const memoSlug = parts.length > 2 ? parts.slice(2).join('/') : null
      return {
        brandSubdomain,
        memoSlug,
        pagePath: pathname,
      }
    }
  }

  // Check other content paths — these serve contextmemo.com's own brand memos
  for (const prefix of CONTENT_PATH_PREFIXES) {
    if (prefix !== '/memo/' && pathname.startsWith(prefix)) {
      const slug = pathname.slice(prefix.length) || null
      return {
        brandSubdomain: 'contextmemo', // own brand content
        memoSlug: slug ? `${prefix.slice(1, -1)}/${slug}` : prefix.slice(1, -1),
        pagePath: pathname,
      }
    }
  }

  // Also log llms.txt and sitemap.xml hits (no brand attribution)
  if (pathname === '/llms.txt' || pathname === '/sitemap.xml') {
    return {
      brandSubdomain: '',
      memoSlug: null,
      pagePath: pathname,
    }
  }

  return null
}

/**
 * Extract subdomain from hostname.
 * Same logic as lib/supabase/middleware.ts.
 */
function extractSubdomain(hostname: string): string | null {
  const hostParts = hostname.split('.')

  if (hostParts.length >= 3) {
    const potentialSubdomain = hostParts[0]
    if (potentialSubdomain !== 'www' && potentialSubdomain !== 'app') {
      return potentialSubdomain
    }
  } else if (hostParts.length === 2 && hostParts[1].startsWith('localhost')) {
    const potentialSubdomain = hostParts[0]
    if (potentialSubdomain !== 'localhost') {
      return potentialSubdomain
    }
  }

  return null
}

// =============================================================================
// Logging (via Supabase REST API — no SDK overhead)
// =============================================================================

export interface BotCrawlData {
  name: string
  category: BotCategory
  displayName: string
  provider: string
  brandSubdomain: string
  memoSlug: string | null
  pagePath: string
  userAgent: string
  ipCountry: string | null
}

/**
 * Log a bot crawl event to Supabase via REST API.
 * Uses direct fetch to avoid SDK overhead in after() callback.
 * Fails silently — logging should never break the site.
 */
export async function logBotCrawl(data: BotCrawlData): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) return

    const response = await fetch(`${supabaseUrl}/rest/v1/bot_crawl_events`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        bot_name: data.name,
        bot_category: data.category,
        bot_display_name: data.displayName,
        bot_provider: data.provider,
        brand_subdomain: data.brandSubdomain || null,
        memo_slug: data.memoSlug,
        page_path: data.pagePath,
        user_agent: data.userAgent,
        ip_country: data.ipCountry,
      }),
    })

    if (!response.ok) {
      console.error(`Bot crawl log failed: ${response.status}`)
    }
  } catch (error) {
    // Fail silently — logging should never break the site
    console.error('Bot crawl log error:', error)
  }
}

// =============================================================================
// Display helpers (for UI)
// =============================================================================

export const BOT_CATEGORY_LABELS: Record<BotCategory, string> = {
  ai_training: 'AI Training',
  ai_search: 'AI Search',
  ai_user_browse: 'AI User Browse',
  search_engine: 'Search Engine',
  seo_tool: 'SEO Tool',
}

export const BOT_CATEGORY_COLORS: Record<BotCategory, string> = {
  ai_training: '#8B5CF6',
  ai_search: '#10B981',
  ai_user_browse: '#0EA5E9',
  search_engine: '#F59E0B',
  seo_tool: '#6B7280',
}

/** Returns true if the bot is an AI bot (not a traditional search engine or SEO tool) */
export function isAIBot(category: BotCategory): boolean {
  return category === 'ai_training' || category === 'ai_search' || category === 'ai_user_browse'
}
