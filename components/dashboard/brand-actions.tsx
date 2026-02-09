'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, Play, RefreshCw, FileText, Upload, Search, Link2, Globe, Plus, ChevronDown, Sparkles, SkipForward, ArrowRight } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface BrandActionsProps {
  brandId: string
  hasContext: boolean
  hasCompetitors: boolean
  hasQueries: boolean
  onboardingStep?: 'extract' | 'competitors' | 'queries' // Optional: show only one button for focused onboarding
}

export function BrandActions({ 
  brandId, 
  hasContext, 
  hasCompetitors, 
  hasQueries,
  onboardingStep
}: BrandActionsProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const executeAction = async (action: string, options?: Record<string, unknown>) => {
    setLoading(action)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...options }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Action failed')
      }

      toast.success(data.message)
      
      // Refresh after action completes (with delay for background jobs)
      setTimeout(() => router.refresh(), 15000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setLoading(null)
    }
  }

  // If onboardingStep is provided, show only that specific button
  if (onboardingStep === 'extract') {
    return (
      <Button 
        onClick={() => executeAction('extract_context')}
        disabled={loading !== null}
        className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
      >
        {loading === 'extract_context' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Play className="mr-2 h-4 w-4" />
        )}
        Extract Context
      </Button>
    )
  }

  if (onboardingStep === 'competitors') {
    return (
      <Button 
        onClick={() => executeAction('discover_competitors')}
        disabled={loading !== null}
        className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
      >
        {loading === 'discover_competitors' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Play className="mr-2 h-4 w-4" />
        )}
        Discover Competitors
      </Button>
    )
  }

  if (onboardingStep === 'queries') {
    return (
      <Button 
        onClick={() => executeAction('generate_queries')}
        disabled={loading !== null}
        className="bg-[#F59E0B] hover:bg-[#D97706] text-white"
      >
        {loading === 'generate_queries' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Play className="mr-2 h-4 w-4" />
        )}
        Generate Prompts
      </Button>
    )
  }

  // Legacy fallback: show all steps (for any old usages)
  return (
    <div className="space-y-3">
      {!hasContext && (
        <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-sm font-medium">
              1
            </div>
            <span>Extract brand context from your website</span>
          </div>
          <Button 
            size="sm" 
            onClick={() => executeAction('extract_context')}
            disabled={loading !== null}
          >
            {loading === 'extract_context' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Extract
          </Button>
        </div>
      )}
      
      {hasContext && !hasCompetitors && (
        <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-sm font-medium">
              2
            </div>
            <span>Discover your competitors</span>
          </div>
          <Button 
            size="sm" 
            onClick={() => executeAction('discover_competitors')}
            disabled={loading !== null}
          >
            {loading === 'discover_competitors' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Discover
          </Button>
        </div>
      )}
      
      {hasCompetitors && !hasQueries && (
        <div className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-sm font-medium">
              3
            </div>
            <span>Generate prompts to monitor</span>
          </div>
          <Button 
            size="sm" 
            onClick={() => executeAction('generate_queries')}
            disabled={loading !== null}
          >
            {loading === 'generate_queries' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Generate
          </Button>
        </div>
      )}
    </div>
  )
}

export function ScanButton({ brandId, brandName }: { brandId: string; brandName?: string }) {
  const [showModal, setShowModal] = useState(false)

  // Lazy load the modal component
  const ScanProgressModal = require('./scan-progress-modal').ScanProgressModal

  return (
    <>
      <Button 
        onClick={() => setShowModal(true)} 
        size="sm"
        variant="outline"
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Scan
      </Button>
      
      {showModal && (
        <ScanProgressModal
          brandId={brandId}
          brandName={brandName || 'Brand'}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

export function GenerateMemoButton({ 
  brandId, 
  memoType,
  queryId 
}: { 
  brandId: string
  memoType: string
  queryId?: string 
}) {
  const [loading, setLoading] = useState(false)

  const generateMemo = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'generate_memo',
          memoType,
          queryId 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      toast.success(data.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={generateMemo} disabled={loading} size="sm">
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <FileText className="mr-2 h-4 w-4" />
      )}
      Generate
    </Button>
  )
}

// Memo type display labels
const MEMO_TYPE_LABELS: Record<string, string> = {
  comparison: 'Comparison',
  alternative: 'Alternative',
  how_to: 'How-To Guide',
  industry: 'Industry Guide',
  response: 'Response',
  gap_fill: 'Response',
  definition: 'Definition',
  guide: 'Guide',
}

// Suggestion-based memo generation: queries existing gaps and suggests the next best memo
export function GenerateMemoDropdown({ 
  brandId,
  memoCount = 0,
}: { 
  brandId: string
  memoCount?: number
}) {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingTitle, setGeneratingTitle] = useState('')
  const [memoCountAtGenStart, setMemoCountAtGenStart] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [suggesting, setSuggesting] = useState(false)

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // When memoCount increases after generation starts, clear generating state + stop polling
  useEffect(() => {
    if (generating && memoCount > memoCountAtGenStart) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      setGenerating(false)
      setGeneratingTitle('')
      toast.success('Memo generated')
    }
  }, [memoCount, memoCountAtGenStart, generating])
  const [suggestion, setSuggestion] = useState<{
    source: string
    topicId?: string
    queryId?: string
    title: string
    description?: string
    memoType: string
    contentType?: string
    category?: string
    priorityScore?: number
    competitorId?: string
    competitorName?: string
    citedUrls?: string[]
    citedDomain?: string
    citationCount?: number
    queryCount?: number
    funnelStage?: string
    persona?: string
  } | null>(null)
  const [noGaps, setNoGaps] = useState(false)
  const [showSuggestion, setShowSuggestion] = useState(false)
  const router = useRouter()

  const fetchSuggestion = useCallback(async () => {
    setSuggesting(true)
    setNoGaps(false)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suggest_next_memo' }),
      })
      const data = await response.json()
      if (data.suggestion) {
        setSuggestion(data.suggestion)
        setShowSuggestion(true)
      } else {
        setSuggestion(null)
        setNoGaps(true)
        setShowSuggestion(true)
      }
    } catch {
      toast.error('Failed to find suggestions')
    } finally {
      setSuggesting(false)
    }
  }, [brandId])

  const generateFromSuggestion = async () => {
    if (!suggestion) return
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        action: 'generate_memo',
        memoType: suggestion.memoType,
      }
      if (suggestion.queryId) body.queryId = suggestion.queryId
      if (suggestion.competitorId) body.competitorId = suggestion.competitorId
      if (suggestion.topicId) body.topicTitle = suggestion.title
      if (suggestion.description && suggestion.source === 'topic_universe') body.topicDescription = suggestion.description
      if (suggestion.citedUrls) body.citedUrls = suggestion.citedUrls

      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Generation failed')

      // Switch to generating state with skeleton
      const title = suggestion.title
      setShowSuggestion(false)
      setSuggestion(null)
      setGenerating(true)
      setGeneratingTitle(title)
      setMemoCountAtGenStart(memoCount)
      setLoading(false)

      // Poll by refreshing the page data every 5s, up to 60s
      // Each router.refresh() re-fetches server data, so the new memo
      // appears in the feed as soon as it's in the DB. The useEffect above
      // will auto-dismiss the skeleton when memoCount increases.
      if (pollRef.current) clearInterval(pollRef.current)
      let elapsed = 0
      pollRef.current = setInterval(() => {
        elapsed += 5000
        router.refresh()
        if (elapsed >= 60000) {
          if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
          setGenerating(false)
          setGeneratingTitle('')
          router.refresh()
          toast.info('Memo may still be generating. Refresh to check.')
        }
      }, 5000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation failed')
      setLoading(false)
    }
  }

  const skipSuggestion = async () => {
    // Fetch next suggestion (for now, just re-fetch -- the same top gap will return,
    // but this is the UX pattern; true skip would require marking topics as skipped)
    setSuggestion(null)
    setShowSuggestion(false)
    await fetchSuggestion()
  }

  // Generating state — show skeleton loader
  if (generating) {
    return (
      <div className="flex items-center gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-md">
          <div className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 text-amber-600 animate-spin shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-amber-900 leading-tight truncate">
                Generating: {generatingTitle || 'New memo'}
              </p>
              <p className="text-[10px] text-amber-600 mt-0.5">
                This usually takes 15–30 seconds
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Not showing suggestion yet -- just the button
  if (!showSuggestion) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={fetchSuggestion}
        disabled={suggesting}
      >
        {suggesting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
        ) : (
          <Sparkles className="h-4 w-4 mr-1.5" />
        )}
        {suggesting ? 'Finding gap...' : 'Generate Memo'}
      </Button>
    )
  }

  // No gaps found
  if (noGaps) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-xs text-slate-500 bg-slate-50 border rounded-lg px-3 py-2">
          No content gaps found. Run a scan or coverage audit first.
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setShowSuggestion(false); setNoGaps(false) }}>
          Dismiss
        </Button>
      </div>
    )
  }

  // Show suggestion card
  if (suggestion) {
    return (
      <div className="flex items-center gap-2">
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 max-w-md">
          <div className="flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-blue-900 leading-tight truncate">
                {suggestion.title}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-medium text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                  {suggestion.source === 'citation_response' ? 'Response' : (MEMO_TYPE_LABELS[suggestion.memoType] || suggestion.memoType)}
                </span>
                {suggestion.citedDomain && (
                  <span className="text-[10px] text-blue-500">
                    {suggestion.citationCount} citations · {suggestion.citedDomain}
                  </span>
                )}
                {!suggestion.citedDomain && suggestion.competitorName && (
                  <span className="text-[10px] text-blue-500">
                    vs {suggestion.competitorName}
                  </span>
                )}
                {suggestion.priorityScore && !suggestion.citedDomain && (
                  <span className="text-[10px] text-blue-400">
                    Priority: {suggestion.priorityScore}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          onClick={generateFromSuggestion}
          disabled={loading}
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <ArrowRight className="h-4 w-4 mr-1" />
          )}
          Generate
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={skipSuggestion}
          disabled={loading || suggesting}
          className="shrink-0 text-slate-400 hover:text-slate-600"
          title="Skip this suggestion"
        >
          {suggesting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <SkipForward className="h-3 w-3" />
          )}
        </Button>
      </div>
    )
  }

  return null
}

