import { describe, it, expect } from 'vitest'
import {
  detectAISource,
  formatVoiceInsightCitation,
  hasPermission,
  type VoiceInsight,
  type AIReferrerSource,
  type OrgRole,
  type Permission,
  ROLE_PERMISSIONS,
  AI_SOURCE_LABELS,
  AI_SOURCE_COLORS,
  VOICE_INSIGHT_TOPIC_LABELS,
  VOICE_INSIGHT_TOPIC_DESCRIPTIONS,
} from '@/lib/supabase/types'

describe('detectAISource', () => {
  describe('referrer-based detection', () => {
    it('detects ChatGPT from chat.openai.com referrer', () => {
      expect(detectAISource('https://chat.openai.com/', null)).toBe('chatgpt')
    })

    it('detects ChatGPT from chatgpt.com referrer', () => {
      expect(detectAISource('https://chatgpt.com/', null)).toBe('chatgpt')
    })

    it('detects Perplexity from perplexity.ai referrer', () => {
      expect(detectAISource('https://perplexity.ai/search/abc', null)).toBe('perplexity')
    })

    it('detects Claude from claude.ai referrer', () => {
      expect(detectAISource('https://claude.ai/chat', null)).toBe('claude')
    })

    it('detects Gemini from gemini.google.com referrer', () => {
      expect(detectAISource('https://gemini.google.com/', null)).toBe('gemini')
    })

    it('detects Gemini from bard.google.com referrer (legacy)', () => {
      expect(detectAISource('https://bard.google.com/', null)).toBe('gemini')
    })

    it('detects Copilot from copilot.microsoft.com referrer', () => {
      expect(detectAISource('https://copilot.microsoft.com/', null)).toBe('copilot')
    })

    it('detects Copilot from bing.com/chat referrer', () => {
      expect(detectAISource('https://bing.com/chat', null)).toBe('copilot')
    })

    it('detects Meta AI from meta.ai referrer', () => {
      expect(detectAISource('https://meta.ai/', null)).toBe('meta_ai')
    })

    it('detects Meta AI from facebook.com/ai referrer', () => {
      expect(detectAISource('https://facebook.com/ai', null)).toBe('meta_ai')
    })

    it('detects Poe from poe.com referrer', () => {
      expect(detectAISource('https://poe.com/', null)).toBe('poe')
    })

    it('detects You.com from you.com referrer', () => {
      expect(detectAISource('https://you.com/', null)).toBe('you')
    })

    it('detects Phind from phind.com referrer', () => {
      expect(detectAISource('https://phind.com/', null)).toBe('phind')
    })

    it('detects unknown_ai from ai-like patterns in referrer', () => {
      // Note: The function checks for 'ai.' (with dot after), '/ai/', or 'chat.' patterns
      // '.ai/' doesn't match 'ai.' pattern, so example.ai returns organic
      expect(detectAISource('https://example.com/ai/chat', null)).toBe('unknown_ai')
      expect(detectAISource('https://chat.example.com/', null)).toBe('unknown_ai')
      // This matches 'ai.' pattern (ai.domain):
      expect(detectAISource('https://ai.example.com/chat', null)).toBe('unknown_ai')
    })

    it('detects organic from Google search', () => {
      expect(detectAISource('https://google.com/search', null)).toBe('organic')
    })

    it('detects organic from Bing search', () => {
      expect(detectAISource('https://bing.com/search', null)).toBe('organic')
    })

    it('detects organic from DuckDuckGo', () => {
      expect(detectAISource('https://duckduckgo.com/', null)).toBe('organic')
    })

    it('detects organic from social media', () => {
      expect(detectAISource('https://twitter.com/', null)).toBe('organic')
      expect(detectAISource('https://linkedin.com/', null)).toBe('organic')
      expect(detectAISource('https://facebook.com/', null)).toBe('organic')
    })
  })

  describe('user agent-based detection', () => {
    it('detects ChatGPT from user agent', () => {
      expect(detectAISource(null, 'Mozilla/5.0 ChatGPT/1.0')).toBe('chatgpt')
    })

    it('detects ChatGPT from OpenAI user agent', () => {
      expect(detectAISource(null, 'OpenAI/1.0')).toBe('chatgpt')
    })

    it('detects Perplexity from user agent', () => {
      expect(detectAISource(null, 'PerplexityBot/1.0')).toBe('perplexity')
    })

    it('detects Claude from user agent', () => {
      expect(detectAISource(null, 'Anthropic/1.0')).toBe('claude')
    })

    it('detects Claude from claude user agent', () => {
      expect(detectAISource(null, 'Claude/1.0')).toBe('claude')
    })

    it('detects Gemini from user agent', () => {
      expect(detectAISource(null, 'Google-Extended/1.0')).toBe('gemini')
    })

    it('detects Copilot from bingbot with AI', () => {
      expect(detectAISource(null, 'BingBot/1.0 AI')).toBe('copilot')
    })
  })

  describe('edge cases', () => {
    it('returns direct_nav when no referrer and no user agent', () => {
      expect(detectAISource(null, null)).toBe('direct_nav')
    })

    it('returns direct_nav when referrer is empty string', () => {
      expect(detectAISource('', null)).toBe('direct_nav')
    })

    it('returns organic for unknown referrers', () => {
      expect(detectAISource('https://unknown-site.com/', null)).toBe('organic')
    })

    it('handles case-insensitive matching', () => {
      expect(detectAISource('HTTPS://CHAT.OPENAI.COM/', null)).toBe('chatgpt')
      expect(detectAISource('https://PERPLEXITY.AI/', null)).toBe('perplexity')
    })
  })
})

