'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { ArrowRight, ChevronDown } from 'lucide-react'

// Cost configuration (cents)
const COSTS = {
  baseMonthly: 900,
  perPrompt: 40,
  perCompetitor: 100,
  perPersona: 200,
  perMarket: 150,
  perMemo: 150,
  perBrand: 1200,
  perModel: 300,
  baseModels: 2,
  basePersonas: 1,
  baseMarkets: 1,
}

// Fixed tier comparison
const FIXED_TIERS = [
  { name: 'Starter', price: 7900, prompts: 50, competitors: 5, personas: 2, markets: 2, memos: 5, brands: 1, models: 3 },
  { name: 'Growth', price: 19900, prompts: 150, competitors: 15, personas: 6, markets: 5, memos: -1, brands: 3, models: 4 },
]

export default function PricingCalculatorPage() {
  const [prompts, setPrompts] = useState(50)
  const [competitors, setCompetitors] = useState(5)
  const [personas, setPersonas] = useState(2)
  const [markets, setMarkets] = useState(2)
  const [memos, setMemos] = useState(10)
  const [brands, setBrands] = useState(1)
  const [models, setModels] = useState(2)

  const consumptionPrice = useMemo(() => {
    const base = COSTS.baseMonthly
    const promptCost = prompts * COSTS.perPrompt
    const competitorCost = competitors * COSTS.perCompetitor
    const personaCost = Math.max(0, personas - COSTS.basePersonas) * COSTS.perPersona
    const marketCost = Math.max(0, markets - COSTS.baseMarkets) * COSTS.perMarket
    const memoCost = memos * COSTS.perMemo
    const brandCost = Math.max(0, brands - 1) * COSTS.perBrand
    const modelCost = Math.max(0, models - COSTS.baseModels) * COSTS.perModel
    return base + promptCost + competitorCost + personaCost + marketCost + memoCost + brandCost + modelCost
  }, [prompts, competitors, personas, markets, memos, brands, models])

  const bestFixedTier = useMemo(() => {
    for (const tier of FIXED_TIERS) {
      if (
        (tier.prompts === -1 || prompts <= tier.prompts) &&
        (tier.competitors === -1 || competitors <= tier.competitors) &&
        (tier.personas === -1 || personas <= tier.personas) &&
        (tier.markets === -1 || markets <= tier.markets) &&
        (tier.memos === -1 || memos <= tier.memos) &&
        (tier.brands === -1 || brands <= tier.brands) &&
        (tier.models === -1 || models <= tier.models)
      ) {
        return tier
      }
    }
    return null
  }, [prompts, competitors, personas, markets, memos, brands, models])

  const savings = bestFixedTier ? bestFixedTier.price - consumptionPrice : 0

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(0)}`

  // Compact slider component
  const CompactSlider = ({ 
    label, 
    value, 
    onChange, 
    min, 
    max, 
    step,
    unit = '',
  }: { 
    label: string
    value: number
    onChange: (v: number) => void
    min: number
    max: number
    step: number
    unit?: string
  }) => (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-lg font-bold text-[#0EA5E9]">{value}{unit}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="text-[#0F172A]">Context</span>
              <span className="text-[#0EA5E9]">Memo</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/pricing" className="text-sm text-slate-600 hover:text-slate-900">
                Fixed Plans
              </Link>
              <Button asChild size="sm" className="bg-[#0EA5E9] hover:bg-[#0284C7]">
                <Link href="/request-access">Request Access</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Calculator - Above the Fold */}
      <section className="px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Title Row */}
          <div className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A]">
              Pay for what you use
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Adjust sliders to estimate your monthly cost
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Sliders - 2 columns on left */}
            <div className="lg:col-span-2">
              <Card className="border">
                <CardContent className="p-4">
                  <div className="grid md:grid-cols-2 gap-x-8 gap-y-5">
                    <CompactSlider
                      label="Prompts tracked"
                      value={prompts}
                      onChange={setPrompts}
                      min={10}
                      max={300}
                      step={10}
                    />
                    <CompactSlider
                      label="Competitors"
                      value={competitors}
                      onChange={setCompetitors}
                      min={1}
                      max={25}
                      step={1}
                    />
                    <CompactSlider
                      label="Target personas"
                      value={personas}
                      onChange={setPersonas}
                      min={1}
                      max={6}
                      step={1}
                    />
                    <CompactSlider
                      label="Markets"
                      value={markets}
                      onChange={setMarkets}
                      min={1}
                      max={8}
                      step={1}
                    />
                    <CompactSlider
                      label="AI models"
                      value={models}
                      onChange={setModels}
                      min={2}
                      max={4}
                      step={1}
                    />
                    <CompactSlider
                      label="Memos / month"
                      value={memos}
                      onChange={setMemos}
                      min={0}
                      max={50}
                      step={5}
                    />
                    <CompactSlider
                      label="Brands"
                      value={brands}
                      onChange={setBrands}
                      min={1}
                      max={10}
                      step={1}
                    />
                    {/* Pricing summary for small screens */}
                    <div className="md:hidden flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-[#0F172A]">
                          {formatPrice(consumptionPrice)}<span className="text-base font-normal text-slate-500">/mo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Price Card - Right side */}
            <div className="hidden lg:block">
              <Card className="border-2 border-[#0EA5E9] bg-gradient-to-br from-[#0EA5E9]/5 to-white h-full">
                <CardContent className="p-4 flex flex-col h-full">
                  {/* Price */}
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-[#0F172A]">
                      {formatPrice(consumptionPrice)}
                      <span className="text-base font-normal text-slate-500">/mo</span>
                    </div>
                    {savings > 0 && (
                      <p className="text-green-600 text-sm font-medium mt-1">
                        Save {formatPrice(savings)} vs {bestFixedTier?.name}
                      </p>
                    )}
                    {savings < 0 && bestFixedTier && (
                      <p className="text-amber-600 text-sm mt-1">
                        {bestFixedTier.name} ({formatPrice(bestFixedTier.price)}) may be better
                      </p>
                    )}
                  </div>

                  {/* Breakdown */}
                  <div className="text-xs space-y-1 border-t pt-3 flex-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Base</span>
                      <span>{formatPrice(COSTS.baseMonthly)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{prompts} prompts</span>
                      <span>{formatPrice(prompts * COSTS.perPrompt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{competitors} competitors</span>
                      <span>{formatPrice(competitors * COSTS.perCompetitor)}</span>
                    </div>
                    {personas > 1 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">+{personas - 1} persona</span>
                        <span>{formatPrice((personas - 1) * COSTS.perPersona)}</span>
                      </div>
                    )}
                    {markets > 1 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">+{markets - 1} market</span>
                        <span>{formatPrice((markets - 1) * COSTS.perMarket)}</span>
                      </div>
                    )}
                    {models > 2 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">+{models - 2} model</span>
                        <span>{formatPrice((models - 2) * COSTS.perModel)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-500">{memos} memos</span>
                      <span>{formatPrice(memos * COSTS.perMemo)}</span>
                    </div>
                    {brands > 1 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">+{brands - 1} brand</span>
                        <span>{formatPrice((brands - 1) * COSTS.perBrand)}</span>
                      </div>
                    )}
                  </div>

                  {/* CTA */}
                  <Button asChild className="w-full bg-[#0EA5E9] hover:bg-[#0284C7] mt-4" size="sm">
                    <Link href="/request-access">
                      Request Access
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                  <p className="text-center text-[10px] text-slate-400 mt-2">
                    Invite-only • Custom pricing available
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mobile CTA */}
          <div className="lg:hidden mt-4">
            <Button asChild className="w-full bg-[#0EA5E9] hover:bg-[#0284C7]">
              <Link href="/request-access">
                Request Access — {formatPrice(consumptionPrice)}/mo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Scroll hint */}
          <div className="text-center mt-6 text-slate-400">
            <p className="text-xs mb-1">Compare with fixed plans</p>
            <ChevronDown className="h-4 w-4 mx-auto animate-bounce" />
          </div>
        </div>
      </section>

      {/* Comparison Table - Below fold */}
      <section className="px-4 py-8 bg-white border-t">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-center mb-6">
            Compare with Fixed Plans
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            {/* Flexible */}
            <Card className="border-2 border-[#0EA5E9]">
              <CardContent className="p-4">
                <Badge className="mb-2 bg-[#0EA5E9]">Your Config</Badge>
                <div className="text-2xl font-bold">{formatPrice(consumptionPrice)}<span className="text-sm font-normal text-slate-500">/mo</span></div>
                <div className="mt-3 text-xs space-y-1 text-slate-600">
                  <div className="flex justify-between"><span>Prompts</span><span className="font-medium text-slate-900">{prompts}</span></div>
                  <div className="flex justify-between"><span>Competitors</span><span className="font-medium text-slate-900">{competitors}</span></div>
                  <div className="flex justify-between"><span>Personas</span><span className="font-medium text-slate-900">{personas}</span></div>
                  <div className="flex justify-between"><span>Markets</span><span className="font-medium text-slate-900">{markets}</span></div>
                  <div className="flex justify-between"><span>AI Models</span><span className="font-medium text-slate-900">{models}</span></div>
                  <div className="flex justify-between"><span>Memos</span><span className="font-medium text-slate-900">{memos}/mo</span></div>
                  <div className="flex justify-between"><span>Brands</span><span className="font-medium text-slate-900">{brands}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Fixed tiers */}
            {FIXED_TIERS.map((tier) => {
              const isBest = tier.name === bestFixedTier?.name
              return (
                <Card key={tier.name} className={isBest ? 'border-slate-400' : ''}>
                  <CardContent className="p-4">
                    {isBest && <Badge variant="outline" className="mb-2">Best Fit</Badge>}
                    {!isBest && <div className="mb-2 h-5" />}
                    <div className="text-2xl font-bold">{formatPrice(tier.price)}<span className="text-sm font-normal text-slate-500">/mo</span></div>
                    <div className="text-sm font-medium text-slate-700">{tier.name}</div>
                    <div className="mt-3 text-xs space-y-1 text-slate-600">
                      <div className="flex justify-between"><span>Prompts</span><span className={`font-medium ${prompts > tier.prompts ? 'text-red-500' : 'text-slate-900'}`}>{tier.prompts}</span></div>
                      <div className="flex justify-between"><span>Competitors</span><span className={`font-medium ${competitors > tier.competitors ? 'text-red-500' : 'text-slate-900'}`}>{tier.competitors}</span></div>
                      <div className="flex justify-between"><span>Personas</span><span className={`font-medium ${personas > tier.personas ? 'text-red-500' : 'text-slate-900'}`}>{tier.personas}</span></div>
                      <div className="flex justify-between"><span>Markets</span><span className={`font-medium ${markets > tier.markets ? 'text-red-500' : 'text-slate-900'}`}>{tier.markets}</span></div>
                      <div className="flex justify-between"><span>AI Models</span><span className={`font-medium ${models > tier.models ? 'text-red-500' : 'text-slate-900'}`}>{tier.models}</span></div>
                      <div className="flex justify-between"><span>Memos</span><span className={`font-medium ${tier.memos !== -1 && memos > tier.memos ? 'text-red-500' : 'text-slate-900'}`}>{tier.memos === -1 ? '∞' : `${tier.memos}/mo`}</span></div>
                      <div className="flex justify-between"><span>Brands</span><span className={`font-medium ${brands > tier.brands ? 'text-red-500' : 'text-slate-900'}`}>{tier.brands}</span></div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ - Collapsed */}
      <section className="px-4 py-8 bg-slate-50 border-t">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="font-semibold mb-2">Questions?</h3>
          <p className="text-sm text-slate-600 mb-4">
            Flexible pricing charges per prompt ($0.40), competitor ($1), persona ($2), market ($1.50), memo ($1.50), and brand ($12). 
            Base includes 2 AI models + 1 persona + 1 market for $9/mo.
          </p>
          <Link href="/pricing" className="text-sm text-[#0EA5E9] hover:underline">
            View fixed plans →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-4 px-4 border-t bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-slate-500">
          <div>© 2026 ContextMemo</div>
          <div className="flex gap-3">
            <Link href="/pricing" className="hover:text-slate-700">Fixed Plans</Link>
            <Link href="/changelog" className="hover:text-slate-700">Changelog</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
