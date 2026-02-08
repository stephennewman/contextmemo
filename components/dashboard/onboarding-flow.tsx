'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Loader2, Circle, Zap } from 'lucide-react'

interface OnboardingFlowProps {
  brandId: string
  brandName: string
  brandDomain: string
  hasContext: boolean
  hasQueries: boolean
  queryCount: number
}

type OnboardingStep = 'extract' | 'queries' | 'scan'

interface ProgressLine {
  text: string
  type: 'info' | 'success' | 'working'
}

// Step configurations
const STEP_CONFIGS: Record<OnboardingStep, {
  action: string
  title: string
  shortTitle: string
  progressMessages: string[]
}> = {
  extract: {
    action: 'extract_context',
    title: 'Scanning Brand Website',
    shortTitle: 'Brand Scan',
    progressMessages: [
      'Connecting to website...',
      'Crawling site pages...',
      'Searching for additional brand info...',
      'Extracting products & services...',
      'Identifying target personas...',
      'Analyzing brand positioning...',
      'Processing with AI...',
    ],
  },
  queries: {
    action: 'generate_queries',
    title: 'Reverse-Engineering Prompts',
    shortTitle: 'Prompts',
    progressMessages: [
      'Analyzing buyer intent patterns...',
      'Identifying solution categories...',
      'Generating non-branded queries...',
      'Creating persona-based prompts...',
      'Prioritizing by relevance...',
    ],
  },
  scan: {
    action: 'run_scan',
    title: 'Running First AI Scan',
    shortTitle: 'AI Scan',
    progressMessages: [
      'Querying ChatGPT...',
      'Querying Claude...',
      'Querying Gemini...',
      'Querying Perplexity...',
      'Analyzing visibility...',
      'Extracting cited entities...',
    ],
  },
}

