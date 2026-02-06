'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink,
  Search,
  FileText,
  Users,
  Eye,
  Radio,
  Flame,
  ChevronDown,
  Settings2,
  Filter,
  Zap,
  RefreshCw,
  Circle,
} from 'lucide-react'
import type { FeedEvent, FeedResponse, FeedWorkflow } from '@/lib/feed/types'

interface BrandLiveFeedProps {
  brandId: string
  brandName: string
  brandDomain: string
  stats: {
    citationScore: number
    promptCount: number
    memoCount: number
    scanCount: number
    entityCount: number
  }
}

type FeedFilter = 'all' | 'scans' | 'memos' | 'entities' | 'monitoring' | 'actions'

interface FilterConfig {
  id: FeedFilter
  label: string
  icon: React.ReactNode
  workflows: FeedWorkflow[] | null // null = all
}

const FILTERS: FilterConfig[] = [
  { id: 'all', label: 'ALL', icon: <Radio className="h-3 w-3" />, workflows: null },
  { id: 'scans', label: 'SCANS', icon: <Search className="h-3 w-3" />, workflows: ['core_discovery'] },
  { id: 'memos', label: 'MEMOS', icon: <FileText className="h-3 w-3" />, workflows: ['verification'] },
  { id: 'entities', label: 'ENTITIES', icon: <Users className="h-3 w-3" />, workflows: ['network_expansion'] },
  { id: 'monitoring', label: 'WATCH', icon: <Eye className="h-3 w-3" />, workflows: ['competitive_response'] },
  { id: 'actions', label: 'ACTION', icon: <AlertTriangle className="h-3 w-3" />, workflows: null },
]

// Map event types to terminal-style line rendering
function getEventStyle(event: FeedEvent): { 
  prefix: string
  color: string 
  icon: 'success' | 'warning' | 'info' | 'working' | 'action'
} {
  const type = event.event_type
  const severity = event.severity

  // First citation / big wins
  if (type === 'first_citation') {
    return { prefix: 'WIN', color: 'text-emerald-400', icon: 'success' }
  }
  if (type === 'citation_verified') {
    return { prefix: 'VERIFIED', color: 'text-emerald-400', icon: 'success' }
  }
  if (type === 'streak_milestone') {
    return { prefix: 'STREAK', color: 'text-amber-400', icon: 'success' }
  }
  if (type === 'position_improved') {
    return { prefix: 'UP', color: 'text-emerald-400', icon: 'success' }
  }

  // Losses / warnings
  if (type === 'citation_lost') {
    return { prefix: 'LOST', color: 'text-red-400', icon: 'warning' }
  }
  if (type === 'verification_failed') {
    return { prefix: 'FAIL', color: 'text-red-400', icon: 'warning' }
  }

  // Gaps / action needed
  if (type === 'gap_identified' || severity === 'action_required') {
    return { prefix: 'GAP', color: 'text-amber-400', icon: 'action' }
  }

  // Scans
  if (type === 'scan_complete') {
    return { prefix: 'SCAN', color: 'text-sky-400', icon: 'success' }
  }
  if (type === 'prompt_scanned') {
    const data = event.data?.prompt
    if (data?.cited) {
      return { prefix: 'CITED', color: 'text-emerald-400', icon: 'success' }
    }
    if (data?.mentioned) {
      return { prefix: 'MENTIONED', color: 'text-sky-400', icon: 'info' }
    }
    return { prefix: 'GAP', color: 'text-amber-400', icon: 'action' }
  }

  // Entities
  if (type === 'competitor_discovered' || type === 'new_competitor_found') {
    return { prefix: 'ENTITY', color: 'text-purple-400', icon: 'info' }
  }

  // Content / competitive
  if (type === 'competitor_published') {
    return { prefix: 'WATCH', color: 'text-orange-400', icon: 'warning' }
  }
  if (type === 'response_drafted' || type === 'response_published') {
    return { prefix: 'MEMO', color: 'text-violet-400', icon: 'success' }
  }

  // Opportunities
  if (type === 'opportunity_found' || type === 'coverage_gap') {
    return { prefix: 'OPPORTUNITY', color: 'text-emerald-400', icon: 'info' }
  }

  // Context/setup
  if (type === 'context_extracted') {
    return { prefix: 'CONTEXT', color: 'text-sky-400', icon: 'success' }
  }
  if (type === 'competitors_discovered') {
    return { prefix: 'DISCOVER', color: 'text-purple-400', icon: 'success' }
  }
  if (type === 'prompt_generated') {
    return { prefix: 'PROMPT', color: 'text-sky-400', icon: 'success' }
  }

  // System
  if (event.workflow === 'system') {
    return { prefix: 'SYS', color: 'text-slate-400', icon: 'info' }
  }

  // Severity-based fallback
  const sev = severity as string
  if (sev === 'success') return { prefix: 'OK', color: 'text-emerald-400', icon: 'success' }
  if (sev === 'warning') return { prefix: 'WARN', color: 'text-amber-400', icon: 'warning' }
  if (sev === 'action_required') return { prefix: 'ACTION', color: 'text-red-400', icon: 'action' }

  return { prefix: 'INFO', color: 'text-slate-400', icon: 'info' }
}

