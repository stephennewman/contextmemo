'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { 
  Loader2, Save, Trash2, ExternalLink, CheckCircle2, Link2,
  Settings, Building2, MessageSquare, FileText, Users, Target,
  Plug, AlertTriangle, ChevronRight, Plus, X, Sparkles, RefreshCw,
  Crown, User, Mic
} from 'lucide-react'
import { toast } from 'sonner'
import { BrandContext, BrandTone, HubSpotConfig, SearchConsoleConfig, TargetPersona, PersonaSeniority, PromptTheme } from '@/lib/supabase/types'
import { VoiceInsightsSection } from '@/components/voice-insights-section'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'

interface Brand {
  id: string
  name: string
  domain: string
  subdomain: string
  verified: boolean
  auto_publish: boolean
  context: BrandContext
}

// Navigation sections
const NAV_SECTIONS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'brand-context', label: 'Brand Context', icon: Building2 },
  { id: 'expert-insights', label: 'Expert Insights', icon: Mic, highlight: true },
  { id: 'brand-voice', label: 'Brand Voice', icon: MessageSquare },
  { id: 'content', label: 'Content Settings', icon: FileText },
  { id: 'personas', label: 'Target Personas', icon: Users },
  { id: 'themes', label: 'Prompt Themes', icon: Target },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
]

// Default brand tone values
const defaultBrandTone: BrandTone = {
  personality: 'trustworthy' as const,
  formality: 'professional' as const,
  technical_level: 'intermediate' as const,
  audience_type: 'enterprise_buyers' as const,
  writing_style: 'concise' as const,
  jargon_usage: 'moderate' as const,
  custom_notes: '',
}

// Default HubSpot config
const defaultHubSpotConfig: HubSpotConfig = {
  enabled: false,
  access_token: '',
  blog_id: '',
  auto_sync: false,
}

// Default Search Console config
const defaultSearchConsoleConfig: SearchConsoleConfig = {
  bing: {
    enabled: false,
    api_key: '',
    site_url: '',
  },
}

// Seniority icons and colors
const SENIORITY_ICONS: Record<PersonaSeniority, React.ReactNode> = {
  executive: <Crown className="h-3 w-3" />,
  manager: <Users className="h-3 w-3" />,
  specialist: <User className="h-3 w-3" />,
}

const SENIORITY_COLORS: Record<PersonaSeniority, string> = {
  executive: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  manager: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  specialist: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
}

