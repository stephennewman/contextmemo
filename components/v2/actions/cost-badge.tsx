'use client'

import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CostBadgeProps {
  credits: number
  className?: string
  size?: 'sm' | 'md'
}

export function CostBadge({ credits, className, size = 'sm' }: CostBadgeProps) {
  if (credits === 0) return null
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
        'bg-white/20 text-white',
        className
      )}
    >
      <Zap className={cn(size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
      {credits}
    </span>
  )
}
