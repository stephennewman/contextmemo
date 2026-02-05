'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  FileText
} from 'lucide-react'
import { CorporatePositioning as CorporatePositioningType } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface CorporatePositioningSectionProps {
  positioning: CorporatePositioningType | undefined
  brandName: string
}

// Calculate field completion
function calculateFieldCount(positioning: CorporatePositioningType | undefined): { filled: number; total: number } {
  if (!positioning) return { filled: 0, total: 32 }
  
  let filled = 0
  const total = 32
  
  // Section 1: Mission & Vision (2 fields)
  if (positioning.mission_statement) filled++
  if (positioning.vision_statement) filled++
  
  // Section 2: Target Markets (3 fields)
  if (positioning.primary_verticals?.length) filled++
  if (positioning.buyer_personas?.length) filled++
  if (positioning.user_personas?.length) filled++
  
  // Section 3: Value Proposition (3 fields)
  if (positioning.core_value_promise) filled++
  if (positioning.key_benefits?.length) filled++
  if (positioning.proof_points?.length) filled++
  
  // Section 4: Key Differentiators (6 fields - 3 pairs)
  const diffCount = positioning.differentiators?.length || 0
  filled += Math.min(diffCount * 2, 6) // name + detail for each
  
  // Section 5: Messaging Pillars (6 fields - 3 pairs)
  const pillarCount = positioning.messaging_pillars?.length || 0
  filled += Math.min(pillarCount * 2, 6) // name + supporting_points for each
  
  // Section 6: Elevator Pitches (3 fields)
  if (positioning.pitch_10_second) filled++
  if (positioning.pitch_30_second) filled++
  if (positioning.pitch_2_minute) filled++
  
  // Section 7: Objection Handling (6 fields - 3 pairs)
  const objectionCount = positioning.objection_responses?.length || 0
  filled += Math.min(objectionCount * 2, 6) // objection + response for each
  
  // Section 8: Competitive Stance (3 fields)
  if (positioning.competitive_positioning) filled++
  if (positioning.win_themes?.length) filled++
  if (positioning.competitive_landmines?.length) filled++
  
  return { filled, total }
}

// Collapsible section component
function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = false,
  fieldCount,
  totalFields
}: { 
  title: string
  icon: React.ElementType
  children: React.ReactNode
  defaultOpen?: boolean
  fieldCount: number
  totalFields: number
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const isComplete = fieldCount === totalFields
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors",
          isOpen && "border-b"
        )}
      >
        <div className="flex items-center gap-3">
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
        </div>
        <div className="flex items-center gap-3">
          <Badge 
            variant={isComplete ? "default" : "secondary"} 
            className={cn(
              "text-xs",
              isComplete && "bg-emerald-600"
            )}
          >
            {fieldCount}/{totalFields}
          </Badge>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>
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

