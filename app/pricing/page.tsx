'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  Check, 
  Zap, 
  Building2, 
  Rocket, 
  ArrowRight, 
  Shield,
  Lock
} from 'lucide-react'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For companies starting to monitor AI visibility',
    price: 499,
    icon: Zap,
    features: [
      '50 prompts tracked',
      '3 AI models (GPT, Claude, Perplexity)',
      '5 memos per month',
      '1 brand',
      'CSV exports',
      'Email support',
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For growing companies optimizing AI visibility',
    price: 999,
    popular: true,
    icon: Rocket,
    features: [
      '150 prompts tracked',
      '7 AI models + AI Overviews',
      'Unlimited memos',
      '3 brands',
      'Competitor intelligence',
      'AI traffic attribution',
      'CSV/JSON exports',
      'Priority support',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large companies and agencies',
    price: null,
    icon: Building2,
    features: [
      'Unlimited prompts',
      'All AI models',
      'Unlimited memos',
      'Unlimited brands',
      'API access',
      'SSO/SAML',
      'Dedicated support',
      'Custom integrations',
    ],
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Header */}
      <header className="sticky top-0 bg-[#0F172A]/95 backdrop-blur-sm z-40 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-[#0EA5E9]" />
            <span className="font-black text-xl tracking-tight">CONTEXT MEMO</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
              SIGN IN
            </Link>
            <Button asChild className="bg-[#0EA5E9] hover:bg-[#0EA5E9]/90 text-white font-bold rounded-none px-6">
              <Link href="/request-access">REQUEST ACCESS</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0EA5E9]/20 border border-[#0EA5E9]/30 text-[#0EA5E9] text-sm font-bold tracking-wide mb-8">
            <Shield className="h-4 w-4" />
            TRANSPARENT PRICING
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
            PREMIUM AI VISIBILITY
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-4">
            The most comprehensive AI visibility platform on the market. 
            Built for B2B teams that take AI search seriously.
          </p>
          
          {/* Discount Banner */}
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#10B981]/20 border border-[#10B981]/30 text-[#10B981] font-bold tracking-wide mt-4">
            GET UP TO 90% OFF — REQUEST EARLY ACCESS FOR CUSTOM PRICING
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-0 border-2 border-white/20">
            {PLANS.map((plan) => {
              const Icon = plan.icon
              return (
                <div
                  key={plan.id}
                  className={`p-8 ${plan.popular ? 'relative' : ''} ${
                    plan.id !== 'enterprise' ? 'border-b-2 md:border-b-0 md:border-r-2 border-white/20' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-[#0EA5E9]" />
                  )}
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 ${plan.popular ? 'bg-[#0EA5E9]/20' : 'bg-white/10'}`}>
                      <Icon className={`h-5 w-5 ${plan.popular ? 'text-[#0EA5E9]' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <h3 className="font-black text-lg tracking-tight">{plan.name.toUpperCase()}</h3>
                      {plan.popular && (
                        <span className="text-xs font-bold text-[#0EA5E9] tracking-wider">MOST POPULAR</span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-400 mb-6">{plan.description}</p>
                  
                  {/* Price */}
                  <div className="mb-6 pb-6 border-b border-white/10">
                    {plan.price !== null ? (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-black">${plan.price}</span>
                          <span className="text-slate-500 font-semibold">/mo</span>
                        </div>
                        <p className="text-xs text-[#10B981] font-bold mt-1">
                          EARLY ACCESS: AS LOW AS ${Math.round(plan.price * 0.1)}/MO
                        </p>
                      </div>
                    ) : (
                      <div>
                        <span className="text-4xl font-black">CUSTOM</span>
                        <p className="text-xs text-slate-500 font-bold mt-1">TAILORED TO YOUR NEEDS</p>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className={`h-4 w-4 mt-0.5 shrink-0 ${
                          plan.popular ? 'text-[#0EA5E9]' : 'text-[#10B981]'
                        }`} />
                        <span className="text-sm text-slate-400">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Button 
                    asChild
                    className={`w-full rounded-none font-bold ${
                      plan.popular
                        ? 'bg-[#0EA5E9] hover:bg-[#0284C7]'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    <Link href="/request-access">
                      {plan.price !== null ? 'REQUEST ACCESS' : 'CONTACT US'}
                    </Link>
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Additional CTAs */}
          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            <Link 
              href="/request-access" 
              className="p-5 border-2 border-[#0EA5E9]/30 bg-[#0EA5E9]/5 hover:bg-[#0EA5E9]/10 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm mb-1">REQUEST EARLY ACCESS</p>
                  <p className="text-xs text-slate-500">Get your invite code</p>
                </div>
                <ArrowRight className="h-4 w-4 text-[#0EA5E9] group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link 
              href="/request-access" 
              className="p-5 border-2 border-white/10 hover:border-white/20 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm mb-1">REQUEST A DEMO</p>
                  <p className="text-xs text-slate-500">See it in action</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link 
              href="/request-access" 
              className="p-5 border-2 border-[#10B981]/30 bg-[#10B981]/5 hover:bg-[#10B981]/10 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm mb-1">REQUEST A DISCOUNT</p>
                  <p className="text-xs text-slate-500">Up to 90% off</p>
                </div>
                <ArrowRight className="h-4 w-4 text-[#10B981] group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Calculator Link */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="p-8 border-2 border-white/10 bg-white/5 text-center">
            <p className="font-black text-lg mb-2">WANT TO ESTIMATE YOUR COST?</p>
            <p className="text-slate-400 text-sm mb-4">
              Use our consumption calculator to model pricing based on your exact usage.
            </p>
            <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-none font-bold">
              <Link href="/pricing/calculator">
                OPEN CALCULATOR
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-10 tracking-tight">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="font-bold mb-2">Why is Context Memo invite-only?</h3>
              <p className="text-slate-400 text-sm">
                We work closely with each client to ensure they get maximum value from AI visibility monitoring. 
                Invite-only access lets us provide white-glove onboarding and custom pricing.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">How do I get an invite code?</h3>
              <p className="text-slate-400 text-sm">
                Submit a request through our <Link href="/request-access" className="text-[#0EA5E9] hover:underline">early access form</Link>. 
                We review every request and typically respond within 24 hours.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">What AI models do you track?</h3>
              <p className="text-slate-400 text-sm">
                We track GPT-4o, Claude, Gemini, Perplexity, DeepSeek, Llama, and Mistral. 
                Growth plans also include Google AI Overviews monitoring.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">How does the 90% discount work?</h3>
              <p className="text-slate-400 text-sm">
                Early access members receive significant discounts based on timing, use case, and commitment level. 
                Request access and mention your situation — we&apos;ll work with you on pricing.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Can I cancel anytime?</h3>
              <p className="text-slate-400 text-sm">
                Yes, you can cancel your subscription at any time. You&apos;ll continue to have 
                access until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Have a code? */}
      <section className="py-10 px-6 border-t border-white/10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
            <Lock className="h-4 w-4" />
            <span>Already have an invite code?{' '}
              <Link href="/signup" className="text-[#0EA5E9] hover:underline font-bold">
                CREATE YOUR ACCOUNT
              </Link>
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-[#0F172A] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-[#0EA5E9]" />
              <span className="font-black tracking-tight">CONTEXT MEMO</span>
            </div>
            <div className="flex items-center gap-8 text-sm font-semibold text-slate-400">
              <Link href="/memos" className="hover:text-white transition-colors">MEMOS</Link>
              <Link href="/login" className="hover:text-white transition-colors">SIGN IN</Link>
              <Link href="/request-access" className="hover:text-white transition-colors">REQUEST ACCESS</Link>
            </div>
            <p className="text-sm text-slate-500 font-semibold">
              &copy; 2026 CONTEXT MEMO
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
