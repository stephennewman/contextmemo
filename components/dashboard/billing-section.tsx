'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, CreditCard, ArrowUpRight, Zap, Rocket, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface BillingSectionProps {
  currentPlan: string
  usage: {
    prompts: { current: number; limit: number }
    memos: { current: number; limit: number }
    brands: { current: number; limit: number }
  }
  hasStripeCustomer: boolean
}

const PLAN_DETAILS = {
  free: {
    name: 'Free',
    icon: Zap,
    color: 'text-slate-500',
    bgColor: 'bg-slate-100',
  },
  starter: {
    name: 'Starter',
    icon: Zap,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
  },
  growth: {
    name: 'Growth',
    icon: Rocket,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-100',
  },
  enterprise: {
    name: 'Enterprise',
    icon: Building2,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100',
  },
}

export function BillingSection({ currentPlan, usage, hasStripeCustomer }: BillingSectionProps) {
  const [loading, setLoading] = useState(false)
  const plan = PLAN_DETAILS[currentPlan as keyof typeof PLAN_DETAILS] || PLAN_DETAILS.free
  const Icon = plan.icon

  const handleManageBilling = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Portal error:', error)
      toast.error('Failed to open billing portal')
    } finally {
      setLoading(false)
    }
  }

  const getUsagePercentage = (current: number, limit: number) => {
    if (limit === -1) return 0 // Unlimited
    return Math.min(Math.round((current / limit) * 100), 100)
  }

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit.toString()
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing & Usage
            </CardTitle>
            <CardDescription>Manage your subscription and track usage</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${plan.bgColor}`}>
              <Icon className={`h-5 w-5 ${plan.color}`} />
            </div>
            <Badge variant="outline" className="text-sm">
              {plan.name} Plan
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Usage Meters */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-500">Current Usage</h4>
          
          {/* Prompts */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Prompts Tracked</span>
              <span className="text-slate-500">
                {usage.prompts.current} / {formatLimit(usage.prompts.limit)}
              </span>
            </div>
            {usage.prompts.limit !== -1 && (
              <Progress 
                value={getUsagePercentage(usage.prompts.current, usage.prompts.limit)} 
                className="h-2"
              />
            )}
          </div>

          {/* Memos */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Memos This Month</span>
              <span className="text-slate-500">
                {usage.memos.current} / {formatLimit(usage.memos.limit)}
              </span>
            </div>
            {usage.memos.limit !== -1 && (
              <Progress 
                value={getUsagePercentage(usage.memos.current, usage.memos.limit)} 
                className="h-2"
              />
            )}
          </div>

          {/* Brands */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Brands</span>
              <span className="text-slate-500">
                {usage.brands.current} / {formatLimit(usage.brands.limit)}
              </span>
            </div>
            {usage.brands.limit !== -1 && (
              <Progress 
                value={getUsagePercentage(usage.brands.current, usage.brands.limit)} 
                className="h-2"
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          {hasStripeCustomer ? (
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Manage Billing
            </Button>
          ) : null}
          
          {currentPlan !== 'enterprise' && (
            <Button asChild>
              <Link href="/pricing">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
