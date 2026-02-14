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
  Plug, AlertTriangle, ChevronRight, ChevronDown, ChevronUp, Plus, X, Sparkles, RefreshCw,
  Crown, User, Mic, Swords, ToggleLeft, ToggleRight, Globe, DollarSign,
  Tag, Percent, Palette, GitBranch, Copy, Eye, EyeOff
} from 'lucide-react'
import { toast } from 'sonner'
import { BrandContext, BrandTone, BrandTheme, HubSpotConfig, SearchConsoleConfig, TargetPersona, PersonaSeniority, PromptTheme, MarketFocus, BrandOffer, BrandOffers } from '@/lib/supabase/types'
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
  custom_domain: string | null
  domain_verified: boolean
  proxy_origin: string | null
  proxy_base_path: string | null
}

// Navigation sections
const NAV_SECTIONS = [
  { id: 'user-profile', label: 'User Profile', icon: User },
  { id: 'general', label: 'General', icon: Settings },
  { id: 'brand-context', label: 'Brand Context', icon: Building2 },
  { id: 'markets', label: 'Markets & Focus', icon: Percent },
  { id: 'competitors', label: 'Competitors', icon: Swords },
  { id: 'offers', label: 'Offers & Pricing', icon: DollarSign },
  { id: 'expert-insights', label: 'Expert Insights', icon: Mic, highlight: true },
  { id: 'brand-voice', label: 'Brand Voice', icon: MessageSquare },
  { id: 'content', label: 'Memo Settings', icon: FileText },
  { id: 'custom-domain', label: 'Custom Domain', icon: Globe },
  { id: 'subfolder-proxy', label: 'Subfolder Proxy', icon: Link2, highlight: true },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'personas', label: 'Target Personas', icon: Users },
  { id: 'deploy-memos', label: 'Deploy Memos', icon: GitBranch, highlight: true },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'privacy', label: 'Data & Privacy', icon: Link2 },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
]

// Offer type options
const OFFER_TYPES = [
  { value: 'demo', label: 'Demo' },
  { value: 'trial', label: 'Free Trial' },
  { value: 'freemium', label: 'Freemium' },
  { value: 'contact_sales', label: 'Contact Sales' },
  { value: 'signup', label: 'Sign Up' },
  { value: 'download', label: 'Download' },
  { value: 'quote', label: 'Get Quote' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'other', label: 'Other' },
] as const

