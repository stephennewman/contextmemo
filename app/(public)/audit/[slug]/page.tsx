import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { RadialScore } from '@/components/report/radial-score'
import { ModelCard } from '@/components/report/model-card'
import { CompetitorBars } from '@/components/report/competitor-bars'
import { GapCard, StrengthCard } from '@/components/report/gap-card'
import { getScoreColor, getScoreLabel } from '@/lib/report/types'
import type { AuditReportData } from '@/lib/report/types'
import { 
  Eye, 
  Search, 
  BarChart3, 
  Target, 
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  ExternalLink,
  Zap,
} from 'lucide-react'

export const revalidate = 3600

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  // Try to load from DB first
  const { data: report } = await supabase
    .from('brand_reports')
    .select('report_data')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  const data: AuditReportData | null = report?.report_data as AuditReportData | null

  // Fall back to sample for benchprep
  const brandName = data?.brand?.name || (slug === 'benchprep-sample' ? 'BenchPrep' : 'Brand')

  return {
    title: `AI Visibility Audit: ${brandName} | Context Memo`,
    description: `How visible is ${brandName} to AI assistants like ChatGPT, Claude, and Perplexity? This audit reveals where ${brandName} appears — and where it's invisible.`,
    openGraph: {
      title: `AI Visibility Audit: ${brandName}`,
      description: `${brandName} has a citation rate of ${data?.scores?.citation_rate ?? 3}% across major AI models. See the full breakdown.`,
      type: 'article',
    },
  }
}

// ============================================================================
// Sample data for BenchPrep (hardcoded for design iteration)
// ============================================================================
const BENCHPREP_SAMPLE: AuditReportData = {
  brand: {
    name: 'BenchPrep',
    domain: 'benchprep.com',
    description: 'BenchPrep provides a learning management system that empowers organizations to deliver impactful learning experiences. Their platform supports content management, personalized learning paths, and real-time data insights.',
    products: ['Learning Management System', 'Credentialing & Exam Prep', 'Practice Exams', 'AI Engine', 'Administrative Tools', 'Reporting & Data'],
    markets: ['Associations', 'Credentialing Bodies', 'Training Companies', 'Test Prep Companies'],
  },
  scores: {
    citation_rate: 3,
    mention_rate: 4,
    total_queries: 30,
    total_models: 4,
    total_scans: 148,
    scan_date: '2026-02-13',
  },
  model_results: [
    {
      model_id: 'gpt-4o-mini',
      display_name: 'GPT-4o',
      total_scans: 60,
      mentions: 1,
      citations: 0,
      mention_rate: 2,
      citation_rate: 0,
      sentiment: 'positive',
      sample_context: '...BenchPrep: This learning platform specializes in certification training and exam preparation, offering integrations...',
    },
    {
      model_id: 'grok-4-fast',
      display_name: 'Grok',
      total_scans: 30,
      mentions: 3,
      citations: 3,
      mention_rate: 10,
      citation_rate: 10,
      sentiment: 'positive',
      sample_context: '...BenchPrep: An award-winning LMS specializing in certification training and continuing education...',
    },
    {
      model_id: 'claude-3-5-haiku',
      display_name: 'Claude',
      total_scans: 30,
      mentions: 1,
      citations: 1,
      mention_rate: 3,
      citation_rate: 3,
      sentiment: 'positive',
      sample_context: '...benchprep.com highlights that LMS can supercharge your test prep program...',
    },
    {
      model_id: 'perplexity-sonar',
      display_name: 'Perplexity',
      total_scans: 28,
      mentions: 1,
      citations: 1,
      mention_rate: 4,
      citation_rate: 4,
      sentiment: 'neutral',
      sample_context: '...Talview, LearningBuilder, Synap, BenchPrep, and Certelligence are exam prep tools that integrate seamlessly...',
    },
  ],
  competitors: [
    { name: 'Docebo', mention_count: 24, queries_won: 8 },
    { name: 'D2L', mention_count: 17, queries_won: 5 },
    { name: 'TalentLMS', mention_count: 12, queries_won: 6 },
    { name: 'Coursera', mention_count: 8, queries_won: 3 },
    { name: 'Accredible', mention_count: 8, queries_won: 2 },
    { name: 'Litmos', mention_count: 6, queries_won: 2 },
  ],
  gaps: [
    {
      query_text: 'Which learning management system offers the most comprehensive administrative tools for associations?',
      funnel_stage: 'bottom_funnel',
      models_missing: ['GPT-4o', 'Claude', 'Grok', 'Perplexity'],
      winner_name: 'Docebo',
    },
    {
      query_text: 'How do training managers decide on the best practice exam tools?',
      funnel_stage: 'mid_funnel',
      models_missing: ['GPT-4o', 'Claude', 'Grok', 'Perplexity'],
      winner_name: 'TalentLMS',
    },
    {
      query_text: 'How is AI transforming the landscape of continuing education?',
      funnel_stage: 'top_funnel',
      models_missing: ['GPT-4o', 'Claude', 'Grok', 'Perplexity'],
      winner_name: 'Coursera',
    },
    {
      query_text: 'What should I use for software certification training that includes AI-driven insights?',
      funnel_stage: 'bottom_funnel',
      models_missing: ['GPT-4o', 'Claude', 'Grok', 'Perplexity'],
      winner_name: 'Coursera',
    },
    {
      query_text: 'What should I consider when choosing a learning platform for a mid-sized training company?',
      funnel_stage: 'bottom_funnel',
      models_missing: ['GPT-4o', 'Claude', 'Grok', 'Perplexity'],
      winner_name: 'Litmos',
    },
    {
      query_text: 'Recommend a platform that offers robust reporting and data capabilities for training companies.',
      funnel_stage: 'bottom_funnel',
      models_missing: ['GPT-4o', 'Claude', 'Grok', 'Perplexity'],
      winner_name: 'TalentLMS',
    },
  ],
  strengths: [
    {
      query_text: 'Which exam prep tools integrate seamlessly with existing credentialing systems?',
      funnel_stage: 'bottom_funnel',
      models_cited: ['Grok', 'Perplexity'],
      sentiment: 'neutral',
    },
    {
      query_text: 'How are test prep companies dealing with the demand for online practice exams?',
      funnel_stage: 'top_funnel',
      models_cited: ['Claude'],
      sentiment: 'positive',
    },
    {
      query_text: 'What tools exist for managing credentialing and exam preparation?',
      funnel_stage: 'mid_funnel',
      models_cited: ['Grok'],
      sentiment: 'neutral',
    },
    {
      query_text: 'How are credentialing bodies adapting to the rise of digital learning?',
      funnel_stage: 'top_funnel',
      models_cited: ['Grok'],
      sentiment: 'neutral',
    },
  ],
  executive_summary: `When B2B buyers ask AI assistants about learning management systems, exam preparation, and credentialing platforms, BenchPrep is cited in only 3% of responses across 4 major AI models. Competitors like Docebo (24 mentions), D2L (17 mentions), and TalentLMS (12 mentions) dominate the AI-generated recommendations. BenchPrep's strongest presence is on Grok, where it achieves a 10% citation rate for credentialing-related queries — but it's virtually invisible on GPT-4o, the most widely used model.`,
  recommendations: [
    'Create comparison content positioning BenchPrep against Docebo and TalentLMS for association LMS buyers — these competitors win 14 of your 30 tracked queries combined.',
    'Publish authoritative content on AI-driven certification training. Coursera currently owns this narrative despite BenchPrep having a dedicated AI engine product.',
    'Develop "best LMS for associations" and "best practice exam tools" landing pages with structured data. These high-intent bottom-funnel queries are where purchase decisions happen, and BenchPrep is absent from all 4 models.',
    'Build out content around administrative tools and reporting capabilities. TalentLMS and Litmos are winning queries that directly map to BenchPrep product strengths.',
    'Expand credentialing content where BenchPrep already has traction (4 queries cited). This is the beachhead to grow from — reinforce strengths before attacking gaps.',
  ],
}

