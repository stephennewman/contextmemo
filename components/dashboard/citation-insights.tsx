'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ExternalLink,
  Link2,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  Globe,
  FileText,
  BarChart3,
  MessageSquare,
  Hash,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Target,
} from 'lucide-react'
import { format, subDays, eachDayOfInterval, startOfDay } from 'date-fns'
import { FunnelStage, FUNNEL_STAGE_META } from '@/lib/supabase/types'

interface ScanResult {
  id: string
  query_id: string
  model: string
  brand_mentioned: boolean
  brand_position?: number | null
  brand_in_citations?: boolean | null
  brand_sentiment?: 'positive' | 'negative' | 'neutral' | null
  sentiment_reason?: string | null
  citations?: string[] | null
  competitors_mentioned: string[] | null
  scanned_at: string
  response_text?: string | null
}

interface Query {
  id: string
  query_text: string
  query_type: string | null
  persona?: string | null
  priority: number
  funnel_stage?: FunnelStage | null
}

interface Memo {
  id: string
  title: string
  memo_type: string
  status: string
  slug: string
}

interface CitationInsightsProps {
  brandName: string
  brandDomain: string
  scanResults: ScanResult[]
  queries: Query[]
  memos?: Memo[]
}

// Map memo types to funnel stages
const MEMO_FUNNEL_MAP: Record<string, FunnelStage> = {
  comparison: 'mid_funnel',
  alternative: 'bottom_funnel',
  industry: 'top_funnel',
  how_to: 'top_funnel',
  response: 'mid_funnel',
  guide: 'top_funnel',
}

type TimeRange = '7d' | '30d' | '90d'
type ViewMode = 'domains' | 'urls'

function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function getPathFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const path = urlObj.pathname + urlObj.search
    return path.length > 80 ? path.slice(0, 77) + '...' : path
  } catch {
    return url
  }
}