// Pricing model options
const PRICING_MODELS = [
  { value: 'free', label: 'Free' },
  { value: 'freemium', label: 'Freemium' },
  { value: 'paid', label: 'Paid' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'contact_sales', label: 'Contact Sales' },
  { value: 'custom', label: 'Custom' },
] as const

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
  const [exporting, setExporting] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [activeSection, setActiveSection] = useState('user-profile')
  
  // User profile state
  const [userEmail, setUserEmail] = useState('')
  const [userDisplayName, setUserDisplayName] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  
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

  // Market focus state
  const [marketFocus, setMarketFocus] = useState<MarketFocus[]>([])
  const [newMarket, setNewMarket] = useState('')
  const [isAddingMarket, setIsAddingMarket] = useState(false)

  // Competitors state
  interface Competitor {
    id: string
    name: string
    domain: string | null
    description: string | null
    auto_discovered: boolean
    is_active: boolean
  }
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [togglingCompetitorId, setTogglingCompetitorId] = useState<string | null>(null)
  const [excludedExpanded, setExcludedExpanded] = useState(false)
  const [addCompetitorOpen, setAddCompetitorOpen] = useState(false)
  const [newCompetitor, setNewCompetitor] = useState({ name: '', domain: '' })
  const [addingCompetitor, setAddingCompetitor] = useState(false)

  // Custom domain state
  const [customDomain, setCustomDomain] = useState('')
  const [customDomainInput, setCustomDomainInput] = useState('')
  const [domainVerified, setDomainVerified] = useState(false)
  const [domainSaving, setDomainSaving] = useState(false)
  const [domainVerifying, setDomainVerifying] = useState(false)
  const [domainRemoving, setDomainRemoving] = useState(false)

  // Subfolder proxy state
  const [proxyOrigin, setProxyOrigin] = useState('')
  const [proxyBasePath, setProxyBasePath] = useState('')
  const [proxyOriginInput, setProxyOriginInput] = useState('')
  const [proxyBasePathInput, setProxyBasePathInput] = useState('/memos')
  const [proxySaving, setProxySaving] = useState(false)
  const [proxyRemoving, setProxyRemoving] = useState(false)

  // Appearance / theme state
  const [brandTheme, setBrandTheme] = useState<BrandTheme>({})
  const [themeSaving, setThemeSaving] = useState(false)

  // GitHub Deploy Memos state
  const [githubIntegration, setGithubIntegration] = useState<{
    id: string
    enabled: boolean
    webhookSecret: string
    webhookUrl: string
    repoFullName?: string
    lastBackfillAt?: string
    createdAt: string
  } | null>(null)
  const [githubLoading, setGithubLoading] = useState(false)
  const [githubCreating, setGithubCreating] = useState(false)
  const [githubToggling, setGithubToggling] = useState(false)
  const [githubRegenerating, setGithubRegenerating] = useState(false)
  const [githubDeleting, setGithubDeleting] = useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [secretCopied, setSecretCopied] = useState(false)
  const [urlCopied, setUrlCopied] = useState(false)
  const [repoInput, setRepoInput] = useState('')
  const [backfilling, setBackfilling] = useState(false)
  const [backfillResult, setBackfillResult] = useState<{ batches: number; totalCommits: number; message: string } | null>(null)

  // Offers state
  const [offers, setOffers] = useState<BrandOffers>({})
  const defaultOffer: BrandOffer = { type: 'demo', label: '' }

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
      
      // Load brand data
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()

      if (error || !data) {
        router.push('/dashboard')
        return
      }

      // Load competitors
      const { data: competitorData } = await supabase
        .from('competitors')
        .select('*')
        .eq('brand_id', brandId)
        .order('name')
      
      if (competitorData) {
        setCompetitors(competitorData)
      }

      setBrand(data)
      setName(data.name)
      setAutoPublish(data.auto_publish)
      setCustomDomain(data.custom_domain || '')
      setCustomDomainInput(data.custom_domain || '')
      setDomainVerified(data.domain_verified || false)
      setProxyOrigin(data.proxy_origin || '')
      setProxyBasePath(data.proxy_base_path || '')
      setProxyOriginInput(data.proxy_origin || '')
      setProxyBasePathInput(data.proxy_base_path || '/memos')
      
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
        setOffers(context.offers || {})
        setBrandTheme(context.theme || {})
        
        // Initialize market focus from existing markets if not already set
        if (context.market_focus && context.market_focus.length > 0) {
          setMarketFocus(context.market_focus)
        } else if (context.markets && context.markets.length > 0) {
          // Convert plain markets array to market focus with 50% default
          setMarketFocus(context.markets.map(m => ({ name: m, focus: 50 })))
        }
        
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

  // Load GitHub integration
  useEffect(() => {
    if (!brandId) return
    const loadGithubIntegration = async () => {
      setGithubLoading(true)
      try {
        const res = await fetch(`/api/brands/${brandId}/github-integration`)
        if (res.ok) {
          const data = await res.json()
          setGithubIntegration(data.integration)
          if (data.integration?.repoFullName) {
            setRepoInput(data.integration.repoFullName)
          }
        }
      } catch (err) {
        console.error('Failed to load GitHub integration:', err)
      } finally {
        setGithubLoading(false)
      }
    }
    loadGithubIntegration()
  }, [brandId])

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserEmail(user.email || '')
        }
        const res = await fetch('/api/user/profile')
        if (res.ok) {
          const data = await res.json()
          setUserDisplayName(data.name || '')
        }
      } catch (err) {
        console.error('[settings] Failed to load user profile:', err)
      }
    }
    loadProfile()
  }, [])

  // Save user profile
  const handleSaveProfile = async () => {
    if (!userDisplayName.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    setSavingProfile(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userDisplayName.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }
      toast.success('Profile updated! Your name will appear as the author on HubSpot posts.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

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
      { root: null, rootMargin: '-10% 0px -80% 0px' }
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
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      markets: marketFocus.map(m => m.name), // Keep markets array in sync
      market_focus: marketFocus.length > 0 ? marketFocus : undefined,
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
      offers: (offers.primary || offers.secondary || offers.pricing_model) ? offers : undefined,
      theme: Object.values(brandTheme).some(v => v) ? brandTheme : undefined,
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

  // GitHub Deploy Memos handlers
  const handleCreateGithubIntegration = async () => {
    setGithubCreating(true)
    try {
      const res = await fetch(`/api/brands/${brandId}/github-integration`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setGithubIntegration(data.integration)
        setShowWebhookSecret(true)
        toast.success('Deploy Memos enabled — copy your webhook secret below')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to enable Deploy Memos')
      }
    } catch {
      toast.error('Failed to enable Deploy Memos')
    } finally {
      setGithubCreating(false)
    }
  }

  const handleToggleGithubIntegration = async () => {
    if (!githubIntegration) return
    setGithubToggling(true)
    try {
      const res = await fetch(`/api/brands/${brandId}/github-integration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !githubIntegration.enabled }),
      })
      if (res.ok) {
        const data = await res.json()
        setGithubIntegration(data.integration)
        toast.success(data.integration.enabled ? 'Deploy Memos enabled' : 'Deploy Memos paused')
      }
    } catch {
      toast.error('Failed to update')
    } finally {
      setGithubToggling(false)
    }
  }

  const handleRegenerateSecret = async () => {
    if (!confirm('Regenerate webhook secret? You\'ll need to update GitHub with the new secret.')) return
    setGithubRegenerating(true)
    try {
      const res = await fetch(`/api/brands/${brandId}/github-integration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateSecret: true }),
      })
      if (res.ok) {
        const data = await res.json()
        setGithubIntegration(data.integration)
        setShowWebhookSecret(true)
        toast.success('Webhook secret regenerated — update GitHub with the new secret')
      }
    } catch {
      toast.error('Failed to regenerate secret')
    } finally {
      setGithubRegenerating(false)
    }
  }

  const handleDeleteGithubIntegration = async () => {
    if (!confirm('Remove GitHub integration? Deploy Memos will stop being generated from your deployments.')) return
    setGithubDeleting(true)
    try {
      const res = await fetch(`/api/brands/${brandId}/github-integration`, { method: 'DELETE' })
      if (res.ok) {
        setGithubIntegration(null)
        setShowWebhookSecret(false)
        toast.success('GitHub integration removed')
      }
    } catch {
      toast.error('Failed to remove integration')
    } finally {
      setGithubDeleting(false)
    }
  }

  const handleBackfill = async () => {
    const repo = repoInput.trim() || githubIntegration?.repoFullName
    if (!repo) {
      toast.error('Enter your GitHub repo (e.g. owner/repo)')
      return
    }
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) {
      toast.error('Invalid format. Use owner/repo (e.g. acme/product)')
      return
    }
    setBackfilling(true)
    setBackfillResult(null)
    try {
      const res = await fetch(`/api/brands/${brandId}/github-integration/backfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoFullName: repo }),
      })
      const data = await res.json()
      if (res.ok) {
        setBackfillResult(data)
        setGithubIntegration(prev => prev ? { ...prev, repoFullName: repo, lastBackfillAt: new Date().toISOString() } : prev)
        if (data.batches > 0) {
          toast.success(`Queued ${data.batches} deploy batches for analysis`)
        } else {
          toast.info(data.message || 'No commits found in the last 30 days')
        }
      } else {
        toast.error(data.error || 'Backfill failed')
      }
    } catch {
      toast.error('Failed to run backfill')
    } finally {
      setBackfilling(false)
    }
  }

  const copyToClipboard = (text: string, type: 'secret' | 'url') => {
    navigator.clipboard.writeText(text)
    if (type === 'secret') {
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
    } else {
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 2000)
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/privacy/export')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Export failed')
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `contextmemo-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast.success('Data export downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account and all associated data? This action cannot be undone.')) return

    setDeletingAccount(true)
    try {
      const response = await fetch('/api/privacy/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account')
      }

      const supabase = createClient()
      await supabase.auth.signOut()
      toast.success('Account deleted')
      router.push('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete account')
    } finally {
      setDeletingAccount(false)
    }
  }

  // Appearance / theme save handler
  const handleSaveTheme = async () => {
    if (!brand) return
    setThemeSaving(true)
    const supabase = createClient()
    
    // Merge theme into existing context
    const existingContext = brand.context as Record<string, unknown>
    const cleanTheme = Object.fromEntries(
      Object.entries(brandTheme).filter(([, v]) => v !== undefined && v !== '')
    )
    
    const { error } = await supabase
      .from('brands')
      .update({
        context: { ...existingContext, theme: Object.keys(cleanTheme).length > 0 ? cleanTheme : undefined },
        updated_at: new Date().toISOString(),
      })
      .eq('id', brand.id)

    setThemeSaving(false)
    if (error) {
      toast.error('Failed to save appearance settings')
    } else {
      // Update local brand state so subsequent main saves don't overwrite
      setBrand(prev => prev ? { ...prev, context: { ...existingContext, theme: cleanTheme } as BrandContext } : prev)
      toast.success('Appearance settings saved')
    }
  }

  // Auto-generate Google Fonts URL from font family name
  const generateFontUrl = (fontFamily: string) => {
    if (!fontFamily.trim()) return ''
    const encoded = fontFamily.trim().replace(/\s+/g, '+')
    return `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700;800&display=swap`
  }

  // Custom domain handlers
  const handleSetCustomDomain = async () => {
    const domain = customDomainInput.trim().toLowerCase()
    if (!domain) {
      toast.error('Please enter a domain')
      return
    }
    setDomainSaving(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/custom-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to set domain')
      setCustomDomain(data.custom_domain)
      setDomainVerified(false)
      toast.success('Custom domain configured. Set up DNS, then click Verify.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to set domain')
    } finally {
      setDomainSaving(false)
    }
  }

  const handleVerifyDomain = async () => {
    setDomainVerifying(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/custom-domain`, {
        method: 'PUT',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Verification failed')
      if (data.domain_verified) {
        setDomainVerified(true)
        toast.success('Domain verified! Your custom domain is now live.')
      } else {
        toast.error(data.message || 'DNS not yet configured. Please check your CNAME record.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verification failed')
    } finally {
      setDomainVerifying(false)
    }
  }

  const handleRemoveDomain = async () => {
    if (!window.confirm('Remove custom domain? Your memos will still be accessible via the subdomain URL.')) return
    setDomainRemoving(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/custom-domain`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to remove domain')
      setCustomDomain('')
      setCustomDomainInput('')
      setDomainVerified(false)
      toast.success('Custom domain removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove domain')
    } finally {
      setDomainRemoving(false)
    }
  }

  // Subfolder proxy handlers
  const handleSaveProxy = async () => {
    const origin = proxyOriginInput.trim()
    const basePath = proxyBasePathInput.trim()

    if (!origin) {
      toast.error('Please enter your website URL (e.g., https://acme.com)')
      return
    }
    if (!basePath || !basePath.startsWith('/')) {
      toast.error('Base path must start with / (e.g., /memos)')
      return
    }

    // Validate URL format
    try {
      new URL(origin)
    } catch {
      toast.error('Please enter a valid URL including https:// (e.g., https://acme.com)')
      return
    }

    setProxySaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('brands')
        .update({
          proxy_origin: origin.replace(/\/$/, ''),
          proxy_base_path: basePath.replace(/\/$/, ''),
          updated_at: new Date().toISOString(),
        })
        .eq('id', brandId)

      if (error) throw error
      setProxyOrigin(origin.replace(/\/$/, ''))
      setProxyBasePath(basePath.replace(/\/$/, ''))
      toast.success('Subfolder proxy settings saved. Configure your proxy using the instructions below.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save proxy settings')
    } finally {
      setProxySaving(false)
    }
  }

  const handleRemoveProxy = async () => {
    if (!window.confirm('Remove subfolder proxy configuration? Memos will still be accessible via your subdomain or custom domain.')) return
    setProxyRemoving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('brands')
        .update({
          proxy_origin: null,
          proxy_base_path: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', brandId)

      if (error) throw error
      setProxyOrigin('')
      setProxyBasePath('')
      setProxyOriginInput('')
      setProxyBasePathInput('/memos')
      toast.success('Subfolder proxy configuration removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove proxy settings')
    } finally {
      setProxyRemoving(false)
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
      
      // Update local state immediately with returned personas
      if (data.personas) {
        setPersonas(data.personas)
        setDisabledPersonas([])
      }
      
      toast.success(data.message)
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
      
      // Update local state immediately with new persona
      if (data.persona) {
        setPersonas(prev => [...prev, data.persona])
      }
      
      toast.success(data.message)
      setAddPersonaOpen(false)
      setNewPersona({ title: '', seniority: 'manager', function: '', description: '', phrasing_style: '', priorities: '' })
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

  // Market focus handlers
  const addMarket = () => {
    if (!newMarket.trim()) return
    if (marketFocus.some(m => m.name.toLowerCase() === newMarket.toLowerCase().trim())) {
      toast.error('This market already exists')
      return
    }
    setMarketFocus([...marketFocus, { name: newMarket.trim(), focus: 50 }])
    setNewMarket('')
    setIsAddingMarket(false)
  }

  const removeMarket = (marketName: string) => {
    setMarketFocus(marketFocus.filter(m => m.name !== marketName))
  }

  const updateMarketFocus = (marketName: string, focus: number) => {
    setMarketFocus(marketFocus.map(m => 
      m.name === marketName ? { ...m, focus } : m
    ))
  }

  // Competitor handlers
  const handleToggleCompetitor = async (competitorId: string, currentlyActive: boolean) => {
    setTogglingCompetitorId(competitorId)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('competitors')
        .update({ is_active: !currentlyActive })
        .eq('id', competitorId)

      if (error) throw error

      setCompetitors(prev => 
        prev.map(c => 
          c.id === competitorId 
            ? { ...c, is_active: !currentlyActive }
            : c
        )
      )
      toast.success(!currentlyActive ? 'Competitor included' : 'Competitor excluded')
    } catch (error) {
      toast.error('Failed to update competitor')
      console.error(error)
    } finally {
      setTogglingCompetitorId(null)
    }
  }

  const handleAddCompetitor = async () => {
    if (!newCompetitor.name.trim()) {
      toast.error('Competitor name is required')
      return
    }

    setAddingCompetitor(true)
    try {
      const supabase = createClient()
      let cleanDomain = newCompetitor.domain.trim()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '')
        .toLowerCase()

      const { data, error } = await supabase
        .from('competitors')
        .insert({
          brand_id: brandId,
          name: newCompetitor.name.trim(),
          domain: cleanDomain || null,
          auto_discovered: false,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      setCompetitors(prev => [...prev, data])
      toast.success(`Added ${newCompetitor.name.trim()}`)
      setNewCompetitor({ name: '', domain: '' })
      setAddCompetitorOpen(false)
    } catch (error) {
      toast.error('Failed to add competitor')
      console.error(error)
    } finally {
      setAddingCompetitor(false)
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
    const order: Record<string, number> = { executive: 0, manager: 1, specialist: 2 }
    const aOrder = order[a.seniority] ?? 99
    const bOrder = order[b.seniority] ?? 99
    if (aOrder !== bOrder) return aOrder - bOrder
    return (a.function || '').localeCompare(b.function || '')
  })

  return (
    <div className="flex gap-8 max-w-6xl mx-auto">
      {/* Side Navigation - sticky so it follows scroll */}
      <nav className="w-56 shrink-0 hidden md:block self-start sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
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

      {/* Main Content - scrolls with the page */}
      <div ref={contentRef} className="flex-1 space-y-8 pb-20 min-w-0">
        <div>
          <h1 className="text-2xl font-bold">Brand Settings</h1>
          <p className="text-muted-foreground">Manage settings for {brand.name}</p>
        </div>

        {/* User Profile Section */}
        <section id="user-profile" ref={(el) => { sectionRefs.current['user-profile'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Profile
              </CardTitle>
              <CardDescription>
                Update your display name. This will be used as the author name when publishing to HubSpot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-email">Email</Label>
                <Input id="user-email" value={userEmail} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-display-name">Display Name</Label>
                <Input
                  id="user-display-name"
                  value={userDisplayName}
                  onChange={(e) => setUserDisplayName(e.target.value)}
                  placeholder="Your full name (e.g., Stephen Newman)"
                />
                <p className="text-xs text-muted-foreground">
                  This name will appear as the author on HubSpot blog posts you publish.
                </p>
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </section>

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
              <CardDescription>Company information used by AI for memo generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Inc." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="founded">Founded</Label>
                  <Input id="founded" value={founded} onChange={(e) => setFounded(e.target.value)} placeholder="" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="headquarters">Headquarters</Label>
                <Input id="headquarters" value={headquarters} onChange={(e) => setHeadquarters(e.target.value)} placeholder="" />
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

        {/* Markets & Focus Section */}
        <section id="markets" ref={(el) => { sectionRefs.current['markets'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Percent className="h-5 w-5" />
                    Markets & Focus
                  </CardTitle>
                  <CardDescription>Adjust focus percentage to weight memo generation for each market</CardDescription>
                </div>
                {!isAddingMarket && (
                  <Button variant="outline" size="sm" onClick={() => setIsAddingMarket(true)} className="gap-1">
                    <Plus className="h-3 w-3" />Add Market
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAddingMarket && (
                <div className="flex gap-2 mb-4">
                  <Input 
                    placeholder="e.g., Food & Beverage, Healthcare..." 
                    value={newMarket} 
                    onChange={(e) => setNewMarket(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && addMarket()} 
                    className="flex-1" 
                    autoFocus 
                  />
                  <Button size="sm" onClick={addMarket}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setIsAddingMarket(false); setNewMarket('') }}>Cancel</Button>
                </div>
              )}

              {marketFocus.length > 0 ? (
                <div className="space-y-4">
                  {marketFocus.map((market) => (
                    <div key={market.name} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium">{market.name}</div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
                            market.focus >= 70 ? 'bg-green-100 text-green-700' :
                            market.focus >= 40 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {market.focus}%
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeMarket(market.name)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-8">0%</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={market.focus}
                          onChange={(e) => updateMarketFocus(market.name, parseInt(e.target.value))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <span className="text-xs text-muted-foreground w-10">100%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {market.focus >= 70 ? 'High focus - will generate more memos for this market' :
                         market.focus >= 40 ? 'Medium focus - balanced memo generation' :
                         'Low focus - fewer memos will target this market'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No markets defined yet. Add markets to control memo generation focus.
                </div>
              )}

              {marketFocus.length > 0 && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <p>Markets with higher focus percentage will have more content generated targeting them.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Competitors Section */}
        <section id="competitors" ref={(el) => { sectionRefs.current['competitors'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Swords className="h-5 w-5" />
                    Competitors
                  </CardTitle>
                  <CardDescription>
                    {competitors.filter(c => c.is_active).length} included • {competitors.filter(c => !c.is_active).length} excluded
                  </CardDescription>
                </div>
                <Dialog open={addCompetitorOpen} onOpenChange={setAddCompetitorOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Plus className="h-3 w-3" />Add Competitor
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Competitor</DialogTitle>
                      <DialogDescription>Add a competitor to track in visibility scans and content monitoring.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Competitor Name *</Label>
                        <Input 
                          placeholder="e.g., Acme Corp" 
                          value={newCompetitor.name} 
                          onChange={(e) => setNewCompetitor(p => ({ ...p, name: e.target.value }))} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Domain (optional)</Label>
                        <Input 
                          placeholder="e.g., acme.com" 
                          value={newCompetitor.domain} 
                          onChange={(e) => setNewCompetitor(p => ({ ...p, domain: e.target.value }))} 
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddCompetitorOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddCompetitor} disabled={addingCompetitor}>
                        {addingCompetitor && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Competitor
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Included Competitors */}
              {competitors.filter(c => c.is_active).length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Included in Tracking</Label>
                  {competitors.filter(c => c.is_active).map((competitor) => (
                    <div key={competitor.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{competitor.name}</p>
                            {competitor.auto_discovered && <Sparkles className="h-3 w-3 text-muted-foreground" />}
                          </div>
                          {competitor.domain && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Globe className="h-3 w-3" />
                              {competitor.domain}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleCompetitor(competitor.id, true)}
                        disabled={togglingCompetitorId === competitor.id}
                        className="text-muted-foreground hover:text-destructive"
                        title="Exclude from tracking"
                      >
                        {togglingCompetitorId === competitor.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ToggleRight className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No active competitors. Add competitors or re-enable excluded ones below.
                </div>
              )}

              {/* Excluded Competitors - Collapsible */}
              {competitors.filter(c => !c.is_active).length > 0 && (
                <div className="pt-4 border-t">
                  <button
                    onClick={() => setExcludedExpanded(!excludedExpanded)}
                    className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity"
                  >
                    <div className="flex items-center gap-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer">
                        Excluded from Tracking
                      </Label>
                      <Badge variant="secondary" className="text-xs">
                        {competitors.filter(c => !c.is_active).length}
                      </Badge>
                    </div>
                    {excludedExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  {excludedExpanded && (
                    <div className="space-y-2 mt-2">
                      {competitors.filter(c => !c.is_active).map((competitor) => (
                        <div key={competitor.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 opacity-60">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{competitor.name}</p>
                            {competitor.domain && (
                              <p className="text-sm text-muted-foreground">{competitor.domain}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleCompetitor(competitor.id, false)}
                            disabled={togglingCompetitorId === competitor.id}
                            className="text-muted-foreground hover:text-green-600"
                            title="Re-include in tracking"
                          >
                            {togglingCompetitorId === competitor.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ToggleLeft className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2">
                <p>Excluded competitors won&apos;t appear in visibility scans or content monitoring.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Offers & Pricing Section */}
        <section id="offers" ref={(el) => { sectionRefs.current['offers'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Offers & Pricing
              </CardTitle>
              <CardDescription>Calls-to-action used in generated memos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primary Offer */}
              <div className="p-4 border rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-emerald-600 text-xs">Primary Offer</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Offer Type</Label>
                    <select
                      value={offers.primary?.type || 'demo'}
                      onChange={(e) => setOffers({ ...offers, primary: { ...(offers.primary || defaultOffer), type: e.target.value as BrandOffer['type'] } })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {OFFER_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>CTA Label</Label>
                    <Input 
                      placeholder="e.g., Book a Demo" 
                      value={offers.primary?.label || ''} 
                      onChange={(e) => setOffers({ ...offers, primary: { ...(offers.primary || defaultOffer), label: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL (optional)</Label>
                    <Input 
                      placeholder="e.g., /demo or https://..." 
                      value={offers.primary?.url || ''} 
                      onChange={(e) => setOffers({ ...offers, primary: { ...(offers.primary || defaultOffer), url: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Details (optional)</Label>
                    <Input 
                      placeholder="e.g., 30-minute call, no commitment" 
                      value={offers.primary?.details || ''} 
                      onChange={(e) => setOffers({ ...offers, primary: { ...(offers.primary || defaultOffer), details: e.target.value } })}
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Offer */}
              <div className="p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">Secondary Offer</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Offer Type</Label>
                    <select
                      value={offers.secondary?.type || 'trial'}
                      onChange={(e) => setOffers({ ...offers, secondary: { ...(offers.secondary || { ...defaultOffer, type: 'trial' }), type: e.target.value as BrandOffer['type'] } })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {OFFER_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>CTA Label</Label>
                    <Input 
                      placeholder="e.g., Start Free Trial" 
                      value={offers.secondary?.label || ''} 
                      onChange={(e) => setOffers({ ...offers, secondary: { ...(offers.secondary || { ...defaultOffer, type: 'trial' }), label: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL (optional)</Label>
                    <Input 
                      placeholder="e.g., /trial or https://..." 
                      value={offers.secondary?.url || ''} 
                      onChange={(e) => setOffers({ ...offers, secondary: { ...(offers.secondary || { ...defaultOffer, type: 'trial' }), url: e.target.value } })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Details (optional)</Label>
                    <Input 
                      placeholder="e.g., 14-day free trial, no credit card" 
                      value={offers.secondary?.details || ''} 
                      onChange={(e) => setOffers({ ...offers, secondary: { ...(offers.secondary || { ...defaultOffer, type: 'trial' }), details: e.target.value } })}
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Model */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="text-xs">Pricing Model</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Pricing Model</Label>
                    <select
                      value={offers.pricing_model || ''}
                      onChange={(e) => setOffers({ ...offers, pricing_model: e.target.value as BrandOffers['pricing_model'] || undefined })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select...</option>
                      {PRICING_MODELS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pricing Page URL (optional)</Label>
                    <Input 
                      placeholder="e.g., /pricing or https://..." 
                      value={offers.pricing_url || ''} 
                      onChange={(e) => setOffers({ ...offers, pricing_url: e.target.value || undefined })}
                    />
                  </div>
                </div>
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
              <CardDescription>Configure how your brand communicates in generated memos</CardDescription>
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

        {/* Memo Settings Section */}
        <section id="content" ref={(el) => { sectionRefs.current['content'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Memo Settings
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

        {/* Custom Domain Section */}
        <section id="custom-domain" ref={(el) => { sectionRefs.current['custom-domain'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Custom Domain
              </CardTitle>
              <CardDescription>
                Serve your memos from your own domain instead of {brand.subdomain}.contextmemo.com
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {customDomain ? (
                <>
                  {/* Current domain display */}
                  <div className={`flex items-center gap-3 p-4 rounded-lg border ${domainVerified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                    {domainVerified ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{customDomain}</p>
                        {domainVerified && <Badge className="bg-green-600 text-xs">Live</Badge>}
                        {!domainVerified && <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs">Pending DNS</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {domainVerified
                          ? `Your memos are live at https://${customDomain}`
                          : 'DNS verification pending — add the CNAME record below'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {domainVerified && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`https://${customDomain}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            Visit
                          </a>
                        </Button>
                      )}
                      {!domainVerified && (
                        <Button variant="outline" size="sm" onClick={handleVerifyDomain} disabled={domainVerifying}>
                          {domainVerifying ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                          Verify
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={handleRemoveDomain} disabled={domainRemoving} className="text-muted-foreground hover:text-destructive">
                        {domainRemoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {/* DNS Instructions */}
                  {!domainVerified && (
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                      <p className="text-sm font-medium">DNS Configuration Required</p>
                      <p className="text-sm text-muted-foreground">
                        Add a CNAME record in your DNS provider:
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-sm font-mono bg-white p-3 rounded border">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Type</p>
                          <p className="font-medium">CNAME</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Name</p>
                          <p className="font-medium">{customDomain.split('.')[0]}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Value</p>
                          <p className="font-medium">cname.vercel-dns.com</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        DNS changes can take up to 48 hours to propagate. Click &quot;Verify&quot; once configured.
                      </p>
                    </div>
                  )}

                  {/* Change domain */}
                  <Separator />
                  <div className="space-y-2">
                    <Label>Change Domain</Label>
                    <div className="flex gap-2">
                      <Input
                        value={customDomainInput}
                        onChange={(e) => setCustomDomainInput(e.target.value)}
                        placeholder="ai.yourdomain.com"
                      />
                      <Button
                        onClick={handleSetCustomDomain}
                        disabled={domainSaving || customDomainInput.trim().toLowerCase() === customDomain}
                        variant="outline"
                      >
                        {domainSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* No domain set — setup form */}
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-lg border text-center">
                      <Globe className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="font-medium mb-1">No custom domain configured</p>
                      <p className="text-sm text-muted-foreground mb-1">
                        Your memos are currently served at <a href={`https://${brand.subdomain}.contextmemo.com`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{brand.subdomain}.contextmemo.com</a>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Add a custom domain like <span className="font-mono">ai.{brand.domain || 'yourdomain.com'}</span> to serve memos from your own brand.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Custom Domain</Label>
                      <div className="flex gap-2">
                        <Input
                          value={customDomainInput}
                          onChange={(e) => setCustomDomainInput(e.target.value)}
                          placeholder={`ai.${brand.domain || 'yourdomain.com'}`}
                        />
                        <Button onClick={handleSetCustomDomain} disabled={domainSaving || !customDomainInput.trim()}>
                          {domainSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Set Domain
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Use a subdomain like <span className="font-mono">ai.yourdomain.com</span> or <span className="font-mono">resources.yourdomain.com</span>. You&apos;ll need to add a CNAME record in your DNS.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Subfolder Proxy Section */}
        <section id="subfolder-proxy" ref={(el) => { sectionRefs.current['subfolder-proxy'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Subfolder Proxy
                <Badge variant="outline" className="text-xs ml-1">Recommended for AI</Badge>
              </CardTitle>
              <CardDescription>
                Serve memos from a subfolder on your main domain (e.g., {brand.domain || 'acme.com'}/memos/) for maximum AI search visibility. Content on your root domain inherits its full domain authority.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {proxyOrigin ? (
                <>
                  {/* Current proxy config display */}
                  <div className="flex items-center gap-3 p-4 rounded-lg border bg-blue-50 border-blue-200">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium font-mono text-sm truncate">{proxyOrigin}{proxyBasePath}/</p>
                        <Badge className="bg-blue-600 text-xs">Configured</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Configure your reverse proxy using the instructions below to activate.
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleRemoveProxy} disabled={proxyRemoving} className="text-muted-foreground hover:text-destructive shrink-0">
                      {proxyRemoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>

                  {/* Setup instructions */}
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-5">
                    <div>
                      <p className="text-sm font-medium">Proxy Setup Instructions</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add a reverse proxy rule on your site to forward <span className="font-mono font-medium">{proxyBasePath}/*</span> to Context Memo. Choose your platform below.
                      </p>
                    </div>

                    {/* Vercel — Next.js */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Vercel &mdash; Next.js (next.config.js)</p>
                      <p className="text-xs text-muted-foreground">Add the <span className="font-mono">rewrites()</span> function inside your <span className="font-mono">next.config.js</span> or <span className="font-mono">next.config.ts</span> in the root of your repo, then redeploy.</p>
                      <pre className="text-xs font-mono bg-white p-3 rounded border overflow-x-auto whitespace-pre">
{`// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '${proxyBasePath}/:path*',
        destination: 'https://${brand.subdomain}.contextmemo.com/:path*',
      },
    ]
  },
}`}
                      </pre>
                    </div>

                    {/* Vercel — non-Next.js */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Vercel &mdash; Any framework (vercel.json)</p>
                      <p className="text-xs text-muted-foreground">If your Vercel project isn&apos;t Next.js, add this to <span className="font-mono">vercel.json</span> in the root of your repo, then redeploy.</p>
                      <pre className="text-xs font-mono bg-white p-3 rounded border overflow-x-auto whitespace-pre">
{`{
  "rewrites": [
    {
      "source": "${proxyBasePath}/:path*",
      "destination": "https://${brand.subdomain}.contextmemo.com/:path*"
    }
  ]
}`}
                      </pre>
                    </div>

                    {/* Netlify */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Netlify</p>
                      <p className="text-xs text-muted-foreground">Add to <span className="font-mono">netlify.toml</span> in your repo root, or use the <span className="font-mono">_redirects</span> file in your publish directory. Then redeploy.</p>
                      <pre className="text-xs font-mono bg-white p-3 rounded border overflow-x-auto whitespace-pre">
{`# netlify.toml
[[redirects]]
  from = "${proxyBasePath}/*"
  to = "https://${brand.subdomain}.contextmemo.com/:splat"
  status = 200
  force = true

# Or in _redirects file:
${proxyBasePath}/*  https://${brand.subdomain}.contextmemo.com/:splat  200!`}
                      </pre>
                    </div>

                    {/* Cloudflare */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Cloudflare Workers</p>
                      <p className="text-xs text-muted-foreground">Go to your Cloudflare dashboard &rarr; Workers &amp; Pages &rarr; Create Worker. Add a route for <span className="font-mono">{new URL(proxyOrigin).hostname}{proxyBasePath}/*</span> in Settings &rarr; Triggers.</p>
                      <pre className="text-xs font-mono bg-white p-3 rounded border overflow-x-auto whitespace-pre">
{`export default {
  async fetch(request) {
    const url = new URL(request.url)

    // Only proxy requests under ${proxyBasePath}
    if (!url.pathname.startsWith('${proxyBasePath}')) {
      return fetch(request)
    }

    url.hostname = '${brand.subdomain}.contextmemo.com'
    url.pathname = url.pathname.replace('${proxyBasePath}', '') || '/'

    return fetch(url, {
      headers: {
        ...Object.fromEntries(request.headers),
        'Host': '${brand.subdomain}.contextmemo.com',
        'X-Forwarded-Prefix': '${proxyBasePath}',
      },
    })
  },
}`}
                      </pre>
                    </div>

                    {/* Nginx */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nginx</p>
                      <p className="text-xs text-muted-foreground">Add this location block to your server config (usually <span className="font-mono">/etc/nginx/sites-available/your-site</span>), then run <span className="font-mono">sudo nginx -s reload</span>.</p>
                      <pre className="text-xs font-mono bg-white p-3 rounded border overflow-x-auto whitespace-pre">
{`location ${proxyBasePath}/ {
    proxy_pass https://${brand.subdomain}.contextmemo.com/;
    proxy_set_header Host ${brand.subdomain}.contextmemo.com;
    proxy_set_header X-Forwarded-Prefix ${proxyBasePath};
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_ssl_server_name on;
}`}
                      </pre>
                    </div>

                    {/* WordPress / Apache */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">WordPress / Apache (.htaccess)</p>
                      <p className="text-xs text-muted-foreground">Add to the <span className="font-mono">.htaccess</span> file in your WordPress root directory. Requires <span className="font-mono">mod_proxy</span> and <span className="font-mono">mod_proxy_http</span> enabled on your Apache server.</p>
                      <pre className="text-xs font-mono bg-white p-3 rounded border overflow-x-auto whitespace-pre">
{`# .htaccess — add BEFORE the WordPress rewrite rules
RewriteEngine On
RewriteRule ^${proxyBasePath.replace(/^\//, '')}(/.*)?$ https://${brand.subdomain}.contextmemo.com$1 [P,L]
ProxyPassReverse ${proxyBasePath}/ https://${brand.subdomain}.contextmemo.com/
RequestHeader set X-Forwarded-Prefix "${proxyBasePath}"`}
                      </pre>
                    </div>

                    {/* AWS CloudFront */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">AWS CloudFront</p>
                      <p className="text-xs text-muted-foreground">Add a new origin for <span className="font-mono">{brand.subdomain}.contextmemo.com</span> and a cache behavior for <span className="font-mono">{proxyBasePath}/*</span>. Use a CloudFront Function to strip the path prefix:</p>
                      <pre className="text-xs font-mono bg-white p-3 rounded border overflow-x-auto whitespace-pre">
{`// CloudFront Function (Viewer Request)
function handler(event) {
  var request = event.request
  request.uri = request.uri.replace('${proxyBasePath}', '') || '/'
  request.headers['x-forwarded-prefix'] = {
    value: '${proxyBasePath}'
  }
  return request
}`}
                      </pre>
                      <p className="text-xs text-muted-foreground">Steps: CloudFront &rarr; Distributions &rarr; your distribution &rarr; Origins &rarr; Create origin (<span className="font-mono">{brand.subdomain}.contextmemo.com</span>, HTTPS only) &rarr; Behaviors &rarr; Create behavior (path: <span className="font-mono">{proxyBasePath}/*</span>, origin: the new one, attach the function as Viewer Request).</p>
                    </div>

                    {/* Unsupported platforms note */}
                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg space-y-1">
                      <p className="text-xs font-medium text-slate-700">Webflow, Squarespace, Wix, or other hosted builders?</p>
                      <p className="text-xs text-muted-foreground">
                        These platforms don&apos;t support reverse proxying. Instead, use a <strong>Custom Domain</strong> (e.g., <span className="font-mono">ai.{brand.domain || 'yourdomain.com'}</span>) configured above, or publish memos to your blog via the <strong>HubSpot integration</strong>.
                      </p>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-xs text-amber-800">
                        <strong>Tip:</strong> For the best internal link generation, your proxy should forward the <span className="font-mono">X-Forwarded-Prefix: {proxyBasePath}</span> header. Vercel and Netlify handle this automatically. For Nginx, Cloudflare Workers, and Apache the config above includes it.
                      </p>
                    </div>
                  </div>

                  {/* Update config */}
                  <Separator />
                  <div className="space-y-3">
                    <Label>Update Configuration</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Website URL</p>
                        <Input
                          value={proxyOriginInput}
                          onChange={(e) => setProxyOriginInput(e.target.value)}
                          placeholder="https://acme.com"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Base Path</p>
                        <Input
                          value={proxyBasePathInput}
                          onChange={(e) => setProxyBasePathInput(e.target.value)}
                          placeholder="/memos"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleSaveProxy}
                      disabled={proxySaving || (proxyOriginInput.replace(/\/$/, '') === proxyOrigin && proxyBasePathInput.replace(/\/$/, '') === proxyBasePath)}
                      variant="outline"
                      size="sm"
                    >
                      {proxySaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                      Update
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* No proxy set — setup form */}
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-lg border text-center">
                      <Link2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="font-medium mb-1">Maximize AI Search Pickup</p>
                      <p className="text-sm text-muted-foreground mb-1">
                        Serve memos from your main domain (e.g., <span className="font-mono">{brand.domain || 'acme.com'}/memos/</span>) instead of a subdomain.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Content on your root domain inherits its full domain authority, making it significantly more likely to be cited by AI models like ChatGPT, Claude, and Perplexity.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label>Website URL</Label>
                          <Input
                            value={proxyOriginInput}
                            onChange={(e) => setProxyOriginInput(e.target.value)}
                            placeholder={`https://${brand.domain || 'acme.com'}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Base Path</Label>
                          <Input
                            value={proxyBasePathInput}
                            onChange={(e) => setProxyBasePathInput(e.target.value)}
                            placeholder="/memos"
                          />
                        </div>
                      </div>
                      <Button onClick={handleSaveProxy} disabled={proxySaving || !proxyOriginInput.trim()}>
                        {proxySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Configure Subfolder Proxy
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        After saving, you&apos;ll get platform-specific setup instructions (Vercel, Cloudflare, Nginx).
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Appearance Section */}
        <section id="appearance" ref={(el) => { sectionRefs.current['appearance'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how your branded memo pages look on {customDomain || `${brand.subdomain}.contextmemo.com`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Color Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Colors</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={brandTheme.primary_color || '#0F4C81'}
                        onChange={(e) => setBrandTheme(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="h-9 w-12 rounded border cursor-pointer"
                      />
                      <Input
                        value={brandTheme.primary_color || ''}
                        onChange={(e) => setBrandTheme(prev => ({ ...prev, primary_color: e.target.value }))}
                        placeholder="#0F4C81"
                        className="font-mono text-sm"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Links, accents, CTA buttons</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Light Variant</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={brandTheme.primary_light || '#E8F0F8'}
                        onChange={(e) => setBrandTheme(prev => ({ ...prev, primary_light: e.target.value }))}
                        className="h-9 w-12 rounded border cursor-pointer"
                      />
                      <Input
                        value={brandTheme.primary_light || ''}
                        onChange={(e) => setBrandTheme(prev => ({ ...prev, primary_light: e.target.value }))}
                        placeholder="#E8F0F8"
                        className="font-mono text-sm"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Background highlights, hover states</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Text Color</Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={brandTheme.primary_text || '#0F4C81'}
                        onChange={(e) => setBrandTheme(prev => ({ ...prev, primary_text: e.target.value }))}
                        className="h-9 w-12 rounded border cursor-pointer"
                      />
                      <Input
                        value={brandTheme.primary_text || ''}
                        onChange={(e) => setBrandTheme(prev => ({ ...prev, primary_text: e.target.value }))}
                        placeholder="#0F4C81"
                        className="font-mono text-sm"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Headings and emphasis text</p>
                  </div>
                </div>
                {/* Color preview */}
                {brandTheme.primary_color && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50">
                    <div className="flex gap-1.5">
                      <div className="h-8 w-8 rounded" style={{ backgroundColor: brandTheme.primary_color }} title="Primary" />
                      {brandTheme.primary_light && <div className="h-8 w-8 rounded border" style={{ backgroundColor: brandTheme.primary_light }} title="Light" />}
                      {brandTheme.primary_text && <div className="h-8 w-8 rounded" style={{ backgroundColor: brandTheme.primary_text }} title="Text" />}
                    </div>
                    <p className="text-xs text-muted-foreground">Preview of your brand colors</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Typography */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Typography</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Input
                      value={brandTheme.font_family || ''}
                      onChange={(e) => {
                        const fontFamily = e.target.value
                        setBrandTheme(prev => ({
                          ...prev,
                          font_family: fontFamily,
                          font_url: generateFontUrl(fontFamily),
                        }))
                      }}
                      placeholder="Plus Jakarta Sans"
                    />
                    <p className="text-xs text-muted-foreground">Google Fonts name — URL auto-generated</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Font URL <span className="text-muted-foreground font-normal">(auto)</span></Label>
                    <Input
                      value={brandTheme.font_url || ''}
                      onChange={(e) => setBrandTheme(prev => ({ ...prev, font_url: e.target.value }))}
                      placeholder="https://fonts.googleapis.com/css2?family=..."
                      className="text-xs"
                    />
                    <p className="text-xs text-muted-foreground">Override if using a custom font source</p>
                  </div>
                </div>
                {brandTheme.font_family && (
                  <p className="text-sm" style={{ fontFamily: `'${brandTheme.font_family}', system-ui, sans-serif` }}>
                    The quick brown fox jumps over the lazy dog — <strong>{brandTheme.font_family}</strong>
                  </p>
                )}
              </div>

              <Separator />

              {/* Branding */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Branding</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input
                      value={brandTheme.logo_url || ''}
                      onChange={(e) => setBrandTheme(prev => ({ ...prev, logo_url: e.target.value }))}
                      placeholder="https://yourdomain.com/logo.svg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Site Name</Label>
                    <Input
                      value={brandTheme.site_name || ''}
                      onChange={(e) => setBrandTheme(prev => ({ ...prev, site_name: e.target.value }))}
                      placeholder={brand.name}
                    />
                    <p className="text-xs text-muted-foreground">Displayed in header if no logo</p>
                  </div>
                </div>
                {brandTheme.logo_url && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={brandTheme.logo_url} alt="Logo preview" className="h-8 max-w-[200px] object-contain" />
                    <p className="text-xs text-muted-foreground">Logo preview</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Site URL</Label>
                  <Input
                    value={brandTheme.site_url || ''}
                    onChange={(e) => setBrandTheme(prev => ({ ...prev, site_url: e.target.value }))}
                    placeholder={`https://${brand.domain || 'yourdomain.com'}`}
                  />
                  <p className="text-xs text-muted-foreground">Where the logo/site name links to</p>
                </div>
              </div>

              <Separator />

              {/* CTA */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Call to Action</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CTA Button Text</Label>
                    <Input
                      value={brandTheme.cta_text || ''}
                      onChange={(e) => setBrandTheme(prev => ({ ...prev, cta_text: e.target.value }))}
                      placeholder="Request Access"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA Button URL</Label>
                    <Input
                      value={brandTheme.cta_url || ''}
                      onChange={(e) => setBrandTheme(prev => ({ ...prev, cta_url: e.target.value }))}
                      placeholder={`https://${brand.domain || 'yourdomain.com'}/#contact`}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Adds a branded CTA button in the header and at the bottom of each memo page.
                </p>
              </div>

              <Separator />

              {/* Save */}
              <div className="flex justify-end">
                <Button onClick={handleSaveTheme} disabled={themeSaving}>
                  {themeSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Appearance
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Personas Section */}
        <section id="personas" ref={(el) => { sectionRefs.current['personas'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Target Personas
                  </CardTitle>
                  <CardDescription>Buyer profiles by seniority and function - used for generating targeted prompts</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1" onClick={regeneratePersonas} disabled={personaLoading === 'regenerate'}>
                    {personaLoading === 'regenerate' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Refresh
                  </Button>
                  <Dialog open={addPersonaOpen} onOpenChange={setAddPersonaOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1"><Plus className="h-3 w-3" />Add</Button>
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
              </div>
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
              
            </CardContent>
          </Card>
        </section>

        {/* Deploy Memos Section */}
        <section id="deploy-memos" ref={(el) => { sectionRefs.current['deploy-memos'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Deploy Memos
                <Badge variant="secondary" className="text-xs">New</Badge>
              </CardTitle>
              <CardDescription>
                Automatically generate memos when you ship product updates. Connect your GitHub repo and every meaningful deploy creates a published article about what you shipped.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {githubLoading ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : githubIntegration ? (
                <div className="space-y-4">
                  {/* Status */}
                  <div className={`flex items-center gap-3 p-4 rounded-lg border ${githubIntegration.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <CheckCircle2 className={`h-5 w-5 ${githubIntegration.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <p className={`font-medium ${githubIntegration.enabled ? 'text-green-900' : 'text-gray-700'}`}>
                        {githubIntegration.enabled ? 'Deploy Memos Active' : 'Deploy Memos Paused'}
                      </p>
                      <p className={`text-sm ${githubIntegration.enabled ? 'text-green-700' : 'text-gray-500'}`}>
                        {githubIntegration.enabled ? 'Significant deploys will generate memos automatically' : 'Webhook is connected but memo generation is paused'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleGithubIntegration}
                      disabled={githubToggling}
                    >
                      {githubToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : githubIntegration.enabled ? 'Pause' : 'Enable'}
                    </Button>
                  </div>

                  {/* How it works */}
                  <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                    <p className="text-sm font-medium">How it works</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• New features, integrations, and significant improvements → memo generated</li>
                      <li>• Bug fixes, refactors, styling tweaks, internal changes → automatically skipped</li>
                      <li>• Each memo is published to your subdomain with the date of the actual deploy</li>
                    </ul>
                  </div>

                  <Separator />

                  {/* STEP 1: Import past deploys — easy path first */}
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-sm">Step 1: Import recent deploys</p>
                      <p className="text-sm text-muted-foreground">Enter your public GitHub repo to generate memos from up to the last 30 days of deploys. Each day&apos;s commits are analyzed — only significant product changes produce memos.</p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={repoInput || githubIntegration.repoFullName || ''}
                        onChange={(e) => setRepoInput(e.target.value)}
                        placeholder="owner/repo (e.g. acme/product)"
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        onClick={handleBackfill}
                        disabled={backfilling}
                      >
                        {backfilling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        {backfilling ? 'Analyzing...' : 'Import'}
                      </Button>
                    </div>
                    {githubIntegration.lastBackfillAt && !backfillResult && (
                      <p className="text-xs text-muted-foreground">Last imported: {new Date(githubIntegration.lastBackfillAt).toLocaleDateString()} · Can run once every 24 hours</p>
                    )}
                    {backfillResult && (
                      <Alert>
                        <AlertDescription>
                          <p className="text-sm">{backfillResult.message}</p>
                        </AlertDescription>
                      </Alert>
                    )}
                    <p className="text-xs text-muted-foreground">Analyzes up to 10 most recent deploy days · Public repos only · Private repo? <a href="mailto:support@contextmemo.com" className="underline">Contact us</a></p>
                  </div>

                  <Separator />

                  {/* STEP 2: Webhook for ongoing automation */}
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-sm">Step 2: Auto-generate on every future deploy</p>
                      <p className="text-sm text-muted-foreground">Add a webhook to your GitHub repo so memos are created automatically whenever you push to <code className="bg-muted px-1 rounded text-xs">main</code> or <code className="bg-muted px-1 rounded text-xs">master</code>.</p>
                    </div>

                    {/* Webhook URL */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Payload URL</Label>
                      <div className="flex gap-2">
                        <Input value={githubIntegration.webhookUrl} readOnly className="font-mono text-xs bg-muted" />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(githubIntegration.webhookUrl, 'url')}>
                          {urlCopied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Webhook Secret */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Secret</Label>
                      <div className="flex gap-2">
                        <Input
                          type={showWebhookSecret ? 'text' : 'password'}
                          value={githubIntegration.webhookSecret}
                          readOnly
                          className="font-mono text-xs bg-muted"
                        />
                        <Button variant="outline" size="icon" onClick={() => setShowWebhookSecret(!showWebhookSecret)}>
                          {showWebhookSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(githubIntegration.webhookSecret, 'secret')}>
                          {secretCopied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Setup steps */}
                    <div className="rounded-lg border p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">GitHub setup (one-time, ~2 min)</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-xs text-muted-foreground">
                        <li>Repo → <strong>Settings</strong> → <strong>Webhooks</strong> → <strong>Add webhook</strong></li>
                        <li>Paste the Payload URL above</li>
                        <li>Set Content type to <code className="bg-muted px-1 rounded">application/json</code></li>
                        <li>Paste the Secret above</li>
                        <li>Select <strong>Just the push event</strong> → <strong>Add webhook</strong></li>
                      </ol>
                    </div>
                  </div>

                  <Separator />

                  {/* Manage */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleRegenerateSecret} disabled={githubRegenerating}>
                        {githubRegenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Regenerate Secret
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDeleteGithubIntegration} disabled={githubDeleting}>
                      {githubDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                      Remove Integration
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="mx-auto w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <GitBranch className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="font-medium mb-2">Connect your GitHub repo</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                    Every time you deploy a significant product update, Context Memo will automatically generate a published article about what you shipped — making your product updates visible to AI search engines.
                  </p>
                  <Button onClick={handleCreateGithubIntegration} disabled={githubCreating}>
                    {githubCreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <GitBranch className="h-4 w-4 mr-2" />}
                    Enable Deploy Memos
                  </Button>
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
                <CardDescription>Push memos directly to your HubSpot blog</CardDescription>
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
                      <div><p className="font-medium">Auto-sync memos</p><p className="text-sm text-muted-foreground">Automatically push generated memos to HubSpot</p></div>
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
                      <div><p className="font-medium">Resync All Memos</p><p className="text-sm text-muted-foreground">Update all HubSpot posts with latest memo content, images, and author</p></div>
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
                      <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">Automatically push memos to your HubSpot blog.</p>
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
                      <Input value={searchConsoleConfig.bing?.site_url || (brand?.domain ? `https://${brand.domain}` : '')} onChange={(e) => setSearchConsoleConfig({ ...searchConsoleConfig, bing: { ...searchConsoleConfig.bing, site_url: e.target.value } })} />
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

        {/* Data & Privacy Section */}
        <section id="privacy" ref={(el) => { sectionRefs.current['privacy'] = el }} className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
              <CardDescription>Export or delete your account data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Button variant="outline" onClick={handleExportData} disabled={exporting}>
                  {exporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Download Data Export
                </Button>
              </div>
              <Alert variant="destructive">
                <AlertDescription>
                  Deleting your account removes all brands, memos, scans, and related data. This action cannot be undone.
                </AlertDescription>
              </Alert>
              <Button variant="destructive" onClick={handleDeleteAccount} disabled={deletingAccount}>
                {deletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Account
              </Button>
            </CardContent>
          </Card>
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
      
      {/* Sticky Save Bar - appears when there are unsaved changes */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50 px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              You have unsaved changes
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Discard
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-[#0EA5E9] hover:bg-[#0284C7]"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
