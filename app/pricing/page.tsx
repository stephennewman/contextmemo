'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2, Zap, Building2, Rocket } from 'lucide-react'
import { toast } from 'sonner'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For small companies monitoring brand visibility',
    price: 79,
    icon: Zap,
    features: [
      '50 prompts tracked',
      '3 AI engines (GPT, Claude, Perplexity)',
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
    price: 199,
    popular: true,
    icon: Rocket,
    features: [
      '150 prompts tracked',
      '7 AI engines + AI Overviews',
      'Unlimited memos',
      '3 brands',
      'Competitor intelligence',
      'AI traffic attribution',
      'CSV/JSON exports',
      'Priority email support',
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
      'All AI engines',
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
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (planId: string) => {
    if (planId === 'enterprise') {
      window.location.href = 'mailto:sales@contextmemo.com?subject=Enterprise%20Inquiry'
      return
    }

    setLoading(planId)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast.error('Failed to start checkout')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <span className="text-[#0F172A]">Context</span>
              <span className="text-[#0EA5E9]">Memo</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">
                Log in
              </Link>
              <Button asChild size="sm" className="bg-[#0EA5E9] hover:bg-[#0284C7]">
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[#0F172A] mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Start free, upgrade when you need more. No hidden fees, cancel anytime.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map((plan) => {
              const Icon = plan.icon
              return (
                <Card
                  key={plan.id}
                  className={`relative overflow-hidden ${
                    plan.popular
                      ? 'border-[#0EA5E9] border-2 shadow-lg shadow-[#0EA5E9]/10'
                      : 'border-slate-200'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0">
                      <Badge className="rounded-none rounded-bl-lg bg-[#0EA5E9] text-white">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`p-2 rounded-lg ${
                        plan.popular ? 'bg-[#0EA5E9]/10' : 'bg-slate-100'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          plan.popular ? 'text-[#0EA5E9]' : 'text-slate-600'
                        }`} />
                      </div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Price */}
                    <div className="pb-4 border-b">
                      {plan.price !== null ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-[#0F172A]">
                            ${plan.price}
                          </span>
                          <span className="text-slate-500">/month</span>
                        </div>
                      ) : (
                        <div className="text-4xl font-bold text-[#0F172A]">
                          Custom
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                            plan.popular ? 'text-[#0EA5E9]' : 'text-green-500'
                          }`} />
                          <span className="text-sm text-slate-600">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={loading !== null}
                      className={`w-full ${
                        plan.popular
                          ? 'bg-[#0EA5E9] hover:bg-[#0284C7]'
                          : 'bg-[#0F172A] hover:bg-[#1E293B]'
                      }`}
                    >
                      {loading === plan.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : plan.price !== null ? (
                        'Get Started'
                      ) : (
                        'Contact Sales'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 bg-slate-50 border-t">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">What AI engines do you track?</h3>
              <p className="text-slate-600 text-sm">
                We track GPT-4o, Claude, Gemini, Perplexity, DeepSeek, Llama, and Mistral. 
                Growth plans also include Google AI Overviews monitoring.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-slate-600 text-sm">
                Yes, you can cancel your subscription at any time. You&apos;ll continue to have 
                access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What happens if I exceed my limits?</h3>
              <p className="text-slate-600 text-sm">
                We&apos;ll notify you when you&apos;re approaching your limits. You can upgrade 
                at any time, and we&apos;ll prorate the difference.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do you offer annual billing?</h3>
              <p className="text-slate-600 text-sm">
                Yes, annual billing with 2 months free is available for all plans. 
                Contact us for annual pricing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-slate-500">
          <div>© 2026 ContextMemo. All rights reserved.</div>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-slate-700">About</Link>
            <Link href="/changelog" className="hover:text-slate-700">Changelog</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
