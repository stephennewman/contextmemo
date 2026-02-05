'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Activity,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  XCircle,
  FileText,
  Globe,
  RefreshCw,
  Database,
  Users,
  Search,
  Newspaper,
  Compass,
  Zap,
  Calendar,
  Plus,
  BadgeCheck,
  AlertTriangle,
  Eye,
  Play,
  Radar,
  Settings,
  HelpCircle,
  Lightbulb,
  Target,
  MessageSquare,
  MoreHorizontal,
  EyeOff,
  Pencil,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Link2,
  Quote,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { 
  ActivityType, 
  ACTIVITY_TYPE_META,
} from '@/lib/supabase/types'

// Icon mapping
const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Play, CheckCircle, XCircle, Eye, FileText, Globe, RefreshCw, Database,
  Users, Search, Newspaper, Compass, Zap, Calendar, Plus, BadgeCheck,
  AlertTriangle, Radar, Settings, Activity, HelpCircle, Lightbulb, Target, MessageSquare,
}

interface ActivityItem {
  id: string
  brand_id: string
  brand_name?: string
  activity_type: ActivityType
  title: string
  description: string | null
  icon: string
  link_url: string | null
  link_label: string | null
  metadata: Record<string, unknown>
  created_at: string
}

interface ActivityDetailProps {
  activity: ActivityItem | null
  isOpen: boolean
  onClose: () => void
}

interface PromptHistoryEntry {
  date: string
  models_scanned: number
  mentioned_count: number
  cited_count: number
  mention_rate: number
  citation_rate: number
  competitors: string[]
  citations: { url: string; mentioned: boolean; cited: boolean }[]
  details?: { model: string; brand_mentioned: boolean; brand_in_citations: boolean }[]
}

interface PromptHistory {
  prompt: { id: string; query_text: string; created_at: string }
  stats: {
    total_scans: number
    total_mentioned: number
    total_cited: number
    mention_rate: number
    citation_rate: number
    days_tracked: number
  }
  trend: {
    mention_rate_change: number
    citation_rate_change: number
    direction: 'up' | 'down' | 'stable'
  }
  history: PromptHistoryEntry[]
}

