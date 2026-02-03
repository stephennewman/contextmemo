import { MetadataRoute } from 'next'

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
      // Explicitly allow AI crawlers to index memo content
      {
        userAgent: 'GPTBot',
        allow: ['/memo/', '/llms.txt'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/memo/', '/llms.txt'],
      },
      {
        userAgent: 'Claude-Web',
        allow: ['/memo/', '/llms.txt'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/memo/', '/llms.txt'],
      },
      {
        userAgent: 'anthropic-ai',
        allow: ['/memo/', '/llms.txt'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/memo/', '/llms.txt'],
      },
      {
        userAgent: 'cohere-ai',
        allow: ['/memo/', '/llms.txt'],
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/memo/', '/llms.txt'],
      },
    ],
    sitemap: 'https://contextmemo.com/sitemap.xml',
  }
}

// Note: /memo/ routes are intentionally public and crawlable
// They contain published brand memos designed for AI citation