describe('formatVoiceInsightCitation', () => {
  const baseInsight: VoiceInsight = {
    id: 'insight-1',
    brand_id: 'brand-1',
    tenant_id: 'tenant-1',
    title: 'Test Insight',
    transcript: 'This is a test transcript',
    topic: 'product_insight',
    tags: ['test'],
    recorded_at: '2024-01-15T14:30:00Z',
    recorded_by_name: 'John Doe',
    cited_in_memos: [],
    citation_count: 0,
    status: 'active',
    created_at: '2024-01-15T14:30:00Z',
    updated_at: '2024-01-15T14:30:00Z',
  }

  it('formats basic citation with name and date', () => {
    const citation = formatVoiceInsightCitation(baseInsight)
    expect(citation).toContain('John Doe')
    expect(citation).toContain('2024')
  })

  it('includes title when provided', () => {
    const insight: VoiceInsight = {
      ...baseInsight,
      recorded_by_title: 'CEO',
    }
    const citation = formatVoiceInsightCitation(insight)
    expect(citation).toContain('John Doe, CEO')
  })

  it('includes location when provided', () => {
    const insight: VoiceInsight = {
      ...baseInsight,
      geolocation: {
        city: 'San Francisco',
        region: 'CA',
      },
    }
    const citation = formatVoiceInsightCitation(insight)
    expect(citation).toContain('(San Francisco, CA)')
  })

  it('formats citation without location when geolocation is incomplete', () => {
    const insight: VoiceInsight = {
      ...baseInsight,
      geolocation: {
        city: 'San Francisco',
        // missing region
      },
    }
    const citation = formatVoiceInsightCitation(insight)
    expect(citation).not.toContain('(San Francisco')
  })

  it('includes time in citation', () => {
    const citation = formatVoiceInsightCitation(baseInsight)
    expect(citation).toMatch(/\d{1,2}:\d{2}/) // matches time format
  })
})

