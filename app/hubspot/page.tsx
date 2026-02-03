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
  Lock,
  Quote
} from 'lucide-react'

// Consumption-based pricing (monthly) - nice round numbers
const PRICING = {
  baseMonthly: 50,
  perCompetitor: 10,
  perPersona: 10,
  perPrompt: 1,
  perContentWeekly: 20,
}

export default function HubSpotLandingPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  // Pricing sliders - round number steps
  const [competitors, setCompetitors] = useState(5)
  const [personas, setPersonas] = useState(3)
  const [prompts, setPrompts] = useState(50)
  const [contentPerWeek, setContentPerWeek] = useState(5)

  // Calculate monthly price - rounds to nearest 10
  const monthlyPrice = useMemo(() => {
    const base = PRICING.baseMonthly
    const competitorCost = competitors * PRICING.perCompetitor
    const personaCost = personas * PRICING.perPersona
    const promptCost = prompts * PRICING.perPrompt
    const contentCost = contentPerWeek * PRICING.perContentWeekly * 4
    const total = base + competitorCost + personaCost + promptCost + contentCost
    return Math.round(total / 10) * 10 // Round to nearest 10
  }, [competitors, personas, prompts, contentPerWeek])

  const discountedPrice = Math.round(monthlyPrice * 0.5 / 10) * 10 // Round to nearest 10

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
      {/* Header */}
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
              IN YOUR CONTENT STRATEGY{" "}
              <span className="text-[#FF5C35]">AUTOMATICALLY</span>
            </h1>
            
            <p className="mt-8 text-xl md:text-2xl text-slate-400 max-w-2xl leading-relaxed">
              Your competitors are getting cited by AI. You're not. The reason? 
              There are gaps in your content that they're filling—and AI is picking it up.
            </p>

            {/* Key differentiator */}
            <div className="mt-8 p-6 border border-white/10 bg-white/5">
              <p className="text-lg text-slate-300">
                <span className="text-[#FF5C35] font-semibold">The solution:</span> Automatically 
                surface content gaps, generate content in your brand's voice, and publish 
                directly to HubSpot. Make sure AI gets the memo.
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
            <p className="mt-4 text-xl text-slate-600 max-w-2xl mx-auto">
              AI models recommend your competitors because they have content that answers buyer questions. You don't.
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

          {/* Example Prompts */}
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <Bot className="h-6 w-6 text-[#FF5C35]" />
              <span className="font-bold text-sm tracking-wide text-slate-500">PROMPTS YOUR BUYERS ARE ASKING:</span>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-6 bg-slate-100 border-l-4 border-[#FF5C35]">
                <p className="text-lg font-medium italic text-slate-700">
                  "What software can help me with compliance tracking?"
                </p>
              </div>
              <div className="p-6 bg-slate-100 border-l-4 border-[#FF5C35]">
                <p className="text-lg font-medium italic text-slate-700">
                  "I need a tool to automate our audit process"
                </p>
              </div>
              <div className="p-6 bg-slate-100 border-l-4 border-[#FF5C35]">
                <p className="text-lg font-medium italic text-slate-700">
                  "Which platforms integrate with our existing systems?"
                </p>
              </div>
              <div className="p-6 bg-slate-100 border-l-4 border-[#FF5C35]">
                <p className="text-lg font-medium italic text-slate-700">
                  "Compare the top solutions for my industry"
                </p>
              </div>
            </div>
            
            <p className="mt-6 text-center text-lg text-[#FF5C35] font-semibold">
              If you don't have content addressing these, AI won't mention you.
            </p>
          </div>
        </div>
      </section>

      {/* The Solution - Dashboard */}
      <section className="py-24 bg-[#0F172A] overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">THE SOLUTION</h2>
            <p className="mt-4 text-lg text-slate-400">
              Make sure AI gets the memo about your brand
            </p>
          </div>

          {/* Main Screenshot with Browser Frame */}
          <div className="relative">
            {/* Browser Chrome */}
            <div className="bg-slate-800 rounded-t-xl px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-slate-700 rounded px-3 py-1 text-xs text-slate-400 max-w-md mx-auto text-center">
                  app.contextmemo.com/brands/your-brand
                </div>
              </div>
            </div>
            {/* Screenshot */}
            <div className="bg-white rounded-b-xl overflow-hidden shadow-2xl shadow-black/50">
              <Image 
                src="/screenshot-hero.png" 
                alt="Context Memo dashboard showing brand profile, citation score, and AI visibility metrics" 
                width={1200} 
                height={750}
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <div className="text-center">
              <div className="text-4xl font-black text-[#FF5C35] mb-2">9</div>
              <p className="text-slate-400 text-sm">AI models scanned daily</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-[#FF5C35] mb-2">100+</div>
              <p className="text-slate-400 text-sm">Prompts monitored per brand</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-[#FF5C35] mb-2">1-click</div>
              <p className="text-slate-400 text-sm">HubSpot publish</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-white text-[#0F172A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">HOW IT WORKS</h2>
            <p className="mt-4 text-xl text-slate-600">
              From brand analysis to published content in HubSpot
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0 border-2 border-[#0F172A]">
            {/* Step 1 */}
            <div className="p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-[#0F172A]">
              <div className="w-16 h-16 bg-[#FF5C35] text-white flex items-center justify-center font-black text-2xl mb-6">
                1
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-5 w-5 text-[#FF5C35]" />
                <h3 className="font-black text-lg">UNDERSTAND</h3>
              </div>
              <p className="text-slate-600">
                We learn your brand, your market, and your competitors to understand where you fit.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-[#0F172A]">
              <div className="w-16 h-16 bg-[#FF5C35] text-white flex items-center justify-center font-black text-2xl mb-6">
                2
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-[#FF5C35]" />
                <h3 className="font-black text-lg">IDENTIFY GAPS</h3>
              </div>
              <p className="text-slate-600">
                We find the content gaps and opportunities—prompts where competitors get cited and you don't.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="p-8 border-b-2 lg:border-b-0 lg:border-r-2 border-[#0F172A]">
              <div className="w-16 h-16 bg-[#FF5C35] text-white flex items-center justify-center font-black text-2xl mb-6">
                3
              </div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-[#FF5C35]" />
                <h3 className="font-black text-lg">GENERATE & PUBLISH</h3>
              </div>
              <p className="text-slate-600">
                Automatically generate content in your brand tone and publish directly to HubSpot.
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
              <p className="text-slate-600">
                Continuously monitor your citations, validate what's working, and find new opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-[#0F172A]">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative p-10 bg-white/5 border-2 border-white/20">
            <Quote className="absolute top-6 left-6 h-12 w-12 text-[#FF5C35]/30" />
            <blockquote className="relative z-10">
              <p className="text-xl md:text-2xl font-medium text-white leading-relaxed mb-6">
                "Our company provides solutions across many industries, but it's hard to get AI 
                models to understand that—especially with a small marketing team. Context Memo 
                helps me ensure all the content gaps are filled so I can focus on high-value 
                strategic work instead."
              </p>
              <footer className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#FF5C35] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  SN
                </div>
                <div>
                  <p className="font-bold text-white">Stephen Newman</p>
                  <p className="text-slate-400">Head of Marketing, Checkit</p>
                </div>
              </footer>
            </blockquote>
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
                  <span className="text-slate-700 font-medium">Identify specific gaps where you're losing to competitors</span>
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
      <section id="pricing" className="py-24 bg-slate-900">
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
                      max={200}
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
