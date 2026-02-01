'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Link,
  ExternalLink,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Target
} from 'lucide-react'
import type { ScanResult } from '@/lib/supabase/types'

interface CitationAnalysisProps {
  scanResults: ScanResult[]
  brandDomain: string
  brandName: string
}

interface DomainStats {
  domain: string
  count: number
  urls: string[]
}

// Helper to extract domain from URL
function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// Check if domain matches the brand
function isBrandDomain(domain: string, brandDomain: string): boolean {
  const normalizedBrand = brandDomain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '')
  const normalizedDomain = domain.toLowerCase()
  return normalizedDomain.includes(normalizedBrand) || normalizedBrand.includes(normalizedDomain)
}

export function CitationAnalysis({ scanResults, brandDomain, brandName }: CitationAnalysisProps) {
  // Filter to only Perplexity results with citations
  const perplexityResults = useMemo(() => {
    return scanResults.filter(
      r => r.model === 'perplexity-sonar' && r.citations && r.citations.length > 0
    )
  }, [scanResults])

  // Calculate citation stats
  const stats = useMemo(() => {
    const totalPerplexityScans = scanResults.filter(r => r.model === 'perplexity-sonar').length
    const scansWithCitations = perplexityResults.length
    const brandCitedCount = perplexityResults.filter(r => r.brand_in_citations).length
    
    // Aggregate all citations by domain
    const domainMap = new Map<string, { count: number; urls: Set<string> }>()
    
    perplexityResults.forEach(result => {
      if (!result.citations) return
      result.citations.forEach(url => {
        const domain = getDomainFromUrl(url)
        const existing = domainMap.get(domain) || { count: 0, urls: new Set<string>() }
        existing.count++
        existing.urls.add(url)
        domainMap.set(domain, existing)
      })
    })

    // Convert to sorted array
    const allDomains: DomainStats[] = Array.from(domainMap.entries())
      .map(([domain, data]) => ({
        domain,
        count: data.count,
        urls: Array.from(data.urls)
      }))
      .sort((a, b) => b.count - a.count)

    // Separate brand domain from others
    const brandDomainStats = allDomains.find(d => isBrandDomain(d.domain, brandDomain))
    const competitorDomains = allDomains.filter(d => !isBrandDomain(d.domain, brandDomain))

    // Calculate citation rate
    const citationRate = scansWithCitations > 0 
      ? Math.round((brandCitedCount / scansWithCitations) * 100)
      : 0

    return {
      totalPerplexityScans,
      scansWithCitations,
      brandCitedCount,
      citationRate,
      brandDomainStats,
      competitorDomains,
      totalCitations: perplexityResults.reduce((sum, r) => sum + (r.citations?.length || 0), 0)
    }
  }, [perplexityResults, scanResults, brandDomain])

  // If no Perplexity scans yet, show a helpful message
  if (stats.totalPerplexityScans === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5 text-cyan-500" />
            Citation Analysis
          </CardTitle>
          <CardDescription>
            See which web sources Perplexity cites when answering queries about your industry
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No Perplexity scan results yet.</p>
            <p className="text-sm">Run a scan to see citation analysis.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5 text-cyan-500" />
              Citation Analysis
            </CardTitle>
            <CardDescription>
              Which sources does Perplexity cite when answering queries about your industry?
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{stats.citationRate}%</p>
            <p className="text-xs text-muted-foreground">
              {stats.brandCitedCount} of {stats.scansWithCitations} responses cite you
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{stats.totalPerplexityScans}</p>
            <p className="text-xs text-muted-foreground">Perplexity Scans</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{stats.totalCitations}</p>
            <p className="text-xs text-muted-foreground">Total Citations</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{stats.competitorDomains.length}</p>
            <p className="text-xs text-muted-foreground">Unique Sources</p>
          </div>
          <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-lg">
            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {stats.brandDomainStats?.count || 0}
            </p>
            <p className="text-xs text-muted-foreground">Your Citations</p>
          </div>
        </div>

        {/* Your Domain Status */}
        <div className={`p-4 rounded-lg border ${
          stats.brandDomainStats && stats.brandDomainStats.count > 0
            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900'
        }`}>
          <div className="flex items-start gap-3">
            {stats.brandDomainStats && stats.brandDomainStats.count > 0 ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    {brandDomain} is being cited
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Perplexity cited your domain {stats.brandDomainStats.count} time{stats.brandDomainStats.count !== 1 ? 's' : ''} across {stats.scansWithCitations} queries.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    {brandDomain} is not being cited
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Perplexity hasn&apos;t cited your domain in any of the {stats.scansWithCitations} queries tested. 
                    The sources below are being cited instead.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Top Cited Sources */}
        {stats.competitorDomains.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">Top Cited Sources</h4>
              <span className="text-xs text-muted-foreground">
                (Sites to target for visibility)
              </span>
            </div>
            <div className="space-y-2">
              {stats.competitorDomains.slice(0, 15).map((domain, idx) => {
                const percentage = stats.totalCitations > 0 
                  ? Math.round((domain.count / stats.totalCitations) * 100) 
                  : 0
                return (
                  <div key={domain.domain} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <a
                          href={`https://${domain.domain}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline truncate flex items-center gap-1"
                        >
                          {domain.domain}
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </a>
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">
                          {domain.count} citation{domain.count !== 1 ? 's' : ''} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500 transition-all" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {stats.competitorDomains.length > 15 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                + {stats.competitorDomains.length - 15} more sources
              </p>
            )}
          </div>
        )}

        {/* Actionable Insight */}
        {stats.competitorDomains.length > 0 && !stats.brandDomainStats && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  Opportunity: Get cited by Perplexity
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Consider creating content that could be featured on the top-cited sources, 
                  or publishing authoritative content on your domain that Perplexity&apos;s crawlers 
                  can discover. Focus on factual, well-structured content about your industry.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
