import { MetadataRoute } from 'next'

const AI_CONTENT_PATHS = ['/memo/', '/resources/', '/memos/', '/compare/', '/alternatives/', '/guides/', '/for/', '/how-to/', '/how/', '/vs/', '/gap/', '/alternatives-to/', '/llms.txt', '/llms-full.txt']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default rules for all crawlers
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/brands/',
          '/auth/',
          '/invite/',
          '/mockups/',
        ],
      },

      // --- OpenAI ---
      {
        userAgent: 'GPTBot',
        allow: AI_CONTENT_PATHS,
      },
      {
        userAgent: 'OAI-SearchBot',
        allow: AI_CONTENT_PATHS,
      },
      {
        userAgent: 'ChatGPT-User',
        allow: AI_CONTENT_PATHS,
      },

      // --- Anthropic ---
      {
        userAgent: 'ClaudeBot',
        allow: AI_CONTENT_PATHS,
      },
      {
        userAgent: 'Claude-Web',
        allow: AI_CONTENT_PATHS,
      },
      {
        userAgent: 'Claude-SearchBot',
        allow: AI_CONTENT_PATHS,
      },
      {
        userAgent: 'Claude-User',
        allow: AI_CONTENT_PATHS,
      },
      {
        userAgent: 'anthropic-ai',
        allow: AI_CONTENT_PATHS,
      },

      // --- Perplexity ---
      {
        userAgent: 'PerplexityBot',
        allow: AI_CONTENT_PATHS,
      },
      {
        userAgent: 'Perplexity-User',
        allow: AI_CONTENT_PATHS,
      },

      // --- Google AI ---
      {
        userAgent: 'Google-Extended',
        allow: AI_CONTENT_PATHS,
      },

      // --- Apple ---
      {
        userAgent: 'Applebot-Extended',
        allow: AI_CONTENT_PATHS,
      },

      // --- Meta ---
      {
        userAgent: 'meta-externalagent',
        allow: AI_CONTENT_PATHS,
      },

      // --- Amazon ---
      {
        userAgent: 'Amazonbot',
        allow: AI_CONTENT_PATHS,
      },

      // --- ByteDance ---
      {
        userAgent: 'Bytespider',
        allow: AI_CONTENT_PATHS,
      },

      // --- Cohere ---
      {
        userAgent: 'cohere-ai',
        allow: AI_CONTENT_PATHS,
      },
    ],
    sitemap: 'https://contextmemo.com/sitemap.xml',
  }
}

// Note: Content paths are intentionally public and crawlable.
// They contain published brand memos designed for AI citation.
// All AI crawlers are explicitly allowed on content routes.
