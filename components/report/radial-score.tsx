'use client'

import { getScoreColor, getScoreLabel } from '@/lib/report/types'

interface RadialScoreProps {
  score: number          // 0-100
  size?: number          // px, default 200
  strokeWidth?: number   // px, default 12
  label?: string         // e.g. "Citation Rate"
}

export function RadialScore({ score, size = 200, strokeWidth = 12, label }: RadialScoreProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const center = size / 2
  const colors = getScoreColor(score)
  const scoreLabel = getScoreLabel(score)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background ring */}
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100"
          />
          {/* Score ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`${colors.ring} transition-all duration-1000 ease-out`}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-5xl font-bold font-mono ${colors.text}`}>
            {score}
          </span>
          <span className="text-sm text-slate-400 font-medium mt-0.5">out of 100</span>
        </div>
      </div>
      {label && (
        <div className="text-center">
          <span className={`text-xs font-semibold uppercase tracking-widest ${colors.text}`}>
            {scoreLabel}
          </span>
        </div>
      )}
    </div>
  )
}
