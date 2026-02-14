'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Search, 
  Network, 
  Swords, 
  CheckCircle, 
  Sparkles,
  Zap,
  Save,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { BrandSettings } from '@/lib/feed/types'

interface WorkflowField {
  key: string
  label: string
  type: 'toggle' | 'number' | 'select'
  cost?: string
  min?: number
  max?: number
  options?: string[]
}

interface WorkflowConfig {
  id: string
  name: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  fields: WorkflowField[]
}

const workflowConfigs: WorkflowConfig[] = [
  {
    id: 'core_discovery',
    name: 'Core Discovery',
    description: 'Daily scans to check AI visibility across models',
    icon: Search,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500',
    fields: [
      { key: 'auto_scan_enabled', label: 'Enable daily scans', type: 'toggle', cost: '~0.5 credits/day' },
      { key: 'daily_scan_cap', label: 'Max prompts per scan', type: 'number', min: 10, max: 500 },
    ],
  },
  {
    id: 'network_expansion',
    name: 'Network Expansion',
    description: 'Analyze discovered competitors to find new prompts and gaps',
    icon: Network,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500',
    fields: [
      { key: 'auto_expand_network', label: 'Auto-analyze new competitors', type: 'toggle', cost: '2 credits each' },
      { key: 'max_competitors_to_expand', label: 'Max competitors to analyze', type: 'number', min: 1, max: 10 },
    ],
  },
  {
    id: 'competitive_response',
    name: 'Competitive Response',
    description: 'Monitor competitor content and generate response memos',
    icon: Swords,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
    fields: [
      { key: 'auto_respond_content', label: 'Auto-generate response memos', type: 'toggle', cost: '3 credits each' },
      { key: 'content_response_threshold', label: 'Response threshold', type: 'select', options: ['all', 'high', 'critical'] },
    ],
  },
  {
    id: 'verification',
    name: 'Citation Verification',
    description: 'Verify if published memos get cited by AI models',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    fields: [
      { key: 'auto_verify_citations', label: 'Auto-verify new memos', type: 'toggle', cost: 'Free' },
      { key: 'verification_retry_days', label: 'Retry for (days)', type: 'number', min: 1, max: 14 },
    ],
  },
  {
    id: 'greenspace',
    name: 'Greenspace Discovery',
    description: 'Find new content opportunities not yet covered',
    icon: Sparkles,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500',
    fields: [
      { key: 'weekly_greenspace_enabled', label: 'Enable weekly analysis', type: 'toggle', cost: '2 credits/week' },
    ],
  },
]

