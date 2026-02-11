import { describe, it, expect } from 'vitest'
import robots from '@/app/robots'

interface RobotsRule {
  userAgent: string | string[]
  allow?: string | string[]
  disallow?: string | string[]
  crawlDelay?: number
}

describe('robots', () => {
  it('should return a valid robots.txt configuration', () => {
    const config = robots()

    expect(config).toBeDefined()
    expect(config.rules).toBeInstanceOf(Array)
    expect(config.sitemap).toBe('https://contextmemo.com/sitemap.xml')

    // Check for the default rules
    const rules = config.rules as RobotsRule[]
    const defaultRules = rules.find((rule) => rule.userAgent === '*')
    expect(defaultRules).toBeDefined()
    expect(defaultRules?.allow).toContain('/')
    expect(defaultRules?.disallow).toEqual([
      '/api/',
      '/dashboard/',
      '/brands/',
      '/auth/',
      '/invite/',
      '/mockups/',
    ])

    // Check for AI-specific rules (example: GPTBot)
    const gptBotRules = rules.find((rule) => rule.userAgent === 'GPTBot')
    expect(gptBotRules).toBeDefined()
    expect(gptBotRules?.allow).toEqual(['/memo/', '/llms.txt'])

    // You can add more specific checks for other userAgents if needed
  })
})
