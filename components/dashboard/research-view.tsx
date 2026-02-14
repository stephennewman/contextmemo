'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ResearchSummary } from './research-summary'
import { MarketMatrix } from './market-matrix'

interface ResearchViewProps {
  brandId: string
  brandName: string
}

interface ResearchData {
  markets: Array<{
    vertical: string
    queryCount: number
    scanCount: number
    awareness: 'unaware' | 'problem_aware' | 'solution_aware' | 'product_aware'
    awarenessScore: number
    brandSov: number
    brandMentionCount: number
    competitors: Array<{
      name: string
      domain: string | null
      entityType: string
      mentionCount: number
      sov: number
      strength: 'strong' | 'moderate' | 'weak'
      problemMentions: number
      solutionMentions: number
    }>
  }>
  competitors: Array<{
    name: string
    domain: string | null
    entityType: string
    totalMentionCount: number
    totalSov: number
    marketReach: number
    totalMarkets: number
    markets: string[]
  }>
  summary: {
    totalMarkets: number
    totalEntities: number
    totalQueries: number
    totalScans: number
    strongestMarket: { vertical: string; brandSov: number } | null
    weakestMarket: { vertical: string; brandSov: number } | null
    biggestOpportunity: { vertical: string; reason: string } | null
  }
}

export function ResearchView({ brandId, brandName }: ResearchViewProps) {
  const [data, setData] = useState<ResearchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/brands/${brandId}/research`)
        if (!response.ok) {
          throw new Error('Failed to load research data')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [brandId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <ResearchSummary summary={data.summary} />
      <MarketMatrix
        markets={data.markets}
        competitors={data.competitors}
        brandName={brandName}
      />
    </div>
  )
}