// Explanations for each activity type
const ACTIVITY_EXPLANATIONS: Record<string, {
  whatItMeans: string
  whyItMatters: string
  nextSteps?: string
}> = {
  query_generated: {
    whatItMeans: `Prompts are the questions your potential customers ask AI assistants like ChatGPT, Claude, or Perplexity. Context Memo generates three types:

**Persona-based prompts** — Questions phrased the way specific buyer types ask them (e.g., "What CRM has the best API documentation?" for developers vs "What CRM is easiest to set up?" for SMB owners)

**Intent-based prompts** — Questions derived from pain points on your website (e.g., if your site mentions "reduce manual data entry", we generate "How can I automate data entry in my CRM?")

**Category-based prompts** — Standard comparison and "best of" queries in your industry (e.g., "Best CRM for small teams", "HubSpot vs Salesforce")`,
    whyItMatters: `These prompts are used to scan AI models and check if they mention your brand. The more relevant prompts we track, the better we understand your AI visibility across different buyer personas.`,
    nextSteps: `View your prompts to see the full list, disable any that aren't relevant, or add custom prompts you want to track.`,
  },
  scan_completed: {
    whatItMeans: `An AI visibility scan queries multiple AI models (GPT-4o, Claude, Gemini, Llama, Mistral, Perplexity, DeepSeek, Qwen, Grok) with your tracked prompts and checks if they mention your brand in their responses.

**Visibility score** = % of responses that mention your brand
**Visibility gaps** = Prompts where AI models did NOT mention your brand (these are opportunities to improve)`,
    whyItMatters: `This is your core metric for AI search visibility. Higher visibility means more potential customers discovering your brand through AI assistants. Each "gap" is a prompt where potential customers won't find you.`,
    nextSteps: `Review the gaps below. For each prompt, you can: disable it if not relevant, edit it to be more specific, or generate a memo to help AI models learn about your brand for that topic.`,
  },
  memo_generated: {
    whatItMeans: `A memo is a factual, AI-optimized reference page about your brand. Types include:

**Comparison memos** — Your brand vs a specific competitor
**Alternative memos** — "Alternatives to [Competitor]" pages
**Industry memos** — Your brand for a specific use case/industry
**How-to memos** — Guides featuring your product`,
    whyItMatters: `Memos give AI models factual content to cite when users ask about your category. They're published to your subdomain (yourname.contextmemo.com) and designed to be crawled and referenced by AI.`,
    nextSteps: `Review the memo content, make edits if needed, and ensure it's published.`,
  },
  memo_published: {
    whatItMeans: `A memo is now live at your contextmemo.com subdomain and can be discovered by AI crawlers and search engines.`,
    whyItMatters: `Published memos increase your chances of being cited by AI models. The more factual, well-structured content about your brand, the better.`,
    nextSteps: `Share the memo URL, add internal links from your main site, and monitor if AI models start citing it.`,
  },
  competitor_discovered: {
    whatItMeans: `Context Memo identified a competitor by analyzing your website, industry, and market positioning. Competitors are used to:

- Generate comparison prompts ("Your brand vs Competitor")
- Track share of voice in AI responses
- Monitor competitor content for response opportunities`,
    whyItMatters: `Understanding who you compete with in AI search helps focus your visibility efforts on the right battles.`,
    nextSteps: `Review discovered competitors, remove any that aren't relevant, and add any that were missed.`,
  },
  competitor_content_found: {
    whatItMeans: `A competitor published new content (blog post, article, guide) that we detected during our daily scan.`,
    whyItMatters: `Competitor content can influence what AI models say about your category. Tracking it lets you respond with your own perspective.`,
    nextSteps: `Read the article to understand their angle, and consider creating response content if relevant.`,
  },
  context_extracted: {
    whatItMeans: `Context Memo analyzed your website and extracted key information:

- Company description and value proposition
- Products and features
- Target markets and industries
- Brand tone and voice
- Social links and credibility signals`,
    whyItMatters: `This context is used to generate accurate prompts and memos. Better context = more relevant content.`,
    nextSteps: `Review extracted context in Settings and make corrections if anything is inaccurate.`,
  },
  ai_traffic_detected: {
    whatItMeans: `Someone visited your content after clicking a link in an AI response (ChatGPT, Perplexity, Claude, etc.)`,
    whyItMatters: `This is the ultimate proof that AI visibility drives real traffic. Track which AI sources send the most visitors.`,
    nextSteps: `Analyze which content drives AI traffic and double down on similar topics.`,
  },
  discovery_scan_completed: {
    whatItMeans: `A discovery scan tested 50+ variations of prompts to find where your brand IS being mentioned by AI models, even for queries you weren't tracking.`,
    whyItMatters: `Discovery helps find "winning" prompts that can be added to your regular tracking and optimized further.`,
    nextSteps: `Check if new prompts were added from discovery results.`,
  },
  daily_run_completed: {
    whatItMeans: `The daily automation ran, which includes:

- Refreshing brand context (weekly)
- Discovering new competitors (weekly)
- Generating new prompts (weekly)
- Running AI visibility scans (daily)
- Scanning competitor content (daily)`,
    whyItMatters: `Automation keeps your visibility monitoring current without manual work.`,
    nextSteps: `Review any alerts or changes that came from the daily run.`,
  },
}

