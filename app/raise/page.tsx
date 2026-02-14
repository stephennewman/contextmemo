'use client'

import { useState, useEffect, useRef } from 'react'
import { Zap, ArrowRight, Send, ChevronRight, Check, X, MessageSquare, DollarSign, ExternalLink, Eye, ShieldCheck, TrendingUp, Globe, BarChart3, Target } from 'lucide-react'

// --- SECTIONS CONFIG ---
const SECTIONS = [
  { id: 'title', label: 'Overview' },
  { id: 'shift', label: 'The Shift' },
  { id: 'problem', label: 'The Problem' },
  { id: 'solution', label: 'The Solution' },
  { id: 'product', label: 'The Product' },
  { id: 'moat', label: 'The Moat' },
  { id: 'traction', label: 'Traction' },
  { id: 'market', label: 'The Market' },
  { id: 'ask', label: 'The Ask' },
  { id: 'respond', label: 'Your Move' },
]

// --- ACTIVE VIEWERS (Google Docs style) ---
const SAMPLE_VIEWERS = [
  { name: 'M. Chen', color: '#8B5CF6', initials: 'MC' },
  { name: 'S. Patel', color: '#10B981', initials: 'SP' },
  { name: 'J. Kim', color: '#F59E0B', initials: 'JK' },
]

