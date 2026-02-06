'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, Play, RefreshCw, FileText, Upload, Search, Link2, Globe, Plus, ChevronDown } from 'lucide-react'
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
        className="gap-2 rounded-none bg-[#0EA5E9] hover:bg-[#0284C7] text-white"
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

// Dropdown showing memo generation options
export function GenerateMemoDropdown({ 
  brandId
}: { 
  brandId: string
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const router = useRouter()

  const generateMemo = async (memoType: string) => {
    setLoading(memoType)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'generate_memo',
          memoType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      toast.success('Memo generation started. Refreshing in 10 seconds...', {
        duration: 10000,
      })
      
      // Refresh the page after 10 seconds to show the new memo
      setTimeout(() => {
        router.refresh()
      }, 10000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation failed')
    } finally {
      setLoading(null)
    }
  }

  const memoTypes = [
    { id: 'industry', label: 'Industry Overview' },
    { id: 'how_to', label: 'How-To Guide' },
    { id: 'alternative', label: 'Alternative To' },
  ]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={loading !== null}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <Plus className="h-4 w-4 mr-1.5" />
          )}
          Generate Memo
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {memoTypes.map((type) => (
          <DropdownMenuItem
            key={type.id}
            onClick={() => generateMemo(type.id)}
            disabled={loading !== null}
          >
            <FileText className="h-4 w-4 mr-2" />
            {type.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
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
        className="gap-2 rounded-none bg-[#10B981] hover:bg-[#059669] text-white"
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
      className="gap-2 rounded-none bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
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
      className="gap-2 rounded-none border-2 border-[#0F172A] hover:bg-[#0F172A] hover:text-white"
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
