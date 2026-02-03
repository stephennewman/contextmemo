import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Search } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get brands with basic counts only - fast query
  const { data: brands } = await supabase
    .from('brands')
    .select(`
      id,
      name,
      subdomain,
      domain,
      verified,
      created_at,
      memos:memos(count),
      queries:queries(count)
    `)
    .order('created_at', { ascending: false })

  // If no brands, redirect to create one
  if (!brands || brands.length === 0) {
    redirect('/brands/new')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-[#0F172A]">DASHBOARD</h1>
          <p className="text-zinc-500 font-medium">
            Monitor your AI search citations across all brands
          </p>
        </div>
        <Button asChild className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold rounded-none px-6">
          <Link href="/brands/new">
            <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} />
            ADD BRAND
          </Link>
        </Button>
      </div>

      {/* Brand Cards - Simplified for fast loading */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => (
          <Link key={brand.id} href={`/brands/${brand.id}`}>
            <div className="border-[3px] border-[#0F172A] bg-white hover:shadow-lg transition-shadow cursor-pointer">
              {/* Header */}
              <div className="p-5 border-b-[3px] border-[#0F172A]">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xl font-bold text-[#0F172A]">{brand.name.toUpperCase()}</h3>
                  {brand.verified ? (
                    <span className="px-2 py-1 text-xs font-bold bg-[#10B981] text-white">VERIFIED</span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-bold border-2 border-[#0F172A] text-[#0F172A]">PENDING</span>
                  )}
                </div>
                <p className="text-sm text-zinc-500">{brand.subdomain}.contextmemo.com</p>
              </div>
              
              {/* Stats Grid - 2 columns */}
              <div className="grid grid-cols-2 divide-x-[3px] divide-[#0F172A]">
                {/* Memos */}
                <div className="p-4" style={{ borderLeft: '8px solid #8B5CF6' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-[#8B5CF6]" strokeWidth={2.5} />
                    <span className="text-xs font-bold text-zinc-500">MEMOS</span>
                  </div>
                  <p className="text-3xl font-bold text-[#0F172A]">{brand.memos?.[0]?.count || 0}</p>
                </div>
                
                {/* Queries */}
                <div className="p-4" style={{ borderLeft: '8px solid #10B981' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Search className="h-4 w-4 text-[#10B981]" strokeWidth={2.5} />
                    <span className="text-xs font-bold text-zinc-500">PROMPTS</span>
                  </div>
                  <p className="text-3xl font-bold text-[#0F172A]">{brand.queries?.[0]?.count || 0}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
