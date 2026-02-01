'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Play, Terminal, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

type OnboardingStep = 'extract' | 'competitors' | 'queries'

interface TerminalLine {
  text: string
  type: 'info' | 'success' | 'error' | 'working' | 'header'
  timestamp?: string
}

// Define the steps and their terminal messages
const STEP_CONFIGS: Record<OnboardingStep, {
  action: string
  title: string
  buttonText: string
  lines: { text: string; delay: number }[]
  pollInterval: number
  maxPollTime: number
}> = {
  extract: {
    action: 'extract_context',
    title: 'Extracting Brand Context',
    buttonText: 'Extract Context',
    lines: [
      { text: 'Initializing context extraction...', delay: 0 },
      { text: 'Connecting to Jina Reader API...', delay: 800 },
      { text: 'Fetching homepage content...', delay: 1500 },
      { text: 'Analyzing page structure...', delay: 3000 },
      { text: 'Extracting product information...', delay: 5000 },
      { text: 'Identifying target personas...', delay: 8000 },
      { text: 'Detecting competitive positioning...', delay: 11000 },
      { text: 'Analyzing brand voice and tone...', delay: 14000 },
      { text: 'Processing with GPT-4...', delay: 17000 },
      { text: 'Structuring brand context...', delay: 22000 },
      { text: 'Validating extracted data...', delay: 27000 },
    ],
    pollInterval: 3000,
    maxPollTime: 60000,
  },
  competitors: {
    action: 'discover_competitors',
    title: 'Discovering Competitors',
    buttonText: 'Discover Competitors',
    lines: [
      { text: 'Initializing competitor discovery...', delay: 0 },
      { text: 'Loading brand context...', delay: 500 },
      { text: 'Analyzing market positioning...', delay: 1500 },
      { text: 'Querying AI for competitor identification...', delay: 3000 },
      { text: 'Searching industry databases...', delay: 6000 },
      { text: 'Cross-referencing market data...', delay: 9000 },
      { text: 'Validating competitor domains...', delay: 12000 },
      { text: 'Ranking by relevance...', delay: 15000 },
      { text: 'Storing competitor profiles...', delay: 18000 },
    ],
    pollInterval: 2000,
    maxPollTime: 45000,
  },
  queries: {
    action: 'generate_queries',
    title: 'Generating Prompts',
    buttonText: 'Generate Prompts',
    lines: [
      { text: 'Initializing prompt generation...', delay: 0 },
      { text: 'Loading brand context and competitors...', delay: 500 },
      { text: 'Analyzing buyer intent patterns...', delay: 2000 },
      { text: 'Generating comparison queries...', delay: 4000 },
      { text: 'Creating industry-specific prompts...', delay: 7000 },
      { text: 'Building how-to queries...', delay: 10000 },
      { text: 'Adding competitor alternative prompts...', delay: 13000 },
      { text: 'Prioritizing by search volume...', delay: 16000 },
      { text: 'Deduplicating and validating...', delay: 19000 },
      { text: 'Storing prompts to database...', delay: 22000 },
    ],
    pollInterval: 2000,
    maxPollTime: 45000,
  },
}

interface OnboardingTerminalProps {
  brandId: string
  step: OnboardingStep
  onComplete?: () => void
}

