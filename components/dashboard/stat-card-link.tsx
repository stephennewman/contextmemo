'use client'

import { ReactNode } from 'react'

export function StatCardLink({ tabValue, children, className, style }: { 
  tabValue: string
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <button
      onClick={() => {
        const trigger = document.querySelector(`[data-slot="tabs-trigger"][value="${tabValue}"]`) as HTMLElement
        if (trigger) {
          trigger.click()
          trigger.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }}
      className={`text-left w-full cursor-pointer hover:ring-2 hover:ring-[#0EA5E9] transition-all ${className || ''}`}
      style={style}
    >
      {children}
    </button>
  )
}
