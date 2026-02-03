'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Newspaper, 
  ExternalLink, 
  FileText, 
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Rss,
  Plus,
  History,
  Settings,
  ChevronDown,
  ChevronUp,
  Trash2,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'

interface Competitor {
  id: string
  name: string
  domain: string | null
}

interface CompetitorFeed {
  id: string
  competitor_id: string
  feed_url: string
  feed_type: string
  title: string | null
  is_active: boolean
  is_manually_added: boolean
  last_checked_at: string | null
  last_successful_at: string | null
  total_items_found: number
  check_failures: number
  last_error: string | null
  discovered_at: string
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

interface CompetitorContentFeedProps {
  brandId: string
  content: CompetitorContent[]
  competitors: Competitor[]
  feeds?: CompetitorFeed[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700', icon: Clock },
  pending_response: { label: 'Generating', color: 'bg-amber-100 text-amber-700', icon: Loader2 },
  responded: { label: 'Published', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  skipped: { label: 'Skipped', color: 'bg-slate-100 text-slate-600', icon: XCircle },
  generation_failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: AlertCircle },
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

export function CompetitorContentFeed({ 
  brandId, 
  content, 
  competitors,
  feeds = [],
}: CompetitorContentFeedProps) {
  const [scanning, setScanning] = useState(false)
  const [backfilling, setBackfilling] = useState(false)
  const [showFeedsSection, setShowFeedsSection] = useState(false)
  const [addingFeed, setAddingFeed] = useState<string | null>(null)
  const [newFeedUrl, setNewFeedUrl] = useState('')

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
        description: 'Scanning competitor RSS feeds for new content...',
      })
    } catch (error) {
      toast.error('Failed to start scan')
    } finally {
      setScanning(false)
    }
  }

  const handleBackfill = async () => {
    setBackfilling(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'content-backfill' }),
      })

      if (!response.ok) throw new Error('Failed to trigger backfill')

      toast.success('Historical content backfill started', {
        description: 'Fetching all available historical content from competitor feeds. This may take a few minutes.',
      })
    } catch (error) {
      toast.error('Failed to start backfill')
    } finally {
      setBackfilling(false)
    }
  }

  const handleAddFeed = async (competitorId: string) => {
    if (!newFeedUrl.trim()) {
      toast.error('Please enter a feed URL')
      return
    }

    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'add-feed',
          competitorId,
          feedUrl: newFeedUrl.trim(),
        }),
      })

      if (!response.ok) throw new Error('Failed to add feed')

      toast.success('RSS feed added', {
        description: 'The feed will be monitored for new content.',
      })
      setNewFeedUrl('')
      setAddingFeed(null)
    } catch (error) {
      toast.error('Failed to add feed')
    }
  }

  const handleRemoveFeed = async (feedId: string) => {
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove-feed', feedId }),
      })

      if (!response.ok) throw new Error('Failed to remove feed')

      toast.success('Feed removed')
    } catch (error) {
      toast.error('Failed to remove feed')
    }
  }

  // Group feeds by competitor
  const feedsByCompetitor = new Map<string, CompetitorFeed[]>()
  feeds.forEach(feed => {
    const existing = feedsByCompetitor.get(feed.competitor_id) || []
    existing.push(feed)
    feedsByCompetitor.set(feed.competitor_id, existing)
  })

  // Group content by status
  const respondedContent = content.filter(c => c.status === 'responded')
  const pendingContent = content.filter(c => ['new', 'pending_response'].includes(c.status))
  const skippedContent = content.filter(c => ['skipped', 'generation_failed'].includes(c.status))

  // Create competitor lookup
  const competitorLookup = new Map(competitors.map(c => [c.id, c]))

  if (content.length === 0 && competitors.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Add competitors to start monitoring their content</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with scan button */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-base">Competitor Content Intelligence</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFeedsSection(!showFeedsSection)}
              >
                <Rss className="h-4 w-4 mr-2" />
                Feeds ({feeds.length})
                {showFeedsSection ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBackfill}
                disabled={backfilling}
                title="Fetch all available historical content"
              >
                {backfilling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <History className="h-4 w-4 mr-2" />
                )}
                Backfill
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleScan}
                disabled={scanning}
              >
                {scanning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Scan Now
              </Button>
            </div>
          </div>
          <CardDescription>
            Monitoring {competitors.length} competitor{competitors.length !== 1 ? 's' : ''} via {feeds.length} RSS feed{feeds.length !== 1 ? 's' : ''} • 
            {respondedContent.length} response{respondedContent.length !== 1 ? 's' : ''} auto-generated
          </CardDescription>
        </CardHeader>
      </Card>

      {/* RSS Feeds Management Section */}
      {showFeedsSection && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Rss className="h-4 w-4 text-orange-500" />
              <CardTitle className="text-base">RSS Feed Sources</CardTitle>
            </div>
            <CardDescription>
              Feeds are auto-discovered from competitor sites. Add custom feeds below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {competitors.map((competitor) => {
              const competitorFeeds = feedsByCompetitor.get(competitor.id) || []
              const isAdding = addingFeed === competitor.id

              return (
                <div key={competitor.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{competitor.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {competitor.domain}
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setAddingFeed(isAdding ? null : competitor.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Feed
                    </Button>
                  </div>

                  {isAdding && (
                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="https://example.com/rss.xml"
                        value={newFeedUrl}
                        onChange={(e) => setNewFeedUrl(e.target.value)}
                        className="text-sm"
                      />
                      <Button size="sm" onClick={() => handleAddFeed(competitor.id)}>
                        Add
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        setAddingFeed(null)
                        setNewFeedUrl('')
                      }}>
                        Cancel
                      </Button>
                    </div>
                  )}

                  {competitorFeeds.length > 0 ? (
                    <div className="space-y-2">
                      {competitorFeeds.map((feed) => (
                        <div key={feed.id} className="flex items-center justify-between text-xs bg-muted/50 rounded p-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Rss className="h-3 w-3 text-orange-500 shrink-0" />
                            <span className="truncate">{feed.title || feed.feed_url}</span>
                            <Badge variant="secondary" className="text-[9px] shrink-0">
                              {feed.feed_type.toUpperCase()}
                            </Badge>
                            {feed.is_manually_added && (
                              <Badge variant="outline" className="text-[9px] shrink-0">Manual</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-muted-foreground">
                              {feed.total_items_found} items
                            </span>
                            {feed.last_successful_at && (
                              <span className="text-muted-foreground flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                {new Date(feed.last_successful_at).toLocaleDateString()}
                              </span>
                            )}
                            {feed.check_failures > 0 && (
                              <span className="text-red-500 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                {feed.check_failures} errors
                              </span>
                            )}
                            {feed.is_manually_added && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0"
                                onClick={() => handleRemoveFeed(feed.id)}
                              >
                                <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No feeds discovered yet. Click &quot;Scan Now&quot; to auto-discover or add manually.
                    </p>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold">{content.length}</div>
            <div className="text-xs text-muted-foreground">Articles Detected</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-green-600">{respondedContent.length}</div>
            <div className="text-xs text-muted-foreground">Responses Published</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{pendingContent.length}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <div className="text-2xl font-bold text-slate-500">{skippedContent.length}</div>
            <div className="text-xs text-muted-foreground">Filtered Out</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Content Activity</CardTitle>
          <CardDescription>
            New content from competitors and our automated responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {content.length > 0 ? (
            <div className="space-y-3">
              {content.slice(0, 20).map((item) => {
                const competitor = competitorLookup.get(item.competitor_id) || item.competitor
                const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.new
                const StatusIcon = statusConfig.icon

                return (
                  <div 
                    key={item.id} 
                    className={`p-4 border rounded-lg ${
                      item.status === 'responded' ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20' :
                      item.status === 'skipped' ? 'border-slate-200 bg-slate-50/50 dark:bg-slate-950/20' :
                      'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] font-normal">
                            {competitor?.name || 'Unknown'}
                          </Badge>
                          <Badge className={`text-[10px] ${statusConfig.color}`}>
                            <StatusIcon className={`h-3 w-3 mr-1 ${item.status === 'pending_response' ? 'animate-spin' : ''}`} />
                            {statusConfig.label}
                          </Badge>
                          {item.content_type && (
                            <Badge variant="secondary" className="text-[10px]">
                              {CONTENT_TYPE_LABELS[item.content_type] || item.content_type}
                            </Badge>
                          )}
                        </div>
                        
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-sm hover:text-blue-600 flex items-center gap-1"
                        >
                          {item.title}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </a>
                        
                        {item.content_summary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.content_summary}
                          </p>
                        )}
                        
                        {item.universal_topic && item.status !== 'skipped' && (
                          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                            Topic: {item.universal_topic}
                          </p>
                        )}

                        {item.topics && item.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.topics.slice(0, 4).map((topic, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2">
                          {item.published_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Published {new Date(item.published_at).toLocaleDateString()}
                            </span>
                          )}
                          {item.word_count && (
                            <span>{item.word_count.toLocaleString()} words</span>
                          )}
                          {item.author && (
                            <span>by {item.author}</span>
                          )}
                          <span>
                            Detected {new Date(item.first_seen_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Response link if generated */}
                      {item.status === 'responded' && item.response_memo && (
                        <div className="shrink-0">
                          <Link 
                            href={`/brands/${brandId}/memos/${item.response_memo.id}`}
                            className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted transition-colors"
                          >
                            <FileText className="h-4 w-4 text-green-600" />
                            <div className="text-right">
                              <div className="text-xs font-medium">Our Response</div>
                              <div className="text-[10px] text-muted-foreground">View/Edit</div>
                            </div>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Newspaper className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground mb-3">
                No competitor content detected yet
              </p>
              <Button variant="outline" size="sm" onClick={handleScan} disabled={scanning}>
                {scanning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Run First Scan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">How Content Intelligence Works</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p><strong>1. RSS Discovery:</strong> We auto-discover RSS/Atom feeds from competitor sites. Add custom feeds manually if needed.</p>
          <p><strong>2. Daily Monitoring:</strong> Feeds are checked daily for new content. Use &quot;Backfill&quot; to import historical content.</p>
          <p><strong>3. AI Classification:</strong> Content is analyzed and classified. Company-specific content (press releases, feature updates) is filtered out.</p>
          <p><strong>4. Response Generation:</strong> For educational and industry content, we generate a unique, better, longer take from your brand&apos;s perspective - not a copy, but a differentiated response.</p>
          <p><strong>5. Auto-Publish:</strong> Responses are auto-published to your resources page. Review and edit from the Memos tab.</p>
        </CardContent>
      </Card>
    </div>
  )
}
