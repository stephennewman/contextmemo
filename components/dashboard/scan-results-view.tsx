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
import type { ScanResult, Query } from '@/lib/supabase/types'

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
  if (model.includes('gpt') || model.includes('openai')) {
    return { name: 'OpenAI', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', key: 'openai' }
  }
  if (model.includes('claude') || model.includes('anthropic')) {
    return { name: 'Claude', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200', key: 'claude' }
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
              &quot;{group.query?.query_text || 'Unknown query'}&quot;
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
                  ({brandedCount} branded query scans excluded)
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
                Showing 50 of {groupedScans.length} query results
              </p>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-8 text-center">
            {scanResults.length === 0 
              ? 'No scans yet. Run a scan to see how AI models respond to queries about your industry.'
              : 'No results match your filters.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Query visibility component to show per-query breakdown
interface QueryWithVisibility {
  id: string
  query_text: string
  query_type: string | null
  priority: number
  visibility: number
  totalScans: number
  mentionedCount: number
  isBranded: boolean
}

interface QueryVisibilityListProps {
  queries: Query[]
  scanResults: ScanResult[]
  brandName: string
}

export function QueryVisibilityList({ queries, scanResults, brandName }: QueryVisibilityListProps) {
  // Calculate visibility per query
  const queryStats = new Map<string, { mentioned: number; total: number }>()
  scanResults.forEach(scan => {
    if (!scan.query_id) return
    const current = queryStats.get(scan.query_id) || { mentioned: 0, total: 0 }
    current.total++
    if (scan.brand_mentioned) current.mentioned++
    queryStats.set(scan.query_id, current)
  })

  const queriesWithVisibility: QueryWithVisibility[] = queries.map(q => {
    const stats = queryStats.get(q.id)
    const isBranded = queryContainsBrand(q.query_text, brandName)
    return {
      id: q.id,
      query_text: q.query_text,
      query_type: q.query_type,
      priority: q.priority,
      visibility: stats && stats.total > 0 
        ? Math.round((stats.mentioned / stats.total) * 100)
        : -1, // -1 means no scans yet
      totalScans: stats?.total || 0,
      mentionedCount: stats?.mentioned || 0,
      isBranded
    }
  }).sort((a, b) => {
    // Put branded queries at the end
    if (a.isBranded && !b.isBranded) return 1
    if (!a.isBranded && b.isBranded) return -1
    // Sort by visibility (lowest first), but put unscanned at end
    if (a.visibility === -1 && b.visibility === -1) return 0
    if (a.visibility === -1) return 1
    if (b.visibility === -1) return -1
    return a.visibility - b.visibility
  })

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Query Performance</CardTitle>
            <CardDescription>
              See which queries mention you and which need attention
            </CardDescription>
          </div>
          <Button variant="outline">Add Query</Button>
        </div>
      </CardHeader>
      <CardContent>
        {queriesWithVisibility.length > 0 ? (
          <div className="space-y-2">
            {queriesWithVisibility.map((query) => (
              <div 
                key={query.id} 
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  query.isBranded ? 'opacity-60 border-dashed' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">&quot;{query.query_text}&quot;</p>
                    {query.isBranded && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Branded
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {query.query_type}
                    {query.totalScans > 0 && (
                      <span className="ml-2">
                        • {query.mentionedCount}/{query.totalScans} scans
                      </span>
                    )}
                    {query.isBranded && ' • Excluded from visibility score'}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {query.isBranded ? (
                    <Badge variant="outline" className="text-muted-foreground">N/A</Badge>
                  ) : query.visibility === -1 ? (
                    <Badge variant="outline">No scans</Badge>
                  ) : query.visibility >= 70 ? (
                    <Badge className="bg-green-500 text-white">{query.visibility}%</Badge>
                  ) : query.visibility >= 30 ? (
                    <Badge className="bg-yellow-500 text-white">{query.visibility}%</Badge>
                  ) : (
                    <Badge variant="destructive">{query.visibility}%</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No queries generated yet. Complete the setup to auto-generate relevant queries.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
