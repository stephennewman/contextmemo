'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { CheckCircle2, Loader2, Target, X } from 'lucide-react'

interface CoverageProgressModalProps {
  brandId: string
  brandName: string
  brandDomain: string
  isOpen: boolean
  onClose: () => void
}

interface ProgressLine {
  id: string
  text: string
  type: 'info' | 'success' | 'working' | 'result' | 'error'
}

export function CoverageProgressModal({
  brandId,
  brandName,
  brandDomain,
  isOpen,
  onClose,
}: CoverageProgressModalProps) {
  const router = useRouter()
  const [progressLines, setProgressLines] = useState<ProgressLine[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [stats, setStats] = useState({ topics: 0, covered: 0, gaps: 0, percent: 0 })
  const progressRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const simulationRef = useRef<NodeJS.Timeout[]>([])
  const lineIdCounter = useRef(0)

  // Auto-scroll progress
  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight
    }
  }, [progressLines])

  // Start when modal opens
  useEffect(() => {
    if (isOpen && !hasStarted) {
      startAudit()
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

  // Schedule a simulated progress line
  const scheduleAdd = (delayMs: number, text: string, type: ProgressLine['type'] = 'info'): { lineId: Promise<string> } => {
    let resolve: (id: string) => void
    const lineId = new Promise<string>(r => { resolve = r })
    const t = setTimeout(() => {
      const id = addLine(text, type)
      resolve!(id)
    }, delayMs)
    simulationRef.current.push(t)
    return { lineId }
  }

  const startAudit = async () => {
    setHasStarted(true)
    setProgressLines([])
    setIsComplete(false)
    setStats({ topics: 0, covered: 0, gaps: 0, percent: 0 })

    addLine(`Starting content coverage audit for ${brandName}...`, 'info')
    addLine(`Domain: ${brandDomain}`, 'info')
    addLine(``, 'info')

    try {
      // Trigger the action
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_topic_universe' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start coverage audit')
      }

      addLine(`▶ Coverage audit initiated`, 'info')
      addLine(``, 'info')

      // Simulated progress steps (realistic timing for the background job)
      const sitemapLineRef = { id: '' }
      const classifyLineRef = { id: '' }
      const deepReadLineRef = { id: '' }
      const generateLineRef = { id: '' }
      const analyzeLineRef = { id: '' }
      const matchLineRef = { id: '' }

      // Step 1: Sitemap fetch (2s)
      simulationRef.current.push(setTimeout(() => {
        sitemapLineRef.id = addLine(`Fetching sitemap.xml for ${brandDomain}...`, 'working')
      }, 2000))

      // Step 2: Sitemap result (6s)
      simulationRef.current.push(setTimeout(() => {
        if (sitemapLineRef.id) {
          updateLine(sitemapLineRef.id, `Sitemap fetched for ${brandDomain}`, 'success')
        }
        addLine(`Parsing URLs...`, 'info')
      }, 6000))

      // Step 3: Classify (9s)
      simulationRef.current.push(setTimeout(() => {
        classifyLineRef.id = addLine(`Classifying pages by content type...`, 'working')
      }, 9000))

      // Step 4: Classify done (16s)
      simulationRef.current.push(setTimeout(() => {
        if (classifyLineRef.id) {
          updateLine(classifyLineRef.id, `Pages classified by content type`, 'success')
        }
      }, 16000))

      // Step 5: Deep-read (19s)
      simulationRef.current.push(setTimeout(() => {
        deepReadLineRef.id = addLine(`Deep-reading key pages for quality assessment...`, 'working')
      }, 19000))

      // Step 6: Deep-read done (35s)
      simulationRef.current.push(setTimeout(() => {
        if (deepReadLineRef.id) {
          updateLine(deepReadLineRef.id, `Key pages analyzed for content quality`, 'success')
        }
        addLine(``, 'info')
      }, 35000))

      // Step 7: Generate topics (38s)
      simulationRef.current.push(setTimeout(() => {
        generateLineRef.id = addLine(`Generating topic universe...`, 'working')
      }, 38000))

      // Step 8: Analyze (42s)
      simulationRef.current.push(setTimeout(() => {
        analyzeLineRef.id = addLine(`Analyzing brand context, competitors, market landscape...`, 'working')
      }, 42000))

      // Step 9: Match (55s)
      simulationRef.current.push(setTimeout(() => {
        if (analyzeLineRef.id) {
          updateLine(analyzeLineRef.id, `Brand context and market analyzed`, 'success')
        }
        matchLineRef.id = addLine(`Matching topics against existing content...`, 'working')
      }, 55000))

      // Step 10: Almost there (70s)
      simulationRef.current.push(setTimeout(() => {
        if (matchLineRef.id) {
          updateLine(matchLineRef.id, `Content matching complete`, 'success')
        }
        addLine(`Saving results...`, 'working')
      }, 70000))

      // Poll for actual results every 5 seconds
      let pollCount = 0
      const maxPolls = 36 // 3 minutes

      pollIntervalRef.current = setInterval(async () => {
        pollCount++

        try {
          const statusRes = await fetch(`/api/brands/${brandId}/coverage`)
          if (statusRes.ok) {
            const data = await statusRes.json()

            if (data.has_topics && data.coverage_score) {
              // Done! Clear polling and simulation
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
              }
              for (const t of simulationRef.current) {
                clearTimeout(t)
              }

              const score = data.coverage_score

              setStats({
                topics: score.total_topics,
                covered: score.covered,
                gaps: score.gaps,
                percent: score.coverage_percent,
              })

              // Resolve all remaining working spinners
              setProgressLines(prev => prev.map(line =>
                line.type === 'working' ? { ...line, type: 'success' as const } : line
              ))

              addLine(``, 'info')
              addLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info')
              addLine(`COVERAGE AUDIT COMPLETE`, 'success')
              addLine(``, 'info')
              addLine(`${score.total_topics} topics mapped`, 'result')
              addLine(`${score.covered} covered, ${score.gaps} gaps`, 'result')
              addLine(`Coverage: ${score.coverage_percent}%`, 'result')
              addLine(``, 'info')

              if (score.coverage_percent >= 70) {
                addLine(`Strong coverage. Focus on curating your top gaps.`, 'success')
              } else if (score.coverage_percent >= 40) {
                addLine(`Moderate coverage. Generate memos for the top priority gaps.`, 'info')
              } else {
                addLine(`Low coverage. Significant opportunity to fill content gaps.`, 'info')
              }

              setIsComplete(true)
              return
            }
          }
        } catch (error) {
          console.error('Poll error:', error)
        }

        // Timeout
        if (pollCount >= maxPolls) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
          }
          for (const t of simulationRef.current) {
            clearTimeout(t)
          }
          // Resolve all remaining working spinners
          setProgressLines(prev => prev.map(line =>
            line.type === 'working' ? { ...line, type: 'info' as const } : line
          ))
          addLine(``, 'info')
          addLine(`Still processing. This can take a few minutes for large sites.`, 'info')
          addLine(`Close this window and refresh the page to check results.`, 'info')
          setIsComplete(true)
        }
      }, 5000)

    } catch (error) {
      // Resolve all remaining working spinners
      setProgressLines(prev => prev.map(line =>
        line.type === 'working' ? { ...line, type: 'info' as const } : line
      ))
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
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 border-[3px] border-[#0F172A] rounded-none overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Content Coverage Audit</DialogTitle>
        </VisuallyHidden>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#0F172A] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#8B5CF6] rounded-lg">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold tracking-wide">CONTENT COVERAGE AUDIT</h2>
              <p className="text-sm text-slate-300">{brandName}</p>
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
                line.type === 'success' ? 'text-[#10B981] font-bold' :
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
              <span className="w-2 h-4 bg-[#8B5CF6] animate-pulse" />
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="bg-[#0F172A] px-4 py-3 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-slate-400">Topics: </span>
                <span className="text-white font-bold">{stats.topics}</span>
              </div>
              <div>
                <span className="text-slate-400">Covered: </span>
                <span className="text-[#10B981] font-bold">{stats.covered}</span>
              </div>
              <div>
                <span className="text-slate-400">Gaps: </span>
                <span className="text-red-400 font-bold">{stats.gaps}</span>
              </div>
              {stats.percent > 0 && (
                <div>
                  <span className="text-slate-400">Coverage: </span>
                  <span className={`font-bold ${
                    stats.percent >= 70 ? 'text-[#10B981]' :
                    stats.percent >= 40 ? 'text-[#F59E0B]' : 'text-red-400'
                  }`}>{stats.percent}%</span>
                </div>
              )}
            </div>
            <span className={`font-mono text-sm ${
              isComplete ? 'text-[#10B981]' : 'text-[#F59E0B]'
            }`}>
              {isComplete ? '● COMPLETE' : '● AUDITING'}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
