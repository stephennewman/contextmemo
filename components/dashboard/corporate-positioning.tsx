'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  ChevronDown, 
  ChevronUp, 
  Target, 
  Users, 
  Sparkles, 
  MessageSquare, 
  Mic, 
  Shield, 
  Swords,
  Eye,
  CheckCircle2,
  FileText,
  Pencil,
  X,
  Save,
  Loader2,
  Plus,
  Trash2
} from 'lucide-react'
import { 
  CorporatePositioning as CorporatePositioningType,
  Differentiator,
  MessagingPillar,
  ObjectionResponse
} from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CorporatePositioningSectionProps {
  positioning: CorporatePositioningType | undefined
  brandName: string
  brandId: string
  onUpdate?: (positioning: CorporatePositioningType) => void
}

// Calculate field completion
function calculateFieldCount(positioning: CorporatePositioningType | undefined): { filled: number; total: number } {
  if (!positioning) return { filled: 0, total: 32 }
  
  let filled = 0
  const total = 32
  
  if (positioning.mission_statement) filled++
  if (positioning.vision_statement) filled++
  if (positioning.primary_verticals?.length) filled++
  if (positioning.buyer_personas?.length) filled++
  if (positioning.user_personas?.length) filled++
  if (positioning.core_value_promise) filled++
  if (positioning.key_benefits?.length) filled++
  if (positioning.proof_points?.length) filled++
  const diffCount = positioning.differentiators?.length || 0
  filled += Math.min(diffCount * 2, 6)
  const pillarCount = positioning.messaging_pillars?.length || 0
  filled += Math.min(pillarCount * 2, 6)
  if (positioning.pitch_10_second) filled++
  if (positioning.pitch_30_second) filled++
  if (positioning.pitch_2_minute) filled++
  const objectionCount = positioning.objection_responses?.length || 0
  filled += Math.min(objectionCount * 2, 6)
  if (positioning.competitive_positioning) filled++
  if (positioning.win_themes?.length) filled++
  if (positioning.competitive_landmines?.length) filled++
  
  return { filled, total }
}

// Collapsible section component with edit button
function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = false,
  fieldCount,
  totalFields,
  onEdit,
  isEditing
}: { 
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
  fieldCount: number
  totalFields: number
  onEdit?: () => void
  isEditing?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const isComplete = fieldCount === totalFields
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className={cn(
        "flex items-center justify-between p-4",
        isOpen && "border-b"
      )}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity flex-1"
        >
          <div className={cn(
            "p-2 rounded-lg",
            isComplete ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-muted"
          )}>
            <Icon className={cn(
              "h-4 w-4",
              isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            )} />
          </div>
          <span className="font-medium">{title}</span>
        </button>
        <div className="flex items-center gap-2">
          {onEdit && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                if (!isOpen) setIsOpen(true)
                onEdit()
              }}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Badge 
            variant={isComplete ? "default" : "secondary"} 
            className={cn(
              "text-xs",
              isComplete && "bg-emerald-600"
            )}
          >
            {fieldCount}/{totalFields}
          </Badge>
          <button onClick={() => setIsOpen(!isOpen)} className="p-1">
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="p-4 bg-muted/20">
          {children}
        </div>
      )}
    </div>
  )
}

// Empty state for a field
function EmptyField({ label }: { label: string }) {
  return (
    <div className="text-sm text-muted-foreground italic">
      No {label.toLowerCase()} extracted yet
    </div>
  )
}

// Field display component
function FieldDisplay({ label, value, className }: { label: string; value?: string; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      {value ? (
        <p className="text-sm leading-relaxed">{value}</p>
      ) : (
        <EmptyField label={label} />
      )}
    </div>
  )
}

// List display component
function ListDisplay({ label, items, className }: { label: string; items?: string[]; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      {items && items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyField label={label} />
      )}
    </div>
  )
}

// Editable list component
function EditableList({ 
  items, 
  onChange, 
  placeholder 
}: { 
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
}) {
  const addItem = () => {
    onChange([...items, ''])
  }
  
  const updateItem = (index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = value
    onChange(newItems)
  }
  
  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }
  
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={item}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeItem(i)}
            className="shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Add Item
      </Button>
    </div>
  )
}