export function ActivityDetail({ activity, isOpen, onClose }: ActivityDetailProps) {
  const [relatedData, setRelatedData] = useState<{
    queries?: Array<{ id: string; query_text: string; persona: string | null; query_type: string }>
    scans?: Array<{ model: string; brand_mentioned: boolean; query_text: string }>
    gaps?: Array<{
      id: string
      query_text: string
      query_type: string
      persona: string | null
      mention_rate: number
      models_checked: number
      has_memo: boolean
    }>
    memo?: { title: string; content_markdown: string; slug: string }
  } | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Prompt history state
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null)
  const [promptHistory, setPromptHistory] = useState<PromptHistory | null>(null)
  const [promptHistoryLoading, setPromptHistoryLoading] = useState(false)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!activity || !isOpen) {
      setRelatedData(null)
      setSelectedPromptId(null)
      setPromptHistory(null)
      return
    }

    // Fetch related data based on activity type
    const fetchRelatedData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          activity_type: activity.activity_type,
          brand_id: activity.brand_id,
          created_at: activity.created_at,
        })

        const res = await fetch(`/api/activity/detail?${params}`)
        if (res.ok) {
          const data = await res.json()
          setRelatedData(data)
        }
      } catch (error) {
        console.error('Failed to fetch activity detail:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRelatedData()
  }, [activity, isOpen])

  // Fetch prompt history when a prompt is selected
  const fetchPromptHistory = async (promptId: string) => {
    if (!activity) return
    
    if (selectedPromptId === promptId) {
      // Toggle off
      setSelectedPromptId(null)
      setPromptHistory(null)
      return
    }

    setSelectedPromptId(promptId)
    setPromptHistoryLoading(true)
    setPromptHistory(null)

    try {
      const res = await fetch(`/api/brands/${activity.brand_id}/prompts/${promptId}/history?days=30`)
      if (res.ok) {
        const data = await res.json()
        setPromptHistory(data)
      }
    } catch (error) {
      console.error('Failed to fetch prompt history:', error)
    } finally {
      setPromptHistoryLoading(false)
    }
  }

  const toggleDateExpanded = (date: string) => {
    setExpandedDates(prev => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }

  // Action handlers for gaps
  const handleDisablePrompt = async (promptId: string) => {
    setActionLoading(promptId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('queries')
        .update({ is_active: false })
        .eq('id', promptId)

      if (error) throw error

      // Remove from local state
      setRelatedData(prev => prev ? {
        ...prev,
        gaps: prev.gaps?.filter(g => g.id !== promptId)
      } : null)

      toast.success('Prompt disabled')
    } catch (error) {
      toast.error('Failed to disable prompt')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleGenerateMemo = async (promptId: string, queryType: string, brandId: string) => {
    setActionLoading(promptId)
    try {
      // Determine memo type based on query type
      let memoType = 'industry'
      if (queryType === 'comparison' || queryType === 'versus') {
        memoType = 'comparison'
      } else if (queryType === 'alternative') {
        memoType = 'alternative'
      } else if (queryType === 'how_to') {
        memoType = 'how_to'
      }

      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_memo',
          queryId: promptId,
          memoType,
        }),
      })

      if (!response.ok) throw new Error('Failed to trigger memo generation')

      // Update local state to show memo is being generated
      setRelatedData(prev => prev ? {
        ...prev,
        gaps: prev.gaps?.map(g => g.id === promptId ? { ...g, has_memo: true } : g)
      } : null)

      toast.success('Memo generation started')
    } catch (error) {
      toast.error('Failed to generate memo')
      console.error(error)
    } finally {
      setActionLoading(null)
    }
  }

  if (!activity) return null

  const meta = ACTIVITY_TYPE_META[activity.activity_type]
  const Icon = ICONS[activity.icon] || ICONS[meta?.icon] || Activity
  const explanation = ACTIVITY_EXPLANATIONS[activity.activity_type]

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border-[3px] border-[#0F172A] rounded-none">
        <DialogHeader className="border-b-[3px] border-[#0F172A] pb-4">
          <div className="flex items-start gap-4">
            <div 
              className="h-12 w-12 flex items-center justify-center shrink-0"
              style={{ 
                backgroundColor: `${meta?.color || '#6B7280'}15`,
                borderLeft: `4px solid ${meta?.color || '#6B7280'}`
              }}
            >
              <Icon 
                className="h-6 w-6" 
                style={{ color: meta?.color || '#6B7280' }}
              />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-[#0F172A]">
                {activity.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 mt-1">
                {activity.description}
              </DialogDescription>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-slate-400">{formatTime(activity.created_at)}</span>
                {activity.brand_name && (
                  <Badge variant="outline" className="text-xs rounded-none border-[#0F172A]">
                    {activity.brand_name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6">
          {/* Explanation Section */}
          {explanation && (
            <div className="space-y-4">
              <div className="bg-slate-50 border-l-4 border-[#0EA5E9] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle className="h-4 w-4 text-[#0EA5E9]" />
                  <span className="font-semibold text-sm text-[#0F172A]">What This Means</span>
                </div>
                <div className="text-sm text-slate-700 whitespace-pre-line prose prose-sm max-w-none">
                  {explanation.whatItMeans.split('**').map((part, i) => 
                    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                  )}
                </div>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-green-600" />
                  <span className="font-semibold text-sm text-[#0F172A]">Why It Matters</span>
                </div>
                <p className="text-sm text-slate-700">{explanation.whyItMatters}</p>
              </div>

              {explanation.nextSteps && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-amber-600" />
                    <span className="font-semibold text-sm text-[#0F172A]">Next Steps</span>
                  </div>
                  <p className="text-sm text-slate-700">{explanation.nextSteps}</p>
                </div>
              )}
            </div>
          )}

          {/* Related Data Section */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : relatedData && (
            <div className="space-y-4">
              {/* Show generated queries */}
              {relatedData.queries && relatedData.queries.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="h-4 w-4 text-[#8B5CF6]" />
                    <span className="font-semibold text-sm text-[#0F172A]">
                      Generated Prompts ({relatedData.queries.length})
                    </span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {relatedData.queries.slice(0, 20).map((q) => (
                      <div 
                        key={q.id}
                        className="p-3 bg-slate-50 border-l-2"
                        style={{ 
                          borderLeftColor: q.persona ? '#8B5CF6' : q.query_type === 'intent_based' ? '#10B981' : '#6B7280'
                        }}
                      >
                        <p className="text-sm text-[#0F172A]">"{q.query_text}"</p>
                        <div className="flex gap-2 mt-1">
                          {q.persona && (
                            <Badge variant="outline" className="text-xs rounded-none bg-purple-50 border-purple-200">
                              {q.persona.replace(/_/g, ' ')}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs rounded-none">
                            {q.query_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {relatedData.queries.length > 20 && (
                      <p className="text-xs text-slate-500 text-center py-2">
                        + {relatedData.queries.length - 20} more prompts
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Show visibility gaps with actions */}
              {relatedData.gaps && relatedData.gaps.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="font-semibold text-sm text-[#0F172A]">
                      Visibility Gaps ({relatedData.gaps.length} prompts)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    Click a prompt to see its history. Take action to improve visibility.
                  </p>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {relatedData.gaps.map((gap) => (
                      <div key={gap.id}>
                        <div 
                          className={`p-3 bg-slate-50 border-l-2 cursor-pointer transition-colors ${
                            selectedPromptId === gap.id 
                              ? 'border-[#0EA5E9] bg-sky-50' 
                              : 'border-amber-400 hover:bg-slate-100'
                          }`}
                          onClick={() => fetchPromptHistory(gap.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-[#0F172A] font-medium">"{gap.query_text}"</p>
                                {selectedPromptId === gap.id ? (
                                  <ChevronUp className="h-4 w-4 text-[#0EA5E9]" />
                                ) : (
                                  <BarChart3 className="h-3 w-3 text-slate-400" />
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs rounded-none ${gap.mention_rate === 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}
                                >
                                  <Quote className="h-3 w-3 mr-1" />
                                  {gap.mention_rate}% mentioned
                                </Badge>
                                <Badge variant="outline" className="text-xs rounded-none">
                                  {gap.query_type.replace(/_/g, ' ')}
                                </Badge>
                                {gap.persona && (
                                  <Badge variant="outline" className="text-xs rounded-none bg-purple-50 border-purple-200">
                                    {gap.persona.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                                {gap.has_memo && (
                                  <Badge variant="outline" className="text-xs rounded-none bg-green-50 border-green-200 text-green-700">
                                    <FileText className="h-3 w-3 mr-1" />
                                    has memo
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {/* Action dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  disabled={actionLoading === gap.id}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {actionLoading === gap.id ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <MoreHorizontal className="h-4 w-4" />
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 border-2 border-[#0F172A] rounded-none">
                                {!gap.has_memo && (
                                  <DropdownMenuItem 
                                    onClick={() => handleGenerateMemo(gap.id, gap.query_type, activity!.brand_id)}
                                    className="rounded-none"
                                  >
                                    <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
                                    Generate Memo
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => {
                                    // Open prompt in new tab for editing
                                    window.open(`/brands/${activity!.brand_id}?tab=prompts&edit=${gap.id}`, '_blank')
                                  }}
                                  className="rounded-none"
                                >
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit Prompt
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDisablePrompt(gap.id)}
                                  className="rounded-none text-red-600"
                                >
                                  <EyeOff className="h-4 w-4 mr-2" />
                                  Disable Prompt
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Prompt History Panel */}
                        {selectedPromptId === gap.id && (
                          <div className="border-l-2 border-[#0EA5E9] ml-0 bg-white p-4 space-y-4">
                            {promptHistoryLoading ? (
                              <div className="flex items-center gap-2 text-sm text-slate-500">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Loading history...
                              </div>
                            ) : promptHistory ? (
                              <>
                                {/* Stats Overview */}
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="bg-slate-50 p-3 border-l-2 border-slate-300">
                                    <div className="text-xs text-slate-500 uppercase tracking-wide">Mention Rate</div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xl font-bold">{promptHistory.stats.mention_rate}%</span>
                                      {promptHistory.trend.mention_rate_change !== 0 && (
                                        <span className={`flex items-center text-xs ${
                                          promptHistory.trend.mention_rate_change > 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {promptHistory.trend.mention_rate_change > 0 ? (
                                            <TrendingUp className="h-3 w-3 mr-0.5" />
                                          ) : (
                                            <TrendingDown className="h-3 w-3 mr-0.5" />
                                          )}
                                          {Math.abs(promptHistory.trend.mention_rate_change)}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="bg-slate-50 p-3 border-l-2 border-green-400">
                                    <div className="text-xs text-slate-500 uppercase tracking-wide">Citation Rate</div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xl font-bold">{promptHistory.stats.citation_rate}%</span>
                                      {promptHistory.trend.citation_rate_change !== 0 && (
                                        <span className={`flex items-center text-xs ${
                                          promptHistory.trend.citation_rate_change > 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                          {promptHistory.trend.citation_rate_change > 0 ? (
                                            <TrendingUp className="h-3 w-3 mr-0.5" />
                                          ) : (
                                            <TrendingDown className="h-3 w-3 mr-0.5" />
                                          )}
                                          {Math.abs(promptHistory.trend.citation_rate_change)}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="bg-slate-50 p-3 border-l-2 border-blue-400">
                                    <div className="text-xs text-slate-500 uppercase tracking-wide">Days Tracked</div>
                                    <div className="text-xl font-bold mt-1">{promptHistory.stats.days_tracked}</div>
                                  </div>
                                </div>

                                {/* Daily History */}
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Calendar className="h-4 w-4 text-slate-500" />
                                    <span className="text-sm font-semibold">Daily Results</span>
                                  </div>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {promptHistory.history.map((entry) => (
                                      <div key={entry.date} className="border border-slate-200">
                                        <div 
                                          className="flex items-center justify-between p-2 bg-slate-50 cursor-pointer hover:bg-slate-100"
                                          onClick={() => toggleDateExpanded(entry.date)}
                                        >
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium">
                                              {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline" className={`text-xs rounded-none ${
                                                entry.mention_rate > 50 ? 'bg-green-50 border-green-200 text-green-700' : 
                                                entry.mention_rate > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                                'bg-red-50 border-red-200 text-red-700'
                                              }`}>
                                                <Quote className="h-3 w-3 mr-1" />
                                                {entry.mention_rate}%
                                              </Badge>
                                              <Badge variant="outline" className={`text-xs rounded-none ${
                                                entry.citation_rate > 0 ? 'bg-green-50 border-green-200 text-green-700' :
                                                'bg-slate-50 border-slate-200 text-slate-500'
                                              }`}>
                                                <Link2 className="h-3 w-3 mr-1" />
                                                {entry.citation_rate}%
                                              </Badge>
                                            </div>
                                          </div>
                                          {expandedDates.has(entry.date) ? (
                                            <ChevronUp className="h-4 w-4 text-slate-400" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4 text-slate-400" />
                                          )}
                                        </div>
                                        
                                        {expandedDates.has(entry.date) && (
                                          <div className="p-3 space-y-3 text-sm">
                                            {/* Competitors mentioned */}
                                            {entry.competitors.length > 0 && (
                                              <div>
                                                <div className="text-xs text-slate-500 uppercase mb-1">Competitors Mentioned</div>
                                                <div className="flex flex-wrap gap-1">
                                                  {entry.competitors.slice(0, 10).map((comp) => (
                                                    <Badge key={comp} variant="outline" className="text-xs rounded-none bg-orange-50 border-orange-200">
                                                      {comp}
                                                    </Badge>
                                                  ))}
                                                  {entry.competitors.length > 10 && (
                                                    <Badge variant="outline" className="text-xs rounded-none">
                                                      +{entry.competitors.length - 10}
                                                    </Badge>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                            
                                            {/* Citations */}
                                            {entry.citations.length > 0 && (
                                              <div>
                                                <div className="text-xs text-slate-500 uppercase mb-1">Content Cited</div>
                                                <div className="space-y-1">
                                                  {entry.citations.slice(0, 5).map((citation, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                      {citation.cited ? (
                                                        <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                                                      ) : (
                                                        <Minus className="h-3 w-3 text-slate-300 shrink-0" />
                                                      )}
                                                      <a 
                                                        href={citation.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-[#0EA5E9] hover:underline truncate"
                                                      >
                                                        {citation.url.replace(/^https?:\/\//, '').slice(0, 60)}
                                                      </a>
                                                    </div>
                                                  ))}
                                                  {entry.citations.length > 5 && (
                                                    <div className="text-xs text-slate-500">
                                                      +{entry.citations.length - 5} more citations
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}

                                            {/* Model breakdown */}
                                            <div>
                                              <div className="text-xs text-slate-500 uppercase mb-1">By Model ({entry.models_scanned})</div>
                                              <div className="flex flex-wrap gap-1">
                                                {entry.details?.map((d, idx) => (
                                                  <Badge 
                                                    key={idx} 
                                                    variant="outline" 
                                                    className={`text-xs rounded-none ${
                                                      d.brand_in_citations ? 'bg-green-50 border-green-300' :
                                                      d.brand_mentioned ? 'bg-amber-50 border-amber-300' :
                                                      'bg-red-50 border-red-200'
                                                    }`}
                                                  >
                                                    {d.model.replace(/-/g, ' ')}
                                                    {d.brand_in_citations && <Link2 className="h-3 w-3 ml-1" />}
                                                    {d.brand_mentioned && !d.brand_in_citations && <Quote className="h-3 w-3 ml-1" />}
                                                  </Badge>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-slate-500">No history available</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show scan results summary */}
              {relatedData.scans && relatedData.scans.length > 0 && !relatedData.gaps && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Radar className="h-4 w-4 text-[#0EA5E9]" />
                    <span className="font-semibold text-sm text-[#0F172A]">
                      Scan Results ({relatedData.scans.length})
                    </span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {relatedData.scans.slice(0, 15).map((s, i) => (
                      <div 
                        key={i}
                        className="p-3 bg-slate-50 border-l-2 flex items-start gap-3"
                        style={{ borderLeftColor: s.brand_mentioned ? '#10B981' : '#EF4444' }}
                      >
                        {s.brand_mentioned ? (
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="text-sm text-[#0F172A]">"{s.query_text}"</p>
                          <Badge variant="outline" className="text-xs rounded-none mt-1">
                            {s.model}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Show memo content preview */}
              {relatedData.memo && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-[#8B5CF6]" />
                    <span className="font-semibold text-sm text-[#0F172A]">
                      Memo Preview
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 border-l-2 border-[#8B5CF6]">
                    <h4 className="font-semibold text-[#0F172A] mb-2">{relatedData.memo.title}</h4>
                    <p className="text-sm text-slate-600 line-clamp-4">
                      {relatedData.memo.content_markdown.slice(0, 500)}...
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with action */}
        {activity.link_url && (
          <div className="border-t-[3px] border-[#0F172A] pt-4 flex justify-end">
            <Button asChild className="rounded-none bg-[#0EA5E9] hover:bg-[#0284C7]">
              <Link href={activity.link_url} onClick={onClose}>
                {activity.link_label || 'View Details'}
                {activity.link_url.startsWith('http') ? (
                  <ExternalLink className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronRight className="ml-2 h-4 w-4" />
                )}
              </Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
