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
  Plus
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Competitor {
  id: string
  name: string
  domain: string | null
  description: string | null
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDomain, setNewDomain] = useState('')

  const handleAddCompetitor = async () => {
    if (!newName.trim()) {
      toast.error('Competitor name is required')
      return
    }

    setAdding(true)
    try {
      const supabase = createClient()
      
      // Clean domain (remove http/https, trailing slashes)
      let cleanDomain = newDomain.trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
      
      const { data, error } = await supabase
        .from('competitors')
        .insert({
          brand_id: brandId,
          name: newName.trim(),
          domain: cleanDomain || null,
          auto_discovered: false,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      // Add to local state
      setCompetitors(prev => [...prev, data])
      
      toast.success(`Added ${newName}`)
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Competitor
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
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Competitors */}
        {activeCompetitors.length > 0 ? (
          <div className="space-y-2">
            {activeCompetitors.map((competitor) => (
              <div 
                key={competitor.id} 
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{competitor.name}</p>
                    {competitor.domain && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {competitor.domain}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {competitor.auto_discovered && (
                    <Badge variant="secondary" className="text-xs">Auto</Badge>
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
                </div>
              </div>
            ))}
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
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help text */}
        <p className="text-xs text-muted-foreground pt-2">
          Excluded competitors won&apos;t appear in visibility scans or content monitoring. 
          Toggle to re-enable them.
        </p>
      </CardContent>
    </Card>
  )
}
