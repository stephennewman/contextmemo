'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      // Update last login
      await supabase
        .from('tenants')
        .update({ last_login_at: new Date().toISOString() })
        .eq('email', email)

      // Keep loading state true - let it persist through navigation
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="border-[3px] border-[#0F172A] bg-white">
      {/* Header */}
      <div className="p-6 border-b-[3px] border-[#0F172A]">
        <h1 className="text-2xl font-bold text-[#0F172A]">WELCOME BACK</h1>
        <p className="text-zinc-500 font-medium mt-1">Sign in to your Context Memo account</p>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-red-50 border-[3px] border-red-500 text-red-700 font-medium">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-bold tracking-widest text-zinc-500">
              EMAIL
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
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-bold tracking-widest text-zinc-500">
              PASSWORD
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 border-[3px] border-[#0F172A] bg-white text-[#0F172A] font-medium placeholder:text-zinc-400 focus:outline-none focus:border-[#0EA5E9]"
            />
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
            SIGN IN
          </button>
          
          <p className="text-sm text-zinc-500 text-center mt-4 font-medium">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#0EA5E9] hover:underline font-bold">
              SIGN UP
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}
