'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { CheckCircle2, Loader2, Zap, X, DollarSign } from 'lucide-react'

interface ScanProgressModalProps {
  brandId: string
  brandName: string
  isOpen: boolean
  onClose: () => void
  queryCount?: number
}

interface ProgressLine {
  id: string
  text: string
  type: 'info' | 'success' | 'working' | 'result' | 'model-working' | 'model-done'
}

// Currently enabled models (matches scan-run.ts config)
const AI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', costPer1k: 0.15 },
]

// Cost estimate per scan (input + output tokens)
const COST_PER_SCAN = 0.003 // ~$0.003 per scan with GPT-4o-mini

export function ScanProgressModal({
  brandId,
  brandName,
  isOpen,
  onClose,
}: ScanProgressModalProps) {
  const router = useRouter()
  const [progressLines, setProgressLines] = useState<ProgressLine[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [scanStats, setScanStats] = useState({ scanned: 0, mentioned: 0, cited: 0 })
  const [hasStarted, setHasStarted] = useState(false)
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [actualQueryCount, setActualQueryCount] = useState(0)
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
    setScanStats({ scanned: 0, mentioned: 0, cited: 0 })
    setEstimatedCost(0)

    addLine(`Starting AI visibility scan for ${brandName}...`, 'info')
    addLine(``, 'info')

    // Fetch actual query count first
    try {
      const countRes = await fetch(`/api/brands/${brandId}/scan-status`)
      const countData = await countRes.json()
      const queryCount = countData.totalQueries || 10
      setActualQueryCount(queryCount)
      
      const totalScans = queryCount * AI_MODELS.length
      const estCost = totalScans * COST_PER_SCAN
      setEstimatedCost(estCost)

      addLine(`Found ${queryCount} prompts to test`, 'info')
      addLine(`Testing across ${AI_MODELS.length} AI model${AI_MODELS.length > 1 ? 's' : ''}`, 'info')
      addLine(`Estimated cost: $${estCost.toFixed(3)}`, 'info')
      addLine(``, 'info')

      // Trigger the scan
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_scan' }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Scan failed to start')
      }

      addLine(`▶ Scan initiated`, 'info')
      addLine(``, 'info')

      // Add model status lines (we'll update these)
      const modelLineIds: Record<string, string> = {}
      AI_MODELS.forEach(model => {
        const lineId = addLine(`${model.name}: scanning ${queryCount} prompts...`, 'model-working')
        modelLineIds[model.id] = lineId
      })

      // Poll for results
      let lastScanCount = 0
      let stableCount = 0
      let pollCount = 0
      const maxPolls = 120 // 10 minutes max

      pollIntervalRef.current = setInterval(async () => {
        pollCount++
        
        try {
          const statusRes = await fetch(`/api/brands/${brandId}/scan-status`)
          if (statusRes.ok) {
            const status = await statusRes.json()
            
            // Update stats
            if (status.recentScans > lastScanCount) {
              setScanStats({
                scanned: status.recentScans,
                mentioned: status.mentionedCount || 0,
                cited: status.citedCount || 0,
              })
              
              // Update model lines with progress
              const scansPerModel = Math.floor(status.recentScans / AI_MODELS.length)
              AI_MODELS.forEach(model => {
                const lineId = modelLineIds[model.id]
                if (lineId) {
                  updateLine(lineId, `${model.name}: ${scansPerModel}/${queryCount} prompts tested`, 'model-working')
                }
              })
              
              lastScanCount = status.recentScans
              stableCount = 0
            } else {
              stableCount++
            }

            // Check if complete
            const expectedScans = queryCount * AI_MODELS.length
            const isLikelyComplete = status.recentScans >= expectedScans * 0.9 || // 90% complete
                                     stableCount >= 6 || // No new results for 30 seconds
                                     pollCount >= maxPolls

            if (isLikelyComplete && status.recentScans > 0) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
              }
              
              // Mark models as complete
              AI_MODELS.forEach(model => {
                const lineId = modelLineIds[model.id]
                if (lineId) {
                  const scansForModel = Math.floor(status.recentScans / AI_MODELS.length)
                  updateLine(lineId, `${model.name}: ${scansForModel} prompts tested ✓`, 'model-done')
                }
              })

              // Final stats
              const mentionRate = status.recentScans > 0 
                ? Math.round((status.mentionedCount / status.recentScans) * 100) 
                : 0

              addLine(``, 'info')
              addLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info')
              addLine(`SCAN COMPLETE`, 'success')
              addLine(``, 'info')
              addLine(`📊 Results:`, 'info')
              addLine(`   ${status.recentScans} total scans`, 'result')
              addLine(`   ${status.mentionedCount || 0} mentions (${mentionRate}% visibility)`, 'result')
              addLine(`   ${status.citedCount || 0} citations`, 'result')
              addLine(`   Cost: ~$${(status.recentScans * COST_PER_SCAN).toFixed(3)}`, 'result')
              addLine(``, 'info')
              
              if (mentionRate >= 50) {
                addLine(`🎉 Great visibility! Consider adding more AI models.`, 'success')
              } else if (mentionRate >= 20) {
                addLine(`📈 Moderate visibility. Generate memos to improve.`, 'info')
              } else {
                addLine(`⚠️ Low visibility. Generate memos to help AI cite you.`, 'info')
              }

              setIsComplete(true)
              setEstimatedCost(status.recentScans * COST_PER_SCAN)
              setScanStats({
                scanned: status.recentScans,
                mentioned: status.mentionedCount || 0,
                cited: status.citedCount || 0,
              })
            }
          }
        } catch (error) {
          console.error('Poll error:', error)
        }
      }, 5000)

    } catch (error) {
      addLine(``, 'info')
      addLine(`⚠️ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'info')
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
          <DialogTitle>AI Visibility Scan</DialogTitle>
        </VisuallyHidden>
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#0F172A] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0EA5E9] rounded-lg">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold tracking-wide">AI VISIBILITY SCAN</h2>
              <p className="text-sm text-slate-300">{brandName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Cost indicator */}
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded">
              <DollarSign className="h-4 w-4 text-[#10B981]" />
              <span className="text-sm font-mono text-[#10B981]">
                ${estimatedCost.toFixed(3)}
              </span>
            </div>
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
              {line.type === 'model-working' && (
                <Loader2 className="h-4 w-4 text-[#F59E0B] animate-spin shrink-0 mt-0.5" />
              )}
              {line.type === 'model-done' && (
                <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
              )}
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
                <span className="text-[#0EA5E9] shrink-0">•</span>
              )}
              <span className={
                line.type === 'success' ? 'text-[#10B981] font-bold' :
                line.type === 'model-working' ? 'text-[#F59E0B]' :
                line.type === 'model-done' ? 'text-[#10B981]' :
                line.type === 'working' ? 'text-[#F59E0B]' :
                line.type === 'result' ? 'text-[#0EA5E9]' :
                line.text.startsWith('▶') ? 'text-[#7aa2f7] font-bold' :
                line.text.startsWith('━') ? 'text-[#7aa2f7]' :
                line.text.startsWith('📊') || line.text.startsWith('🎉') || line.text.startsWith('📈') || line.text.startsWith('⚠️') ? 'text-white' :
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

        {/* Stats Footer */}
        <div className="bg-[#0F172A] px-4 py-3 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-slate-400">Scans: </span>
                <span className="text-white font-bold">{scanStats.scanned}</span>
              </div>
              <div>
                <span className="text-slate-400">Mentioned: </span>
                <span className="text-[#10B981] font-bold">{scanStats.mentioned}</span>
              </div>
              <div>
                <span className="text-slate-400">Cited: </span>
                <span className="text-[#0EA5E9] font-bold">{scanStats.cited}</span>
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
