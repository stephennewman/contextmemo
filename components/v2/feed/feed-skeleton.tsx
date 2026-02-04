'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function FeedSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {/* Date header skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-16" />
        <div className="flex-1 h-px bg-slate-200" />
      </div>
      
      {/* Feed item skeletons */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="border-l-4 border-slate-200 rounded-r-lg bg-white p-4">
          <div className="flex items-start gap-3">
            {/* Icon skeleton */}
            <Skeleton className="w-8 h-8 rounded-full" />
            
            {/* Content skeleton */}
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
              
              {/* Action buttons skeleton */}
              <div className="flex items-center gap-2 mt-3">
                <Skeleton className="h-8 w-28" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-8 w-12" />
    </div>
  )
}
