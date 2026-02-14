'use client'

import { useState, useEffect, useRef } from 'react'
import { Zap, ArrowRight, Send, ChevronRight, Check, X, MessageSquare, DollarSign, ExternalLink } from 'lucide-react'

// --- SECTIONS CONFIG ---
const SECTIONS = [
  { id: 'shift', label: 'The Shift' },
  { id: 'problem', label: 'The Problem' },
  { id: 'solution', label: 'The Solution' },
  { id: 'how', label: 'How It Works' },
  { id: 'moat', label: 'Why Only Us' },
  { id: 'traction', label: 'Traction' },
  { id: 'market', label: 'The Market' },
  { id: 'ask', label: 'The Ask' },
  { id: 'respond', label: 'Your Move' },
]

// --- EMAIL GATE ---
function EmailGate({ onVerified }: { onVerified: (email: string) => void }) {
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/raise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_access', email }),
      })
      if (!res.ok) throw new Error('Failed to send code')
      setStep('code')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/raise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_code', email, code }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Invalid code')
      }
      // Store in localStorage for return visits
      localStorage.setItem('pitch_email', email.toLowerCase().trim())
      localStorage.setItem('pitch_verified', 'true')
      onVerified(email.toLowerCase().trim())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-[#0EA5E9] flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" fill="white" />
          </div>
          <span className="text-white text-xl font-bold tracking-tight">CONTEXT MEMO</span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">Investor Access</h1>
        <p className="text-[#94A3B8] mb-8">
          {step === 'email'
            ? 'Enter your email to view our pitch deck. A verification code will be sent to you.'
            : `We sent a 6-digit code to ${email}. Enter it below.`}
        </p>

        {step === 'email' ? (
          <form onSubmit={handleRequestAccess} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@firm.com"
              required
              className="w-full bg-[#1E293B] border border-[#334155] text-white px-4 py-3 text-base focus:outline-none focus:border-[#0EA5E9] placeholder:text-[#64748B]"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0EA5E9] text-white font-semibold py-3 px-6 hover:bg-[#0284C7] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Sending...' : 'Request Access'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              required
              maxLength={6}
              className="w-full bg-[#1E293B] border border-[#334155] text-white px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-[#0EA5E9] placeholder:text-[#64748B] placeholder:tracking-[0.5em]"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-[#0EA5E9] text-white font-semibold py-3 px-6 hover:bg-[#0284C7] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Verifying...' : 'Verify & Enter'}
              {!loading && <Check className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); setError('') }}
              className="w-full text-[#64748B] text-sm hover:text-white transition-colors"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// --- RESPONSE FORM (CTAs) ---
function ResponseSection({ email }: { email: string }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    firm_name: '',
    commit_amount: '',
    note: '',
  })

  const handleSubmit = async (responseType: string) => {
    setLoading(true)
    try {
      await fetch('/api/raise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_response',
          email,
          response_type: responseType,
          ...formData,
        }),
      })
      setSubmitted(true)
    } catch {
      // Silent fail — we don't want to block the UX
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-[#0EA5E9]/10 border border-[#0EA5E9]/30 flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-[#0EA5E9]" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">Thank you.</h3>
        <p className="text-[#94A3B8] max-w-md mx-auto">
          {selected === 'not_interested'
            ? "We appreciate your time. We'll keep building."
            : selected === 'interested'
            ? "We'll reach out to schedule a conversation shortly."
            : "We'll be in touch with next steps within 24 hours."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!selected ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Not interested */}
          <button
            onClick={() => { setSelected('not_interested'); handleSubmit('not_interested') }}
            className="group border border-[#334155] p-6 text-left hover:border-[#64748B] transition-colors"
          >
            <X className="w-5 h-5 text-[#64748B] mb-3" />
            <h4 className="text-white font-semibold mb-1">Not for me right now</h4>
            <p className="text-[#64748B] text-sm">No hard feelings.</p>
          </button>

          {/* Interested */}
          <button
            onClick={() => setSelected('interested')}
            className="group border border-[#334155] p-6 text-left hover:border-[#0EA5E9] transition-colors"
          >
            <MessageSquare className="w-5 h-5 text-[#0EA5E9] mb-3" />
            <h4 className="text-white font-semibold mb-1">Interested — let&apos;s talk</h4>
            <p className="text-[#64748B] text-sm">Schedule a conversation.</p>
          </button>

          {/* Commit */}
          <button
            onClick={() => setSelected('commit')}
            className="group border border-[#334155] p-6 text-left hover:border-[#10B981] transition-colors"
          >
            <DollarSign className="w-5 h-5 text-[#10B981] mb-3" />
            <h4 className="text-white font-semibold mb-1">I want to commit</h4>
            <p className="text-[#64748B] text-sm">Indicate your interest.</p>
          </button>
        </div>
      ) : selected === 'interested' ? (
        <div className="border border-[#334155] p-8 max-w-lg">
          <h4 className="text-white font-bold text-lg mb-6">Let&apos;s schedule a conversation</h4>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={formData.full_name}
              onChange={(e) => setFormData(f => ({ ...f, full_name: e.target.value }))}
              className="w-full bg-[#1E293B] border border-[#334155] text-white px-4 py-3 focus:outline-none focus:border-[#0EA5E9] placeholder:text-[#64748B]"
            />
            <input
              type="text"
              placeholder="Firm / Company"
              value={formData.firm_name}
              onChange={(e) => setFormData(f => ({ ...f, firm_name: e.target.value }))}
              className="w-full bg-[#1E293B] border border-[#334155] text-white px-4 py-3 focus:outline-none focus:border-[#0EA5E9] placeholder:text-[#64748B]"
            />
            <textarea
              placeholder="Anything you'd like to discuss? (optional)"
              value={formData.note}
              onChange={(e) => setFormData(f => ({ ...f, note: e.target.value }))}
              rows={3}
              className="w-full bg-[#1E293B] border border-[#334155] text-white px-4 py-3 focus:outline-none focus:border-[#0EA5E9] placeholder:text-[#64748B] resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleSubmit('interested')}
                disabled={loading}
                className="bg-[#0EA5E9] text-white font-semibold py-3 px-6 hover:bg-[#0284C7] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Sending...' : 'Send'} <Send className="w-4 h-4" />
              </button>
              <button onClick={() => setSelected(null)} className="text-[#64748B] hover:text-white px-4 transition-colors">
                Back
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-[#334155] p-8 max-w-lg">
          <h4 className="text-white font-bold text-lg mb-6">Indicate your commitment</h4>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your name"
              value={formData.full_name}
              onChange={(e) => setFormData(f => ({ ...f, full_name: e.target.value }))}
              className="w-full bg-[#1E293B] border border-[#334155] text-white px-4 py-3 focus:outline-none focus:border-[#0EA5E9] placeholder:text-[#64748B]"
            />
            <input
              type="text"
              placeholder="Firm / Company"
              value={formData.firm_name}
              onChange={(e) => setFormData(f => ({ ...f, firm_name: e.target.value }))}
              className="w-full bg-[#1E293B] border border-[#334155] text-white px-4 py-3 focus:outline-none focus:border-[#0EA5E9] placeholder:text-[#64748B]"
            />
            <div>
              <label className="text-[#94A3B8] text-sm mb-2 block">Indicative amount</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['$25K', '$50K', '$100K', '$250K+'].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setFormData(f => ({ ...f, commit_amount: amount }))}
                    className={`py-2 px-3 border text-sm font-semibold transition-colors ${
                      formData.commit_amount === amount
                        ? 'border-[#10B981] text-[#10B981] bg-[#10B981]/10'
                        : 'border-[#334155] text-[#94A3B8] hover:border-[#64748B]'
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              placeholder="Notes (optional)"
              value={formData.note}
              onChange={(e) => setFormData(f => ({ ...f, note: e.target.value }))}
              rows={3}
              className="w-full bg-[#1E293B] border border-[#334155] text-white px-4 py-3 focus:outline-none focus:border-[#0EA5E9] placeholder:text-[#64748B] resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => handleSubmit('commit')}
                disabled={loading || !formData.commit_amount}
                className="bg-[#10B981] text-white font-semibold py-3 px-6 hover:bg-[#059669] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Sending...' : 'Submit'} <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setSelected(null)} className="text-[#64748B] hover:text-white px-4 transition-colors">
                Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- SIDEBAR ---
function Sidebar({ activeSection }: { activeSection: string }) {
  const handleClick = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#0F172A] border-r border-[#1E293B] flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-8 border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0EA5E9] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="text-white text-lg font-bold tracking-tight">CONTEXT MEMO</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => handleClick(section.id)}
            className={`w-full text-left px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${
              activeSection === section.id
                ? 'text-[#0EA5E9] bg-[#0EA5E9]/10'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <ChevronRight className={`w-3 h-3 shrink-0 transition-colors ${activeSection === section.id ? 'text-[#0EA5E9]' : 'text-[#475569]'}`} />
            {section.label}
          </button>
        ))}
      </nav>

      {/* Raise amount */}
      <div className="px-6 py-6 border-t border-[#1E293B]">
        <p className="text-[#64748B] text-xs uppercase tracking-wider mb-1">Raising</p>
        <p className="text-[#0EA5E9] text-2xl font-bold">$2.5M</p>
        <p className="text-[#64748B] text-xs">Seed Round</p>
      </div>
    </aside>
  )
}

