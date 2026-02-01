'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getEmailDomain } from '@/lib/utils/domain-verification'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, CheckCircle, Users, Sparkles } from 'lucide-react'

// Pricing tranches - users lock in their price forever
const PRICING_TRANCHES = [
  { min: 1, max: 10, price: 0 },
  { min: 11, max: 25, price: 1 },
  { min: 26, max: 50, price: 3 },
  { min: 51, max: 100, price: 5 },
  { min: 101, max: 175, price: 9 },
  { min: 176, max: 275, price: 15 },
  { min: 276, max: 400, price: 19 },
  { min: 401, max: 575, price: 29 },
  { min: 576, max: 800, price: 39 },
  { min: 801, max: 1100, price: 49 },
  { min: 1101, max: 1500, price: 65 },
  { min: 1501, max: 2000, price: 79 },
  { min: 2001, max: Infinity, price: 99 },
];

function getCurrentTranche(userCount: number) {
  return PRICING_TRANCHES.find(t => userCount >= t.min && userCount <= t.max) || PRICING_TRANCHES[PRICING_TRANCHES.length - 1];
}

// TODO: Replace with actual user count from database
const CURRENT_USER_COUNT = 7;

export default function SignupPage() {
  const currentTranche = getCurrentTranche(CURRENT_USER_COUNT);
  const spotsLeft = currentTranche.max - CURRENT_USER_COUNT + 1;
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Basic validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
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
      const supabase = createClient()
      
      // Get the current origin for redirect URL
      const redirectTo = `${window.location.origin}/auth/callback?next=/brands/new`
      
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
      // (RLS requires authenticated user, which only happens after confirmation)
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
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <Mail className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a confirmation link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Click the link in your email to verify your account and get started.
          </p>
          <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 p-4">
            <div className="flex items-center justify-center gap-2 text-sm text-green-700 dark:text-green-300">
              <Sparkles className="h-4 w-4" />
              <span>
                Your price: <strong>{currentTranche.price === 0 ? 'FREE' : `$${currentTranche.price}/mo`}</strong> locked in forever
              </span>
            </div>
          </div>
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Confirmation link expires in 24 hours</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Didn&apos;t receive the email?{' '}
            <button 
              onClick={() => setEmailSent(false)}
              className="text-primary hover:underline font-medium"
            >
              Try again
            </button>
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Already verified?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Pricing Tier Banner */}
      <div className="rounded-lg border bg-linear-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
              <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="font-semibold text-green-900 dark:text-green-100">
                {currentTranche.price === 0 ? 'Lock in FREE forever' : `Lock in $${currentTranche.price}/mo forever`}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                You&apos;re user #{CURRENT_USER_COUNT + 1} · {spotsLeft} spots left at this price
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <Users className="h-3.5 w-3.5" />
            <span>{CURRENT_USER_COUNT} signed up</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
          <CardDescription>
            Get started with Context Memo using your work email
          </CardDescription>
        </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <p className="text-xs text-muted-foreground">
              Use your work email to verify brand ownership
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
          <p className="text-xs text-muted-foreground text-center">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardFooter>
      </form>
    </Card>
    </div>
  )
}