export default function BrandSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const brandId = params.brandId as string
  
  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeSection, setActiveSection] = useState('general')
  
  // Section refs for scroll-to behavior
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  
  // Form state
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [description, setDescription] = useState('')
  const [products, setProducts] = useState('')
  const [markets, setMarkets] = useState('')
  const [features, setFeatures] = useState('')
  const [certifications, setCertifications] = useState('')
  const [customers, setCustomers] = useState('')
  const [founded, setFounded] = useState('')
  const [headquarters, setHeadquarters] = useState('')
  const [autoPublish, setAutoPublish] = useState(true)
  
  // Brand tone state
  const [brandTone, setBrandTone] = useState<BrandTone>(defaultBrandTone)
  
  // HubSpot integration state
  const [hubspotConfig, setHubspotConfig] = useState<HubSpotConfig>(defaultHubSpotConfig)
  const [hubspotBlogs, setHubspotBlogs] = useState<{ id: string; name: string; url?: string }[]>([])
  const [hubspotConnected, setHubspotConnected] = useState(false)
  const [hubspotHealthy, setHubspotHealthy] = useState(false)
  const [hubspotDisconnecting, setHubspotDisconnecting] = useState(false)
  const [hubspotResyncing, setHubspotResyncing] = useState(false)
  
  // Search Console integration state
  const [searchConsoleConfig, setSearchConsoleConfig] = useState<SearchConsoleConfig>(defaultSearchConsoleConfig)

  // Personas state
  const [personas, setPersonas] = useState<TargetPersona[]>([])
  const [disabledPersonas, setDisabledPersonas] = useState<string[]>([])
  const [personaLoading, setPersonaLoading] = useState<string | null>(null)
  const [addPersonaOpen, setAddPersonaOpen] = useState(false)
  const [newPersona, setNewPersona] = useState({
    title: '',
    seniority: 'manager' as PersonaSeniority,
    function: '',
    description: '',
    phrasing_style: '',
    priorities: ''
  })

  // Prompt themes state
  const [themes, setThemes] = useState<PromptTheme[]>([])
  const [newTheme, setNewTheme] = useState('')
  const [isAddingTheme, setIsAddingTheme] = useState(false)

  // Initial state for dirty tracking
  const initialState = useRef<{
    name: string
    companyName: string
    description: string
    products: string
    markets: string
    features: string
    certifications: string
    customers: string
    founded: string
    headquarters: string
    autoPublish: boolean
    brandTone: BrandTone
    hubspotConfig: HubSpotConfig
    searchConsoleConfig: SearchConsoleConfig
  } | null>(null)

  // Check if form has unsaved changes
  const isDirty = useMemo(() => {
    if (!initialState.current) return false
    
    return (
      name !== initialState.current.name ||
      companyName !== initialState.current.companyName ||
      description !== initialState.current.description ||
      products !== initialState.current.products ||
      markets !== initialState.current.markets ||
      features !== initialState.current.features ||
      certifications !== initialState.current.certifications ||
      customers !== initialState.current.customers ||
      founded !== initialState.current.founded ||
      headquarters !== initialState.current.headquarters ||
      autoPublish !== initialState.current.autoPublish ||
      JSON.stringify(brandTone) !== JSON.stringify(initialState.current.brandTone) ||
      JSON.stringify(hubspotConfig) !== JSON.stringify(initialState.current.hubspotConfig) ||
      JSON.stringify(searchConsoleConfig) !== JSON.stringify(initialState.current.searchConsoleConfig)
    )
  }, [name, companyName, description, products, markets, features, certifications, customers, founded, headquarters, autoPublish, brandTone, hubspotConfig, searchConsoleConfig])

  useEffect(() => {
    const loadBrand = async () => {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (error || !data) {
        router.push('/dashboard')
        return
      }

      setBrand(data)
      setName(data.name)
      setAutoPublish(data.auto_publish)
      
      const context = data.context as BrandContext
      if (context) {
        setCompanyName(context.company_name || '')
        setDescription(context.description || '')
        setProducts((context.products || []).join(', '))
        setMarkets((context.markets || []).join(', '))
        setFeatures((context.features || []).join(', '))
        setCertifications((context.certifications || []).join(', '))
        setCustomers((context.customers || []).join(', '))
        setFounded(context.founded || '')
        setHeadquarters(context.headquarters || '')
        setBrandTone({ ...defaultBrandTone, ...context.brand_tone })
        setHubspotConfig({ ...defaultHubSpotConfig, ...context.hubspot })
        setPersonas(context.personas || [])
        setDisabledPersonas(context.disabled_personas || [])
        setThemes(context.prompt_themes || [])
        
        if (context.hubspot?.enabled && context.hubspot?.access_token) {
          setHubspotConnected(true)
          if (context.hubspot?.available_blogs) {
            setHubspotBlogs(context.hubspot.available_blogs)
          }
        }
        
        const loadedSearchConsoleConfig = {
          ...defaultSearchConsoleConfig,
          bing: { ...defaultSearchConsoleConfig.bing, ...context.search_console?.bing },
        }
        setSearchConsoleConfig(loadedSearchConsoleConfig)

        // Store initial state for dirty tracking
        initialState.current = {
          name: data.name,
          companyName: context.company_name || '',
          description: context.description || '',
          products: (context.products || []).join(', '),
          markets: (context.markets || []).join(', '),
          features: (context.features || []).join(', '),
          certifications: (context.certifications || []).join(', '),
          customers: (context.customers || []).join(', '),
          founded: context.founded || '',
          headquarters: context.headquarters || '',
          autoPublish: data.auto_publish,
          brandTone: { ...defaultBrandTone, ...context.brand_tone },
          hubspotConfig: { ...defaultHubSpotConfig, ...context.hubspot },
          searchConsoleConfig: loadedSearchConsoleConfig,
        }
      }
      
      setLoading(false)
    }

    loadBrand()
  }, [brandId, router])

  // Check HubSpot connection health
  useEffect(() => {
    let cancelled = false
    
    const checkHubSpotStatus = async () => {
      if (!brandId || !hubspotConnected) return
      
      try {
        const response = await fetch(`/api/auth/hubspot/status?brandId=${brandId}`)
        if (cancelled) return
        const data = await response.json()
        
        if (data.healthy) {
          setHubspotHealthy(true)
        } else {
          setHubspotHealthy(false)
          if (data.error?.includes('Not connected') || !data.connected) {
            setHubspotConnected(false)
          }
        }
      } catch {
        if (cancelled) return
        setHubspotHealthy(false)
      }
    }

    checkHubSpotStatus()
    return () => { cancelled = true }
  }, [brandId, hubspotConnected])

  // Handle URL params for OAuth success/error
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get('success')
    const error = urlParams.get('error')
    const message = urlParams.get('message')

    if (success === 'hubspot_connected') {
      toast.success('HubSpot connected successfully!')
      setHubspotConnected(true)
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (error) {
      toast.error(message || `Connection failed: ${error}`)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Scroll spy to update active section
  useEffect(() => {
    const container = contentRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { root: container, rootMargin: '-10% 0px -80% 0px' }
    )

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref)
    })

    return () => observer.disconnect()
  }, [loading])

  // Reference for the scrollable content area
  const contentRef = useRef<HTMLDivElement>(null)

  const scrollToSection = (sectionId: string) => {
    const section = sectionRefs.current[sectionId]
    const container = contentRef.current
    if (section && container) {
      const offsetTop = section.offsetTop - container.offsetTop
      container.scrollTo({ top: offsetTop, behavior: 'smooth' })
    }
  }

  const handleHubSpotConnect = () => {
    window.location.href = `/api/auth/hubspot/authorize?brandId=${brandId}`
  }

  const handleHubSpotDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect HubSpot?')) return

    setHubspotDisconnecting(true)
    try {
      const response = await fetch('/api/auth/hubspot/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandId }),
      })

      if (response.ok) {
        toast.success('HubSpot disconnected')
        setHubspotConnected(false)
        setHubspotHealthy(false)
        setHubspotConfig({ ...defaultHubSpotConfig })
        setHubspotBlogs([])
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to disconnect')
      }
    } catch {
      toast.error('Failed to disconnect HubSpot')
    } finally {
      setHubspotDisconnecting(false)
    }
  }

  const handleHubSpotResync = async () => {
    if (!window.confirm('This will resync all memos to HubSpot with updated images and author. Continue?')) return

    setHubspotResyncing(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hubspot-resync-all' }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message || `Resynced ${data.updated} posts to HubSpot`)
      } else {
        toast.error(data.error || 'Resync failed')
      }
    } catch {
      toast.error('Failed to resync to HubSpot')
    } finally {
      setHubspotResyncing(false)
    }
  }

  const handleSave = async () => {
    if (!brand) return
    
    setSaving(true)
    const supabase = createClient()

    const updatedContext: BrandContext = {
      ...brand.context,
      company_name: companyName || undefined,
      description: description || undefined,
      products: products.split(',').map(p => p.trim()).filter(Boolean),
      markets: markets.split(',').map(m => m.trim()).filter(Boolean),
      features: features.split(',').map(f => f.trim()).filter(Boolean),
      certifications: certifications.split(',').map(c => c.trim()).filter(Boolean),
      customers: customers.split(',').map(c => c.trim()).filter(Boolean),
      founded: founded || undefined,
      headquarters: headquarters || undefined,
      brand_tone: brandTone,
      hubspot: hubspotConfig,
      search_console: searchConsoleConfig,
      personas,
      disabled_personas: disabledPersonas,
      prompt_themes: themes,
    }

    const { error } = await supabase
      .from('brands')
      .update({
        name,
        auto_publish: autoPublish,
        context: updatedContext,
        context_edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', brand.id)

    setSaving(false)

    if (error) {
      toast.error('Failed to save settings')
    } else {
      // Update initial state to reflect saved values
      initialState.current = {
        name,
        companyName,
        description,
        products,
        markets,
        features,
        certifications,
        customers,
        founded,
        headquarters,
        autoPublish,
        brandTone,
        hubspotConfig,
        searchConsoleConfig,
      }
      toast.success('Settings saved')
    }
  }

  const handleDelete = async () => {
    if (!brand) return
    
    if (!window.confirm('Are you sure you want to delete this brand? This action cannot be undone.')) return

    setDeleting(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', brand.id)

    if (error) {
      toast.error('Failed to delete brand')
      setDeleting(false)
    } else {
      toast.success('Brand deleted')
      router.push('/dashboard')
    }
  }

  // Persona handlers
  const togglePersona = async (personaId: string, currentlyEnabled: boolean) => {
    setPersonaLoading(personaId)
    try {
      const response = await fetch(`/api/brands/${brandId}/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_persona', personaId, enabled: !currentlyEnabled }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      
      if (currentlyEnabled) {
        setDisabledPersonas([...disabledPersonas, personaId])
      } else {
        setDisabledPersonas(disabledPersonas.filter(id => id !== personaId))
      }
      toast.success(data.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to toggle persona')
    } finally {
      setPersonaLoading(null)
    }
  }

  const regeneratePersonas = async () => {
    setPersonaLoading('regenerate')
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
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate')
    } finally {
      setPersonaLoading(null)
    }
  }

  const addPersona = async () => {
    if (!newPersona.title || !newPersona.function || !newPersona.description) {
      toast.error('Title, function, and description are required')
      return
    }
    setPersonaLoading('add')
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
      setAddPersonaOpen(false)
      setNewPersona({ title: '', seniority: 'manager', function: '', description: '', phrasing_style: '', priorities: '' })
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add persona')
    } finally {
      setPersonaLoading(null)
    }
  }

  const removePersona = async (personaId: string) => {
    setPersonaLoading(`remove-${personaId}`)
    try {
      const response = await fetch(`/api/brands/${brandId}/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_persona', personaId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setPersonas(personas.filter(p => p.id !== personaId))
      toast.success(data.message)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove persona')
    } finally {
      setPersonaLoading(null)
    }
  }

  // Theme handlers
  const addTheme = async () => {
    if (!newTheme.trim()) return
    if (themes.some(t => t.theme.toLowerCase() === newTheme.toLowerCase().trim())) {
      toast.error('This theme already exists')
      return
    }

    const theme: PromptTheme = { theme: newTheme.trim(), priority: 'high', auto_detected: false }
    const updatedThemes = [...themes, theme]
    setThemes(updatedThemes)
    setNewTheme('')
    setIsAddingTheme(false)
    
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_themes', themes: updatedThemes }),
      })
      if (!response.ok) throw new Error('Failed to save')
      toast.success('Theme added')
    } catch {
      toast.error('Failed to save theme')
      setThemes(themes)
    }
  }

  const removeTheme = async (themeToRemove: string) => {
    const updatedThemes = themes.filter(t => t.theme !== themeToRemove)
    setThemes(updatedThemes)
    
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_themes', themes: updatedThemes }),
      })
      if (!response.ok) throw new Error('Failed to save')
      toast.success('Theme removed')
    } catch {
      toast.error('Failed to remove theme')
      setThemes(themes)
    }
  }

  const toggleThemePriority = async (themeText: string) => {
    const updatedThemes = themes.map(t => {
      if (t.theme === themeText) {
        const newPriority = t.priority === 'high' ? 'medium' : t.priority === 'medium' ? 'low' : 'high'
        return { ...t, priority: newPriority }
      }
      return t
    })
    setThemes(updatedThemes as PromptTheme[])
    
    try {
      await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_themes', themes: updatedThemes }),
      })
    } catch {
      // Silent fail
    }
  }

  if (loading) {
    return (
      <div className="flex gap-8 max-w-6xl mx-auto">
        <div className="w-56 shrink-0">
          <div className="space-y-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-10 bg-slate-100 animate-pulse rounded" />
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-6 space-y-4">
              <div className="h-6 w-32 bg-slate-200 animate-pulse rounded" />
              <div className="h-10 bg-slate-100 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!brand) return null

  const personasWithState = personas.map(p => ({ ...p, isEnabled: !disabledPersonas.includes(p.id) }))
  const sortedPersonas = [...personasWithState].sort((a, b) => {
    const order = { executive: 0, manager: 1, specialist: 2 }
    return order[a.seniority] - order[b.seniority] || a.function.localeCompare(b.function)
  })

  return (
    <div className="flex gap-8 max-w-6xl mx-auto h-[calc(100vh-6rem)]">
      {/* Side Navigation - stays in place */}
      <nav className="w-56 shrink-0 hidden md:block">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold mb-4">Settings</h2>
{NAV_SECTIONS.map((section) => {
                            const Icon = section.icon
                            const isActive = activeSection === section.id
                            const isHighlight = 'highlight' in section && section.highlight
                            return (
                              <button
                                key={section.id}
                                onClick={() => scrollToSection(section.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                                  isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : isHighlight
                                    ? 'hover:bg-purple-100 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-400 hover:text-purple-800'
                                    : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                } ${section.id === 'danger' ? 'text-destructive hover:text-destructive' : ''}`}
                              >
                                <Icon className={`h-4 w-4 ${isHighlight && !isActive ? 'text-purple-600' : ''}`} />
                                {section.label}
                                {isHighlight && !isActive && <Sparkles className="h-3 w-3 ml-auto text-purple-500" />}
                                {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                              </button>
                            )
                          })}
          
          <Separator className="my-4" />
          
          <Button 
            onClick={handleSave} 
            disabled={saving || !isDirty} 
            variant={isDirty ? "default" : "outline"}
            className={`w-full ${!isDirty ? 'text-muted-foreground' : ''}`}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {isDirty ? 'Save Changes' : 'No Changes'}
          </Button>
        </div>
      </nav>

      {/* Main Content - scrolls independently */}
      <div ref={contentRef} className="flex-1 overflow-y-auto space-y-8 pb-20 pr-4">
        <div>
          <h1 className="text-2xl font-bold">Brand Settings</h1>
          <p className="text-muted-foreground">Manage settings for {brand.name}</p>
        </div>

        {/* General Section */}
        <section id="general" ref={(el) => { sectionRefs.current['general'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General
              </CardTitle>
              <CardDescription>Basic brand information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Brand Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <Input value={brand.domain} disabled />
                  <p className="text-xs text-muted-foreground">Cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label>Subdomain</Label>
                  <Input value={`${brand.subdomain}.contextmemo.com`} disabled />
                  <p className="text-xs text-muted-foreground">Cannot be changed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Brand Context Section */}
        <section id="brand-context" ref={(el) => { sectionRefs.current['brand-context'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Brand Context
              </CardTitle>
              <CardDescription>Company information used by AI for content generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="founded">Founded</Label>
                  <Input id="founded" value={founded} onChange={(e) => setFounded(e.target.value)} placeholder="2020" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="headquarters">Headquarters</Label>
                <Input id="headquarters" value={headquarters} onChange={(e) => setHeadquarters(e.target.value)} placeholder="San Francisco, CA" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Brief description of what your company does" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="products">Products & Services</Label>
                <Input id="products" value={products} onChange={(e) => setProducts(e.target.value)} placeholder="Product 1, Product 2, Product 3" />
                <p className="text-xs text-muted-foreground">Comma-separated list</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="features">Key Features</Label>
                <Input id="features" value={features} onChange={(e) => setFeatures(e.target.value)} placeholder="AI-powered, Real-time analytics, SOC2 compliant" />
                <p className="text-xs text-muted-foreground">Comma-separated list</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="markets">Target Markets</Label>
                <Input id="markets" value={markets} onChange={(e) => setMarkets(e.target.value)} placeholder="Enterprise SaaS, Healthcare, Financial Services" />
                <p className="text-xs text-muted-foreground">Comma-separated list</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customers">Notable Customers</Label>
                <Input id="customers" value={customers} onChange={(e) => setCustomers(e.target.value)} placeholder="Company A, Company B" />
                <p className="text-xs text-muted-foreground">Comma-separated list</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="certifications">Certifications & Awards</Label>
                <Input id="certifications" value={certifications} onChange={(e) => setCertifications(e.target.value)} placeholder="SOC2, ISO 27001, G2 Leader 2025" />
                <p className="text-xs text-muted-foreground">Comma-separated list</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Expert Insights Section */}
        <section id="expert-insights" ref={(el) => { sectionRefs.current['expert-insights'] = el }} className="scroll-mt-24">
          <VoiceInsightsSection brandId={brandId} />
        </section>

        {/* Brand Voice Section */}
        <section id="brand-voice" ref={(el) => { sectionRefs.current['brand-voice'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Brand Voice
              </CardTitle>
              <CardDescription>Configure how your brand communicates in generated content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="personality">Personality</Label>
                  <select
                    id="personality"
                    value={brandTone.personality || 'trustworthy'}
                    onChange={(e) => setBrandTone({ ...brandTone, personality: e.target.value as BrandTone['personality'] })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="friendly">Friendly - Warm and approachable</option>
                    <option value="authoritative">Authoritative - Expert and confident</option>
                    <option value="innovative">Innovative - Forward-thinking</option>
                    <option value="approachable">Approachable - Relatable</option>
                    <option value="bold">Bold - Direct and impactful</option>
                    <option value="trustworthy">Trustworthy - Reliable</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="formality">Formality</Label>
                  <select
                    id="formality"
                    value={brandTone.formality || 'professional'}
                    onChange={(e) => setBrandTone({ ...brandTone, formality: e.target.value as BrandTone['formality'] })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="formal">Formal - Corporate</option>
                    <option value="professional">Professional - Business</option>
                    <option value="conversational">Conversational - Natural</option>
                    <option value="casual">Casual - Relaxed</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="technical_level">Technical Level</Label>
                  <select
                    id="technical_level"
                    value={brandTone.technical_level || 'intermediate'}
                    onChange={(e) => setBrandTone({ ...brandTone, technical_level: e.target.value as BrandTone['technical_level'] })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="beginner">Beginner - Simple explanations</option>
                    <option value="intermediate">Intermediate - Some assumed knowledge</option>
                    <option value="expert">Expert - Technical depth OK</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audience_type">Audience Type</Label>
                  <select
                    id="audience_type"
                    value={brandTone.audience_type || 'enterprise_buyers'}
                    onChange={(e) => setBrandTone({ ...brandTone, audience_type: e.target.value as BrandTone['audience_type'] })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="enterprise_buyers">Enterprise Buyers</option>
                    <option value="developers">Developers</option>
                    <option value="small_business">Small Business</option>
                    <option value="consumers">Consumers</option>
                    <option value="technical_decision_makers">Technical Decision Makers</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="writing_style">Writing Style</Label>
                  <select
                    id="writing_style"
                    value={brandTone.writing_style || 'concise'}
                    onChange={(e) => setBrandTone({ ...brandTone, writing_style: e.target.value as BrandTone['writing_style'] })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="concise">Concise - Short and scannable</option>
                    <option value="detailed">Detailed - Comprehensive</option>
                    <option value="storytelling">Storytelling - Narrative</option>
                    <option value="data_driven">Data-Driven - Evidence-focused</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jargon_usage">Industry Jargon</Label>
                  <select
                    id="jargon_usage"
                    value={brandTone.jargon_usage || 'moderate'}
                    onChange={(e) => setBrandTone({ ...brandTone, jargon_usage: e.target.value as BrandTone['jargon_usage'] })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="avoid">Avoid - Plain language</option>
                    <option value="moderate">Moderate - Some terms</option>
                    <option value="embrace">Embrace - Use freely</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom_notes">Custom Tone Notes</Label>
                <Textarea
                  id="custom_notes"
                  value={brandTone.custom_notes || ''}
                  onChange={(e) => setBrandTone({ ...brandTone, custom_notes: e.target.value })}
                  rows={3}
                  placeholder="e.g., Avoid exclamation marks. Always emphasize security."
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Content Settings Section */}
        <section id="content" ref={(el) => { sectionRefs.current['content'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Content Settings
              </CardTitle>
              <CardDescription>Configure how memos are generated and published</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-publish memos</p>
                  <p className="text-sm text-muted-foreground">Automatically publish generated memos without review</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublish(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Personas Section */}
        <section id="personas" ref={(el) => { sectionRefs.current['personas'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Target Personas
              </CardTitle>
              <CardDescription>Buyer profiles by seniority and function - used for generating targeted prompts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sortedPersonas.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {sortedPersonas.map(persona => (
                    <div key={persona.id} className={`p-4 border rounded-lg transition-opacity ${persona.isEnabled ? 'bg-card' : 'opacity-50 bg-muted/30'}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm flex items-center gap-2">
                            {persona.title}
                            {persona.is_auto_detected && <Sparkles className="h-3 w-3 text-muted-foreground" />}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => togglePersona(persona.id, persona.isEnabled)} disabled={personaLoading === persona.id}>
                            {personaLoading === persona.id ? <Loader2 className="h-4 w-4 animate-spin" /> : persona.isEnabled ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                          {!persona.is_auto_detected && (
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removePersona(persona.id)} disabled={personaLoading === `remove-${persona.id}`}>
                              {personaLoading === `remove-${persona.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 flex items-center gap-1 ${SENIORITY_COLORS[persona.seniority]}`}>
                          {SENIORITY_ICONS[persona.seniority]}
                          {persona.seniority}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{persona.function}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{persona.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">No personas detected yet.</div>
              )}
              
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={regeneratePersonas} disabled={personaLoading === 'regenerate'}>
                  {personaLoading === 'regenerate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh Personas
                </Button>
                
                <Dialog open={addPersonaOpen} onOpenChange={setAddPersonaOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4" />Add Persona</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Target Persona</DialogTitle>
                      <DialogDescription>Define a buyer persona to generate targeted prompts</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label>Job Title</Label>
                        <Input placeholder="e.g., VP of Marketing" value={newPersona.title} onChange={(e) => setNewPersona(p => ({ ...p, title: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Seniority</Label>
                        <div className="flex gap-2">
                          {(['executive', 'manager', 'specialist'] as PersonaSeniority[]).map((level) => (
                            <Button key={level} type="button" variant={newPersona.seniority === level ? 'default' : 'outline'} size="sm" className="flex-1 gap-1" onClick={() => setNewPersona(p => ({ ...p, seniority: level }))}>
                              {level === 'executive' && <Crown className="h-3 w-3" />}
                              {level === 'manager' && <Users className="h-3 w-3" />}
                              {level === 'specialist' && <User className="h-3 w-3" />}
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label>Function/Department</Label>
                        <Input placeholder="e.g., Marketing, Sales" value={newPersona.function} onChange={(e) => setNewPersona(p => ({ ...p, function: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Description</Label>
                        <Textarea placeholder="Who this persona is" value={newPersona.description} onChange={(e) => setNewPersona(p => ({ ...p, description: e.target.value }))} rows={2} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Priorities (comma-separated)</Label>
                        <Input placeholder="e.g., ROI, integrations" value={newPersona.priorities} onChange={(e) => setNewPersona(p => ({ ...p, priorities: e.target.value }))} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddPersonaOpen(false)}>Cancel</Button>
                      <Button onClick={addPersona} disabled={personaLoading === 'add'}>
                        {personaLoading === 'add' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Persona
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Prompt Themes Section */}
        <section id="themes" ref={(el) => { sectionRefs.current['themes'] = el }} className="scroll-mt-24">
          <Card className="border-2 border-[#0EA5E9]/30" style={{ borderLeft: '4px solid #0EA5E9' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#0EA5E9]" />
                  <CardTitle>Critical Prompt Themes</CardTitle>
                </div>
                {!isAddingTheme && (
                  <Button variant="outline" size="sm" onClick={() => setIsAddingTheme(true)} className="gap-1">
                    <Plus className="h-3 w-3" />Add Theme
                  </Button>
                )}
              </div>
              <CardDescription>1-3 keyword clusters that define what prompts should target. Click priority to change.</CardDescription>
            </CardHeader>
            <CardContent>
              {isAddingTheme && (
                <div className="flex gap-2 mb-4">
                  <Input placeholder="e.g., temperature monitoring, food safety..." value={newTheme} onChange={(e) => setNewTheme(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTheme()} className="flex-1" autoFocus />
                  <Button size="sm" onClick={addTheme}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setIsAddingTheme(false); setNewTheme('') }}>Cancel</Button>
                </div>
              )}

              {themes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {themes
                    .sort((a, b) => {
                      const order = { high: 0, medium: 1, low: 2 }
                      return order[a.priority] - order[b.priority]
                    })
                    .map((theme, i) => (
                      <div key={i} className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
                        theme.priority === 'high' ? 'bg-[#0EA5E9]/10 border-[#0EA5E9] text-[#0EA5E9]' :
                        theme.priority === 'medium' ? 'bg-[#F59E0B]/10 border-[#F59E0B] text-[#F59E0B]' :
                        'bg-zinc-100 border-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400'
                      }`}>
                        <button onClick={() => toggleThemePriority(theme.theme)} className="font-medium text-sm hover:underline" title={`Priority: ${theme.priority} (click to change)`}>
                          {theme.theme}
                        </button>
                        {theme.auto_detected && <Sparkles className="h-3 w-3 opacity-60" />}
                        <button onClick={() => removeTheme(theme.theme)} className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">No prompt themes defined yet.</div>
              )}

              {themes.length > 0 && (
                <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0EA5E9]"></span>High priority</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>Medium</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-400"></span>Low</span>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Integrations Section */}
        <section id="integrations" ref={(el) => { sectionRefs.current['integrations'] = el }} className="scroll-mt-24">
          <div className="space-y-6">
            {/* HubSpot */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="h-5 w-5" />
                  HubSpot Integration
                </CardTitle>
                <CardDescription>Push AI-generated content directly to your HubSpot blog</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hubspotConnected ? (
                  <>
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-green-900">HubSpot Connected</p>
                        <p className="text-sm text-green-700">{hubspotHealthy ? 'Connection is healthy' : 'Verifying connection...'}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleHubSpotDisconnect} disabled={hubspotDisconnecting}>
                        {hubspotDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Disconnect'}
                      </Button>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Target Blog</Label>
                      {hubspotBlogs.length > 0 ? (
                        <select value={hubspotConfig.blog_id || ''} onChange={(e) => setHubspotConfig({ ...hubspotConfig, blog_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="">Select a blog...</option>
                          {hubspotBlogs.map((blog) => <option key={blog.id} value={blog.id}>{blog.name}</option>)}
                        </select>
                      ) : (
                        <Input value={hubspotConfig.blog_id || ''} onChange={(e) => setHubspotConfig({ ...hubspotConfig, blog_id: e.target.value })} placeholder="Enter your HubSpot Blog ID" />
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div><p className="font-medium">Auto-sync content</p><p className="text-sm text-muted-foreground">Automatically push generated content to HubSpot</p></div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={hubspotConfig.auto_sync || false} onChange={(e) => setHubspotConfig({ ...hubspotConfig, auto_sync: e.target.checked })} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    {hubspotConfig.auto_sync && (
                      <div className="flex items-center justify-between pt-2 ml-4 border-l-2 border-gray-200 pl-4">
                        <div><p className="font-medium">Auto-publish</p><p className="text-sm text-muted-foreground">Publish immediately instead of creating as draft</p></div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={hubspotConfig.auto_publish || false} onChange={(e) => setHubspotConfig({ ...hubspotConfig, auto_publish: e.target.checked })} className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    )}
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between">
                      <div><p className="font-medium">Resync All Content</p><p className="text-sm text-muted-foreground">Update all HubSpot posts with latest content, images, and author</p></div>
                      <Button variant="outline" size="sm" onClick={handleHubSpotResync} disabled={hubspotResyncing}>
                        {hubspotResyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        {hubspotResyncing ? 'Resyncing...' : 'Resync All'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center py-6">
                      <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                        <Link2 className="h-6 w-6 text-orange-600" />
                      </div>
                      <h3 className="font-medium mb-2">Connect your HubSpot account</h3>
                      <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">Automatically push AI-generated content to your HubSpot blog.</p>
                      <Button onClick={handleHubSpotConnect}>
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.984 2.21 2.21 0 00-4.42 0c0 .873.51 1.627 1.248 1.984v2.846a5.267 5.267 0 00-3.222 1.778l-6.84-5.073a2.628 2.628 0 00.044-.457 2.616 2.616 0 10-2.615 2.615c.461 0 .893-.12 1.269-.33l6.696 4.963a5.264 5.264 0 00-.163 1.31c0 .47.062.925.178 1.358l-3.478 1.665a2.1 2.1 0 00-1.84-1.086 2.114 2.114 0 100 4.227 2.114 2.114 0 002.063-1.673l3.618-1.732a5.28 5.28 0 009.236-3.498 5.28 5.28 0 00-3.041-4.767zm-.95 7.586a2.633 2.633 0 110-5.266 2.633 2.633 0 010 5.266z"/></svg>
                        Connect HubSpot
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Bing Webmaster */}
            <Card>
              <CardHeader>
                <CardTitle>Bing Webmaster Integration</CardTitle>
                <CardDescription>Track which search queries drive traffic (ChatGPT uses Bing)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div><p className="font-medium">Enable Bing Webmaster</p><p className="text-sm text-muted-foreground">Sync search query data</p></div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={searchConsoleConfig.bing?.enabled || false} onChange={(e) => setSearchConsoleConfig({ ...searchConsoleConfig, bing: { ...searchConsoleConfig.bing, enabled: e.target.checked } })} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                {searchConsoleConfig.bing?.enabled && (
                  <>
                    <Separator />
                    <Alert>
                      <AlertDescription>
                        <p className="mb-2">To get your Bing Webmaster API key:</p>
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                          <li>Go to <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Bing Webmaster Tools</a></li>
                          <li>Add and verify your site</li>
                          <li>Go to Settings → API Access</li>
                          <li>Generate an API Key</li>
                        </ol>
                      </AlertDescription>
                    </Alert>
                    <div className="space-y-2">
                      <Label>API Key</Label>
                      <Input type="password" value={searchConsoleConfig.bing?.api_key || ''} onChange={(e) => setSearchConsoleConfig({ ...searchConsoleConfig, bing: { ...searchConsoleConfig.bing, api_key: e.target.value } })} placeholder="Your Bing Webmaster API key" />
                    </div>
                    <div className="space-y-2">
                      <Label>Site URL</Label>
                      <Input value={searchConsoleConfig.bing?.site_url || `https://${brand.subdomain}.contextmemo.com`} onChange={(e) => setSearchConsoleConfig({ ...searchConsoleConfig, bing: { ...searchConsoleConfig.bing, site_url: e.target.value } })} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Google Search Console */}
            <Card>
              <CardHeader>
                <CardTitle>Google Search Console Integration</CardTitle>
                <CardDescription>Track which Google searches drive traffic (AI Overviews uses Google)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {searchConsoleConfig.google?.enabled && searchConsoleConfig.google?.refresh_token ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Google Search Console Connected</span>
                    </div>
                    <div className="space-y-2">
                      <Label>Site Property</Label>
                      <Input value={searchConsoleConfig.google?.site_url || ''} onChange={(e) => setSearchConsoleConfig({ ...searchConsoleConfig, google: { ...searchConsoleConfig.google, site_url: e.target.value } })} placeholder="sc-domain:example.com" />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSearchConsoleConfig({ ...searchConsoleConfig, google: { enabled: false } })}>Disconnect</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Connect your Google Search Console to see which queries drive traffic.</p>
                    <Button variant="outline" onClick={() => { window.location.href = `/api/auth/google-search-console/authorize?brandId=${brandId}` }}>
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      Connect Google Search Console
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Danger Zone Section */}
        <section id="danger" ref={(el) => { sectionRefs.current['danger'] = el }} className="scroll-mt-24">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>Irreversible actions for this brand</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertDescription>Deleting this brand will remove all memos, prompts, scan results, and competitors. This action cannot be undone.</AlertDescription>
              </Alert>
              <Button variant="destructive" className="mt-4" onClick={handleDelete} disabled={deleting}>
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Brand
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
