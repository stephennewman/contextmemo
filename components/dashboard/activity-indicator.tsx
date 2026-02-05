'use client'

import { useEffect, useState } from 'react'
import { Activity, Loader2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ActiveJob {
  id: string
  brand_id: string
  job_type: string
  job_name: string
  started_at: string
  metadata: Record<string, unknown>
}

interface LastActivity {
  timestamp: string
  title: string
  type: string
}

export function ActivityIndicator() {
  const [jobs, setJobs] = useState<ActiveJob[]>([])
  const [lastActivity, setLastActivity] = useState<LastActivity | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch('/api/jobs')
        if (res.ok) {
          const data = await res.json()
          setJobs(data.jobs || [])
          setLastActivity(data.lastActivity || null)
        }
      } catch (error) {
        console.error('Failed to fetch jobs:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchJobs()
    // Poll every 3 seconds when active, 10 seconds when idle
    const interval = setInterval(fetchJobs, jobs.length > 0 ? 3000 : 10000)
    return () => clearInterval(interval)
  }, [jobs.length])

  const hasActiveJobs = jobs.length > 0

  if (isLoading) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
              hasActiveJobs 
                ? 'bg-[#F59E0B]/20 text-[#F59E0B]' 
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            {hasActiveJobs ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
            <span className="text-xs font-medium hidden sm:inline">
              {hasActiveJobs ? 'WORKING' : 'IDLE'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="max-w-xs border-2 border-[#0F172A] rounded-none p-0"
        >
          <div className="p-3">
            {hasActiveJobs ? (
              <>
                <p className="text-xs font-semibold text-[#F59E0B] mb-2">
                  RUNNING ({jobs.length} job{jobs.length > 1 ? 's' : ''})
                </p>
                <div className="space-y-2">
                  {jobs.map((job) => (
                    <div key={job.id} className="flex items-start gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-[#F59E0B] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium">{job.job_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Started {formatTimeAgo(job.started_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  No active jobs. System is idle.
                </p>
                {lastActivity && (
                  <p className="text-xs text-muted-foreground">
                    Last run: <span className="text-slate-300">{formatTimeAgo(lastActivity.timestamp)}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function formatTimeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000)
  
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}