function ActiveViewers() {
  const [viewers, setViewers] = useState<typeof SAMPLE_VIEWERS>([])

  useEffect(() => {
    // Simulate viewers appearing
    const timer1 = setTimeout(() => setViewers([SAMPLE_VIEWERS[0]]), 3000)
    const timer2 = setTimeout(() => setViewers([SAMPLE_VIEWERS[0], SAMPLE_VIEWERS[1]]), 8000)
    const timer3 = setTimeout(() => setViewers([SAMPLE_VIEWERS[0], SAMPLE_VIEWERS[1], SAMPLE_VIEWERS[2]]), 15000)
    // One leaves after a while
    const timer4 = setTimeout(() => setViewers([SAMPLE_VIEWERS[0], SAMPLE_VIEWERS[2]]), 45000)
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); clearTimeout(timer4) }
  }, [])

  if (viewers.length === 0) return null

  return (
    <div className="fixed top-4 right-6 z-50 flex items-center gap-2">
      <div className="flex -space-x-2">
        {viewers.map((v) => (
          <div
            key={v.initials}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-sm animate-in fade-in duration-500"
            style={{ backgroundColor: v.color }}
            title={v.name}
          >
            {v.initials}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 bg-white border border-[#E2E8F0] shadow-sm px-2.5 py-1 rounded-full">
        <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
        <span className="text-[#64748B] text-xs font-medium">{viewers.length} viewing</span>
      </div>
    </div>
  )
}

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
      // Silent fail
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-[#0EA5E9]" />
        </div>
        <h3 className="text-2xl font-bold text-[#0F172A] mb-3">Thank you.</h3>
        <p className="text-[#64748B] max-w-md mx-auto">
          {selected === 'not_interested'
            ? "We appreciate your time. We'll keep building."
            : selected === 'interested'
            ? "We'll reach out to schedule a conversation shortly."
            : "We'll be in touch with next steps within 24 hours."}
        </p>
      </div>
    )
  }

  const inputClass = "w-full bg-white border border-[#E2E8F0] text-[#0F172A] px-4 py-3 focus:outline-none focus:border-[#0EA5E9] placeholder:text-[#94A3B8]"

  return (
    <div className="space-y-6">
      {!selected ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <button
            onClick={() => { setSelected('not_interested'); handleSubmit('not_interested') }}
            className="group border border-[#E2E8F0] bg-white p-6 text-left hover:border-[#94A3B8] transition-colors"
          >
            <X className="w-5 h-5 text-[#94A3B8] mb-3" />
            <h4 className="text-[#0F172A] font-semibold mb-1">Not for me right now</h4>
            <p className="text-[#94A3B8] text-sm">No hard feelings.</p>
          </button>

          <button
            onClick={() => setSelected('interested')}
            className="group border border-[#E2E8F0] bg-white p-6 text-left hover:border-[#0EA5E9] transition-colors"
          >
            <MessageSquare className="w-5 h-5 text-[#0EA5E9] mb-3" />
            <h4 className="text-[#0F172A] font-semibold mb-1">Interested — let&apos;s talk</h4>
            <p className="text-[#94A3B8] text-sm">Schedule a conversation.</p>
          </button>

          <button
            onClick={() => setSelected('commit')}
            className="group border border-[#E2E8F0] bg-white p-6 text-left hover:border-[#10B981] transition-colors"
          >
            <DollarSign className="w-5 h-5 text-[#10B981] mb-3" />
            <h4 className="text-[#0F172A] font-semibold mb-1">I want to commit</h4>
            <p className="text-[#94A3B8] text-sm">Indicate your interest.</p>
          </button>
        </div>
      ) : selected === 'interested' ? (
        <div className="border border-[#E2E8F0] bg-white p-8 max-w-lg">
          <h4 className="text-[#0F172A] font-bold text-lg mb-6">Let&apos;s schedule a conversation</h4>
          <div className="space-y-4">
            <input type="text" placeholder="Your name" value={formData.full_name} onChange={(e) => setFormData(f => ({ ...f, full_name: e.target.value }))} className={inputClass} />
            <input type="text" placeholder="Firm / Company" value={formData.firm_name} onChange={(e) => setFormData(f => ({ ...f, firm_name: e.target.value }))} className={inputClass} />
            <textarea placeholder="Anything you'd like to discuss? (optional)" value={formData.note} onChange={(e) => setFormData(f => ({ ...f, note: e.target.value }))} rows={3} className={`${inputClass} resize-none`} />
            <div className="flex gap-3">
              <button onClick={() => handleSubmit('interested')} disabled={loading} className="bg-[#0EA5E9] text-white font-semibold py-3 px-6 hover:bg-[#0284C7] transition-colors disabled:opacity-50 flex items-center gap-2">
                {loading ? 'Sending...' : 'Send'} <Send className="w-4 h-4" />
              </button>
              <button onClick={() => setSelected(null)} className="text-[#94A3B8] hover:text-[#0F172A] px-4 transition-colors">Back</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-[#E2E8F0] bg-white p-8 max-w-lg">
          <h4 className="text-[#0F172A] font-bold text-lg mb-6">Indicate your commitment</h4>
          <div className="space-y-4">
            <input type="text" placeholder="Your name" value={formData.full_name} onChange={(e) => setFormData(f => ({ ...f, full_name: e.target.value }))} className={inputClass} />
            <input type="text" placeholder="Firm / Company" value={formData.firm_name} onChange={(e) => setFormData(f => ({ ...f, firm_name: e.target.value }))} className={inputClass} />
            <div>
              <label className="text-[#64748B] text-sm mb-2 block">Indicative amount</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['$25K', '$50K', '$100K', '$250K+'].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setFormData(f => ({ ...f, commit_amount: amount }))}
                    className={`py-2 px-3 border text-sm font-semibold transition-colors ${
                      formData.commit_amount === amount
                        ? 'border-[#10B981] text-[#10B981] bg-[#10B981]/5'
                        : 'border-[#E2E8F0] text-[#64748B] hover:border-[#94A3B8]'
                    }`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
            </div>
            <textarea placeholder="Notes (optional)" value={formData.note} onChange={(e) => setFormData(f => ({ ...f, note: e.target.value }))} rows={3} className={`${inputClass} resize-none`} />
            <div className="flex gap-3">
              <button onClick={() => handleSubmit('commit')} disabled={loading || !formData.commit_amount} className="bg-[#10B981] text-white font-semibold py-3 px-6 hover:bg-[#059669] transition-colors disabled:opacity-50 flex items-center gap-2">
                {loading ? 'Sending...' : 'Submit'} <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setSelected(null)} className="text-[#94A3B8] hover:text-[#0F172A] px-4 transition-colors">Back</button>
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
      <div className="px-6 py-8 border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0EA5E9] flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <span className="text-white text-lg font-bold tracking-tight">CONTEXT MEMO</span>
        </div>
      </div>

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

      <div className="px-6 py-6 border-t border-[#1E293B]">
        <p className="text-[#64748B] text-xs uppercase tracking-wider mb-1">Raising</p>
        <p className="text-[#0EA5E9] text-2xl font-bold">$2.5M</p>
        <p className="text-[#64748B] text-xs">Seed Round</p>
      </div>
    </aside>
  )
}

// --- SECTION WRAPPER (light background) ---
function Section({ id, children, dark = false }: { id: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <section
      id={id}
      className={`min-h-screen py-24 px-8 lg:px-16 border-b last:border-0 ${
        dark
          ? 'bg-[#0F172A] border-[#1E293B]'
          : 'bg-[#FAFBFC] border-[#E2E8F0]'
      }`}
    >
      {children}
    </section>
  )
}

// --- MAIN PITCH DECK ---
function PitchDeck({ email }: { email: string }) {
  const [activeSection, setActiveSection] = useState('title')
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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
    <div className="flex min-h-screen bg-[#FAFBFC]">
      <Sidebar activeSection={activeSection} />
      <ActiveViewers />

      <main ref={contentRef} className="ml-64 flex-1 overflow-y-auto">

        {/* ===== TITLE PAGE ===== */}
        <section id="title" className="min-h-screen flex items-center py-24 px-8 lg:px-16 bg-[#0F172A] border-b border-[#1E293B]">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-[#0EA5E9] flex items-center justify-center">
                <Zap className="w-7 h-7 text-white" fill="white" />
              </div>
              <span className="text-white text-2xl font-bold tracking-tight">CONTEXT MEMO</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
              The AI visibility layer<br />
              that lives on <span className="text-[#0EA5E9]">your domain.</span>
            </h1>
            <p className="text-[#94A3B8] text-xl leading-relaxed mb-12 max-w-2xl">
              We deploy citation-optimized content directly on your brand&apos;s domain, verify it gets cited by AI, and attribute the revenue. The only closed-loop platform in the category.
            </p>
            <div className="flex items-center gap-8 text-sm">
              <div>
                <p className="text-[#0EA5E9] font-bold text-lg">$2.5M</p>
                <p className="text-[#64748B]">Seed Round</p>
              </div>
              <div className="w-px h-10 bg-[#1E293B]" />
              <div>
                <p className="text-white font-bold text-lg">Confidential</p>
                <p className="text-[#64748B]">February 2026</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== THE SHIFT ===== */}
        <Section id="shift">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">The Shift</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#0F172A] leading-tight mb-8">
              B2B buyers stopped Googling.<br />
              <span className="text-[#94A3B8]">They started asking AI.</span>
            </h2>
            <p className="text-[#64748B] text-lg leading-relaxed mb-12">
              When a buyer asks ChatGPT &ldquo;What&apos;s the best CRM for small teams?&rdquo;, the AI doesn&apos;t show ten blue links. It gives one answer — with citations. The brands that get cited win. Everyone else is invisible.
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="bg-white border border-[#E2E8F0] p-6">
                <p className="text-[#0F172A] text-3xl font-bold mb-1">700M+</p>
                <p className="text-[#64748B] text-sm">weekly ChatGPT users</p>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-6">
                <p className="text-[#0F172A] text-3xl font-bold mb-1">50%</p>
                <p className="text-[#64748B] text-sm">predicted decline in organic search by 2028 (Gartner)</p>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-6">
                <p className="text-[#0F172A] text-3xl font-bold mb-1">0%</p>
                <p className="text-[#64748B] text-sm">of B2B brands can measure their AI visibility today</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ===== THE PROBLEM ===== */}
        <Section id="problem">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">The Problem</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#0F172A] leading-tight mb-12">
              Three problems no one<br />
              <span className="text-[#94A3B8]">has solved together.</span>
            </h2>
            <div className="space-y-8">
              <div className="bg-white border border-[#E2E8F0] p-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#FEF2F2] flex items-center justify-center shrink-0 mt-1">
                    <Eye className="w-5 h-5 text-[#EF4444]" />
                  </div>
                  <div>
                    <h3 className="text-[#0F172A] font-bold text-xl mb-2">Brands are blind</h3>
                    <p className="text-[#64748B] leading-relaxed">They have no idea how they appear — or don&apos;t appear — across ChatGPT, Claude, Gemini, or Perplexity. There&apos;s no &ldquo;Google Search Console&rdquo; for AI. No visibility data. No competitive benchmarks. They can&apos;t fix what they can&apos;t see.</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#FFF7ED] flex items-center justify-center shrink-0 mt-1">
                    <Target className="w-5 h-5 text-[#F59E0B]" />
                  </div>
                  <div>
                    <h3 className="text-[#0F172A] font-bold text-xl mb-2">Content doesn&apos;t reach AI</h3>
                    <p className="text-[#64748B] leading-relaxed">Blog posts and marketing pages aren&apos;t structured for AI consumption. They&apos;re written for humans and optimized for Google. AI models need factual, structured, citation-worthy content on authoritative domains — and most brands have none.</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#F0FDF4] flex items-center justify-center shrink-0 mt-1">
                    <BarChart3 className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div>
                    <h3 className="text-[#0F172A] font-bold text-xl mb-2">No one can prove ROI</h3>
                    <p className="text-[#64748B] leading-relaxed">Even if a brand gets cited, there&apos;s no way to connect that citation to a website visit, a CRM contact, or a closed deal. The CFO asks &ldquo;What did AI bring us?&rdquo; and the answer is silence. Without attribution, there&apos;s no budget.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ===== THE SOLUTION ===== */}
        <Section id="solution" dark>
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">The Solution</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              Context Memo
            </h2>
            <p className="text-[#94A3B8] text-xl mb-16 max-w-2xl">
              We make brands visible in AI — and prove it drives revenue. One platform that monitors, creates, deploys, verifies, and attributes.
            </p>

            <div className="grid sm:grid-cols-3 gap-6 mb-12">
              <div className="border border-[#1E293B] bg-[#1E293B]/50 p-6">
                <Globe className="w-6 h-6 text-[#0EA5E9] mb-4" />
                <h3 className="text-white font-bold mb-2">Deploy on your domain</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed">Content lives at <span className="text-[#0EA5E9] font-mono text-xs">ai.yourbrand.com</span> — inheriting your authority, your backlinks, your trust.</p>
              </div>
              <div className="border border-[#1E293B] bg-[#1E293B]/50 p-6">
                <ShieldCheck className="w-6 h-6 text-[#10B981] mb-4" />
                <h3 className="text-white font-bold mb-2">Verify it works</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed">We re-scan after deployment to prove your content is being cited. Timestamped. Measurable. Not a guess.</p>
              </div>
              <div className="border border-[#1E293B] bg-[#1E293B]/50 p-6">
                <TrendingUp className="w-6 h-6 text-[#8B5CF6] mb-4" />
                <h3 className="text-white font-bold mb-2">Attribute the revenue</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed">AI citation → website visit → HubSpot contact → closed deal. Full funnel. First-party data.</p>
              </div>
            </div>

            <div className="border border-[#1E293B] bg-[#0F172A] p-8">
              <p className="text-[#64748B] text-sm uppercase tracking-wider mb-3">The Difference</p>
              <p className="text-white text-lg leading-relaxed">
                The competitors raised $100M+ to build <span className="text-[#64748B]">monitoring dashboards</span>. We build <span className="text-[#0EA5E9] font-bold">infrastructure that lives on the customer&apos;s domain</span> — compounding in authority every day it runs.
              </p>
            </div>
          </div>
        </Section>

        {/* ===== THE PRODUCT ===== */}
        <Section id="product">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">The Product</p>
            <h2 className="text-4xl font-bold text-[#0F172A] mb-4">One platform. Five capabilities.</h2>
            <p className="text-[#64748B] text-lg mb-12">Each builds on the last. Together they form a closed loop no one else has.</p>

            <div className="space-y-6">
              {[
                {
                  num: '01',
                  title: 'AI Visibility Monitoring',
                  desc: 'Daily scans across 9 AI models — GPT-4o, Claude, Gemini, Perplexity, Grok, and more — plus Google AI Overviews. Track brand mentions, competitor citations, and visibility trends over time.',
                  color: '#0EA5E9',
                },
                {
                  num: '02',
                  title: 'Competitive Intelligence',
                  desc: 'AI responses reveal your actual competitive landscape — not what your sales team thinks. We discover and classify competitors, partners, aggregators, and publishers automatically from what AI cites.',
                  color: '#8B5CF6',
                },
                {
                  num: '03',
                  title: 'Content Generation & Domain Deployment',
                  desc: 'Citation-optimized memos deployed on your subdomain or folder path. Structured for AI consumption with Schema.org, llms.txt, and semantic HTML. Your domain authority. Your trust signals.',
                  color: '#10B981',
                },
                {
                  num: '04',
                  title: 'Citation Verification',
                  desc: 'After deployment, we re-scan to prove your content is being cited. Time-to-citation tracking. Verification dashboard. Not a vanity metric — a measurable outcome.',
                  color: '#F59E0B',
                },
                {
                  num: '05',
                  title: 'Revenue Attribution',
                  desc: 'Native HubSpot integration connects AI traffic to CRM contacts and closed-won deals. The CFO slide writes itself: "AI citations drove $X in pipeline this quarter."',
                  color: '#EC4899',
                },
              ].map((step) => (
                <div key={step.num} className="bg-white border border-[#E2E8F0] p-6 flex gap-6">
                  <div className="shrink-0">
                    <span className="font-mono text-sm font-bold" style={{ color: step.color }}>{step.num}</span>
                  </div>
                  <div>
                    <h3 className="text-[#0F172A] font-bold text-lg mb-2">{step.title}</h3>
                    <p className="text-[#64748B] leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ===== THE MOAT ===== */}
        <Section id="moat">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">The Moat</p>
            <h2 className="text-4xl font-bold text-[#0F172A] mb-4">Why this is hard to replicate.</h2>
            <p className="text-[#64748B] text-lg mb-12">We don&apos;t just have features others lack. We have structural advantages that compound over time.</p>

            <div className="space-y-6 mb-12">
              <div className="bg-white border border-[#E2E8F0] p-8">
                <h3 className="text-[#0F172A] font-bold text-xl mb-3">Domain-level deployment</h3>
                <p className="text-[#64748B] leading-relaxed mb-4">
                  Content lives on <span className="font-mono text-[#0EA5E9] text-sm bg-[#0EA5E9]/5 px-1.5 py-0.5">ai.yourbrand.com</span> or <span className="font-mono text-[#0EA5E9] text-sm bg-[#0EA5E9]/5 px-1.5 py-0.5">yourbrand.com/ai/</span>. It inherits the customer&apos;s domain authority, backlink profile, and trust signals — the same signals AI models use to determine citation-worthiness.
                </p>
                <p className="text-[#64748B] leading-relaxed">
                  Monitoring tools recommend content. We <em>are</em> the content layer. Once deployed, removing it means losing indexed pages, breaking citation chains, and forfeiting historical data. That&apos;s switching cost.
                </p>
              </div>

              <div className="bg-white border border-[#E2E8F0] p-8">
                <h3 className="text-[#0F172A] font-bold text-xl mb-3">Closed-loop verification</h3>
                <p className="text-[#64748B] leading-relaxed">
                  We&apos;re the only platform that proves content actually works by re-scanning after deployment. Every other tool stops at &ldquo;here&apos;s your visibility score.&rdquo; We measure time-to-citation and show before/after proof. That builds trust — and retention.
                </p>
              </div>

              <div className="bg-white border border-[#E2E8F0] p-8">
                <h3 className="text-[#0F172A] font-bold text-xl mb-3">Revenue attribution via HubSpot</h3>
                <p className="text-[#64748B] leading-relaxed">
                  No one else connects AI citation → website visit → CRM contact → closed deal. We do, natively through HubSpot — which also serves as our distribution channel (200K+ B2B teams). First-party data that justifies the investment to the CFO.
                </p>
              </div>

              <div className="bg-white border border-[#E2E8F0] p-8">
                <h3 className="text-[#0F172A] font-bold text-xl mb-3">Historical citation intelligence</h3>
                <p className="text-[#64748B] leading-relaxed">
                  Every day of scanning compounds the data moat. Per-prompt citation history, entity relationships, and competitive trends are impossible to recreate retroactively. The earlier a brand starts, the more intelligence they accumulate.
                </p>
              </div>
            </div>

            {/* Lighter competitive positioning */}
            <div className="bg-[#F1F5F9] border border-[#E2E8F0] p-8">
              <p className="text-[#64748B] text-sm uppercase tracking-wider mb-4">Competitive Landscape</p>
              <p className="text-[#0F172A] leading-relaxed mb-4">
                Profound ($58.5M from Sequoia), Peec AI ($29M), and Scrunch ($19M) have validated the category with over $110M in combined funding. They&apos;ve proven demand for AI visibility.
              </p>
              <p className="text-[#0F172A] leading-relaxed">
                But they&apos;re all monitoring dashboards. None of them generate content, deploy on the customer&apos;s domain, verify citations, or attribute revenue. We operate at a different layer of the stack — infrastructure, not analytics.
              </p>
            </div>
          </div>
        </Section>

        {/* ===== TRACTION ===== */}
        <Section id="traction" dark>
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">Traction</p>
            <h2 className="text-4xl font-bold text-white mb-12">Live product. Paying customer. Verified results.</h2>

            {/* Hero stat */}
            <div className="border border-[#0EA5E9]/30 bg-[#0EA5E9]/5 p-12 text-center mb-8">
              <p className="text-[#0EA5E9] text-7xl lg:text-8xl font-bold mb-4">&lt; 24h</p>
              <p className="text-white text-xl font-medium">From memo deployed to verified AI citation</p>
              <p className="text-[#94A3B8] mt-2">Traditional SEO takes weeks. We take hours.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="border border-[#1E293B] bg-[#1E293B]/50 p-8">
                <p className="text-[#10B981] text-3xl font-bold mb-2">$5K</p>
                <p className="text-white font-medium">First customer contract</p>
                <p className="text-[#94A3B8] text-sm mt-1">Pre-funding. Zero marketing spend.</p>
              </div>
              <div className="border border-[#1E293B] bg-[#1E293B]/50 p-8">
                <p className="text-white text-3xl font-bold mb-2">v0.26</p>
                <p className="text-white font-medium">Production-deployed</p>
                <p className="text-[#94A3B8] text-sm mt-1">Live at contextmemo.com. Shipping daily.</p>
              </div>
              <div className="border border-[#1E293B] bg-[#1E293B]/50 p-8">
                <p className="text-white text-3xl font-bold mb-2">9</p>
                <p className="text-white font-medium">AI models scanned</p>
                <p className="text-[#94A3B8] text-sm mt-1">GPT-4o, Claude, Gemini, Perplexity, Grok, and more.</p>
              </div>
              <div className="border border-[#1E293B] bg-[#1E293B]/50 p-8">
                <p className="text-white text-3xl font-bold mb-2">Full Loop</p>
                <p className="text-white font-medium">Closed-loop operational</p>
                <p className="text-[#94A3B8] text-sm mt-1">Scan → Generate → Deploy → Verify → Attribute.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ===== THE MARKET ===== */}
        <Section id="market">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">The Market</p>
            <h2 className="text-4xl font-bold text-[#0F172A] mb-4">AI search is the next SEO.</h2>
            <p className="text-[#64748B] text-xl mb-12">And it&apos;s year one.</p>

            <div className="space-y-6 mb-12">
              <div className="bg-white border-l-4 border-[#0EA5E9] border-y border-r border-[#E2E8F0] p-6">
                <p className="text-[#0F172A] text-2xl font-bold">$50B+</p>
                <p className="text-[#64748B]">spent annually on SEO and content marketing. AI visibility is the next budget line.</p>
              </div>
              <div className="bg-white border-l-4 border-[#8B5CF6] border-y border-r border-[#E2E8F0] p-6">
                <p className="text-[#0F172A] text-2xl font-bold">$110M+</p>
                <p className="text-[#64748B]">already invested in AI visibility tools. The category is validated — by Sequoia, Kleiner Perkins, and Decibel.</p>
              </div>
              <div className="bg-white border-l-4 border-[#10B981] border-y border-r border-[#E2E8F0] p-6">
                <p className="text-[#0F172A] text-2xl font-bold">200K+</p>
                <p className="text-[#64748B]">B2B teams on HubSpot — our primary distribution channel. None of the funded competitors have this integration.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ===== THE ASK ===== */}
        <Section id="ask" dark>
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">The Ask</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              $2.5M to own AI visibility<br />
              <span className="text-[#94A3B8]">before the market wakes up.</span>
            </h2>
            <p className="text-[#94A3B8] text-lg mb-12">Seed round. 18 months of runway. Three clear milestones.</p>

            <div className="space-y-6 mb-12">
              {[
                { title: 'Launch HubSpot Marketplace', desc: 'First AI citation tool in the marketplace. 200K+ B2B teams as organic distribution. First 50 paying customers.', pct: '40%' },
                { title: 'Scale the moat', desc: 'Expand verification engine, entity intelligence, and revenue attribution. Build the switching cost that compounds daily.', pct: '35%' },
                { title: 'GTM hire + enterprise expansion', desc: 'One GTM hire to convert marketplace inbound. Move upmarket to $10K–$50K/year enterprise contracts.', pct: '25%' },
              ].map((item) => (
                <div key={item.title} className="flex gap-6 border border-[#1E293B] bg-[#1E293B]/50 p-6">
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
                &ldquo;They raised $100M+ to build dashboards. We need $2.5M and 18 months — because we deploy infrastructure on the customer&apos;s domain, verify it drives citations, and prove the revenue. Capital-efficient. Differentiated. With a distribution wedge they don&apos;t have.&rdquo;
              </p>
            </div>
          </div>
        </Section>

        {/* ===== YOUR MOVE ===== */}
        <Section id="respond">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-6">Your Move</p>
            <h2 className="text-4xl font-bold text-[#0F172A] mb-4">What do you think?</h2>
            <p className="text-[#64748B] text-lg mb-12">
              The window to lead this category is now. We&apos;re looking for investors who understand infrastructure bets.
            </p>
            <ResponseSection email={email} />

            <div className="mt-16 pt-8 border-t border-[#E2E8F0] flex items-center justify-between">
              <div>
                <p className="text-[#94A3B8] text-sm">Questions? Reach out directly.</p>
                <a href="mailto:stephen@contextmemo.com" className="text-[#0EA5E9] hover:underline flex items-center gap-1 text-sm mt-1">
                  stephen@contextmemo.com <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex items-center gap-2 text-[#CBD5E1] text-xs">
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
    const params = new URLSearchParams(window.location.search)
    const accessCode = params.get('access')
    if (accessCode === 'SEED2026') {
      setEmail('direct-access@contextmemo.com')
      setVerified(true)
      setChecking(false)
      return
    }

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
