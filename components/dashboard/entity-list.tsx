'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Loader2,
  Globe,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Search,
  ArrowDownWideNarrow,
  ArrowUpAZ,
  Filter,
  ExternalLink,
  FileText,
  Swords,
  BookOpen,
  Award,
  Users,
  Newspaper,
  TrendingUp,
  Mic,
  Store,
  Handshake,
  GraduationCap,
  HelpCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { EntityType, ENTITY_TYPE_META } from '@/lib/supabase/types'

type SortOption = 'citations' | 'name' | 'type'
type EntityFilterOption = 'all' | 'competitors' | 'partners' | EntityType

// Icon mapping for entity types
const ENTITY_ICONS: Record<EntityType, React.ComponentType<{ className?: string }>> = {
  product_competitor: Swords,
  publisher: BookOpen,
  accrediting_body: Award,
  association: Users,
  news_outlet: Newspaper,
  analyst: TrendingUp,
  influencer: Mic,
  marketplace: Store,
  partner: Handshake,
  research_institution: GraduationCap,
  other: HelpCircle,
}

interface CompetitorContext {
  confidence?: 'high' | 'medium'
  competition_type?: 'direct' | 'partial'
  reasoning?: string
  discovered_at?: string
  citation_count?: number
  discovered_from?: string
  partnership_opportunity?: string
}

interface Entity {
  id: string
  name: string
  domain: string | null
  description: string | null
  context?: CompetitorContext | null
  auto_discovered: boolean
  is_active: boolean
  entity_type?: EntityType | null
  is_partner_candidate?: boolean
}

interface EntityListProps {
  brandId: string
  entities: Entity[]
  citationCounts: Record<string, number>
  citationUrls: Record<string, string[]>
}

