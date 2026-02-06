'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  ExternalLink,
  Eye,
  Trash2,
  Check,
  X,
  Sparkles,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { MemoAnalyticsCard } from '@/components/dashboard/memo-analytics-card'

interface Memo {
  id: string
  brand_id: string
  title: string
  slug: string
  content_markdown: string
  meta_description: string
  status: 'draft' | 'published'
  memo_type: string
  published_at: string | null
  created_at: string
  updated_at: string
  // Provenance fields
  generation_model?: string
  generation_duration_ms?: number
  generation_tokens?: { prompt?: number; completion?: number; total?: number }
  review_status?: 'ai_generated' | 'human_reviewed' | 'human_edited' | 'human_approved'
  reviewed_by?: string
  reviewed_at?: string
  reviewer_notes?: string
  human_edits_count?: number
  provenance?: {
    generated_at?: string
    source_type?: string
    source_competitor?: string
    source_url?: string
    topic_extracted?: string
  }
}

interface Brand {
  id: string
  name: string
  subdomain: string
}

export default function MemoEditPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.brandId as string
  const memoId = params.memoId as string

  const [memo, setMemo] = useState<Memo | null>(null)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [reviewerNotes, setReviewerNotes] = useState('')
  const [reviewStatus, setReviewStatus] = useState<string>('ai_generated')

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      
      const [memoResult, brandResult] = await Promise.all([
        supabase
          .from('memos')
          .select('*')
          .eq('id', memoId)
          .single(),
        supabase
          .from('brands')
          .select('id, name, subdomain')
          .eq('id', brandId)
          .single()
      ])

      if (memoResult.error || !memoResult.data) {
        toast.error('Memo not found')
        router.push(`/brands/${brandId}`)
        return
      }

      if (brandResult.error || !brandResult.data) {
        toast.error('Brand not found')
        router.push('/dashboard')
        return
      }

      const memoData = memoResult.data as Memo
      setMemo(memoData)
      setBrand(brandResult.data)
      
      // Set form state
      setTitle(memoData.title)
      setSlug(memoData.slug)
      setContent(memoData.content_markdown)
      setMetaDescription(memoData.meta_description || '')
      setStatus(memoData.status)
      setReviewerNotes(memoData.reviewer_notes || '')
      setReviewStatus(memoData.review_status || 'ai_generated')
      
      setLoading(false)
    }

    loadData()
  }, [brandId, memoId, router])

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      
      // Determine if this is a human edit (content changed from original)
      const isHumanEdit = content !== memo?.content_markdown
      const newEditCount = isHumanEdit ? (memo?.human_edits_count || 0) + 1 : memo?.human_edits_count || 0
      
      const { error } = await supabase
        .from('memos')
        .update({
          title,
          slug,
          content_markdown: content,
          meta_description: metaDescription,
          status,
          published_at: status === 'published' ? new Date().toISOString() : memo?.published_at,
          updated_at: new Date().toISOString(),
          reviewer_notes: reviewerNotes || null,
          review_status: reviewStatus,
          reviewed_at: reviewStatus !== 'ai_generated' ? new Date().toISOString() : memo?.reviewed_at,
          human_edits_count: newEditCount,
        })
        .eq('id', memoId)

      if (error) throw error

      toast.success('Memo saved successfully')
      router.refresh()
    } catch (error) {
      toast.error('Failed to save memo')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this memo? This cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_memo',
          memoId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete memo')
      }

      toast.success('Memo deleted')
      router.push(`/v2/brands/${brandId}/memos`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete memo')
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

  const handlePublish = async () => {
    setStatus('published')
    // Auto-save with published status
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('memos')
        .update({
          title,
          slug,
          content_markdown: content,
          meta_description: metaDescription,
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          reviewer_notes: reviewerNotes || null,
          review_status: reviewStatus,
          reviewed_at: reviewStatus !== 'ai_generated' ? new Date().toISOString() : memo?.reviewed_at,
          human_edits_count: content !== memo?.content_markdown ? (memo?.human_edits_count || 0) + 1 : memo?.human_edits_count || 0,
        })
        .eq('id', memoId)
      if (error) throw error
      toast.success('Memo published')
      router.refresh()
    } catch (error) {
      toast.error('Failed to publish')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleUnpublish = async () => {
    setStatus('draft')
    // Auto-save with draft status
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('memos')
        .update({
          title,
          slug,
          content_markdown: content,
          meta_description: metaDescription,
          status: 'draft',
          updated_at: new Date().toISOString(),
          reviewer_notes: reviewerNotes || null,
          review_status: reviewStatus,
          reviewed_at: reviewStatus !== 'ai_generated' ? new Date().toISOString() : memo?.reviewed_at,
          human_edits_count: content !== memo?.content_markdown ? (memo?.human_edits_count || 0) + 1 : memo?.human_edits_count || 0,
        })
        .eq('id', memoId)
      if (error) throw error
      toast.success('Memo unpublished')
      router.refresh()
    } catch (error) {
      toast.error('Failed to unpublish')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerate = async () => {
    if (!confirm('This will regenerate the memo content using AI. Your current content will be replaced. Continue?')) {
      return
    }

    setRegenerating(true)
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate_memo',
          memoId,
          memoType: memo?.memo_type,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to regenerate memo')
      }

      toast.success('Memo regeneration started. This page will refresh when complete.')
      
      // Poll for completion
      const checkInterval = setInterval(async () => {
        const supabase = createClient()
        const { data: updatedMemo } = await supabase
          .from('memos')
          .select('content_markdown, updated_at')
          .eq('id', memoId)
          .single()
        
        if (updatedMemo && updatedMemo.updated_at !== memo?.updated_at) {
          clearInterval(checkInterval)
          window.location.reload()
        }
      }, 3000)

      // Stop polling after 2 minutes
      setTimeout(() => clearInterval(checkInterval), 120000)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate memo')
      console.error(error)
    } finally {
      setRegenerating(false)
    }
  }

  // Detect if memo content looks like an error/failed generation
  const isBrokenMemo = (content: string): boolean => {
    const errorPhrases = [
      "i'm sorry",
      "i cannot",
      "i can't",
      "i don't have",
      "without specific details",
      "without more context",
      "need more information",
      "please provide",
    ]
    const contentLower = content.toLowerCase().slice(0, 300)
    return errorPhrases.some(phrase => contentLower.includes(phrase)) || content.length < 200
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        {/* Back link and header */}
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 bg-slate-200 animate-pulse rounded" />
          <div className="flex-1">
            <div className="h-6 w-64 bg-slate-200 animate-pulse rounded" />
            <div className="h-4 w-40 bg-slate-100 animate-pulse rounded mt-1" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-slate-200 animate-pulse rounded" />
            <div className="h-9 w-20 bg-slate-200 animate-pulse rounded" />
          </div>
        </div>
        {/* Main content area */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 border rounded-lg p-6 space-y-4">
            <div className="h-6 w-32 bg-slate-200 animate-pulse rounded" />
            <div className="h-10 w-full bg-slate-200 animate-pulse rounded" />
            <div className="h-10 w-full bg-slate-200 animate-pulse rounded" />
            <div className="h-80 w-full bg-slate-200 animate-pulse rounded" />
            <div className="h-20 w-full bg-slate-200 animate-pulse rounded" />
          </div>
          <div className="space-y-4">
            <div className="border rounded-lg p-4 space-y-3">
              <div className="h-5 w-24 bg-slate-200 animate-pulse rounded" />
              <div className="h-10 w-full bg-slate-200 animate-pulse rounded" />
              <div className="h-9 w-full bg-slate-200 animate-pulse rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!memo || !brand) {
    return null
  }

  // Use localhost in development, production URL otherwise
  const isDev = process.env.NODE_ENV === 'development' || typeof window !== 'undefined' && window.location.hostname === 'localhost'
  
  // Context Memo's own memos use /memos routes on main domain
  const CONTEXT_MEMO_BRAND_ID = '9fa32d64-e1c6-4be3-b12c-1be824a6c63f'
  const isContextMemoBrand = brandId === CONTEXT_MEMO_BRAND_ID
  
  let publicUrl: string
  if (isDev) {
    publicUrl = `http://localhost:3000/memo/${brand.subdomain}/${slug}`
  } else if (isContextMemoBrand && memo) {
    const typeToRoute: Record<string, string> = {
      guide: '/memos/guides',
      industry: '/memos/guides',
      comparison: '/memos/compare',
      alternative: '/memos/compare',
      how_to: '/memos/how-to',
      response: '/memos/how-to',
    }
    const route = typeToRoute[memo.memo_type] || '/memos/how-to'
    const cleanSlug = slug.replace(/^(guides|compare|how-to|resources)\//, '')
    publicUrl = `https://contextmemo.com${route}/${cleanSlug}`
  } else {
    publicUrl = `https://${brand.subdomain}.contextmemo.com/${slug}`
  }

  // Analyze AI optimization elements with counts
  const headingCount = (content.match(/^##\s/gm) || []).length + (content.match(/^#\s/gm) || []).length
  const subheadingCount = (content.match(/^###\s/gm) || []).length
  const bulletCount = (content.match(/^[\-\*]\s/gm) || []).length
  const exclamationCount = (content.match(/!/g) || []).length
  const brandMentions = (content.toLowerCase().match(new RegExp(brand.name.toLowerCase(), 'g')) || []).length
  
  const aiOptimization = {
    hasStructuredHeadings: headingCount > 0,
    hasSubheadings: subheadingCount > 0,
    hasBulletPoints: bulletCount > 0,
    hasVerifiedDate: content.toLowerCase().includes('verified') || content.toLowerCase().includes('last updated'),
    hasSources: content.toLowerCase().includes('source') || content.toLowerCase().includes('reference'),
    hasFactualTone: exclamationCount < 3,
    hasProperLength: content.length >= 500 && content.length <= 3000,
    hasMetaDescription: metaDescription.length >= 50,
    hasKeywords: brandMentions > 0,
  }
  
  const aiCounts = {
    headings: headingCount,
    subheadings: subheadingCount,
    bullets: bulletCount,
    exclamations: exclamationCount,
    brandMentions: brandMentions,
    contentLength: content.length,
    metaLength: metaDescription.length,
  }
  
  const aiScore = Object.values(aiOptimization).filter(Boolean).length
  const aiScorePercent = Math.round((aiScore / Object.keys(aiOptimization).length) * 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/brands/${brandId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Edit Memo</h1>
            <p className="text-sm text-muted-foreground">{brand.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status === 'published' ? 'default' : 'secondary'}>{status}</Badge>
          {status === 'draft' ? (
            <Button variant="outline" size="sm" onClick={handlePublish}>Publish</Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleUnpublish}>Unpublish</Button>
              <Button variant="outline" size="sm" asChild>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-4 w-4 mr-1" />
                  View Live
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </>
          )}
          <div className="w-px h-6 bg-border" />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRegenerate} 
            disabled={regenerating}
            title="Regenerate memo content using AI"
          >
            {regenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Regenerate
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:text-destructive">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      {/* Warning for broken memos */}
      {isBrokenMemo(content) && (
        <div className="bg-amber-50 border-2 border-amber-400 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-800">This memo may have failed to generate</h3>
            <p className="text-sm text-amber-700 mt-1">
              The content looks like an AI error response rather than actual memo content. 
              This usually happens when the brand context doesn&apos;t have enough information.
            </p>
            <div className="flex gap-3 mt-3">
              <Button 
                size="sm" 
                onClick={handleRegenerate}
                disabled={regenerating}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {regenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Regenerate Memo
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                asChild
                className="border-amber-400 text-amber-800 hover:bg-amber-100"
              >
                <Link href={`/brands/${brandId}/settings`}>
                  Review Brand Context
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Memo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Memo title"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Content (Markdown)</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your memo content in Markdown..."
                  className="min-h-[400px] font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* AI Optimization Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  AI Optimization
                </CardTitle>
                <Badge 
                  variant={aiScorePercent >= 70 ? 'default' : aiScorePercent >= 40 ? 'secondary' : 'destructive'}
                  className="text-xs"
                >
                  {aiScorePercent}%
                </Badge>
              </div>
              <CardDescription>
                Elements that help AI understand and cite your memo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    {aiOptimization.hasStructuredHeadings ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-red-400" />}
                    <span className={aiOptimization.hasStructuredHeadings ? 'text-slate-700' : 'text-slate-400'}>
                      Headings <code className="text-[10px] bg-slate-100 px-1 rounded">## </code>
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{aiCounts.headings}</span>
                </div>
                <p className="text-[11px] text-slate-400 -mt-1 ml-5">Use ## for main sections. AI uses these to navigate your memo.</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {aiOptimization.hasSubheadings ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-red-400" />}
                    <span className={aiOptimization.hasSubheadings ? 'text-slate-700' : 'text-slate-400'}>
                      Subheadings <code className="text-[10px] bg-slate-100 px-1 rounded">### </code>
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{aiCounts.subheadings}</span>
                </div>
                <p className="text-[11px] text-slate-400 -mt-1 ml-5">Break down sections. Helps AI find specific details.</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {aiOptimization.hasBulletPoints ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-red-400" />}
                    <span className={aiOptimization.hasBulletPoints ? 'text-slate-700' : 'text-slate-400'}>
                      Bullet points <code className="text-[10px] bg-slate-100 px-1 rounded">- </code>
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{aiCounts.bullets}</span>
                </div>
                <p className="text-[11px] text-slate-400 -mt-1 ml-5">Lists are easy for AI to parse and cite individually.</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {aiOptimization.hasVerifiedDate ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-red-400" />}
                    <span className={aiOptimization.hasVerifiedDate ? 'text-slate-700' : 'text-slate-400'}>Verified date</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{aiOptimization.hasVerifiedDate ? '✓' : '—'}</span>
                </div>
                <p className="text-[11px] text-slate-400 -mt-1 ml-5">Include &quot;Last verified: [date]&quot; so AI knows it&apos;s current.</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {aiOptimization.hasSources ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-red-400" />}
                    <span className={aiOptimization.hasSources ? 'text-slate-700' : 'text-slate-400'}>Sources cited</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{aiOptimization.hasSources ? '✓' : '—'}</span>
                </div>
                <p className="text-[11px] text-slate-400 -mt-1 ml-5">Add a ## Sources section. AI trusts sourced memos more.</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {aiOptimization.hasFactualTone ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-red-400" />}
                    <span className={aiOptimization.hasFactualTone ? 'text-slate-700' : 'text-slate-400'}>Factual tone</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{aiCounts.exclamations}!</span>
                </div>
                <p className="text-[11px] text-slate-400 -mt-1 ml-5">Avoid hype (!!!). AI prefers neutral, factual statements.</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {aiOptimization.hasProperLength ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-red-400" />}
                    <span className={aiOptimization.hasProperLength ? 'text-slate-700' : 'text-slate-400'}>Content length</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{aiCounts.contentLength.toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-slate-400 -mt-1 ml-5">500-3000 chars ideal. Too short lacks detail, too long gets truncated.</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {aiOptimization.hasMetaDescription ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-red-400" />}
                    <span className={aiOptimization.hasMetaDescription ? 'text-slate-700' : 'text-slate-400'}>Meta description</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{aiCounts.metaLength}/160</span>
                </div>
                <p className="text-[11px] text-slate-400 -mt-1 ml-5">50+ chars. AI reads this as a summary of the page.</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {aiOptimization.hasKeywords ? <Check className="h-3.5 w-3.5 text-green-500" /> : <X className="h-3.5 w-3.5 text-red-400" />}
                    <span className={aiOptimization.hasKeywords ? 'text-slate-700' : 'text-slate-400'}>Brand mentions</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{aiCounts.brandMentions}</span>
                </div>
                <p className="text-[11px] text-slate-400 -mt-1 ml-5">Mention &quot;{brand.name}&quot; naturally so AI associates this memo with your brand.</p>
              </div>
            </CardContent>
          </Card>

          {/* SEO Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">SEO</CardTitle>
              <CardDescription>
                Optimize for traditional search
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="url-slug"
                />
                <p className="text-xs text-muted-foreground">
                  {brand.subdomain}.contextmemo.com/{slug}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="meta">Meta Description</Label>
                <Textarea
                  id="meta"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Brief description for search engines..."
                  className="min-h-[80px]"
                />
                <p className="text-xs text-muted-foreground">
                  {metaDescription.length}/160 characters
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Generation Provenance */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Provenance
                </CardTitle>
                <Badge variant={
                  reviewStatus === 'human_approved' ? 'default' : 
                  reviewStatus === 'human_edited' ? 'secondary' :
                  reviewStatus === 'human_reviewed' ? 'outline' : 'destructive'
                } className="text-xs">
                  {reviewStatus === 'human_approved' ? '✓ Approved' :
                   reviewStatus === 'human_edited' ? 'Edited' :
                   reviewStatus === 'human_reviewed' ? 'Reviewed' : 'AI Generated'}
                </Badge>
              </div>
              <CardDescription>How this memo was created</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {memo.generation_model && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-mono text-xs">{memo.generation_model}</span>
                </div>
              )}
              {memo.generation_duration_ms && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Generation time</span>
                  <span>{(memo.generation_duration_ms / 1000).toFixed(1)}s</span>
                </div>
              )}
              {memo.generation_tokens?.total && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tokens used</span>
                  <span>{memo.generation_tokens.total.toLocaleString()}</span>
                </div>
              )}
              {memo.provenance?.source_competitor && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inspired by</span>
                  <span>{memo.provenance.source_competitor}</span>
                </div>
              )}
              {memo.provenance?.generated_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Generated</span>
                  <span>{new Date(memo.provenance.generated_at).toLocaleDateString()}</span>
                </div>
              )}
              {(memo.human_edits_count || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Human edits</span>
                  <span>{memo.human_edits_count}</span>
                </div>
              )}
              {memo.reviewed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last review</span>
                  <span>{new Date(memo.reviewed_at).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Human Review */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Human Review
              </CardTitle>
              <CardDescription>
                Verify and add context to build trust
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Review Status</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'ai_generated', label: 'AI Only', color: 'bg-slate-100' },
                    { value: 'human_reviewed', label: 'Reviewed', color: 'bg-blue-100' },
                    { value: 'human_edited', label: 'Edited', color: 'bg-amber-100' },
                    { value: 'human_approved', label: 'Approved', color: 'bg-green-100' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setReviewStatus(option.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        reviewStatus === option.value 
                          ? `${option.color} ring-2 ring-offset-1 ring-slate-400` 
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reviewer-notes">Reviewer Notes</Label>
                <Textarea
                  id="reviewer-notes"
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Add context, corrections, or verification notes..."
                  className="min-h-[80px] text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Visible in public memo to show human oversight
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span>{memo.memo_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(memo.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{new Date(memo.updated_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* Analytics Card */}
          <MemoAnalyticsCard brandId={brandId} memoId={memoId} />
        </div>
      </div>
    </div>
  )
}
