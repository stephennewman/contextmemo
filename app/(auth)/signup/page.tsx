'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getEmailDomain } from '@/lib/utils/domain-verification'
import { Loader2, Mail, CheckCircle, Shield, Lock } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Validate invite code first
    if (!inviteCode.trim()) {
      setError('Invite code is required')
      setLoading(false)
      return
    }

    try {
      const inviteRes = await fetch('/api/auth/validate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode }),
      })

      if (!inviteRes.ok) {
        const { error: inviteError } = await inviteRes.json()
        setError(inviteError || 'Invalid invite code')
        setLoading(false)
        return
      }
    } catch {
      setError('Failed to validate invite code. Please try again.')
      setLoading(false)
      return
    }

    // Password validation
    const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{12,}$/
    if (!passwordPolicy.test(password)) {
      setError('Password must be 12+ chars and include upper, lower, number, and symbol')
      setLoading(false)
      return
    }

    // Check for work email (not free providers)
    const freeEmailProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com']
    const emailDomain = getEmailDomain(email)
    
    if (freeEmailProviders.includes(emailDomain.toLowerCase())) {
      setError('Please use your work email address to sign up')
      setLoading(false)
      return
    }

    try {
      const rateLimitResponse = await fetch('/api/auth/rate-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', email }),
      })

      if (!rateLimitResponse.ok) {
        setError('Too many attempts. Please wait and try again.')
        return
      }

      const supabase = createClient()
      
      // Always use production URL for email redirects (never localhost)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://contextmemo.com'
      const redirectTo = `${siteUrl}/auth/callback?next=/brands/new`
      
      // Sign up with Supabase Auth - requires email confirmation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            name,
            email_domain: emailDomain,
          }
        }
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError('Failed to create account')
        return
      }

      // Tenant record will be created in auth callback after email verification
      setEmailSent(true)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Show confirmation screen after signup
  if (emailSent) {
    return (
      <div className="border-[3px] border-[#0F172A] bg-white">
        <div className="p-6 border-b-[3px] border-[#0F172A] text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center bg-[#10B981]">
            <Mail className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A]">CHECK YOUR EMAIL</h1>
          <p className="text-zinc-500 font-medium mt-2">
            We&apos;ve sent a confirmation link to <strong className="text-[#0F172A]">{email}</strong>
          </p>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-500 text-center font-medium">
            Click the link in your email to verify your account and get started.
          </p>
          <div className="p-4 border-[3px] border-[#0F172A] bg-[#F8FAFC]">
            <div className="flex items-center justify-center gap-2 text-sm font-medium">
              <CheckCircle className="h-4 w-4 text-[#10B981]" strokeWidth={2.5} />
              <span>Confirmation link expires in 24 hours</span>
            </div>
          </div>
        </div>
        <div className="p-6 border-t-[3px] border-[#0F172A] bg-[#F8FAFC] text-center">
          <p className="text-sm text-zinc-500 font-medium">
            Didn&apos;t receive the email?{' '}
            <button 
              onClick={() => setEmailSent(false)}
              className="text-[#0EA5E9] hover:underline font-bold"
            >
              TRY AGAIN
            </button>
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            Already verified?{' '}
            <Link href="/login" className="text-[#0EA5E9] hover:underline font-bold">
              SIGN IN
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Premium Access Banner */}
      <div className="p-4 bg-[#0F172A] text-white" style={{ borderLeft: '8px solid #0EA5E9' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-[#0EA5E9]">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold">INVITE-ONLY ACCESS</div>
            <div className="text-sm text-white/70 font-medium">
              Enter your invite code to create an account
            </div>
          </div>
        </div>
      </div>

      <div className="border-[3px] border-[#0F172A] bg-white">
        {/* Header */}
        <div className="p-6 border-b-[3px] border-[#0F172A]">
          <h1 className="text-2xl font-bold text-[#0F172A]">CREATE YOUR ACCOUNT</h1>
          <p className="text-zinc-500 font-medium mt-1">Use your invite code and work email to get started</p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border-[3px] border-red-500 text-red-700 font-medium">
                {error}
              </div>
            )}

            {/* Invite Code - First and Prominent */}
            <div className="space-y-2">
              <label htmlFor="inviteCode" className="text-xs font-bold tracking-widest text-zinc-500">
                INVITE CODE
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  id="inviteCode"
                  type="text"
                  placeholder="e.g. AMAZING2026"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  required
                  className="w-full pl-10 pr-4 py-3 border-[3px] border-[#0F172A] bg-white text-[#0F172A] font-bold placeholder:text-zinc-400 placeholder:font-medium focus:outline-none focus:border-[#0EA5E9] uppercase tracking-widest"
                />
              </div>
              <p className="text-xs text-zinc-500 font-medium">
                Don&apos;t have one?{' '}
                <Link href="/request-access" className="text-[#0EA5E9] hover:underline font-bold">
                  REQUEST AN INVITE CODE
                </Link>
              </p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="name" className="text-xs font-bold tracking-widest text-zinc-500">
                FULL NAME
              </label>
              <input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="w-full px-4 py-3 border-[3px] border-[#0F172A] bg-white text-[#0F172A] font-medium placeholder:text-zinc-400 focus:outline-none focus:border-[#0EA5E9]"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-bold tracking-widest text-zinc-500">
                WORK EMAIL
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border-[3px] border-[#0F172A] bg-white text-[#0F172A] font-medium placeholder:text-zinc-400 focus:outline-none focus:border-[#0EA5E9]"
              />
              <p className="text-xs text-zinc-500 font-medium">
                Use your work email to verify brand ownership
              </p>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-bold tracking-widest text-zinc-500">
                PASSWORD
              </label>
              <input
                id="password"
                type="password"
                placeholder="Minimum 12 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={12}
                autoComplete="new-password"
                className="w-full px-4 py-3 border-[3px] border-[#0F172A] bg-white text-[#0F172A] font-medium placeholder:text-zinc-400 focus:outline-none focus:border-[#0EA5E9]"
              />
              <p className="text-xs text-zinc-500 font-medium">
                12+ chars with upper, lower, number, and symbol
              </p>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-6 border-t-[3px] border-[#0F172A] bg-[#F8FAFC]">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-[#0EA5E9] text-white font-bold text-sm tracking-wide hover:bg-[#0284C7] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              CREATE ACCOUNT
            </button>
            
            <p className="text-sm text-zinc-500 text-center mt-4 font-medium">
              Already have an account?{' '}
              <Link href="/login" className="text-[#0EA5E9] hover:underline font-bold">
                SIGN IN
              </Link>
            </p>
            
            <p className="text-xs text-zinc-400 text-center mt-2">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
