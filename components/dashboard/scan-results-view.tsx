'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  ChevronDown, 
  ChevronUp, 
  ChevronRight,
  CheckCircle2, 
  XCircle, 
  Bot,
  MessageSquare,
  Users,
  AlertTriangle,
  Link,
  ExternalLink,
  TrendingUp,
  Target,
  Lightbulb,
  Plus,
  X,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import type { ScanResult, Query, PromptPersona, PromptTheme } from '@/lib/supabase/types'
import { QueryDetail } from './query-detail'

// Prompt Themes Section - Critical keyword clusters for prompt targeting
interface PromptThemesSectionProps {
  brandId: string
  themes: PromptTheme[]
}

export function PromptThemesSection({ brandId, themes: initialThemes }: PromptThemesSectionProps) {
  const [isAddingTheme, setIsAddingTheme] = useState(false)
  const [newTheme, setNewTheme] = useState('')
  const [themes, setThemes] = useState<PromptTheme[]>(initialThemes)
  const router = useRouter()

  useEffect(() => {
    setThemes(initialThemes)
  }, [initialThemes])

  const addTheme = async () => {
    if (!newTheme.trim()) return
    
    if (themes.some(t => t.theme.toLowerCase() === newTheme.toLowerCase().trim())) {
      toast.error('This theme already exists')
      return
    }

    const theme: PromptTheme = {
      theme: newTheme.trim(),
      priority: 'high',
      auto_detected: false
    }
    
    const updatedThemes = [...themes, theme]
    setThemes(updatedThemes)
    setNewTheme('')
    setIsAddingTheme(false)
    
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_themes',
          themes: updatedThemes
        }),
      })
      
      if (!response.ok) throw new Error('Failed to save')
      toast.success('Theme added')
      router.refresh()
    } catch {
      toast.error('Failed to save theme')
      setThemes(themes)
    }
  }

  const removeTheme = async (themeToRemove: string) => {
    const updatedThemes = themes.filter(t => t.theme !== themeToRemove)
    setThemes(updatedThemes)
    
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_themes',
          themes: updatedThemes
        }),
      })
      
      if (!response.ok) throw new Error('Failed to save')
      toast.success('Theme removed')
      router.refresh()
    } catch {
      toast.error('Failed to remove theme')
      setThemes(themes)
    }
  }

  const togglePriority = async (themeText: string) => {
    const updatedThemes = themes.map(t => {
      if (t.theme === themeText) {
        const newPriority = t.priority === 'high' ? 'medium' : t.priority === 'medium' ? 'low' : 'high'
        return { ...t, priority: newPriority }
      }
      return t
    })
    setThemes(updatedThemes as PromptTheme[])
    
    try {
      await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_themes',
          themes: updatedThemes
        }),
      })
      router.refresh()
    } catch {
      // Silent fail for priority toggle
    }
  }

  return (
    <Card className="border-2 border-[#10B981]/30" style={{ borderLeft: '4px solid #10B981' }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-[#10B981]" />
            <CardTitle className="text-base">Prompt Themes</CardTitle>
          </div>
          {!isAddingTheme && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsAddingTheme(true)}
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              Add Theme
            </Button>
          )}
        </div>
        <CardDescription>
          Keyword clusters that define what prompts should target. Click priority to change.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isAddingTheme && (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="e.g., temperature monitoring, food safety..."
              value={newTheme}
              onChange={(e) => setNewTheme(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTheme()}
              className="flex-1"
              autoFocus
            />
            <Button size="sm" onClick={addTheme}>Add</Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsAddingTheme(false); setNewTheme('') }}>
              Cancel
            </Button>
          </div>
        )}

        {themes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {themes
              .sort((a, b) => {
                const order = { high: 0, medium: 1, low: 2 }
                return order[a.priority] - order[b.priority]
              })
              .map((theme, i) => (
                <div 
                  key={i} 
                  className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
                    theme.priority === 'high' 
                      ? 'bg-[#10B981]/10 border-[#10B981] text-[#10B981]' 
                      : theme.priority === 'medium'
                      ? 'bg-[#F59E0B]/10 border-[#F59E0B] text-[#F59E0B]'
                      : 'bg-zinc-100 border-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <button 
                    onClick={() => togglePriority(theme.theme)}
                    className="font-medium text-sm hover:underline"
                    title={`Priority: ${theme.priority} (click to change)`}
                  >
                    {theme.theme}
                  </button>
                  {theme.auto_detected && (
                    <span title="Auto-detected">
                      <Sparkles className="h-3 w-3 opacity-60" />
                    </span>
                  )}
                  <button 
                    onClick={() => removeTheme(theme.theme)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-4 text-center">
            No prompt themes defined. Add keyword clusters like &quot;temperature monitoring&quot; or &quot;compliance automation&quot;.
          </div>
        )}

        {themes.length > 0 && (
          <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
              High priority
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
              Medium
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
              Low
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Get display info for any persona - formats the ID into a nice label
function getPersonaDisplay(persona: string): { label: string; color: string } {
  // Generate a nice label from the persona ID (snake_case to Title Case)
  const label = persona
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  
  // Use a consistent color for all personas
  return { 
    label, 
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' 
  }
}

interface ScanResultWithQuery extends ScanResult {
  query?: Query
  isBrandedQuery?: boolean
}

// Helper to extract domain from URL for display
function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// Competitor citation tracking
interface CompetitorCitationStats {
  name: string
  domain: string | null
  citationCount: number
  mentionCount: number
  queryCount: number // unique queries where this competitor was cited/mentioned
}

interface ScanResultsViewProps {
  scanResults: ScanResultWithQuery[]
  queries: Query[]
  brandName: string
  brandDomain?: string
  competitors?: Array<{ id: string; name: string; domain: string | null; is_active: boolean }>
}

// Grouped scans by query
interface GroupedScan {
  queryId: string
  query?: Query
  isBranded: boolean
  scannedAt: string
  scans: ScanResultWithQuery[]
  // Computed fields for insights
  competitorsCited: string[] // competitor names that were cited (domain match)
  competitorsMentioned: string[] // competitor names mentioned in responses
  isOpportunity: boolean // known competitors cited/mentioned but brand isn't
}

// Helper to check if a query contains the brand name
function queryContainsBrand(queryText: string, brandName: string): boolean {
  return queryText.toLowerCase().includes(brandName.toLowerCase())
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function getModelDisplay(model: string) {
  const m = model.toLowerCase()
  if (m.includes('gpt') || m.includes('openai')) {
    return { name: 'GPT', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', key: 'openai' }
  }
  if (m.includes('claude') || m.includes('anthropic')) {
    return { name: 'Claude', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', key: 'claude' }
  }
  if (m.includes('gemini')) {
    return { name: 'Gemini', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', key: 'gemini' }
  }
  if (m.includes('llama')) {
    return { name: 'Llama', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200', key: 'llama' }
  }
  if (m.includes('mistral')) {
    return { name: 'Mistral', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200', key: 'mistral' }
  }
  if (m.includes('perplexity') || m.includes('sonar')) {
    return { name: 'Perplexity', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200', key: 'perplexity' }
  }
  if (m.includes('grok')) {
    return { name: 'Grok', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200', key: 'grok' }
  }
  return { name: model, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', key: 'other' }
}

// Single model result row within a grouped card - compact version
function ModelResult({ scan, brandDomain, compact = false }: { scan: ScanResultWithQuery; brandDomain?: string; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const modelInfo = getModelDisplay(scan.model)
  
  // Check if a citation URL contains the brand's domain
  const isBrandCitation = (url: string): boolean => {
    if (!brandDomain) return false
    const normalizedDomain = brandDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '')
    const citationDomain = getDomainFromUrl(url).toLowerCase()
    return citationDomain.includes(normalizedDomain) || normalizedDomain.includes(citationDomain)
  }
  
  // Check if this scan has citation data
  const hasCitations = scan.citations && scan.citations.length > 0
  
  // Get non-brand citations for insights
  const competitorCitations = scan.citations?.filter(url => !isBrandCitation(url)) || []
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={modelInfo.color} variant="secondary">
            <Bot className="h-3 w-3 mr-1" />
            {modelInfo.name}
          </Badge>
          {/* Citation status is the primary indicator */}
          {hasCitations ? (
            scan.brand_in_citations ? (
              <Badge className="bg-emerald-500 text-white" title="Your domain was cited as a source">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Cited
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground border-orange-300 dark:border-orange-700" title="Your domain was not cited as a source">
                <XCircle className="h-3 w-3 mr-1" />
                Not Cited
              </Badge>
            )
          ) : (
            // Fallback to mention status if no citation data
            scan.brand_mentioned ? (
              <Badge className="bg-green-500 text-white">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Mentioned
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                <XCircle className="h-3 w-3 mr-1" />
                Not Mentioned
              </Badge>
            )
          )}
        </div>
        {/* Show competitor names mentioned in response */}
        {scan.competitors_mentioned && scan.competitors_mentioned.length > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <Users className="h-3 w-3 text-orange-500" />
            <span className="text-orange-600 dark:text-orange-400 text-xs">{scan.competitors_mentioned.join(', ')}</span>
          </div>
        )}
      </div>
      
      {/* Brand context snippet - only show when cited/mentioned */}
      {scan.brand_mentioned && scan.brand_context && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded p-2">
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            {scan.brand_context}
          </p>
        </div>
      )}

      {/* Compact citations display - just show top domains */}
      {hasCitations && competitorCitations.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground">Sources:</span>
          {competitorCitations.slice(0, 5).map((url, i) => {
            const domain = getDomainFromUrl(url)
            return (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-muted hover:bg-muted/80 transition-colors"
                title={url}
              >
                {domain}
              </a>
            )
          })}
          {competitorCitations.length > 5 && (
            <span className="text-xs text-muted-foreground">+{competitorCitations.length - 5} more</span>
          )}
        </div>
      )}

      {/* Expand/collapse for full response */}
      {scan.response_text && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-6 px-2 text-xs"
          >
            {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {expanded ? 'Hide' : 'Show'} response
          </Button>
          {expanded && (
            <div className="mt-2 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{scan.response_text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Grouped card showing all model results for one query
function GroupedScanCard({ group, brandDomain, filterMode }: { group: GroupedScan; brandDomain?: string; filterMode?: string }) {
  // Count citations across models
  const citedCount = group.scans.filter(s => s.brand_in_citations === true).length
  const totalWithCitations = group.scans.filter(s => s.citations && s.citations.length > 0).length
  
  // Filter scans based on filter mode for cleaner display
  const scansToShow = filterMode === 'cited' 
    ? group.scans.filter(s => s.brand_in_citations === true)
    : filterMode === 'not_cited'
    ? group.scans.filter(s => s.citations && s.citations.length > 0 && s.brand_in_citations !== true)
    : group.scans
  
  return (
    <div className={`border rounded-lg p-4 space-y-3 ${
      group.isBranded ? 'opacity-60 border-dashed' : 
      group.isOpportunity ? 'border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20' : ''
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="font-medium text-sm">
              &quot;{group.query?.query_text || 'Unknown prompt'}&quot;
            </p>
            {group.isBranded && (
              <Badge variant="outline" className="text-xs shrink-0">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Branded
              </Badge>
            )}
            {group.isOpportunity && !group.isBranded && (
              <Badge className="bg-orange-500 text-white text-xs shrink-0">
                <Target className="h-3 w-3 mr-1" />
                Opportunity
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatDate(group.scannedAt)}</span>
            {totalWithCitations > 0 && (
              <>
                <span>•</span>
                <span className={citedCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                  {citedCount}/{totalWithCitations} models cite you
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Opportunity insight - show which competitors are winning (hide when filtering on cited) */}
      {group.isOpportunity && filterMode !== 'cited' && (
        <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded p-2">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              {group.competitorsCited.length > 0 ? (
                <>
                  <span className="font-medium text-orange-800 dark:text-orange-200">
                    Competitors being cited:
                  </span>
                  <span className="text-orange-700 dark:text-orange-300 ml-1">
                    {group.competitorsCited.slice(0, 3).join(', ')}
                    {group.competitorsCited.length > 3 && ` +${group.competitorsCited.length - 3} more`}
                  </span>
                </>
              ) : group.competitorsMentioned.length > 0 ? (
                <>
                  <span className="font-medium text-orange-800 dark:text-orange-200">
                    Competitors mentioned:
                  </span>
                  <span className="text-orange-700 dark:text-orange-300 ml-1">
                    {group.competitorsMentioned.slice(0, 3).join(', ')}
                    {group.competitorsMentioned.length > 3 && ` +${group.competitorsMentioned.length - 3} more`}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Model results - compact layout, filtered based on mode */}
      <div className="space-y-2 divide-y divide-dashed">
        {scansToShow.map((scan, idx) => (
          <div key={scan.id} className={idx > 0 ? 'pt-2' : ''}>
            <ModelResult scan={scan} brandDomain={brandDomain} compact />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ScanResultsView({ scanResults, queries, brandName, brandDomain, competitors = [] }: ScanResultsViewProps) {
  const [filter, setFilter] = useState<'all' | 'opportunities' | 'cited' | 'not_cited'>('all')
  
  // Create a map of queries for easy lookup
  const queryMap = new Map(queries.map(q => [q.id, q]))
  
  // Create a set of branded query IDs
  const brandedQueryIds = new Set(
    queries
      .filter(q => queryContainsBrand(q.query_text, brandName))
      .map(q => q.id)
  )

  // Helper to check if a URL is the brand's domain
  const isBrandDomain = (url: string): boolean => {
    if (!brandDomain) return false
    const normalizedDomain = brandDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '')
    const citationDomain = getDomainFromUrl(url).toLowerCase()
    return citationDomain.includes(normalizedDomain) || normalizedDomain.includes(citationDomain)
  }

  // Helper to check if a URL belongs to a known competitor
  const getCompetitorFromUrl = (url: string): string | null => {
    const citationDomain = getDomainFromUrl(url).toLowerCase()
    for (const competitor of competitors) {
      if (!competitor.domain) continue
      const competitorDomain = competitor.domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '')
      if (citationDomain.includes(competitorDomain) || competitorDomain.includes(citationDomain)) {
        return competitor.name
      }
    }
    return null
  }
  
  // Compute all stats using useMemo for performance
  const {
    groupedScans: allGroupedScans,
    competitorStats,
    citationPct,
    brandCitedCount,
    scansWithCitations,
    opportunityCount,
    citedCount,
    totalQueries
  } = useMemo(() => {
    // Enrich scan results with query data and branded flag
    const enrichedScans = scanResults.map(scan => ({
      ...scan,
      query: queryMap.get(scan.query_id),
      isBrandedQuery: brandedQueryIds.has(scan.query_id)
    }))
    
    // Track competitor citations/mentions across all scans (only known competitors)
    const competitorTracking = new Map<string, { citationCount: number; mentionCount: number; queries: Set<string> }>()
    
    // Group scans by query_id + scan date (rounded to same scan batch)
    const groupedScansMap = new Map<string, GroupedScan>()
    
    enrichedScans.forEach(scan => {
      // Create a group key based on query_id and scan date (rounded to hour)
      const scanDate = new Date(scan.scanned_at)
      const dateKey = `${scan.query_id}-${scanDate.toISOString().slice(0, 13)}` // YYYY-MM-DDTHH
      
      // Track known competitor citations
      if (scan.citations && !scan.isBrandedQuery) {
        scan.citations.forEach(url => {
          const competitorName = getCompetitorFromUrl(url)
          if (competitorName) {
            const existing = competitorTracking.get(competitorName) || { citationCount: 0, mentionCount: 0, queries: new Set() }
            existing.citationCount++
            existing.queries.add(scan.query_id)
            competitorTracking.set(competitorName, existing)
          }
        })
      }
      
      // Track known competitor mentions in response text
      if (scan.competitors_mentioned && !scan.isBrandedQuery) {
        scan.competitors_mentioned.forEach(name => {
          // Check if this is a known competitor
          const isKnown = competitors.some(c => c.name.toLowerCase() === name.toLowerCase())
          if (isKnown) {
            const existing = competitorTracking.get(name) || { citationCount: 0, mentionCount: 0, queries: new Set() }
            existing.mentionCount++
            existing.queries.add(scan.query_id)
            competitorTracking.set(name, existing)
          }
        })
      }
      
      const existing = groupedScansMap.get(dateKey)
      if (existing) {
        // Dedupe: only add if this model isn't already in the group
        const modelKey = getModelDisplay(scan.model).key
        const hasModel = existing.scans.some(s => getModelDisplay(s.model).key === modelKey)
        if (!hasModel) {
          existing.scans.push(scan)
        }
        // Update scannedAt to the most recent
        if (new Date(scan.scanned_at) > new Date(existing.scannedAt)) {
          existing.scannedAt = scan.scanned_at
        }
      } else {
        groupedScansMap.set(dateKey, {
          queryId: scan.query_id,
          query: scan.query,
          isBranded: scan.isBrandedQuery || false,
          scannedAt: scan.scanned_at,
          scans: [scan],
          competitorsCited: [],
          competitorsMentioned: [],
          isOpportunity: false
        })
      }
    })
    
    // Compute insights for each group - focused on known competitors
    groupedScansMap.forEach(group => {
      const competitorsCitedSet = new Set<string>()
      const competitorsMentionedSet = new Set<string>()
      let hasCitations = false
      let brandCited = false
      
      group.scans.forEach(scan => {
        if (scan.citations && scan.citations.length > 0) {
          hasCitations = true
          if (scan.brand_in_citations) brandCited = true
          // Check each citation for known competitors
          scan.citations.forEach(url => {
            const competitorName = getCompetitorFromUrl(url)
            if (competitorName) {
              competitorsCitedSet.add(competitorName)
            }
          })
        }
        // Also track competitors mentioned in response
        if (scan.competitors_mentioned) {
          scan.competitors_mentioned.forEach(name => {
            const isKnown = competitors.some(c => c.name.toLowerCase() === name.toLowerCase())
            if (isKnown) {
              competitorsMentionedSet.add(name)
            }
          })
        }
      })
      
      group.competitorsCited = Array.from(competitorsCitedSet)
      group.competitorsMentioned = Array.from(competitorsMentionedSet)
      
      // It's an opportunity if:
      // 1. Has citations AND known competitor is cited but brand isn't, OR
      // 2. Known competitor is mentioned in responses but brand isn't
      const hasCompetitorPresence = group.competitorsCited.length > 0 || group.competitorsMentioned.length > 0
      const brandMentioned = group.scans.some(s => s.brand_mentioned)
      group.isOpportunity = !group.isBranded && hasCompetitorPresence && !brandCited && !brandMentioned
    })
    
    // Convert to sorted array
    const groupedScans = Array.from(groupedScansMap.values())
      .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
    
    // Convert competitor stats to sorted array
    const competitorStats: CompetitorCitationStats[] = Array.from(competitorTracking.entries())
      .map(([name, stats]) => {
        const competitor = competitors.find(c => c.name === name)
        return {
          name,
          domain: competitor?.domain || null,
          citationCount: stats.citationCount,
          mentionCount: stats.mentionCount,
          queryCount: stats.queries.size
        }
      })
      .sort((a, b) => (b.citationCount + b.mentionCount) - (a.citationCount + a.mentionCount))
    
    // Calculate citation rate - exclude branded queries
    const unbiasedScans = scanResults.filter(s => !brandedQueryIds.has(s.query_id))
    const scansWithCitations = unbiasedScans.filter(s => s.citations && s.citations.length > 0)
    const brandCitedCount = scansWithCitations.filter(s => s.brand_in_citations === true).length
    const citationPct = scansWithCitations.length > 0 
      ? Math.round((brandCitedCount / scansWithCitations.length) * 100) 
      : 0
    
    // Count opportunities and cited
    const opportunityCount = groupedScans.filter(g => g.isOpportunity).length
    const citedCount = groupedScans.filter(g => g.scans.some(s => s.brand_in_citations === true)).length
    
    return {
      groupedScans,
      competitorStats,
      citationPct,
      brandCitedCount,
      scansWithCitations,
      opportunityCount,
      citedCount,
      totalQueries: groupedScansMap.size
    }
  }, [scanResults, queries, brandName, brandDomain, competitors, queryMap, brandedQueryIds])
  
  // Apply filter
  const filteredScans = useMemo(() => {
    switch (filter) {
      case 'opportunities':
        return allGroupedScans.filter(g => g.isOpportunity)
      case 'cited':
        return allGroupedScans.filter(g => g.scans.some(s => s.brand_in_citations === true))
      case 'not_cited':
        return allGroupedScans.filter(g => 
          g.scans.some(s => s.citations && s.citations.length > 0) &&
          g.scans.every(s => s.brand_in_citations !== true)
        )
      default:
        return allGroupedScans
    }
  }, [allGroupedScans, filter])
  
  // Get top competitor for display
  const topCompetitor = competitorStats[0]
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Scan Results</CardTitle>
            <CardDescription>
              See what AI models say when asked about your industry
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{citationPct}%</p>
            <p className="text-xs text-muted-foreground">
              citation rate
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
          <div>
            <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{brandCitedCount}</p>
            <p className="text-xs text-muted-foreground">scans cite you</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">{opportunityCount}</p>
            <p className="text-xs text-muted-foreground">opportunities</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{scansWithCitations.length}</p>
            <p className="text-xs text-muted-foreground">total scans</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{totalQueries}</p>
            <p className="text-xs text-muted-foreground">prompts tested</p>
          </div>
        </div>

        {/* Top Competitor Insight - only show if we have known competitors being cited */}
        {topCompetitor && (topCompetitor.citationCount + topCompetitor.mentionCount) > 0 && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
            <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
            <p className="text-sm">
              <span className="font-medium text-orange-800 dark:text-orange-200">{topCompetitor.name}</span>
              <span className="text-orange-700 dark:text-orange-300">
                {topCompetitor.citationCount > 0 
                  ? ` is cited ${topCompetitor.citationCount}x`
                  : ` is mentioned ${topCompetitor.mentionCount}x`
                }
                {' '}across {topCompetitor.queryCount} prompts
              </span>
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-1">
          <Button
            variant={filter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({totalQueries})
          </Button>
          {opportunityCount > 0 && (
            <Button
              variant={filter === 'opportunities' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('opportunities')}
              className={filter !== 'opportunities' ? 'text-orange-600 dark:text-orange-400' : ''}
            >
              <Target className="h-3 w-3 mr-1" />
              Opportunities ({opportunityCount})
            </Button>
          )}
          <Button
            variant={filter === 'cited' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('cited')}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Cited ({citedCount})
          </Button>
          <Button
            variant={filter === 'not_cited' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilter('not_cited')}
          >
            <XCircle className="h-3 w-3 mr-1" />
            Not Cited
          </Button>
        </div>

        {/* Results */}
        {filteredScans.length > 0 ? (
          <div className="space-y-3">
            {filteredScans.slice(0, 50).map((group, idx) => (
              <GroupedScanCard 
                key={`${group.queryId}-${group.scannedAt}-${idx}`}
                group={group}
                brandDomain={brandDomain}
                filterMode={filter}
              />
            ))}
            {filteredScans.length > 50 && (
              <p className="text-center text-sm text-muted-foreground py-2">
                Showing 50 of {filteredScans.length} prompt results
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-8 text-center">
            {scanResults.length === 0 
              ? 'No scans yet. Run a scan to see how AI models respond to prompts about your industry.'
              : 'No results match your filters.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Prompt visibility component to show per-prompt breakdown
interface PromptWithVisibility {
  id: string
  query_text: string
  query_type: string | null
  persona: PromptPersona | null
  priority: number
  visibility: number
  totalScans: number
  mentionedCount: number
  isBranded: boolean
}

interface PromptVisibilityListProps {
  queries: Query[]
  scanResults: ScanResult[]
  brandName: string
  brandId?: string
  themes?: PromptTheme[]
}

// Keep old name as alias for backward compatibility
export const QueryVisibilityList = PromptVisibilityList

export function PromptVisibilityList({ queries, scanResults, brandName, brandId, themes = [] }: PromptVisibilityListProps) {
  const [personaFilter, setPersonaFilter] = useState<PromptPersona | 'all'>('all')
  const [selectedQuery, setSelectedQuery] = useState<Query | null>(null)
  const [isAddingPrompt, setIsAddingPrompt] = useState(false)
  const [newPrompt, setNewPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const addPrompt = async () => {
    if (!newPrompt.trim() || !brandId) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'add_prompt',
          query_text: newPrompt.trim()
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add prompt')
      }
      
      toast.success('Prompt added')
      setNewPrompt('')
      setIsAddingPrompt(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add prompt')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Calculate visibility per prompt
  const promptStats = new Map<string, { mentioned: number; total: number }>()
  scanResults.forEach(scan => {
    if (!scan.query_id) return
    const current = promptStats.get(scan.query_id) || { mentioned: 0, total: 0 }
    current.total++
    if (scan.brand_mentioned) current.mentioned++
    promptStats.set(scan.query_id, current)
  })

  const promptsWithVisibility: PromptWithVisibility[] = queries.map(q => {
    const stats = promptStats.get(q.id)
    const isBranded = queryContainsBrand(q.query_text, brandName)
    return {
      id: q.id,
      query_text: q.query_text,
      query_type: q.query_type,
      persona: (q as any).persona || null,
      priority: q.priority,
      visibility: stats && stats.total > 0 
        ? Math.round((stats.mentioned / stats.total) * 100)
        : -1, // -1 means no scans yet
      totalScans: stats?.total || 0,
      mentionedCount: stats?.mentioned || 0,
      isBranded
    }
  }).sort((a, b) => {
    // Put branded prompts at the end
    if (a.isBranded && !b.isBranded) return 1
    if (!a.isBranded && b.isBranded) return -1
    // Sort by visibility (lowest first), but put unscanned at end
    if (a.visibility === -1 && b.visibility === -1) return 0
    if (a.visibility === -1) return 1
    if (b.visibility === -1) return -1
    return a.visibility - b.visibility
  })

  // Apply persona filter
  const filteredPrompts = personaFilter === 'all' 
    ? promptsWithVisibility 
    : promptsWithVisibility.filter(p => p.persona === personaFilter)

  // Count prompts by persona
  const personaCounts = promptsWithVisibility.reduce((acc, p) => {
    if (p.persona) {
      acc[p.persona] = (acc[p.persona] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-4">
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Prompt Performance</CardTitle>
            <CardDescription>
              See which prompts mention you and which need attention
            </CardDescription>
          </div>
          {brandId && !isAddingPrompt && (
            <Button variant="outline" onClick={() => setIsAddingPrompt(true)} className="gap-1">
              <Plus className="h-4 w-4" />
              Add Prompt
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Prompt Input */}
        {isAddingPrompt && (
          <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
            <Input
              placeholder="Enter a prompt to track, e.g., 'best CRM for small business'"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPrompt()}
              className="flex-1"
              autoFocus
              disabled={isSubmitting}
            />
            <Button size="sm" onClick={addPrompt} disabled={isSubmitting || !newPrompt.trim()}>
              {isSubmitting ? 'Adding...' : 'Add'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsAddingPrompt(false); setNewPrompt('') }} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        )}
        
        {/* Persona filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={personaFilter === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPersonaFilter('all')}
          >
            All ({promptsWithVisibility.length})
          </Button>
          {Object.entries(personaCounts).map(([persona, count]) => {
            const display = getPersonaDisplay(persona)
            return (
              <Button
                key={persona}
                variant={personaFilter === persona ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setPersonaFilter(persona as PromptPersona)}
              >
                {display.label} ({count})
              </Button>
            )
          })}
        </div>

        {filteredPrompts.length > 0 ? (
          <div className="space-y-2">
            {filteredPrompts.map((prompt) => {
              const query = queries.find(q => q.id === prompt.id)
              return (
                <div 
                  key={prompt.id} 
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors group ${
                    prompt.isBranded ? 'opacity-60 border-dashed' : ''
                  }`}
                  onClick={() => query && setSelectedQuery(query)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">&quot;{prompt.query_text}&quot;</p>
                      {prompt.persona && (
                        <Badge className={`text-xs ${getPersonaDisplay(prompt.persona).color}`}>
                          {getPersonaDisplay(prompt.persona).label}
                        </Badge>
                      )}
                      {prompt.isBranded && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Branded
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {prompt.query_type?.replace('_', ' ')}
                      {prompt.totalScans > 0 && (
                        <span className="ml-2">
                          • {prompt.mentionedCount}/{prompt.totalScans} scans
                        </span>
                      )}
                      {prompt.isBranded && ' • Excluded from visibility score'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {prompt.isBranded ? (
                      <Badge variant="outline" className="text-muted-foreground">N/A</Badge>
                    ) : prompt.visibility === -1 ? (
                      <Badge variant="outline">No scans</Badge>
                    ) : prompt.visibility >= 70 ? (
                      <Badge className="bg-green-500 text-white">{prompt.visibility}%</Badge>
                    ) : prompt.visibility >= 30 ? (
                      <Badge className="bg-yellow-500 text-white">{prompt.visibility}%</Badge>
                    ) : (
                      <Badge variant="destructive">{prompt.visibility}%</Badge>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            {promptsWithVisibility.length === 0
              ? 'No prompts generated yet. Complete the setup to auto-generate relevant prompts.'
              : 'No prompts match the selected filter.'}
          </p>
        )}

        {/* Query Detail Drawer */}
        <QueryDetail
          query={selectedQuery}
          isOpen={!!selectedQuery}
          onClose={() => setSelectedQuery(null)}
          brandName={brandName}
          scanResults={scanResults}
          isBranded={selectedQuery ? queryContainsBrand(selectedQuery.query_text, brandName) : false}
        />
      </CardContent>
    </Card>
    
    {/* Prompt Themes Section */}
    {brandId && (
      <PromptThemesSection brandId={brandId} themes={themes} />
    )}
    </div>
  )
}
