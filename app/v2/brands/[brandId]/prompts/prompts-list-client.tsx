'use client'

import { useState, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Clock,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Ban,
  CheckCircle,
  PartyPopper,
  AlertTriangle,
  Plus,
  Loader2,
  MoreHorizontal,
  Users,
  Filter,
  X,
  FileText,
  ExternalLink,
  Eye,
  Globe,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import type { Query } from '@/lib/supabase/types'

// Competitor data from database
interface CompetitorData {
  id: string
  name: string
  domain: string | null
  is_active: boolean
  auto_discovered: boolean | null
  description: string | null
  context: Record<string, unknown> | null
  created_at: string
}

// Citation source from search results
interface CitationSource {
  url: string
  title: string
  snippet: string
  date?: string
}

// Extended query type with competitor data
interface EnrichedPrompt extends Query {
  latest_competitors?: string[]
  latest_position?: number | null
  latest_cited?: boolean | null
  latest_mentioned?: boolean | null
  latest_citations?: string[]
  latest_sources?: CitationSource[]
}

type FilterType = 'all' | 'cited' | 'mentioned' | 'gap' | 'lost' | 'streaks'

interface PromptsListClientProps {
  brandId: string
  activePrompts: EnrichedPrompt[]
  excludedPrompts: EnrichedPrompt[]
  competitorMap: Record<string, CompetitorData>
}

export function PromptsListClient({ 
  brandId, 
  activePrompts: initialActive, 
  excludedPrompts: initialExcluded,
  competitorMap: initialCompetitorMap 
}: PromptsListClientProps) {
  const [activePrompts, setActivePrompts] = useState<EnrichedPrompt[]>(initialActive)
  const [excludedPrompts, setExcludedPrompts] = useState<EnrichedPrompt[]>(initialExcluded)
  const [competitorMap, setCompetitorMap] = useState<Record<string, CompetitorData>>(initialCompetitorMap)
  const [showExcluded, setShowExcluded] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [competitorLoading, setCompetitorLoading] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())
  
  // Competitor drawer state
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorData | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const toggleSources = (promptId: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev)
      if (next.has(promptId)) {
        next.delete(promptId)
      } else {
        next.add(promptId)
      }
      return next
    })
  }

  // Helper to extract domain from URL
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  // Filter stats
  const filterStats = useMemo(() => ({
    all: activePrompts.length,
    cited: activePrompts.filter(p => p.current_status === 'cited').length,
    mentioned: activePrompts.filter(p => p.latest_mentioned && p.current_status !== 'cited').length,
    gap: activePrompts.filter(p => (p.current_status === 'gap' || p.current_status === 'never_scanned') && !p.latest_mentioned).length,
    lost: activePrompts.filter(p => p.current_status === 'lost_citation').length,
    streaks: activePrompts.filter(p => (p.citation_streak || 0) >= 3).length,
  }), [activePrompts])

  // Filtered prompts
  const filteredPrompts = useMemo(() => {
    let filtered = activePrompts

    // Apply status filter
    switch (activeFilter) {
      case 'cited':
        filtered = filtered.filter(p => p.current_status === 'cited')
        break
      case 'mentioned':
        filtered = filtered.filter(p => p.latest_mentioned && p.current_status !== 'cited')
        break
      case 'gap':
        filtered = filtered.filter(p => (p.current_status === 'gap' || p.current_status === 'never_scanned') && !p.latest_mentioned)
        break
      case 'lost':
        filtered = filtered.filter(p => p.current_status === 'lost_citation')
        break
      case 'streaks':
        filtered = filtered.filter(p => (p.citation_streak || 0) >= 3)
        break
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.query_text?.toLowerCase().includes(query) ||
        p.latest_competitors?.some(c => c.toLowerCase().includes(query)) ||
        p.persona?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [activePrompts, activeFilter, searchQuery])

  const handleExclude = async (promptId: string, reason: string = 'manual') => {
    setLoading(promptId)
    try {
      const res = await fetch(`/api/brands/${brandId}/prompts/${promptId}/exclude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      
      if (!res.ok) throw new Error('Failed to exclude prompt')
      
      // Move from active to excluded
      const prompt = activePrompts.find(p => p.id === promptId)
      if (prompt) {
        setActivePrompts(prev => prev.filter(p => p.id !== promptId))
        setExcludedPrompts(prev => [{ ...prompt, is_active: false, excluded_at: new Date().toISOString(), excluded_reason: reason }, ...prev])
      }
      
      toast.success('Prompt excluded', {
        description: 'This prompt will no longer be scanned',
        action: {
          label: 'Undo',
          onClick: () => handleReenable(promptId),
        },
      })
    } catch (error) {
      toast.error('Failed to exclude prompt')
    } finally {
      setLoading(null)
    }
  }

  const handleReenable = async (promptId: string) => {
    setLoading(promptId)
    try {
      const res = await fetch(`/api/brands/${brandId}/prompts/${promptId}/reenable`, {
        method: 'POST',
      })
      
      if (!res.ok) throw new Error('Failed to re-enable prompt')
      
      // Move from excluded to active
      const prompt = excludedPrompts.find(p => p.id === promptId)
      if (prompt) {
        setExcludedPrompts(prev => prev.filter(p => p.id !== promptId))
        setActivePrompts(prev => [{ ...prompt, is_active: true, excluded_at: null, excluded_reason: null }, ...prev])
      }
      
      toast.success('Prompt re-enabled', {
        description: 'This prompt will be included in future scans',
      })
    } catch (error) {
      toast.error('Failed to re-enable prompt')
    } finally {
      setLoading(null)
    }
  }

  // Toggle competitor tracking
  const handleToggleCompetitor = async (competitorName: string) => {
    const competitor = competitorMap[competitorName.toLowerCase()]
    if (!competitor) return
    
    setCompetitorLoading(competitor.id)
    try {
      const res = await fetch(`/api/brands/${brandId}/competitors/${competitor.id}/toggle`, {
        method: 'POST',
      })
      
      if (!res.ok) throw new Error('Failed to toggle competitor')
      
      const { is_active } = await res.json()
      
      // Update local state
      setCompetitorMap(prev => ({
        ...prev,
        [competitorName.toLowerCase()]: {
          ...prev[competitorName.toLowerCase()],
          is_active,
        }
      }))
      
      // Update selected competitor if in drawer
      if (selectedCompetitor?.id === competitor.id) {
        setSelectedCompetitor(prev => prev ? { ...prev, is_active } : null)
      }
      
      toast.success(is_active ? 'Now tracking competitor' : 'Stopped tracking competitor', {
        description: competitor.name,
      })
    } catch (error) {
      toast.error('Failed to update competitor')
    } finally {
      setCompetitorLoading(null)
    }
  }

  // Open competitor drawer
  const openCompetitorDrawer = (competitorName: string) => {
    const competitor = competitorMap[competitorName.toLowerCase()]
    if (competitor) {
      setSelectedCompetitor(competitor)
      setDrawerOpen(true)
    }
  }

  const getSourceLabel = (sourceType: string | null) => {
    const labels: Record<string, string> = {
      original: 'Original',
      expanded: 'Expanded',
      competitor_inspired: 'Competitor',
      greenspace: 'Greenspace',
      manual: 'Manual',
      auto: 'Auto',
    }
    return labels[sourceType || 'auto'] || 'Auto'
  }

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'cited':
        return <TrendingUp className="h-3 w-3" />
      case 'lost_citation':
        return <AlertTriangle className="h-3 w-3" />
      case 'gap':
        return <TrendingDown className="h-3 w-3" />
      default:
        return <Minus className="h-3 w-3" />
    }
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'cited':
        return 'bg-green-100 text-green-700'
      case 'lost_citation':
        return 'bg-red-100 text-red-700'
      case 'gap':
        return 'bg-amber-100 text-amber-700'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'cited':
        return 'Cited'
      case 'lost_citation':
        return 'Lost'
      case 'gap':
        return 'Gap'
      default:
        return 'Not scanned'
    }
  }

  const filterButtons: { key: FilterType; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: 'bg-slate-100 text-slate-700' },
    { key: 'cited', label: 'Cited', color: 'bg-green-100 text-green-700' },
    { key: 'mentioned', label: 'Mentioned', color: 'bg-blue-100 text-blue-700' },
    { key: 'gap', label: 'Gaps', color: 'bg-amber-100 text-amber-700' },
    { key: 'streaks', label: 'Streaks', color: 'bg-orange-100 text-orange-700' },
    { key: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
  ]

  return (
    <div className="flex-1 overflow-auto p-6">
      {activePrompts.length === 0 && excludedPrompts.length === 0 ? (
        <div className="text-center py-20">
          <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No prompts yet</h3>
          <p className="text-muted-foreground mb-4">
            Prompts are the AI search queries your brand should appear in
          </p>
          <Button className="bg-[#0EA5E9] hover:bg-[#0284C7]">
            <Plus className="h-4 w-4 mr-2" />
            Generate Prompts
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex items-center gap-4">
            {/* Filter buttons */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              {filterButtons.map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeFilter === key 
                      ? `${color} ring-2 ring-offset-1 ring-slate-400`
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {label}
                  <span className="ml-1.5 text-xs opacity-70">
                    {filterStats[key]}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Search */}
            <div className="flex-1 max-w-xs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search prompts or competitors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Results count */}
          {(activeFilter !== 'all' || searchQuery) && (
            <p className="text-sm text-muted-foreground">
              Showing {filteredPrompts.length} of {activePrompts.length} prompts
            </p>
          )}

          {/* Active Prompts */}
          <div className="space-y-3">
            {filteredPrompts.map(prompt => (
              <div 
                key={prompt.id}
                className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Prompt text */}
                    <p className="font-medium text-[#0F172A] mb-2">
                      "{prompt.query_text}"
                    </p>
                    
                    {/* Metadata badges row */}
                    <div className="flex items-center flex-wrap gap-2">
                      {/* Citation Status */}
                      <Badge className={`text-xs ${getStatusColor(prompt.current_status)}`}>
                        {getStatusIcon(prompt.current_status)}
                        <span className="ml-1">{getStatusLabel(prompt.current_status)}</span>
                      </Badge>
                      
                      {/* Mention indicator (only show if mentioned but not cited) */}
                      {prompt.latest_mentioned && prompt.current_status !== 'cited' && (
                        <Badge className="text-xs bg-blue-100 text-blue-700">
                          <Eye className="h-3 w-3 mr-0.5" />
                          Mentioned
                        </Badge>
                      )}
                      
                      {/* Streak */}
                      {(prompt.citation_streak || 0) >= 1 && (
                        <Badge className="text-xs bg-orange-100 text-orange-700">
                          <Flame className="h-3 w-3 mr-0.5" />
                          {prompt.citation_streak}x
                        </Badge>
                      )}
                      
                      {/* First citation indicator */}
                      {prompt.first_cited_at && prompt.current_status === 'cited' && (
                        <Badge className="text-xs bg-green-100 text-green-700">
                          <PartyPopper className="h-3 w-3 mr-0.5" />
                          First cited {formatDistanceToNow(new Date(prompt.first_cited_at), { addSuffix: true })}
                        </Badge>
                      )}
                      
                      {/* Scan count */}
                      <Badge variant="outline" className="text-xs">
                        Scanned {prompt.scan_count || 0}x
                      </Badge>
                      
                      {/* Source type */}
                      <Badge variant="outline" className="text-xs">
                        <GitBranch className="h-3 w-3 mr-0.5" />
                        {getSourceLabel(prompt.source_type)}
                      </Badge>
                      
                      {/* Last scanned */}
                      {prompt.last_scanned_at && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(prompt.last_scanned_at), { addSuffix: true })}
                        </span>
                      )}
                      
                      {/* Persona */}
                      {prompt.persona && (
                        <span className="text-xs text-muted-foreground">
                          • {prompt.persona}
                        </span>
                      )}
                    </div>
                    
                    {/* Competitors mentioned */}
                    {prompt.latest_competitors && prompt.latest_competitors.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex items-center flex-wrap gap-1.5">
                          <span className="text-xs text-muted-foreground">Competitors:</span>
                          {prompt.latest_competitors.slice(0, 8).map((competitor, idx) => {
                            const competitorData = competitorMap[competitor.toLowerCase()]
                            const isTracked = competitorData?.is_active ?? false
                            const isLoading = competitorLoading === competitorData?.id
                            
                            return (
                              <button
                                key={idx}
                                onClick={() => openCompetitorDrawer(competitor)}
                                disabled={isLoading}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all hover:scale-105 cursor-pointer ${
                                  isTracked 
                                    ? 'bg-purple-100 text-purple-700 border border-purple-300 ring-1 ring-purple-200' 
                                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                                }`}
                                title={isTracked ? 'Tracked competitor - click for details' : 'Discovered competitor - click to track'}
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : isTracked ? (
                                  <CheckCircle className="h-3 w-3" />
                                ) : null}
                                <span className="capitalize">{competitor}</span>
                              </button>
                            )
                          })}
                          {prompt.latest_competitors.length > 8 && (
                            <span className="text-xs text-muted-foreground">
                              +{prompt.latest_competitors.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Winning articles toggle */}
                    {prompt.latest_sources && prompt.latest_sources.length > 0 && (
                      <div className="mt-3">
                        <button
                          onClick={() => toggleSources(prompt.id)}
                          className="flex items-center gap-1.5 text-xs text-[#0EA5E9] hover:text-[#0284C7] font-medium"
                        >
                          {expandedSources.has(prompt.id) ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                          <FileText className="h-3.5 w-3.5" />
                          Cited Articles
                        </button>
                        
                        {/* Expanded sources list */}
                        {expandedSources.has(prompt.id) && (
                          <div className="mt-2 space-y-2 pl-5 border-l-2 border-[#0EA5E9]/20">
                            {prompt.latest_sources.map((source, idx) => (
                              <div key={idx} className="bg-slate-50 rounded-lg p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <a 
                                      href={source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm font-medium text-[#0F172A] hover:text-[#0EA5E9] flex items-center gap-1"
                                    >
                                      {source.title || getDomain(source.url)}
                                      <ExternalLink className="h-3 w-3 shrink-0" />
                                    </a>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {getDomain(source.url)}
                                      {source.date && ` • ${source.date}`}
                                    </p>
                                    {source.snippet && (
                                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                        {source.snippet}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={loading === prompt.id}>
                        {loading === prompt.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExclude(prompt.id, 'irrelevant')}>
                        <Ban className="h-4 w-4 mr-2 text-red-500" />
                        Exclude (Irrelevant)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExclude(prompt.id, 'duplicate')}>
                        <Ban className="h-4 w-4 mr-2 text-red-500" />
                        Exclude (Duplicate)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExclude(prompt.id, 'low_value')}>
                        <Ban className="h-4 w-4 mr-2 text-red-500" />
                        Exclude (Low Value)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
          
          {/* Excluded Prompts Section */}
          {excludedPrompts.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => setShowExcluded(!showExcluded)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
              >
                {showExcluded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Ban className="h-4 w-4" />
                Excluded ({excludedPrompts.length})
              </button>
              
              {showExcluded && (
                <div className="space-y-2 pl-6 border-l-2 border-slate-200">
                  {excludedPrompts.map(prompt => (
                    <div 
                      key={prompt.id}
                      className="bg-slate-50 border rounded-lg p-3 opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-600 line-through">
                            "{prompt.query_text}"
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {prompt.excluded_reason && (
                              <Badge variant="outline" className="text-xs">
                                {prompt.excluded_reason}
                              </Badge>
                            )}
                            {prompt.excluded_at && (
                              <span className="text-xs text-muted-foreground">
                                Excluded {formatDistanceToNow(new Date(prompt.excluded_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleReenable(prompt.id)}
                          disabled={loading === prompt.id}
                        >
                          {loading === prompt.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Re-enable
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Competitor Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Competitor Details
            </SheetTitle>
          </SheetHeader>
          
          {selectedCompetitor && (
            <div className="mt-6 space-y-6">
              {/* Competitor name and tracking toggle */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold capitalize">{selectedCompetitor.name}</h3>
                  {selectedCompetitor.domain && (
                    <a 
                      href={`https://${selectedCompetitor.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#0EA5E9] hover:underline flex items-center gap-1"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      {selectedCompetitor.domain}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                
                <button
                  onClick={() => handleToggleCompetitor(selectedCompetitor.name)}
                  disabled={competitorLoading === selectedCompetitor.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                    selectedCompetitor.is_active
                      ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {competitorLoading === selectedCompetitor.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : selectedCompetitor.is_active ? (
                    <ToggleRight className="h-4 w-4" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                  {selectedCompetitor.is_active ? 'Tracking' : 'Not Tracking'}
                </button>
              </div>
              
              {/* Status badges */}
              <div className="flex items-center gap-2">
                {selectedCompetitor.is_active ? (
                  <Badge className="bg-purple-100 text-purple-700">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Tracked
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-600">
                    Discovered
                  </Badge>
                )}
                {selectedCompetitor.auto_discovered && (
                  <Badge variant="outline" className="text-slate-500">
                    Auto-discovered
                  </Badge>
                )}
              </div>
              
              {/* Description */}
              {selectedCompetitor.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                  <p className="text-sm">{selectedCompetitor.description}</p>
                </div>
              )}
              
              {/* Context info */}
              {selectedCompetitor.context && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Discovery Info</h4>
                  {selectedCompetitor.context.citation_count && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Citation count:</span>
                      <span className="font-medium">{selectedCompetitor.context.citation_count as number}</span>
                    </div>
                  )}
                  {selectedCompetitor.context.discovered_from && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discovered from:</span>
                      <span className="font-medium capitalize">{selectedCompetitor.context.discovered_from as string}</span>
                    </div>
                  )}
                  {selectedCompetitor.context.discovered_at && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discovered:</span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(selectedCompetitor.context.discovered_at as string), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Added date */}
              <div className="text-xs text-muted-foreground">
                Added {formatDistanceToNow(new Date(selectedCompetitor.created_at), { addSuffix: true })}
              </div>
              
              {/* Actions */}
              <div className="border-t pt-4 space-y-3">
                <Button 
                  className={`w-full ${
                    selectedCompetitor.is_active 
                      ? 'bg-slate-600 hover:bg-slate-700' 
                      : 'bg-[#0EA5E9] hover:bg-[#0284C7]'
                  }`}
                  onClick={() => handleToggleCompetitor(selectedCompetitor.name)}
                  disabled={competitorLoading === selectedCompetitor.id}
                >
                  {competitorLoading === selectedCompetitor.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : selectedCompetitor.is_active ? (
                    <ToggleLeft className="h-4 w-4 mr-2" />
                  ) : (
                    <ToggleRight className="h-4 w-4 mr-2" />
                  )}
                  {selectedCompetitor.is_active ? 'Stop Tracking' : 'Start Tracking'}
                </Button>
                
                {selectedCompetitor.domain && (
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(`https://${selectedCompetitor.domain}`, '_blank')}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Visit Website
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
