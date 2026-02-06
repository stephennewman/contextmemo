'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { CheckCircle2, Loader2, Sparkles, X } from 'lucide-react'
import { TopicUniverse } from '@/lib/supabase/types'

interface MemoBatchProgressModalProps {
  brandId: string
  brandName: string
  topics: TopicUniverse[]
  isOpen: boolean
  onClose: (completedCount: number) => void
}

interface ProgressLine {
  id: string
  text: string
  type: 'info' | 'success' | 'working' | 'result' | 'error'
}

export function MemoBatchProgressModal({
  brandId,
  brandName,
  topics,
  isOpen,
  onClose,
}: MemoBatchProgressModalProps) {
  const router = useRouter()
  const [progressLines, setProgressLines] = useState<ProgressLine[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [stats, setStats] = useState({ queued: 0, completed: 0, total: 0 })
  const progressRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const simulationRef = useRef<NodeJS.Timeout[]>([])
  const lineIdCounter = useRef(0)
  const topicLineIds = useRef<Map<string, string>>(new Map())

  // Auto-scroll
  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight
    }
  }, [progressLines])

  // Start when modal opens
  useEffect(() => {
    if (isOpen && !hasStarted) {
      startBatch()
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      for (const t of simulationRef.current) {
        clearTimeout(t)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const addLine = (text: string, type: ProgressLine['type'] = 'info'): string => {
    const id = `line-${lineIdCounter.current++}`
    setProgressLines(prev => [...prev, { id, text, type }])
    return id
  }

  const updateLine = (id: string, text: string, type: ProgressLine['type']) => {
    setProgressLines(prev => prev.map(line =>
      line.id === id ? { ...line, text, type } : line
    ))
  }

  const startBatch = async () => {
    setHasStarted(true)
    setProgressLines([])
    setIsComplete(false)
    const total = topics.length
    setStats({ queued: 0, completed: 0, total })

    addLine(`Starting batch memo generation for ${brandName}...`, 'info')
    addLine(`${total} gap topics queued`, 'info')
    addLine(``, 'info')

    try {
      // Fire the batch API call
      const res = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_generate_memos',
          topicIds: topics.map(t => t.id),
          limit: 10,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start batch generation')
      }

      const data = await res.json()
      const queued = data.count || total
      setStats(prev => ({ ...prev, queued }))

      addLine(`▶ ${queued} memo generation jobs queued`, 'info')
      addLine(``, 'info')

      // Show each topic as a working line
      topics.slice(0, queued).forEach((topic, idx) => {
        const delay = idx * 300 // stagger slightly
        const t = setTimeout(() => {
          const lineId = addLine(`${topic.title}`, 'working')
          topicLineIds.current.set(topic.id, lineId)
        }, delay)
        simulationRef.current.push(t)
      })

      // Simulated progress: mark topics as generating one by one
      // Each memo takes ~15-30s to generate via Inngest
      const baseDelay = topics.length * 300 + 1000 // after all topic lines appear
      let completedSoFar = 0

      // Simulate individual completions with realistic timing
      topics.slice(0, queued).forEach((topic, idx) => {
        // Each memo takes roughly 15-25s, staggered by ~5s since they run in parallel via Inngest
        const estimatedDelay = baseDelay + 15000 + (idx * 8000) + (Math.random() * 5000)
        const t = setTimeout(() => {
          const lineId = topicLineIds.current.get(topic.id)
          if (lineId) {
            updateLine(lineId, `${topic.title} ✓`, 'success')
          }
          completedSoFar++
          setStats(prev => ({ ...prev, completed: completedSoFar }))
        }, estimatedDelay)
        simulationRef.current.push(t)
      })

      // Real polling: check actual memo count every 8 seconds
      let lastMemoCount = 0
      let stableCount = 0
      let pollCount = 0
      const maxPolls = 45 // ~6 minutes

      // Get baseline memo count first
      const baselineRes = await fetch(`/api/brands/${brandId}/tab-data?tab=memos`)
      let baselineMemoCount = 0
      if (baselineRes.ok) {
        const baselineData = await baselineRes.json()
        baselineMemoCount = baselineData.memos?.length || 0
      }

      pollIntervalRef.current = setInterval(async () => {
        pollCount++

        try {
          const statusRes = await fetch(`/api/brands/${brandId}/tab-data?tab=memos`)
          if (statusRes.ok) {
            const statusData = await statusRes.json()
            const currentMemoCount = statusData.memos?.length || 0
            const newMemos = currentMemoCount - baselineMemoCount

            if (newMemos > lastMemoCount) {
              lastMemoCount = newMemos
              stableCount = 0

              // Update real completed count (override simulated)
              setStats(prev => ({
                ...prev,
                completed: Math.min(newMemos, queued),
              }))

              // Mark topic lines as complete based on real count
              const topicEntries = Array.from(topicLineIds.current.entries())
              topicEntries.slice(0, newMemos).forEach(([, lineId]) => {
                setProgressLines(prev => prev.map(line =>
                  line.id === lineId && line.type === 'working'
                    ? { ...line, text: line.text.replace(' ✓', '') + ' ✓', type: 'success' as const }
                    : line
                ))
              })
            } else {
              stableCount++
            }

            // Check if all done
            const isLikelyComplete = newMemos >= queued ||
                                      stableCount >= 8 || // 64s of no new memos
                                      pollCount >= maxPolls

            if (isLikelyComplete && newMemos > 0) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
              }
              for (const t of simulationRef.current) {
                clearTimeout(t)
              }

              // Mark any remaining as complete
              topicLineIds.current.forEach((lineId) => {
                setProgressLines(prev => prev.map(line =>
                  line.id === lineId && line.type === 'working'
                    ? { ...line, text: line.text.replace(' ✓', '') + ' ✓', type: 'success' as const }
                    : line
                ))
              })

              setStats(prev => ({ ...prev, completed: Math.min(newMemos, queued) }))

              addLine(``, 'info')
              addLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info')
              addLine(`BATCH GENERATION COMPLETE`, 'success')
              addLine(``, 'info')
              addLine(`${newMemos} memos generated`, 'result')
              addLine(``, 'info')
              addLine(`View your new memos in the MEMOS tab.`, 'info')

              setIsComplete(true)
            }
          }
        } catch (error) {
          console.error('Poll error:', error)
        }
      }, 8000)

    } catch (error) {
      addLine(``, 'info')
      addLine(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      setIsComplete(true)
    }
  }

  const handleClose = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
    for (const t of simulationRef.current) {
      clearTimeout(t)
    }
    router.refresh()
    onClose(stats.completed)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 border-[3px] border-[#0F172A] rounded-none overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Batch Memo Generation</DialogTitle>
        </VisuallyHidden>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#0F172A] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Sparkles className="h-5 w-5 text-black" />
            </div>
            <div>
              <h2 className="font-bold tracking-wide">BATCH MEMO GENERATION</h2>
              <p className="text-sm text-slate-300">{brandName} — {stats.total} gap topics</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Progress Log */}
        <div
          ref={progressRef}
          className="h-80 overflow-y-auto bg-[#1a1b26] p-4 font-mono text-sm"
        >
          {progressLines.map((line) => (
            <div key={line.id} className="flex items-start gap-2 py-0.5">
              {line.type === 'working' && (
                <Loader2 className="h-4 w-4 text-[#F59E0B] animate-spin shrink-0 mt-0.5" />
              )}
              {line.type === 'success' && (
                <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
              )}
              {line.type === 'error' && (
                <span className="text-red-400 shrink-0">✕</span>
              )}
              {line.type === 'info' && line.text && !line.text.startsWith('━') && (
                <span className="text-slate-500 shrink-0">→</span>
              )}
              {line.type === 'result' && (
                <span className="text-[#0EA5E9] shrink-0">•</span>
              )}
              <span className={
                line.type === 'success' ? 'text-[#10B981]' :
                line.type === 'working' ? 'text-[#F59E0B]' :
                line.type === 'error' ? 'text-red-400' :
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
              <span className="w-2 h-4 bg-amber-500 animate-pulse" />
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="bg-[#0F172A] px-4 py-3 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-slate-400">Queued: </span>
                <span className="text-white font-bold">{stats.queued}</span>
              </div>
              <div>
                <span className="text-slate-400">Generated: </span>
                <span className="text-[#10B981] font-bold">{stats.completed}</span>
              </div>
              <div>
                <span className="text-slate-400">Remaining: </span>
                <span className="text-amber-400 font-bold">{Math.max(0, stats.queued - stats.completed)}</span>
              </div>
            </div>
            <span className={`font-mono text-sm ${
              isComplete ? 'text-[#10B981]' : 'text-[#F59E0B]'
            }`}>
              {isComplete ? '● COMPLETE' : '● GENERATING'}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
