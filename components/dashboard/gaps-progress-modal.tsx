'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { CheckCircle2, Loader2, FileText, X, Sparkles } from 'lucide-react'

interface GapsProgressModalProps {
  brandId: string
  brandName: string
  competitorCount: number
  isOpen: boolean
  onClose: () => void
}

interface ProgressLine {
  id: string
  text: string
  type: 'info' | 'success' | 'working' | 'result' | 'error'
}

export function GapsProgressModal({
  brandId,
  brandName,
  competitorCount,
  isOpen,
  onClose,
}: GapsProgressModalProps) {
  const router = useRouter()
  const [progressLines, setProgressLines] = useState<ProgressLine[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [stats, setStats] = useState({ scanned: 0, found: 0, generating: 0 })
  const [hasStarted, setHasStarted] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lineIdCounter = useRef(0)

  // Auto-scroll progress
  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight
    }
  }, [progressLines])

  // Start scan when modal opens
  useEffect(() => {
    if (isOpen && !hasStarted) {
      startScan()
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
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

  const startScan = async () => {
    setHasStarted(true)
    setProgressLines([])
    setIsComplete(false)
    setStats({ scanned: 0, found: 0, generating: 0 })

    addLine(`Finding content gaps for ${brandName}...`, 'info')
    addLine(``, 'info')
    addLine(`Scanning ${competitorCount} competitor feeds`, 'info')
    addLine(``, 'info')

    try {
      // Trigger the content scan
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'content-scan' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Scan failed to start')
      }

      addLine(`▶ Content scan initiated`, 'info')
      addLine(``, 'info')

      // Add phases
      const phase1Id = addLine(`Discovering RSS feeds...`, 'working')
      
      // Simulate progress (the actual work happens in background via Inngest)
      await new Promise(r => setTimeout(r, 2000))
      updateLine(phase1Id, `RSS feeds discovered ✓`, 'success')
      
      const phase2Id = addLine(`Fetching new articles...`, 'working')
      await new Promise(r => setTimeout(r, 3000))
      updateLine(phase2Id, `Articles fetched ✓`, 'success')
      
      const phase3Id = addLine(`Classifying content...`, 'working')
      await new Promise(r => setTimeout(r, 2000))
      updateLine(phase3Id, `Content classified ✓`, 'success')
      
      addLine(``, 'info')
      addLine(`▶ Identifying respondable content...`, 'info')
      
      const phase4Id = addLine(`Filtering for universal topics...`, 'working')
      await new Promise(r => setTimeout(r, 2000))
      updateLine(phase4Id, `Universal topics identified ✓`, 'success')

      // Poll for competitor_content status
      let pollCount = 0
      const maxPolls = 60 // 5 minutes max

      pollIntervalRef.current = setInterval(async () => {
        pollCount++
        
        try {
          // Check for new content in the last 10 minutes
          const statusRes = await fetch(`/api/brands/${brandId}/content-gaps-status`)
          if (statusRes.ok) {
            const status = await statusRes.json()
            
            setStats({
              scanned: status.articlesScanned || 0,
              found: status.gapsFound || 0,
              generating: status.memosGenerating || 0,
            })

            // Check if complete (no more processing)
            if (pollCount >= 10 || status.isComplete) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
              }
              
              addLine(``, 'info')
              addLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info')
              addLine(`SCAN COMPLETE`, 'success')
              addLine(``, 'info')
              addLine(`📊 Results:`, 'info')
              addLine(`   ${status.articlesScanned || 0} articles scanned`, 'result')
              addLine(`   ${status.gapsFound || 0} content gaps found`, 'result')
              addLine(`   ${status.memosQueued || 0} memos being generated`, 'result')
              addLine(``, 'info')
              
              if ((status.gapsFound || 0) > 0) {
                addLine(`✨ New memos will appear in your MEMOS tab shortly.`, 'success')
              } else {
                addLine(`No new gaps found. Competitors haven't published new content.`, 'info')
              }

              setIsComplete(true)
            }
          }
        } catch (error) {
          console.error('Poll error:', error)
        }
        
        if (pollCount >= maxPolls) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
          }
          setIsComplete(true)
        }
      }, 5000)

    } catch (error) {
      addLine(``, 'info')
      addLine(`⚠️ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      setIsComplete(true)
    }
  }

  const handleClose = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }
    router.refresh()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 border-[3px] border-[#0F172A] rounded-none overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Find Content Gaps</DialogTitle>
        </VisuallyHidden>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#0F172A] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#10B981] rounded-lg">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold tracking-wide">FIND CONTENT GAPS</h2>
              <p className="text-sm text-slate-300">{brandName}</p>
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
              {line.type === 'info' && line.text && !line.text.startsWith('━') && (
                <span className="text-slate-500 shrink-0">→</span>
              )}
              {line.type === 'result' && (
                <span className="text-[#10B981] shrink-0">•</span>
              )}
              {line.type === 'error' && (
                <span className="text-red-500 shrink-0">!</span>
              )}
              <span className={
                line.type === 'success' ? 'text-[#10B981] font-bold' :
                line.type === 'working' ? 'text-[#F59E0B]' :
                line.type === 'result' ? 'text-[#10B981]' :
                line.type === 'error' ? 'text-red-400' :
                line.text.startsWith('▶') ? 'text-[#7aa2f7] font-bold' :
                line.text.startsWith('━') ? 'text-[#7aa2f7]' :
                line.text.startsWith('📊') || line.text.startsWith('✨') ? 'text-white' :
                'text-slate-400'
              }>
                {line.text}
              </span>
            </div>
          ))}
          
          {/* Blinking cursor when running */}
          {!isComplete && hasStarted && (
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-4 bg-[#10B981] animate-pulse" />
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="bg-[#0F172A] px-4 py-3 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-slate-400">Articles: </span>
                <span className="text-white font-bold">{stats.scanned}</span>
              </div>
              <div>
                <span className="text-slate-400">Gaps: </span>
                <span className="text-[#10B981] font-bold">{stats.found}</span>
              </div>
              <div>
                <span className="text-slate-400">Generating: </span>
                <span className="text-[#F59E0B] font-bold">{stats.generating}</span>
              </div>
            </div>
            <span className={`font-mono text-sm ${
              isComplete ? 'text-[#10B981]' : 'text-[#F59E0B]'
            }`}>
              {isComplete ? '● COMPLETE' : '● SCANNING'}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
