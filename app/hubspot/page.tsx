'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { 
  Zap,
  ArrowRight,
  Search,
  Users,
  Target,
  FileText,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Bot,
  X,
  Lock
} from 'lucide-react'

// Consumption-based pricing (monthly)
const PRICING = {
  baseMonthly: 29, // Base platform fee
  perCompetitor: 5,
  perPersona: 8,
  perPrompt: 0.50,
  perContentWeekly: 12, // Per piece of content published per week
}

export default function HubSpotLandingPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  // Pricing sliders
  const [competitors, setCompetitors] = useState(5)
  const [personas, setPersonas] = useState(3)
  const [prompts, setPrompts] = useState(50)
  const [contentPerWeek, setContentPerWeek] = useState(5)

  // Calculate monthly price
  const monthlyPrice = useMemo(() => {
    const base = PRICING.baseMonthly
    const competitorCost = competitors * PRICING.perCompetitor
    const personaCost = personas * PRICING.perPersona
    const promptCost = prompts * PRICING.perPrompt
    const contentCost = contentPerWeek * PRICING.perContentWeekly * 4 // 4 weeks per month
    return Math.round(base + competitorCost + personaCost + promptCost + contentCost)
  }, [competitors, personas, prompts, contentPerWeek])

  const discountedPrice = Math.round(monthlyPrice * 0.5)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    setIsSubmitting(true)
    // TODO: Save email to database/waitlist
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSubmitted(true)
    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Header - Minimal, no prominent auth links */}
      <header className="sticky top-0 bg-[#0F172A]/95 backdrop-blur-sm z-40 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-[#FF5C35]" />
            <span className="font-black text-xl tracking-tight">CONTEXT MEMO</span>
            <span className="text-xs font-bold text-[#FF5C35] border border-[#FF5C35] px-2 py-0.5 ml-2">FOR HUBSPOT</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wide">
            <Link href="#how-it-works" className="text-slate-400 hover:text-white transition-colors">HOW IT WORKS</Link>
            <Link href="#pricing" className="text-slate-400 hover:text-white transition-colors">PRICING</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-b from-[#FF5C35]/10 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="max-w-4xl">
            {/* Beta Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF5C35]/20 border border-[#FF5C35]/30 text-[#FF5C35] text-sm font-bold tracking-wide mb-8">
              <Lock className="h-4 w-4" />
              INVITE-ONLY BETA • 50% OFF PRODUCTION PRICING
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[0.95]">
              FILL THE{" "}
              <span className="text-[#FF5C35]">GAPS</span>{" "}
              IN YOUR CONTENT STRATEGY AUTOMATICALLY
            </h1>
            
            <p className="mt-8 text-xl md:text-2xl text-slate-400 max-w-2xl leading-relaxed">
              Discover which high-intent prompts your personas are asking—and where 
              AI cites your competitors instead of you. Then auto-publish content 
              that fills those gaps directly to HubSpot.
            </p>

            {/* Key differentiator */}
            <div className="mt-8 p-6 border border-white/10 bg-white/5">
              <p className="text-lg text-slate-300 italic">
                "We're not trying to generate the world's best content. AI content is a dime a dozen. 
                What we do is <span className="text-[#FF5C35] font-semibold not-italic">identify the gaps</span>—the 
                prompts where your brand should be mentioned but isn't—and fill them with content 
                based on <span className="text-white font-semibold not-italic">what we actually know about your brand.</span>"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 bg-white text-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">THE PROBLEM</h2>
            <p className="mt-4 text-xl text-slate-600">
              Your competitors are getting cited. You're not.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-0 border-2 border-[#0F172A]">
            <div className="p-10 border-b-2 md:border-b-0 md:border-r-2 border-[#0F172A]">
              <div className="text-6xl md:text-7xl font-black text-[#FF5C35]">65%</div>
              <p className="mt-4 text-lg font-semibold text-slate-600">
                of B2B buyers now use AI to research products
              </p>
            </div>
            <div className="p-10 border-b-2 md:border-b-0 md:border-r-2 border-[#0F172A]">
              <div className="text-6xl md:text-7xl font-black text-[#FF5C35]">3-5</div>
              <p className="mt-4 text-lg font-semibold text-slate-600">
                brands mentioned per AI recommendation
              </p>
            </div>
            <div className="p-10">
              <div className="text-6xl md:text-7xl font-black text-[#FF5C35]">0</div>
              <p className="mt-4 text-lg font-semibold text-slate-600">
                traffic if AI doesn't mention your brand
              </p>
            </div>
          </div>

          <div className="mt-12 p-8 bg-slate-100 border-2 border-[#0F172A]">
            <div className="flex items-center gap-3 mb-4">
              <Bot className="h-6 w-6 text-[#FF5C35]" />
              <span className="font-bold text-sm tracking-wide text-slate-500">EXAMPLE PROMPT YOUR BUYER ASKS:</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold italic text-slate-700">
              "What's the best temperature monitoring software for restaurant compliance?"
            </p>
            <p className="mt-4 text-lg text-slate-500">
              <span className="font-semibold">AI Response:</span> "...SafetyCulture, Monnit, and Zenput are leading options..."
            </p>
            <p className="mt-2 text-lg text-[#FF5C35] font-semibold">
              ← Your brand wasn't mentioned. We fix that.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">HOW IT WORKS</h2>
            <p className="mt-4 text-xl text-slate-400">
              From brand analysis to published content in HubSpot
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0 border-2 border-white/20">
            {/* Step 1 */}
            <div className="p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-white/20">
              <div className="w-16 h-16 bg-[#FF5C35] text-white flex items-center justify-center font-black text-2xl mb-6">
                1
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-5 w-5 text-[#FF5C35]" />
                <h3 className="font-black text-lg">UNDERSTAND</h3>
              </div>
              <p className="text-slate-400">
                We learn your brand, your market, your competitors, your personas, and the 
                high-intent prompts your buyers are actually searching.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-white/20">
              <div className="w-16 h-16 bg-[#FF5C35] text-white flex items-center justify-center font-black text-2xl mb-6">
                2
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-[#FF5C35]" />
                <h3 className="font-black text-lg">FIND THE GAPS</h3>
              </div>
              <p className="text-slate-400">
                We test 9 AI models with those prompts. We find where your competitors get 
                cited—and you don't. These are your content gaps.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-white/20">
              <div className="w-16 h-16 bg-[#FF5C35] text-white flex items-center justify-center font-black text-2xl mb-6">
                3
              </div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-[#FF5C35]" />
                <h3 className="font-black text-lg">GENERATE & PUBLISH</h3>
              </div>
              <p className="text-slate-400">
                We auto-generate content based on your brand—not made up out of thin air. 
                Then we publish it directly to your HubSpot blog.
              </p>
            </div>
            
            {/* Step 4 */}
            <div className="p-8">
              <div className="w-16 h-16 bg-[#FF5C35] text-white flex items-center justify-center font-black text-2xl mb-6">
                4
              </div>
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw className="h-5 w-5 text-[#FF5C35]" />
                <h3 className="font-black text-lg">MONITOR & IMPROVE</h3>
              </div>
              <p className="text-slate-400">
                We continuously monitor if you're now getting cited. We validate what's working. 
                We find new gaps. The cycle never stops.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* See It In Action */}
      <section className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">SEE IT IN ACTION</h2>
            <p className="mt-4 text-xl text-slate-400">
              Here's what the platform looks like
            </p>
          </div>

          {/* Step 1: Understand */}
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-[#FF5C35] text-white flex items-center justify-center font-black text-xl shrink-0">
                1
              </div>
              <div>
                <h3 className="font-black text-2xl">UNDERSTAND YOUR BRAND</h3>
                <p className="text-slate-400">We extract your brand context, competitors, markets, and personas</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <Image 
                  src="/screenshot-1.png" 
                  alt="Dashboard with brand profile, citation score, and key metrics" 
                  width={800} 
                  height={500}
                  className="w-full h-auto"
                />
                <p className="p-4 text-sm text-slate-400">Brand dashboard with citation score, prompts tracked, and profile</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <Image 
                  src="/screenshot-2.png" 
                  alt="Competitors, markets, and target personas" 
                  width={800} 
                  height={500}
                  className="w-full h-auto"
                />
                <p className="p-4 text-sm text-slate-400">Auto-discovered competitors, target markets, and buyer personas</p>
              </div>
            </div>
          </div>

          {/* Step 2: Find the Gaps */}
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-[#FF5C35] text-white flex items-center justify-center font-black text-xl shrink-0">
                2
              </div>
              <div>
                <h3 className="font-black text-2xl">FIND THE GAPS</h3>
                <p className="text-slate-400">Test 9 AI models and see exactly where competitors win</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <Image 
                  src="/screenshot-3.png" 
                  alt="Scan results showing AI model responses" 
                  width={600} 
                  height={400}
                  className="w-full h-auto"
                />
                <p className="p-4 text-sm text-slate-400">Scan results across GPT, Claude, Perplexity, Grok and more</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <Image 
                  src="/screenshot-4.png" 
                  alt="Prompt performance by persona" 
                  width={600} 
                  height={400}
                  className="w-full h-auto"
                />
                <p className="p-4 text-sm text-slate-400">Prompt performance filtered by persona and intent</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <Image 
                  src="/screenshot-5.png" 
                  alt="Share of voice competitor comparison" 
                  width={600} 
                  height={400}
                  className="w-full h-auto"
                />
                <p className="p-4 text-sm text-slate-400">Share of voice—see who dominates AI mentions</p>
              </div>
            </div>
          </div>

          {/* Step 3: Generate & Publish */}
          <div className="mb-20">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-[#FF5C35] text-white flex items-center justify-center font-black text-xl shrink-0">
                3
              </div>
              <div>
                <h3 className="font-black text-2xl">GENERATE & PUBLISH TO HUBSPOT</h3>
                <p className="text-slate-400">AI-optimized content pushed directly to your HubSpot blog</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <Image 
                  src="/screenshot-7.png" 
                  alt="Memo editor with AI optimization score" 
                  width={800} 
                  height={500}
                  className="w-full h-auto"
                />
                <p className="p-4 text-sm text-slate-400">Content editor with 100% AI optimization score</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <Image 
                  src="/screenshot-8.png" 
                  alt="HubSpot integration connection" 
                  width={800} 
                  height={500}
                  className="w-full h-auto"
                />
                <p className="p-4 text-sm text-slate-400">One-click HubSpot connection—content pushed as drafts</p>
              </div>
            </div>
          </div>

          {/* Step 4: Monitor & Improve */}
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-[#FF5C35] text-white flex items-center justify-center font-black text-xl shrink-0">
                4
              </div>
              <div>
                <h3 className="font-black text-2xl">MONITOR & IMPROVE</h3>
                <p className="text-slate-400">Stay notified as content goes live and citations improve</p>
              </div>
            </div>
            <div className="max-w-2xl">
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <Image 
                  src="/screenshot-6.png" 
                  alt="Notifications showing published memos" 
                  width={800} 
                  height={400}
                  className="w-full h-auto"
                />
                <p className="p-4 text-sm text-slate-400">Real-time notifications as content gets published</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes This Different */}
      <section className="py-24 bg-white text-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">NOT JUST ANOTHER AI CONTENT TOOL</h2>
            <p className="mt-4 text-xl text-slate-600 max-w-3xl mx-auto">
              You can generate AI content in ChatGPT and paste it into HubSpot. So what makes this different?
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* What we don't do */}
            <div className="p-8 border-2 border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3 mb-6">
                <X className="h-8 w-8 text-red-500" />
                <h3 className="font-black text-xl">WHAT WE DON'T DO</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                  <span className="text-slate-600">Generate generic content from thin air</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                  <span className="text-slate-600">Guess what topics you should write about</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                  <span className="text-slate-600">Create content that's not grounded in your brand</span>
                </li>
                <li className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                  <span className="text-slate-600">Leave you to figure out distribution</span>
                </li>
              </ul>
            </div>

            {/* What we do */}
            <div className="p-8 border-2 border-[#FF5C35] bg-[#FF5C35]/5">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="h-8 w-8 text-[#FF5C35]" />
                <h3 className="font-black text-xl">WHAT WE DO</h3>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#FF5C35] mt-0.5 shrink-0" />
                  <span className="text-slate-700 font-medium">Identify specific prompts where you're losing to competitors</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#FF5C35] mt-0.5 shrink-0" />
                  <span className="text-slate-700 font-medium">Generate content based on real facts from your website</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#FF5C35] mt-0.5 shrink-0" />
                  <span className="text-slate-700 font-medium">Target high-intent prompts your personas actually ask</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#FF5C35] mt-0.5 shrink-0" />
                  <span className="text-slate-700 font-medium">Auto-publish to HubSpot with proper structure and tags</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Calculator */}
      <section id="pricing" className="py-24 bg-[#0F172A]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">USAGE-BASED PRICING</h2>
            <p className="mt-4 text-xl text-slate-400">
              Pay for what you track. Scale up or down anytime.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Sliders */}
            <div className="lg:col-span-3">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8 space-y-8">
                  {/* Competitors */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-[#FF5C35]" />
                        <span className="font-semibold text-white">Competitors to track</span>
                      </div>
                      <span className="text-2xl font-black text-[#FF5C35]">{competitors}</span>
                    </div>
                    <Slider
                      value={[competitors]}
                      onValueChange={([v]) => setCompetitors(v)}
                      min={1}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500">${PRICING.perCompetitor}/competitor/month</p>
                  </div>

                  {/* Personas */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#FF5C35]" />
                        <span className="font-semibold text-white">Target personas</span>
                      </div>
                      <span className="text-2xl font-black text-[#FF5C35]">{personas}</span>
                    </div>
                    <Slider
                      value={[personas]}
                      onValueChange={([v]) => setPersonas(v)}
                      min={1}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500">${PRICING.perPersona}/persona/month</p>
                  </div>

                  {/* Prompts */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-[#FF5C35]" />
                        <span className="font-semibold text-white">Prompts to monitor</span>
                      </div>
                      <span className="text-2xl font-black text-[#FF5C35]">{prompts}</span>
                    </div>
                    <Slider
                      value={[prompts]}
                      onValueChange={([v]) => setPrompts(v)}
                      min={10}
                      max={500}
                      step={10}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500">${PRICING.perPrompt}/prompt/month</p>
                  </div>

                  {/* Content per week */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#FF5C35]" />
                        <span className="font-semibold text-white">Content published weekly</span>
                      </div>
                      <span className="text-2xl font-black text-[#FF5C35]">{contentPerWeek}</span>
                    </div>
                    <Slider
                      value={[contentPerWeek]}
                      onValueChange={([v]) => setContentPerWeek(v)}
                      min={1}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500">${PRICING.perContentWeekly}/article/week</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Price Display */}
            <div className="lg:col-span-2">
              <Card className="bg-[#FF5C35]/10 border-[#FF5C35] border-2 h-full">
                <CardContent className="p-8 flex flex-col h-full">
                  <div className="text-center mb-6">
                    <p className="text-sm font-bold text-[#FF5C35] tracking-wide mb-2">YOUR ESTIMATED PRICE</p>
                    <div className="text-5xl font-black text-white line-through opacity-50">
                      ${monthlyPrice}
                    </div>
                    <div className="text-6xl font-black text-[#FF5C35]">
                      ${discountedPrice}
                    </div>
                    <p className="text-slate-400 mt-1">/month</p>
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-[#FF5C35]/20 text-[#FF5C35] text-sm font-bold">
                      <Sparkles className="h-4 w-4" />
                      50% BETA DISCOUNT
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-6 mt-auto">
                    <p className="text-sm text-slate-400 mb-4 text-center">
                      Lock in this price for 12 months
                    </p>
                    {!submitted ? (
                      <form onSubmit={handleSubmit} className="space-y-3">
                        <Input
                          type="email"
                          placeholder="your@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 h-12"
                        />
                        <Button 
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-[#FF5C35] hover:bg-[#FF5C35]/90 text-white font-bold h-12"
                        >
                          {isSubmitting ? 'JOINING...' : 'JOIN BETA'}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </form>
                    ) : (
                      <div className="text-center py-2">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-[#FF5C35]" />
                        <p className="text-sm text-white font-semibold">You're on the list!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="py-12 bg-[#0F172A] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-[#FF5C35]" />
              <span className="font-black tracking-tight">CONTEXT MEMO</span>
            </div>
            <p className="text-sm text-slate-500 font-semibold">
              © 2026 CONTEXT MEMO
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
