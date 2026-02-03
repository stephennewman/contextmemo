'use client'

import { useState } from 'react'
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
  Info
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface CompetitorContext {
  confidence?: 'high' | 'medium'
  competition_type?: 'direct' | 'partial'
  reasoning?: string
  discovered_at?: string
}

interface Competitor {
  id: string
  name: string
  domain: string | null
  description: string | null
  context?: CompetitorContext | null
  auto_discovered: boolean
  is_active: boolean
}

interface CompetitorListProps {
  brandId: string
  competitors: Competitor[]
}

export function CompetitorList({ brandId, competitors: initialCompetitors }: CompetitorListProps) {
  const [competitors, setCompetitors] = useState(initialCompetitors)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [rediscovering, setRediscovering] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDomain, setNewDomain] = useState('')

  const handleAddCompetitor = async () => {
    if (!newName.trim()) {
      toast.error('Competitor name is required')
      return
    }

    const trimmedName = newName.trim()
    
    // Clean domain (remove http/https, www, trailing slashes)
    let cleanDomain = newDomain.trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .toLowerCase()

    // Check for existing competitor with same name (case-insensitive)
    const existingByName = competitors.find(
      c => c.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (existingByName) {
      toast.error(`"${existingByName.name}" already exists`)
      return
    }

    // Check for existing competitor with same domain
    if (cleanDomain) {
      const existingByDomain = competitors.find(
        c => c.domain?.toLowerCase() === cleanDomain
      )
      if (existingByDomain) {
        toast.error(`A competitor with domain "${cleanDomain}" already exists: ${existingByDomain.name}`)
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
        })
        .select()
        .single()

      if (error) throw error

      // Add to local state
      setCompetitors(prev => [...prev, data])
      
      toast.success(`Added ${trimmedName}`)
      setNewName('')
      setNewDomain('')
      setDialogOpen(false)
    } catch (error: unknown) {
      const err = error as { code?: string }
      if (err.code === '23505') {
        toast.error('This competitor already exists')
      } else {
        toast.error('Failed to add competitor')
      }
      console.error(error)
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (competitorId: string, currentlyActive: boolean) => {
    setTogglingId(competitorId)
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('competitors')
        .update({ is_active: !currentlyActive })
        .eq('id', competitorId)

      if (error) throw error

      // Update local state
      setCompetitors(prev => 
        prev.map(c => 
          c.id === competitorId 
            ? { ...c, is_active: !currentlyActive }
            : c
        )
      )

      toast.success(
        !currentlyActive 
          ? 'Competitor enabled for tracking' 
          : 'Competitor excluded from tracking'
      )
    } catch (error) {
      toast.error('Failed to update competitor')
      console.error(error)
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (competitorId: string, competitorName: string) => {
    if (!confirm(`Delete "${competitorName}" permanently? This will also remove any related content tracking.`)) {
      return
    }

    setDeletingId(competitorId)
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('competitors')
        .delete()
        .eq('id', competitorId)

      if (error) throw error

      // Update local state
      setCompetitors(prev => prev.filter(c => c.id !== competitorId))
      toast.success(`Deleted ${competitorName}`)
    } catch (error) {
      toast.error('Failed to delete competitor')
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

      toast.success('Re-discovering competitors... this may take a minute')
    } catch (error) {
      toast.error('Failed to start competitor discovery')
      console.error(error)
    } finally {
      setRediscovering(false)
    }
  }

  // Separate active and excluded competitors
  const activeCompetitors = competitors.filter(c => c.is_active)
  const excludedCompetitors = competitors.filter(c => !c.is_active)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Tracked Competitors</CardTitle>
            <CardDescription>
              {activeCompetitors.length} active • {excludedCompetitors.length} excluded
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRediscover}
              disabled={rediscovering}
              title="Re-discover competitors using AI"
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
                <DialogTitle>Add Competitor</DialogTitle>
                <DialogDescription>
                  Add a competitor to track in visibility scans and content monitoring.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Competitor Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Profound"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain (optional)</Label>
                  <Input
                    id="domain"
                    placeholder="e.g., profound.ai"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for content monitoring and comparison memos
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCompetitor} disabled={adding}>
                  {adding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Competitor
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Competitors */}
        {activeCompetitors.length > 0 ? (
          <div className="space-y-2">
            {activeCompetitors.map((competitor) => {
              const ctx = competitor.context as CompetitorContext | null
              const confidenceColor = ctx?.confidence === 'high' ? 'text-green-600' : 'text-yellow-600'
              const confidenceLabel = ctx?.confidence === 'high' ? 'High confidence' : 'Medium confidence'
              
              return (
                <div 
                  key={competitor.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{competitor.name}</p>
                        {ctx?.confidence && (
                          <span 
                            className={`text-xs ${confidenceColor}`}
                            title={ctx.reasoning || confidenceLabel}
                          >
                            {ctx.confidence === 'high' ? '●' : '○'}
                          </span>
                        )}
                        {ctx?.competition_type === 'partial' && (
                          <span className="text-xs text-muted-foreground" title="Partial overlap">
                            (partial)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {competitor.domain && (
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {competitor.domain}
                          </span>
                        )}
                        {competitor.description && (
                          <span 
                            className="truncate max-w-[200px] cursor-help" 
                            title={competitor.description}
                          >
                            • {competitor.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {competitor.auto_discovered && (
                      <Badge variant="secondary" className="text-xs">Auto</Badge>
                    )}
                    {ctx?.reasoning && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground h-8 w-8 p-0"
                        title={ctx.reasoning}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(competitor.id, true)}
                      disabled={togglingId === competitor.id}
                      className="text-muted-foreground hover:text-destructive"
                      title="Exclude from tracking"
                    >
                      {togglingId === competitor.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ToggleRight className="h-4 w-4 text-green-500" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(competitor.id, competitor.name)}
                      disabled={deletingId === competitor.id}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete competitor"
                    >
                      {deletingId === competitor.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-4 text-center">
            No active competitors. Run competitor discovery or re-enable excluded ones below.
          </p>
        )}

        {/* Excluded Competitors */}
        {excludedCompetitors.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
              Excluded from Tracking
            </p>
            <div className="space-y-2">
              {excludedCompetitors.map((competitor) => (
                <div 
                  key={competitor.id} 
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 opacity-60"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{competitor.name}</p>
                    {competitor.domain && (
                      <p className="text-sm text-muted-foreground">
                        {competitor.domain}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(competitor.id, false)}
                      disabled={togglingId === competitor.id}
                      className="text-muted-foreground hover:text-green-600"
                      title="Re-enable tracking"
                    >
                      {togglingId === competitor.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(competitor.id, competitor.name)}
                      disabled={deletingId === competitor.id}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete competitor"
                    >
                      {deletingId === competitor.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help text */}
        <div className="text-xs text-muted-foreground pt-2 space-y-1">
          <p>
            <span className="text-green-600">●</span> High confidence = Direct competitor
            {' • '}
            <span className="text-yellow-600">○</span> Medium confidence = Likely competitor
          </p>
          <p>
            Excluded competitors won&apos;t appear in visibility scans or content monitoring.
            Delete incorrect ones to prevent them from being re-suggested.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
