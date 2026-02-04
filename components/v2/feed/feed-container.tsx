'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FeedItem } from './feed-item'
import { FeedFilters } from './feed-filters'
import { FeedEmpty } from './feed-empty'
import { FeedSkeleton } from './feed-skeleton'
import { FeedDetailDrawer } from './feed-detail-drawer'
import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { FeedEvent, FeedWorkflow, FeedSeverity, FeedResponse, FeedAction } from '@/lib/feed/types'

interface FeedContainerProps {
  brandId?: string
}

export function FeedContainer({ brandId }: FeedContainerProps) {
  const searchParams = useSearchParams()
  const urlWorkflow = searchParams.get('workflow') as FeedWorkflow | null
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  
  // Filters - sync with URL param
  const [workflow, setWorkflow] = useState<FeedWorkflow | 'all'>(urlWorkflow || 'all')
  
  // Update workflow when URL changes
  useEffect(() => {
    setWorkflow(urlWorkflow || 'all')
  }, [urlWorkflow])
  const [severity, setSeverity] = useState<FeedSeverity | 'all'>('all')
  const [unreadOnly, setUnreadOnly] = useState(false)
  
  // Real-time new events buffer
  const [newEvents, setNewEvents] = useState<FeedEvent[]>([])
  
  // Drawer state
  const [selectedEvent, setSelectedEvent] = useState<FeedEvent | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  
  const supabase = createClient()
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch feed
  const fetchFeed = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true)
        setCursor(null)
      } else {
        setLoadingMore(true)
      }
      
      const params = new URLSearchParams()
      if (brandId) params.set('brandId', brandId)
      if (!reset && cursor) params.set('cursor', cursor)
      params.set('limit', '20')
      if (workflow !== 'all') params.set('workflow', workflow)
      if (severity !== 'all') params.set('severity', severity)
      if (unreadOnly) params.set('unreadOnly', 'true')
      
      const response = await fetch(`/api/v2/feed?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch feed')
      }
      
      const data: FeedResponse = await response.json()
      
      if (reset) {
        setEvents(data.items)
      } else {
        setEvents(prev => [...prev, ...data.items])
      }
      
      setHasMore(data.has_more)
      setCursor(data.next_cursor)
      setUnreadCount(data.unread_count)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [brandId, cursor, workflow, severity, unreadOnly])

  // Initial load and filter changes
  useEffect(() => {
    fetchFeed(true)
  }, [brandId, workflow, severity, unreadOnly])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('feed_events_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feed_events',
          filter: brandId ? `brand_id=eq.${brandId}` : undefined,
        },
        (payload) => {
          const newEvent = payload.new as FeedEvent
          
          // Check if event matches current filters
          if (workflow !== 'all' && newEvent.workflow !== workflow) return
          if (severity !== 'all' && newEvent.severity !== severity) return
          if (unreadOnly && newEvent.read) return
          
          // Add to new events buffer (shown at top)
          setNewEvents(prev => [newEvent, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'feed_events',
          filter: brandId ? `brand_id=eq.${brandId}` : undefined,
        },
        (payload) => {
          const updatedEvent = payload.new as FeedEvent
          
          // Update in main events list
          setEvents(prev => prev.map(e => 
            e.id === updatedEvent.id ? updatedEvent : e
          ))
          
          // Update in new events buffer
          setNewEvents(prev => prev.map(e => 
            e.id === updatedEvent.id ? updatedEvent : e
          ))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, brandId, workflow, severity, unreadOnly])

  // Merge new events into main list
  const mergeNewEvents = () => {
    setEvents(prev => [...newEvents, ...prev])
    setNewEvents([])
  }

  // Mark event as read
  const markAsRead = async (eventIds: string[]) => {
    try {
      await fetch('/api/v2/feed', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_ids: eventIds, action: 'mark_read' }),
      })
      
      // Update local state
      setEvents(prev => prev.map(e => 
        eventIds.includes(e.id) ? { ...e, read: true } : e
      ))
      setNewEvents(prev => prev.map(e => 
        eventIds.includes(e.id) ? { ...e, read: true } : e
      ))
      setUnreadCount(prev => Math.max(0, prev - eventIds.length))
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }

  // Dismiss event
  const dismissEvent = async (eventId: string) => {
    try {
      await fetch('/api/v2/feed', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_ids: [eventId], action: 'dismiss' }),
      })
      
      // Remove from local state
      setEvents(prev => prev.filter(e => e.id !== eventId))
      setNewEvents(prev => prev.filter(e => e.id !== eventId))
    } catch (err) {
      console.error('Failed to dismiss:', err)
    }
  }

  // Open detail drawer
  const openDetail = (event: FeedEvent) => {
    setSelectedEvent(event)
    setDrawerOpen(true)
    // Mark as read when viewing details
    if (!event.read) {
      markAsRead([event.id])
    }
  }

  // Take action on event
  const takeAction = async (eventId: string, action: FeedAction) => {
    const event = [...events, ...newEvents].find(e => e.id === eventId)
    
    try {
      const response = await fetch('/api/v2/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, action }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Action failed')
      }
      
      const result = await response.json()
      
      // Mark as actioned locally
      setEvents(prev => prev.map(e => 
        e.id === eventId ? { ...e, read: true, action_taken: action, action_taken_at: new Date().toISOString() } : e
      ))
      setNewEvents(prev => prev.map(e => 
        e.id === eventId ? { ...e, read: true, action_taken: action, action_taken_at: new Date().toISOString() } : e
      ))
      
      // Show success message based on action
      if (action === 'generate_memo') {
        toast.success('Memo generation started', {
          description: 'You\'ll see it in your feed when ready',
        })
      } else if (action === 'dismiss') {
        toast.info('Event dismissed')
      }
      
      return result
    } catch (err) {
      console.error('Action failed:', err)
      toast.error('Action failed', {
        description: err instanceof Error ? err.message : 'Please try again',
      })
      throw err
    }
  }

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || loadingMore || !hasMore) return
      
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current
      if (scrollHeight - scrollTop <= clientHeight * 1.5) {
        fetchFeed(false)
      }
    }
    
    const container = containerRef.current
    container?.addEventListener('scroll', handleScroll)
    return () => container?.removeEventListener('scroll', handleScroll)
  }, [fetchFeed, loadingMore, hasMore])

  // Group events by date
  const groupEventsByDate = (events: FeedEvent[]) => {
    const groups: { label: string; events: FeedEvent[] }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)
    
    let currentGroup: { label: string; events: FeedEvent[] } | null = null
    
    events.forEach(event => {
      const eventDate = new Date(event.created_at)
      eventDate.setHours(0, 0, 0, 0)
      
      let label: string
      if (eventDate.getTime() === today.getTime()) {
        label = 'Today'
      } else if (eventDate.getTime() === yesterday.getTime()) {
        label = 'Yesterday'
      } else if (eventDate >= lastWeek) {
        label = 'This Week'
      } else {
        label = eventDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
      }
      
      if (!currentGroup || currentGroup.label !== label) {
        currentGroup = { label, events: [] }
        groups.push(currentGroup)
      }
      currentGroup.events.push(event)
    })
    
    return groups
  }

  const allEvents = [...newEvents, ...events]
  const groupedEvents = groupEventsByDate(allEvents)

  if (loading) {
    return <FeedSkeleton />
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => fetchFeed(true)} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <FeedFilters
        workflow={workflow}
        setWorkflow={setWorkflow}
        severity={severity}
        setSeverity={setSeverity}
        unreadOnly={unreadOnly}
        setUnreadOnly={setUnreadOnly}
        unreadCount={unreadCount}
        onRefresh={() => fetchFeed(true)}
      />
      
      {/* New events banner */}
      {newEvents.length > 0 && (
        <button
          onClick={mergeNewEvents}
          className="mx-6 mb-4 py-2 px-4 bg-[#0EA5E9] text-white rounded-lg text-sm font-medium hover:bg-[#0284C7] transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {newEvents.length} new update{newEvents.length > 1 ? 's' : ''}
        </button>
      )}
      
      {/* Feed */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto px-6 pb-6"
      >
        {allEvents.length === 0 ? (
          <FeedEmpty />
        ) : (
          <div className="space-y-6">
            {groupedEvents.map((group, groupIndex) => (
              <div key={`${group.label}-${groupIndex}`}>
                {/* Date header */}
                <div className="sticky top-0 bg-slate-50 py-2 z-10">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {group.label}
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                </div>
                
                {/* Events */}
                <div className="space-y-3">
                  {group.events.map(event => (
                    <FeedItem
                      key={event.id}
                      event={event}
                      onMarkRead={() => markAsRead([event.id])}
                      onDismiss={() => dismissEvent(event.id)}
                      onAction={(action) => takeAction(event.id, action)}
                      onViewDetails={() => openDetail(event)}
                    />
                  ))}
                </div>
              </div>
            ))}
            
            {/* Load more */}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-[#0EA5E9]" />
              </div>
            )}
            
            {!hasMore && allEvents.length > 0 && (
              <p className="text-center text-sm text-slate-400 py-4">
                No more events
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Detail Drawer */}
      <FeedDetailDrawer
        event={selectedEvent}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          setSelectedEvent(null)
        }}
        onAction={takeAction}
      />
    </div>
  )
}
