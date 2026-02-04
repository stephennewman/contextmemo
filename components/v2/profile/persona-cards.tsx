'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  User, 
  Briefcase, 
  Building,
  GraduationCap,
  UserCircle,
} from 'lucide-react'
import { toast } from 'sonner'

interface Persona {
  title: string
  seniority: string
  function: string
  description?: string
}

interface PersonaCardsProps {
  brandId: string
  personas: Persona[]
  disabledPersonas: string[]
}

const seniorityIcon = (seniority: string) => {
  switch (seniority.toLowerCase()) {
    case 'executive':
      return Building
    case 'manager':
      return Briefcase
    case 'specialist':
      return GraduationCap
    default:
      return User
  }
}

const seniorityColor = (seniority: string) => {
  switch (seniority.toLowerCase()) {
    case 'executive':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'manager':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'specialist':
      return 'bg-green-100 text-green-700 border-green-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

export function PersonaCards({ brandId, personas, disabledPersonas }: PersonaCardsProps) {
  const [disabled, setDisabled] = useState<string[]>(disabledPersonas)
  const [saving, setSaving] = useState(false)

  const togglePersona = async (personaTitle: string) => {
    const newDisabled = disabled.includes(personaTitle)
      ? disabled.filter(p => p !== personaTitle)
      : [...disabled, personaTitle]
    
    setDisabled(newDisabled)
    setSaving(true)

    try {
      const response = await fetch(`/api/brands/${brandId}/personas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled_personas: newDisabled }),
      })

      if (!response.ok) {
        throw new Error('Failed to update')
      }

      toast.success(
        disabled.includes(personaTitle) 
          ? 'Persona enabled' 
          : 'Persona disabled'
      )
    } catch {
      // Revert on error
      setDisabled(disabled.includes(personaTitle) 
        ? [...disabled, personaTitle]
        : disabled.filter(p => p !== personaTitle)
      )
      toast.error('Failed to update persona')
    } finally {
      setSaving(false)
    }
  }

  // Group by seniority
  const grouped = personas.reduce((acc, persona) => {
    const key = persona.seniority.toLowerCase()
    if (!acc[key]) acc[key] = []
    acc[key].push(persona)
    return acc
  }, {} as Record<string, Persona[]>)

  const seniorityOrder = ['executive', 'manager', 'specialist']

  return (
    <div className="space-y-6">
      {seniorityOrder.map(seniority => {
        const group = grouped[seniority]
        if (!group || group.length === 0) return null
        
        const Icon = seniorityIcon(seniority)
        
        return (
          <div key={seniority}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground capitalize">
                {seniority} Level
              </span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.map((persona, i) => {
                const isDisabled = disabled.includes(persona.title)
                
                return (
                  <div 
                    key={i}
                    className={`relative p-4 rounded-lg border transition-all ${
                      isDisabled 
                        ? 'bg-slate-50 opacity-60' 
                        : 'bg-white hover:border-[#0EA5E9]/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${seniorityColor(persona.seniority)}`}>
                          <UserCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-[#0F172A] leading-tight">
                            {persona.title}
                          </p>
                          <Badge variant="outline" className="text-xs mt-1 capitalize">
                            {persona.function}
                          </Badge>
                        </div>
                      </div>
                      <Switch
                        checked={!isDisabled}
                        onCheckedChange={() => togglePersona(persona.title)}
                        disabled={saving}
                        className="scale-75"
                      />
                    </div>
                    {persona.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                        {persona.description}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
