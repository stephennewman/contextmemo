'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Loader2, Save, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { BrandContext, BrandTone, HubSpotConfig, SearchConsoleConfig } from '@/lib/supabase/types'

interface Brand {
  id: string
  name: string
  domain: string
  subdomain: string
  verified: boolean
  auto_publish: boolean
  context: BrandContext
}

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

export default function BrandSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const brandId = params.brandId as string
  
  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
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
  const [hubspotTesting, setHubspotTesting] = useState(false)
  
  // Search Console integration state
  const [searchConsoleConfig, setSearchConsoleConfig] = useState<SearchConsoleConfig>(defaultSearchConsoleConfig)

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
        // Load brand tone with defaults
        setBrandTone({
          ...defaultBrandTone,
          ...context.brand_tone,
        })
        // Load HubSpot config with defaults
        setHubspotConfig({
          ...defaultHubSpotConfig,
          ...context.hubspot,
        })
        // Load Search Console config with defaults
        setSearchConsoleConfig({
          ...defaultSearchConsoleConfig,
          bing: {
            ...defaultSearchConsoleConfig.bing,
            ...context.search_console?.bing,
          },
        })
      }
      
      setLoading(false)
    }

    loadBrand()
  }, [brandId, router])

  const testHubSpotConnection = async () => {
    if (!hubspotConfig.access_token) {
      toast.error('Please enter your HubSpot access token first')
      return
    }

    setHubspotTesting(true)
    try {
      const response = await fetch('/api/integrations/hubspot/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: hubspotConfig.access_token }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Connection failed')
      }

      setHubspotBlogs(data.blogs || [])
      
      if (data.blogs?.length > 0) {
        toast.success(`Connected! Found ${data.blogs.length} blog(s)`)
        // Auto-select first blog if none selected
        if (!hubspotConfig.blog_id && data.blogs.length > 0) {
          setHubspotConfig({ ...hubspotConfig, blog_id: data.blogs[0].id })
        }
      } else {
        toast.warning('Connected, but no blogs found. Create a blog in HubSpot first.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connection failed')
      setHubspotBlogs([])
    } finally {
      setHubspotTesting(false)
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
      toast.success('Settings saved')
    }
  }

  const handleDelete = async () => {
    if (!brand) return
    
    const confirmed = window.confirm(
      'Are you sure you want to delete this brand? This action cannot be undone.'
    )
    
    if (!confirmed) return

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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <div className="h-8 w-40 bg-slate-200 animate-pulse rounded" />
          <div className="h-4 w-56 bg-slate-100 animate-pulse rounded mt-2" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <div className="h-5 w-24 bg-slate-200 animate-pulse rounded" />
              <div className="h-4 w-48 bg-slate-100 animate-pulse rounded" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((j) => (
                <div key={j} className="space-y-2">
                  <div className="h-4 w-20 bg-slate-100 animate-pulse rounded" />
                  <div className="h-10 w-full bg-slate-200 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!brand) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Brand Settings</h1>
        <p className="text-muted-foreground">
          Manage settings for {brand.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic brand information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Brand Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Domain</Label>
            <Input value={brand.domain} disabled />
            <p className="text-xs text-muted-foreground">
              Domain cannot be changed after creation
            </p>
          </div>
          <div className="space-y-2">
            <Label>Subdomain</Label>
            <Input value={`${brand.subdomain}.contextmemo.com`} disabled />
            <p className="text-xs text-muted-foreground">
              Subdomain cannot be changed after creation
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand Context</CardTitle>
          <CardDescription>
            Edit the extracted context about your brand. Add or correct information AI uses to understand your company.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Inc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="founded">Founded</Label>
              <Input
                id="founded"
                value={founded}
                onChange={(e) => setFounded(e.target.value)}
                placeholder="2020"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="headquarters">Headquarters</Label>
            <Input
              id="headquarters"
              value={headquarters}
              onChange={(e) => setHeadquarters(e.target.value)}
              placeholder="San Francisco, CA"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief description of what your company does"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="products">Products & Services</Label>
            <Input
              id="products"
              value={products}
              onChange={(e) => setProducts(e.target.value)}
              placeholder="Product 1, Product 2, Product 3"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of products or services
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="features">Key Features</Label>
            <Input
              id="features"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="AI-powered, Real-time analytics, SOC2 compliant"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of notable features or capabilities
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="markets">Target Markets</Label>
            <Input
              id="markets"
              value={markets}
              onChange={(e) => setMarkets(e.target.value)}
              placeholder="Enterprise SaaS, Healthcare, Financial Services"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of industries or markets you serve
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customers">Notable Customers</Label>
            <Input
              id="customers"
              value={customers}
              onChange={(e) => setCustomers(e.target.value)}
              placeholder="Company A, Company B, Company C"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of notable customers (if public)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="certifications">Certifications & Awards</Label>
            <Input
              id="certifications"
              value={certifications}
              onChange={(e) => setCertifications(e.target.value)}
              placeholder="SOC2, ISO 27001, G2 Leader 2025"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of certifications, compliance, or awards
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand Tone</CardTitle>
          <CardDescription>
            Configure how your brand communicates. These settings shape the voice and style of generated memos.
          </CardDescription>
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
                <option value="innovative">Innovative - Forward-thinking and creative</option>
                <option value="approachable">Approachable - Down-to-earth and relatable</option>
                <option value="bold">Bold - Direct and impactful</option>
                <option value="trustworthy">Trustworthy - Reliable and credible</option>
              </select>
              <p className="text-xs text-muted-foreground">
                How your brand&apos;s character comes across
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="formality">Formality</Label>
              <select
                id="formality"
                value={brandTone.formality || 'professional'}
                onChange={(e) => setBrandTone({ ...brandTone, formality: e.target.value as BrandTone['formality'] })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="formal">Formal - Corporate and structured</option>
                <option value="professional">Professional - Business-appropriate</option>
                <option value="conversational">Conversational - Natural and engaging</option>
                <option value="casual">Casual - Relaxed and informal</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Writing register for your content
              </p>
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
                <option value="beginner">Beginner - Explain everything simply</option>
                <option value="intermediate">Intermediate - Some assumed knowledge</option>
                <option value="expert">Expert - Technical depth OK</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Assumed knowledge level of your audience
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience_type">Audience Type</Label>
              <select
                id="audience_type"
                value={brandTone.audience_type || 'enterprise_buyers'}
                onChange={(e) => setBrandTone({ ...brandTone, audience_type: e.target.value as BrandTone['audience_type'] })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="enterprise_buyers">Enterprise Buyers - Decision makers at large orgs</option>
                <option value="developers">Developers - Technical practitioners</option>
                <option value="small_business">Small Business - SMB owners and managers</option>
                <option value="consumers">Consumers - End users and individuals</option>
                <option value="technical_decision_makers">Technical Decision Makers - CTOs, VPs of Eng</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Primary persona your content targets
              </p>
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
                <option value="concise">Concise - Bullet points, short and scannable</option>
                <option value="detailed">Detailed - Comprehensive and thorough</option>
                <option value="storytelling">Storytelling - Narrative and engaging</option>
                <option value="data_driven">Data-Driven - Stats and evidence-focused</option>
              </select>
              <p className="text-xs text-muted-foreground">
                How content is structured and presented
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jargon_usage">Industry Jargon</Label>
              <select
                id="jargon_usage"
                value={brandTone.jargon_usage || 'moderate'}
                onChange={(e) => setBrandTone({ ...brandTone, jargon_usage: e.target.value as BrandTone['jargon_usage'] })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="avoid">Avoid - Plain language, no jargon</option>
                <option value="moderate">Moderate - Some terms with explanation</option>
                <option value="embrace">Embrace - Use industry terminology freely</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Whether to use industry-specific terminology
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom_notes">Custom Tone Notes</Label>
            <Textarea
              id="custom_notes"
              value={brandTone.custom_notes || ''}
              onChange={(e) => setBrandTone({ ...brandTone, custom_notes: e.target.value })}
              rows={3}
              placeholder="e.g., Avoid using exclamation marks. Always emphasize security. Reference case studies when possible."
            />
            <p className="text-xs text-muted-foreground">
              Additional guidance for AI when generating content (optional)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Memo Settings</CardTitle>
          <CardDescription>
            Configure how memos are generated and published
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-publish memos</p>
              <p className="text-sm text-muted-foreground">
                Automatically publish generated memos without review
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoPublish}
                onChange={(e) => setAutoPublish(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>HubSpot Integration</CardTitle>
          <CardDescription>
            Push memos directly to your HubSpot blog with one click
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable HubSpot</p>
              <p className="text-sm text-muted-foreground">
                Connect your HubSpot account to push memos as blog posts
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hubspotConfig.enabled}
                onChange={(e) => setHubspotConfig({ ...hubspotConfig, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          
          {hubspotConfig.enabled && (
            <>
              <Separator />
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <p className="mb-2">To get your HubSpot credentials:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Go to HubSpot → Settings → Integrations → Private Apps</li>
                      <li>Create a new Private App with &quot;CMS Blog&quot; read/write scopes</li>
                      <li>Copy the Access Token</li>
                      <li>Find your Blog ID from any existing blog post URL or via the API</li>
                    </ol>
                    <a 
                      href="https://developers.hubspot.com/docs/api/private-apps" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
                    >
                      HubSpot Private Apps Documentation
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="hubspot_token">Access Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="hubspot_token"
                      type="password"
                      value={hubspotConfig.access_token || ''}
                      onChange={(e) => {
                        setHubspotConfig({ ...hubspotConfig, access_token: e.target.value })
                        setHubspotBlogs([]) // Clear blogs when token changes
                      }}
                      placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={testHubSpotConnection}
                      disabled={hubspotTesting || !hubspotConfig.access_token}
                    >
                      {hubspotTesting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Test & Fetch Blogs'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your HubSpot Private App access token. Click &quot;Test & Fetch Blogs&quot; to verify and load your blogs.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hubspot_blog_id">Target Blog</Label>
                  {hubspotBlogs.length > 0 ? (
                    <select
                      id="hubspot_blog_id"
                      value={hubspotConfig.blog_id || ''}
                      onChange={(e) => setHubspotConfig({ ...hubspotConfig, blog_id: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Select a blog...</option>
                      {hubspotBlogs.map((blog) => (
                        <option key={blog.id} value={blog.id}>
                          {blog.name} (ID: {blog.id})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="hubspot_blog_id"
                      value={hubspotConfig.blog_id || ''}
                      onChange={(e) => setHubspotConfig({ ...hubspotConfig, blog_id: e.target.value })}
                      placeholder="Click 'Test & Fetch Blogs' to load your blogs"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {hubspotBlogs.length > 0 
                      ? 'Select the blog where memos will be published'
                      : 'Enter your access token and click "Test & Fetch Blogs" to see available blogs'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="font-medium">Auto-sync to HubSpot</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically push memos to HubSpot when published
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hubspotConfig.auto_sync || false}
                      onChange={(e) => setHubspotConfig({ ...hubspotConfig, auto_sync: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bing Webmaster Integration</CardTitle>
          <CardDescription>
            Track which search queries drive traffic to your memos. Since ChatGPT uses Bing for real-time search, this data indicates AI discoverability.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Bing Webmaster</p>
              <p className="text-sm text-muted-foreground">
                Sync search query data from Bing Webmaster Tools
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={searchConsoleConfig.bing?.enabled || false}
                onChange={(e) => setSearchConsoleConfig({ 
                  ...searchConsoleConfig, 
                  bing: { ...searchConsoleConfig.bing, enabled: e.target.checked } 
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          
          {searchConsoleConfig.bing?.enabled && (
            <>
              <Separator />
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <p className="mb-2">To get your Bing Webmaster API key:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Go to <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Bing Webmaster Tools</a></li>
                      <li>Add and verify your site if not already done</li>
                      <li>Go to Settings → API Access</li>
                      <li>Generate an API Key</li>
                    </ol>
                    <a 
                      href="https://learn.microsoft.com/en-us/bingwebmaster/getting-access" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
                    >
                      Bing Webmaster API Documentation
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="bing_api_key">API Key</Label>
                  <Input
                    id="bing_api_key"
                    type="password"
                    value={searchConsoleConfig.bing?.api_key || ''}
                    onChange={(e) => setSearchConsoleConfig({ 
                      ...searchConsoleConfig, 
                      bing: { ...searchConsoleConfig.bing, api_key: e.target.value } 
                    })}
                    placeholder="Your Bing Webmaster API key"
                  />
                  <p className="text-xs text-muted-foreground">
                    One API key works for all your verified sites
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bing_site_url">Site URL</Label>
                  <Input
                    id="bing_site_url"
                    value={searchConsoleConfig.bing?.site_url || `https://${brand.subdomain}.contextmemo.com`}
                    onChange={(e) => setSearchConsoleConfig({ 
                      ...searchConsoleConfig, 
                      bing: { ...searchConsoleConfig.bing, site_url: e.target.value } 
                    })}
                    placeholder="https://example.contextmemo.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    The site URL as verified in Bing Webmaster Tools (usually your memo subdomain)
                  </p>
                </div>

                {searchConsoleConfig.bing?.last_synced_at && (
                  <p className="text-xs text-muted-foreground">
                    Last synced: {new Date(searchConsoleConfig.bing.last_synced_at).toLocaleString()}
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Search Console Integration</CardTitle>
          <CardDescription>
            Track which Google searches drive traffic to your memos. Google AI Overviews uses Google search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {searchConsoleConfig.google?.enabled && searchConsoleConfig.google?.refresh_token ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">Google Search Console Connected</span>
              </div>
              {searchConsoleConfig.google.connected_at && (
                <p className="text-sm text-muted-foreground">
                  Connected: {new Date(searchConsoleConfig.google.connected_at).toLocaleDateString()}
                </p>
              )}
              {searchConsoleConfig.google.last_synced_at && (
                <p className="text-sm text-muted-foreground">
                  Last synced: {new Date(searchConsoleConfig.google.last_synced_at).toLocaleString()}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="google_site_url">Site Property</Label>
                <Input
                  id="google_site_url"
                  value={searchConsoleConfig.google?.site_url || ''}
                  onChange={(e) => setSearchConsoleConfig({ 
                    ...searchConsoleConfig, 
                    google: { ...searchConsoleConfig.google, site_url: e.target.value } 
                  })}
                  placeholder="sc-domain:example.com or https://example.com/"
                />
                <p className="text-xs text-muted-foreground">
                  Your verified property URL from Google Search Console
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setSearchConsoleConfig({
                  ...searchConsoleConfig,
                  google: { enabled: false }
                })}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your Google Search Console to see which queries drive traffic from Google search.
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  window.location.href = `/api/auth/google-search-console/authorize?brandId=${brandId}`
                }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Connect Google Search Console
              </Button>
              <p className="text-xs text-muted-foreground">
                You&apos;ll be redirected to Google to authorize read-only access to your Search Console data.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Separator />

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for this brand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Deleting this brand will remove all memos, prompts, scan results, 
              and competitors. This action cannot be undone.
            </AlertDescription>
          </Alert>
          <Button 
            variant="destructive" 
            className="mt-4"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Brand
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
