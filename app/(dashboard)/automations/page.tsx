import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AutomationsGrid } from '@/components/dashboard/automations-grid'

export default async function AutomationsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control what runs per brand and how often. Every toggle here affects your OpenRouter spend.
          </p>
        </div>
      </div>
      
      <AutomationsGrid />
    </div>
  )
}
