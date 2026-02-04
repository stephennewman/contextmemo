import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Building2,
  Package,
  Target,
  Users,
  MapPin,
  Calendar,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Sparkles,
  DollarSign,
  Link2,
} from 'lucide-react'
import type { BrandContext } from '@/lib/supabase/types'
import { ProfileRefreshButton } from '@/components/v2/profile/profile-refresh-button'
import { PersonaCards } from '@/components/v2/profile/persona-cards'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function V2ProfilePage({ params }: Props) {
  const { brandId } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get brand with context
  const { data: brand, error } = await serviceClient
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single()

  if (error || !brand) {
    notFound()
  }

  // Get competitors
  const { data: competitors } = await serviceClient
    .from('competitors')
    .select('id, name, domain, description, auto_discovered, is_active')
    .eq('brand_id', brandId)
    .order('is_active', { ascending: false })

  const context = brand.context as BrandContext | null
  const hasContext = context && Object.keys(context).length > 0

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/v2/brands/${brandId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">Brand Profile</h1>
              <p className="text-sm text-muted-foreground">
                Information extracted from {brand.domain}
                {brand.context_extracted_at && (
                  <> • Updated {new Date(brand.context_extracted_at).toLocaleDateString()}</>
                )}
              </p>
            </div>
          </div>
          <ProfileRefreshButton brandId={brandId} />
        </div>
      </div>

      {/* Content */}
      {hasContext && context ? (
        <div className="p-6 space-y-8 max-w-5xl">
          {/* Company Overview - Hero Section */}
          <section className="bg-gradient-to-br from-slate-50 to-white rounded-xl border p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#0F172A] flex items-center justify-center flex-shrink-0">
                <Building2 className="h-6 w-6 text-[#0EA5E9]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-[#0F172A] mb-1">
                  {context.company_name || brand.name}
                </h2>
                {context.description && (
                  <p className="text-muted-foreground mb-4 leading-relaxed">
                    {context.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {context.founded && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Founded {context.founded}
                    </span>
                  )}
                  {context.headquarters && (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {context.headquarters}
                    </span>
                  )}
                  {context.brand_voice && (
                    <Badge variant="outline" className="capitalize">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {context.brand_voice} voice
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Two Column Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Products & Services */}
            <section className="border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-purple-500" />
                <h3 className="font-semibold text-[#0F172A]">Products & Services</h3>
              </div>
              {context.products && context.products.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {context.products.map((product: string, i: number) => (
                      <Badge key={i} className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                        {product}
                      </Badge>
                    ))}
                  </div>
                  {context.features && context.features.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Key Features
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {context.features.map((feature: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No products detected</p>
              )}
            </section>

            {/* Markets & Customers */}
            <section className="border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold text-[#0F172A]">Markets & Customers</h3>
              </div>
              <div className="space-y-4">
                {context.markets && context.markets.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Target Markets
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {context.markets.map((market: string, i: number) => (
                        <Badge key={i} className="bg-green-100 text-green-700 hover:bg-green-100">
                          {market}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {context.customers && context.customers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Notable Customers
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {context.customers.map((customer: string, i: number) => (
                        <Badge key={i} variant="outline">
                          {customer}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(!context.markets || context.markets.length === 0) && 
                 (!context.customers || context.customers.length === 0) && (
                  <p className="text-sm text-muted-foreground">No markets or customers detected</p>
                )}
              </div>
            </section>

            {/* Competitors */}
            <section className="border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-orange-500" />
                <h3 className="font-semibold text-[#0F172A]">Competitors</h3>
              </div>
              {competitors && competitors.filter(c => c.is_active).length > 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {competitors.filter(c => c.is_active).slice(0, 8).map((competitor) => (
                      <Badge 
                        key={competitor.id} 
                        className="bg-orange-100 text-orange-700 hover:bg-orange-100 flex items-center gap-1"
                      >
                        {competitor.name}
                        {competitor.auto_discovered && (
                          <Sparkles className="h-3 w-3 opacity-60" />
                        )}
                      </Badge>
                    ))}
                    {competitors.filter(c => c.is_active).length > 8 && (
                      <Badge variant="outline">
                        +{competitors.filter(c => c.is_active).length - 8} more
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No competitors tracked</p>
              )}
            </section>

            {/* Offers & Pricing */}
            {context.offers && (context.offers.primary || context.offers.secondary || context.offers.pricing_model) && (
              <section className="border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-semibold text-[#0F172A]">Offers & Pricing</h3>
                </div>
                <div className="space-y-3">
                  {context.offers.primary && (
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                      <div>
                        <p className="text-xs font-medium text-emerald-600 mb-0.5">Primary Offer</p>
                        <p className="font-medium text-emerald-900">{context.offers.primary.label}</p>
                      </div>
                      {context.offers.primary.url && (
                        <a 
                          href={context.offers.primary.url.startsWith('http') ? context.offers.primary.url : `https://${brand.domain}${context.offers.primary.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  )}
                  {context.offers.secondary && (
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="text-xs font-medium text-blue-600 mb-0.5">Secondary Offer</p>
                        <p className="font-medium text-blue-900">{context.offers.secondary.label}</p>
                      </div>
                      {context.offers.secondary.url && (
                        <a 
                          href={context.offers.secondary.url.startsWith('http') ? context.offers.secondary.url : `https://${brand.domain}${context.offers.secondary.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  )}
                  {context.offers.pricing_model && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {context.offers.pricing_model.replace('_', ' ')} pricing
                      </Badge>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Personas - Full Width */}
          {context.personas && context.personas.length > 0 && (
            <section className="border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#0EA5E9]" />
                  <h3 className="font-semibold text-[#0F172A]">Target Personas</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for generating targeted prompts
                </p>
              </div>
              <PersonaCards 
                brandId={brandId}
                personas={context.personas} 
                disabledPersonas={context.disabled_personas || []}
              />
            </section>
          )}

          {/* Social Links */}
          {context.social_links && Object.keys(context.social_links).length > 0 && (
            <section className="border rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="h-5 w-5 text-slate-500" />
                <h3 className="font-semibold text-[#0F172A]">External Links</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {context.social_links.linkedin && (
                  <a 
                    href={context.social_links.linkedin} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-3 py-2 border rounded-lg hover:bg-slate-50 text-sm flex items-center gap-2"
                  >
                    LinkedIn
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {context.social_links.twitter && (
                  <a 
                    href={context.social_links.twitter} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-3 py-2 border rounded-lg hover:bg-slate-50 text-sm flex items-center gap-2"
                  >
                    Twitter/X
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {context.social_links.crunchbase && (
                  <a 
                    href={context.social_links.crunchbase} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-3 py-2 border rounded-lg hover:bg-slate-50 text-sm flex items-center gap-2"
                  >
                    Crunchbase
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {context.social_links.wikipedia && (
                  <a 
                    href={context.social_links.wikipedia} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-3 py-2 border rounded-lg hover:bg-slate-50 text-sm flex items-center gap-2"
                  >
                    Wikipedia
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {context.social_links.github && (
                  <a 
                    href={context.social_links.github} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="px-3 py-2 border rounded-lg hover:bg-slate-50 text-sm flex items-center gap-2"
                  >
                    GitHub
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-[#0F172A] mb-2">No Profile Data Yet</h2>
            <p className="text-muted-foreground mb-6">
              Click "Refresh Profile" to analyze {brand.domain} and extract company information, 
              products, personas, and more.
            </p>
            <ProfileRefreshButton brandId={brandId} />
          </div>
        </div>
      )}
    </div>
  )
}
