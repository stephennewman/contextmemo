'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  Send, 
  Shield, 
  Bot, 
  Eye, 
  Target, 
  FileText,
  Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function RequestAccessPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/access-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, company, message }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to submit request')
        return
      }

      setSubmitted(true)
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
            <Link href="/pricing" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
              PRICING
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-16">
          
          {/* Left Column - Value Prop */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0EA5E9]/20 border border-[#0EA5E9]/30 text-[#0EA5E9] text-sm font-bold tracking-wide mb-8">
              <Shield className="h-4 w-4" />
              INVITE-ONLY PLATFORM
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[0.95] mb-6">
              REQUEST{" "}
              <span className="text-[#0EA5E9]">EARLY ACCESS</span>
            </h1>
            
            <p className="text-xl text-slate-400 mb-10 leading-relaxed">
              Context Memo is currently invite-only. Request access and we&apos;ll get back 
              to you within 24 hours with your invite code.
            </p>

            {/* What You Get */}
            <div className="space-y-6 mb-10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#0EA5E9] flex items-center justify-center shrink-0">
                  <Eye className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">6 AI MODEL SCANNING</h3>
                  <p className="text-sm text-slate-400">Daily visibility checks across ChatGPT, Claude, Perplexity, Gemini, Llama, and Mistral.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#0EA5E9] flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">COMPETITIVE INTELLIGENCE</h3>
                  <p className="text-sm text-slate-400">See which competitors win AI recommendations. Get share-of-voice metrics.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#0EA5E9] flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">AUTO-GENERATED MEMOS</h3>
                  <p className="text-sm text-slate-400">Structured content cross-referenced with your brand. Built for how AI reads.</p>
                </div>
              </div>
            </div>

            {/* Discount Badge */}
            <div className="p-4 border-2 border-[#0EA5E9]/30 bg-[#0EA5E9]/10">
              <p className="text-sm font-bold text-[#0EA5E9] mb-1">EARLY ACCESS PRICING</p>
              <p className="text-slate-400 text-sm">
                We offer generous discounts and pricing flexibility for early access members. 
                Mention your use case and team size for a custom quote.
              </p>
            </div>

            {/* Already have a code? */}
            <div className="mt-8 flex items-center gap-2 text-sm text-slate-500">
              <Lock className="h-4 w-4" />
              <span>Already have an invite code?{' '}
                <Link href="/signup" className="text-[#0EA5E9] hover:underline font-bold">
                  SIGN UP HERE
                </Link>
              </span>
            </div>
          </div>

          {/* Right Column - Form */}
          <div>
            {submitted ? (
              <div className="border-2 border-[#10B981] bg-[#10B981]/10 p-10 text-center">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-[#10B981]">
                  <Send className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-black mb-3">REQUEST RECEIVED</h2>
                <p className="text-slate-400 mb-6">
                  We&apos;ll review your request and send your invite code within 24 hours.
                </p>
                <p className="text-sm text-slate-500">
                  Check your email at <strong className="text-white">{email}</strong> for your invite code.
                </p>
                <div className="mt-8 pt-6 border-t border-white/10">
                  <p className="text-sm text-slate-500">
                    Want to learn more while you wait?
                  </p>
                  <div className="mt-3 flex gap-3 justify-center">
                    <Link 
                      href="/memos" 
                      className="px-4 py-2 border-2 border-white/20 text-sm font-bold text-white hover:bg-white/10 transition-colors"
                    >
                      READ MEMOS
                    </Link>
                    <Link 
                      href="/pricing" 
                      className="px-4 py-2 border-2 border-white/20 text-sm font-bold text-white hover:bg-white/10 transition-colors"
                    >
                      VIEW PRICING
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-white/20 bg-white/5">
                <div className="p-6 border-b-2 border-white/20">
                  <h2 className="text-xl font-black">REQUEST YOUR INVITE CODE</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Tell us about your company and we&apos;ll get you set up.
                  </p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="p-6 space-y-5">
                    {error && (
                      <div className="p-4 bg-red-500/10 border-2 border-red-500 text-red-400 font-medium text-sm">
                        {error}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label htmlFor="name" className="text-xs font-bold tracking-widest text-slate-400">
                        FULL NAME *
                      </label>
                      <input
                        id="name"
                        type="text"
                        placeholder="Jane Smith"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-4 py-3 border-2 border-white/20 bg-white/5 text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-[#0EA5E9]"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="text-xs font-bold tracking-widest text-slate-400">
                        WORK EMAIL *
                      </label>
                      <input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-4 py-3 border-2 border-white/20 bg-white/5 text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-[#0EA5E9]"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="company" className="text-xs font-bold tracking-widest text-slate-400">
                        COMPANY
                      </label>
                      <input
                        id="company"
                        type="text"
                        placeholder="Acme Corp"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-white/20 bg-white/5 text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-[#0EA5E9]"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="message" className="text-xs font-bold tracking-widest text-slate-400">
                        WHAT ARE YOU LOOKING FOR?
                      </label>
                      <textarea
                        id="message"
                        placeholder="Tell us about your AI visibility goals, team size, and use case..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-white/20 bg-white/5 text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-[#0EA5E9] resize-none"
                      />
                    </div>
                  </div>

                  <div className="p-6 border-t-2 border-white/20 bg-white/5">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full px-6 py-3 bg-[#0EA5E9] text-white font-bold text-sm tracking-wide hover:bg-[#0284C7] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      REQUEST EARLY ACCESS
                    </button>

                    <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                        <span>No commitment</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                        <span>24hr response</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                        <span>Custom pricing</span>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

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
              <Link href="/pricing" className="hover:text-white transition-colors">PRICING</Link>
              <Link href="/login" className="hover:text-white transition-colors">SIGN IN</Link>
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