export function EntityList({ 
  brandId, 
  entities: initialEntities, 
  citationCounts,
  citationUrls 
}: EntityListProps) {
  const [entities, setEntities] = useState(initialEntities)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [rediscovering, setRediscovering] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDomain, setNewDomain] = useState('')
  
  // New state for filtering/sorting
  const [showDiscovered, setShowDiscovered] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('citations')
  const [trackedSortBy, setTrackedSortBy] = useState<SortOption>('citations')
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set())
  const [entityFilter, setEntityFilter] = useState<EntityFilterOption>('all')

  // Separate tracked and discovered
  const trackedEntities = entities.filter(e => e.is_active)
  const discoveredEntities = entities.filter(e => !e.is_active && e.auto_discovered)

  // Get unique entity types from all entities
  const entityTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    entities.forEach(e => {
      const type = e.entity_type || 'product_competitor'
      counts[type] = (counts[type] || 0) + 1
    })
    return counts
  }, [entities])

  // Count competitors vs potential partners
  const competitorCount = useMemo(() => {
    return entities.filter(
      e => (e.entity_type || 'product_competitor') === 'product_competitor'
    ).length
  }, [entities])

  const partnerCount = useMemo(() => {
    return entities.filter(
      e => e.is_partner_candidate || (e.entity_type && e.entity_type !== 'product_competitor')
    ).length
  }, [entities])

  const toggleCitations = (entityId: string) => {
    setExpandedCitations(prev => {
      const next = new Set(prev)
      if (next.has(entityId)) {
        next.delete(entityId)
      } else {
        next.add(entityId)
      }
      return next
    })
  }

  // Filter function based on entity type
  const matchesEntityFilter = (e: Entity): boolean => {
    const type = e.entity_type || 'product_competitor'
    
    if (entityFilter === 'all') return true
    if (entityFilter === 'competitors') return type === 'product_competitor'
    if (entityFilter === 'partners') {
      return e.is_partner_candidate || (type !== 'product_competitor')
    }
    return type === entityFilter
  }

  // Sort tracked entities
  const sortedTracked = useMemo(() => {
    let sorted = [...trackedEntities].filter(matchesEntityFilter)
    
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
      case 'type':
        sorted = sorted.sort((a, b) => 
          (a.entity_type || 'product_competitor').localeCompare(b.entity_type || 'product_competitor')
        )
        break
    }
    
    return sorted
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackedEntities, trackedSortBy, citationCounts, entityFilter])

  // Filter and sort discovered entities
  const filteredDiscovered = useMemo(() => {
    let filtered = discoveredEntities.filter(e => {
      // Entity type filter
      if (!matchesEntityFilter(e)) return false
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return e.name.toLowerCase().includes(query) ||
          e.domain?.toLowerCase().includes(query) ||
          e.entity_type?.toLowerCase().includes(query)
      }
      return true
    })
    
    // Sort
    switch (sortBy) {
      case 'citations':
        filtered = [...filtered].sort((a, b) => 
          (citationCounts[b.id] || b.context?.citation_count || 0) - 
          (citationCounts[a.id] || a.context?.citation_count || 0)
        )
        break
      case 'name':
        filtered = [...filtered].sort((a, b) => 
          a.name.localeCompare(b.name)
        )
        break
      case 'type':
        filtered = [...filtered].sort((a, b) => 
          (a.entity_type || 'product_competitor').localeCompare(b.entity_type || 'product_competitor')
        )
        break
    }
    
    return filtered
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discoveredEntities, searchQuery, sortBy, entityFilter, citationCounts])

  const handleAddEntity = async () => {
    if (!newName.trim()) {
      toast.error('Entity name is required')
      return
    }

    const trimmedName = newName.trim()
    
    // Clean domain
    let cleanDomain = newDomain.trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .toLowerCase()

    // Check for existing entity
    const existingByName = entities.find(
      e => e.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (existingByName) {
      toast.error(`"${existingByName.name}" already exists`)
      return
    }

    if (cleanDomain) {
      const existingByDomain = entities.find(
        e => e.domain?.toLowerCase() === cleanDomain
      )
      if (existingByDomain) {
        toast.error(`An entity with domain "${cleanDomain}" already exists: ${existingByDomain.name}`)
        return
      }
    }

    setAdding(true)
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('competitors')
        .insert({
          brand_id: brandId,
          name: trimmedName,
          domain: cleanDomain || null,
          auto_discovered: false,
          is_active: true,
          entity_type: 'product_competitor',
        })
        .select()
        .single()

      if (error) throw error

      setEntities(prev => [...prev, data])
      
      toast.success(`Added ${trimmedName}`)
      setNewName('')
      setNewDomain('')
      setDialogOpen(false)
    } catch (error: unknown) {
      const err = error as { code?: string }
      if (err.code === '23505') {
        toast.error('This entity already exists')
      } else {
        toast.error('Failed to add entity')
      }
      console.error(error)
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (entityId: string, currentlyActive: boolean) => {
    setTogglingId(entityId)
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('competitors')
        .update({ is_active: !currentlyActive })
        .eq('id', entityId)

      if (error) throw error

      setEntities(prev => 
        prev.map(e => 
          e.id === entityId 
            ? { ...e, is_active: !currentlyActive }
            : e
        )
      )

      const entity = entities.find(e => e.id === entityId)
      toast.success(
        !currentlyActive 
          ? `Now tracking ${entity?.name}` 
          : `Stopped tracking ${entity?.name}`
      )
    } catch (error) {
      toast.error('Failed to update entity')
      console.error(error)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (entityId: string, entityName: string) => {
    if (!confirm(`Delete "${entityName}" permanently? This will also remove any related content tracking.`)) {
      return
    }

    setDeletingId(entityId)
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('competitors')
        .delete()
        .eq('id', entityId)

      if (error) throw error

      setEntities(prev => prev.filter(e => e.id !== entityId))
      toast.success(`Deleted ${entityName}`)
    } catch (error) {
      toast.error('Failed to delete entity')
      console.error(error)
    } finally {
      setDeletingId(null)
    }
  }

  const handleRediscover = async () => {
    setRediscovering(true)
    
    try {
      const res = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'discover_competitors' }),
      })

      if (!res.ok) throw new Error('Failed to trigger discovery')

      toast.success('Re-discovering entities... this may take a minute')
    } catch (error) {
      toast.error('Failed to start entity discovery')
      console.error(error)
    } finally {
      setRediscovering(false)
    }
  }

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Entities</CardTitle>
            <CardDescription>
              {trackedEntities.length} tracked • {discoveredEntities.length} discovered
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRediscover}
              disabled={rediscovering}
              title="Re-discover entities using AI"
            >
              {rediscovering ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Re-discover
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Entity</DialogTitle>
                  <DialogDescription>
                    Add a competitor or other entity to track in visibility scans.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Entity Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Competitor Name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domain (optional)</Label>
                    <Input
                      id="domain"
                      placeholder="e.g., competitor.com"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for content monitoring and citation tracking
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddEntity} disabled={adding}>
                    {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Entity
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Entity Type Filter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={() => setEntityFilter('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              entityFilter === 'all'
                ? 'bg-[#0F172A] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({entities.length})
          </button>
          <button
            onClick={() => setEntityFilter('competitors')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
              entityFilter === 'competitors'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            <Swords className="h-3.5 w-3.5" />
            Competitors ({competitorCount})
          </button>
          {partnerCount > 0 && (
            <button
              onClick={() => setEntityFilter('partners')}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                entityFilter === 'partners'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Handshake className="h-3.5 w-3.5" />
              Other ({partnerCount})
            </button>
          )}
          
          {/* Show specific type filters if there are multiple types */}
          {Object.entries(entityTypeCounts).filter(([type]) => type !== 'product_competitor').length > 0 && (
            <>
              <div className="w-px h-6 bg-slate-200 mx-1" />
              {Object.entries(entityTypeCounts)
                .filter(([type]) => type !== 'product_competitor')
                .map(([type, count]) => {
                  const meta = ENTITY_TYPE_META[type as EntityType]
                  const Icon = ENTITY_ICONS[type as EntityType]
                  return (
                    <button
                      key={type}
                      onClick={() => setEntityFilter(type as EntityType)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        entityFilter === type
                          ? 'text-white'
                          : 'hover:opacity-80'
                      }`}
                      style={{
                        backgroundColor: entityFilter === type ? meta.color : meta.bgColor,
                        color: entityFilter === type ? 'white' : meta.color,
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {meta.label} ({count})
                    </button>
                  )
                })}
            </>
          )}
        </div>

        {/* Tracked Entities */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#0F172A] flex items-center gap-2">
              <ToggleRight className="h-4 w-4 text-green-600" />
              Tracked ({sortedTracked.length})
            </h3>
            
            {sortedTracked.length > 1 && (
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setTrackedSortBy('citations')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    trackedSortBy === 'citations' 
                      ? 'bg-white shadow-sm text-[#0F172A] font-medium' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowDownWideNarrow className="h-3 w-3" />
                  Cited
                </button>
                <button
                  onClick={() => setTrackedSortBy('name')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    trackedSortBy === 'name' 
                      ? 'bg-white shadow-sm text-[#0F172A] font-medium' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ArrowUpAZ className="h-3 w-3" />
                  A-Z
                </button>
              </div>
            )}
          </div>
          
          {sortedTracked.length > 0 ? (
            <div className="space-y-2">
              {sortedTracked.map((entity) => {
                const entityType = (entity.entity_type || 'product_competitor') as EntityType
                const typeMeta = ENTITY_TYPE_META[entityType]
                const TypeIcon = ENTITY_ICONS[entityType]
                const citationCount = citationCounts[entity.id] || 0
                const citations = citationUrls[entity.id] || []
                const isExpanded = expandedCitations.has(entity.id)
                
                return (
                  <div 
                    key={entity.id} 
                    className="border rounded-lg p-3"
                    style={{ borderLeftWidth: '3px', borderLeftColor: typeMeta.color }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                          style={{ backgroundColor: typeMeta.bgColor, color: typeMeta.color }}
                        >
                          <TypeIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{entity.name}</p>
                            <Badge 
                              variant="outline" 
                              className="text-[10px] px-1.5 py-0 shrink-0"
                              style={{ 
                                color: typeMeta.color, 
                                borderColor: typeMeta.color,
                                backgroundColor: typeMeta.bgColor 
                              }}
                            >
                              {typeMeta.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {entity.domain && (
                              <a 
                                href={`https://${entity.domain}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-[#0EA5E9]"
                              >
                                <Globe className="h-3 w-3" />
                                {entity.domain}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {citationCount > 0 ? (
                              <button
                                onClick={() => toggleCitations(entity.id)}
                                className="flex items-center gap-1 text-[#0EA5E9] hover:text-[#0284C7]"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                                <FileText className="h-3 w-3" />
                                <span>{citationCount} citation{citationCount !== 1 ? 's' : ''}</span>
                              </button>
                            ) : (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <FileText className="h-3 w-3" />
                                0 citations
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {entity.auto_discovered && (
                          <Badge variant="secondary" className="text-xs">Auto</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(entity.id, true)}
                          disabled={togglingId === entity.id}
                          className="text-green-500 hover:text-red-600 h-8 w-8 p-0"
                          title="Stop tracking"
                        >
                          {togglingId === entity.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ToggleRight className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entity.id, entity.name)}
                          disabled={deletingId === entity.id}
                          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                          title="Delete entity"
                        >
                          {deletingId === entity.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Expanded citations list */}
                    {isExpanded && citations.length > 0 && (
                      <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto ml-11">
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
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No tracked entities yet. Enable tracking from the discovered list below or add one manually.
            </p>
          )}
        </div>

        {/* Discovered Entities */}
        {discoveredEntities.length > 0 && (
          <div className="pt-4 border-t">
            <button
              onClick={() => setShowDiscovered(!showDiscovered)}
              className="flex items-center gap-2 text-sm font-semibold text-[#0F172A] mb-3 hover:text-[#0EA5E9]"
            >
              {showDiscovered ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Sparkles className="h-4 w-4 text-amber-500" />
              Discovered ({filteredDiscovered.length})
            </button>
            
            {showDiscovered && (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  These entities were found in AI citations. Toggle ON to start tracking them.
                </p>
                
                {/* Search and Sort */}
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setSortBy('citations')}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                        sortBy === 'citations' 
                          ? 'bg-white shadow-sm text-[#0F172A] font-medium' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ArrowDownWideNarrow className="h-3 w-3" />
                      Cited
                    </button>
                    <button
                      onClick={() => setSortBy('name')}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                        sortBy === 'name' 
                          ? 'bg-white shadow-sm text-[#0F172A] font-medium' 
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ArrowUpAZ className="h-3 w-3" />
                      A-Z
                    </button>
                  </div>
                  
                  {discoveredEntities.length > 10 && (
                    <div className="flex-1 max-w-xs">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search discovered..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredDiscovered.slice(0, 50).map((entity) => {
                    const entityType = (entity.entity_type || 'product_competitor') as EntityType
                    const typeMeta = ENTITY_TYPE_META[entityType]
                    const TypeIcon = ENTITY_ICONS[entityType]
                    const citationCount = citationCounts[entity.id] || entity.context?.citation_count || 0
                    
                    return (
                      <div 
                        key={entity.id}
                        className="bg-slate-50 border border-dashed rounded-lg p-2.5 hover:border-[#0EA5E9] transition-colors"
                        style={{ borderLeftWidth: '3px', borderLeftColor: typeMeta.color, borderLeftStyle: 'solid' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div 
                              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                              style={{ backgroundColor: typeMeta.bgColor, color: typeMeta.color }}
                            >
                              <TypeIcon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-medium text-sm text-[#0F172A] truncate">{entity.name}</h4>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge 
                                  variant="outline" 
                                  className="text-[10px] px-1.5 py-0"
                                  style={{ 
                                    color: typeMeta.color, 
                                    borderColor: typeMeta.color,
                                    backgroundColor: typeMeta.bgColor 
                                  }}
                                >
                                  {typeMeta.label}
                                </Badge>
                                {entity.domain && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    {entity.domain}
                                  </span>
                                )}
                                {citationCount > 0 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                                    {citationCount}x cited
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleToggle(entity.id, false)}
                            disabled={togglingId === entity.id}
                            className="shrink-0 text-slate-400 hover:text-green-600 h-7 w-7 p-0"
                            title="Start tracking"
                          >
                            {togglingId === entity.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {filteredDiscovered.length > 50 && (
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Showing 50 of {filteredDiscovered.length} discovered entities
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Help text */}
        <div className="text-xs text-muted-foreground pt-2 space-y-1 border-t">
          <p className="pt-2">
            Entities are competitors, publishers, analysts, and other organizations found in AI citations.
            Track entities to monitor them in visibility scans.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
