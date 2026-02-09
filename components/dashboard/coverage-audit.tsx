'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Target,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  MinusCircle,
  ExternalLink,
  Filter,
  Clock,
  XCircle,
  EyeOff,
  X,
  Lightbulb,
  Zap,
  FileText,
  CheckCircle,
  Newspaper,
} from 'lucide-react'
import { toast } from 'sonner'
import { TopicUniverse, CoverageScore, TopicCategory } from '@/lib/supabase/types'
import { CoverageProgressModal } from './coverage-progress-modal'
import { MemoBatchProgressModal } from './memo-batch-progress-modal'

// ============================================================================
// Types
// ============================================================================

interface Competitor {
  id: string
  name: string
  domain: string | null
}

interface CompetitorContent {
  id: string
  competitor_id: string
  url: string
  title: string
  content_summary: string | null
  topics: string[] | null
  content_type: string | null
  is_competitor_specific: boolean
  universal_topic: string | null
  status: string
  first_seen_at: string
  published_at?: string | null
  word_count?: number | null
  author?: string | null
  response_memo_id: string | null
  competitor?: Competitor
  response_memo?: {
    id: string
    title: string
    slug: string
    status: string
  }
}

interface CoverageAuditProps {
  brandId: string
  brandName: string
  brandDomain: string
  initialTopics: TopicUniverse[]
  initialScore: CoverageScore | null
  hasTopics: boolean
  // Competitor content props
  competitorContent: CompetitorContent[]
  competitors: Competitor[]
}

type ContentSection = 'gaps' | 'competitor'
type FilterStatus = 'all' | 'gap' | 'partial' | 'covered'
type SortBy = 'priority' | 'category' | 'status' | 'memo_type'

// ============================================================================
// Config
// ============================================================================

const CATEGORY_META: Record<TopicCategory, { label: string; icon: string; color: string }> = {
  comparisons: { label: 'Comparisons', icon: '⚔️', color: '#EF4444' },
  alternatives: { label: 'Alternatives', icon: '🔄', color: '#F97316' },
  how_tos: { label: 'How-to Guides', icon: '📝', color: '#0EA5E9' },
  industry_guides: { label: 'Industry Guides', icon: '🏭', color: '#8B5CF6' },
  definitions: { label: 'Definitions', icon: '📖', color: '#10B981' },
  use_cases: { label: 'Use Cases', icon: '💡', color: '#F59E0B' },
}