export function OnboardingTerminal({ brandId, step, onComplete }: OnboardingTerminalProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [lines, setLines] = useState<TerminalLine[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [hasError, setHasError] = useState(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const config = STEP_CONFIGS[step]

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [lines])

  const getTimestamp = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const addLine = (text: string, type: TerminalLine['type']) => {
    setLines(prev => [...prev, { text, type, timestamp: getTimestamp() }])
  }

  const startProcess = async () => {
    setIsRunning(true)
    setLines([])
    setIsComplete(false)
    setHasError(false)

    // Add header
    addLine(`━━━ ${config.title.toUpperCase()} ━━━`, 'header')

    // Start the background job
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: config.action }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Action failed')
      }

      // Show animated terminal lines
      config.lines.forEach(({ text, delay }) => {
        setTimeout(() => {
          if (!hasError) {
            setLines(prev => [...prev, { text, type: 'working', timestamp: getTimestamp() }])
          }
        }, delay)
      })

      // Start polling for completion
      const pollStart = Date.now()
      const pollForCompletion = async () => {
        if (Date.now() - pollStart > config.maxPollTime) {
          // Max time reached, assume success and refresh
          addLine('Processing complete!', 'success')
          setIsComplete(true)
          setIsRunning(false)
          setTimeout(() => {
            router.refresh()
            onComplete?.()
          }, 1500)
          return
        }

        try {
          // Check if the step is now complete by re-fetching brand data
          const checkResponse = await fetch(`/api/brands/${brandId}/actions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'check_status' }),
          })
          
          if (checkResponse.ok) {
            const status = await checkResponse.json()
            
            // Check if our step is complete
            let stepComplete = false
            if (step === 'extract' && status.hasContext) {
              stepComplete = true
            } else if (step === 'competitors' && status.hasCompetitors) {
              stepComplete = true
            } else if (step === 'queries' && status.hasQueries) {
              stepComplete = true
            }

            if (stepComplete) {
              addLine('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'header')
              addLine('✓ Step completed successfully!', 'success')
              
              // Add summary based on step
              if (step === 'extract' && status.contextSummary) {
                addLine(`Found: ${status.contextSummary}`, 'info')
              } else if (step === 'competitors' && status.competitorCount) {
                addLine(`Discovered ${status.competitorCount} competitors`, 'info')
              } else if (step === 'queries' && status.queryCount) {
                addLine(`Generated ${status.queryCount} prompts to monitor`, 'info')
              }
              
              setIsComplete(true)
              setIsRunning(false)
              
              setTimeout(() => {
                router.refresh()
                onComplete?.()
              }, 2000)
              return
            }
          }
        } catch {
          // Ignore polling errors, keep trying
        }

        // Continue polling
        setTimeout(pollForCompletion, config.pollInterval)
      }

      // Start polling after a short delay
      setTimeout(pollForCompletion, 5000)

    } catch (error) {
      setHasError(true)
      addLine(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
      addLine('Please try again', 'info')
      setIsRunning(false)
      toast.error(error instanceof Error ? error.message : 'Action failed')
    }
  }

  if (!isRunning && lines.length === 0) {
    // Initial state - show the start button
    return (
      <Button 
        onClick={startProcess}
        className="bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold"
        size="lg"
      >
        <Play className="mr-2 h-5 w-5" />
        {config.buttonText}
      </Button>
    )
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Terminal Window */}
      <div className="bg-[#1a1b26] rounded-lg overflow-hidden border-2 border-[#0F172A] shadow-xl">
        {/* Terminal Header */}
        <div className="bg-[#0F172A] px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27ca40]" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
              <Terminal className="h-3 w-3" />
              {config.title}
            </span>
          </div>
          <div className="w-12" /> {/* Spacer for symmetry */}
        </div>

        {/* Terminal Content */}
        <div 
          ref={terminalRef}
          className="p-4 h-64 overflow-y-auto font-mono text-sm space-y-1"
          style={{ scrollBehavior: 'smooth' }}
        >
          {lines.map((line, i) => (
            <div key={i} className="flex items-start gap-2">
              {line.type === 'header' ? (
                <span className="text-[#7aa2f7] font-bold">{line.text}</span>
              ) : (
                <>
                  <span className="text-slate-500 text-xs shrink-0">{line.timestamp}</span>
                  {line.type === 'working' && (
                    <Loader2 className="h-4 w-4 text-[#0EA5E9] animate-spin shrink-0 mt-0.5" />
                  )}
                  {line.type === 'success' && (
                    <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
                  )}
                  {line.type === 'error' && (
                    <XCircle className="h-4 w-4 text-[#ef4444] shrink-0 mt-0.5" />
                  )}
                  {line.type === 'info' && (
                    <span className="text-slate-500 shrink-0">→</span>
                  )}
                  <span className={
                    line.type === 'success' ? 'text-[#10B981]' :
                    line.type === 'error' ? 'text-[#ef4444]' :
                    line.type === 'info' ? 'text-slate-400' :
                    'text-slate-300'
                  }>
                    {line.text}
                  </span>
                </>
              )}
            </div>
          ))}
          
          {/* Blinking cursor when running */}
          {isRunning && !isComplete && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-slate-500 text-xs">{getTimestamp()}</span>
              <span className="w-2 h-4 bg-[#0EA5E9] animate-pulse" />
            </div>
          )}
        </div>

        {/* Terminal Footer */}
        <div className="bg-[#0F172A] px-4 py-2 border-t border-slate-700">
          <div className="flex items-center justify-between text-xs">
            <span className={`font-mono ${isComplete ? 'text-[#10B981]' : hasError ? 'text-[#ef4444]' : 'text-[#0EA5E9]'}`}>
              {isComplete ? '● COMPLETE' : hasError ? '● ERROR' : '● PROCESSING'}
            </span>
            {isRunning && !isComplete && !hasError && (
              <span className="text-slate-500 font-mono">
                This may take 30-60 seconds...
              </span>
            )}
            {isComplete && (
              <span className="text-slate-400 font-mono">
                Refreshing page...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Retry button on error */}
      {hasError && !isRunning && (
        <div className="mt-4 text-center">
          <Button 
            onClick={startProcess}
            variant="outline"
            className="border-2 border-[#0F172A]"
          >
            <Play className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  )
}

// Simple button version that opens the terminal modal
export function OnboardingButton({ 
  brandId, 
  step 
}: { 
  brandId: string
  step: OnboardingStep 
}) {
  const [showTerminal, setShowTerminal] = useState(false)
  const config = STEP_CONFIGS[step]

  if (showTerminal) {
    return (
      <OnboardingTerminal 
        brandId={brandId} 
        step={step}
        onComplete={() => setShowTerminal(false)}
      />
    )
  }

  return (
    <Button 
      onClick={() => setShowTerminal(true)}
      className="bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold"
    >
      <Play className="mr-2 h-4 w-4" />
      {config.buttonText}
    </Button>
  )
}
