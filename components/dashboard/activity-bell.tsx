'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity, CheckCheck } from 'lucide-react'
import { ActivityFeed } from './activity-feed'

interface ActivityBellProps {
  brandId: string
  brandName: string
}

export function ActivityBell({ brandId, brandName }: ActivityBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const storageKey = `activity_last_seen_${brandId}`

  const fetchUnreadCount = useCallback(async () => {
    try {
      const lastSeen = localStorage.getItem(storageKey)
      const params = new URLSearchParams({
        brands: brandId,
        limit: '1',
        offset: '0',
      })
      if (lastSeen) {
        params.set('start', lastSeen)
      }
      const res = await fetch(`/api/activity?${params}`)
      if (!res.ok) return
      const data = await res.json()
      // total is the count of activities matching the filter
      setUnreadCount(lastSeen ? (data.total || 0) : Math.min(data.total || 0, 9))
    } catch {
      // silent
    }
  }, [brandId, storageKey])

  useEffect(() => {
    fetchUnreadCount()
  }, [fetchUnreadCount])

  const handleOpen = () => {
    setIsOpen(true)
    // Mark as seen
    localStorage.setItem(storageKey, new Date().toISOString())
    setUnreadCount(0)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Update last seen when closing
      localStorage.setItem(storageKey, new Date().toISOString())
      setUnreadCount(0)
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative p-2 text-zinc-400 hover:text-[#0F172A] transition-colors"
        title="Activity"
      >
        <Activity className="h-5 w-5" strokeWidth={2.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#0EA5E9] text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      <ActivityFeed
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        brands={[{ id: brandId, name: brandName }]}
      />
    </>
  )
}
