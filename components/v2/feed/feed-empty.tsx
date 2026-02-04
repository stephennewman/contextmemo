'use client'

import { Inbox } from 'lucide-react'

export function FeedEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <Inbox className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 mb-1">
        No events yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Events will appear here as your workflows run. Start by running a scan or generating content.
      </p>
    </div>
  )
}
