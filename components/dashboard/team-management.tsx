'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Users, 
  UserPlus, 
  MoreVertical, 
  Mail, 
  Loader2, 
  Copy, 
  Check,
  Crown,
  Shield,
  User,
  Eye
} from 'lucide-react'
import { toast } from 'sonner'

interface Member {
  id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joined_at: string
  user: {
    id: string
    email: string
    name: string | null
  }
}

interface Invite {
  id: string
  email: string
  role: string
  expires_at: string
}

interface TeamManagementProps {
  organizationId: string
  organizationName: string
  userRole: 'owner' | 'admin' | 'member' | 'viewer'
}

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
}

const ROLE_COLORS = {
  owner: 'bg-amber-100 text-amber-800',
  admin: 'bg-purple-100 text-purple-800',
  member: 'bg-blue-100 text-blue-800',
  viewer: 'bg-slate-100 text-slate-800',
}

export function TeamManagement({ organizationId, organizationName, userRole }: TeamManagementProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member')
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  const canManageMembers = userRole === 'owner' || userRole === 'admin'

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`)
      const data = await response.json()
      
      if (response.ok) {
        setMembers(data.members || [])
        setInvites(data.invites || [])
      }
    } catch (error) {
      console.error('Failed to fetch members:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [organizationId])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    try {
      const response = await fetch(`/api/organizations/${organizationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, inviteRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to send invitation')
        return
      }

      toast.success('Invitation sent!')
      setInviteEmail('')
      
      // Copy invite link to clipboard
      if (data.inviteUrl) {
        await navigator.clipboard.writeText(data.inviteUrl)
        toast.success('Invite link copied to clipboard')
      }
      
      fetchMembers()
    } catch (error) {
      toast.error('Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members?memberId=${memberId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        toast.success('Member removed')
        fetchMembers()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to remove member')
      }
    } catch (error) {
      toast.error('Failed to remove member')
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/members?inviteId=${inviteId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        toast.success('Invitation cancelled')
        fetchMembers()
      } else {
        toast.error('Failed to cancel invitation')
      }
    } catch (error) {
      toast.error('Failed to cancel invitation')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Members
            </CardTitle>
            <CardDescription>
              {members.length} member{members.length !== 1 ? 's' : ''} in {organizationName}
              <span className="ml-2 text-green-600 font-medium">• Unlimited seats</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invite Form */}
        {canManageMembers && (
          <form onSubmit={handleInvite} className="flex gap-2">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="email"
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'viewer')}
              className="px-3 py-2 border rounded-md text-sm"
            >
              {userRole === 'owner' && <option value="admin">Admin</option>}
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </>
              )}
            </Button>
          </form>
        )}

        {/* Members List */}
        <div className="space-y-2">
          {members.map((member) => {
            const RoleIcon = ROLE_ICONS[member.role]
            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-slate-600">
                      {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">
                      {member.user.name || member.user.email}
                    </p>
                    {member.user.name && (
                      <p className="text-sm text-slate-500">{member.user.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={ROLE_COLORS[member.role]}>
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {member.role}
                  </Badge>
                  {canManageMembers && member.role !== 'owner' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600"
                        >
                          Remove from team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Pending Invites */}
        {invites.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-500">Pending Invitations</h4>
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 border border-dashed rounded-lg bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-600">{invite.email}</p>
                    <p className="text-xs text-slate-400">
                      Expires {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {invite.role}
                  </Badge>
                  {canManageMembers && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvite(invite.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