function EventIcon({ type }: { type: 'success' | 'warning' | 'info' | 'working' | 'action' }) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
    case 'warning':
      return <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
    case 'action':
      return <Zap className="h-3.5 w-3.5 text-red-400 shrink-0" />
    case 'working':
      return <Loader2 className="h-3.5 w-3.5 text-sky-400 animate-spin shrink-0" />
    default:
      return <Circle className="h-3 w-3 text-slate-500 shrink-0" />
  }
}

export function BrandLiveFeed({ 
  brandId, 
  brandName,
  brandDomain,
  stats,
}: BrandLiveFeedProps) {
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FeedFilter>('all')
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isPolling, setIsPolling] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const fetchFeed = useCallback(async (cursor?: string) => {
    try {
      const params = new URLSearchParams({ brandId, limit: '30' })
      
      // Apply filter
      const filterConfig = FILTERS.find(f => f.id === filter)
      if (filter === 'actions') {
        params.set('severity', 'action_required')
      } else if (filterConfig?.workflows) {
        params.set('workflow', filterConfig.workflows[0])
      }
      
      if (cursor) params.set('cursor', cursor)
      
      const res = await fetch(`/api/v2/feed?${params}`)
      if (!res.ok) return null
      const data: FeedResponse = await res.json()
      return data
    } catch {
      return null
    }
  }, [brandId, filter])

  // Initial load
  useEffect(() => {
    setLoading(true)
    fetchFeed().then(data => {
      if (data) {
        setEvents(data.items)
        setHasMore(data.has_more)
        setNextCursor(data.next_cursor)
      }
      setLoading(false)
      setLastRefresh(new Date())
    })
  }, [fetchFeed])

  // Poll for new events every 10 seconds
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      setIsPolling(true)
      const data = await fetchFeed()
      if (data && data.items.length > 0) {
        setEvents(prev => {
          const existingIds = new Set(prev.map(e => e.id))
          const newItems = data.items.filter(e => !existingIds.has(e.id))
          if (newItems.length > 0) {
            return [...newItems, ...prev]
          }
          return prev
        })
      }
      setIsPolling(false)
      setLastRefresh(new Date())
    }, 10000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchFeed])

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    const data = await fetchFeed(nextCursor)
    if (data) {
      setEvents(prev => [...prev, ...data.items])
      setHasMore(data.has_more)
      setNextCursor(data.next_cursor)
    }
    setLoadingMore(false)
  }

  const handleAction = async (eventId: string, action: string) => {
    try {
      const res = await fetch('/api/v2/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, action }),
      })
      if (res.ok) {
        // Update the event in the list
        setEvents(prev => prev.map(e => 
          e.id === eventId 
            ? { ...e, action_taken: action, action_taken_at: new Date().toISOString() } as FeedEvent
            : e
        ))
      }
    } catch {
      // Silently fail
    }
  }

  const triggerAction = async (action: string) => {
    try {
      await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      // Trigger a refresh
      const data = await fetchFeed()
      if (data) {
        setEvents(data.items)
        setHasMore(data.has_more)
        setNextCursor(data.next_cursor)
      }
    } catch {
      // Silently fail
    }
  }

  return (
    <div className="w-full">
      {/* Terminal Container */}
      <div className="border-[3px] border-[#0F172A] overflow-hidden">
        
        {/* Terminal Header */}
        <div className="bg-[#0F172A] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <span className="font-mono text-sm font-bold text-white tracking-wider">
              {brandName.toUpperCase()}
            </span>
            <span className="font-mono text-xs text-slate-500">{brandDomain}</span>
          </div>
          <div className="flex items-center gap-2">
            {isPolling && <Loader2 className="h-3 w-3 text-sky-400 animate-spin" />}
            <span className="font-mono text-[10px] text-slate-500">
              {format(lastRefresh, 'HH:mm:ss')}
            </span>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-[#1e2030] px-4 py-2 border-b border-slate-700/50 flex items-center gap-6 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-sky-400 font-bold">{stats.citationScore}%</span>
            <span className="text-slate-500">cited</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300 font-bold">{stats.promptCount}</span>
            <span className="text-slate-500">prompts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300 font-bold">{stats.memoCount}</span>
            <span className="text-slate-500">memos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300 font-bold">{stats.scanCount}</span>
            <span className="text-slate-500">scans</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300 font-bold">{stats.entityCount}</span>
            <span className="text-slate-500">entities</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => triggerAction('run_scan')}
              className="flex items-center gap-1.5 px-2 py-1 bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 transition-colors rounded text-[10px] font-bold tracking-wider"
            >
              <Search className="h-3 w-3" />
              SCAN
            </button>
            <button
              onClick={() => triggerAction('generate_queries')}
              className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors rounded text-[10px] font-bold tracking-wider"
            >
              <Zap className="h-3 w-3" />
              GENERATE
            </button>
            <a
              href={`/brands/${brandId}/settings`}
              className="flex items-center gap-1.5 px-2 py-1 bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 transition-colors rounded text-[10px] font-bold tracking-wider"
            >
              <Settings2 className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#1a1b26] px-4 py-2 border-b border-slate-700/50 flex items-center gap-1">
          <Filter className="h-3 w-3 text-slate-600 mr-1" />
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[10px] font-bold tracking-wider transition-colors ${
                filter === f.id 
                  ? 'bg-sky-500/20 text-sky-400' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/30'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>

        {/* Feed Content */}
        <div 
          ref={feedRef}
          className="bg-[#1a1b26] min-h-[60vh] max-h-[70vh] overflow-y-auto font-mono text-sm"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-6 w-6 text-sky-400 animate-spin" />
              <span className="text-slate-500 text-xs">Loading feed...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="text-slate-600 text-center">
                <Radio className="h-8 w-8 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400 text-sm font-bold">NO EVENTS YET</p>
                <p className="text-slate-600 text-xs mt-1">
                  Run a scan or generate prompts to see activity here
                </p>
              </div>
              <button
                onClick={() => triggerAction('run_scan')}
                className="flex items-center gap-2 px-4 py-2 bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 transition-colors rounded text-xs font-bold tracking-wider"
              >
                <Search className="h-3.5 w-3.5" />
                RUN FIRST SCAN
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {events.map((event, idx) => {
                const style = getEventStyle(event)
                const isActioned = !!event.action_taken
                const timeAgo = formatDistanceToNow(new Date(event.created_at), { addSuffix: true })
                const timestamp = format(new Date(event.created_at), 'HH:mm')
                
                return (
                  <div 
                    key={event.id} 
                    className={`group px-4 py-2.5 hover:bg-slate-800/30 transition-colors ${
                      isActioned ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Timestamp */}
                      <span className="text-[10px] text-slate-600 font-mono w-12 shrink-0 pt-0.5 tabular-nums">
                        {timestamp}
                      </span>
                      
                      {/* Icon */}
                      <EventIcon type={style.icon} />
                      
                      {/* Event tag */}
                      <span className={`text-[10px] font-bold tracking-wider w-20 shrink-0 pt-0.5 ${style.color}`}>
                        {style.prefix}
                      </span>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-slate-200 text-xs leading-relaxed">
                              {event.title}
                            </span>
                            {event.description && (
                              <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                                {event.description}
                              </p>
                            )}
                            
                            {/* Streak badge */}
                            {event.data?.prompt?.streak && event.data.prompt.streak >= 3 && (
                              <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] rounded">
                                <Flame className="h-3 w-3" />
                                {event.data.prompt.streak}x streak
                              </span>
                            )}
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            {!isActioned && event.action_available?.includes('generate_memo') && (
                              <button
                                onClick={() => handleAction(event.id, 'generate_memo')}
                                className="px-2 py-1 bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 text-[10px] font-bold tracking-wider rounded transition-colors"
                              >
                                MEMO
                              </button>
                            )}
                            {!isActioned && event.action_available?.includes('exclude_prompt') && (
                              <button
                                onClick={() => handleAction(event.id, 'exclude_prompt')}
                                className="px-2 py-1 bg-slate-500/20 text-slate-500 hover:bg-slate-500/30 text-[10px] font-bold tracking-wider rounded transition-colors"
                              >
                                SKIP
                              </button>
                            )}
                            {!isActioned && event.action_available?.includes('dismiss') && (
                              <button
                                onClick={() => handleAction(event.id, 'dismiss')}
                                className="px-2 py-1 bg-slate-500/20 text-slate-500 hover:bg-slate-500/30 text-[10px] font-bold tracking-wider rounded transition-colors"
                              >
                                DISMISS
                              </button>
                            )}
                            {isActioned && (
                              <span className="text-[10px] text-slate-600 italic">
                                {event.action_taken}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Time ago */}
                      <span className="text-[10px] text-slate-600 shrink-0 pt-0.5">
                        {timeAgo}
                      </span>
                    </div>
                  </div>
                )
              })}

              {/* Load More */}
              {hasMore && (
                <div className="px-4 py-3 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700/30 text-slate-400 hover:bg-slate-700/50 text-xs font-mono font-bold tracking-wider rounded transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        LOADING...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        LOAD MORE
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Blinking cursor */}
          {!loading && events.length > 0 && (
            <div className="px-4 py-2 flex items-center gap-2">
              <span className="w-2 h-4 bg-sky-400/80 animate-pulse" />
              <span className="text-[10px] text-slate-600">Monitoring...</span>
            </div>
          )}
        </div>

        {/* Status Footer */}
        <div className="bg-[#0F172A] px-4 py-2 border-t border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
            <span className="text-slate-500">
              {events.length} events loaded
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500">
            <span>Polling every 10s</span>
            <button
              onClick={async () => {
                setIsPolling(true)
                const data = await fetchFeed()
                if (data) {
                  setEvents(data.items)
                  setHasMore(data.has_more)
                  setNextCursor(data.next_cursor)
                }
                setIsPolling(false)
                setLastRefresh(new Date())
              }}
              className="flex items-center gap-1 text-slate-400 hover:text-sky-400 transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${isPolling ? 'animate-spin' : ''}`} />
              REFRESH
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
