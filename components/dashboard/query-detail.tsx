'use client'

import { useMemo, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  MessageSquare,
  Bot,
  CheckCircle,
  XCircle,
  Link,
  ExternalLink,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react'
import { isBlockedCompetitorName } from '@/lib/config/competitor-blocklist'

// Component to show the full AI response text with highlighting
function ResponseTextSection({ responseText, brandName }: { responseText: string; brandName: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Highlight brand name in the response
  const highlightedText = useMemo(() => {
    if (!brandName) return responseText
    const regex = new RegExp(`(${brandName})`, 'gi')
    return responseText.split(regex).map((part, i) => 
      part.toLowerCase() === brandName.toLowerCase() 
        ? <mark key={i} className="bg-green-200 text-green-900 px-0.5 rounded">{part}</mark>
        : part
    )
  }, [responseText, brandName])

  const previewLength = 300
  const needsTruncation = responseText.length > previewLength
  const displayText = isExpanded ? highlightedText : responseText.slice(0, previewLength)

  return (
    <div className="mt-3 pt-3 border-t">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full text-left mb-2"
      >
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <FileText className="h-4 w-4" />
        AI Response
      </button>
      
      {isExpanded ? (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-sm leading-relaxed max-h-80 overflow-y-auto">
          <div className="whitespace-pre-wrap">{highlightedText}</div>
        </div>
      ) : needsTruncation ? (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-sm text-muted-foreground">
          {displayText}...
          <button 
            onClick={() => setIsExpanded(true)}
            className="text-cyan-600 hover:text-cyan-700 ml-1"
          >
            Show more
          </button>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-sm text-muted-foreground whitespace-pre-wrap">
          {responseText}
        </div>
      )}
    </div>
  )
}

interface ScanResult {
  id: string
  query_id: string
  model: string
  brand_mentioned: boolean
  brand_context?: string | null
  brand_position?: number | null
  brand_in_citations?: boolean | null
  brand_sentiment?: 'positive' | 'negative' | 'neutral' | null
  sentiment_reason?: string | null
  citations?: string[] | null
  competitors_mentioned: string[] | null
  scanned_at: string
  response_text?: string | null
}

interface Query {
  id: string
  query_text: string
  query_type: string | null
  persona?: string | null
  priority: number
}

interface QueryDetailProps {
  query: Query | null
  isOpen: boolean
  onClose: () => void
  brandName: string
  scanResults: ScanResult[]
  isBranded?: boolean
}

function getModelDisplay(model: string) {
  const m = model.toLowerCase()
  if (m.includes('gpt') || m.includes('openai')) {
    return { name: 'GPT', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' }
  }
  if (m.includes('claude') || m.includes('anthropic')) {
    return { name: 'Claude', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' }
  }
  if (m.includes('gemini')) {
    return { name: 'Gemini', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
  }
  if (m.includes('llama')) {
    return { name: 'Llama', color: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200' }
  }
  if (m.includes('mistral')) {
    return { name: 'Mistral', color: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' }
  }
  if (m.includes('perplexity') || m.includes('sonar')) {
    return { name: 'Perplexity', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200' }
  }
  return { name: model, color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' }
}

function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function QueryDetail({
  query,
  isOpen,
  onClose,
  brandName,
  scanResults,
  isBranded = false,
}: QueryDetailProps) {
  // Get all scans for this query
  const queryScans = useMemo(() => {
    if (!query) return []
    return scanResults
      .filter(s => s.query_id === query.id)
      .sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime())
  }, [query, scanResults])

  // Calculate stats
  const stats = useMemo(() => {
    const totalScans = queryScans.length
    const mentioned = queryScans.filter(s => s.brand_mentioned).length
    const cited = queryScans.filter(s => s.brand_in_citations === true).length
    const scansWithCitations = queryScans.filter(s => s.citations && s.citations.length > 0).length
    
    // Get all competitors mentioned (filtered)
    const competitorCounts = new Map<string, number>()
    queryScans.forEach(scan => {
      (scan.competitors_mentioned || [])
        .filter(comp => !isBlockedCompetitorName(comp))
        .forEach(comp => {
          competitorCounts.set(comp, (competitorCounts.get(comp) || 0) + 1)
        })
    })
    const topCompetitors = Array.from(competitorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    return {
      totalScans,
      mentioned,
      mentionRate: totalScans > 0 ? Math.round((mentioned / totalScans) * 100) : 0,
      cited,
      citationRate: scansWithCitations > 0 ? Math.round((cited / scansWithCitations) * 100) : 0,
      scansWithCitations,
      topCompetitors,
    }
  }, [queryScans])

  // Group scans by model for latest results
  const latestByModel = useMemo(() => {
    const modelMap = new Map<string, ScanResult>()
    queryScans.forEach(scan => {
      const modelKey = getModelDisplay(scan.model).name
      if (!modelMap.has(modelKey)) {
        modelMap.set(modelKey, scan)
      }
    })
    return Array.from(modelMap.entries())
  }, [queryScans])

  if (!query) return null

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <div className="p-6 border-b bg-muted/30">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-background border rounded-lg shrink-0">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold leading-snug pr-8">
                "{query.query_text}"
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {query.query_type && (
                  <Badge variant="outline" className="text-xs">
                    {query.query_type.replace('_', ' ')}
                  </Badge>
                )}
                {query.persona && (
                  <Badge variant="secondary" className="text-xs">
                    {query.persona.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Badge>
                )}
                {isBranded && (
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Branded
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {isBranded && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-3 pl-12">
              This prompt contains your brand name, so it's excluded from visibility scoring.
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Stats Overview */}
          {queryScans.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 border rounded-xl text-center bg-background">
                  <p className={`text-4xl font-bold ${stats.mentionRate >= 70 ? 'text-green-600' : stats.mentionRate >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
                    {stats.mentionRate}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Mention Rate</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.mentioned}/{stats.totalScans} scans
                  </p>
                </div>
                <div className="p-5 border rounded-xl text-center bg-background">
                  <p className={`text-4xl font-bold ${stats.citationRate >= 50 ? 'text-cyan-600' : stats.citationRate > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                    {stats.scansWithCitations > 0 ? `${stats.citationRate}%` : 'N/A'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">Citation Rate</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.cited}/{stats.scansWithCitations} with citations
                  </p>
                </div>
              </div>

              {/* Competing Brands */}
              {stats.topCompetitors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Competitors Mentioned
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.topCompetitors.map(([name, count]) => (
                      <Badge key={name} variant="secondary" className="text-sm px-3 py-1">
                        {name} ({count})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Results by Model */}
              <div>
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  Latest Results by Model
                </h3>
                <div className="space-y-4">
                  {latestByModel.map(([modelName, scan]) => {
                    const modelInfo = getModelDisplay(scan.model)
                    const hasCitations = scan.citations && scan.citations.length > 0
                    
                    return (
                      <div key={modelName} className="p-4 border rounded-xl space-y-3 bg-background">
                        <div className="flex items-center justify-between">
                          <Badge className={`${modelInfo.color} px-3 py-1`} variant="secondary">
                            <Bot className="h-3.5 w-3.5 mr-1.5" />
                            {modelInfo.name}
                          </Badge>
                          <div className="flex items-center gap-2">
                            {hasCitations ? (
                              scan.brand_in_citations ? (
                                <Badge className="bg-cyan-500 text-white px-3 py-1">
                                  <Link className="h-3 w-3 mr-1" />
                                  Cited
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="px-3 py-1">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Not Cited
                                </Badge>
                              )
                            ) : scan.brand_mentioned ? (
                              <Badge className="bg-green-500 text-white px-3 py-1">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Mentioned
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="px-3 py-1">
                                <XCircle className="h-3 w-3 mr-1" />
                                Not Mentioned
                              </Badge>
                            )}
                            {scan.brand_position && (
                              <span className="text-xs text-muted-foreground">
                                #{scan.brand_position}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sentiment badge */}
                        {scan.brand_sentiment && (
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                scan.brand_sentiment === 'positive' 
                                  ? 'border-green-300 text-green-700 bg-green-50' 
                                  : scan.brand_sentiment === 'negative'
                                    ? 'border-red-300 text-red-700 bg-red-50'
                                    : 'border-slate-300 text-slate-600 bg-slate-50'
                              }`}
                            >
                              {scan.brand_sentiment === 'positive' ? '+ Positive' : 
                               scan.brand_sentiment === 'negative' ? '- Negative' : '~ Neutral'}
                            </Badge>
                            {scan.sentiment_reason && (
                              <span className="text-xs text-muted-foreground italic truncate">
                                {scan.sentiment_reason}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Brand context if mentioned */}
                        {scan.brand_mentioned && scan.brand_context && (
                          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3">
                            <p className="text-sm text-green-800 dark:text-green-200">
                              {scan.brand_context}
                            </p>
                          </div>
                        )}

                        {/* Citations */}
                        {scan.citations && scan.citations.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {scan.citations.slice(0, 5).map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 rounded-md hover:bg-cyan-200 dark:hover:bg-cyan-800 transition-colors"
                              >
                                {getDomainFromUrl(url)}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ))}
                            {scan.citations.length > 5 && (
                              <span className="text-xs text-muted-foreground px-2 py-1">
                                +{scan.citations.length - 5} more
                              </span>
                            )}
                          </div>
                        )}

                        {/* Competitors in this scan (filtered) */}
                        {scan.competitors_mentioned && scan.competitors_mentioned.filter(c => !isBlockedCompetitorName(c)).length > 0 && (
                          <p className="text-sm text-muted-foreground pt-1">
                            Also mentioned: {scan.competitors_mentioned.filter(c => !isBlockedCompetitorName(c)).slice(0, 3).join(', ')}
                            {scan.competitors_mentioned.filter(c => !isBlockedCompetitorName(c)).length > 3 && ` +${scan.competitors_mentioned.filter(c => !isBlockedCompetitorName(c)).length - 3}`}
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground pt-1">
                          Scanned {new Date(scan.scanned_at).toLocaleDateString()}
                        </p>

                        {/* Full AI Response Text */}
                        {scan.response_text && (
                          <ResponseTextSection responseText={scan.response_text} brandName={brandName} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Scan History */}
              {queryScans.length > latestByModel.length && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  Showing latest scan per model. {queryScans.length} total scans for this prompt.
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-base">No scans yet for this prompt.</p>
              <p className="text-sm mt-1">Run a scan to see how AI models respond.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