// --- SECTION WRAPPER ---
function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="min-h-screen py-24 px-8 lg:px-16 border-b border-[#1E293B] last:border-0">
      {children}
    </section>
  )
}

// --- MAIN PITCH DECK ---
function PitchDeck({ email }: { email: string }) {
  const [activeSection, setActiveSection] = useState('shift')
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Log return visit
    fetch('/api/raise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_visit', email }),
    }).catch(() => {})
  }, [email])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) {
          // Pick the one with highest intersection ratio
          const best = visible.reduce((a, b) => a.intersectionRatio > b.intersectionRatio ? a : b)
          setActiveSection(best.target.id)
        }
      },
      { threshold: [0.2, 0.5, 0.8], rootMargin: '-10% 0px -10% 0px' }
    )

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex min-h-screen bg-[#0B1120]">
      <Sidebar activeSection={activeSection} />

      {/* Content */}
      <main ref={contentRef} className="ml-64 flex-1 overflow-y-auto">
        {/* SLIDE 1: The Shift */}
        <Section id="shift">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">The Shift</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-8">
              The buyer&apos;s journey just moved.<br />
              <span className="text-[#64748B]">Most brands don&apos;t know it yet.</span>
            </h2>
            <p className="text-[#94A3B8] text-lg leading-relaxed mb-12">
              B2B buyers are replacing Google with AI conversations. When they ask ChatGPT &ldquo;What&apos;s the best CRM for small teams?&rdquo;, the AI picks winners and losers based on available content.
            </p>
            <div className="border border-[#1E293B] p-8 bg-[#0F172A]">
              <p className="text-[#64748B] text-sm uppercase tracking-wider mb-2">The Reality</p>
              <p className="text-white text-2xl font-bold">If your brand isn&apos;t cited, you don&apos;t exist.</p>
            </div>
          </div>
        </Section>

        {/* SLIDE 2: The Problem */}
        <Section id="problem">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">The Problem</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-12">
              $0 in pipeline from the<br />
              <span className="text-[#0EA5E9]">fastest-growing discovery channel.</span>
            </h2>
            <div className="space-y-6">
              {[
                { stat: '700M+', desc: 'weekly ChatGPT users — and growing 3x YoY in B2B research' },
                { stat: '50%', desc: 'decline in organic search traffic predicted by 2028 (Gartner)' },
                { stat: '0', desc: 'tools that generate content, verify citations, AND attribute revenue' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-6 border-l-4 border-[#0EA5E9] pl-6 py-2">
                  <span className="text-3xl font-bold text-white whitespace-nowrap">{item.stat}</span>
                  <p className="text-[#94A3B8] text-lg">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* SLIDE 3: The Solution */}
        <Section id="solution">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">The Solution</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              Context Memo
            </h2>
            <p className="text-[#94A3B8] text-xl mb-12">
              The closed-loop AI visibility platform. We deploy an AI visibility layer directly on your domain — content that inherits your authority, verified to be cited, attributed to revenue.
            </p>
            <div className="border border-[#1E293B] bg-[#0F172A] p-8">
              <p className="text-[#64748B] text-sm uppercase tracking-wider mb-6">The Closed Loop</p>
              <div className="flex flex-wrap items-center gap-3 text-lg">
                {['Scan', 'Discover', 'Generate', 'Deploy on Domain', 'Verify', 'Attribute Revenue'].map((step, i) => (
                  <span key={step} className="flex items-center gap-3">
                    <span className={`font-bold ${i === 3 || i === 5 ? 'text-[#0EA5E9]' : 'text-white'}`}>{step}</span>
                    {i < 5 && <ArrowRight className="w-4 h-4 text-[#475569]" />}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-8 border border-[#1E293B] bg-[#0F172A] p-8">
              <p className="text-[#64748B] text-sm uppercase tracking-wider mb-3">The Difference</p>
              <p className="text-white text-lg">
                The competitors sell <span className="text-[#64748B]">dashboards</span>. We sell <span className="text-[#0EA5E9] font-bold">infrastructure</span> — deployed on your domain, inheriting your authority, compounding over time.
              </p>
            </div>
          </div>
        </Section>

        {/* SLIDE 4: How It Works */}
        <Section id="how">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">How It Works</p>
            <h2 className="text-4xl font-bold text-white mb-12">Five steps. One loop. Fully automated.</h2>
            <div className="space-y-8">
              {[
                { num: '01', title: 'Scan', desc: 'Daily monitoring across 9 AI models — GPT-4o, Claude, Gemini, Perplexity, Grok, Llama, Mistral, DeepSeek, Qwen — plus Google AI Overviews.' },
                { num: '02', title: 'Discover', desc: 'AI responses reveal your real competitors, content gaps, and who\'s winning citations. Entity classification: competitors, partners, aggregators, publishers.' },
                { num: '03', title: 'Generate & Deploy', desc: 'Citation-optimized memos deployed directly on your domain (subdomain or folder). Inherits your domain authority and trust signals. Schema.org, dynamic llms.txt, semantic HTML.' },
                { num: '04', title: 'Verify', desc: 'Re-scan after deployment to prove your content is being cited. Timestamped verification. Time-to-citation tracking.' },
                { num: '05', title: 'Attribute', desc: 'Connect AI traffic → website visit → HubSpot CRM → closed-won revenue. First-party data. Full-funnel attribution.' },
              ].map((step) => (
                <div key={step.num} className="flex gap-6">
                  <span className="text-[#0EA5E9] font-mono text-sm mt-1 shrink-0">{step.num}</span>
                  <div>
                    <h3 className="text-white font-bold text-xl mb-2">{step.title}</h3>
                    <p className="text-[#94A3B8] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* SLIDE 5: Why Only Us */}
        <Section id="moat">
          <div className="max-w-4xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">Why Only Us</p>
            <h2 className="text-4xl font-bold text-white mb-4">Everyone else stops at monitoring.</h2>
            <p className="text-[#94A3B8] text-xl mb-12">We close the loop and prove ROI.</p>

            {/* Comparison table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#1E293B]">
                    <th className="pb-4 text-[#64748B] text-sm font-medium">Capability</th>
                    <th className="pb-4 text-[#0EA5E9] text-sm font-bold">Context Memo</th>
                    <th className="pb-4 text-[#64748B] text-sm font-medium">Profound<br /><span className="text-xs opacity-60">$58.5M raised</span></th>
                    <th className="pb-4 text-[#64748B] text-sm font-medium">Peec AI<br /><span className="text-xs opacity-60">$29M raised</span></th>
                    <th className="pb-4 text-[#64748B] text-sm font-medium">Scrunch<br /><span className="text-xs opacity-60">$19M raised</span></th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    { cap: 'Multi-model scanning', cm: true, p: true, pe: true, s: true },
                    { cap: 'Content generation', cm: true, p: false, pe: false, s: false },
                    { cap: 'Domain-level deployment', cm: true, p: false, pe: false, s: false },
                    { cap: 'Citation verification', cm: true, p: false, pe: false, s: false },
                    { cap: 'Revenue attribution', cm: true, p: false, pe: false, s: false },
                    { cap: 'Entity discovery from AI', cm: true, p: false, pe: false, s: false },
                    { cap: 'HubSpot native integration', cm: true, p: false, pe: false, s: false },
                  ].map((row) => (
                    <tr key={row.cap} className="border-b border-[#1E293B]/50">
                      <td className="py-3 text-[#94A3B8]">{row.cap}</td>
                      <td className="py-3">{row.cm ? <Check className="w-4 h-4 text-[#0EA5E9]" /> : <span className="text-[#334155]">—</span>}</td>
                      <td className="py-3">{row.p ? <Check className="w-4 h-4 text-[#64748B]" /> : <span className="text-[#334155]">—</span>}</td>
                      <td className="py-3">{row.pe ? <Check className="w-4 h-4 text-[#64748B]" /> : <span className="text-[#334155]">—</span>}</td>
                      <td className="py-3">{row.s ? <Check className="w-4 h-4 text-[#64748B]" /> : <span className="text-[#334155]">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-12 border border-[#1E293B] bg-[#0F172A] p-8">
              <p className="text-[#64748B] text-sm uppercase tracking-wider mb-3">Infrastructure vs. Dashboard</p>
              <p className="text-white text-lg leading-relaxed">
                Our content lives on the customer&apos;s domain — <span className="text-[#0EA5E9] font-mono text-base">ai.yourbrand.com</span> or <span className="text-[#0EA5E9] font-mono text-base">yourbrand.com/ai/</span>. It inherits domain authority, backlinks, and trust signals. Once deployed, removing it means losing indexed content, breaking links, and losing citation history. That&apos;s a moat.
              </p>
            </div>
          </div>
        </Section>

        {/* SLIDE 6: Traction */}
        <Section id="traction">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">Traction</p>
            <h2 className="text-4xl font-bold text-white mb-12">Live product. Paying customer. Verified results.</h2>

            {/* Hero stat */}
            <div className="border border-[#0EA5E9]/30 bg-[#0EA5E9]/5 p-12 text-center mb-8">
              <p className="text-[#0EA5E9] text-7xl lg:text-8xl font-bold mb-4">&lt; 24h</p>
              <p className="text-white text-xl font-medium">From memo deployed to verified AI citation</p>
              <p className="text-[#64748B] mt-2">Traditional SEO takes weeks. We take hours.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="border border-[#1E293B] bg-[#0F172A] p-8">
                <p className="text-[#10B981] text-3xl font-bold mb-2">$5K</p>
                <p className="text-white font-medium">First customer contract</p>
                <p className="text-[#64748B] text-sm mt-1">Pre-funding. Zero marketing spend.</p>
              </div>
              <div className="border border-[#1E293B] bg-[#0F172A] p-8">
                <p className="text-white text-3xl font-bold mb-2">v0.26</p>
                <p className="text-white font-medium">Production-deployed</p>
                <p className="text-[#64748B] text-sm mt-1">Live at contextmemo.com. Shipping daily.</p>
              </div>
              <div className="border border-[#1E293B] bg-[#0F172A] p-8">
                <p className="text-white text-3xl font-bold mb-2">9</p>
                <p className="text-white font-medium">AI models scanned</p>
                <p className="text-[#64748B] text-sm mt-1">GPT-4o, Claude, Gemini, Perplexity, Grok, and more.</p>
              </div>
              <div className="border border-[#1E293B] bg-[#0F172A] p-8">
                <p className="text-white text-3xl font-bold mb-2">Full Stack</p>
                <p className="text-white font-medium">Closed-loop operational</p>
                <p className="text-[#64748B] text-sm mt-1">Scan → Generate → Deploy → Verify → Attribute.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* SLIDE 7: Market */}
        <Section id="market">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">The Market</p>
            <h2 className="text-4xl font-bold text-white mb-4">AI search is the next SEO.</h2>
            <p className="text-[#94A3B8] text-xl mb-12">And it&apos;s year one.</p>

            <div className="space-y-8">
              <div className="border-l-4 border-[#0EA5E9] pl-6 py-2">
                <p className="text-white text-2xl font-bold">$50B+</p>
                <p className="text-[#94A3B8]">spent annually on SEO and content marketing. AI visibility is the next budget line.</p>
              </div>
              <div className="border-l-4 border-[#8B5CF6] pl-6 py-2">
                <p className="text-white text-2xl font-bold">$110M+</p>
                <p className="text-[#94A3B8]">already invested in AI visibility tools (Profound, Peec, Scrunch). The category is validated.</p>
              </div>
              <div className="border-l-4 border-[#10B981] pl-6 py-2">
                <p className="text-white text-2xl font-bold">200K+</p>
                <p className="text-[#94A3B8]">B2B teams on HubSpot — our primary distribution channel. None of the funded competitors have this integration.</p>
              </div>
            </div>

            <div className="mt-12 border border-[#1E293B] bg-[#0F172A] p-8">
              <p className="text-[#64748B] text-sm uppercase tracking-wider mb-3">Competitive Landscape</p>
              <p className="text-white text-lg leading-relaxed">
                Profound raised $58.5M (Sequoia). Peec raised $29M. Scrunch raised $19M. They&apos;re all building monitoring dashboards. We&apos;re the only one deploying infrastructure on the customer&apos;s domain, verifying citations, and attributing revenue. Different architecture. Different moat.
              </p>
            </div>
          </div>
        </Section>

        {/* SLIDE 8: The Ask */}
        <Section id="ask">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">The Ask</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              $2.5M to own AI visibility<br />
              <span className="text-[#64748B]">before the market wakes up.</span>
            </h2>
            <p className="text-[#94A3B8] text-lg mb-12">Seed round. 18 months of runway. Three clear milestones.</p>

            <div className="space-y-6 mb-12">
              {[
                { title: 'Launch HubSpot Marketplace', desc: 'First AI citation tool in the marketplace. 200K+ B2B teams as organic distribution. First 50 paying customers.', pct: '40%' },
                { title: 'Scale the moat', desc: 'Expand verification engine, entity intelligence, and revenue attribution. Build the switching cost that compounds daily.', pct: '35%' },
                { title: 'GTM hire + enterprise expansion', desc: 'One GTM hire to convert marketplace inbound. Move upmarket: $10K–$50K/year enterprise contracts.', pct: '25%' },
              ].map((item) => (
                <div key={item.title} className="flex gap-6 border border-[#1E293B] bg-[#0F172A] p-6">
                  <span className="text-[#0EA5E9] font-mono text-sm mt-1 shrink-0">{item.pct}</span>
                  <div>
                    <h3 className="text-white font-bold text-lg mb-1">{item.title}</h3>
                    <p className="text-[#94A3B8]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border border-[#1E293B] bg-[#0F172A] p-8">
              <p className="text-[#64748B] text-sm uppercase tracking-wider mb-3">The Pitch</p>
              <p className="text-white text-lg leading-relaxed italic">
                &ldquo;Profound raised $58M to monitor AI visibility. We don&apos;t need $58M. We need $2.5M and 18 months — because we&apos;re the only platform that generates the content, deploys it on your domain, verifies it works, and proves the revenue. Capital-efficient. Differentiated. With a distribution wedge none of them have.&rdquo;
              </p>
            </div>
          </div>
        </Section>

        {/* SLIDE 9: Your Move */}
        <Section id="respond">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">Your Move</p>
            <h2 className="text-4xl font-bold text-white mb-4">What do you think?</h2>
            <p className="text-[#94A3B8] text-lg mb-12">
              We&apos;re building the AI visibility layer that brands deploy on their domain. The window to lead this category is now.
            </p>
            <ResponseSection email={email} />

            <div className="mt-16 pt-8 border-t border-[#1E293B] flex items-center justify-between">
              <div>
                <p className="text-[#64748B] text-sm">Questions? Reach out directly.</p>
                <a href="mailto:stephen@contextmemo.com" className="text-[#0EA5E9] hover:underline flex items-center gap-1 text-sm mt-1">
                  stephen@contextmemo.com <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center gap-2 text-[#475569] text-xs">
                <Zap className="w-3 h-3" />
                <span>Context Memo © 2026</span>
              </div>
            </div>
          </div>
        </Section>
      </main>
    </div>
  )
}

// --- PAGE ---
export default function RaisePage() {
  const [verified, setVerified] = useState(false)
  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check if already verified
    const storedEmail = localStorage.getItem('pitch_email')
    const storedVerified = localStorage.getItem('pitch_verified')
    if (storedEmail && storedVerified === 'true') {
      setEmail(storedEmail)
      setVerified(true)
    }
    setChecking(false)
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#0EA5E9] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!verified) {
    return <EmailGate onVerified={(e) => { setEmail(e); setVerified(true) }} />
  }

  return <PitchDeck email={email} />
}
