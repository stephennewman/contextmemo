'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, Plus, X, Check, Sparkles, User, Users, Crown, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { TargetPersona, PersonaSeniority, SENIORITY_LABELS } from '@/lib/supabase/types'

interface PersonaManagerProps {
  brandId: string
  personas: TargetPersona[]
  disabledPersonas: string[]
}

// Seniority icons
const SENIORITY_ICONS: Record<PersonaSeniority, React.ReactNode> = {
  executive: <Crown className="h-3 w-3" />,
  manager: <Users className="h-3 w-3" />,
  specialist: <User className="h-3 w-3" />,
}

// Seniority colors
const SENIORITY_COLORS: Record<PersonaSeniority, string> = {
  executive: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  manager: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  specialist: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
}

export function PersonaManager({ 
  brandId, 
  personas = [], 
  disabledPersonas = []
}: PersonaManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // New persona form state
  const [newPersona, setNewPersona] = useState({
    title: '',
    seniority: 'manager' as PersonaSeniority,
    function: '',
    description: '',
    phrasing_style: '',
    priorities: ''
  })

  const regeneratePersonas = async () => {
    setLoading('regenerate')
    try {
      const response = await fetch(`/api/brands/${brandId}/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate_personas' }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast.success(data.message)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate personas')
    } finally {
      setLoading(null)
    }
  }

  const togglePersona = async (personaId: string, currentlyEnabled: boolean) => {
    setLoading(personaId)
    try {
      const response = await fetch(`/api/brands/${brandId}/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'toggle_persona',
          personaId,
          enabled: !currentlyEnabled
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast.success(data.message)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to toggle persona')
    } finally {
      setLoading(null)
    }
  }

  const addPersona = async () => {
    if (!newPersona.title || !newPersona.function || !newPersona.description) {
      toast.error('Title, function, and description are required')
      return
    }

    setLoading('add')
    try {
      const response = await fetch(`/api/brands/${brandId}/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'add_persona',
          title: newPersona.title,
          seniority: newPersona.seniority,
          function: newPersona.function,
          description: newPersona.description,
          phrasing_style: newPersona.phrasing_style || 'Direct and practical',
          priorities: newPersona.priorities.split(',').map(p => p.trim()).filter(Boolean)
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast.success(data.message)
      setAddDialogOpen(false)
      setNewPersona({ title: '', seniority: 'manager', function: '', description: '', phrasing_style: '', priorities: '' })
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add persona')
    } finally {
      setLoading(null)
    }
  }

  const removePersona = async (personaId: string) => {
    setLoading(`remove-${personaId}`)
    try {
      const response = await fetch(`/api/brands/${brandId}/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'remove_persona',
          personaId
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast.success(data.message)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove persona')
    } finally {
      setLoading(null)
    }
  }

  // Get all personas with their enabled state
  const personasWithState = personas.map(persona => ({
    ...persona,
    isEnabled: !disabledPersonas.includes(persona.id)
  }))

  // Sort by seniority (executive first) then by function
  const sortedPersonas = [...personasWithState].sort((a, b) => {
    const seniorityOrder = { executive: 0, manager: 1, specialist: 2 }
    if (seniorityOrder[a.seniority] !== seniorityOrder[b.seniority]) {
      return seniorityOrder[a.seniority] - seniorityOrder[b.seniority]
    }
    return a.function.localeCompare(b.function)
  })

  // Skeleton card for loading state
  const PersonaSkeleton = () => (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-7 rounded" />
      </div>
      <div className="flex gap-1.5 mb-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full mb-1" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Action Buttons - Top Right */}
      <div className="flex justify-end gap-2 -mt-1">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={regeneratePersonas}
          disabled={loading === 'regenerate'}
        >
          {loading === 'regenerate' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh Personas
        </Button>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Persona
            </Button>
          </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Target Persona</DialogTitle>
            <DialogDescription>
              Define a buyer persona to generate targeted prompts
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="persona-title">Job Title</Label>
              <Input
                id="persona-title"
                placeholder="e.g., VP of Marketing, Sales Manager"
                value={newPersona.title}
                onChange={(e) => setNewPersona(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Seniority</Label>
              <div className="flex gap-2">
                {(['executive', 'manager', 'specialist'] as PersonaSeniority[]).map((level) => (
                  <Button
                    key={level}
                    type="button"
                    variant={newPersona.seniority === level ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => setNewPersona(prev => ({ ...prev, seniority: level }))}
                  >
                    {level === 'executive' && <Crown className="h-3 w-3" />}
                    {level === 'manager' && <Users className="h-3 w-3" />}
                    {level === 'specialist' && <User className="h-3 w-3" />}
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="persona-function">Function/Department</Label>
              <Input
                id="persona-function"
                placeholder="e.g., Marketing, Sales, Operations"
                value={newPersona.function}
                onChange={(e) => setNewPersona(prev => ({ ...prev, function: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="persona-description">Description</Label>
              <Textarea
                id="persona-description"
                placeholder="e.g., Senior leader responsible for demand generation and marketing ROI"
                value={newPersona.description}
                onChange={(e) => setNewPersona(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="persona-phrasing">How they phrase questions (optional)</Label>
              <Input
                id="persona-phrasing"
                placeholder="e.g., ROI-focused, mentions integrations"
                value={newPersona.phrasing_style}
                onChange={(e) => setNewPersona(prev => ({ ...prev, phrasing_style: e.target.value }))}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="persona-priorities">Priorities (comma-separated, optional)</Label>
              <Input
                id="persona-priorities"
                placeholder="e.g., ROI, integrations, analytics"
                value={newPersona.priorities}
                onChange={(e) => setNewPersona(prev => ({ ...prev, priorities: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addPersona} disabled={loading === 'add'}>
              {loading === 'add' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Add Persona
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>
      </div>

      {/* Personas Grid */}
      {loading === 'regenerate' ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <PersonaSkeleton />
          <PersonaSkeleton />
          <PersonaSkeleton />
        </div>
      ) : sortedPersonas.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sortedPersonas.map(persona => (
            <div 
              key={persona.id}
              className={`p-4 border rounded-lg transition-opacity ${
                persona.isEnabled 
                  ? 'bg-card'
                  : 'opacity-50 bg-muted/30'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {persona.title}
                    {persona.is_auto_detected && (
                      <span title="Auto-detected">
                        <Sparkles className="h-3 w-3 text-muted-foreground" />
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {/* Toggle button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => togglePersona(persona.id, persona.isEnabled)}
                    disabled={loading === persona.id}
                    title={persona.isEnabled ? 'Disable persona' : 'Enable persona'}
                  >
                    {loading === persona.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : persona.isEnabled ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  
                  {/* Remove button (only for manually added) */}
                  {!persona.is_auto_detected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => removePersona(persona.id)}
                      disabled={loading === `remove-${persona.id}`}
                      title="Remove persona"
                    >
                      {loading === `remove-${persona.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge 
                  variant="outline" 
                  className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${SENIORITY_COLORS[persona.seniority]}`}
                >
                  {SENIORITY_ICONS[persona.seniority]}
                  {persona.seniority}
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {persona.function}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground line-clamp-2">
                {persona.description}
              </p>

              {/* Priorities */}
              {persona.priorities && persona.priorities.length > 0 && (
                <div className="mt-2 pt-2 border-t">
                  <div className="flex flex-wrap gap-1">
                    {persona.priorities.slice(0, 3).map((priority, i) => (
                      <span key={i} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {priority}
                      </span>
                    ))}
                    {persona.priorities.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{persona.priorities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No personas detected yet. Personas are automatically identified when analyzing your website.
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
        <span className="flex items-center gap-1">
          <Crown className="h-3 w-3 text-amber-600" />
          Executive (C-level, VP)
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3 text-blue-600" />
          Manager (Director, Lead)
        </span>
        <span className="flex items-center gap-1">
          <User className="h-3 w-3 text-emerald-600" />
          Specialist (IC, Entry)
        </span>
      </div>
    </div>
  )
}
