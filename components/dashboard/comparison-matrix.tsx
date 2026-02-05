'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Plus,
  Trophy,
  Minus,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Save,
  Loader2,
  X,
  Edit2,
  Check,
  Target,
  Scale,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  EntityProfile, 
  ComparisonResult, 
  COMPARISON_ATTRIBUTES,
  EntityType,
  ENTITY_TYPE_META,
} from '@/lib/supabase/types'

interface Competitor {
  id: string
  name: string
  domain: string | null
  entity_type?: EntityType | null
}

interface ComparisonMatrixProps {
  brandId: string
  brandName: string
  competitors: Competitor[]
  initialProfiles?: EntityProfile[]
}

type AttributeCategory = 'all' | 'commercial' | 'technical' | 'product' | 'service' | 'strategy'

const CATEGORY_META: Record<AttributeCategory, { label: string; color: string }> = {
  all: { label: 'All', color: '#0F172A' },
  commercial: { label: 'Commercial', color: '#10B981' },
  technical: { label: 'Technical', color: '#3B82F6' },
  product: { label: 'Product', color: '#8B5CF6' },
  service: { label: 'Service', color: '#F59E0B' },
  strategy: { label: 'Strategy', color: '#EC4899' },
}

const RESULT_ICONS: Record<ComparisonResult, { icon: typeof Trophy; color: string; bg: string; label: string }> = {
  win: { icon: Trophy, color: '#10B981', bg: '#ECFDF5', label: 'Win' },
  lose: { icon: Target, color: '#EF4444', bg: '#FEF2F2', label: 'Lose' },
  tie: { icon: Scale, color: '#F59E0B', bg: '#FFFBEB', label: 'Tie' },
  unknown: { icon: HelpCircle, color: '#6B7280', bg: '#F9FAFB', label: 'Unknown' },
  na: { icon: Minus, color: '#9CA3AF', bg: '#F3F4F6', label: 'N/A' },
}