// Push memo to HubSpot button
export function PushToHubSpotButton({ 
  brandId, 
  memoId,
  hubspotEnabled,
  hubspotAutoPublish = false,
  hubspotSyncedAt
}: { 
  brandId: string
  memoId: string
  hubspotEnabled: boolean
  hubspotAutoPublish?: boolean
  hubspotSyncedAt?: string
}) {
  const [loading, setLoading] = useState(false)

  const pushToHubSpot = async () => {
    setLoading(true)
    try {
      // Use the brand's auto_publish setting
      const response = await fetch(`/api/brands/${brandId}/memos/${memoId}/hubspot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: hubspotAutoPublish }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Push failed')
      }

      toast.success(data.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Push to HubSpot failed')
    } finally {
      setLoading(false)
    }
  }

  if (!hubspotEnabled) {
    return null
  }

  return (
    <div className="flex items-center gap-1">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={pushToHubSpot}
        disabled={loading}
        title={hubspotSyncedAt 
          ? `Last synced: ${new Date(hubspotSyncedAt).toLocaleString()}` 
          : hubspotAutoPublish 
            ? 'Sync & Publish to HubSpot' 
            : 'Sync as draft to HubSpot'}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Upload className="h-3 w-3" />
        )}
        <span className="ml-1 text-xs">
          {hubspotSyncedAt ? 'Sync' : 'HubSpot'}
        </span>
      </Button>
    </div>
  )
}

// Discovery Scan - find where brand IS being mentioned
export function DiscoveryScanButton({ brandId }: { brandId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const runDiscoveryScan = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'discovery_scan' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Discovery scan failed')
      }

      toast.success('Discovery scan started - testing 50+ prompt variations. Results will appear in alerts.', {
        duration: 8000,
      })
      
      // Refresh after a delay to show results
      setTimeout(() => router.refresh(), 60000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Discovery scan failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      onClick={runDiscoveryScan} 
      disabled={loading}
      variant="outline"
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Search className="h-4 w-4" />
      )}
      Discovery Scan
    </Button>
  )
}

// Find and replicate competitor content gaps
export function FindContentGapsButton({ brandId, brandName, competitorCount }: { brandId: string; brandName?: string; competitorCount?: number }) {
  const [showModal, setShowModal] = useState(false)

  // Lazy load the modal component
  const GapsProgressModal = require('./gaps-progress-modal').GapsProgressModal

  return (
    <>
      <Button 
        onClick={() => setShowModal(true)}
        size="sm"
        variant="outline"
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        Find Gaps
      </Button>
      
      {showModal && (
        <GapsProgressModal
          brandId={brandId}
          brandName={brandName || 'Brand'}
          competitorCount={competitorCount || 0}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

// Generate memos from competitor content
export function GenerateMemosButton({ brandId }: { brandId: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'content-generate' }),
      })
      
      if (res.ok) {
        toast.success('Memo pipeline started - scanning, classifying, and generating memos')
        // Refresh after a delay
        setTimeout(() => router.refresh(), 5000)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to start')
      }
    } catch {
      toast.error('Failed to start content generation')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleClick}
      disabled={isLoading}
      size="sm"
      variant="outline"
      className="gap-2"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileText className="h-4 w-4" />
      )}
      Generate Memos
    </Button>
  )
}

// Refresh context extraction (re-analyze website for updated personas, products, etc.)
export function RefreshContextButton({ brandId }: { brandId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const refreshContext = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract_context' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Context extraction failed')
      }

      toast.success('Re-analyzing website for updated context. Personas and product info will be refreshed.', {
        duration: 8000,
      })
      
      // Refresh after extraction completes
      setTimeout(() => router.refresh(), 15000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Context extraction failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      onClick={refreshContext} 
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      Refresh Context
    </Button>
  )
}

// Update backlinks across all memos
export function UpdateBacklinksButton({ brandId, memoCount }: { brandId: string; memoCount?: number }) {
  const [loading, setLoading] = useState(false)

  const updateBacklinks = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_backlinks' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Backlink update failed')
      }

      toast.success(`Backlink update started${memoCount ? ` for ${memoCount} memos` : ''}. Internal links will be refreshed.`, {
        duration: 5000,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Backlink update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      onClick={updateBacklinks} 
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Link2 className="h-4 w-4" />
      )}
      Update Backlinks
    </Button>
  )
}

// Google AI Overview scan - check if brand appears in Google's AI summaries
export function AIOverviewScanButton({ brandId }: { brandId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const runAIOverviewScan = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ai_overview_scan', maxQueries: 10 }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'AI Overview scan failed')
      }

      toast.success('Google AI Overview scan started - checking your top 10 queries. Results will appear in scans.', {
        duration: 8000,
      })
      
      // Refresh after scan completes
      setTimeout(() => router.refresh(), 30000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI Overview scan failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      onClick={runAIOverviewScan} 
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Globe className="h-4 w-4" />
      )}
      AI Overview Scan
    </Button>
  )
}
