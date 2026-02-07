'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, X, Pencil, ChevronDown, ChevronUp, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { PersonaManager } from '@/components/dashboard/persona-manager'
import { CorporatePositioningSection } from '@/components/dashboard/corporate-positioning'
import { BrandContext, MarketFocus, BrandOffer, BrandOffers, PromptTheme } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

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

interface ProfileSectionProps {
  brandId: string
  brandName: string
  brandDomain: string
  context: BrandContext | null
  contextExtractedAt: string | null
  hasContext: boolean
}

export function ProfileSection({
  brandId,
  brandName,
  brandDomain,
  context,
  contextExtractedAt,
  hasContext,
}: ProfileSectionProps) {
  const router = useRouter()

  // Market focus state
  const [marketFocus, setMarketFocus] = useState<MarketFocus[]>(() => {
    if (context?.market_focus && context.market_focus.length > 0) {
      return context.market_focus
    } else if (context?.markets && context.markets.length > 0) {
      return context.markets.map(m => ({ name: m, focus: 50 }))
    }
    return []
  })
  const [newMarket, setNewMarket] = useState('')
  const [isAddingMarket, setIsAddingMarket] = useState(false)
  const [savingMarkets, setSavingMarkets] = useState(false)

  // Offers state
  const [offers, setOffers] = useState<BrandOffers>(context?.offers || {})
  const [editingOffers, setEditingOffers] = useState(false)
  const [savingOffers, setSavingOffers] = useState(false)
  const defaultOffer: BrandOffer = { type: 'demo', label: '' }

  // Sync market focus when context changes
  useEffect(() => {
    if (context?.market_focus && context.market_focus.length > 0) {
      setMarketFocus(context.market_focus)
    } else if (context?.markets && context.markets.length > 0) {
      setMarketFocus(context.markets.map(m => ({ name: m, focus: 50 })))
    }
  }, [context?.market_focus, context?.markets])

  // Sync offers when context changes
  useEffect(() => {
    setOffers(context?.offers || {})
  }, [context?.offers])

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

  const saveMarketFocus = async () => {
    setSavingMarkets(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('brands')
        .update({
          context: {
            ...context,
            markets: marketFocus.map(m => m.name),
            market_focus: marketFocus,
          },
          context_edited_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', brandId)

      if (error) throw error
      toast.success('Markets saved')
      router.refresh()
    } catch (error) {
      toast.error('Failed to save markets')
      console.error(error)
    } finally {
      setSavingMarkets(false)
    }
  }

  // Offers save handler
  const saveOffers = async () => {
    setSavingOffers(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('brands')
        .update({
          context: {
            ...context,
            offers: (offers.primary || offers.secondary || offers.pricing_model) ? offers : undefined,
          },
          context_edited_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', brandId)

      if (error) throw error
      toast.success('Offers saved')
      setEditingOffers(false)
      router.refresh()
    } catch (error) {
      toast.error('Failed to save offers')
      console.error(error)
    } finally {
      setSavingOffers(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>
                All information extracted from {brandDomain}
                {contextExtractedAt && (
                  <span> · Last updated {new Date(contextExtractedAt).toLocaleDateString()}</span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {hasContext && context ? (
        <div className="space-y-6">
          {/* Corporate Positioning - Full width, at the top */}
          <CorporatePositioningSection 
            positioning={context?.corporate_positioning} 
            brandName={brandName}
            brandId={brandId} 
          />
          
          {/* Existing profile cards */}
          <div className="grid gap-6 lg:grid-cols-2">
          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Name</label>
                  <p className="font-medium">{context?.company_name || brandName}</p>
                </div>
                {context?.description && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
                    <p className="text-sm">{context.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {context?.founded && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Founded</label>
                      <p className="text-sm">{context.founded}</p>
                    </div>
                  )}
                  {context?.headquarters && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Headquarters</label>
                      <p className="text-sm">{context.headquarters}</p>
                    </div>
                  )}
                </div>
                {context?.brand_voice && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block">Brand Voice</label>
                    <Badge variant="outline" className="capitalize mt-1">{context.brand_voice}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Products & Services */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Products & Services</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {context?.products && context.products.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {context.products.map((product: string, i: number) => (
                    <Badge key={i} variant="secondary">{product}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No products detected</p>
              )}
              {context?.features && context.features.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Key Features</label>
                  <div className="flex flex-wrap gap-2">
                    {context.features.map((feature: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{feature}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Key Themes - Focus areas for content generation */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Key Themes</CardTitle>
                  <CardDescription>
                    Focus areas driving prompt and content strategy
                  </CardDescription>
                </div>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const themes: PromptTheme[] = context?.prompt_themes || []
                if (themes.length === 0) {
                  return <p className="text-sm text-muted-foreground">No themes detected yet. Run a context refresh to extract themes.</p>
                }
                const highPriority = themes.filter(t => t.priority === 'high')
                const mediumPriority = themes.filter(t => t.priority === 'medium')
                const lowPriority = themes.filter(t => t.priority === 'low')
                return (
                  <div className="space-y-3">
                    {highPriority.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">High Priority</label>
                        <div className="flex flex-wrap gap-2">
                          {highPriority.map((theme, i) => (
                            <Badge key={i} className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800 hover:bg-red-100">
                              {theme.theme}
                              {theme.category && <span className="ml-1 opacity-60 text-[10px]">· {theme.category}</span>}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {mediumPriority.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Medium Priority</label>
                        <div className="flex flex-wrap gap-2">
                          {mediumPriority.map((theme, i) => (
                            <Badge key={i} variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                              {theme.theme}
                              {theme.category && <span className="ml-1 opacity-60 text-[10px]">· {theme.category}</span>}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {lowPriority.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Low Priority</label>
                        <div className="flex flex-wrap gap-2">
                          {lowPriority.map((theme, i) => (
                            <Badge key={i} variant="outline" className="text-muted-foreground">
                              {theme.theme}
                              {theme.category && <span className="ml-1 opacity-60 text-[10px]">· {theme.category}</span>}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        {themes.length} theme{themes.length !== 1 ? 's' : ''} · {themes.filter(t => t.auto_detected).length} auto-detected
                      </p>
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          {/* Markets & Customers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Markets & Customers</CardTitle>
                  <CardDescription>Adjust focus to weight content generation</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {!isAddingMarket && (
                    <Button variant="outline" size="sm" onClick={() => setIsAddingMarket(true)} className="gap-1">
                      <Plus className="h-3 w-3" />Add
                    </Button>
                  )}
                  {marketFocus.length > 0 && (
                    <Button variant="default" size="sm" onClick={saveMarketFocus} disabled={savingMarkets} className="gap-1">
                      {savingMarkets && <Loader2 className="h-3 w-3 animate-spin" />}
                      Save
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAddingMarket && (
                <div className="flex gap-2 mb-3">
                  <Input 
                    placeholder="e.g., Food & Beverage, Healthcare..." 
                    value={newMarket} 
                    onChange={(e) => setNewMarket(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && addMarket()} 
                    className="flex-1 h-9" 
                    autoFocus 
                  />
                  <Button size="sm" onClick={addMarket}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setIsAddingMarket(false); setNewMarket('') }}>Cancel</Button>
                </div>
              )}

              {/* Target Markets with Focus Sliders */}
              {marketFocus.length > 0 && (
                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block">Target Markets</label>
                  {marketFocus.map((market) => (
                    <div key={market.name} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{market.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            market.focus >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' :
                            market.focus >= 40 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {market.focus}%
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeMarket(market.name)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-6">0%</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={market.focus}
                          onChange={(e) => updateMarketFocus(market.name, parseInt(e.target.value))}
                          className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <span className="text-[10px] text-muted-foreground w-8">100%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Notable Customers (read-only) */}
              {context?.customers && context.customers.length > 0 && (
                <div className="pt-3 border-t">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Notable Customers</label>
                  <div className="flex flex-wrap gap-2">
                    {context.customers.map((customer: string, i: number) => (
                      <Badge key={i} variant="outline">{customer}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {marketFocus.length === 0 && (!context?.customers || context.customers.length === 0) && (
                <p className="text-sm text-muted-foreground">No markets or customers detected</p>
              )}
            </CardContent>
          </Card>


          {/* Target Personas - Full width */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Target Personas</CardTitle>
              <CardDescription>Buyer profiles by seniority (executive/manager/specialist) and function - used for generating targeted prompts</CardDescription>
            </CardHeader>
            <CardContent>
              <PersonaManager 
                brandId={brandId}
                personas={context?.personas || []}
                disabledPersonas={context?.disabled_personas || []}
              />
            </CardContent>
          </Card>

          {/* Offers/CTAs - always show with edit capability */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Offers & Pricing</CardTitle>
                  <CardDescription>Calls-to-action used in generated content</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {editingOffers ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingOffers(false); setOffers(context?.offers || {}) }}>
                        Cancel
                      </Button>
                      <Button variant="default" size="sm" onClick={saveOffers} disabled={savingOffers} className="gap-1">
                        {savingOffers && <Loader2 className="h-3 w-3 animate-spin" />}
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setEditingOffers(true)} className="gap-1">
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editingOffers ? (
                <div className="space-y-4">
                  {/* Primary Offer - Editable */}
                  <div className="p-4 border rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-emerald-600 text-xs">Primary Offer</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Offer Type</Label>
                        <select
                          value={offers.primary?.type || 'demo'}
                          onChange={(e) => setOffers({ ...offers, primary: { ...(offers.primary || defaultOffer), type: e.target.value as BrandOffer['type'] } })}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                          {OFFER_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">CTA Label</Label>
                        <Input 
                          placeholder="e.g., Book a Demo" 
                          value={offers.primary?.label || ''} 
                          onChange={(e) => setOffers({ ...offers, primary: { ...(offers.primary || defaultOffer), label: e.target.value } })}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">URL</Label>
                        <Input 
                          placeholder="e.g., /demo" 
                          value={offers.primary?.url || ''} 
                          onChange={(e) => setOffers({ ...offers, primary: { ...(offers.primary || defaultOffer), url: e.target.value } })}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Details</Label>
                        <Input 
                          placeholder="e.g., 30-min call" 
                          value={offers.primary?.details || ''} 
                          onChange={(e) => setOffers({ ...offers, primary: { ...(offers.primary || defaultOffer), details: e.target.value } })}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Secondary Offer - Editable */}
                  <div className="p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className="text-xs">Secondary Offer</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Offer Type</Label>
                        <select
                          value={offers.secondary?.type || 'trial'}
                          onChange={(e) => setOffers({ ...offers, secondary: { ...(offers.secondary || { ...defaultOffer, type: 'trial' }), type: e.target.value as BrandOffer['type'] } })}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                          {OFFER_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">CTA Label</Label>
                        <Input 
                          placeholder="e.g., Start Free Trial" 
                          value={offers.secondary?.label || ''} 
                          onChange={(e) => setOffers({ ...offers, secondary: { ...(offers.secondary || { ...defaultOffer, type: 'trial' }), label: e.target.value } })}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">URL</Label>
                        <Input 
                          placeholder="e.g., /trial" 
                          value={offers.secondary?.url || ''} 
                          onChange={(e) => setOffers({ ...offers, secondary: { ...(offers.secondary || { ...defaultOffer, type: 'trial' }), url: e.target.value } })}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Details</Label>
                        <Input 
                          placeholder="e.g., 14-day free" 
                          value={offers.secondary?.details || ''} 
                          onChange={(e) => setOffers({ ...offers, secondary: { ...(offers.secondary || { ...defaultOffer, type: 'trial' }), details: e.target.value } })}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing Model - Editable */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="text-xs">Pricing Model</Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Model</Label>
                        <select
                          value={offers.pricing_model || ''}
                          onChange={(e) => setOffers({ ...offers, pricing_model: e.target.value as BrandOffers['pricing_model'] || undefined })}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                          <option value="">Select...</option>
                          {PRICING_MODELS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Pricing Page URL</Label>
                        <Input 
                          placeholder="e.g., /pricing" 
                          value={offers.pricing_url || ''} 
                          onChange={(e) => setOffers({ ...offers, pricing_url: e.target.value || undefined })}
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Primary Offer - Display */}
                  {offers.primary?.label ? (
                    <div className="p-4 border rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-emerald-600 text-xs">Primary Offer</Badge>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize mb-2">
                        {offers.primary.type.replace('_', ' ')}
                      </Badge>
                      <div className="font-semibold text-lg">{offers.primary.label}</div>
                      {offers.primary.details && (
                        <p className="text-sm text-muted-foreground mt-1">{offers.primary.details}</p>
                      )}
                      {offers.primary.url && (
                        <a 
                          href={offers.primary.url.startsWith('http') ? offers.primary.url : `https://${brandDomain}${offers.primary.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-600 hover:underline mt-2 block truncate"
                        >
                          {offers.primary.url} →
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 border rounded-lg border-dashed flex items-center justify-center text-muted-foreground text-sm">
                      No primary offer set
                    </div>
                  )}

                  {/* Secondary Offer - Display */}
                  {offers.secondary?.label ? (
                    <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">Secondary Offer</Badge>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize mb-2">
                        {offers.secondary.type.replace('_', ' ')}
                      </Badge>
                      <div className="font-semibold text-lg">{offers.secondary.label}</div>
                      {offers.secondary.details && (
                        <p className="text-sm text-muted-foreground mt-1">{offers.secondary.details}</p>
                      )}
                      {offers.secondary.url && (
                        <a 
                          href={offers.secondary.url.startsWith('http') ? offers.secondary.url : `https://${brandDomain}${offers.secondary.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline mt-2 block truncate"
                        >
                          {offers.secondary.url} →
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 border rounded-lg border-dashed flex items-center justify-center text-muted-foreground text-sm">
                      No secondary offer set
                    </div>
                  )}

                  {/* Pricing - Display */}
                  {offers.pricing_model ? (
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">Pricing Model</Badge>
                      </div>
                      <div className="font-semibold text-lg capitalize">{offers.pricing_model.replace('_', ' ')}</div>
                      {offers.pricing_url && (
                        <a 
                          href={offers.pricing_url.startsWith('http') ? offers.pricing_url : `https://${brandDomain}${offers.pricing_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                        >
                          View pricing page →
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 border rounded-lg border-dashed flex items-center justify-center text-muted-foreground text-sm">
                      No pricing model set
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social Links */}
          {context?.social_links && Object.keys(context.social_links).length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Social & External Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {context.social_links.linkedin && (
                    <a href={context.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border rounded-lg hover:bg-muted/50 text-sm">
                      LinkedIn →
                    </a>
                  )}
                  {context.social_links.twitter && (
                    <a href={context.social_links.twitter} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border rounded-lg hover:bg-muted/50 text-sm">
                      Twitter/X →
                    </a>
                  )}
                  {context.social_links.crunchbase && (
                    <a href={context.social_links.crunchbase} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border rounded-lg hover:bg-muted/50 text-sm">
                      Crunchbase →
                    </a>
                  )}
                  {context.social_links.wikipedia && (
                    <a href={context.social_links.wikipedia} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border rounded-lg hover:bg-muted/50 text-sm">
                      Wikipedia →
                    </a>
                  )}
                  {context.social_links.github && (
                    <a href={context.social_links.github} target="_blank" rel="noopener noreferrer" className="px-3 py-2 border rounded-lg hover:bg-muted/50 text-sm">
                      GitHub →
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No brand context extracted yet. Context will be extracted during onboarding.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