export function OnboardingFlow({
  brandId,
  brandName,
  brandDomain,
  hasContext,
  hasQueries,
  queryCount,
}: OnboardingFlowProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<OnboardingStep | null>(null)
  const [completedSteps, setCompletedSteps] = useState<Set<OnboardingStep>>(new Set())
  const [progressLines, setProgressLines] = useState<ProgressLine[]>([])
  const [isComplete, setIsComplete] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const progressRef = useRef<HTMLDivElement>(null)
  const messageIndexRef = useRef(0)

  // Determine initial completed state
  useEffect(() => {
    const completed = new Set<OnboardingStep>()
    if (hasContext) completed.add('extract')
    if (hasQueries) completed.add('queries')
    setCompletedSteps(completed)
    
    // If all critical steps are complete, mark as complete
    if (hasContext && hasQueries) {
      setIsComplete(true)
    }
  }, [hasContext, hasQueries])

  // Auto-scroll progress
  useEffect(() => {
    if (progressRef.current) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight
    }
  }, [progressLines])

  // Auto-start the pipeline when component mounts
  // Start if missing context or queries (competitors are discovered post-scan)
  useEffect(() => {
    const needsOnboarding = !hasContext || !hasQueries
    if (needsOnboarding) {
      startPipeline()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - only run on mount

  const addProgressLine = (text: string, type: ProgressLine['type'] = 'working') => {
    setProgressLines(prev => [...prev, { text, type }])
  }

  // Convert all working lines to completed (removes spinners)
  const completeWorkingLines = () => {
    setProgressLines(prev => prev.map(line => 
      line.type === 'working' ? { ...line, type: 'info' as const } : line
    ))
  }

  const startPipeline = async () => {
    setHasStarted(true)
    addProgressLine(`Starting setup for ${brandName}...`, 'info')
    
    // The Inngest pipeline is fully chained: extract → queries → scan.
    // We only need to trigger the FIRST incomplete step. The rest chain automatically.
    // The UI's job is just to poll and show progress as each step completes.
    const steps: OnboardingStep[] = ['extract', 'queries', 'scan']
    
    // Find the first incomplete step to trigger
    let triggerStep: OnboardingStep | null = null
    for (const step of steps) {
      if (step !== 'scan' && completedSteps.has(step)) {
        addProgressLine(`✓ ${STEP_CONFIGS[step].shortTitle} already complete`, 'success')
        continue
      }
      triggerStep = step
      break
    }

    if (!triggerStep) {
      // Everything already complete
      setIsComplete(true)
      addProgressLine(`✓ All steps already complete`, 'success')
      return
    }

    // Trigger the first incomplete step - the Inngest chain handles the rest
    const triggerConfig = STEP_CONFIGS[triggerStep]
    setCurrentStep(triggerStep)
    addProgressLine(``, 'info')
    addProgressLine(`▶ ${triggerConfig.title}`, 'info')

    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: triggerConfig.action }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Action failed')
      }
    } catch (error) {
      completeWorkingLines()
      addProgressLine(`⚠ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'info')
      setHasError(true)
      return
    }

    // Now poll for ALL steps to complete (they chain automatically in Inngest)
    for (const step of steps) {
      if (step !== 'scan' && completedSteps.has(step)) {
        continue // Already complete from initial state
      }

      setCurrentStep(step)
      const config = STEP_CONFIGS[step]
      
      // Show step header if this isn't the trigger step (which we already showed)
      if (step !== triggerStep) {
        addProgressLine(``, 'info')
        addProgressLine(`▶ ${config.title}`, 'info')
      }

      // Show progress messages while polling
      messageIndexRef.current = 0
      const showNextMessage = () => {
        if (messageIndexRef.current < config.progressMessages.length) {
          addProgressLine(config.progressMessages[messageIndexRef.current], 'working')
          messageIndexRef.current++
        }
      }

      // Show first message immediately
      showNextMessage()

      // Poll for completion with progress messages
      const pollStart = Date.now()
      const maxPollTime = step === 'extract' ? 120000 : step === 'scan' ? 60000 : 90000

      let stepCompleted = false
      while (Date.now() - pollStart < maxPollTime) {
        await new Promise(r => setTimeout(r, 3000))
        
        // Show next progress message
        showNextMessage()

        // Check status
        try {
          const statusResponse = await fetch(`/api/brands/${brandId}/actions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'check_status' }),
          })

          if (statusResponse.ok) {
            const status = await statusResponse.json()
            
            let complete = false
            let summary = ''

            if (step === 'extract' && status.hasContext) {
              complete = true
              summary = status.contextSummary || 'Brand profile extracted'
            } else if (step === 'queries' && status.hasQueries) {
              complete = true
              summary = `Generated ${status.queryCount || 0} prompts`
            } else if (step === 'scan') {
              // Scan doesn't have a simple "complete" check, use timeout
              if (Date.now() - pollStart > 30000) {
                complete = true
                summary = 'Visibility scan initiated'
              }
            }

            if (complete) {
              completeWorkingLines()
              addProgressLine(`✓ ${summary}`, 'success')
              setCompletedSteps(prev => new Set([...prev, step]))
              stepCompleted = true
              break
            }
          }
        } catch {
          // Network error during polling, continue
        }
      }

      // If we hit max time and step didn't complete
      if (!stepCompleted) {
        completeWorkingLines()
        
        if (step !== 'scan') {
          addProgressLine(`⚠ ${config.shortTitle} timed out - may still be processing in background`, 'info')
          // Critical step timed out - don't continue to dependent steps.
          // The Inngest pipeline chains these automatically (extract → competitors → queries → scan),
          // so the background pipeline will still complete even if the UI stops here.
          break
        } else {
          // Scan is non-critical, mark as complete
          addProgressLine(`✓ ${config.shortTitle} processing...`, 'success')
          setCompletedSteps(prev => new Set([...prev, step]))
        }
      }
    }

    // Check if we actually completed the critical steps
    setCurrentStep(null)
    completeWorkingLines() // Stop any remaining spinners
    
    // Do a final status check to see if we have the data we need
    try {
      const finalStatus = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_status' }),
      })
      
      if (finalStatus.ok) {
        const status = await finalStatus.json()
        const hasRequiredData = status.hasContext && status.hasQueries
        
        if (hasRequiredData) {
          setIsComplete(true)
          addProgressLine(``, 'info')
          addProgressLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info')
          addProgressLine(`✓ Setup complete! Redirecting to dashboard...`, 'success')

          // Navigate to brand page after a short delay
          setTimeout(() => {
            window.location.href = `/brands/${brandId}`
          }, 1500)
        } else {
          // Setup didn't complete fully
          setHasError(true)
          addProgressLine(``, 'info')
          addProgressLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'info')
          addProgressLine(`⚠ Setup incomplete - some steps are still processing`, 'info')
          addProgressLine(`   Brand Scan: ${status.hasContext ? '✓' : '⏳'}`, 'info')
          addProgressLine(`   Prompts: ${status.hasQueries ? '✓' : '⏳'}`, 'info')
          addProgressLine(``, 'info')
          addProgressLine(`Click "Retry" below or refresh the page in a minute.`, 'info')
        }
      }
    } catch {
      setHasError(true)
      addProgressLine(`⚠ Could not verify setup status. Please refresh the page.`, 'info')
    }
  }

  const steps: { id: OnboardingStep; label: string }[] = [
    { id: 'extract', label: 'Brand Scan' },
    { id: 'queries', label: 'Prompts' },
    { id: 'scan', label: 'AI Scan' },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="border-[3px] border-[#0F172A] overflow-hidden">
        <CardHeader className="border-b-[3px] border-[#0F172A] bg-[#0F172A] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F59E0B] rounded-lg">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg tracking-wide">SETTING UP {brandName.toUpperCase()}</CardTitle>
              <CardDescription className="text-slate-300">
                {brandDomain}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Progress Steps Indicator */}
          <div className="p-4 border-b-2 border-[#0F172A] bg-zinc-50">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const isCompleted = completedSteps.has(step.id)
                const isCurrent = currentStep === step.id
                const isPending = !isCompleted && !isCurrent

                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-[#10B981] text-white' :
                        isCurrent ? 'bg-[#F59E0B] text-white' :
                        'bg-zinc-200 text-zinc-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : isCurrent ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </div>
                      <span className={`text-xs mt-1 font-medium ${
                        isCompleted ? 'text-[#10B981]' :
                        isCurrent ? 'text-[#F59E0B]' :
                        'text-zinc-400'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-12 h-0.5 mx-2 ${
                        completedSteps.has(steps[index + 1].id) || currentStep === steps[index + 1].id
                          ? 'bg-[#10B981]'
                          : 'bg-zinc-200'
                      }`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Progress Log */}
          <div 
            ref={progressRef}
            className="h-64 overflow-y-auto bg-[#1a1b26] p-4 font-mono text-sm"
          >
            {progressLines.length === 0 ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Initializing...</span>
              </div>
            ) : (
              progressLines.map((line, i) => (
                <div key={i} className="flex items-start gap-2 py-0.5">
                  {line.type === 'working' && (
                    <Loader2 className="h-4 w-4 text-[#0EA5E9] animate-spin shrink-0 mt-0.5" />
                  )}
                  {line.type === 'success' && (
                    <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0 mt-0.5" />
                  )}
                  {line.type === 'info' && line.text && (
                    <span className="text-slate-500 shrink-0">→</span>
                  )}
                  <span className={
                    line.type === 'success' ? 'text-[#10B981]' :
                    line.type === 'info' && line.text.startsWith('▶') ? 'text-[#7aa2f7] font-bold' :
                    line.type === 'info' && line.text.startsWith('━') ? 'text-[#7aa2f7]' :
                    line.type === 'info' ? 'text-slate-400' :
                    'text-slate-300'
                  }>
                    {line.text}
                  </span>
                </div>
              ))
            )}
            
            {/* Blinking cursor when running */}
            {currentStep && !isComplete && (
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-4 bg-[#0EA5E9] animate-pulse" />
              </div>
            )}
          </div>

          {/* Status Footer */}
          <div className="bg-[#0F172A] px-4 py-3 border-t border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className={`font-mono ${
                isComplete ? 'text-[#10B981]' : hasError ? 'text-[#F59E0B]' : 'text-[#0EA5E9]'
              }`}>
                {isComplete ? '● SETUP COMPLETE' : hasError ? '● SETUP INCOMPLETE' : '● PROCESSING'}
              </span>
              {!isComplete && !hasError && (
                <span className="text-slate-400">
                  Fully automated - no action needed
                </span>
              )}
              {isComplete && (
                <span className="text-slate-400">
                  Dashboard loading...
                </span>
              )}
              {hasError && (
                <button
                  onClick={() => {
                    setHasError(false)
                    setProgressLines([])
                    setCompletedSteps(new Set())
                    setRetryCount(prev => prev + 1)
                    startPipeline()
                  }}
                  className="px-4 py-1.5 bg-[#F59E0B] text-white font-bold text-xs rounded hover:bg-[#D97706] transition-colors"
                >
                  RETRY SETUP
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="mt-6 p-4 bg-zinc-50 border-2 border-zinc-200 rounded-lg">
        <p className="text-sm text-zinc-600">
          <strong>What&apos;s happening?</strong> We&apos;re deep-scanning your website, reverse-engineering the prompts your buyers ask AI, and running your first visibility scan across multiple AI models. Competitors are discovered from what AI actually cites. This typically takes 2-3 minutes.
        </p>
      </div>
    </div>
  )
}
