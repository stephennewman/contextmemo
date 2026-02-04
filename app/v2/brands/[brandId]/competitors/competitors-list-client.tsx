'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users,
  ExternalLink,
  Rss,
  FileText,
  Plus,
  ChevronDown,
  ChevronRight,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Search,
  ArrowDownWideNarrow,
  ArrowUpAZ,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'

type SortOption = 'citations' | 'name' | 'recent'

interface Competitor {
  id: string
  name: string
  domain: string | null
  description: string | null
  is_active: boolean
  auto_discovered: boolean
  feed_url?: string | null
  competition_type?: string | null
  context?: {
    citation_count?: number
    discovered_from?: string
  } | null
}

interface CompetitorsListClientProps {
  brandId: string
  trackedCompetitors: Competitor[]
  discoveredCompetitors: Competitor[]
  citationCounts: Record<string, number>
  citationUrls: Record<string, string[]>
}

export function CompetitorsListClient({ 
  brandId, 
  trackedCompetitors: initialTracked, 
  discoveredCompetitors: initialDiscovered,
  citationCounts,
  citationUrls
}: CompetitorsListClientProps) {
  const [trackedCompetitors, setTrackedCompetitors] = useState(initialTracked)
  const [discoveredCompetitors, setDiscoveredCompetitors] = useState(initialDiscovered)
  const [showDiscovered, setShowDiscovered] = useState(true)
  const [loading, setLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('citations')
  const [trackedSortBy, setTrackedSortBy] = useState<SortOption>('citations')
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set())

  const toggleCitations = (competitorId: string) => {
    setExpandedCitations(prev => {
      const next = new Set(prev)
      if (next.has(competitorId)) {
        next.delete(competitorId)
      } else {
        next.add(competitorId)
      }
      return next
    })
  }

  const handleToggleTracking = async (competitor: Competitor, enable: boolean) => {
    setLoading(competitor.id)
    try {
      const res = await fetch(`/api/brands/${brandId}/competitors/${competitor.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: enable }),
      })
      
      if (!res.ok) throw new Error('Failed to update competitor')
      
      if (enable) {
        // Move from discovered to tracked
        setDiscoveredCompetitors(prev => prev.filter(c => c.id !== competitor.id))
        setTrackedCompetitors(prev => [{ ...competitor, is_active: true }, ...prev])
        toast.success(`Now tracking ${competitor.name}`, {
          description: 'This competitor will be included in future scans',
        })
      } else {
        // Move from tracked to discovered
        setTrackedCompetitors(prev => prev.filter(c => c.id !== competitor.id))
        setDiscoveredCompetitors(prev => [{ ...competitor, is_active: false }, ...prev])
        toast.success(`Stopped tracking ${competitor.name}`)
      }
    } catch (error) {
      toast.error('Failed to update competitor')
    } finally {
      setLoading(null)
    }
  }

  // Sort tracked competitors
  const sortedTracked = useMemo(() => {
    let sorted = [...trackedCompetitors]
    
    switch (trackedSortBy) {
      case 'citations':
        sorted = sorted.sort((a, b) => 
          (citationCounts[b.id] || 0) - (citationCounts[a.id] || 0)
        )
        break
      case 'name':
        sorted = sorted.sort((a, b) => 
          a.name.localeCompare(b.name)
        )
        break
      case 'recent':
        // Keep original order (by created_at)
        break
    }
    
    return sorted
  }, [trackedCompetitors, trackedSortBy, citationCounts])

  // Filter and sort discovered competitors
  const filteredDiscovered = useMemo(() => {
    let filtered = discoveredCompetitors.filter(c => 
      !searchQuery || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.domain?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    
    // Sort
    switch (sortBy) {
      case 'citations':
        filtered = [...filtered].sort((a, b) => 
          (b.context?.citation_count || 0) - (a.context?.citation_count || 0)
        )
        break
      case 'name':
        filtered = [...filtered].sort((a, b) => 
          a.name.localeCompare(b.name)
        )
        break
      case 'recent':
        // Already sorted by created_at from server
        break
    }
    
    return filtered
  }, [discoveredCompetitors, searchQuery, sortBy])

  return (
    <div className="flex-1 overflow-auto p-6">
      {trackedCompetitors.length === 0 && discoveredCompetitors.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No competitors yet</h3>
          <p className="text-muted-foreground mb-4">
            Run a scan to discover competitors from AI citations
          </p>
          <Button className="bg-[#0EA5E9] hover:bg-[#0284C7]">
            <Plus className="h-4 w-4 mr-2" />
            Add Competitor
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Tracked Competitors */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0F172A] flex items-center gap-2">
                <ToggleRight className="h-5 w-5 text-green-600" />
                Tracked ({trackedCompetitors.length})
              </h2>
              
              {trackedCompetitors.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setTrackedSortBy('citations')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      trackedSortBy === 'citations' 
                        ? 'bg-white shadow-sm text-[#0F172A] font-medium' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                    Most Cited
                  </button>
                  <button
                    onClick={() => setTrackedSortBy('name')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      trackedSortBy === 'name' 
                        ? 'bg-white shadow-sm text-[#0F172A] font-medium' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowUpAZ className="h-3.5 w-3.5" />
                    A-Z
                  </button>
                </div>
              )}
            </div>
            
            {trackedCompetitors.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No competitors being tracked yet. Enable tracking from the discovered list below.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedTracked.map(competitor => (
                  <CompetitorCard
                    key={competitor.id}
                    competitor={competitor}
                    citationCount={citationCounts[competitor.id] || 0}
                    citations={citationUrls[competitor.id] || []}
                    isTracked={true}
                    loading={loading === competitor.id}
                    onToggle={() => handleToggleTracking(competitor, false)}
                    expanded={expandedCitations.has(competitor.id)}
                    onToggleCitations={() => toggleCitations(competitor.id)}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Discovered Competitors */}
          {discoveredCompetitors.length > 0 && (
            <div>
              <button
                onClick={() => setShowDiscovered(!showDiscovered)}
                className="flex items-center gap-2 text-lg font-semibold text-[#0F172A] mb-4 hover:text-[#0EA5E9]"
              >
                {showDiscovered ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
                <Sparkles className="h-5 w-5 text-amber-500" />
                Discovered ({discoveredCompetitors.length})
              </button>
              
              {showDiscovered && (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    These brands were found in AI citations. Toggle ON to start tracking them.
                  </p>
                  
                  {/* Search and Sort */}
                  <div className="flex items-center gap-4 mb-4 flex-wrap">
                    {/* Sort buttons */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                      <button
                        onClick={() => setSortBy('citations')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                          sortBy === 'citations' 
                            ? 'bg-white shadow-sm text-[#0F172A] font-medium' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                        Most Cited
                      </button>
                      <button
                        onClick={() => setSortBy('name')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                          sortBy === 'name' 
                            ? 'bg-white shadow-sm text-[#0F172A] font-medium' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ArrowUpAZ className="h-3.5 w-3.5" />
                        A-Z
                      </button>
                      <button
                        onClick={() => setSortBy('recent')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                          sortBy === 'recent' 
                            ? 'bg-white shadow-sm text-[#0F172A] font-medium' 
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Recent
                      </button>
                    </div>
                    
                    {/* Search */}
                    {discoveredCompetitors.length > 10 && (
                      <div className="flex-1 max-w-xs">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search discovered..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredDiscovered.slice(0, 50).map(competitor => (
                      <DiscoveredCard
                        key={competitor.id}
                        competitor={competitor}
                        loading={loading === competitor.id}
                        onToggle={() => handleToggleTracking(competitor, true)}
                      />
                    ))}
                  </div>
                  
                  {filteredDiscovered.length > 50 && (
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                      Showing 50 of {filteredDiscovered.length} discovered competitors
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CompetitorCard({ 
  competitor, 
  citationCount,
  citations,
  isTracked,
  loading,
  onToggle,
  expanded,
  onToggleCitations
}: { 
  competitor: Competitor
  citationCount: number
  citations: string[]
  isTracked: boolean
  loading: boolean
  onToggle: () => void
  expanded: boolean
  onToggleCitations: () => void
}) {
  // Helper to get path from URL
  const getUrlPath = (url: string) => {
    try {
      const u = new URL(url)
      return u.pathname + u.search
    } catch {
      return url
    }
  }

  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <span className="text-orange-600 font-bold">
              {competitor.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-[#0F172A]">{competitor.name}</h3>
            {competitor.domain && (
              <a 
                href={`https://${competitor.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-[#0EA5E9] flex items-center gap-1"
              >
                {competitor.domain}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onToggle}
          disabled={loading}
          className={isTracked ? 'text-green-600 hover:text-red-600' : ''}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isTracked ? (
            <ToggleRight className="h-5 w-5" />
          ) : (
            <ToggleLeft className="h-5 w-5" />
          )}
        </Button>
      </div>
      
      <div className="flex items-center gap-4 text-sm">
        {citationCount > 0 ? (
          <button
            onClick={onToggleCitations}
            className="flex items-center gap-1 text-[#0EA5E9] hover:text-[#0284C7]"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <FileText className="h-4 w-4" />
            <span>{citationCount} citation{citationCount !== 1 ? 's' : ''}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>0 citations</span>
          </div>
        )}
        {competitor.feed_url && (
          <div className="flex items-center gap-1 text-green-600">
            <Rss className="h-4 w-4" />
            <span>Feed active</span>
          </div>
        )}
      </div>
      
      {/* Expanded citations list */}
      {expanded && citations.length > 0 && (
        <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
          {citations.slice(0, 20).map((url, idx) => (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-slate-600 hover:text-[#0EA5E9] truncate pl-2 border-l-2 border-slate-200 hover:border-[#0EA5E9]"
              title={url}
            >
              {getUrlPath(url) || '/'}
            </a>
          ))}
          {citations.length > 20 && (
            <p className="text-xs text-muted-foreground pl-2">
              +{citations.length - 20} more
            </p>
          )}
        </div>
      )}
      
      {competitor.competition_type && (
        <div className="mt-3">
          <Badge variant="secondary" className="text-xs">
            {competitor.competition_type}
          </Badge>
        </div>
      )}
    </div>
  )
}

function DiscoveredCard({ 
  competitor, 
  loading,
  onToggle 
}: { 
  competitor: Competitor
  loading: boolean
  onToggle: () => void
}) {
  const citationCount = competitor.context?.citation_count || 0
  
  return (
    <div className="bg-slate-50 border border-dashed rounded-lg p-3 hover:border-[#0EA5E9] transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
            <span className="text-slate-500 text-sm font-medium">
              {competitor.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h4 className="font-medium text-sm text-[#0F172A] truncate">{competitor.name}</h4>
            <div className="flex items-center gap-2">
              {competitor.domain && (
                <span className="text-xs text-muted-foreground truncate">
                  {competitor.domain}
                </span>
              )}
              {citationCount > 0 && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {citationCount}x cited
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onToggle}
          disabled={loading}
          className="shrink-0 text-slate-400 hover:text-green-600"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ToggleLeft className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  )
}
