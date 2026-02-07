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
        // Try multiple selector strategies to find the Radix tab trigger
        const trigger = 
          document.querySelector(`[data-slot="tabs-trigger"][value="${tabValue}"]`) as HTMLElement ||
          document.querySelector(`[role="tab"][value="${tabValue}"]`) as HTMLElement ||
          document.querySelector(`button[value="${tabValue}"][data-state]`) as HTMLElement
        
        if (trigger) {
          trigger.click()
          // Scroll the tab list into view so user sees the tab content
          const tabsList = trigger.closest('[role="tablist"]') || trigger.parentElement
          if (tabsList) {
            tabsList.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }
      }}
      className={`text-left w-full cursor-pointer hover:ring-2 hover:ring-[#0EA5E9] transition-all ${className || ''}`}
      style={style}
    >
      {children}
    </button>
  )
}
