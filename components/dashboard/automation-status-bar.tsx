import Link from 'next/link'
import { Settings2 } from 'lucide-react'

interface AutomationItem {
  label: string
  enabled: boolean
  schedule?: string | null
}

interface AutomationStatusBarProps {
  items: AutomationItem[]
}

const SCHEDULE_LABELS: Record<string, string> = {
  daily: 'Daily',
  every_other_day: 'Every 2d',
  twice_weekly: '2x/wk',
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
  weekdays: 'Weekdays',
  off: 'Off',
}

export function AutomationStatusBar({ items }: AutomationStatusBarProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-50 border border-zinc-200 text-[11px] font-medium text-zinc-500 flex-wrap">
      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0">Automations</span>
      <span className="text-zinc-300">|</span>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5 shrink-0">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${item.enabled ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
          <span className={item.enabled ? 'text-zinc-700' : 'text-zinc-400'}>
            {item.label}
          </span>
          {item.enabled && item.schedule && SCHEDULE_LABELS[item.schedule] && (
            <span className="text-zinc-400">
              · {SCHEDULE_LABELS[item.schedule]}
            </span>
          )}
        </span>
      ))}
      <span className="text-zinc-300">|</span>
      <Link
        href="/automations"
        className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-[#0EA5E9] uppercase tracking-wider transition-colors shrink-0"
      >
        <Settings2 className="h-3 w-3" />
        Manage
      </Link>
    </div>
  )
}
