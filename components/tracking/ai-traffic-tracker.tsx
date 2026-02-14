'use client'

import { useEffect } from 'react'

interface AITrafficTrackerProps {
  brandId: string
  memoId?: string
}

export function AITrafficTracker({ brandId, memoId }: AITrafficTrackerProps) {
  useEffect(() => {
    // Only track on client side
    if (typeof window === 'undefined') return

    // Skip internal traffic (logged-in dashboard users)
    if (document.cookie.includes('cm_internal')) return

    const track = async () => {
      try {
        await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandId,
            memoId,
            pageUrl: window.location.href,
            referrer: document.referrer || null,
          }),
        })
      } catch (e) {
        // Fail silently - tracking shouldn't break the page
        console.debug('Tracking failed:', e)
      }
    }

    // Track after a short delay to ensure page has loaded
    const timer = setTimeout(track, 100)
    return () => clearTimeout(timer)
  }, [brandId, memoId])

  // This component renders nothing
  return null
}
