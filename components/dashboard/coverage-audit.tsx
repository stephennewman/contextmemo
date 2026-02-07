'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  RefreshCw,
  FileText,
  Sparkles,
  ArrowRight,
  Target,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  MinusCircle,
  ExternalLink,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import { TopicUniverse, CoverageScore, TopicCategory } from '@/lib/supabase/types'
import { CoverageProgressModal } from './coverage-progress-modal'
import { MemoBatchProgressModal } from './memo-batch-progress-modal'

// ============================================================================
// Types
// ============================================================================

interface CoverageAuditProps {
  brandId: string
  brandName: string
  brandDomain: string
  initialTopics: TopicUniverse[]
  initialScore: CoverageScore | null
  hasTopics: boolean
}

type FilterStatus = 'all' | 'gap' | 'partial' | 'covered'
type SortBy = 'priority' | 'category' | 'status' | 'memo_type'

// ============================================================================
// Category display config
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
  gap: { label: 'Gap', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertCircle },
  partial: { label: 'Partial', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: MinusCircle },
  covered: { label: 'Covered', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
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
}: CoverageAuditProps) {
  const router = useRouter()
  const [topics, setTopics] = useState<TopicUniverse[]>(initialTopics)
  const [score, setScore] = useState<CoverageScore | null>(initialScore)
  const [generating, setGenerating] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [sortBy, setSortBy] = useState<SortBy>('priority')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)

  // ============================================================================
  // Derived data
  // ============================================================================

  const filteredTopics = useMemo(() => {
    let filtered = [...topics]
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus)
    }

    switch (sortBy) {
      case 'priority':
        filtered.sort((a, b) => b.priority_score - a.priority_score)
        break
      case 'category':
        filtered.sort((a, b) => a.category.localeCompare(b.category))
        break
      case 'status':
        const statusOrder = { gap: 0, partial: 1, covered: 2 }
        filtered.sort((a, b) => 
          (statusOrder[a.status as keyof typeof statusOrder] ?? 3) - 
          (statusOrder[b.status as keyof typeof statusOrder] ?? 3)
        )
        break
      case 'memo_type':
        filtered.sort((a, b) => (a.content_type || '').localeCompare(b.content_type || ''))
        break
    }

    return filtered
  }, [topics, filterStatus, sortBy])

  const topGaps = useMemo(() => {
    return topics
      .filter(t => t.status === 'gap')
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, 10)
  }, [topics])

  // ============================================================================
  // Actions
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
        // Update local state
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

  const handleBatchModalClose = (completedCount: number) => {
    setShowBatchModal(false)
    if (completedCount > 0) {
      // Mark topics as partial in local state
      const gapIds = new Set(topGaps.map(t => t.id))
      setTopics(prev => prev.map(t =>
        gapIds.has(t.id) ? { ...t, status: 'partial' as const } : t
      ))
    }
  }

  // ============================================================================
  // Empty state: no topics generated yet
  // ============================================================================

  if (!hasTopics) {
    return (
      <div className="space-y-6">
        <Card className="border-[#1E293B] bg-[#0F172A]">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center mb-6">
              <Target className="h-8 w-8 text-[#0EA5E9]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Content Coverage Audit</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              Map every content topic {brandName} needs for AI visibility. 
              We&apos;ll crawl your website, identify what you have, and show exactly what&apos;s missing.
            </p>
            <div className="flex flex-col items-center gap-3">
              <Button
                onClick={() => setShowModal(true)}
                className="gap-2 bg-[#0EA5E9] hover:bg-[#0284C7] text-white rounded-none px-6 py-3"
              >
                <Sparkles className="h-4 w-4" />
                Run Coverage Audit
              </Button>
              <p className="text-xs text-gray-500">Crawls your sitemap, maps topics, and scores your coverage.</p>
            </div>
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
  // Main view: topics exist
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Coverage Score Header */}
      {score && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Main score */}
          <Card className="border-[#1E293B] bg-[#0F172A] md:col-span-1">
            <CardContent className="py-6 text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#1E293B" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={score.coverage_percent >= 70 ? '#10B981' : score.coverage_percent >= 40 ? '#F59E0B' : '#EF4444'}
                    strokeWidth="8"
                    strokeDasharray={`${score.coverage_percent * 2.51} 251`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-2xl font-bold text-white">{score.coverage_percent}%</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">Content Coverage</p>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="border-[#1E293B] bg-[#0F172A]">
            <CardContent className="py-6 text-center">
              <p className="text-3xl font-bold text-emerald-400">{score.covered}</p>
              <p className="text-sm text-gray-400">Covered</p>
            </CardContent>
          </Card>
          <Card className="border-[#1E293B] bg-[#0F172A]">
            <CardContent className="py-6 text-center">
              <p className="text-3xl font-bold text-red-400">{score.gaps}</p>
              <p className="text-sm text-gray-400">Gaps</p>
            </CardContent>
          </Card>
          <Card className="border-[#1E293B] bg-[#0F172A]">
            <CardContent className="py-6 text-center">
              <p className="text-3xl font-bold text-white">{score.total_topics}</p>
              <p className="text-sm text-gray-400">Total Topics</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Breakdown */}
      {score && (
        <Card className="border-[#1E293B] bg-[#0F172A]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#0EA5E9]" />
                Coverage by Category
              </CardTitle>
              <Button
                onClick={() => setShowModal(true)}
                size="sm"
                variant="outline"
                className="gap-1 text-xs border-[#1E293B] text-gray-400 hover:text-white rounded-none"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {(Object.entries(CATEGORY_META) as [TopicCategory, typeof CATEGORY_META[TopicCategory]][]).map(([key, meta]) => {
                const cat = score.by_category[key]
                if (!cat || cat.total === 0) return null
                const pct = Math.round((cat.covered / cat.total) * 100)
                return (
                  <button
                    key={key}
                    onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                    className="text-left p-3 rounded border border-[#1E293B] hover:border-[#334155] transition-colors"
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-sm">{meta.icon}</span>
                      <span className="text-xs font-medium text-gray-400">{meta.label}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-white">{cat.covered}</span>
                      <span className="text-xs text-gray-500">/ {cat.total}</span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="w-full h-1 bg-[#1E293B] rounded-full mt-2">
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
          </CardContent>
        </Card>
      )}

      {/* Full Topic List */}
      <Card className="border-[#1E293B] bg-[#0F172A]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#0EA5E9]" />
                All Topics ({filteredTopics.length})
              </CardTitle>
              {topGaps.length > 0 && (
                <Button
                  onClick={() => setShowBatchModal(true)}
                  size="sm"
                  className="gap-1 text-xs bg-amber-500 hover:bg-amber-600 text-black rounded-none"
                >
                  <Sparkles className="h-3 w-3" />
                  Generate Top {Math.min(topGaps.length, 10)} Gaps
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Status filter */}
              <div className="flex items-center gap-1">
                <Filter className="h-3 w-3 text-gray-500" />
                {(['all', 'gap', 'partial', 'covered'] as FilterStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-2 py-1 text-[10px] font-medium rounded-none border transition-colors ${
                      filterStatus === status
                        ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                        : 'text-gray-400 border-[#1E293B] hover:border-[#334155]'
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
              {/* Sort */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className="bg-[#0F172A] border border-[#1E293B] text-gray-400 text-[10px] rounded-none px-2 py-1"
              >
                <option value="priority">Priority</option>
                <option value="category">Category</option>
                <option value="status">Status</option>
                <option value="memo_type">Memo Type</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {filteredTopics.map(topic => {
              const statusConfig = STATUS_CONFIG[topic.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.gap
              const StatusIcon = statusConfig.icon
              return (
                <div
                  key={topic.id}
                  className="flex items-center gap-3 p-2.5 rounded border border-transparent hover:border-[#1E293B] group transition-colors"
                >
                  <StatusIcon className={`h-4 w-4 shrink-0 ${
                    topic.status === 'covered' ? 'text-emerald-400' : 
                    topic.status === 'partial' ? 'text-amber-400' : 'text-red-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white truncate">{topic.title}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px] border-[#1E293B] text-gray-500 rounded-none">
                        {CATEGORY_META[topic.category as TopicCategory]?.label || topic.category}
                      </Badge>
                      {topic.target_persona && (
                        <span className="text-[10px] text-gray-500">{topic.target_persona}</span>
                      )}
                      {topic.funnel_stage && (
                        <Badge variant="outline" className="text-[10px] border-[#1E293B] text-gray-600 rounded-none">
                          {topic.funnel_stage?.replace('_', ' ')}
                        </Badge>
                      )}
                      {topic.matched_page_url && (
                        <span className="text-[10px] text-emerald-500 flex items-center gap-0.5">
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
                        className="gap-1 text-xs text-[#0EA5E9] border-[#0EA5E9]/30 hover:bg-[#0EA5E9]/10 hover:text-white rounded-none"
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
                  </div>
                </div>
              )
            })}
            {filteredTopics.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">
                No topics match the current filter.
              </p>
            )}
          </div>
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