export function CorporatePositioningSection({ positioning, brandName, brandId, onUpdate }: CorporatePositioningSectionProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [localData, setLocalData] = useState<CorporatePositioningType>(positioning || {})
  
  const { filled, total } = calculateFieldCount(positioning)
  const completionPercent = Math.round((filled / total) * 100)

  const saveSection = async (section: string, data: Record<string, unknown>) => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/corporate-positioning`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, data })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }
      
      const result = await response.json()
      toast.success('Saved successfully')
      setEditingSection(null)
      if (onUpdate) {
        onUpdate(result.positioning)
      }
      // Update local state
      setLocalData(result.positioning)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const cancelEdit = () => {
    setLocalData(positioning || {})
    setEditingSection(null)
  }
  
  // Use local data for display when editing
  const displayData = editingSection ? localData : (positioning || {})
  
  if (!positioning) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Corporate Positioning
          </CardTitle>
          <CardDescription>
            Strategic messaging framework for consistent content generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No corporate positioning data extracted yet.</p>
            <p className="text-sm mt-1">
              Click &quot;Refresh Context&quot; to analyze the brand website and extract positioning data.
            </p>
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
              <FileText className="h-5 w-5" />
              Corporate Positioning
            </CardTitle>
            <CardDescription className="mt-1">
              Strategic messaging framework • {filled}/{total} fields • {brandName}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600">{completionPercent}%</div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </div>
        </div>
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Section 1: Mission & Vision */}
        <CollapsibleSection 
          title="Mission & Vision" 
          icon={Target}
          fieldCount={(displayData.mission_statement ? 1 : 0) + (displayData.vision_statement ? 1 : 0)}
          totalFields={2}
          defaultOpen={true}
          onEdit={() => setEditingSection('mission_vision')}
          isEditing={editingSection === 'mission_vision'}
        >
          {editingSection === 'mission_vision' ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Mission Statement
                </label>
                <Textarea
                  value={localData.mission_statement || ''}
                  onChange={(e) => setLocalData({ ...localData, mission_statement: e.target.value })}
                  placeholder="Why does your company exist? What problem do you solve?"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Vision Statement
                </label>
                <Textarea
                  value={localData.vision_statement || ''}
                  onChange={(e) => setLocalData({ ...localData, vision_statement: e.target.value })}
                  placeholder="What future are you creating? Where is the company headed?"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={cancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => saveSection('mission_vision', {
                    mission_statement: localData.mission_statement,
                    vision_statement: localData.vision_statement
                  })}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <FieldDisplay label="Mission Statement" value={displayData.mission_statement} />
              <FieldDisplay label="Vision Statement" value={displayData.vision_statement} />
            </div>
          )}
        </CollapsibleSection>
        
        {/* Section 2: Target Markets */}
        <CollapsibleSection 
          title="Target Markets" 
          icon={Users}
          fieldCount={
            (displayData.primary_verticals?.length ? 1 : 0) + 
            (displayData.buyer_personas?.length ? 1 : 0) + 
            (displayData.user_personas?.length ? 1 : 0)
          }
          totalFields={3}
          onEdit={() => setEditingSection('target_markets')}
          isEditing={editingSection === 'target_markets'}
        >
          {editingSection === 'target_markets' ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Primary Verticals
                </label>
                <EditableList
                  items={localData.primary_verticals || []}
                  onChange={(items) => setLocalData({ ...localData, primary_verticals: items })}
                  placeholder="• Industry - specific sub-segments"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Buyer Personas
                </label>
                <EditableList
                  items={localData.buyer_personas || []}
                  onChange={(items) => setLocalData({ ...localData, buyer_personas: items })}
                  placeholder="• Title - responsibilities and needs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  User Personas
                </label>
                <EditableList
                  items={localData.user_personas || []}
                  onChange={(items) => setLocalData({ ...localData, user_personas: items })}
                  placeholder="• User type - how they interact"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={cancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => saveSection('target_markets', {
                    primary_verticals: localData.primary_verticals,
                    buyer_personas: localData.buyer_personas,
                    user_personas: localData.user_personas
                  })}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <ListDisplay label="Primary Verticals" items={displayData.primary_verticals} />
              <ListDisplay label="Buyer Personas" items={displayData.buyer_personas} />
              <ListDisplay label="User Personas" items={displayData.user_personas} />
            </div>
          )}
        </CollapsibleSection>
        
        {/* Section 3: Value Proposition */}
        <CollapsibleSection 
          title="Value Proposition" 
          icon={Sparkles}
          fieldCount={
            (displayData.core_value_promise ? 1 : 0) + 
            (displayData.key_benefits?.length ? 1 : 0) + 
            (displayData.proof_points?.length ? 1 : 0)
          }
          totalFields={3}
          onEdit={() => setEditingSection('value_proposition')}
          isEditing={editingSection === 'value_proposition'}
        >
          {editingSection === 'value_proposition' ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Core Value Promise
                </label>
                <Textarea
                  value={localData.core_value_promise || ''}
                  onChange={(e) => setLocalData({ ...localData, core_value_promise: e.target.value })}
                  placeholder="What's your single most important value statement?"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Key Benefits
                </label>
                <EditableList
                  items={localData.key_benefits || []}
                  onChange={(items) => setLocalData({ ...localData, key_benefits: items })}
                  placeholder="Benefit statement with specific outcome"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Proof Points
                </label>
                <EditableList
                  items={localData.proof_points || []}
                  onChange={(items) => setLocalData({ ...localData, proof_points: items })}
                  placeholder="Trust signal - logos, stats, awards"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={cancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => saveSection('value_proposition', {
                    core_value_promise: localData.core_value_promise,
                    key_benefits: localData.key_benefits,
                    proof_points: localData.proof_points
                  })}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <FieldDisplay label="Core Value Promise" value={displayData.core_value_promise} />
              <ListDisplay label="Key Benefits" items={displayData.key_benefits} />
              <ListDisplay label="Proof Points" items={displayData.proof_points} />
            </div>
          )}
        </CollapsibleSection>
        
        {/* Section 4: Key Differentiators */}
        <CollapsibleSection 
          title="Key Differentiators" 
          icon={Shield}
          fieldCount={Math.min((displayData.differentiators?.length || 0) * 2, 6)}
          totalFields={6}
          onEdit={() => setEditingSection('differentiators')}
          isEditing={editingSection === 'differentiators'}
        >
          {editingSection === 'differentiators' ? (
            <div className="space-y-4">
              {(localData.differentiators || []).map((diff, i) => (
                <div key={i} className="p-4 bg-background rounded-lg border space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-xs">Differentiator {i + 1}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newDiffs = (localData.differentiators || []).filter((_, idx) => idx !== i)
                        setLocalData({ ...localData, differentiators: newDiffs })
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={diff.name}
                    onChange={(e) => {
                      const newDiffs = [...(localData.differentiators || [])]
                      newDiffs[i] = { ...newDiffs[i], name: e.target.value }
                      setLocalData({ ...localData, differentiators: newDiffs })
                    }}
                    placeholder="Differentiator name (3-5 words)"
                  />
                  <Textarea
                    value={diff.detail}
                    onChange={(e) => {
                      const newDiffs = [...(localData.differentiators || [])]
                      newDiffs[i] = { ...newDiffs[i], detail: e.target.value }
                      setLocalData({ ...localData, differentiators: newDiffs })
                    }}
                    placeholder="Detailed explanation (2-3 sentences)"
                    rows={2}
                  />
                </div>
              ))}
              {(localData.differentiators?.length || 0) < 3 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const newDiffs = [...(localData.differentiators || []), { name: '', detail: '' }]
                    setLocalData({ ...localData, differentiators: newDiffs })
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Differentiator
                </Button>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={cancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => saveSection('differentiators', {
                    differentiators: localData.differentiators
                  })}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            displayData.differentiators && displayData.differentiators.length > 0 ? (
              <div className="space-y-4">
                {displayData.differentiators.map((diff, i) => (
                  <div key={i} className="p-4 bg-background rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">Differentiator {i + 1}</Badge>
                    </div>
                    <h4 className="font-semibold mb-2">{diff.name}</h4>
                    <p className="text-sm text-muted-foreground">{diff.detail}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyField label="Differentiators" />
            )
          )}
        </CollapsibleSection>
        
        {/* Section 5: Messaging Pillars */}
        <CollapsibleSection 
          title="Messaging Pillars" 
          icon={MessageSquare}
          fieldCount={Math.min((displayData.messaging_pillars?.length || 0) * 2, 6)}
          totalFields={6}
          onEdit={() => setEditingSection('messaging_pillars')}
          isEditing={editingSection === 'messaging_pillars'}
        >
          {editingSection === 'messaging_pillars' ? (
            <div className="space-y-4">
              {(localData.messaging_pillars || []).map((pillar, i) => (
                <div key={i} className="p-4 bg-background rounded-lg border space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge className="bg-blue-600">Pillar {i + 1}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newPillars = (localData.messaging_pillars || []).filter((_, idx) => idx !== i)
                        setLocalData({ ...localData, messaging_pillars: newPillars })
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={pillar.name}
                    onChange={(e) => {
                      const newPillars = [...(localData.messaging_pillars || [])]
                      newPillars[i] = { ...newPillars[i], name: e.target.value }
                      setLocalData({ ...localData, messaging_pillars: newPillars })
                    }}
                    placeholder="Pillar name (1 word)"
                  />
                  <EditableList
                    items={pillar.supporting_points}
                    onChange={(points) => {
                      const newPillars = [...(localData.messaging_pillars || [])]
                      newPillars[i] = { ...newPillars[i], supporting_points: points }
                      setLocalData({ ...localData, messaging_pillars: newPillars })
                    }}
                    placeholder="Supporting point"
                  />
                </div>
              ))}
              {(localData.messaging_pillars?.length || 0) < 3 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const newPillars = [...(localData.messaging_pillars || []), { name: '', supporting_points: [] }]
                    setLocalData({ ...localData, messaging_pillars: newPillars })
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Pillar
                </Button>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={cancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => saveSection('messaging_pillars', {
                    messaging_pillars: localData.messaging_pillars
                  })}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            displayData.messaging_pillars && displayData.messaging_pillars.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {displayData.messaging_pillars.map((pillar, i) => (
                  <div key={i} className="p-4 bg-background rounded-lg border">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-blue-600">{pillar.name}</Badge>
                    </div>
                    <ul className="space-y-1">
                      {pillar.supporting_points.map((point, j) => (
                        <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyField label="Messaging Pillars" />
            )
          )}
        </CollapsibleSection>
        
        {/* Section 6: Elevator Pitches */}
        <CollapsibleSection 
          title="Elevator Pitches" 
          icon={Mic}
          fieldCount={
            (displayData.pitch_10_second ? 1 : 0) + 
            (displayData.pitch_30_second ? 1 : 0) + 
            (displayData.pitch_2_minute ? 1 : 0)
          }
          totalFields={3}
          onEdit={() => setEditingSection('elevator_pitches')}
          isEditing={editingSection === 'elevator_pitches'}
        >
          {editingSection === 'elevator_pitches' ? (
            <div className="space-y-4">
              <div className="p-4 bg-background rounded-lg border">
                <Badge variant="outline" className="mb-2">10-Second Pitch</Badge>
                <Textarea
                  value={localData.pitch_10_second || ''}
                  onChange={(e) => setLocalData({ ...localData, pitch_10_second: e.target.value })}
                  placeholder="One sentence explaining who you are and what you do"
                  rows={2}
                />
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <Badge variant="outline" className="mb-2">30-Second Pitch</Badge>
                <Textarea
                  value={localData.pitch_30_second || ''}
                  onChange={(e) => setLocalData({ ...localData, pitch_30_second: e.target.value })}
                  placeholder="3-4 sentences: problem, solution, key differentiator"
                  rows={4}
                />
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <Badge variant="outline" className="mb-2">2-Minute Pitch</Badge>
                <Textarea
                  value={localData.pitch_2_minute || ''}
                  onChange={(e) => setLocalData({ ...localData, pitch_2_minute: e.target.value })}
                  placeholder="Complete pitch: problem, solution, how it works, benefits, proof, CTA"
                  rows={8}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={cancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => saveSection('elevator_pitches', {
                    pitch_10_second: localData.pitch_10_second,
                    pitch_30_second: localData.pitch_30_second,
                    pitch_2_minute: localData.pitch_2_minute
                  })}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-background rounded-lg border">
                <Badge variant="outline" className="mb-2">10-Second Pitch</Badge>
                {displayData.pitch_10_second ? (
                  <p className="text-sm">{displayData.pitch_10_second}</p>
                ) : (
                  <EmptyField label="10-second pitch" />
                )}
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <Badge variant="outline" className="mb-2">30-Second Pitch</Badge>
                {displayData.pitch_30_second ? (
                  <p className="text-sm">{displayData.pitch_30_second}</p>
                ) : (
                  <EmptyField label="30-second pitch" />
                )}
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <Badge variant="outline" className="mb-2">2-Minute Pitch</Badge>
                {displayData.pitch_2_minute ? (
                  <p className="text-sm whitespace-pre-wrap">{displayData.pitch_2_minute}</p>
                ) : (
                  <EmptyField label="2-minute pitch" />
                )}
              </div>
            </div>
          )}
        </CollapsibleSection>
        
        {/* Section 7: Objection Handling */}
        <CollapsibleSection 
          title="Objection Handling" 
          icon={Shield}
          fieldCount={Math.min((displayData.objection_responses?.length || 0) * 2, 6)}
          totalFields={6}
          onEdit={() => setEditingSection('objection_handling')}
          isEditing={editingSection === 'objection_handling'}
        >
          {editingSection === 'objection_handling' ? (
            <div className="space-y-4">
              {(localData.objection_responses || []).map((obj, i) => (
                <div key={i} className="p-4 bg-background rounded-lg border space-y-2">
                  <div className="flex justify-between items-center">
                    <Badge variant="destructive" className="text-xs">Objection {i + 1}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newObjs = (localData.objection_responses || []).filter((_, idx) => idx !== i)
                        setLocalData({ ...localData, objection_responses: newObjs })
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={obj.objection}
                    onChange={(e) => {
                      const newObjs = [...(localData.objection_responses || [])]
                      newObjs[i] = { ...newObjs[i], objection: e.target.value }
                      setLocalData({ ...localData, objection_responses: newObjs })
                    }}
                    placeholder="Common objection buyers have"
                  />
                  <Textarea
                    value={obj.response}
                    onChange={(e) => {
                      const newObjs = [...(localData.objection_responses || [])]
                      newObjs[i] = { ...newObjs[i], response: e.target.value }
                      setLocalData({ ...localData, objection_responses: newObjs })
                    }}
                    placeholder="How to respond to this objection"
                    rows={3}
                  />
                </div>
              ))}
              {(localData.objection_responses?.length || 0) < 3 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const newObjs = [...(localData.objection_responses || []), { objection: '', response: '' }]
                    setLocalData({ ...localData, objection_responses: newObjs })
                  }}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" /> Add Objection
                </Button>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={cancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => saveSection('objection_handling', {
                    objection_responses: localData.objection_responses
                  })}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            displayData.objection_responses && displayData.objection_responses.length > 0 ? (
              <div className="space-y-4">
                {displayData.objection_responses.map((obj, i) => (
                  <div key={i} className="p-4 bg-background rounded-lg border">
                    <div className="mb-3">
                      <Badge variant="destructive" className="text-xs mb-2">Objection {i + 1}</Badge>
                      <p className="font-medium text-sm">&quot;{obj.objection}&quot;</p>
                    </div>
                    <div>
                      <Badge variant="outline" className="text-xs mb-2 bg-emerald-50 text-emerald-700 border-emerald-200">Response</Badge>
                      <p className="text-sm text-muted-foreground">{obj.response}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyField label="Objection Handling" />
            )
          )}
        </CollapsibleSection>
        
        {/* Section 8: Competitive Stance */}
        <CollapsibleSection 
          title="Competitive Stance" 
          icon={Swords}
          fieldCount={
            (displayData.competitive_positioning ? 1 : 0) + 
            (displayData.win_themes?.length ? 1 : 0) + 
            (displayData.competitive_landmines?.length ? 1 : 0)
          }
          totalFields={3}
          onEdit={() => setEditingSection('competitive_stance')}
          isEditing={editingSection === 'competitive_stance'}
        >
          {editingSection === 'competitive_stance' ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Competitive Positioning Statement
                </label>
                <Textarea
                  value={localData.competitive_positioning || ''}
                  onChange={(e) => setLocalData({ ...localData, competitive_positioning: e.target.value })}
                  placeholder="How do you position against competitors?"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Win Themes
                </label>
                <EditableList
                  items={localData.win_themes || []}
                  onChange={(items) => setLocalData({ ...localData, win_themes: items })}
                  placeholder="Key theme that wins deals"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                  Competitive Land Mines
                </label>
                <EditableList
                  items={localData.competitive_landmines || []}
                  onChange={(items) => setLocalData({ ...localData, competitive_landmines: items })}
                  placeholder="Question to ask competitors"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={cancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => saveSection('competitive_stance', {
                    competitive_positioning: localData.competitive_positioning,
                    win_themes: localData.win_themes,
                    competitive_landmines: localData.competitive_landmines
                  })}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <FieldDisplay 
                label="Competitive Positioning Statement" 
                value={displayData.competitive_positioning} 
              />
              <ListDisplay label="Win Themes" items={displayData.win_themes} />
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Competitive Land Mines
                </label>
                {displayData.competitive_landmines && displayData.competitive_landmines.length > 0 ? (
                  <ul className="space-y-1">
                    {displayData.competitive_landmines.map((item, i) => (
                      <li key={i} className="text-sm leading-relaxed flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                        <Eye className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyField label="Competitive Land Mines" />
                )}
              </div>
            </div>
          )}
        </CollapsibleSection>
      </CardContent>
    </Card>
  )
}
