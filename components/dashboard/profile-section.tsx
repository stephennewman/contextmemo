'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Loader2, RefreshCw, Plus, X, Target, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { PersonaManager } from '@/components/dashboard/persona-manager'
import { BrandContext, PromptTheme } from '@/lib/supabase/types'

interface Competitor {
  id: string
  name: string
  domain: string | null
  description: string | null
  auto_discovered: boolean
  is_active: boolean
}

interface ProfileSectionProps {
  brandId: string
  brandName: string
  brandDomain: string
  context: BrandContext | null
  contextExtractedAt: string | null
  hasContext: boolean
  competitors?: Competitor[]
}

export function ProfileSection({
  brandId,
  brandName,
  brandDomain,
  context,
  contextExtractedAt,
  hasContext,
  competitors = [],
}: ProfileSectionProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [newTheme, setNewTheme] = useState('')
  const [isAddingTheme, setIsAddingTheme] = useState(false)
  const [themes, setThemes] = useState<PromptTheme[]>(context?.prompt_themes || [])
  const initialTimestampRef = useRef<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // Sync themes with context when it updates
  useEffect(() => {
    if (context?.prompt_themes) {
      setThemes(context.prompt_themes)
    }
  }, [context?.prompt_themes])

  const addTheme = async () => {
    if (!newTheme.trim()) return
    
    // Check for duplicates
    if (themes.some(t => t.theme.toLowerCase() === newTheme.toLowerCase().trim())) {
      toast.error('This theme already exists')
      return
    }

    const theme: PromptTheme = {
      theme: newTheme.trim(),
      priority: 'high',
      auto_detected: false
    }
    
    const updatedThemes = [...themes, theme]
    setThemes(updatedThemes)
    setNewTheme('')
    setIsAddingTheme(false)
    
    // Save to database
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_themes',
          themes: updatedThemes
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save')
      }
      
      toast.success('Theme added')
      router.refresh()
    } catch {
      toast.error('Failed to save theme')
      setThemes(themes) // Revert on error
    }
  }

  const removeTheme = async (themeToRemove: string) => {
    const updatedThemes = themes.filter(t => t.theme !== themeToRemove)
    setThemes(updatedThemes)
    
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_themes',
          themes: updatedThemes
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to save')
      }
      
      toast.success('Theme removed')
      router.refresh()
    } catch {
      toast.error('Failed to remove theme')
      setThemes(themes) // Revert on error
    }
  }

  const togglePriority = async (themeText: string) => {
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
        body: JSON.stringify({ 
          action: 'update_themes',
          themes: updatedThemes
        }),
      })
      router.refresh()
    } catch {
      // Silent fail for priority toggle
    }
  }

  const refreshContext = async () => {
    // Store the current timestamp to detect when it changes
    initialTimestampRef.current = contextExtractedAt
    setIsRefreshing(true)
    
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extract_context' }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Context extraction failed')
      }

      toast.success('Re-analyzing website. Widgets will update when complete.', {
        duration: 5000,
      })
      
      // Poll for completion - check every 3 seconds
      pollIntervalRef.current = setInterval(async () => {
        router.refresh()
      }, 3000)

      // Stop polling after 45 seconds max
      setTimeout(() => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        setIsRefreshing(false)
      }, 45000)

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Context extraction failed')
      setIsRefreshing(false)
    }
  }

  // When contextExtractedAt changes (new data arrived), stop the loading state
  useEffect(() => {
    if (isRefreshing && contextExtractedAt && initialTimestampRef.current !== contextExtractedAt) {
      // New data arrived - stop polling and loading
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      setIsRefreshing(false)
      toast.success('Brand profile updated!', { duration: 3000 })
    }
  }, [contextExtractedAt, isRefreshing])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // Skeleton card component for loading state
  const SkeletonCard = ({ title, className = '' }: { title: string; className?: string }) => (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Brand Profile</h2>
          <p className="text-sm text-muted-foreground">
            All information extracted from {brandDomain}
            {contextExtractedAt && (
              <span> • Last updated {new Date(contextExtractedAt).toLocaleDateString()}</span>
            )}
          </p>
        </div>
        <Button 
          onClick={refreshContext} 
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {isRefreshing ? 'Refreshing...' : 'Refresh Context'}
        </Button>
      </div>

      {/* Show skeleton loaders when refreshing */}
      {isRefreshing ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonCard title="Company Information" />
          <SkeletonCard title="Products & Services" />
          <SkeletonCard title="Markets & Customers" />
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Target Personas</CardTitle>
              <CardDescription>Loading personas...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : hasContext && context ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Critical Prompt Themes - Full width at top */}
          <Card className="lg:col-span-2 border-2 border-[#0EA5E9]/30" style={{ borderLeft: '4px solid #0EA5E9' }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#0EA5E9]" />
                  <CardTitle className="text-base">Critical Prompt Themes</CardTitle>
                </div>
                {!isAddingTheme && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsAddingTheme(true)}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Theme
                  </Button>
                )}
              </div>
              <CardDescription>
                1-3 keyword clusters that define what prompts should target. Click priority to change.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add theme input */}
              {isAddingTheme && (
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="e.g., temperature monitoring, food safety..."
                    value={newTheme}
                    onChange={(e) => setNewTheme(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTheme()}
                    className="flex-1"
                    autoFocus
                  />
                  <Button size="sm" onClick={addTheme}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setIsAddingTheme(false); setNewTheme('') }}>
                    Cancel
                  </Button>
                </div>
              )}

              {/* Theme badges */}
              {themes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {themes
                    .sort((a, b) => {
                      const order = { high: 0, medium: 1, low: 2 }
                      return order[a.priority] - order[b.priority]
                    })
                    .map((theme, i) => (
                      <div 
                        key={i} 
                        className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${
                          theme.priority === 'high' 
                            ? 'bg-[#0EA5E9]/10 border-[#0EA5E9] text-[#0EA5E9]' 
                            : theme.priority === 'medium'
                            ? 'bg-[#F59E0B]/10 border-[#F59E0B] text-[#F59E0B]'
                            : 'bg-zinc-100 border-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <button 
                          onClick={() => togglePriority(theme.theme)}
                          className="font-medium text-sm hover:underline"
                          title={`Priority: ${theme.priority} (click to change)`}
                        >
                          {theme.theme}
                        </button>
                        {theme.auto_detected && (
                          <span title="Auto-detected">
                            <Sparkles className="h-3 w-3 opacity-60" />
                          </span>
                        )}
                        <button 
                          onClick={() => removeTheme(theme.theme)}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No prompt themes defined yet. Add keyword clusters like &quot;temperature monitoring&quot; or &quot;compliance automation&quot; to focus your prompts.
                </div>
              )}

              {/* Legend */}
              {themes.length > 0 && (
                <div className="flex items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#0EA5E9]"></span>
                    High priority
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
                    Medium
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-zinc-400"></span>
                    Low
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

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

          {/* Competitors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Competitors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {competitors.filter(c => c.is_active).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {competitors.filter(c => c.is_active).map((competitor) => (
                    <Badge key={competitor.id} variant="secondary" className="flex items-center gap-1">
                      {competitor.name}
                      {competitor.auto_discovered && (
                        <Sparkles className="h-3 w-3 opacity-60" />
                      )}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No competitors detected</p>
              )}
              {competitors.filter(c => !c.is_active).length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Excluded</label>
                  <div className="flex flex-wrap gap-2">
                    {competitors.filter(c => !c.is_active).map((competitor) => (
                      <Badge key={competitor.id} variant="outline" className="text-xs opacity-60">{competitor.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Markets & Customers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Markets & Customers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {context?.markets && context.markets.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Target Markets</label>
                  <div className="flex flex-wrap gap-2">
                    {context.markets.map((market: string, i: number) => (
                      <Badge key={i} variant="secondary">{market}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {context?.customers && context.customers.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">Notable Customers</label>
                  <div className="flex flex-wrap gap-2">
                    {context.customers.map((customer: string, i: number) => (
                      <Badge key={i} variant="outline">{customer}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {(!context?.markets || context.markets.length === 0) && (!context?.customers || context.customers.length === 0) && (
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

          {/* Offers/CTAs - only show if we have at least one offer or pricing info */}
          {context?.offers && (context.offers.primary || context.offers.secondary || context.offers.pricing_model) && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Offers & Pricing</CardTitle>
                <CardDescription>Calls-to-action detected from the website</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Primary Offer - only show if detected */}
                  {context.offers.primary && (
                    <div className="p-4 border rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-emerald-600 text-xs">Primary Offer</Badge>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize mb-2">
                        {context.offers.primary.type.replace('_', ' ')}
                      </Badge>
                      <div className="font-semibold text-lg">{context.offers.primary.label}</div>
                      {context.offers.primary.details && (
                        <p className="text-sm text-muted-foreground mt-1">{context.offers.primary.details}</p>
                      )}
                      {context.offers.primary.url && (
                        <a 
                          href={context.offers.primary.url.startsWith('http') ? context.offers.primary.url : `https://${brandDomain}${context.offers.primary.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-600 hover:underline mt-2 block truncate"
                        >
                          {context.offers.primary.url} →
                        </a>
                      )}
                    </div>
                  )}

                  {/* Secondary Offer - only show if detected */}
                  {context.offers.secondary && (
                    <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">Secondary Offer</Badge>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize mb-2">
                        {context.offers.secondary.type.replace('_', ' ')}
                      </Badge>
                      <div className="font-semibold text-lg">{context.offers.secondary.label}</div>
                      {context.offers.secondary.details && (
                        <p className="text-sm text-muted-foreground mt-1">{context.offers.secondary.details}</p>
                      )}
                      {context.offers.secondary.url && (
                        <a 
                          href={context.offers.secondary.url.startsWith('http') ? context.offers.secondary.url : `https://${brandDomain}${context.offers.secondary.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline mt-2 block truncate"
                        >
                          {context.offers.secondary.url} →
                        </a>
                      )}
                    </div>
                  )}

                  {/* Pricing - only show if detected */}
                  {context.offers.pricing_model && (
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">Pricing Model</Badge>
                      </div>
                      <div className="font-semibold text-lg capitalize">{context.offers.pricing_model.replace('_', ' ')}</div>
                      {context.offers.pricing_url && (
                        <a 
                          href={context.offers.pricing_url.startsWith('http') ? context.offers.pricing_url : `https://${brandDomain}${context.offers.pricing_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                        >
                          View pricing page →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No brand context extracted yet. Click &quot;Refresh Context&quot; to analyze {brandDomain}.
            </p>
            <Button 
              onClick={refreshContext} 
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh Context
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
