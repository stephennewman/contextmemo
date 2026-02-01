'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, Plus, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { PERSONA_CONFIGS, CustomPersona, PromptPersona } from '@/lib/supabase/types'

interface PersonaManagerProps {
  brandId: string
  targetPersonas: string[]
  customPersonas: CustomPersona[]
  disabledPersonas: string[]
}

export function PersonaManager({ 
  brandId, 
  targetPersonas = [], 
  customPersonas = [],
  disabledPersonas = []
}: PersonaManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addCoreDialogOpen, setAddCoreDialogOpen] = useState(false)

  // New persona form state
  const [newPersona, setNewPersona] = useState({
    id: '',
    name: '',
    description: '',
    phrasing_style: '',
    priorities: ''
  })

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

  const addCustomPersona = async () => {
    if (!newPersona.id || !newPersona.name || !newPersona.description) {
      toast.error('ID, name, and description are required')
      return
    }

    setLoading('add')
    try {
      const response = await fetch(`/api/brands/${brandId}/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'add_persona',
          id: newPersona.id.toLowerCase().replace(/\s+/g, '_'),
          name: newPersona.name,
          description: newPersona.description,
          phrasing_style: newPersona.phrasing_style || 'Direct and practical',
          priorities: newPersona.priorities.split(',').map(p => p.trim()).filter(Boolean)
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast.success(data.message)
      setAddDialogOpen(false)
      setNewPersona({ id: '', name: '', description: '', phrasing_style: '', priorities: '' })
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add persona')
    } finally {
      setLoading(null)
    }
  }

  const addCorePersona = async (personaId: string) => {
    setLoading(personaId)
    try {
      const response = await fetch(`/api/brands/${brandId}/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'add_core_persona',
          personaId
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      toast.success(data.message)
      setAddCoreDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add persona')
    } finally {
      setLoading(null)
    }
  }

  const removeCustomPersona = async (personaId: string) => {
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

  // Get all active personas (both core and custom)
  const activePersonas = targetPersonas.map(personaId => {
    const corePersona = PERSONA_CONFIGS.find(p => p.id === personaId)
    const customPersona = customPersonas.find(p => p.id === personaId)
    const isEnabled = !disabledPersonas.includes(personaId)
    
    return {
      id: personaId,
      name: corePersona?.name || customPersona?.name || personaId,
      description: corePersona?.description || customPersona?.description || '',
      isCore: !!corePersona,
      isCustom: !!customPersona,
      isEnabled,
      customData: customPersona
    }
  })

  // Core personas not yet added
  const availableCorePersonas = PERSONA_CONFIGS.filter(
    p => !targetPersonas.includes(p.id)
  )

  return (
    <div className="space-y-4">
      {/* Active Personas */}
      <div className="flex flex-wrap gap-2">
        {activePersonas.map(persona => (
          <div 
            key={persona.id}
            className={`px-3 py-2 border rounded-lg flex items-center gap-3 transition-opacity ${
              persona.isEnabled 
                ? persona.isCustom 
                  ? 'bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800' 
                  : 'bg-muted/50'
                : 'opacity-50 bg-muted/30'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm flex items-center gap-2">
                {persona.name}
                {persona.isCustom && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0">Custom</Badge>
                )}
                {!persona.isEnabled && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0">Off</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                {persona.description}
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
              
              {/* Remove button (custom only) */}
              {persona.isCustom && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => removeCustomPersona(persona.id)}
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
        ))}
      </div>

      {/* Add Persona Buttons */}
      <div className="flex gap-2">
        {/* Add Core Persona */}
        {availableCorePersonas.length > 0 && (
          <Dialog open={addCoreDialogOpen} onOpenChange={setAddCoreDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Core Persona
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Core Persona</DialogTitle>
                <DialogDescription>
                  Add a predefined persona type to generate targeted prompts
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-4">
                {availableCorePersonas.map(persona => (
                  <button
                    key={persona.id}
                    onClick={() => addCorePersona(persona.id)}
                    disabled={loading !== null}
                    className="flex items-center justify-between p-3 text-left rounded-lg border hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    <div>
                      <div className="font-medium text-sm">{persona.name}</div>
                      <div className="text-xs text-muted-foreground">{persona.description}</div>
                    </div>
                    {loading === persona.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Custom Persona */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Custom Persona
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Persona</DialogTitle>
              <DialogDescription>
                Create an industry-specific persona for targeted prompt generation
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="persona-id">ID (snake_case)</Label>
                <Input
                  id="persona-id"
                  placeholder="e.g., restaurant_owner"
                  value={newPersona.id}
                  onChange={(e) => setNewPersona(prev => ({ 
                    ...prev, 
                    id: e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                  }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="persona-name">Display Name</Label>
                <Input
                  id="persona-name"
                  placeholder="e.g., Restaurant Owner"
                  value={newPersona.name}
                  onChange={(e) => setNewPersona(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="persona-description">Description</Label>
                <Textarea
                  id="persona-description"
                  placeholder="e.g., Owner/operator of a restaurant or food service business"
                  value={newPersona.description}
                  onChange={(e) => setNewPersona(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="persona-phrasing">How they phrase questions (optional)</Label>
                <Input
                  id="persona-phrasing"
                  placeholder="e.g., Cost-conscious, operations-focused"
                  value={newPersona.phrasing_style}
                  onChange={(e) => setNewPersona(prev => ({ ...prev, phrasing_style: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="persona-priorities">Priorities (comma-separated, optional)</Label>
                <Input
                  id="persona-priorities"
                  placeholder="e.g., ease of use, cost, staff training"
                  value={newPersona.priorities}
                  onChange={(e) => setNewPersona(prev => ({ ...prev, priorities: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addCustomPersona} disabled={loading === 'add'}>
                {loading === 'add' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Add Persona
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
