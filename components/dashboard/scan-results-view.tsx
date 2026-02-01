'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  XCircle, 
  Bot,
  MessageSquare,
  Users,
  AlertTriangle
} from 'lucide-react'
import type { ScanResult, Query, PromptPersona, CorePersona } from '@/lib/supabase/types'
import { PERSONA_CONFIGS as PersonaConfigs } from '@/lib/supabase/types'

// Core persona display configuration
const CORE_PERSONA_DISPLAY: Record<CorePersona, { label: string; color: string }> = {
  b2b_marketer: { label: 'B2B Marketer', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  developer: { label: 'Developer', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  product_leader: { label: 'Product Leader', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  enterprise_buyer: { label: 'Enterprise', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200' },
  smb_owner: { label: 'SMB Owner', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  student: { label: 'Student', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' },
}

// Get display info for any persona (core or custom)
function getPersonaDisplay(persona: string): { label: string; color: string } {
  // Check if it's a core persona
  if (persona in CORE_PERSONA_DISPLAY) {
    return CORE_PERSONA_DISPLAY[persona as CorePersona]
  }
  // Custom persona - generate a nice label and use a neutral color
  const label = persona
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
  return { 
    label, 
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' 
  }
}

interface ScanResultWithQuery extends ScanResult {
  query?: Query
  isBrandedQuery?: boolean
}

interface ScanResultsViewProps {
  scanResults: ScanResultWithQuery[]
  queries: Query[]
  brandName: string
}

// Grouped scans by query
interface GroupedScan {
  queryId: string
  query?: Query
  isBranded: boolean
  scannedAt: string
  scans: ScanResultWithQuery[]
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
  return { name: model, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', key: 'other' }
}

// Single model result row within a grouped card
function ModelResult({ scan }: { scan: ScanResultWithQuery }) {
  const [expanded, setExpanded] = useState(false)
  const modelInfo = getModelDisplay(scan.model)
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className={modelInfo.color} variant="secondary">
            <Bot className="h-3 w-3 mr-1" />
            {modelInfo.name}
          </Badge>
          {scan.brand_mentioned ? (
            <Badge className="bg-green-500 text-white">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Mentioned
            </Badge>
          ) : (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              Not Mentioned
            </Badge>
          )}
          {scan.brand_mentioned && scan.brand_position && (
            <span className="text-sm text-muted-foreground">
              Position #{scan.brand_position}
            </span>
          )}
        </div>
        {scan.competitors_mentioned && scan.competitors_mentioned.length > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{scan.competitors_mentioned.join(', ')}</span>
          </div>
        )}
      </div>
      
      {/* Brand context snippet */}
      {scan.brand_mentioned && scan.brand_context && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded p-2 ml-0">
          <p className="text-sm text-green-800 dark:text-green-200">
            {scan.brand_context}
          </p>
        </div>
      )}

      {/* Expand/collapse for full response */}
      {scan.response_text && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="h-7 px-2 text-xs"
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
function GroupedScanCard({ group }: { group: GroupedScan }) {
  return (
    <div className={`border rounded-lg p-4 space-y-4 ${group.isBranded ? 'opacity-60 border-dashed' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="font-medium">
              &quot;{group.query?.query_text || 'Unknown prompt'}&quot;
            </p>
            {group.isBranded && (
              <Badge variant="outline" className="text-xs shrink-0">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Branded
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDate(group.scannedAt)}
            {group.isBranded && ' • Excluded from visibility score'}
          </p>
        </div>
      </div>

      {/* Model results */}
      <div className="space-y-3 divide-y">
        {group.scans.map((scan, idx) => (
          <div key={scan.id} className={idx > 0 ? 'pt-3' : ''}>
            <ModelResult scan={scan} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ScanResultsView({ scanResults, queries, brandName }: ScanResultsViewProps) {
  const [filter, setFilter] = useState<'all' | 'mentioned' | 'not_mentioned'>('all')
  
  // Create a map of queries for easy lookup
  const queryMap = new Map(queries.map(q => [q.id, q]))
  
  // Create a set of branded query IDs
  const brandedQueryIds = new Set(
    queries
      .filter(q => queryContainsBrand(q.query_text, brandName))
      .map(q => q.id)
  )
  
  // Enrich scan results with query data and branded flag
  const enrichedScans = scanResults.map(scan => ({
    ...scan,
    query: queryMap.get(scan.query_id),
    isBrandedQuery: brandedQueryIds.has(scan.query_id)
  }))
  
  // Group scans by query_id + scan date (rounded to same scan batch)
  // Scans from the same query within 1 hour are grouped together
  const groupedScansMap = new Map<string, GroupedScan>()
  
  enrichedScans.forEach(scan => {
    // Create a group key based on query_id and scan date (rounded to hour)
    const scanDate = new Date(scan.scanned_at)
    const dateKey = `${scan.query_id}-${scanDate.toISOString().slice(0, 13)}` // YYYY-MM-DDTHH
    
    const existing = groupedScansMap.get(dateKey)
    if (existing) {
      existing.scans.push(scan)
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
        scans: [scan]
      })
    }
  })
  
  // Convert to array and sort by date
  let groupedScans = Array.from(groupedScansMap.values())
    .sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime())
  
  // Apply filter
  if (filter === 'mentioned') {
    groupedScans = groupedScans.filter(group => 
      group.scans.some(s => s.brand_mentioned)
    )
  } else if (filter === 'not_mentioned') {
    groupedScans = groupedScans.filter(group => 
      group.scans.every(s => !s.brand_mentioned)
    )
  }
  
  // Stats - exclude branded queries from visibility calculation
  const unbiasedScans = scanResults.filter(s => !brandedQueryIds.has(s.query_id))
  const totalScans = unbiasedScans.length
  const mentionedCount = unbiasedScans.filter(s => s.brand_mentioned).length
  const visibilityPct = totalScans > 0 ? Math.round((mentionedCount / totalScans) * 100) : 0
  const brandedCount = scanResults.length - unbiasedScans.length
  const totalQueries = groupedScansMap.size
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Scan Results</CardTitle>
            <CardDescription>
              See exactly what AI models say when asked about your industry
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{visibilityPct}%</p>
            <p className="text-xs text-muted-foreground">
              {mentionedCount} of {totalScans} scans mention you
              {brandedCount > 0 && (
                <span className="block text-muted-foreground/70">
                  ({brandedCount} branded prompt scans excluded)
                </span>
              )}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1">
            <Button
              variant={filter === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({totalQueries})
            </Button>
            <Button
              variant={filter === 'mentioned' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('mentioned')}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Has Mentions
            </Button>
            <Button
              variant={filter === 'not_mentioned' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('not_mentioned')}
            >
              <XCircle className="h-3 w-3 mr-1" />
              No Mentions
            </Button>
          </div>
        </div>

        {/* Results */}
        {groupedScans.length > 0 ? (
          <div className="space-y-3">
            {groupedScans.slice(0, 50).map((group) => (
              <GroupedScanCard 
                key={`${group.queryId}-${group.scannedAt}`}
                group={group}
              />
            ))}
            {groupedScans.length > 50 && (
              <p className="text-center text-sm text-muted-foreground py-2">
                Showing 50 of {groupedScans.length} prompt results
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
}

// Keep old name as alias for backward compatibility
export const QueryVisibilityList = PromptVisibilityList

export function PromptVisibilityList({ queries, scanResults, brandName }: PromptVisibilityListProps) {
  const [personaFilter, setPersonaFilter] = useState<PromptPersona | 'all'>('all')
  
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Prompt Performance</CardTitle>
            <CardDescription>
              See which prompts mention you and which need attention
            </CardDescription>
          </div>
          <Button variant="outline">Add Prompt</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
            {filteredPrompts.map((prompt) => (
              <div 
                key={prompt.id} 
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  prompt.isBranded ? 'opacity-60 border-dashed' : ''
                }`}
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
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            {promptsWithVisibility.length === 0
              ? 'No prompts generated yet. Complete the setup to auto-generate relevant prompts.'
              : 'No prompts match the selected filter.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
