'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  ExternalLink,
  Link2,
  ChevronDown,
  ChevronRight,
  Globe,
  FileText,
  MessageSquare,
  Hash,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Target,
  BookOpen,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  Pencil,
  Eye,
} from 'lucide-react'
import { subDays, eachDayOfInterval, startOfDay } from 'date-fns'
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
  source_query_id?: string | null
}

interface CitationInsightsProps {
  brandId: string
  brandName: string
  brandDomain: string
  brandSubdomain: string
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
  gap_fill: 'mid_funnel',
}

type TimeRange = '7d' | '30d' | '90d'
type ViewMode = 'domains' | 'urls' | 'my_content'

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

export function CitationInsights({ brandId, brandName, brandDomain, brandSubdomain, scanResults, queries, memos = [] }: CitationInsightsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('urls')
  
  // Generation modal state
  const [genModal, setGenModal] = useState<{
    isOpen: boolean
    citedUrl: string
    citedDomain: string
    citationCount: number
    promptTexts: string[]
  } | null>(null)

  const handleGenerateMemo = useCallback((url: string, domain: string, citationCount: number, prompts: Query[]) => {
    setGenModal({
      isOpen: true,
      citedUrl: url,
      citedDomain: domain,
      citationCount,
      promptTexts: prompts.slice(0, 5).map(p => p.query_text),
    })
  }, [])

  const closeGenModal = useCallback(() => {
    setGenModal(null)
  }, [])

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

  // Compute brand's rank in the domains list
  const brandDomainRank = useMemo(() => {
    const rank = citationsByDomain.findIndex(d => d.isBrand) + 1 // 1-indexed, 0 if not found
    return { rank, total: citationsByDomain.length }
  }, [citationsByDomain])

  // Build map from query ID → memos generated from that query
  const memosByQueryId = useMemo(() => {
    const map = new Map<string, Memo[]>()
    for (const memo of memos) {
      if (memo.source_query_id) {
        if (!map.has(memo.source_query_id)) {
          map.set(memo.source_query_id, [])
        }
        map.get(memo.source_query_id)!.push(memo)
      }
    }
    return map
  }, [memos])

  // For each cited URL, find related memos (via shared query_id)
  const urlToRelatedMemos = useMemo(() => {
    const map = new Map<string, Memo[]>()
    for (const entry of citationsByUrl) {
      const related = new Map<string, Memo>() // dedupe by memo id
      for (const prompt of entry.prompts) {
        const queryMemos = memosByQueryId.get(prompt.id)
        if (queryMemos) {
          for (const m of queryMemos) related.set(m.id, m)
        }
      }
      // Also do a title/slug keyword match as fallback
      if (related.size === 0) {
        const urlLower = entry.url.toLowerCase()
        const pathWords = entry.path.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter(w => w.length > 3)
        for (const memo of memos) {
          const titleLower = memo.title.toLowerCase()
          const slugLower = memo.slug.toLowerCase()
          // Check if any significant path word appears in memo title or slug
          const hasMatch = pathWords.some(word => titleLower.includes(word) || slugLower.includes(word))
          if (hasMatch) related.set(memo.id, memo)
        }
      }
      if (related.size > 0) {
        map.set(entry.url, Array.from(related.values()))
      }
    }
    return map
  }, [citationsByUrl, memosByQueryId, memos])

  // "My Content" view: find brand's own URLs being cited + match to memos
  const myContentCited = useMemo(() => {
    // Brand URLs in citations = brand domain or contextmemo subdomain
    const brandPatterns = [
      brandDomain.toLowerCase().replace(/^www\./, ''),
      `${brandSubdomain}.contextmemo.com`,
      'contextmemo.com',
    ]
    
    const brandCitedUrls = citationsByUrl.filter(entry => {
      const domain = entry.domain.toLowerCase()
      return brandPatterns.some(p => domain.includes(p) || p.includes(domain))
    })

    // Try to match each brand URL to a specific memo
    return brandCitedUrls.map(entry => {
      // Try to match URL path to a memo slug
      const pathParts = entry.path.toLowerCase().replace(/^\//, '').split('/')
      const lastPart = pathParts[pathParts.length - 1]?.replace(/\/$/, '') || ''
      
      const matchedMemo = memos.find(m => {
        const slugLower = m.slug.toLowerCase()
        return lastPart && (slugLower === lastPart || slugLower.includes(lastPart) || lastPart.includes(slugLower))
      })

      return {
        ...entry,
        matchedMemo: matchedMemo || null,
      }
    })
  }, [citationsByUrl, brandDomain, brandSubdomain, memos])

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

  return (
    <div className="space-y-6">
      {/* Citations - unified card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Citations</CardTitle>
              <CardDescription>
                {stats.totalCitations} citations · {stats.uniqueDomains} domains · {stats.uniqueUrls} URLs
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
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
                <button
                  onClick={() => { setViewMode('my_content'); setExpandedItem(null) }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === 'my_content'
                      ? 'bg-white shadow-sm text-[#0F172A]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="h-3 w-3" />
                  My Content
                </button>
              </div>
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
                            {/* Content match indicator */}
                            {!source.isBrand && (
                              urlToRelatedMemos.has(source.url) ? (
                                <span className="flex items-center gap-0.5 text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded" title="You have content addressing this topic">
                                  <BookOpen className="h-3 w-3" />
                                  Covered
                                </span>
                              ) : i < 10 ? (
                                <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded" title="No matching content — consider creating a memo">
                                  <Sparkles className="h-3 w-3" />
                                  Gap
                                </span>
                              ) : null
                            )}
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
                          
                          {/* Related memos or generate CTA */}
                          {!source.isBrand && (() => {
                            const relatedMemos = urlToRelatedMemos.get(source.url) || []
                            return relatedMemos.length > 0 ? (
                              <div className="px-3 py-2 border-b bg-green-50/50">
                                <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                  <BookOpen className="h-3 w-3" />
                                  Your related memos
                                </p>
                                <div className="space-y-1">
                                  {relatedMemos.map(memo => (
                                    <a
                                      key={memo.id}
                                      href={`/brands/${brandId}/memos/${memo.id}`}
                                      className="text-sm text-green-700 hover:text-green-900 flex items-center gap-1.5"
                                    >
                                      <FileText className="h-3 w-3 shrink-0" />
                                      <span className="truncate">{memo.title}</span>
                                      <Badge className="text-[9px] px-1 py-0 bg-green-100 text-green-700 shrink-0">
                                        {memo.status}
                                      </Badge>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ) : i < 10 ? (
                              <div className="px-3 py-2 border-b bg-amber-50/50">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      No matching content for this citation
                                    </p>
                                    <p className="text-[11px] text-amber-600 mt-0.5">
                                      AI models cite this URL {source.totalCitations}x — consider writing a memo on this topic.
                                    </p>
                                  </div>
                                  <button
                                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-[#0F172A] text-white rounded hover:bg-[#1e293b] transition-colors shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleGenerateMemo(source.url, source.domain, source.totalCitations, source.prompts)
                                    }}
                                  >
                                    <Sparkles className="h-3 w-3" />
                                    Generate Memo
                                  </button>
                                </div>
                              </div>
                            ) : null
                          })()}

                          {/* Prompt list */}
                          <div className="divide-y">
                            {source.prompts.length > 0 ? (
                              source.prompts.slice(0, 15).map((prompt) => (
                                <div key={prompt.id} className="px-3 py-2.5 flex items-start gap-2">
                                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm">&ldquo;{prompt.query_text}&rdquo;</p>
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                      {prompt.query_type && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                          {prompt.query_type.replace(/_/g, ' ')}
                                        </span>
                                      )}
                                      {prompt.funnel_stage && FUNNEL_STAGE_META[prompt.funnel_stage] && (
                                        <span 
                                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                                          style={{ 
                                            backgroundColor: FUNNEL_STAGE_META[prompt.funnel_stage].bgColor, 
                                            color: FUNNEL_STAGE_META[prompt.funnel_stage].color 
                                          }}
                                        >
                                          {FUNNEL_STAGE_META[prompt.funnel_stage].shortLabel}
                                        </span>
                                      )}
                                      {prompt.persona && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">
                                          {prompt.persona.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
          ) : viewMode === 'domains' ? (
            /* Domain-level view */
            citationsByDomain.length > 0 ? (
              <div className="space-y-1">
                {/* Brand rank callout */}
                {brandDomainRank.rank > 0 ? (
                  <div className="flex items-center gap-3 p-3 mb-3 rounded-lg border-2 border-cyan-200 bg-cyan-50/50">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-100 text-cyan-700 font-bold text-lg shrink-0">
                      #{brandDomainRank.rank}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[#0F172A]">
                        {brandName} ranks <span className="text-cyan-600">#{brandDomainRank.rank}</span> of {brandDomainRank.total} cited domains
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {brandDomainRank.rank <= 3
                          ? 'Strong position — AI models frequently cite your content.'
                          : brandDomainRank.rank <= 10
                          ? 'Solid presence — room to climb with more targeted content.'
                          : `${brandDomainRank.rank - 1} domain${brandDomainRank.rank - 1 !== 1 ? 's' : ''} are cited more often. More memos can improve your rank.`}
                      </p>
                    </div>
                    {brandDomainRank.rank > 5 && (
                      <TrendingUp className="h-5 w-5 text-cyan-400 shrink-0" />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 mb-3 rounded-lg border-2 border-amber-200 bg-amber-50/50">
                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">{brandName} is not yet in the cited domains list</p>
                      <p className="text-xs text-muted-foreground">Generate memos to create citable content that AI models can reference.</p>
                    </div>
                  </div>
                )}

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
                                  <div key={prompt.id} className="px-3 py-2.5 flex items-start gap-2">
                                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm">&ldquo;{prompt.query_text}&rdquo;</p>
                                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        {prompt.query_type && (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                            {prompt.query_type.replace(/_/g, ' ')}
                                          </span>
                                        )}
                                        {prompt.funnel_stage && FUNNEL_STAGE_META[prompt.funnel_stage] && (
                                          <span 
                                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                                            style={{ 
                                              backgroundColor: FUNNEL_STAGE_META[prompt.funnel_stage].bgColor, 
                                              color: FUNNEL_STAGE_META[prompt.funnel_stage].color 
                                            }}
                                          >
                                            {FUNNEL_STAGE_META[prompt.funnel_stage].shortLabel}
                                          </span>
                                        )}
                                      </div>
                                    </div>
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
          ) : (
            /* My Content view - show brand's memos and their citation status */
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-200">
                  <p className="text-2xl font-bold text-cyan-700">{myContentCited.length}</p>
                  <p className="text-xs text-cyan-600">Your URLs cited</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border">
                  <p className="text-2xl font-bold text-[#0F172A]">
                    {myContentCited.reduce((sum, c) => sum + c.totalCitations, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total citations</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border">
                  <p className="text-2xl font-bold text-[#0F172A]">
                    {new Set(myContentCited.flatMap(c => c.prompts.map(p => p.id))).size}
                  </p>
                  <p className="text-xs text-muted-foreground">Across prompts</p>
                </div>
              </div>

              {myContentCited.length > 0 ? (
                <div className="space-y-1">
                  {myContentCited.map((entry, i) => {
                    const isExpanded = expandedItem === `my_${entry.url}`
                    const barWidth = myContentCited[0].totalCitations > 0
                      ? (entry.totalCitations / myContentCited[0].totalCitations) * 100
                      : 0
                    
                    return (
                      <div key={entry.url}>
                        <button
                          onClick={() => setExpandedItem(isExpanded ? null : `my_${entry.url}`)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                            <span className="w-6 text-sm font-mono text-muted-foreground text-right shrink-0">
                              {i + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {entry.matchedMemo ? (
                                  <span className="text-sm font-medium text-cyan-600 truncate">
                                    {entry.matchedMemo.title}
                                  </span>
                                ) : (
                                  <span className="text-sm font-medium text-cyan-600 truncate">
                                    {entry.path || entry.url}
                                  </span>
                                )}
                                {entry.matchedMemo && (
                                  <Badge className="text-[10px] px-1.5 py-0 bg-cyan-100 text-cyan-700 shrink-0">
                                    {entry.matchedMemo.memo_type.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                                {isExpanded ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0 opacity-0 group-hover:opacity-100" />
                                )}
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-cyan-500" style={{ width: `${barWidth}%` }} />
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-sm shrink-0">
                              <div className="flex items-center gap-1 font-semibold text-cyan-700" title="Times cited">
                                <Hash className="h-3 w-3 text-cyan-400" />
                                {entry.totalCitations}
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground" title="Across prompts">
                                <MessageSquare className="h-3 w-3" />
                                {entry.promptCount}
                              </div>
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="ml-9 mr-2 mb-3 mt-1 rounded-lg border bg-slate-50/50 overflow-hidden">
                            <div className="px-3 py-2 border-b bg-white">
                              <a
                                href={entry.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1.5"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span className="truncate">{entry.url}</span>
                              </a>
                              <p className="text-xs text-muted-foreground mt-1">
                                Cited {entry.totalCitations} time{entry.totalCitations !== 1 ? 's' : ''} across {entry.promptCount} prompt{entry.promptCount !== 1 ? 's' : ''}
                              </p>
                              {entry.matchedMemo && (
                                <a
                                  href={`/brands/${brandId}/memos/${entry.matchedMemo.id}`}
                                  className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1 mt-1"
                                >
                                  <FileText className="h-3 w-3" />
                                  Edit memo: {entry.matchedMemo.title}
                                </a>
                              )}
                            </div>
                            
                            <div className="px-3 py-2 bg-white border-b">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                Prompts citing this content
                              </p>
                            </div>
                            <div className="divide-y">
                              {entry.prompts.slice(0, 15).map((prompt) => (
                                <div key={prompt.id} className="px-3 py-2.5 flex items-start gap-2">
                                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm">&ldquo;{prompt.query_text}&rdquo;</p>
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                      {prompt.funnel_stage && FUNNEL_STAGE_META[prompt.funnel_stage] && (
                                        <span 
                                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                                          style={{ 
                                            backgroundColor: FUNNEL_STAGE_META[prompt.funnel_stage].bgColor, 
                                            color: FUNNEL_STAGE_META[prompt.funnel_stage].color 
                                          }}
                                        >
                                          {FUNNEL_STAGE_META[prompt.funnel_stage].shortLabel}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              {entry.prompts.length > 15 && (
                                <div className="px-3 py-2 text-xs text-muted-foreground">
                                  +{entry.prompts.length - 15} more prompts
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No content from {brandName} cited yet</p>
                  <p className="text-sm mt-1">
                    AI models haven&apos;t cited your domain or memos in the selected period.
                  </p>
                  <p className="text-sm mt-0.5">
                    Generate memos targeting top-cited topics to start appearing in AI responses.
                  </p>
                </div>
              )}

              {/* Uncited memos - show memos that exist but aren't being cited yet */}
              {memos.length > 0 && (() => {
                const citedMemoIds = new Set(myContentCited.filter(e => e.matchedMemo).map(e => e.matchedMemo!.id))
                const uncitedMemos = memos.filter(m => m.status === 'published' && !citedMemoIds.has(m.id))
                
                if (uncitedMemos.length === 0) return null
                
                return (
                  <div className="pt-4 border-t">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Published memos not yet cited ({uncitedMemos.length})
                    </p>
                    <div className="space-y-1">
                      {uncitedMemos.slice(0, 10).map(memo => (
                        <div key={memo.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <a
                            href={`/brands/${brandId}/memos/${memo.id}`}
                            className="text-sm text-slate-700 hover:text-cyan-600 truncate flex-1"
                          >
                            {memo.title}
                          </a>
                          <Badge className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-500 shrink-0">
                            {memo.memo_type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      ))}
                      {uncitedMemos.length > 10 && (
                        <p className="text-xs text-muted-foreground pl-6">
                          +{uncitedMemos.length - 10} more published memos
                        </p>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
          {/* Funnel Breakdown */}
          <div className="mt-8 pt-6 border-t">
            <div className="mb-4">
              <h3 className="text-base font-semibold">Visibility by Funnel Stage</h3>
              <p className="text-sm text-muted-foreground">
                Where in the buyer journey is {brandName} visible — and where are the gaps?
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {funnelStats.map(({ stage, meta, queryCount, scanCount, mentionRate, citationRate, scansWithCitations, topDomains, memoCount, publishedMemos, sentiment, sentimentScore, avgPosition }) => {
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
          </div>
        </CardContent>
      </Card>

      {/* Generation Modal */}
      {genModal && (
        <MemoGenerationModal
          brandId={brandId}
          brandName={brandName}
          brandSubdomain={brandSubdomain}
          isOpen={genModal.isOpen}
          onClose={closeGenModal}
          citedUrl={genModal.citedUrl}
          citedDomain={genModal.citedDomain}
          citationCount={genModal.citationCount}
          promptTexts={genModal.promptTexts}
        />
      )}
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

// ─── Terminal-style memo generation modal ────────────────────────────────

interface ProgressLine {
  id: string
  text: string
  type: 'info' | 'success' | 'working' | 'result'
}

function MemoGenerationModal({
  brandId,
  brandName,
  brandSubdomain,
  isOpen,
  onClose,
  citedUrl,
  citedDomain,
  citationCount,
  promptTexts,
}: {
  brandId: string
  brandName: string
  brandSubdomain: string
  isOpen: boolean
  onClose: () => void
  citedUrl: string
  citedDomain: string
  citationCount: number
  promptTexts: string[]
}) {
  const [progressLines, setProgressLines] = useState<ProgressLine[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedMemo, setGeneratedMemo] = useState<{
    id: string
    title: string
    slug: string
    memo_type: string
  } | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const lineIdRef = useRef(0)
  const baselineCountRef = useRef(0)
  const isCompleteRef = useRef(false)

  // Auto-scroll
  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight
    }
  }, [progressLines])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      timersRef.current.forEach(t => clearTimeout(t))
    }
  }, [])

  const addLine = useCallback((text: string, type: ProgressLine['type'] = 'info') => {
    const id = `line-${lineIdRef.current++}`
    setProgressLines(prev => [...prev, { id, text, type }])
  }, [])

  // Start generation when modal opens
  useEffect(() => {
    if (!isOpen || hasStarted) return
    setHasStarted(true)

    const startGeneration = async () => {
      // Add context lines
      addLine(`▶ GENERATING MEMO`, 'info')
      addLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info')
      addLine(``, 'info')
      addLine(`Responding to: ${citedDomain}`, 'result')
      addLine(`Citation count: ${citationCount}x`, 'result')
      addLine(`URL: ${citedUrl.length > 60 ? citedUrl.slice(0, 57) + '...' : citedUrl}`, 'info')
      
      if (promptTexts.length > 0) {
        addLine(``, 'info')
        addLine(`Triggered by prompts:`, 'info')
        promptTexts.slice(0, 3).forEach(pt => {
          addLine(`  "${pt.length > 70 ? pt.slice(0, 67) + '...' : pt}"`, 'info')
        })
        if (promptTexts.length > 3) {
          addLine(`  +${promptTexts.length - 3} more...`, 'info')
        }
      }

      addLine(``, 'info')

      // Get baseline memo count
      try {
        const countRes = await fetch(`/api/brands/${brandId}/memo-count`)
        if (countRes.ok) {
          const { count } = await countRes.json()
          baselineCountRef.current = count
        }
      } catch {
        // Continue anyway
      }

      // Fire the generation API
      try {
        addLine(`Sending generation request...`, 'working')
        
        const res = await fetch(`/api/brands/${brandId}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'respond_to_citation',
            url: citedUrl,
          }),
        })
        const data = await res.json()
        
        if (!res.ok) {
          throw new Error(data.error || 'Generation failed')
        }

        addLine(`Generation started`, 'success')
        addLine(``, 'info')

        // Schedule progress messages
        const steps = [
          { delay: 2000, text: 'Fetching cited content from source URL...', type: 'working' as const },
          { delay: 6000, text: 'Analyzing content structure and key claims...', type: 'working' as const },
          { delay: 11000, text: 'Loading brand context and voice insights...', type: 'working' as const },
          { delay: 17000, text: 'Generating strategic variation with brand positioning...', type: 'working' as const },
          { delay: 25000, text: 'Writing differentiated content to outperform source...', type: 'working' as const },
          { delay: 35000, text: 'Generating meta description and schema...', type: 'working' as const },
          { delay: 50000, text: 'Publishing and creating version history...', type: 'working' as const },
        ]

        timersRef.current = steps.map(step =>
          setTimeout(() => {
            if (!isCompleteRef.current) addLine(step.text, step.type)
          }, step.delay)
        )

        // Poll for completion
        pollRef.current = setInterval(async () => {
          try {
            const pollRes = await fetch(`/api/brands/${brandId}/memo-count?include_latest=true`)
            if (pollRes.ok) {
              const { count, latest } = await pollRes.json()
              if (count > baselineCountRef.current && latest) {
                // Memo is ready!
                if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
                timersRef.current.forEach(t => clearTimeout(t))
                
                addLine(``, 'info')
                addLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info')
                addLine(`✓ MEMO GENERATED SUCCESSFULLY`, 'success')
                addLine(``, 'info')
                addLine(`Title: ${latest.title}`, 'result')
                addLine(`Type: ${(latest.memo_type || '').replace(/_/g, ' ')}`, 'info')
                addLine(`Status: ${latest.status}`, 'info')
                
                setGeneratedMemo(latest)
                isCompleteRef.current = true
                setIsComplete(true)
              }
            }
          } catch {
            // Retry silently
          }
        }, 3000)

        // Timeout after 2 minutes
        timersRef.current.push(
          setTimeout(() => {
            if (!isCompleteRef.current && pollRef.current) {
              clearInterval(pollRef.current)
              pollRef.current = null
              addLine(``, 'info')
              addLine(`⏱ Generation is taking longer than expected.`, 'info')
              addLine(`The memo may still be processing. Check the Memos tab.`, 'info')
              isCompleteRef.current = true
              setIsComplete(true)
            }
          }, 120000)
        )
      } catch (err) {
        addLine(``, 'info')
        addLine(`⚠️ Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'info')
        setError(err instanceof Error ? err.message : 'Generation failed')
        isCompleteRef.current = true
        setIsComplete(true)
      }
    }

    startGeneration()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleClose = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    timersRef.current.forEach(t => clearTimeout(t))
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 border-[3px] border-[#0F172A] rounded-none overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Generate Memo</DialogTitle>
        </VisuallyHidden>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#0F172A] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0EA5E9] rounded-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold tracking-wide">GENERATE MEMO</h2>
              <p className="text-sm text-slate-300">{brandName} — responding to {citedDomain}</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Log */}
        <div 
          ref={progressRef}
          className="h-72 overflow-y-auto bg-[#1a1b26] p-4 font-mono text-sm"
        >
          {progressLines.map((line) => (
            <div key={line.id} className="flex items-start gap-2 py-0.5">
              {line.type === 'working' && (
                <Loader2 className="h-4 w-4 text-[#F59E0B] animate-spin shrink-0 mt-0.5" />
              )}
              {line.type === 'success' && (
                <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
              )}
              {line.type === 'info' && line.text && !line.text.startsWith('━') && !line.text.startsWith('▶') && (
                <span className="text-slate-500 shrink-0">→</span>
              )}
              {line.type === 'result' && (
                <span className="text-[#0EA5E9] shrink-0">•</span>
              )}
              <span className={
                line.type === 'success' ? 'text-[#10B981] font-bold' :
                line.type === 'working' ? 'text-[#F59E0B]' :
                line.type === 'result' ? 'text-[#0EA5E9]' :
                line.text.startsWith('▶') ? 'text-[#7aa2f7] font-bold' :
                line.text.startsWith('━') ? 'text-[#7aa2f7]' :
                'text-slate-400'
              }>
                {line.text}
              </span>
            </div>
          ))}
          
          {/* Blinking cursor when running */}
          {!isComplete && hasStarted && (
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-4 bg-[#0EA5E9] animate-pulse" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0F172A] px-4 py-3 border-t border-slate-700">
          <div className="flex items-center justify-between">
            {isComplete && generatedMemo ? (
              <div className="flex items-center gap-2 w-full">
                <a
                  href={`/brands/${brandId}/memos/${generatedMemo.id}`}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#0EA5E9] text-white text-sm font-semibold rounded hover:bg-[#0284C7] transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Memo
                </a>
                <a
                  href={`/memo/${brandSubdomain}/${generatedMemo.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 text-white text-sm font-semibold rounded hover:bg-slate-600 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View Memo
                </a>
                <div className="flex-1" />
                <span className="font-mono text-sm text-[#10B981]">● COMPLETE</span>
              </div>
            ) : isComplete && error ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-red-400">{error}</span>
                <button
                  onClick={handleClose}
                  className="px-3 py-2 bg-slate-700 text-white text-sm font-semibold rounded hover:bg-slate-600 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : isComplete ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-slate-400">Check the Memos tab for your new content.</span>
                <a
                  href={`/brands/${brandId}/memos`}
                  className="px-3 py-2 bg-[#0EA5E9] text-white text-sm font-semibold rounded hover:bg-[#0284C7] transition-colors"
                >
                  Go to Memos
                </a>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-[#F59E0B] animate-spin" />
                  <span className="text-sm text-slate-400">Generating memo...</span>
                </div>
                <span className="font-mono text-sm text-[#F59E0B]">● GENERATING</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
