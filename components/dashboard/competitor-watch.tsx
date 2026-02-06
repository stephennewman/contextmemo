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

  const competitorLookup = new Map(competitors.map(c => [c.id, c]))

  // Filter content based on published_at or first_seen_at
  const getDateForContent = (item: CompetitorContent) => item.published_at || item.first_seen_at

  // Get "yesterday" as a date range (the 24h period before today)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000)

  // Filter content
  const filteredContent = content.filter(item => {
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
  const recentlyResponded = content.filter(item => 
    item.status === 'responded' && 
    isWithinHours(item.first_seen_at, 72)
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
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-[#0EA5E9]" style={{ borderWidth: '3px', borderLeftWidth: '8px' }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#0EA5E9] rounded">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Competitor Watch</CardTitle>
                <CardDescription>
                  Monitoring {competitors.length} competitor{competitors.length !== 1 ? 's' : ''} for new content
                </CardDescription>
              </div>
            </div>
            <Button 
              variant="default" 
              onClick={handleScan}
              disabled={scanning}
              className="bg-[#0EA5E9] hover:bg-[#0284C7]"
            >
              {scanning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Check Now
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card 
          className={`cursor-pointer transition-all ${filter === 'today' ? 'ring-2 ring-[#0EA5E9] bg-[#F0F9FF]' : 'hover:bg-muted/50'}`}
          onClick={() => setFilter('today')}
        >
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-3xl font-bold text-[#0EA5E9]">{todayContent.length}</div>
            <div className="text-xs text-muted-foreground font-medium">Today</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${filter === 'yesterday' ? 'ring-2 ring-[#8B5CF6] bg-[#F5F3FF]' : 'hover:bg-muted/50'}`}
          onClick={() => setFilter('yesterday')}
        >
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-3xl font-bold text-[#8B5CF6]">{yesterdayContent.length}</div>
            <div className="text-xs text-muted-foreground font-medium">Yesterday</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${filter === 'respondable' ? 'ring-2 ring-[#10B981] bg-[#ECFDF5]' : 'hover:bg-muted/50'}`}
          onClick={() => setFilter('respondable')}
        >
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-3xl font-bold text-[#10B981]">{respondableContent.length}</div>
            <div className="text-xs text-muted-foreground font-medium">To Respond</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${filter === 'all' ? 'ring-2 ring-[#0F172A] bg-slate-50' : 'hover:bg-muted/50'}`}
          onClick={() => setFilter('all')}
        >
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-3xl font-bold">{recentlyResponded.length}</div>
            <div className="text-xs text-muted-foreground font-medium">Responded (72h)</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Label */}
      <div className="flex items-center gap-2 text-sm">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Showing:</span>
        <Badge variant="secondary" className="font-medium">
          {filter === 'today' && `Today's Posts (${filteredContent.length})`}
          {filter === 'yesterday' && `Yesterday's Posts (${filteredContent.length})`}
          {filter === 'respondable' && `Good to Respond (${filteredContent.length})`}
          {filter === 'all' && `All Recent Content (${filteredContent.length})`}
        </Badge>
      </div>

      {/* Content List */}
      <Card>
        <CardContent className="pt-4">
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
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {competitor?.name || 'Unknown'}
                          </Badge>
                          {item.content_type && (
                            <Badge 
                              variant={canRespond ? 'default' : 'secondary'} 
                              className={`text-[10px] ${canRespond ? 'bg-[#0EA5E9]' : ''}`}
                            >
                              {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}
                            </Badge>
                          )}
                          {item.is_competitor_specific && (
                            <Badge variant="secondary" className="text-[10px]">
                              Company-specific
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

                        {/* Title */}
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-sm hover:text-[#0EA5E9] flex items-center gap-1 group"
                        >
                          {item.title}
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>

                        {/* Summary */}
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
                              Opportunity: "{item.universal_topic}"
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
                            className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted transition-colors text-xs"
                          >
                            <FileText className="h-4 w-4 text-green-600" />
                            <span>View Response</span>
                          </a>
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
                {filter === 'respondable' && 'All Caught Up!'}
                {filter === 'all' && 'No Recent Content'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {filter === 'today' && 'Check back later or run a scan to check for new posts.'}
                {filter === 'yesterday' && 'No competitor content was detected from yesterday.'}
                {filter === 'respondable' && "You've responded to all available content."}
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

      {/* How it works */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" />
            How Competitor Watch Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground grid md:grid-cols-4 gap-4">
          <div>
            <div className="font-medium text-foreground mb-1">1. Auto-Monitoring</div>
            <p>RSS feeds are checked daily for new posts from your competitors.</p>
          </div>
          <div>
            <div className="font-medium text-foreground mb-1">2. AI Classification</div>
            <p>Content is classified as educational, industry analysis, or company-specific.</p>
          </div>
          <div>
            <div className="font-medium text-foreground mb-1">3. Topic Extraction</div>
            <p>Universal topics are extracted that you can write a differentiated take on.</p>
          </div>
          <div>
            <div className="font-medium text-foreground mb-1">4. Response Generation</div>
            <p>Click "Respond" to auto-generate a unique, better article from your brand's perspective.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