export function CorporatePositioningSection({ positioning, brandName }: CorporatePositioningSectionProps) {
  const { filled, total } = calculateFieldCount(positioning)
  const completionPercent = Math.round((filled / total) * 100)
  
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
        {/* Progress bar */}
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
          fieldCount={(positioning.mission_statement ? 1 : 0) + (positioning.vision_statement ? 1 : 0)}
          totalFields={2}
          defaultOpen={true}
        >
          <div className="space-y-4">
            <FieldDisplay label="Mission Statement" value={positioning.mission_statement} />
            <FieldDisplay label="Vision Statement" value={positioning.vision_statement} />
          </div>
        </CollapsibleSection>
        
        {/* Section 2: Target Markets */}
        <CollapsibleSection 
          title="Target Markets" 
          icon={Users}
          fieldCount={
            (positioning.primary_verticals?.length ? 1 : 0) + 
            (positioning.buyer_personas?.length ? 1 : 0) + 
            (positioning.user_personas?.length ? 1 : 0)
          }
          totalFields={3}
        >
          <div className="space-y-4">
            <ListDisplay label="Primary Verticals" items={positioning.primary_verticals} />
            <ListDisplay label="Buyer Personas" items={positioning.buyer_personas} />
            <ListDisplay label="User Personas" items={positioning.user_personas} />
          </div>
        </CollapsibleSection>
        
        {/* Section 3: Value Proposition */}
        <CollapsibleSection 
          title="Value Proposition" 
          icon={Sparkles}
          fieldCount={
            (positioning.core_value_promise ? 1 : 0) + 
            (positioning.key_benefits?.length ? 1 : 0) + 
            (positioning.proof_points?.length ? 1 : 0)
          }
          totalFields={3}
        >
          <div className="space-y-4">
            <FieldDisplay label="Core Value Promise" value={positioning.core_value_promise} />
            <ListDisplay label="Key Benefits" items={positioning.key_benefits} />
            <ListDisplay label="Proof Points" items={positioning.proof_points} />
          </div>
        </CollapsibleSection>
        
        {/* Section 4: Key Differentiators */}
        <CollapsibleSection 
          title="Key Differentiators" 
          icon={Shield}
          fieldCount={Math.min((positioning.differentiators?.length || 0) * 2, 6)}
          totalFields={6}
        >
          {positioning.differentiators && positioning.differentiators.length > 0 ? (
            <div className="space-y-4">
              {positioning.differentiators.map((diff, i) => (
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
          )}
        </CollapsibleSection>
        
        {/* Section 5: Messaging Pillars */}
        <CollapsibleSection 
          title="Messaging Pillars" 
          icon={MessageSquare}
          fieldCount={Math.min((positioning.messaging_pillars?.length || 0) * 2, 6)}
          totalFields={6}
        >
          {positioning.messaging_pillars && positioning.messaging_pillars.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {positioning.messaging_pillars.map((pillar, i) => (
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
          )}
        </CollapsibleSection>
        
        {/* Section 6: Elevator Pitches */}
        <CollapsibleSection 
          title="Elevator Pitches" 
          icon={Mic}
          fieldCount={
            (positioning.pitch_10_second ? 1 : 0) + 
            (positioning.pitch_30_second ? 1 : 0) + 
            (positioning.pitch_2_minute ? 1 : 0)
          }
          totalFields={3}
        >
          <div className="space-y-4">
            <div className="p-4 bg-background rounded-lg border">
              <Badge variant="outline" className="mb-2">10-Second Pitch</Badge>
              {positioning.pitch_10_second ? (
                <p className="text-sm">{positioning.pitch_10_second}</p>
              ) : (
                <EmptyField label="10-second pitch" />
              )}
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <Badge variant="outline" className="mb-2">30-Second Pitch</Badge>
              {positioning.pitch_30_second ? (
                <p className="text-sm">{positioning.pitch_30_second}</p>
              ) : (
                <EmptyField label="30-second pitch" />
              )}
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <Badge variant="outline" className="mb-2">2-Minute Pitch</Badge>
              {positioning.pitch_2_minute ? (
                <p className="text-sm whitespace-pre-wrap">{positioning.pitch_2_minute}</p>
              ) : (
                <EmptyField label="2-minute pitch" />
              )}
            </div>
          </div>
        </CollapsibleSection>
        
        {/* Section 7: Objection Handling */}
        <CollapsibleSection 
          title="Objection Handling" 
          icon={Shield}
          fieldCount={Math.min((positioning.objection_responses?.length || 0) * 2, 6)}
          totalFields={6}
        >
          {positioning.objection_responses && positioning.objection_responses.length > 0 ? (
            <div className="space-y-4">
              {positioning.objection_responses.map((obj, i) => (
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
          )}
        </CollapsibleSection>
        
        {/* Section 8: Competitive Stance */}
        <CollapsibleSection 
          title="Competitive Stance" 
          icon={Swords}
          fieldCount={
            (positioning.competitive_positioning ? 1 : 0) + 
            (positioning.win_themes?.length ? 1 : 0) + 
            (positioning.competitive_landmines?.length ? 1 : 0)
          }
          totalFields={3}
        >
          <div className="space-y-4">
            <FieldDisplay 
              label="Competitive Positioning Statement" 
              value={positioning.competitive_positioning} 
            />
            <ListDisplay label="Win Themes" items={positioning.win_themes} />
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Competitive Land Mines
              </label>
              {positioning.competitive_landmines && positioning.competitive_landmines.length > 0 ? (
                <ul className="space-y-1">
                  {positioning.competitive_landmines.map((item, i) => (
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
        </CollapsibleSection>
      </CardContent>
    </Card>
  )
}