export default function V2BrandSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.brandId as string
  
  const [settings, setSettings] = useState<Partial<BrandSettings>>({
    auto_scan_enabled: true,
    daily_scan_cap: 100,
    auto_expand_network: false,
    max_competitors_to_expand: 3,
    auto_respond_content: false,
    content_response_threshold: 'high',
    auto_verify_citations: true,
    verification_retry_days: 3,
    weekly_greenspace_enabled: false,
    auto_memo_enabled: false,
    daily_memo_cap: 2,
    monthly_credit_cap: null,
    alert_at_percent: 80,
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [brand, setBrand] = useState<{ name: string } | null>(null)

  // Load settings
  useEffect(() => {
    async function loadSettings() {
      try {
        // Load brand info
        const brandRes = await fetch(`/api/brands/${brandId}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check_status' }),
        })
        if (brandRes.ok) {
          const brandData = await brandRes.json()
          setBrand({ name: brandData.brandName || 'Brand' })
        }
        
        // TODO: Load settings from brand_settings table
        // For now, use defaults
        
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setLoading(false)
      }
    }
    
    loadSettings()
  }, [brandId])

  const handleToggle = (key: keyof BrandSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleNumberChange = (key: keyof BrandSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // TODO: Save settings to brand_settings table
      await new Promise(r => setTimeout(r, 500)) // Simulated save
      router.push(`/v2/brands/${brandId}`)
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  // Calculate projected usage
  const projectedMonthly = 
    (settings.auto_scan_enabled ? 15 : 0) + // ~0.5/day * 30
    (settings.auto_expand_network ? (settings.max_competitors_to_expand || 3) * 4 : 0) + // 2 each, ~2/week
    (settings.auto_respond_content ? 12 : 0) + // ~3 each, ~4/month
    (settings.weekly_greenspace_enabled ? 8 : 0) // 2/week

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-[#0EA5E9]" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pt-8 pb-16">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href={`/v2/brands/${brandId}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {brand?.name || 'brand'}
        </Link>
        
        <h1 className="text-2xl font-bold text-[#0F172A]">Workflow Settings</h1>
        <p className="text-muted-foreground">
          Control which automations run and set spending limits
        </p>
      </div>

      {/* Projected Usage Card */}
      <Card className="mb-8 border-[#0EA5E9]">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#0EA5E9]" />
              <CardTitle className="text-base">Projected Monthly Usage</CardTitle>
            </div>
            <span className="text-2xl font-bold text-[#0EA5E9]">~{projectedMonthly} credits</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Based on current settings. Actual usage may vary based on activity.
          </p>
        </CardContent>
      </Card>

      {/* Workflow Settings */}
      <div className="space-y-6">
        {workflowConfigs.map((workflow) => {
          const Icon = workflow.icon
          return (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${workflow.bgColor} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{workflow.name}</CardTitle>
                    <CardDescription>{workflow.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {workflow.fields.map((field) => (
                  <div key={field.key} className="flex items-center justify-between">
                    <div>
                      <Label htmlFor={field.key}>{field.label}</Label>
                      {field.cost && (
                        <p className="text-xs text-muted-foreground">{field.cost}</p>
                      )}
                    </div>
                    
                    {field.type === 'toggle' && (
                      <Switch
                        id={field.key}
                        checked={settings[field.key as keyof BrandSettings] as boolean}
                        onCheckedChange={(v) => handleToggle(field.key as keyof BrandSettings, v)}
                      />
                    )}
                    
                    {field.type === 'number' && (
                      <Input
                        id={field.key}
                        type="number"
                        min={field.min}
                        max={field.max}
                        value={settings[field.key as keyof BrandSettings] as number}
                        onChange={(e) => handleNumberChange(field.key as keyof BrandSettings, parseInt(e.target.value))}
                        className="w-24"
                      />
                    )}
                    
                    {field.type === 'select' && (
                      <select
                        id={field.key}
                        value={settings[field.key as keyof BrandSettings] as string}
                        onChange={(e) => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-32 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Separator className="my-8" />

      {/* Global Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spending Limits</CardTitle>
          <CardDescription>Set hard caps to control costs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto_memo_enabled">Auto-generate memos for gaps</Label>
              <p className="text-xs text-muted-foreground">3 credits per memo</p>
            </div>
            <Switch
              id="auto_memo_enabled"
              checked={settings.auto_memo_enabled}
              onCheckedChange={(v) => handleToggle('auto_memo_enabled', v)}
            />
          </div>
          
          {settings.auto_memo_enabled && (
            <div className="flex items-center justify-between pl-4 border-l-2 border-slate-200">
              <Label htmlFor="daily_memo_cap">Max memos per day</Label>
              <Input
                id="daily_memo_cap"
                type="number"
                min={1}
                max={10}
                value={settings.daily_memo_cap}
                onChange={(e) => handleNumberChange('daily_memo_cap', parseInt(e.target.value))}
                className="w-24"
              />
            </div>
          )}
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="alert_at_percent">Alert when usage reaches</Label>
              <p className="text-xs text-muted-foreground">Get notified before hitting limits</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="alert_at_percent"
                type="number"
                min={50}
                max={95}
                value={settings.alert_at_percent}
                onChange={(e) => handleNumberChange('alert_at_percent', parseInt(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3 mt-8">
        <Button variant="outline" asChild>
          <Link href={`/v2/brands/${brandId}`}>Cancel</Link>
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-[#0EA5E9] hover:bg-[#0284C7]"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