export function CitationInsights({ brandName, brandDomain, scanResults, queries, memos = [] }: CitationInsightsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('urls')

  // Build query lookup map
  const queryMap = useMemo(() => {
    const map = new Map<string, Query>()
    for (const q of queries) map.set(q.id, q)
    return map
  }, [queries])

  // Filter scans by time range
  const filteredScans = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const cutoff = subDays(new Date(), days)
    return scanResults.filter(s => new Date(s.scanned_at) >= cutoff)
  }, [scanResults, timeRange])

  // Aggregate citations by individual URL with prompt mapping
  const citationsByUrl = useMemo(() => {
    const urlMap = new Map<string, { 
      count: number
      queryIds: Set<string>
      scanDates: string[]
    }>()

    for (const scan of filteredScans) {
      if (!scan.citations) continue
      for (const url of scan.citations as string[]) {
        if (!urlMap.has(url)) {
          urlMap.set(url, { count: 0, queryIds: new Set(), scanDates: [] })
        }
        const entry = urlMap.get(url)!
        entry.count++
        if (scan.query_id) entry.queryIds.add(scan.query_id)
        entry.scanDates.push(scan.scanned_at)
      }
    }

    return Array.from(urlMap.entries())
      .map(([url, data]) => ({
        url,
        domain: getDomainFromUrl(url),
        path: getPathFromUrl(url),
        totalCitations: data.count,
        promptCount: data.queryIds.size,
        prompts: Array.from(data.queryIds)
          .map(qid => queryMap.get(qid))
          .filter(Boolean) as Query[],
        lastCited: data.scanDates.sort().pop() || '',
        isBrand: brandDomain.toLowerCase().includes(getDomainFromUrl(url).toLowerCase()) || 
                 getDomainFromUrl(url).toLowerCase().includes(brandDomain.toLowerCase()),
      }))
      .sort((a, b) => b.totalCitations - a.totalCitations)
  }, [filteredScans, brandDomain, queryMap])

  // Aggregate all citations by domain
  const citationsByDomain = useMemo(() => {
    const domainMap = new Map<string, { 
      urls: Set<string>
      count: number
      queryIds: Set<string>
    }>()
    
    for (const scan of filteredScans) {
      if (!scan.citations) continue
      for (const url of scan.citations as string[]) {
        const domain = getDomainFromUrl(url)
        if (!domainMap.has(domain)) {
          domainMap.set(domain, { urls: new Set(), count: 0, queryIds: new Set() })
        }
        const entry = domainMap.get(domain)!
        entry.urls.add(url)
        entry.count++
        if (scan.query_id) entry.queryIds.add(scan.query_id)
      }
    }

    return Array.from(domainMap.entries())
      .map(([domain, data]) => ({
        domain,
        urls: Array.from(data.urls),
        totalCitations: data.count,
        uniqueUrls: data.urls.size,
        promptCount: data.queryIds.size,
        prompts: Array.from(data.queryIds)
          .map(qid => queryMap.get(qid))
          .filter(Boolean) as Query[],
        isBrand: brandDomain.toLowerCase().includes(domain.toLowerCase()) || 
                 domain.toLowerCase().includes(brandDomain.toLowerCase()),
      }))
      .sort((a, b) => b.totalCitations - a.totalCitations)
  }, [filteredScans, brandDomain, queryMap])

  // Calculate citation timeline data
  const timelineData = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const interval = eachDayOfInterval({
      start: subDays(new Date(), days - 1),
      end: new Date(),
    })

    return interval.map(date => {
      const dayStart = startOfDay(date)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const dayScans = filteredScans.filter(s => {
        const scanDate = new Date(s.scanned_at)
        return scanDate >= dayStart && scanDate < dayEnd
      })

      const scansWithCitations = dayScans.filter(s => s.citations && s.citations.length > 0)
      const brandCited = scansWithCitations.filter(s => s.brand_in_citations === true).length

      return {
        date,
        totalScans: dayScans.length,
        scansWithCitations: scansWithCitations.length,
        brandCited,
        citationRate: scansWithCitations.length > 0 
          ? Math.round((brandCited / scansWithCitations.length) * 100) 
          : 0,
      }
    })
  }, [filteredScans, timeRange])

  // Summary stats
  const stats = useMemo(() => {
    const scansWithCitations = filteredScans.filter(s => s.citations && s.citations.length > 0)
    const brandCited = scansWithCitations.filter(s => s.brand_in_citations === true).length
    const totalCitations = filteredScans.reduce((sum, s) => sum + (s.citations?.length || 0), 0)
    
    // Unique URLs total
    const allUrls = new Set<string>()
    filteredScans.forEach(s => (s.citations || []).forEach(u => allUrls.add(u as string)))
    
    const midpoint = Math.floor(timelineData.length / 2)
    const firstHalf = timelineData.slice(0, midpoint)
    const secondHalf = timelineData.slice(midpoint)
    
    const firstHalfRate = firstHalf.length > 0
      ? firstHalf.reduce((sum, d) => sum + d.citationRate, 0) / firstHalf.length
      : 0
    const secondHalfRate = secondHalf.length > 0
      ? secondHalf.reduce((sum, d) => sum + d.citationRate, 0) / secondHalf.length
      : 0
    
    const trend = secondHalfRate - firstHalfRate

    // Sentiment stats
    const mentionedScans = filteredScans.filter(s => s.brand_mentioned)
    const sentimentCounts = {
      positive: mentionedScans.filter(s => s.brand_sentiment === 'positive').length,
      negative: mentionedScans.filter(s => s.brand_sentiment === 'negative').length,
      neutral: mentionedScans.filter(s => s.brand_sentiment === 'neutral').length,
      unclassified: mentionedScans.filter(s => !s.brand_sentiment).length,
    }
    const totalClassified = sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral
    const sentimentScore = totalClassified > 0
      ? Math.round(((sentimentCounts.positive - sentimentCounts.negative) / totalClassified) * 100)
      : null

    // Brand position stats
    const positionScans = filteredScans.filter(s => s.brand_position != null && s.brand_position > 0)
    const avgPosition = positionScans.length > 0
      ? positionScans.reduce((sum, s) => sum + (s.brand_position || 0), 0) / positionScans.length
      : null

    return {
      totalScans: filteredScans.length,
      scansWithCitations: scansWithCitations.length,
      brandCited,
      citationRate: scansWithCitations.length > 0 
        ? Math.round((brandCited / scansWithCitations.length) * 100) 
        : 0,
      totalCitations,
      uniqueUrls: allUrls.size,
      uniqueDomains: citationsByDomain.length,
      trend,
      // Sentiment
      sentimentCounts,
      sentimentScore,
      totalMentioned: mentionedScans.length,
      // Position
      avgPosition,
      positionCount: positionScans.length,
    }
  }, [filteredScans, citationsByDomain, timelineData])

  // Funnel breakdown stats with competitor data
  const funnelStats = useMemo(() => {
    const stages: FunnelStage[] = ['top_funnel', 'mid_funnel', 'bottom_funnel']
    
    return stages.map(stage => {
      // Get query IDs for this funnel stage
      const stageQueryIds = new Set(
        queries.filter(q => q.funnel_stage === stage).map(q => q.id)
      )
      
      // Get scans for these queries
      const stageScans = filteredScans.filter(s => stageQueryIds.has(s.query_id))
      const scansWithCitations = stageScans.filter(s => s.citations && s.citations.length > 0)
      const brandCited = scansWithCitations.filter(s => s.brand_in_citations === true).length
      const mentioned = stageScans.filter(s => s.brand_mentioned).length
      
      // Aggregate competitors mentioned at this funnel stage
      const competitorCounts = new Map<string, number>()
      stageScans.forEach(scan => {
        (scan.competitors_mentioned || []).forEach(comp => {
          competitorCounts.set(comp, (competitorCounts.get(comp) || 0) + 1)
        })
      })
      const topCompetitors = Array.from(competitorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({
          name,
          mentions: count,
          mentionRate: stageScans.length > 0 ? Math.round((count / stageScans.length) * 100) : 0,
        }))
      
      // Aggregate cited domains at this stage
      const domainCounts = new Map<string, number>()
      stageScans.forEach(scan => {
        (scan.citations as string[] || []).forEach(url => {
          const domain = getDomainFromUrl(url)
          domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)
        })
      })
      const topDomains = Array.from(domainCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([domain, count]) => ({
          domain,
          citations: count,
          isBrand: brandDomain.toLowerCase().includes(domain.toLowerCase()) || 
                   domain.toLowerCase().includes(brandDomain.toLowerCase()),
        }))

      // Count memos targeting this funnel stage
      const stageMemos = memos.filter(m => MEMO_FUNNEL_MAP[m.memo_type] === stage)
      
      // Sentiment at this funnel stage
      const mentionedScansAtStage = stageScans.filter(s => s.brand_mentioned)
      const stageSentiment = {
        positive: mentionedScansAtStage.filter(s => s.brand_sentiment === 'positive').length,
        negative: mentionedScansAtStage.filter(s => s.brand_sentiment === 'negative').length,
        neutral: mentionedScansAtStage.filter(s => s.brand_sentiment === 'neutral').length,
      }
      const stageClassified = stageSentiment.positive + stageSentiment.negative + stageSentiment.neutral
      const stageSentimentScore = stageClassified > 0
        ? Math.round(((stageSentiment.positive - stageSentiment.negative) / stageClassified) * 100)
        : null
      
      // Average position at this funnel stage
      const positionScansAtStage = stageScans.filter(s => s.brand_position != null && s.brand_position > 0)
      const avgPositionAtStage = positionScansAtStage.length > 0
        ? positionScansAtStage.reduce((sum, s) => sum + (s.brand_position || 0), 0) / positionScansAtStage.length
        : null

      return {
        stage,
        meta: FUNNEL_STAGE_META[stage],
        queryCount: stageQueryIds.size,
        scanCount: stageScans.length,
        mentionRate: stageScans.length > 0 ? Math.round((mentioned / stageScans.length) * 100) : 0,
        citationRate: scansWithCitations.length > 0 ? Math.round((brandCited / scansWithCitations.length) * 100) : 0,
        brandCited,
        scansWithCitations: scansWithCitations.length,
        topCompetitors,
        topDomains,
        memoCount: stageMemos.length,
        publishedMemos: stageMemos.filter(m => m.status === 'published').length,
        // New: sentiment + position per funnel stage
        sentiment: stageSentiment,
        sentimentScore: stageSentimentScore,
        avgPosition: avgPositionAtStage,
      }
    })
  }, [queries, filteredScans, brandDomain, memos])

  const maxRate = Math.max(...timelineData.map(d => d.citationRate), 100)

  return (
    <div className="space-y-6">
      {/* Time Range Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5 text-cyan-600" />
            Citation Insights
          </h2>
          <p className="text-sm text-muted-foreground">
            What AI models cite and for which prompts
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-white shadow-sm text-[#0F172A]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Citation Rate</p>
                <p className="text-3xl font-bold text-cyan-600">{stats.citationRate}%</p>
              </div>
              {stats.trend !== 0 && (
                <div className={`flex items-center gap-1 text-sm ${stats.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.trend > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {Math.abs(Math.round(stats.trend))}%
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.brandCited}/{stats.scansWithCitations} scans
            </p>
          </CardContent>
        </Card>

        {/* Sentiment Score */}
        <Card className={`border-l-4 ${
          stats.sentimentScore !== null && stats.sentimentScore > 0 
            ? 'border-l-green-500' 
            : stats.sentimentScore !== null && stats.sentimentScore < 0 
              ? 'border-l-red-500' 
              : 'border-l-slate-300'
        }`}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sentiment</p>
            {stats.sentimentScore !== null ? (
              <>
                <div className="flex items-center gap-2">
                  <p className={`text-3xl font-bold ${
                    stats.sentimentScore > 0 ? 'text-green-600' : 
                    stats.sentimentScore < 0 ? 'text-red-600' : 'text-slate-600'
                  }`}>
                    {stats.sentimentScore > 0 ? '+' : ''}{stats.sentimentScore}
                  </p>
                  {stats.sentimentScore > 20 && <ThumbsUp className="h-5 w-5 text-green-500" />}
                  {stats.sentimentScore < -20 && <ThumbsDown className="h-5 w-5 text-red-500" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-green-600">{stats.sentimentCounts.positive} pos</span>
                  <span className="text-[10px] text-slate-400">{stats.sentimentCounts.neutral} neu</span>
                  <span className="text-[10px] text-red-500">{stats.sentimentCounts.negative} neg</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-slate-300">--</p>
                <p className="text-xs text-muted-foreground mt-1">No data yet</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Average Position */}
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Position</p>
            {stats.avgPosition !== null ? (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-3xl font-bold text-amber-600">
                    #{stats.avgPosition.toFixed(1)}
                  </p>
                  <Target className="h-5 w-5 text-amber-400" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  across {stats.positionCount} mention{stats.positionCount !== 1 ? 's' : ''}
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-slate-300">--</p>
                <p className="text-xs text-muted-foreground mt-1">Not mentioned yet</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Citations</p>
            <p className="text-3xl font-bold">{stats.totalCitations}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.uniqueUrls} URLs · {stats.uniqueDomains} domains
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sentiment Breakdown Bar */}
      {stats.totalMentioned > 0 && (stats.sentimentCounts.positive + stats.sentimentCounts.negative + stats.sentimentCounts.neutral) > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Sentiment Breakdown</p>
              <p className="text-xs text-muted-foreground">{stats.totalMentioned} mentions analyzed</p>
            </div>
            <div className="h-3 rounded-full overflow-hidden flex">
              {stats.sentimentCounts.positive > 0 && (
                <div 
                  className="bg-green-500 transition-all" 
                  style={{ width: `${(stats.sentimentCounts.positive / stats.totalMentioned) * 100}%` }}
                  title={`Positive: ${stats.sentimentCounts.positive}`}
                />
              )}
              {stats.sentimentCounts.neutral > 0 && (
                <div 
                  className="bg-slate-300 transition-all" 
                  style={{ width: `${(stats.sentimentCounts.neutral / stats.totalMentioned) * 100}%` }}
                  title={`Neutral: ${stats.sentimentCounts.neutral}`}
                />
              )}
              {stats.sentimentCounts.negative > 0 && (
                <div 
                  className="bg-red-500 transition-all" 
                  style={{ width: `${(stats.sentimentCounts.negative / stats.totalMentioned) * 100}%` }}
                  title={`Negative: ${stats.sentimentCounts.negative}`}
                />
              )}
              {stats.sentimentCounts.unclassified > 0 && (
                <div 
                  className="bg-slate-100 transition-all" 
                  style={{ width: `${(stats.sentimentCounts.unclassified / stats.totalMentioned) * 100}%` }}
                  title={`Unclassified: ${stats.sentimentCounts.unclassified}`}
                />
              )}
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-xs text-muted-foreground">Positive ({Math.round((stats.sentimentCounts.positive / stats.totalMentioned) * 100)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                <span className="text-xs text-muted-foreground">Neutral ({Math.round((stats.sentimentCounts.neutral / stats.totalMentioned) * 100)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-xs text-muted-foreground">Negative ({Math.round((stats.sentimentCounts.negative / stats.totalMentioned) * 100)}%)</span>
              </div>
              {stats.sentimentCounts.unclassified > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-100 border" />
                  <span className="text-xs text-muted-foreground">Pending ({stats.sentimentCounts.unclassified})</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Funnel Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Visibility by Funnel Stage</CardTitle>
          <CardDescription>
            Where in the buyer journey is {brandName} visible — and where are the gaps?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {funnelStats.map(({ stage, meta, queryCount, scanCount, mentionRate, citationRate, scansWithCitations, topCompetitors, topDomains, memoCount, publishedMemos, sentiment, sentimentScore, avgPosition }) => {
              const isGap = scanCount > 0 && citationRate === 0 && mentionRate < 30
              const isStrong = citationRate >= 30 || mentionRate >= 60
              
              return (
                <div
                  key={stage}
                  className="rounded-lg border p-4 space-y-4"
                  style={{ borderLeftWidth: '4px', borderLeftColor: meta.color }}
                >
                  {/* Header */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className="text-xs font-bold px-2 py-0.5"
                        style={{ backgroundColor: meta.bgColor, color: meta.color }}
                      >
                        {meta.shortLabel}
                      </Badge>
                      <span className="text-sm font-medium">{meta.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  </div>
                  
                  {/* Your Brand's Rates */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
                      {brandName}
                    </p>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Citation</span>
                        <span className="font-bold" style={{ color: citationRate > 0 ? meta.color : undefined }}>
                          {scansWithCitations > 0 ? `${citationRate}%` : '—'}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${citationRate}%`, backgroundColor: meta.color }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Mention</span>
                        <span className="font-bold" style={{ color: mentionRate > 0 ? meta.color : undefined }}>
                          {scanCount > 0 ? `${mentionRate}%` : '—'}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all opacity-60"
                          style={{ width: `${mentionRate}%`, backgroundColor: meta.color }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sentiment + Position at this stage */}
                  {(sentimentScore !== null || avgPosition !== null) && (
                    <div className="flex items-center gap-3">
                      {sentimentScore !== null && (
                        <div className="flex items-center gap-1.5">
                          {sentimentScore > 0 ? (
                            <ThumbsUp className="h-3.5 w-3.5 text-green-500" />
                          ) : sentimentScore < 0 ? (
                            <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <Minus className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span className={`text-xs font-medium ${
                            sentimentScore > 0 ? 'text-green-600' : sentimentScore < 0 ? 'text-red-600' : 'text-slate-500'
                          }`}>
                            {sentimentScore > 0 ? '+' : ''}{sentimentScore} sentiment
                          </span>
                        </div>
                      )}
                      {avgPosition !== null && (
                        <div className="flex items-center gap-1.5">
                          <Target className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-xs font-medium text-amber-600">
                            Avg #{avgPosition.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Competitors at this stage */}
                  {topCompetitors.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Competitors mentioned
                      </p>
                      <div className="space-y-1.5">
                        {topCompetitors.map(({ name, mentionRate: compRate }) => (
                          <div key={name} className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs truncate">{name}</span>
                                <span className={`text-xs font-medium ${compRate > mentionRate ? 'text-red-600' : 'text-muted-foreground'}`}>
                                  {compRate}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${compRate > mentionRate ? 'bg-red-400' : 'bg-slate-300'}`}
                                  style={{ width: `${compRate}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top cited domains at this stage */}
                  {topDomains.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                        Top cited sources
                      </p>
                      <div className="space-y-1">
                        {topDomains.map(({ domain, citations, isBrand }) => (
                          <div key={domain} className="flex items-center justify-between text-xs">
                            <span className={`truncate ${isBrand ? 'font-medium' : ''}`} style={isBrand ? { color: meta.color } : {}}>
                              {isBrand ? `${domain} ★` : domain}
                            </span>
                            <span className="text-muted-foreground shrink-0 ml-2">{citations}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content coverage */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{queryCount} prompts</span>
                      <span className="text-muted-foreground">{scanCount} scans</span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-muted-foreground">
                        {publishedMemos} memo{publishedMemos !== 1 ? 's' : ''} published
                      </span>
                      {memoCount > publishedMemos && (
                        <span className="text-muted-foreground">
                          {memoCount - publishedMemos} draft{memoCount - publishedMemos !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Gap / Strong indicator */}
                  {isGap && scanCount > 5 && (
                    <div className="px-2 py-1.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-medium">
                      Gap: Low visibility at this stage
                    </div>
                  )}
                  {isStrong && (
                    <div className="px-2 py-1.5 rounded text-xs font-medium" style={{ backgroundColor: meta.bgColor, color: meta.color }}>
                      Strong visibility
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Citation Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Citation Rate Over Time</CardTitle>
          </div>
          <CardDescription>
            Percentage of scans where {brandName} was cited
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timelineData.some(d => d.totalScans > 0) ? (
            <div className="h-40 flex items-end gap-1">
              {timelineData.map((day, i) => {
                const height = day.citationRate > 0 ? Math.max((day.citationRate / maxRate) * 100, 4) : 0
                const hasData = day.scansWithCitations > 0
                
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1 group"
                    title={`${format(day.date, 'MMM d')}: ${day.citationRate}% (${day.brandCited}/${day.scansWithCitations} scans)`}
                  >
                    <div className="w-full flex flex-col justify-end h-32">
                      {hasData ? (
                        <div
                          className={`w-full rounded-t transition-all ${
                            day.citationRate >= 50 ? 'bg-cyan-500' : 
                            day.citationRate > 0 ? 'bg-cyan-300' : 'bg-slate-200'
                          } group-hover:opacity-80`}
                          style={{ height: `${height}%` }}
                        />
                      ) : (
                        <div className="w-full h-1 bg-slate-100 rounded" />
                      )}
                    </div>
                    {(timeRange === '7d' || i % (timeRange === '30d' ? 5 : 15) === 0) && (
                      <span className="text-[10px] text-muted-foreground">
                        {format(day.date, timeRange === '7d' ? 'EEE' : 'M/d')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-muted-foreground">
              No scan data for selected period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Cited Sources - with URL/Domain toggle and prompt mapping */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Top Cited Sources</CardTitle>
              </div>
              <CardDescription>
                {viewMode === 'urls' 
                  ? 'Individual pages cited by AI — expand to see which prompts triggered each citation'
                  : 'Domains cited by AI — expand to see URLs and prompts'
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => { setViewMode('urls'); setExpandedItem(null) }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'urls'
                    ? 'bg-white shadow-sm text-[#0F172A]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="h-3 w-3" />
                URLs
              </button>
              <button
                onClick={() => { setViewMode('domains'); setExpandedItem(null) }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  viewMode === 'domains'
                    ? 'bg-white shadow-sm text-[#0F172A]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="h-3 w-3" />
                Domains
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'urls' ? (
            /* URL-level view with prompt mapping */
            citationsByUrl.length > 0 ? (
              <div className="space-y-1">
                {citationsByUrl.slice(0, 30).map((source, i) => {
                  const isExpanded = expandedItem === source.url
                  const barWidth = (source.totalCitations / citationsByUrl[0].totalCitations) * 100
                  
                  return (
                    <div key={source.url}>
                      <button
                        onClick={() => setExpandedItem(isExpanded ? null : source.url)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                          {/* Rank */}
                          <span className="w-6 text-sm font-mono text-muted-foreground text-right shrink-0">
                            {i + 1}
                          </span>
                          
                          {/* URL & bar */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-sm font-medium truncate ${source.isBrand ? 'text-cyan-600' : ''}`}>
                                {source.domain}
                              </span>
                              <span className="text-xs text-muted-foreground truncate">
                                {source.path}
                              </span>
                              {source.isBrand && (
                                <Badge className="bg-cyan-100 text-cyan-700 text-[10px] px-1.5 py-0 shrink-0">
                                  You
                                </Badge>
                              )}
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100" />
                              )}
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${source.isBrand ? 'bg-cyan-500' : 'bg-slate-400'}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-3 text-sm shrink-0">
                            <div className="flex items-center gap-1 font-semibold" title="Times this URL was cited">
                              <Hash className="h-3 w-3 text-muted-foreground" />
                              {source.totalCitations}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground" title="Prompts that triggered this citation">
                              <MessageSquare className="h-3 w-3" />
                              {source.promptCount}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded: show prompts that triggered this citation */}
                      {isExpanded && (
                        <div className="ml-9 mr-2 mb-3 mt-1 rounded-lg border bg-slate-50/50 overflow-hidden">
                          {/* Link to actual URL */}
                          <div className="px-3 py-2 border-b bg-white">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1.5"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span className="truncate">{source.url}</span>
                            </a>
                            <p className="text-xs text-muted-foreground mt-1">
                              Cited {source.totalCitations} time{source.totalCitations !== 1 ? 's' : ''} across {source.promptCount} prompt{source.promptCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                          
                          {/* Prompt list */}
                          <div className="divide-y">
                            {source.prompts.length > 0 ? (
                              source.prompts.slice(0, 15).map((prompt) => (
                                <div key={prompt.id} className="px-3 py-2 flex items-start gap-2">
                                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm truncate">{prompt.query_text}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {prompt.query_type && (
                                        <span className="text-[10px] text-muted-foreground">
                                          {prompt.query_type.replace(/_/g, ' ')}
                                        </span>
                                      )}
                                      {prompt.persona && (
                                        <span className="text-[10px] text-muted-foreground">
                                          · {prompt.persona.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-muted-foreground">
                                Prompt data not available
                              </div>
                            )}
                            {source.prompts.length > 15 && (
                              <div className="px-3 py-2 text-xs text-muted-foreground">
                                +{source.prompts.length - 15} more prompts
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                
                {citationsByUrl.length > 30 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    Showing top 30 of {citationsByUrl.length} URLs
                  </p>
                )}
              </div>
            ) : (
              <EmptyState />
            )
          ) : (
            /* Domain-level view */
            citationsByDomain.length > 0 ? (
              <div className="space-y-1">
                {citationsByDomain.slice(0, 20).map((source, i) => {
                  const isExpanded = expandedItem === source.domain
                  const barWidth = (source.totalCitations / citationsByDomain[0].totalCitations) * 100
                  
                  return (
                    <div key={source.domain}>
                      <button
                        onClick={() => setExpandedItem(isExpanded ? null : source.domain)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                          <span className="w-6 text-sm font-mono text-muted-foreground text-right shrink-0">
                            {i + 1}
                          </span>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-medium truncate ${source.isBrand ? 'text-cyan-600' : ''}`}>
                                {source.domain}
                              </span>
                              {source.isBrand && (
                                <Badge className="bg-cyan-100 text-cyan-700 text-[10px] px-1.5 py-0 shrink-0">
                                  You
                                </Badge>
                              )}
                              {isExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100" />
                              )}
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${source.isBrand ? 'bg-cyan-500' : 'bg-slate-400'}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-sm shrink-0">
                            <div className="flex items-center gap-1 font-semibold" title="Total times cited">
                              <Hash className="h-3 w-3 text-muted-foreground" />
                              {source.totalCitations}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground" title="Unique URLs">
                              <FileText className="h-3 w-3" />
                              {source.uniqueUrls}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground" title="Prompts that triggered citations">
                              <MessageSquare className="h-3 w-3" />
                              {source.promptCount}
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded: URLs and prompts */}
                      {isExpanded && (
                        <div className="ml-9 mr-2 mb-3 mt-1 rounded-lg border bg-slate-50/50 overflow-hidden">
                          {/* URLs for this domain */}
                          <div className="divide-y">
                            <div className="px-3 py-2 bg-white border-b">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {source.uniqueUrls} URL{source.uniqueUrls !== 1 ? 's' : ''} · {source.promptCount} prompt{source.promptCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                            {source.urls.slice(0, 10).map((url, j) => {
                              const urlEntry = citationsByUrl.find(u => u.url === url)
                              return (
                                <div key={j} className="px-3 py-2">
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-slate-700 hover:text-cyan-600 flex items-center gap-1.5 group/link"
                                  >
                                    <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">{url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                                    <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover/link:opacity-100" />
                                    {urlEntry && (
                                      <span className="ml-auto text-xs text-muted-foreground shrink-0">
                                        {urlEntry.totalCitations}x · {urlEntry.promptCount} prompt{urlEntry.promptCount !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </a>
                                </div>
                              )
                            })}
                            {source.urls.length > 10 && (
                              <div className="px-3 py-2 text-xs text-muted-foreground">
                                +{source.urls.length - 10} more URLs
                              </div>
                            )}
                          </div>

                          {/* Prompts that triggered citations for this domain */}
                          {source.prompts.length > 0 && (
                            <div className="border-t">
                              <div className="px-3 py-2 bg-white border-b">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  Prompts that triggered these citations
                                </p>
                              </div>
                              <div className="divide-y">
                                {source.prompts.slice(0, 10).map((prompt) => (
                                  <div key={prompt.id} className="px-3 py-2">
                                    <p className="text-sm truncate">{prompt.query_text}</p>
                                  </div>
                                ))}
                                {source.prompts.length > 10 && (
                                  <div className="px-3 py-2 text-xs text-muted-foreground">
                                    +{source.prompts.length - 10} more prompts
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                
                {citationsByDomain.length > 20 && (
                  <p className="text-sm text-muted-foreground text-center pt-2">
                    Showing top 20 of {citationsByDomain.length} domains
                  </p>
                )}
              </div>
            ) : (
              <EmptyState />
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="py-12 text-center text-muted-foreground">
      <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
      <p>No citations found in selected period</p>
      <p className="text-sm">Run more scans to see citation data</p>
    </div>
  )
}