describe('hasPermission', () => {
  it('owner has all permissions', () => {
    const permissions: Permission[] = ['read', 'write', 'delete', 'manage_members', 'manage_billing', 'transfer_ownership']
    permissions.forEach(permission => {
      expect(hasPermission('owner', permission)).toBe(true)
    })
  })

  it('admin has read, write, delete, manage_members permissions', () => {
    expect(hasPermission('admin', 'read')).toBe(true)
    expect(hasPermission('admin', 'write')).toBe(true)
    expect(hasPermission('admin', 'delete')).toBe(true)
    expect(hasPermission('admin', 'manage_members')).toBe(true)
  })

  it('admin does not have manage_billing or transfer_ownership', () => {
    expect(hasPermission('admin', 'manage_billing')).toBe(false)
    expect(hasPermission('admin', 'transfer_ownership')).toBe(false)
  })

  it('member has read and write permissions', () => {
    expect(hasPermission('member', 'read')).toBe(true)
    expect(hasPermission('member', 'write')).toBe(true)
  })

  it('member does not have delete or manage permissions', () => {
    expect(hasPermission('member', 'delete')).toBe(false)
    expect(hasPermission('member', 'manage_members')).toBe(false)
  })

  it('viewer only has read permission', () => {
    expect(hasPermission('viewer', 'read')).toBe(true)
    expect(hasPermission('viewer', 'write')).toBe(false)
    expect(hasPermission('viewer', 'delete')).toBe(false)
  })
})

describe('ROLE_PERMISSIONS constant', () => {
  it('defines correct permissions for each role', () => {
    expect(ROLE_PERMISSIONS.owner).toContain('transfer_ownership')
    expect(ROLE_PERMISSIONS.owner).toContain('manage_billing')
    expect(ROLE_PERMISSIONS.admin).not.toContain('transfer_ownership')
    expect(ROLE_PERMISSIONS.member).toEqual(['read', 'write'])
    expect(ROLE_PERMISSIONS.viewer).toEqual(['read'])
  })
})

describe('AI_SOURCE_LABELS', () => {
  it('has labels for all AI sources', () => {
    const sources: AIReferrerSource[] = [
      'chatgpt', 'perplexity', 'claude', 'gemini', 'copilot',
      'meta_ai', 'poe', 'you', 'phind', 'direct', 'unknown_ai',
      'organic', 'direct_nav'
    ]
    sources.forEach(source => {
      expect(AI_SOURCE_LABELS[source]).toBeDefined()
      expect(typeof AI_SOURCE_LABELS[source]).toBe('string')
    })
  })
})

describe('AI_SOURCE_COLORS', () => {
  it('has colors for all AI sources', () => {
    const sources: AIReferrerSource[] = [
      'chatgpt', 'perplexity', 'claude', 'gemini', 'copilot',
      'meta_ai', 'poe', 'you', 'phind', 'direct', 'unknown_ai',
      'organic', 'direct_nav'
    ]
    sources.forEach(source => {
      expect(AI_SOURCE_COLORS[source]).toBeDefined()
      expect(typeof AI_SOURCE_COLORS[source]).toBe('string')
      expect(AI_SOURCE_COLORS[source]).toMatch(/^#[0-9A-Fa-f]{6}$/)
    })
  })
})

describe('VOICE_INSIGHT_TOPIC_LABELS', () => {
  it('has labels for all topics', () => {
    const topics = ['market_position', 'concept_definition', 'product_insight', 'competitive_advantage', 'customer_context', 'industry_expertise', 'other']
    topics.forEach(topic => {
      expect(VOICE_INSIGHT_TOPIC_LABELS[topic as keyof typeof VOICE_INSIGHT_TOPIC_LABELS]).toBeDefined()
    })
  })
})

describe('VOICE_INSIGHT_TOPIC_DESCRIPTIONS', () => {
  it('has descriptions for all topics', () => {
    const topics = ['market_position', 'concept_definition', 'product_insight', 'competitive_advantage', 'customer_context', 'industry_expertise', 'other']
    topics.forEach(topic => {
      expect(VOICE_INSIGHT_TOPIC_DESCRIPTIONS[topic as keyof typeof VOICE_INSIGHT_TOPIC_DESCRIPTIONS]).toBeDefined()
    })
  })
})
