'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Loader2, CheckCircle } from 'lucide-react'

export default function VerifyEmailPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResend = async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.email) {
        setError('No email found. Please sign up again.')
        return
      }

      // Always use production URL for email redirects (never localhost)
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://contextmemo.com'
      
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?next=/brands/new`,
        }
      })

      if (resendError) {
        setError(resendError.message)
        return
      }

      setSent(true)
    } catch {
      setError('Failed to resend verification email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
          <Mail className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
        <CardDescription>
          Please verify your email address to access your dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {sent ? (
          <div className="rounded-lg border bg-green-50 dark:bg-green-900/10 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>Verification email sent! Check your inbox.</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            We sent you a verification link when you signed up. Click the button below if you need a new one.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button 
          onClick={handleResend} 
          disabled={loading || sent}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {sent ? 'Email Sent' : 'Resend Verification Email'}
        </Button>
        <p className="text-sm text-muted-foreground text-center">
          Wrong account?{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in with a different email
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
