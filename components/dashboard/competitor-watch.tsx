'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Eye, 
  ExternalLink, 
  FileText, 
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Calendar,
  ArrowRight,
  Newspaper,
  TrendingUp,
  Zap,
  Filter,
  Bell,
  X,
  EyeOff,
  Lightbulb,
} from 'lucide-react'
import { toast } from 'sonner'

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

interface CompetitorWatchProps {
  brandId: string
  content: CompetitorContent[]
  competitors: Competitor[]
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

// Helper to check if a date is within a certain number of hours
function isWithinHours(dateStr: string | null | undefined, hours: number): boolean {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours <= hours && diffHours >= 0
}

// Get relative time string
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

export function CompetitorWatch({ 
  brandId, 
  content, 
  competitors,
}: CompetitorWatchProps) {
  const [scanning, setScanning] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'respondable' | 'today' | 'yesterday'>('today')
  const [excludedCompetitors, setExcludedCompetitors] = useState<Set<string>>(new Set())
  const [excludedContentTypes, setExcludedContentTypes] = useState<Set<string>>(new Set())
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  const competitorLookup = new Map(competitors.map(c => [c.id, c]))

  // Filter content based on published_at or first_seen_at
  const getDateForContent = (item: CompetitorContent) => item.published_at || item.first_seen_at

  // Get "yesterday" as a date range (the 24h period before today)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)

  // Filter content (exclusions + view filter)
  const filteredContent = content.filter(item => {
    // Apply exclusions
    if (hiddenIds.has(item.id)) return false
    if (excludedCompetitors.has(item.competitor_id)) return false
    if (item.content_type && excludedContentTypes.has(item.content_type)) return false

    const itemDate = new Date(getDateForContent(item))
    
    switch (filter) {
      case 'today':
        return itemDate >= todayStart
      case 'yesterday':
        return itemDate >= yesterdayStart && itemDate < todayStart
      case 'respondable':
        return !item.is_competitor_specific && 
               !!item.universal_topic &&
               item.status !== 'responded'
      case 'all':
      default:
        return true
    }
  }).sort((a, b) => new Date(getDateForContent(b)).getTime() - new Date(getDateForContent(a)).getTime())

  const hasExclusions = excludedCompetitors.size > 0 || excludedContentTypes.size > 0 || hiddenIds.size > 0

  // Stats
  const todayContent = content.filter(item => new Date(getDateForContent(item)) >= todayStart)
  const yesterdayContent = content.filter(item => {
    const d = new Date(getDateForContent(item))
    return d >= yesterdayStart && d < todayStart
  })
  const respondableContent = content.filter(item => 
    !item.is_competitor_specific && 
    !!item.universal_topic &&
    item.status !== 'responded'
  )

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
    } catch (error) {
      toast.error('Failed to start scan')
    } finally {
      setScanning(false)
    }
  }

  const handleGenerateResponse = async (contentId: string) => {
    setGeneratingId(contentId)
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

      toast.success('Response generation started', {
        description: 'Creating differentiated content based on this topic...',
      })
    } catch (error) {
      toast.error('Failed to start response generation')
    } finally {
      setGeneratingId(null)
    }
  }

  const handleSkip = async (contentId: string) => {
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

      toast.success('Content skipped')
    } catch (error) {
      toast.error('Failed to skip content')
    }
  }

  if (competitors.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-lg font-semibold mb-2">No Competitors to Watch</h3>
          <p className="text-muted-foreground mb-4">
            Add competitors to start monitoring their content
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Watch</CardTitle>
            <CardDescription>
              Monitoring {competitors.length} competitor{competitors.length !== 1 ? 's' : ''} · {todayContent.length} new today
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleScan}
            disabled={scanning}
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            Check Now
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {(['today', 'yesterday', 'respondable', 'all'] as const).map((f) => {
                const labels: Record<string, string> = {
                  today: `Today (${todayContent.length})`,
                  yesterday: `Yesterday (${yesterdayContent.length})`,
                  respondable: `Memo Opportunities (${respondableContent.length})`,
                  all: 'All',
                }
                return (
                  <Button
                    key={f}
                    variant={filter === f ? 'default' : 'ghost'}
                    size="sm"
                    className={`text-xs h-7 ${filter === f ? '' : 'text-muted-foreground'}`}
                    onClick={() => setFilter(f)}
                  >
                    {labels[f]}
                  </Button>
                )
              })}
            </div>
          </div>

          {hasExclusions && (
            <div className="flex items-center gap-2 flex-wrap text-sm">
              <EyeOff className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Hidden:</span>
              {Array.from(excludedCompetitors).map(compId => {
                const comp = competitorLookup.get(compId)
                return (
                  <Badge 
                    key={`exc-comp-${compId}`} 
                    variant="outline" 
                    className="cursor-pointer hover:bg-destructive/10 gap-1"
                    onClick={() => {
                      const next = new Set(excludedCompetitors)
                      next.delete(compId)
                      setExcludedCompetitors(next)
                    }}
                  >
                    {comp?.name || 'Unknown'}
                    <X className="h-3 w-3" />
                  </Badge>
                )
              })}
              {Array.from(excludedContentTypes).map(ct => (
                <Badge 
                  key={`exc-ct-${ct}`} 
                  variant="outline" 
                  className="cursor-pointer hover:bg-destructive/10 gap-1"
                  onClick={() => {
                    const next = new Set(excludedContentTypes)
                    next.delete(ct)
                    setExcludedContentTypes(next)
                  }}
                >
                  {CONTENT_TYPE_LABELS[ct] || ct}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              {hiddenIds.size > 0 && (
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-destructive/10 gap-1"
                  onClick={() => setHiddenIds(new Set())}
                >
                  {hiddenIds.size} hidden post{hiddenIds.size !== 1 ? 's' : ''}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => {
                  setExcludedCompetitors(new Set())
                  setExcludedContentTypes(new Set())
                  setHiddenIds(new Set())
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Content List */}
        {filteredContent.length > 0 ? (
          <div className="space-y-3">
            {filteredContent.slice(0, 30).map((item) => {
                const competitor = competitorLookup.get(item.competitor_id) || item.competitor
                const canRespond = !item.is_competitor_specific && 
                  !!item.universal_topic &&
                  !['responded', 'pending_response'].includes(item.status)
                const isGenerating = generatingId === item.id || item.status === 'pending_response'
                const isResponded = item.status === 'responded'

                return (
                  <div 
                    key={item.id} 
                    className={`p-4 border rounded-lg transition-all ${
                      isResponded ? 'border-green-300 bg-green-50/50' :
                      canRespond ? 'border-[#0EA5E9]/30 bg-[#F0F9FF]/50 hover:border-[#0EA5E9]' :
                      'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Left side - Content info */}
                      <div className="min-w-0 flex-1">
                        {/* Header row */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge 
                            variant="outline" 
                            className="text-[10px] font-medium cursor-pointer hover:bg-destructive/10 hover:line-through group/comp"
                            onClick={() => {
                              setExcludedCompetitors(prev => new Set([...prev, item.competitor_id]))
                              toast.success(`Hiding ${competitor?.name || 'competitor'} from view`, {
                                description: 'Click "Hidden" badges above to restore',
                              })
                            }}
                            title={`Click to hide all ${competitor?.name} posts`}
                          >
                            {competitor?.name || 'Unknown'}
                            <X className="h-2.5 w-2.5 ml-0.5 opacity-0 group-hover/comp:opacity-100 transition-opacity" />
                          </Badge>
                          {item.content_type && (
                            <Badge 
                              variant={canRespond ? 'default' : 'secondary'} 
                              className={`text-[10px] cursor-pointer hover:bg-destructive/10 hover:line-through group/ct ${canRespond ? 'bg-[#0EA5E9] hover:bg-[#0EA5E9]/70' : ''}`}
                              onClick={() => {
                                setExcludedContentTypes(prev => new Set([...prev, item.content_type!]))
                                toast.success(`Hiding "${CONTENT_TYPE_LABELS[item.content_type!] || item.content_type}" content`, {
                                  description: 'Click "Hidden" badges above to restore',
                                })
                              }}
                              title={`Click to hide all "${CONTENT_TYPE_LABELS[item.content_type] || item.content_type}" content`}
                            >
                              {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}
                              <X className="h-2.5 w-2.5 ml-0.5 opacity-0 group-hover/ct:opacity-100 transition-opacity" />
                            </Badge>
                          )}
                          {item.is_competitor_specific && (
                            <Badge variant="secondary" className="text-[10px]">
                              Company-specific
                            </Badge>
                          )}
                          {canRespond && (
                            <Badge className="text-[10px] bg-[#10B981]/90 text-white">
                              <Lightbulb className="h-3 w-3 mr-1" />
                              Memo Candidate
                            </Badge>
                          )}
                          {isResponded && (
                            <Badge className="text-[10px] bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Responded
                            </Badge>
                          )}
                          {isGenerating && item.status === 'pending_response' && (
                            <Badge className="text-[10px] bg-amber-500">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Generating...
                            </Badge>
                          )}
                        </div>

                        {/* Title with content type subtitle */}
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-sm hover:text-[#0EA5E9] inline-flex items-center gap-1.5"
                        >
                          {item.title}
                          <ExternalLink className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        </a>

                        {/* Content summary with type context */}
                        {item.content_summary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.content_summary}
                          </p>
                        )}

                        {/* Universal topic - this is what we'd write about */}
                        {item.universal_topic && canRespond && (
                          <div className="mt-2 flex items-center gap-1 text-xs">
                            <Sparkles className="h-3 w-3 text-[#0EA5E9]" />
                            <span className="text-[#0EA5E9] font-medium">
                              Opportunity: &ldquo;{item.universal_topic}&rdquo;
                            </span>
                          </div>
                        )}

                        {/* Topics */}
                        {item.topics && item.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.topics.slice(0, 4).map((topic, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded">
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Meta info */}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getRelativeTime(getDateForContent(item))}
                          </span>
                          {item.word_count && (
                            <span>{item.word_count.toLocaleString()} words</span>
                          )}
                          {item.author && (
                            <span>by {item.author}</span>
                          )}
                        </div>
                      </div>

                      {/* Right side - Actions */}
                      <div className="shrink-0 flex flex-col gap-2">
                        {canRespond && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleGenerateResponse(item.id)}
                              disabled={isGenerating}
                              className="bg-[#0EA5E9] hover:bg-[#0284C7]"
                            >
                              {isGenerating ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Zap className="h-4 w-4 mr-1" />
                              )}
                              Respond
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleSkip(item.id)}
                              className="text-muted-foreground"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Skip
                            </Button>
                          </>
                        )}
                        {isResponded && item.response_memo && (
                          <a 
                            href={`/brands/${brandId}/memos/${item.response_memo.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted transition-colors text-xs"
                          >
                            <FileText className="h-4 w-4 text-green-600" />
                            <span>View Response</span>
                          </a>
                        )}
                        {!canRespond && !isResponded && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setHiddenIds(prev => new Set([...prev, item.id]))}
                            className="text-muted-foreground"
                            title="Hide this post"
                          >
                            <EyeOff className="h-4 w-4 mr-1" />
                            Hide
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
        ) : (
          <div className="text-center py-12">
            <Newspaper className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-lg font-semibold mb-2">
              {filter === 'today' && 'No New Content Today'}
              {filter === 'yesterday' && 'No Content From Yesterday'}
              {filter === 'respondable' && 'No Memo Opportunities'}
              {filter === 'all' && 'No Recent Content'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {filter === 'today' && 'Check back later or run a scan to check for new posts.'}
              {filter === 'yesterday' && 'No competitor content was detected from yesterday.'}
              {filter === 'respondable' && "No competitor posts identified as memo opportunities right now."}
              {filter === 'all' && 'No competitor content has been detected recently.'}
            </p>
            <Button variant="outline" onClick={handleScan} disabled={scanning}>
              {scanning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Check Feeds Now
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
