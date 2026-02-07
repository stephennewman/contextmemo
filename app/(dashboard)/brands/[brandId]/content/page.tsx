import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CoverageAudit } from '@/components/dashboard/coverage-audit'
import { AutomationStatusBar } from '@/components/dashboard/automation-status-bar'
import { TopicUniverse, CoverageScore, TopicCategory } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ brandId: string }>
}

export default async function ContentPage({ params }: Props) {
  const { brandId } = await params
  const supabase = await createClient()

  const [
    { data: brand, error },
    { data: topicUniverseData },
    { data: competitors },
    { data: brandSettings },
  ] = await Promise.all([
    supabase
      .from('brands')
      .select('name, domain')
      .eq('id', brandId)
      .single(),
    supabase
      .from('topic_universe')
      .select('*')
      .eq('brand_id', brandId)
      .order('priority_score', { ascending: false }),
    supabase
      .from('competitors')
      .select('*')
      .eq('brand_id', brandId)
      .eq('is_active', true),
    supabase
      .from('brand_settings')
      .select('competitor_content_enabled, competitor_content_schedule, auto_respond_content, content_generation_schedule')
      .eq('brand_id', brandId)
      .single(),
  ])

  if (error || !brand) notFound()

  const topicTopics = (topicUniverseData || []) as TopicUniverse[]
  const hasTopicUniverse = topicTopics.length > 0

  // Calculate coverage score
  let coverageScore: CoverageScore | null = null
  if (hasTopicUniverse) {
    const categories: TopicCategory[] = ['comparisons', 'alternatives', 'how_tos', 'industry_guides', 'definitions', 'use_cases']
    const byCategory: CoverageScore['by_category'] = {} as CoverageScore['by_category']
    for (const cat of categories) {
      const catTopics = topicTopics.filter(t => t.category === cat)
      byCategory[cat] = {
        total: catTopics.length,
        covered: catTopics.filter(t => t.status === 'covered').length,
        gaps: catTopics.filter(t => t.status === 'gap').length,
      }
    }
    coverageScore = {
      total_topics: topicTopics.length,
      covered: topicTopics.filter(t => t.status === 'covered').length,
      partial: topicTopics.filter(t => t.status === 'partial').length,
      gaps: topicTopics.filter(t => t.status === 'gap').length,
      coverage_percent: Math.round((topicTopics.filter(t => t.status === 'covered').length / topicTopics.length) * 100),
      by_category: byCategory,
    }
  }

  // Get competitor content for coverage audit
  const competitorIds = (competitors || []).map(c => c.id)
  const { data: competitorContent } = competitorIds.length > 0
    ? await supabase
        .from('competitor_content')
        .select('*, competitor:competitor_id(id, name, domain), response_memo:response_memo_id(id, title, slug, status)')
        .in('competitor_id', competitorIds)
        .order('first_seen_at', { ascending: false })
        .limit(100)
    : { data: [] as any[] }

  return (
    <div className="space-y-4">
      <AutomationStatusBar items={[
        { label: 'Competitor Intel', enabled: brandSettings?.competitor_content_enabled ?? true, schedule: brandSettings?.competitor_content_schedule ?? 'daily' },
        { label: 'Content Gen', enabled: brandSettings?.auto_respond_content ?? false, schedule: brandSettings?.content_generation_schedule ?? 'weekdays' },
      ]} />
      <CoverageAudit
        brandId={brandId}
        brandName={brand.name}
        brandDomain={brand.domain || ''}
        initialTopics={topicTopics}
        initialScore={coverageScore}
        hasTopics={hasTopicUniverse}
        competitorContent={(competitorContent || []) as Array<{
          id: string
          competitor_id: string
          url: string
          title: string
          content_summary: string | null
          topics: string[] | null
          content_type: string | null
          is_competitor_specific: boolean
          universal_topic: string | null
          status: string
          first_seen_at: string
          published_at?: string | null
          word_count?: number | null
          author?: string | null
          response_memo_id: string | null
          competitor?: { id: string; name: string; domain: string | null }
          response_memo?: { id: string; title: string; slug: string; status: string }
        }>}
        competitors={competitors || []}
      />
    </div>
  )
}
