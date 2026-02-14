'use client'

import { useState, useEffect, useRef } from 'react'
import { Zap, ArrowRight, Send, ChevronRight, Check, X, MessageSquare, DollarSign, ExternalLink, Eye, ShieldCheck, Globe, BarChart3, Target } from 'lucide-react'

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
function Sidebar({ activeSection, onNavigate }: { activeSection: string; onNavigate: (id: string) => void }) {

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
            onClick={() => onNavigate(section.id)}
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

// --- SECTION WRAPPER ---
type SectionBg = 'white' | 'warm' | 'cool' | 'slate' | 'dark' | 'navy'

const BG_CLASSES: Record<SectionBg, string> = {
  white: 'bg-white border-[#F1F5F9]',
  warm: 'bg-[#FAFBFC] border-[#F1F5F9]',
  cool: 'bg-[#F8FAFC] border-[#E2E8F0]',
  slate: 'bg-[#F1F5F9] border-[#E2E8F0]',
  dark: 'bg-[#0F172A] border-[#1E293B]',
  navy: 'bg-[#0B1120] border-[#1E293B]',
}

function Section({ id, children, bg = 'white' }: { id: string; children: React.ReactNode; bg?: SectionBg }) {
  return (
    <section
      id={id}
      className={`min-h-screen flex flex-col justify-center py-16 lg:py-20 px-8 lg:px-16 border-b last:border-0 ${BG_CLASSES[bg]}`}
    >
      {children}
    </section>
  )
}

// --- MAIN PITCH DECK ---
function PitchDeck({ email }: { email: string }) {
  const [activeSection, setActiveSection] = useState('title')
  const contentRef = useRef<HTMLElement>(null)
  const isScrolling = useRef(false)

  useEffect(() => {
    fetch('/api/raise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log_visit', email }),
    }).catch(() => {})
  }, [email])

  // Track which section is in view on scroll
  useEffect(() => {
    const container = contentRef.current
    if (!container) return

    const handleScroll = () => {
      if (isScrolling.current) return
      const scrollTop = container.scrollTop
      const containerHeight = container.clientHeight

      let current = 'title'
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id)
        if (!el) continue
        // Section is "active" when its top is within the top 40% of the viewport
        if (el.offsetTop <= scrollTop + containerHeight * 0.4) {
          current = id
        }
      }
      setActiveSection(current)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavigate = (id: string) => {
    const el = document.getElementById(id)
    const container = contentRef.current
    if (!el || !container) return

    // Immediately update the active section
    setActiveSection(id)
    isScrolling.current = true

    container.scrollTo({ top: el.offsetTop, behavior: 'smooth' })

    // Re-enable scroll tracking after animation completes
    setTimeout(() => { isScrolling.current = false }, 800)
  }

  return (
    <div className="flex min-h-screen bg-[#FAFBFC]">
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />
      <ActiveViewers />

      <main ref={contentRef} className="ml-64 flex-1 h-screen overflow-y-auto">

        {/* ===== TITLE PAGE ===== */}
        <section id="title" className="min-h-screen flex flex-col justify-center py-16 lg:py-20 px-8 lg:px-16 bg-[#0F172A] border-b border-[#1E293B]">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-[#0EA5E9] flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" fill="white" />
              </div>
              <span className="text-white text-xl font-bold tracking-tight">CONTEXT MEMO</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white leading-[1.1] mb-5">
              The AI visibility layer<br />
              that lives on <span className="text-[#0EA5E9]">your domain.</span>
            </h1>
            <p className="text-[#94A3B8] text-lg leading-relaxed mb-8 max-w-2xl">
              We analyze your brand, discover where AI cites your competitors instead of you, and continuously deploy white-labeled content on your domain to fill the gaps. Then we verify AI is consuming it.
            </p>
            <div className="flex items-center gap-8 text-sm">
              <div>
                <p className="text-[#0EA5E9] font-bold text-lg">$2.5M</p>
                <p className="text-[#64748B]">Seed Round</p>
              </div>
              <div className="w-px h-8 bg-[#1E293B]" />
              <div>
                <p className="text-white font-bold text-lg">Confidential</p>
                <p className="text-[#64748B]">February 2026</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== THE SHIFT ===== */}
        <Section id="shift" bg="white">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-4">The Shift</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] leading-tight mb-4">
              B2B buyers stopped Googling.<br />
              <span className="text-[#94A3B8]">They started asking AI.</span>
            </h2>
            <p className="text-[#64748B] text-base leading-relaxed mb-8">
              When a buyer asks ChatGPT &ldquo;What&apos;s the best CRM for small teams?&rdquo;, the AI doesn&apos;t show ten blue links. It gives one answer — with citations. The brands that get cited win. Everyone else is invisible.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-5">
                <p className="text-[#0F172A] text-2xl font-bold mb-1">700M+</p>
                <p className="text-[#64748B] text-xs">weekly ChatGPT users</p>
              </div>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-5">
                <p className="text-[#0F172A] text-2xl font-bold mb-1">50%</p>
                <p className="text-[#64748B] text-xs">predicted decline in organic search by 2028 (Gartner)</p>
              </div>
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-5">
                <p className="text-[#0F172A] text-2xl font-bold mb-1">0%</p>
                <p className="text-[#64748B] text-xs">of B2B brands can measure their AI visibility today</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ===== THE PROBLEM ===== */}
        <Section id="problem" bg="warm">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-4">The Problem</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] leading-tight mb-3">
              AI is a black box<br />
              <span className="text-[#94A3B8]">for marketers.</span>
            </h2>
            <p className="text-[#64748B] text-base mb-8">Every marketing team is asking the same four questions — and nobody has the answers.</p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E2E8F0] p-5">
                <div className="w-8 h-8 bg-[#FEF2F2] flex items-center justify-center mb-3">
                  <Eye className="w-4 h-4 text-[#EF4444]" />
                </div>
                <h3 className="text-[#0F172A] font-bold text-sm mb-1">Who is searching — and for what?</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">There&apos;s no &ldquo;Search Console&rdquo; for AI. No way to see what buyers are asking ChatGPT, Claude, or Perplexity about your category.</p>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-5">
                <div className="w-8 h-8 bg-[#FFF7ED] flex items-center justify-center mb-3">
                  <Target className="w-4 h-4 text-[#F59E0B]" />
                </div>
                <h3 className="text-[#0F172A] font-bold text-sm mb-1">Is my content showing up?</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">Brands have zero visibility into whether AI is citing them, citing competitors, or ignoring their category entirely.</p>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-5">
                <div className="w-8 h-8 bg-[#F0FDF4] flex items-center justify-center mb-3">
                  <BarChart3 className="w-4 h-4 text-[#10B981]" />
                </div>
                <h3 className="text-[#0F172A] font-bold text-sm mb-1">What do I create — and is it working?</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">No playbook for AI-optimized content. No verification that it&apos;s being consumed. No before/after proof. No budget without proof.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ===== THE SOLUTION ===== */}
        <Section id="solution" bg="dark">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-4">The Solution</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-3">
              Context Memo
            </h2>
            <p className="text-[#94A3B8] text-base mb-8 max-w-2xl">
              An autonomous AI visibility engine. We analyze your brand, discover where competitors are being cited instead of you, and continuously deploy white-labeled content on your domain to fill the gaps — then verify AI is consuming it.
            </p>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="border border-[#1E293B] bg-[#1E293B]/50 p-5">
                <Target className="w-5 h-5 text-[#0EA5E9] mb-3" />
                <h3 className="text-white font-bold mb-2">Analyze &amp; discover</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed">Learn your brand, reverse-engineer the prompts that matter, and map the competitive landscape AI actually sees.</p>
              </div>
              <div className="border border-[#1E293B] bg-[#1E293B]/50 p-5">
                <Globe className="w-5 h-5 text-[#10B981] mb-3" />
                <h3 className="text-white font-bold mb-2">Generate &amp; deploy</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed">White-labeled memos matching your brand — deployed on your domain via HubSpot, subdomain, or folder path.</p>
              </div>
              <div className="border border-[#1E293B] bg-[#1E293B]/50 p-5">
                <ShieldCheck className="w-5 h-5 text-[#8B5CF6] mb-3" />
                <h3 className="text-white font-bold mb-2">Monitor &amp; verify</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed">Continuous monitoring with verified proof that AI is consuming and citing your content. Before/after timestamps.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ===== THE PRODUCT ===== */}
        <Section id="product" bg="cool">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-4">The Product</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-3">What makes it different.</h2>
            <p className="text-[#64748B] text-base mb-8">Not a dashboard. Not a report. An engine that lives on your domain, deploys content autonomously, and scales with you.</p>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E2E8F0] p-5">
                <h3 className="text-[#0F172A] font-bold text-sm mb-2">White-labeled memos</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">AI-optimized content matching your brand&apos;s tone, voice, and design. Published on <span className="font-mono text-[#0EA5E9] text-xs">yourdomain.com</span> — not ours. Your authority. Your trust signals.</p>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-5">
                <h3 className="text-[#0F172A] font-bold text-sm mb-2">Flexible deployment</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">Deploy via HubSpot blog, subdomain, or folder path. Scan 1 AI model or 9. Run 50 prompts or 5,000. Generate 1 memo/day or 100. You control the pace.</p>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-5">
                <h3 className="text-[#0F172A] font-bold text-sm mb-2">Verified consumption</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">Re-scan after deployment to confirm AI is citing your content. Time-to-citation tracking. Before/after proof with timestamps. Not guesswork.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ===== THE MOAT ===== */}
        <Section id="moat" bg="slate">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-4">The Moat</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-3">Why this is hard to replicate.</h2>
            <p className="text-[#64748B] text-base mb-8">Profound ($58.5M), Peec AI ($29M), and Scrunch ($19M) validated the category. But they&apos;re all dashboards. We have structural advantages they can&apos;t bolt on.</p>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E2E8F0] p-5">
                <h3 className="text-[#0F172A] font-bold text-sm mb-2">Autonomous content engine</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">
                  Competitors sell monitoring. We generate, deploy, and optimize white-labeled content on your domain — continuously and autonomously.
                </p>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-5">
                <h3 className="text-[#0F172A] font-bold text-sm mb-2">Domain-level deployment</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">
                  Content lives on <span className="font-mono text-[#0EA5E9] text-xs">ai.yourbrand.com</span>. Inherits your domain authority and trust. Removing it breaks citation chains — switching cost that grows daily.
                </p>
              </div>
              <div className="bg-white border border-[#E2E8F0] p-5">
                <h3 className="text-[#0F172A] font-bold text-sm mb-2">Compounding intelligence</h3>
                <p className="text-[#64748B] text-sm leading-relaxed">
                  Every day of scanning builds the data moat. Per-prompt history, entity relationships, and competitive trends — impossible to recreate retroactively.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* ===== TRACTION ===== */}
        <Section id="traction" bg="navy">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-4">Traction</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">Live product. Paying customer. Verified results.</h2>
            <p className="text-[#94A3B8] text-base mb-8">Production-deployed across 9 AI models. Full closed-loop operational: analyze, deploy, verify.</p>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="border border-[#0EA5E9]/30 bg-[#0EA5E9]/5 p-5">
                <p className="text-[#0EA5E9] text-3xl font-bold mb-1">&lt; 24h</p>
                <p className="text-white text-sm font-medium">Memo to AI citation</p>
                <p className="text-[#94A3B8] text-xs mt-1">Traditional SEO takes weeks. We take hours.</p>
              </div>
              <div className="border border-[#1E293B] bg-[#1E293B]/50 p-5">
                <p className="text-[#10B981] text-3xl font-bold mb-1">$5K</p>
                <p className="text-white text-sm font-medium">First customer contract</p>
                <p className="text-[#94A3B8] text-xs mt-1">Pre-funding. Zero marketing spend.</p>
              </div>
              <div className="border border-[#1E293B] bg-[#1E293B]/50 p-5">
                <p className="text-white text-3xl font-bold mb-1">9</p>
                <p className="text-white text-sm font-medium">AI models scanned</p>
                <p className="text-[#94A3B8] text-xs mt-1">GPT-4o, Claude, Gemini, Perplexity, Grok+</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ===== THE MARKET ===== */}
        <Section id="market" bg="white">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-4">The Market</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-2">AI search is the next SEO.</h2>
            <p className="text-[#64748B] text-base mb-8">And it&apos;s year one.</p>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-[#F8FAFC] border-l-4 border-[#0EA5E9] border-y border-r border-[#E2E8F0] p-5">
                <p className="text-[#0F172A] text-2xl font-bold">$50B+</p>
                <p className="text-[#64748B] text-sm">annual SEO & content spend. AI visibility is the next budget line.</p>
              </div>
              <div className="bg-[#F8FAFC] border-l-4 border-[#8B5CF6] border-y border-r border-[#E2E8F0] p-5">
                <p className="text-[#0F172A] text-2xl font-bold">$110M+</p>
                <p className="text-[#64748B] text-sm">invested in AI visibility. Category validated by Sequoia, KP, Decibel.</p>
              </div>
              <div className="bg-[#F8FAFC] border-l-4 border-[#10B981] border-y border-r border-[#E2E8F0] p-5">
                <p className="text-[#0F172A] text-2xl font-bold">200K+</p>
                <p className="text-[#64748B] text-sm">B2B teams on HubSpot — our primary distribution. No competitor has it.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ===== THE ASK ===== */}
        <Section id="ask" bg="dark">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-4">The Ask</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-white leading-tight mb-3">
              $2.5M to own AI visibility<br />
              <span className="text-[#94A3B8]">before the market wakes up.</span>
            </h2>
            <p className="text-[#94A3B8] text-base mb-8">Seed round. 18 months of runway. Three clear milestones.</p>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { title: 'Launch HubSpot Marketplace', desc: 'First AI citation tool in the marketplace. 200K+ B2B teams as distribution.', pct: '40%' },
                { title: 'Scale the moat', desc: 'Verification engine, entity intelligence, content automation. Switching cost that compounds daily.', pct: '35%' },
                { title: 'GTM + enterprise', desc: 'One GTM hire for inbound. Move upmarket to $10K–$50K/year contracts.', pct: '25%' },
              ].map((item) => (
                <div key={item.title} className="border border-[#1E293B] bg-[#1E293B]/50 p-5">
                  <span className="text-[#0EA5E9] font-mono text-xs font-bold">{item.pct}</span>
                  <h3 className="text-white font-bold text-sm mt-3 mb-2">{item.title}</h3>
                  <p className="text-[#94A3B8] text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ===== YOUR MOVE ===== */}
        <Section id="respond" bg="warm">
          <div className="max-w-3xl">
            <p className="text-[#0EA5E9] text-sm font-semibold uppercase tracking-wider mb-4">Your Move</p>
            <h2 className="text-3xl lg:text-4xl font-bold text-[#0F172A] mb-3">What do you think?</h2>
            <p className="text-[#64748B] text-base mb-8">
              The category is validated. The demand is proven. We&apos;re the only ones building the engine, not just the dashboard.
            </p>
            <ResponseSection email={email} />

            <div className="mt-10 pt-6 border-t border-[#E2E8F0] flex items-center justify-between">
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
