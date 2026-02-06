import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TopicCategory, CoverageScore } from '@/lib/supabase/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params
  const supabase = await createClient()

  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify brand ownership
  const { data: brand, error: brandError } = await supabase
    .from('brands')
    .select('id, name, tenant_id')
    .eq('id', brandId)
    .single()

  if (brandError || !brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
  }

  if (brand.tenant_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Get all topics for this brand
  const { data: topics, error: topicsError } = await supabase
    .from('topic_universe')
    .select('*')
    .eq('brand_id', brandId)
    .order('priority_score', { ascending: false })

  if (topicsError) {
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 })
  }

  if (!topics || topics.length === 0) {
    return NextResponse.json({
      has_topics: false,
      coverage_score: null,
      topics: [],
    })
  }

  // Calculate coverage score
  const categories: TopicCategory[] = ['comparisons', 'alternatives', 'how_tos', 'industry_guides', 'definitions', 'use_cases']
  
  const byCategory: CoverageScore['by_category'] = {} as CoverageScore['by_category']
  for (const cat of categories) {
    const catTopics = topics.filter(t => t.category === cat)
    byCategory[cat] = {
      total: catTopics.length,
      covered: catTopics.filter(t => t.status === 'covered').length,
      gaps: catTopics.filter(t => t.status === 'gap').length,
    }
  }

  const coverageScore: CoverageScore = {
    total_topics: topics.length,
    covered: topics.filter(t => t.status === 'covered').length,
    partial: topics.filter(t => t.status === 'partial').length,
    gaps: topics.filter(t => t.status === 'gap').length,
    coverage_percent: Math.round(
      (topics.filter(t => t.status === 'covered').length / topics.length) * 100
    ),
    by_category: byCategory,
  }

  return NextResponse.json({
    has_topics: true,
    coverage_score: coverageScore,
    topics,
  })
}