export function ComparisonMatrix({ 
  brandId, 
  brandName,
  competitors,
  initialProfiles = []
}: ComparisonMatrixProps) {
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(
    competitors.filter(c => c.entity_type === 'product_competitor')[0] || competitors[0] || null
  )
  const [profiles, setProfiles] = useState<EntityProfile[]>(initialProfiles)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingAttribute, setEditingAttribute] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<AttributeCategory>('all')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['commercial', 'product']))

  // Load profiles when competitor changes
  useEffect(() => {
    if (selectedCompetitor) {
      loadProfiles(selectedCompetitor.id)
    }
  }, [selectedCompetitor?.id])

  const loadProfiles = async (competitorId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/brands/${brandId}/entity-profiles?competitorId=${competitorId}`)
      if (res.ok) {
        const data = await res.json()
        setProfiles(data.profiles || [])
      }
    } catch (error) {
      console.error('Failed to load profiles:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async (profile: Partial<EntityProfile> & { attribute_name: string }) => {
    if (!selectedCompetitor) return
    
    setSaving(true)
    try {
      const res = await fetch(`/api/brands/${brandId}/entity-profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitor_id: selectedCompetitor.id,
          ...profile,
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        setProfiles(prev => {
          const existing = prev.findIndex(p => p.attribute_name === profile.attribute_name)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = data.profile
            return updated
          }
          return [...prev, data.profile]
        })
        toast.success('Saved')
      }
    } catch (error) {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
      setEditingAttribute(null)
    }
  }

  // Get profile for an attribute
  const getProfile = (attrName: string): EntityProfile | undefined => {
    return profiles.find(p => p.attribute_name === attrName)
  }

  // Calculate win/loss summary
  const summary = profiles.reduce((acc, p) => {
    if (p.comparison_result === 'win') acc.wins++
    if (p.comparison_result === 'lose') acc.losses++
    if (p.comparison_result === 'tie') acc.ties++
    return acc
  }, { wins: 0, losses: 0, ties: 0 })

  const winRate = summary.wins + summary.losses > 0 
    ? Math.round((summary.wins / (summary.wins + summary.losses)) * 100) 
    : 0

  // Filter attributes by category
  const filteredAttributes = COMPARISON_ATTRIBUTES.filter(
    attr => categoryFilter === 'all' || attr.category === categoryFilter
  )

  // Group attributes by category
  const groupedAttributes = filteredAttributes.reduce((acc, attr) => {
    if (!acc[attr.category]) acc[attr.category] = []
    acc[attr.category].push(attr)
    return acc
  }, {} as Record<string, typeof COMPARISON_ATTRIBUTES[number][]>)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  // Only show product competitors in the matrix
  const competitorsList = competitors.filter(c => c.entity_type === 'product_competitor' || !c.entity_type)

  if (competitorsList.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed">
        <Scale className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No competitors to compare</h3>
        <p className="text-muted-foreground">
          Add product competitors to start building your comparison matrix
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Competitor Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Compare Against:</h3>
          <div className="flex items-center gap-2">
            {competitorsList.slice(0, 5).map(competitor => (
              <button
                key={competitor.id}
                onClick={() => setSelectedCompetitor(competitor)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCompetitor?.id === competitor.id
                    ? 'bg-[#0F172A] text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {competitor.name}
              </button>
            ))}
            {competitorsList.length > 5 && (
              <select
                value={selectedCompetitor?.id || ''}
                onChange={(e) => {
                  const c = competitorsList.find(c => c.id === e.target.value)
                  if (c) setSelectedCompetitor(c)
                }}
                className="px-3 py-2 rounded-lg border bg-white text-sm"
              >
                <option value="">More...</option>
                {competitorsList.slice(5).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Win Rate Summary */}
        {profiles.length > 0 && (
          <div className="flex items-center gap-6 bg-white border rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Trophy className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Wins</p>
                <p className="font-bold text-emerald-600">{summary.wins}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <Target className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Losses</p>
                <p className="font-bold text-red-600">{summary.losses}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Scale className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ties</p>
                <p className="font-bold text-amber-600">{summary.ties}</p>
              </div>
            </div>
            <div className="border-l pl-4">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className={`font-bold text-lg ${winRate >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                {winRate}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key as AttributeCategory)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              categoryFilter === key
                ? 'text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            style={{
              backgroundColor: categoryFilter === key ? meta.color : undefined,
            }}
          >
            {meta.label}
          </button>
        ))}
      </div>

      {/* Comparison Matrix */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading comparison data...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedAttributes).map(([category, attrs]) => (
            <div key={category} className="border rounded-lg overflow-hidden">
              {/* Category Header */}
              <button
                onClick={() => toggleSection(category)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedSections.has(category) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span 
                    className="font-semibold"
                    style={{ color: CATEGORY_META[category as AttributeCategory]?.color }}
                  >
                    {CATEGORY_META[category as AttributeCategory]?.label || category}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {attrs.length} attributes
                  </Badge>
                </div>
              </button>

              {/* Attributes Grid */}
              {expandedSections.has(category) && (
                <div className="divide-y">
                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-slate-50 text-sm font-medium text-muted-foreground">
                    <div className="col-span-3">Attribute</div>
                    <div className="col-span-3 text-center">{brandName} (You)</div>
                    <div className="col-span-1 text-center">Result</div>
                    <div className="col-span-3 text-center">{selectedCompetitor?.name || 'Competitor'}</div>
                    <div className="col-span-2 text-center">Actions</div>
                  </div>

                  {/* Attribute Rows */}
                  {attrs.map(attr => {
                    const profile = getProfile(attr.name)
                    const isEditing = editingAttribute === attr.name

                    return (
                      <AttributeRow
                        key={attr.name}
                        attribute={attr}
                        profile={profile}
                        isEditing={isEditing}
                        saving={saving}
                        onEdit={() => setEditingAttribute(attr.name)}
                        onCancel={() => setEditingAttribute(null)}
                        onSave={(data) => saveProfile({ attribute_name: attr.name, ...data })}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Auto-Fill Suggestion */}
      {selectedCompetitor && profiles.length < 5 && (
        <div className="bg-linear-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-purple-900">Auto-fill with AI</p>
              <p className="text-sm text-purple-700">
                Let AI analyze both websites and populate the comparison matrix
              </p>
            </div>
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Sparkles className="h-4 w-4 mr-2" />
            Auto-Fill Comparison
          </Button>
        </div>
      )}
    </div>
  )
}

function AttributeRow({
  attribute,
  profile,
  isEditing,
  saving,
  onEdit,
  onCancel,
  onSave,
}: {
  attribute: typeof COMPARISON_ATTRIBUTES[number]
  profile?: EntityProfile
  isEditing: boolean
  saving: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (data: Partial<EntityProfile>) => void
}) {
  const [brandValue, setBrandValue] = useState(profile?.brand_value || '')
  const [competitorValue, setCompetitorValue] = useState(profile?.competitor_value || '')
  const [result, setResult] = useState<ComparisonResult>(profile?.comparison_result || 'unknown')

  // Reset form when profile changes
  useEffect(() => {
    setBrandValue(profile?.brand_value || '')
    setCompetitorValue(profile?.competitor_value || '')
    setResult(profile?.comparison_result || 'unknown')
  }, [profile])

  const resultMeta = RESULT_ICONS[result]
  const ResultIcon = resultMeta.icon

  if (isEditing) {
    return (
      <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-blue-50">
        <div className="col-span-3 flex items-center">
          <span className="font-medium text-sm">{attribute.label}</span>
        </div>
        <div className="col-span-3">
          <input
            type="text"
            value={brandValue}
            onChange={(e) => setBrandValue(e.target.value)}
            placeholder="Your value..."
            className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="col-span-1 flex justify-center">
          <select
            value={result}
            onChange={(e) => setResult(e.target.value as ComparisonResult)}
            className="px-2 py-1 text-sm border rounded"
          >
            <option value="win">Win</option>
            <option value="lose">Lose</option>
            <option value="tie">Tie</option>
            <option value="unknown">?</option>
            <option value="na">N/A</option>
          </select>
        </div>
        <div className="col-span-3">
          <input
            type="text"
            value={competitorValue}
            onChange={(e) => setCompetitorValue(e.target.value)}
            placeholder="Competitor value..."
            className="w-full px-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="col-span-2 flex items-center justify-center gap-2">
          <Button
            size="sm"
            onClick={() => onSave({ brand_value: brandValue, competitor_value: competitorValue, comparison_result: result })}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
      <div className="col-span-3 flex items-center">
        <span className="text-sm">{attribute.label}</span>
      </div>
      <div className="col-span-3 text-center">
        {profile?.brand_value ? (
          <span className="text-sm font-medium text-[#0F172A]">{profile.brand_value}</span>
        ) : (
          <span className="text-sm text-muted-foreground italic">Not set</span>
        )}
      </div>
      <div className="col-span-1 flex justify-center">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: resultMeta.bg }}
        >
          <ResultIcon className="h-4 w-4" style={{ color: resultMeta.color }} />
        </div>
      </div>
      <div className="col-span-3 text-center">
        {profile?.competitor_value ? (
          <span className="text-sm font-medium text-slate-700">{profile.competitor_value}</span>
        ) : (
          <span className="text-sm text-muted-foreground italic">Not set</span>
        )}
      </div>
      <div className="col-span-2 flex items-center justify-center">
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Edit2 className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </div>
    </div>
  )
}
