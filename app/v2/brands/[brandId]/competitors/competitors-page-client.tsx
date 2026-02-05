'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  ArrowLeft,
  Plus,
  Users,
  Scale,
  Swords,
} from 'lucide-react'
import { CompetitorsListClient } from './competitors-list-client'
import { ComparisonMatrix } from '@/components/dashboard/comparison-matrix'
import { EntityType } from '@/lib/supabase/types'

type TabType = 'entities' | 'compare'

interface Competitor {
  id: string
  name: string
  domain: string | null
  description: string | null
  is_active: boolean
  auto_discovered: boolean
  feed_url?: string | null
  competition_type?: string | null
  entity_type?: EntityType | null
  is_partner_candidate?: boolean
  context?: {
    citation_count?: number
    discovered_from?: string
    partnership_opportunity?: string
  } | null
}

interface CompetitorsPageClientProps {
  brandId: string
  brandName: string
  trackedCompetitors: Competitor[]
  discoveredCompetitors: Competitor[]
  citationCounts: Record<string, number>
  citationUrls: Record<string, string[]>
}

export function CompetitorsPageClient({
  brandId,
  brandName,
  trackedCompetitors,
  discoveredCompetitors,
  citationCounts,
  citationUrls,
}: CompetitorsPageClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('entities')

  // Count actual competitors (not partners)
  const competitorCount = trackedCompetitors.filter(
    c => (c.entity_type || 'product_competitor') === 'product_competitor'
  ).length

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link 
                href={`/v2/brands/${brandId}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-2xl font-bold text-[#0F172A]">Entities & Competitors</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              {trackedCompetitors.length} tracked • {discoveredCompetitors.length} discovered
            </p>
          </div>
          
          <Button className="bg-[#0EA5E9] hover:bg-[#0284C7]">
            <Plus className="h-4 w-4 mr-2" />
            Add Entity
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4 border-b -mb-px">
          <button
            onClick={() => setActiveTab('entities')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'entities'
                ? 'text-[#0EA5E9] border-[#0EA5E9]'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:border-slate-300'
            }`}
          >
            <Users className="h-4 w-4" />
            All Entities
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'compare'
                ? 'text-[#0EA5E9] border-[#0EA5E9]'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:border-slate-300'
            }`}
          >
            <Scale className="h-4 w-4" />
            Comparison Matrix
            {competitorCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                {competitorCount}
              </span>
            )}
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'entities' ? (
        <CompetitorsListClient
          brandId={brandId}
          trackedCompetitors={trackedCompetitors}
          discoveredCompetitors={discoveredCompetitors}
          citationCounts={citationCounts}
          citationUrls={citationUrls}
        />
      ) : (
        <div className="flex-1 overflow-auto p-6">
          <ComparisonMatrix
            brandId={brandId}
            brandName={brandName}
            competitors={trackedCompetitors.map(c => ({
              id: c.id,
              name: c.name,
              domain: c.domain,
              entity_type: c.entity_type,
            }))}
          />
        </div>
      )}
    </div>
  )
}