const STATUS_CONFIG = {
  gap: { label: 'Gap', icon: AlertCircle },
  partial: { label: 'Partial', icon: MinusCircle },
  covered: { label: 'Covered', icon: CheckCircle2 },
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  educational: 'Educational',
  industry: 'Industry Analysis',
  thought_leadership: 'Thought Leadership',
  press_release: 'Press Release',
  feature_announcement: 'Feature Update',
  company_news: 'Company News',
  case_study: 'Case Study',
  promotional: 'Promotional',
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Just now'
  if (diffHours === 1) return '1 hour ago'
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

// ============================================================================
// Component
// ============================================================================

export function CoverageAudit({
  brandId,
  brandName,
  brandDomain,
  initialTopics,
  initialScore,
  hasTopics,
  competitorContent,
  competitors,
}: CoverageAuditProps) {
  // Coverage state
  const [topics, setTopics] = useState<TopicUniverse[]>(initialTopics)
  const [score, setScore] = useState<CoverageScore | null>(initialScore)
  const [generating, setGenerating] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortBy, setSortBy] = useState<SortBy>('priority')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [excludedTopicIds, setExcludedTopicIds] = useState<Set<string>>(new Set())

  // Competitor content state
  const [generatingResponseId, setGeneratingResponseId] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [excludedCompetitors, setExcludedCompetitors] = useState<Set<string>>(new Set())
  const [excludedContentTypes, setExcludedContentTypes] = useState<Set<string>>(new Set())
  const [hiddenContentIds, setHiddenContentIds] = useState<Set<string>>(new Set())

  // Section toggle
  const [activeSection, setActiveSection] = useState<ContentSection>('gaps')

  const competitorLookup = new Map(competitors.map(c => [c.id, c]))

  // ============================================================================
  // Derived data - Coverage gaps
  // ============================================================================

  const filteredTopics = useMemo(() => {
    let filtered = topics.filter(t => !excludedTopicIds.has(t.id))
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus)
    }
    switch (sortBy) {
      case 'priority':
        filtered.sort((a, b) => b.priority_score - a.priority_score)
        break
      case 'category':
        filtered.sort((a, b) => (a.category || '').localeCompare(b.category || ''))
        break
      case 'status': {
        const statusOrder = { gap: 0, partial: 1, covered: 2 }
        filtered.sort((a, b) =>
          (statusOrder[a.status as keyof typeof statusOrder] ?? 3) -
          (statusOrder[b.status as keyof typeof statusOrder] ?? 3)
        )
        break
      }
      case 'memo_type':
        filtered.sort((a, b) => (a.content_type || '').localeCompare(b.content_type || ''))
        break
    }
    return filtered
  }, [topics, filterStatus, sortBy, excludedTopicIds])

  const topGaps = useMemo(() => {
    return topics
      .filter(t => t.status === 'gap' && !excludedTopicIds.has(t.id))
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 10)
  }, [topics, excludedTopicIds])

  // ============================================================================
  // Derived data - Competitor content
  // ============================================================================

  const filteredCompetitorContent = useMemo(() => {
    return competitorContent
      .filter(item => {
        if (hiddenContentIds.has(item.id)) return false
        if (excludedCompetitors.has(item.competitor_id)) return false
        if (item.content_type && excludedContentTypes.has(item.content_type)) return false
        // Hide already-responded items from the main view
        if (item.status === 'responded') return false
        return true
      })
      .sort((a, b) => {
        const dateA = new Date(a.published_at || a.first_seen_at).getTime()
        const dateB = new Date(b.published_at || b.first_seen_at).getTime()
        return dateB - dateA
      })
  }, [competitorContent, hiddenContentIds, excludedCompetitors, excludedContentTypes])

  const hasExclusions = excludedCompetitors.size > 0 || excludedContentTypes.size > 0 || hiddenContentIds.size > 0 || excludedTopicIds.size > 0

  // Stats
  const gapCount = topics.filter(t => t.status === 'gap' && !excludedTopicIds.has(t.id)).length
  const respondableCount = filteredCompetitorContent.filter(
    item => !item.is_competitor_specific && !!item.universal_topic && item.status !== 'responded'
  ).length

  // ============================================================================
  // Actions - Coverage
  // ============================================================================

  const generateMemoForTopic = async (topicId: string) => {
    setGenerating(prev => new Set(prev).add(topicId))
    try {
      const res = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_generate_memos',
          topicIds: [topicId],
          limit: 1,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Memo generation started')
        setTopics(prev => prev.map(t =>
          t.id === topicId ? { ...t, status: 'partial' as const } : t
        ))
      } else {
        toast.error(data.error || 'Failed to generate')
      }
    } catch {
      toast.error('Failed to generate memo')
    } finally {
      setGenerating(prev => {
        const next = new Set(prev)
        next.delete(topicId)
        return next
      })
    }
  }

  const excludeTopic = (topicId: string) => {
    setExcludedTopicIds(prev => new Set([...prev, topicId]))
    toast.success('Topic excluded')
  }

  const handleBatchModalClose = (completedCount: number) => {
    setShowBatchModal(false)
    if (completedCount > 0) {
      const gapIds = new Set(topGaps.map(t => t.id))
      setTopics(prev => prev.map(t =>
        gapIds.has(t.id) ? { ...t, status: 'partial' as const } : t
      ))
    }
  }

  // ============================================================================
  // Actions - Competitor content
  // ============================================================================

  const handleScan = async () => {
    setScanning(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'content-scan' }),
      })
      if (!response.ok) throw new Error('Failed to trigger scan')
      toast.success('Content scan started', {
        description: 'Checking competitor feeds for new content...',
      })
    } catch {
      toast.error('Failed to start scan')
    } finally {
      setScanning(false)
    }
  }

  const handleGenerateResponse = async (contentId: string) => {
    setGeneratingResponseId(contentId)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-response',
          contentId,
        }),
      })
      if (!response.ok) throw new Error('Failed to trigger response generation')
      toast.success('Response memo generation started')
    } catch {
      toast.error('Failed to start response generation')
    } finally {
      setGeneratingResponseId(null)
    }
  }

  const handleSkipContent = async (contentId: string) => {
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'skip-content',
          contentId,
        }),
      })
      if (!response.ok) throw new Error('Failed to skip content')
      setHiddenContentIds(prev => new Set([...prev, contentId]))
      toast.success('Content excluded')
    } catch {
      toast.error('Failed to skip content')
    }
  }

  const clearAllExclusions = () => {
    setExcludedTopicIds(new Set())
    setExcludedCompetitors(new Set())
    setExcludedContentTypes(new Set())
    setHiddenContentIds(new Set())
  }

  // ============================================================================
  // Empty state: no topics and no competitor content
  // ============================================================================

  if (!hasTopics && competitorContent.length === 0) {
    return (
      <div>
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center mb-6">
              <Target className="h-8 w-8 text-[#0EA5E9]" />
            </div>
            <h3 className="text-xl font-bold mb-2">Content Hub</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Map content gaps and monitor competitor activity.
              Run a coverage audit to identify what {brandName} needs for AI visibility.
            </p>
            <Button
              onClick={() => setShowModal(true)}
              className="gap-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-none px-6 py-3"
            >
              <Sparkles className="h-4 w-4" />
              Run Coverage Audit
            </Button>
          </CardContent>
        </Card>
        <CoverageProgressModal
          brandId={brandId}
          brandName={brandName}
          brandDomain={brandDomain}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      </div>
    )
  }

  // ============================================================================
  // Main view
  // ============================================================================

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Content</CardTitle>
              <CardDescription>
                {gapCount} gaps to fill · {respondableCount} competitor opportunities · {competitors.length} competitors monitored
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {activeSection === 'gaps' && topGaps.length > 0 && (
                <Button
                  onClick={() => setShowBatchModal(true)}
                  size="sm"
                  className="gap-1 text-xs bg-amber-500 hover:bg-amber-600 text-black rounded-none"
                >
                  <Sparkles className="h-3 w-3" />
                  Generate Top {Math.min(topGaps.length, 10)} Gaps
                </Button>
              )}
              {activeSection === 'gaps' && (
                <Button onClick={() => setShowModal(true)} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Audit
                </Button>
              )}
              {activeSection === 'competitor' && (
                <Button onClick={handleScan} variant="outline" size="sm" disabled={scanning}>
                  {scanning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                  Check Feeds
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Section Toggle */}
          <div className="flex items-center gap-1 mb-4">
            <Button
              variant={activeSection === 'gaps' ? 'default' : 'ghost'}
              size="sm"
              className={`text-xs h-8 rounded-none ${activeSection === 'gaps' ? 'bg-[#0EA5E9] hover:bg-[#0284C7]' : 'text-muted-foreground'}`}
              onClick={() => setActiveSection('gaps')}
            >
              <AlertCircle className="h-3 w-3 mr-1" />
              Content Gaps ({gapCount})
            </Button>
            <Button
              variant={activeSection === 'competitor' ? 'default' : 'ghost'}
              size="sm"
              className={`text-xs h-8 rounded-none ${activeSection === 'competitor' ? 'bg-[#0EA5E9] hover:bg-[#0284C7]' : 'text-muted-foreground'}`}
              onClick={() => setActiveSection('competitor')}
            >
              <Newspaper className="h-3 w-3 mr-1" />
              Competitor Activity ({filteredCompetitorContent.length})
            </Button>
          </div>

          {/* Exclusions bar */}
          {hasExclusions && (
            <div className="flex items-center gap-2 flex-wrap text-sm mb-4 p-2 bg-muted/50 rounded">
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Hidden:</span>
              {excludedTopicIds.size > 0 && (
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-destructive/10 gap-1 text-[10px]"
                  onClick={() => setExcludedTopicIds(new Set())}
                >
                  {excludedTopicIds.size} topic{excludedTopicIds.size !== 1 ? 's' : ''}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              )}
              {Array.from(excludedCompetitors).map(compId => {
                const comp = competitorLookup.get(compId)
                return (
                  <Badge
                    key={`exc-comp-${compId}`}
                    variant="outline"
                    className="cursor-pointer hover:bg-destructive/10 gap-1 text-[10px]"
                    onClick={() => {
                      const next = new Set(excludedCompetitors)
                      next.delete(compId)
                      setExcludedCompetitors(next)
                    }}
                  >
                    {comp?.name || 'Unknown'}
                    <X className="h-2.5 w-2.5" />
                  </Badge>
                )
              })}
              {Array.from(excludedContentTypes).map(ct => (
                <Badge
                  key={`exc-ct-${ct}`}
                  variant="outline"
                  className="cursor-pointer hover:bg-destructive/10 gap-1 text-[10px]"
                  onClick={() => {
                    const next = new Set(excludedContentTypes)
                    next.delete(ct)
                    setExcludedContentTypes(next)
                  }}
                >
                  {CONTENT_TYPE_LABELS[ct] || ct}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              ))}
              {hiddenContentIds.size > 0 && (
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-destructive/10 gap-1 text-[10px]"
                  onClick={() => setHiddenContentIds(new Set())}
                >
                  {hiddenContentIds.size} post{hiddenContentIds.size !== 1 ? 's' : ''}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-muted-foreground"
                onClick={clearAllExclusions}
              >
                Clear all
              </Button>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION: Content Gaps */}
          {/* ============================================================ */}
          {activeSection === 'gaps' && (
            <>
              {/* Category Breakdown */}
              {score && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-[#0EA5E9]" />
                    <span className="text-sm font-bold text-gray-900">Coverage by Category</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {(Object.entries(CATEGORY_META) as [TopicCategory, typeof CATEGORY_META[TopicCategory]][]).map(([key, meta]) => {
                      const cat = score.by_category[key]
                      if (!cat || cat.total === 0) return null
                      const pct = Math.round((cat.covered / cat.total) * 100)
                      return (
                        <button
                          key={key}
                          onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                          className="text-left p-3 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="text-sm">{meta.icon}</span>
                            <span className="text-xs font-medium text-gray-500">{meta.label}</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold text-gray-900">{cat.covered}</span>
                            <span className="text-xs text-gray-400">/ {cat.total}</span>
                          </div>
                          <div className="w-full h-1 bg-gray-100 rounded-full mt-2">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: pct >= 70 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444',
                              }}
                            />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {score && <div className="border-t border-gray-200 mb-4" />}

              {/* Filters & Sort */}
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-1">
                  <Filter className="h-3 w-3 text-gray-400" />
                  {(['all', 'gap', 'partial', 'covered'] as FilterStatus[]).map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-2 py-1 text-[10px] font-medium rounded-none border transition-colors ${
                        filterStatus === status
                          ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                          : 'text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {status === 'all' ? 'All' : STATUS_CONFIG[status].label}
                      {status !== 'all' && score && (
                        <span className="ml-1">
                          ({status === 'gap' ? score.gaps : status === 'partial' ? score.partial : score.covered})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortBy)}
                  className="bg-white border border-gray-200 text-gray-600 text-[10px] rounded-none px-2 py-1"
                >
                  <option value="priority">Priority</option>
                  <option value="category">Category</option>
                  <option value="status">Status</option>
                  <option value="memo_type">Memo Type</option>
                </select>
              </div>

              {/* Topic List */}
              <div className="space-y-1">
                {filteredTopics.map(topic => {
                  const statusConfig = STATUS_CONFIG[topic.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.gap
                  const StatusIcon = statusConfig.icon
                  return (
                    <div
                      key={topic.id}
                      className="flex items-center gap-3 p-2.5 rounded border border-transparent hover:border-gray-200 group transition-colors"
                    >
                      <StatusIcon className={`h-4 w-4 shrink-0 ${
                        topic.status === 'covered' ? 'text-emerald-500' :
                        topic.status === 'partial' ? 'text-amber-500' : 'text-red-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-900 truncate">{topic.title}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] border-gray-200 text-gray-500 rounded-none">
                            {CATEGORY_META[topic.category as TopicCategory]?.label || topic.category}
                          </Badge>
                          {topic.target_persona && (
                            <span className="text-[10px] text-gray-500">{topic.target_persona}</span>
                          )}
                          {topic.funnel_stage && (
                            <Badge variant="outline" className="text-[10px] border-gray-200 text-gray-500 rounded-none">
                              {topic.funnel_stage?.replace('_', ' ')}
                            </Badge>
                          )}
                          {topic.matched_page_url && (
                            <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                              <ExternalLink className="h-3 w-3" />
                              {topic.matched_page_url}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className="text-[10px] rounded-none border"
                          style={{
                            backgroundColor: topic.priority_score >= 80 ? 'rgba(239,68,68,0.1)' : topic.priority_score >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(107,114,128,0.1)',
                            color: topic.priority_score >= 80 ? '#EF4444' : topic.priority_score >= 60 ? '#F59E0B' : '#6B7280',
                            borderColor: topic.priority_score >= 80 ? 'rgba(239,68,68,0.2)' : topic.priority_score >= 60 ? 'rgba(245,158,11,0.2)' : 'rgba(107,114,128,0.2)',
                          }}
                        >
                          {topic.priority_score}
                        </Badge>
                        {topic.status === 'gap' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-xs text-[#0EA5E9] border-[#0EA5E9]/30 hover:bg-[#0EA5E9]/10 rounded-none"
                            onClick={() => generateMemoForTopic(topic.id)}
                            disabled={generating.has(topic.id)}
                          >
                            {generating.has(topic.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <ArrowRight className="h-3 w-3" />
                            )}
                            Generate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                          onClick={() => excludeTopic(topic.id)}
                          title="Exclude this topic"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {filteredTopics.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">
                      {hasTopics ? 'No topics match the current filter.' : 'Run a coverage audit to discover content gaps.'}
                    </p>
                    {!hasTopics && (
                      <Button
                        onClick={() => setShowModal(true)}
                        variant="outline"
                        size="sm"
                        className="mt-3"
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Run Coverage Audit
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ============================================================ */}
          {/* SECTION: Competitor Activity */}
          {/* ============================================================ */}
          {activeSection === 'competitor' && (
            <>
              {filteredCompetitorContent.length > 0 ? (
                <div className="space-y-2">
                  {filteredCompetitorContent.slice(0, 30).map(item => {
                    const competitor = competitorLookup.get(item.competitor_id) || item.competitor
                    const canRespond = !item.is_competitor_specific &&
                      !!item.universal_topic &&
                      !['responded', 'pending_response'].includes(item.status)
                    const isGenerating = generatingResponseId === item.id || item.status === 'pending_response'

                    return (
                      <div
                        key={item.id}
                        className={`p-3 border rounded-lg transition-all ${
                          canRespond ? 'border-[#0EA5E9]/20 bg-blue-50/30' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            {/* Badges row */}
                            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                              <Badge
                                variant="outline"
                                className="text-[10px] font-medium cursor-pointer hover:bg-destructive/10 hover:line-through"
                                onClick={() => {
                                  setExcludedCompetitors(prev => new Set([...prev, item.competitor_id]))
                                  toast.success(`Hiding ${competitor?.name || 'competitor'}`)
                                }}
                                title={`Exclude all ${competitor?.name} posts`}
                              >
                                {competitor?.name || 'Unknown'}
                              </Badge>
                              {item.content_type && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] cursor-pointer hover:bg-destructive/10 hover:line-through"
                                  onClick={() => {
                                    setExcludedContentTypes(prev => new Set([...prev, item.content_type!]))
                                    toast.success(`Hiding "${CONTENT_TYPE_LABELS[item.content_type!] || item.content_type}"`)
                                  }}
                                  title={`Exclude all "${CONTENT_TYPE_LABELS[item.content_type] || item.content_type}" content`}
                                >
                                  {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}
                                </Badge>
                              )}
                              {canRespond && (
                                <Badge className="text-[10px] bg-emerald-500/90 text-white">
                                  <Lightbulb className="h-3 w-3 mr-0.5" />
                                  Memo Candidate
                                </Badge>
                              )}
                              {isGenerating && item.status === 'pending_response' && (
                                <Badge className="text-[10px] bg-amber-500 text-white">
                                  <Loader2 className="h-3 w-3 mr-0.5 animate-spin" />
                                  Generating...
                                </Badge>
                              )}
                            </div>

                            {/* Title */}
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-sm hover:text-[#0EA5E9] inline-flex items-center gap-1.5"
                            >
                              {item.title}
                              <ExternalLink className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                            </a>

                            {item.content_summary && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.content_summary}</p>
                            )}

                            {item.universal_topic && canRespond && (
                              <div className="mt-1.5 flex items-center gap-1 text-xs">
                                <Sparkles className="h-3 w-3 text-[#0EA5E9]" />
                                <span className="text-[#0EA5E9] font-medium">
                                  Opportunity: &ldquo;{item.universal_topic}&rdquo;
                                </span>
                              </div>
                            )}

                            {/* Meta */}
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1.5">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getRelativeTime(item.published_at || item.first_seen_at)}
                              </span>
                              {item.word_count && <span>{item.word_count.toLocaleString()} words</span>}
                              {item.author && <span>by {item.author}</span>}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="shrink-0 flex flex-col gap-1.5">
                            {canRespond && (
                              <Button
                                size="sm"
                                onClick={() => handleGenerateResponse(item.id)}
                                disabled={isGenerating}
                                className="bg-[#0EA5E9] hover:bg-[#0284C7] text-xs rounded-none"
                              >
                                {isGenerating ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                ) : (
                                  <Zap className="h-3.5 w-3.5 mr-1" />
                                )}
                                Generate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSkipContent(item.id)}
                              className="text-muted-foreground text-xs"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Exclude
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Newspaper className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-sm font-medium mb-1">No competitor content to show</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {competitors.length === 0
                      ? 'Add competitors from the Entities tab to start monitoring.'
                      : 'Run a feed check to discover new content.'}
                  </p>
                  {competitors.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleScan} disabled={scanning}>
                      {scanning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                      Check Feeds Now
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <CoverageProgressModal
        brandId={brandId}
        brandName={brandName}
        brandDomain={brandDomain}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />

      {showBatchModal && (
        <MemoBatchProgressModal
          brandId={brandId}
          brandName={brandName}
          topics={topGaps}
          isOpen={showBatchModal}
          onClose={handleBatchModalClose}
        />
      )}
    </div>
  )
}
