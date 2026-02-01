'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle, Users } from 'lucide-react'

interface InviteData {
  email: string
  role: string
  organization: {
    id: string
    name: string
    slug: string
  }
  invitedBy: {
    name: string | null
    email: string
  }
  expiresAt: string
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [invite, setInvite] = useState<InviteData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function fetchInvite() {
      try {
        const response = await fetch(`/api/invites/${token}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invalid invitation')
          return
        }

        setInvite(data.invite)
      } catch (e) {
        setError('Failed to load invitation')
      } finally {
        setLoading(false)
      }
    }

    fetchInvite()
  }, [token])

  const handleAccept = async () => {
    setAccepting(true)
    try {
      const response = await fetch(`/api/invites/${token}`, {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login with return URL
          router.push(`/login?redirect=/invite/${token}`)
          return
        }
        setError(data.error || 'Failed to accept invitation')
        return
      }

      setSuccess(true)
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (e) {
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Welcome to {invite?.organization.name}!</h2>
            <p className="text-slate-600 mb-4">You have successfully joined the team.</p>
            <p className="text-sm text-slate-500">Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-[#0EA5E9]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-6 w-6 text-[#0EA5E9]" />
          </div>
          <CardTitle>You&apos;re invited to join</CardTitle>
          <CardDescription className="text-lg font-semibold text-slate-900">
            {invite?.organization.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Invited by</span>
              <span className="font-medium">
                {invite?.invitedBy.name || invite?.invitedBy.email}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Your role</span>
              <span className="font-medium capitalize">{invite?.role}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Expires</span>
              <span className="font-medium">
                {invite?.expiresAt && new Date(invite.expiresAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <Button 
            onClick={handleAccept} 
            disabled={accepting}
            className="w-full bg-[#0EA5E9] hover:bg-[#0284C7]"
          >
            {accepting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Joining...
              </>
            ) : (
              'Accept Invitation'
            )}
          </Button>

          <p className="text-xs text-center text-slate-500">
            By accepting, you agree to join this organization and collaborate with its members.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