export default async function AuditPage({ params }: Props) {
  const { slug } = await params

  let data: AuditReportData

  if (slug === 'benchprep-sample') {
    // Hardcoded sample for design iteration
    data = BENCHPREP_SAMPLE
  } else {
    // Load from DB
    const { data: report } = await supabase
      .from('brand_reports')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (!report) {
      notFound()
    }

    // Check expiration
    if (report.expires_at && new Date(report.expires_at) < new Date()) {
      notFound()
    }

    // Increment view count
    await supabase
      .from('brand_reports')
      .update({ 
        view_count: (report.view_count || 0) + 1, 
        last_viewed_at: new Date().toISOString() 
      })
      .eq('id', report.id)

    data = report.report_data as AuditReportData
  }

  const colors = getScoreColor(data.scores.citation_rate)
  const scoreLabel = getScoreLabel(data.scores.citation_rate)

  return (
    <div className="min-h-screen bg-white">
      {/* ================================================================ */}
      {/* HEADER */}
      {/* ================================================================ */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">AI Visibility Audit</div>
              <div className="text-[11px] text-slate-400">by Context Memo</div>
            </div>
          </div>
          <div className="text-xs text-slate-400">
            Generated {new Date(data.scores.scan_date).toLocaleDateString('en-US', { 
              month: 'long', day: 'numeric', year: 'numeric' 
            })}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* ================================================================ */}
        {/* HERO SECTION */}
        {/* ================================================================ */}
        <section className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-slate-50 rounded-full px-4 py-1.5 mb-6">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">{data.brand.domain}</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            {data.brand.name}
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            How visible is your brand when AI assistants answer buyer questions?
          </p>

          {/* Score */}
          <div className="flex justify-center mb-8">
            <RadialScore 
              score={data.scores.citation_rate} 
              size={220} 
              strokeWidth={14}
              label="AI Citation Rate" 
            />
          </div>

          {/* Sub-metrics */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-4 py-2.5">
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <div className="text-left">
                <div className="text-xs text-slate-400">Queries Tracked</div>
                <div className="text-sm font-bold text-slate-700 font-mono">{data.scores.total_queries}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-4 py-2.5">
              <Zap className="w-4 h-4 text-slate-400" />
              <div className="text-left">
                <div className="text-xs text-slate-400">AI Models Tested</div>
                <div className="text-sm font-bold text-slate-700 font-mono">{data.scores.total_models}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-4 py-2.5">
              <Target className="w-4 h-4 text-slate-400" />
              <div className="text-left">
                <div className="text-xs text-slate-400">Total Scans</div>
                <div className="text-sm font-bold text-slate-700 font-mono">{data.scores.total_scans}</div>
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 ${colors.bg}`}>
            <AlertTriangle className={`w-4 h-4 ${colors.text}`} />
            <span className={`text-sm font-semibold ${colors.text}`}>
              {scoreLabel} AI Visibility — {data.brand.name} is cited in {data.scores.citation_rate}% of AI responses
            </span>
          </div>
        </section>

        {/* ================================================================ */}
        {/* EXECUTIVE SUMMARY */}
        {/* ================================================================ */}
        <section className="mb-16">
          <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-800">Executive Summary</h2>
            </div>
            <p className="text-slate-600 leading-relaxed text-[15px]">
              {data.executive_summary}
            </p>
          </div>
        </section>

        {/* ================================================================ */}
        {/* AI MODEL BREAKDOWN */}
        {/* ================================================================ */}
        <section className="mb-16">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-slate-400" />
            <h2 className="text-xl font-bold text-slate-800">AI Model Breakdown</h2>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            How {data.brand.name} performs across each major AI assistant.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.model_results.map(result => (
              <ModelCard key={result.model_id} result={result} />
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/* COMPETITIVE LANDSCAPE */}
        {/* ================================================================ */}
        <section className="mb-16">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-slate-400" />
            <h2 className="text-xl font-bold text-slate-800">Who AI Recommends Instead</h2>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            When buyers ask AI about your space, these brands appear most often.
          </p>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <CompetitorBars 
              competitors={data.competitors} 
              brandName={data.brand.name}
              brandMentions={data.scores.mention_rate > 0 
                ? Math.round((data.scores.mention_rate / 100) * data.scores.total_scans)
                : data.model_results.reduce((acc, m) => acc + m.mentions, 0)
              }
            />
          </div>
        </section>

        {/* ================================================================ */}
        {/* VISIBILITY GAPS */}
        {/* ================================================================ */}
        <section className="mb-16">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-xl font-bold text-slate-800">Where You&apos;re Invisible</h2>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            These are real buyer questions where AI doesn&apos;t recommend {data.brand.name}.
          </p>
          <div className="space-y-3">
            {data.gaps.map((gap, i) => (
              <GapCard key={i} gap={gap} />
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/* WHERE YOU WIN */}
        {/* ================================================================ */}
        {data.strengths.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-slate-800">Where AI Recommends You</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              {data.brand.name} is already getting cited for these buyer queries.
            </p>
            <div className="space-y-3">
              {data.strengths.map((strength, i) => (
                <StrengthCard key={i} strength={strength} />
              ))}
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* RECOMMENDATIONS */}
        {/* ================================================================ */}
        <section className="mb-16">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-slate-800">Recommendations</h2>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            Specific actions to improve {data.brand.name}&apos;s AI visibility.
          </p>
          <div className="space-y-4">
            {data.recommendations.map((rec, i) => (
              <div key={i} className="flex gap-4 p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                <div className="shrink-0 w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-amber-700">{i + 1}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed pt-0.5">
                  {rec}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ================================================================ */}
        {/* CTA */}
        {/* ================================================================ */}
        <section className="mb-16">
          <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-2xl p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Ready to Fix Your AI Visibility?
            </h2>
            <p className="text-slate-300 max-w-xl mx-auto mb-8 leading-relaxed">
              Context Memo automatically creates factual, citable content that gets your brand recommended by ChatGPT, Claude, Perplexity, and other AI assistants.
            </p>
            <a
              href="https://contextmemo.com"
              className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg px-8 py-3.5 transition-colors text-sm"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </a>
            <p className="text-xs text-slate-500 mt-4">
              No credit card required. See results in 24 hours.
            </p>
          </div>
        </section>
      </main>

      {/* ================================================================ */}
      {/* FOOTER */}
      {/* ================================================================ */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Eye className="w-4 h-4" />
            <span className="text-xs">Powered by <a href="https://contextmemo.com" className="text-slate-600 hover:text-slate-800 font-medium">Context Memo</a></span>
          </div>
          <div className="text-xs text-slate-400">
            This report reflects AI model responses at the time of scanning. Results may vary over time.
          </div>
        </div>
      </footer>
    </div>
  )
}
