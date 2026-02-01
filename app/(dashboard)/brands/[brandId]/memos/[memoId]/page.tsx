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
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

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

  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [content, setContent] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')

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
      
      setLoading(false)
    }

    loadData()
  }, [brandId, memoId, router])

  const handleSave = async () => {
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
          status,
          published_at: status === 'published' ? new Date().toISOString() : memo?.published_at,
          updated_at: new Date().toISOString(),
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
      const supabase = createClient()
      
      const { error } = await supabase
        .from('memos')
        .delete()
        .eq('id', memoId)

      if (error) throw error

      toast.success('Memo deleted')
      router.push(`/brands/${brandId}`)
    } catch (error) {
      toast.error('Failed to delete memo')
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

  const handlePublish = async () => {
    setStatus('published')
    // Will be saved when user clicks Save
    toast.info('Status changed to published. Click Save to apply.')
  }

  const handleUnpublish = async () => {
    setStatus('draft')
    toast.info('Status changed to draft. Click Save to apply.')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!memo || !brand) {
    return null
  }

  // Use localhost in development, production URL otherwise
  const isDev = process.env.NODE_ENV === 'development' || typeof window !== 'undefined' && window.location.hostname === 'localhost'
  const publicUrl = isDev 
    ? `http://localhost:3000/memo/${brand.subdomain}/${slug}`
    : `https://${brand.subdomain}.contextmemo.com/${slug}`

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
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} className="text-destructive hover:text-destructive">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Content</CardTitle>
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
                Elements that help AI understand and cite your content
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
                <p className="text-[11px] text-slate-400 -mt-1 ml-5">Use ## for main sections. AI uses these to navigate content.</p>
                
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
                <p className="text-[11px] text-slate-400 -mt-1 ml-5">Add a ## Sources section. AI trusts sourced content more.</p>
                
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
                <p className="text-[11px] text-slate-400 -mt-1 ml-5">Mention &quot;{brand.name}&quot; naturally so AI associates content with brand.</p>
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
        </div>
      </div>
    </div>
  )
}
