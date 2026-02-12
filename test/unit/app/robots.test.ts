import { describe, it, expect } from 'vitest'
import robots from '@/app/robots'

type RobotRule = {
  userAgent?: string | string[] | undefined
  allow?: string | string[] | undefined
  disallow?: string | string[] | undefined
  crawlDelay?: number | undefined
}

describe('robots', () => {
  it('should return a valid robots.txt configuration', () => {
    const config = robots()

    expect(config).toBeDefined()
    expect(config.rules).toBeInstanceOf(Array)
    expect(config.sitemap).toBe('https://contextmemo.com/sitemap.xml')

    // Check for the default rules
    const rules = Array.isArray(config.rules) ? config.rules : [config.rules]
    const defaultRules = rules.find((rule: RobotRule) => rule.userAgent === '*')
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
    const gptBotRules = rules.find((rule: RobotRule) => rule.userAgent === 'GPTBot')
    expect(gptBotRules).toBeDefined()
    expect(gptBotRules?.allow).toEqual(['/memo/', '/llms.txt'])

    // You can add more specific checks for other userAgents if needed
  })
})
