'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  ExternalLink,
  Pencil,
  Check,
  X,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Send,
  FileText,
  Settings2,
  ArrowUpFromLine,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow, format } from 'date-fns'

interface Memo {
  id: string
  brand_id: string
  title: string
  slug: string
  content_markdown: string
  content_html: string | null
  meta_description: string | null
  status: 'draft' | 'published'
  memo_type: string
  published_at: string | null
  created_at: string
  updated_at: string
  sources: unknown[] | null
  verified_accurate: boolean
  version: number
  schema_json: Record<string, unknown> | null
  featured_image_url?: string
}

interface MemoFeedProps {
  brandId: string
  brandName: string
  brandSubdomain: string
  initialMemos: Memo[]
  hubspotEnabled: boolean
  hubspotAutoPublish: boolean
}

type ExpandedSection = 'content' | 'seo' | 'feedback' | null

interface MemoCardState {
  expanded: Set<string> // memo IDs that have a section expanded
  expandedSection: Record<string, ExpandedSection>
  saving: Record<string, boolean>
  deleting: Record<string, boolean>
  syncing: Record<string, boolean>
  regenerating: Record<string, boolean>
  feedbackText: Record<string, string>
  feedbackSending: Record<string, boolean>
  // Edit fields — initialized when a section expands
  editTitle: Record<string, string>
  editContent: Record<string, string>
  editMeta: Record<string, string>
  editSlug: Record<string, string>
}

export function MemoFeed({ 
  brandId, 
  brandName, 
  brandSubdomain,
  initialMemos,
  hubspotEnabled,
  hubspotAutoPublish,
}: MemoFeedProps) {
  const [memos, setMemos] = useState<Memo[]>(initialMemos)
  const [state, setState] = useState<MemoCardState>({
    expanded: new Set(),
    expandedSection: {},
    saving: {},
    deleting: {},
    syncing: {},
    regenerating: {},
    feedbackText: {},
    feedbackSending: {},
    editTitle: {},
    editContent: {},
    editMeta: {},
    editSlug: {},
  })

  // Filter state
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all')
  const filteredMemos = memos.filter(m => {
    if (filter === 'published') return m.status === 'published'
    if (filter === 'draft') return m.status === 'draft'
    return true
  })

  const publishedCount = memos.filter(m => m.status === 'published').length
  const draftCount = memos.filter(m => m.status === 'draft').length

  // Context Memo brand ID for URL routing
  const CONTEXT_MEMO_BRAND_ID = '9fa32d64-e1c6-4be3-b12c-1be824a6c63f'
  const isContextMemoBrand = brandId === CONTEXT_MEMO_BRAND_ID

  const getMemoUrl = (memo: Memo) => {
    if (isContextMemoBrand) {
      const typeToRoute: Record<string, string> = {
        guide: '/memos/guides',
        industry: '/memos/guides',
        comparison: '/memos/compare',
        alternative: '/memos/compare',
        how_to: '/memos/how-to',
        response: '/memos/how-to',
      }
      const route = typeToRoute[memo.memo_type] || '/memos/how-to'
      const cleanSlug = memo.slug.replace(/^(guides|compare|how-to|resources)\//, '')
      return `https://contextmemo.com${route}/${cleanSlug}`
    }
    return `https://${brandSubdomain}.contextmemo.com/${memo.slug}`
  }

  const toggleSection = (memoId: string, section: ExpandedSection) => {
    const memo = memos.find(m => m.id === memoId)
    setState(prev => {
      const currentSection = prev.expandedSection[memoId]
      const newExpanded = new Set(prev.expanded)
      if (currentSection === section) {
        // Collapse
        newExpanded.delete(memoId)
        return {
          ...prev,
          expanded: newExpanded,
          expandedSection: { ...prev.expandedSection, [memoId]: null },
        }
      }
      // Expand this section — if content or seo, populate edit fields
      newExpanded.add(memoId)
      if ((section === 'content' || section === 'seo') && memo) {
        return {
          ...prev,
          expanded: newExpanded,
          expandedSection: { ...prev.expandedSection, [memoId]: section },
          editTitle: { ...prev.editTitle, [memoId]: prev.editTitle[memoId] ?? memo.title },
          editContent: { ...prev.editContent, [memoId]: prev.editContent[memoId] ?? memo.content_markdown },
          editMeta: { ...prev.editMeta, [memoId]: prev.editMeta[memoId] ?? (memo.meta_description || '') },
          editSlug: { ...prev.editSlug, [memoId]: prev.editSlug[memoId] ?? memo.slug },
        }
      }
      return {
        ...prev,
        expanded: newExpanded,
        expandedSection: { ...prev.expandedSection, [memoId]: section },
      }
    })
  }

  const cancelContentEditing = (memoId: string) => {
    const memo = memos.find(m => m.id === memoId)
    if (!memo) return
    // Reset edit fields back to saved values and collapse
    setState(prev => {
      const newExpanded = new Set(prev.expanded)
      newExpanded.delete(memoId)
      return {
        ...prev,
        expanded: newExpanded,
        expandedSection: { ...prev.expandedSection, [memoId]: null },
        editTitle: { ...prev.editTitle, [memoId]: memo.title },
        editContent: { ...prev.editContent, [memoId]: memo.content_markdown },
        editMeta: { ...prev.editMeta, [memoId]: memo.meta_description || '' },
        editSlug: { ...prev.editSlug, [memoId]: memo.slug },
      }
    })
  }

  // Check if a memo has unsaved changes
  const isDirty = (memoId: string) => {
    const memo = memos.find(m => m.id === memoId)
    if (!memo) return false
    return (
      (state.editTitle[memoId] !== undefined && state.editTitle[memoId] !== memo.title) ||
      (state.editContent[memoId] !== undefined && state.editContent[memoId] !== memo.content_markdown) ||
      (state.editMeta[memoId] !== undefined && state.editMeta[memoId] !== (memo.meta_description || '')) ||
      (state.editSlug[memoId] !== undefined && state.editSlug[memoId] !== memo.slug)
    )
  }

  const handleSave = async (memoId: string) => {
    setState(prev => ({ ...prev, saving: { ...prev.saving, [memoId]: true } }))
    try {
      const supabase = createClient()
      const memo = memos.find(m => m.id === memoId)
      const isHumanEdit = state.editContent[memoId] !== memo?.content_markdown
      
      const { error } = await supabase
        .from('memos')
        .update({
          title: state.editTitle[memoId],
          slug: state.editSlug[memoId],
          content_markdown: state.editContent[memoId],
          meta_description: state.editMeta[memoId] || null,
          updated_at: new Date().toISOString(),
          review_status: isHumanEdit ? 'human_edited' : undefined,
          reviewed_at: isHumanEdit ? new Date().toISOString() : undefined,
        })
        .eq('id', memoId)

      if (error) throw error

      // Update local state — memo now matches edit fields, so dirty resets
      setMemos(prev => prev.map(m => m.id === memoId ? {
        ...m,
        title: state.editTitle[memoId],
        slug: state.editSlug[memoId],
        content_markdown: state.editContent[memoId],
        meta_description: state.editMeta[memoId] || null,
        updated_at: new Date().toISOString(),
      } : m))
      toast.success('Saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setState(prev => ({ ...prev, saving: { ...prev.saving, [memoId]: false } }))
    }
  }

  const handlePublish = async (memoId: string) => {
    setState(prev => ({ ...prev, saving: { ...prev.saving, [memoId]: true } }))
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('memos')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', memoId)

      if (error) throw error
      setMemos(prev => prev.map(m => m.id === memoId ? { ...m, status: 'published' as const, published_at: new Date().toISOString(), updated_at: new Date().toISOString() } : m))
      toast.success('Published')
    } catch {
      toast.error('Failed to publish')
    } finally {
      setState(prev => ({ ...prev, saving: { ...prev.saving, [memoId]: false } }))
    }
  }

  const handleUnpublish = async (memoId: string) => {
    setState(prev => ({ ...prev, saving: { ...prev.saving, [memoId]: true } }))
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('memos')
        .update({
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', memoId)

      if (error) throw error
      setMemos(prev => prev.map(m => m.id === memoId ? { ...m, status: 'draft' as const, updated_at: new Date().toISOString() } : m))
      toast.success('Unpublished')
    } catch {
      toast.error('Failed to unpublish')
    } finally {
      setState(prev => ({ ...prev, saving: { ...prev.saving, [memoId]: false } }))
    }
  }

  const handleDelete = async (memoId: string) => {
    if (!confirm('Delete this memo? This cannot be undone.')) return
    
    setState(prev => ({ ...prev, deleting: { ...prev.deleting, [memoId]: true } }))
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_memo', memoId }),
      })
      if (!response.ok) throw new Error('Failed to delete')

      setMemos(prev => prev.filter(m => m.id !== memoId))
      toast.success('Deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setState(prev => ({ ...prev, deleting: { ...prev.deleting, [memoId]: false } }))
    }
  }

  const handleSyncHubSpot = async (memoId: string) => {
    setState(prev => ({ ...prev, syncing: { ...prev.syncing, [memoId]: true } }))
    try {
      const response = await fetch(`/api/brands/${brandId}/memos/${memoId}/hubspot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish: hubspotAutoPublish }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Sync failed')
      toast.success(data.message || 'Synced to HubSpot')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'HubSpot sync failed')
    } finally {
      setState(prev => ({ ...prev, syncing: { ...prev.syncing, [memoId]: false } }))
    }
  }

  const handleRegenerate = async (memoId: string, memo: Memo) => {
    if (!confirm('Regenerate this memo with AI? Current content will be replaced.')) return
    
    setState(prev => ({ ...prev, regenerating: { ...prev.regenerating, [memoId]: true } }))
    try {
      const response = await fetch(`/api/brands/${brandId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate_memo',
          memoId,
          memoType: memo.memo_type,
        }),
      })
      if (!response.ok) throw new Error('Failed to regenerate')

      toast.success('Regenerating... will refresh when done.')
      
      // Poll for completion
      const checkInterval = setInterval(async () => {
        const supabase = createClient()
        const { data: updated } = await supabase
          .from('memos')
          .select('*')
          .eq('id', memoId)
          .single()
        
        if (updated && updated.updated_at !== memo.updated_at) {
          clearInterval(checkInterval)
          setMemos(prev => prev.map(m => m.id === memoId ? (updated as Memo) : m))
          setState(prev => ({ ...prev, regenerating: { ...prev.regenerating, [memoId]: false } }))
          toast.success('Memo regenerated')
        }
      }, 3000)
      setTimeout(() => {
        clearInterval(checkInterval)
        setState(prev => ({ ...prev, regenerating: { ...prev.regenerating, [memoId]: false } }))
      }, 120000)
    } catch {
      toast.error('Failed to regenerate')
      setState(prev => ({ ...prev, regenerating: { ...prev.regenerating, [memoId]: false } }))
    }
  }

  const handleAiFeedback = async (memoId: string, memo: Memo, type: 'good' | 'bad' | 'tweak') => {
    const feedbackText = state.feedbackText[memoId] || ''
    
    if (type === 'tweak' && !feedbackText.trim()) {
      toast.error('Enter your feedback first')
      return
    }

    setState(prev => ({ ...prev, feedbackSending: { ...prev.feedbackSending, [memoId]: true } }))
    try {
      // Store feedback in schema_json and trigger regeneration with instructions
      const supabase = createClient()
      const existingSchema = (memo.schema_json || {}) as Record<string, unknown>
      const existingFeedback = (existingSchema.ai_feedback as Array<{type: string; text: string; at: string}>) || []
      
      const newFeedback = {
        type,
        text: type === 'good' ? 'Content approved as good' : type === 'bad' ? 'Content marked as bad quality' : feedbackText,
        at: new Date().toISOString(),
      }

      await supabase
        .from('memos')
        .update({
          schema_json: {
            ...existingSchema,
            ai_feedback: [...existingFeedback, newFeedback],
            review_status: type === 'good' ? 'human_approved' : 'ai_generated',
          },
          review_status: type === 'good' ? 'human_approved' : memo.status === 'published' ? 'human_reviewed' : 'ai_generated',
          updated_at: new Date().toISOString(),
        })
        .eq('id', memoId)

      if (type === 'good') {
        toast.success('Marked as good')
      } else if (type === 'bad') {
        toast.success('Marked as bad — consider regenerating')
      } else {
        toast.success('Feedback saved')
        // Clear the feedback text
        setState(prev => ({ ...prev, feedbackText: { ...prev.feedbackText, [memoId]: '' } }))
      }

      // If bad or tweak, offer to regenerate
      if (type === 'bad' || type === 'tweak') {
        // Trigger regeneration with feedback context
        const response = await fetch(`/api/brands/${brandId}/actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'regenerate_memo',
            memoId,
            memoType: memo.memo_type,
            feedback: type === 'tweak' ? feedbackText : 'The previous version was marked as bad quality. Generate a better version.',
          }),
        })
        if (response.ok) {
          toast.success('Regenerating with your feedback...')
          setState(prev => ({ ...prev, regenerating: { ...prev.regenerating, [memoId]: true } }))
          
          // Poll for completion
          const checkInterval = setInterval(async () => {
            const { data: updated } = await supabase
              .from('memos')
              .select('*')
              .eq('id', memoId)
              .single()
            
            if (updated && updated.updated_at !== memo.updated_at) {
              clearInterval(checkInterval)
              setMemos(prev => prev.map(m => m.id === memoId ? (updated as Memo) : m))
              setState(prev => ({ ...prev, regenerating: { ...prev.regenerating, [memoId]: false } }))
              toast.success('Memo regenerated with feedback')
            }
          }, 3000)
          setTimeout(() => {
            clearInterval(checkInterval)
            setState(prev => ({ ...prev, regenerating: { ...prev.regenerating, [memoId]: false } }))
          }, 120000)
        }
      }
    } catch {
      toast.error('Failed to save feedback')
    } finally {
      setState(prev => ({ ...prev, feedbackSending: { ...prev.feedbackSending, [memoId]: false } }))
    }
  }

  const getContentPreview = (markdown: string) => {
    return markdown
      .replace(/^#.*$/gm, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_`]/g, '')
      .replace(/\n+/g, ' ')
      .trim()
      .slice(0, 200)
  }

  const getWordCount = (markdown: string) => {
    return markdown.split(/\s+/).filter(Boolean).length
  }

  return (
    <div className="space-y-4">
      {/* Feed Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-500">
            {memos.length} total · {publishedCount} published · {draftCount} drafts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex border-2 border-[#0F172A]">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs font-bold tracking-wide transition-colors ${
                filter === 'all' ? 'bg-[#0F172A] text-white' : 'bg-white text-[#0F172A] hover:bg-slate-50'
              }`}
            >
              ALL
            </button>
            <button
              onClick={() => setFilter('published')}
              className={`px-3 py-1 text-xs font-bold tracking-wide border-l-2 border-[#0F172A] transition-colors ${
                filter === 'published' ? 'bg-[#10B981] text-white' : 'bg-white text-[#0F172A] hover:bg-slate-50'
              }`}
            >
              PUBLISHED
            </button>
            <button
              onClick={() => setFilter('draft')}
              className={`px-3 py-1 text-xs font-bold tracking-wide border-l-2 border-[#0F172A] transition-colors ${
                filter === 'draft' ? 'bg-[#F59E0B] text-white' : 'bg-white text-[#0F172A] hover:bg-slate-50'
              }`}
            >
              DRAFTS
            </button>
          </div>
        </div>
      </div>

      {/* Scrolling Feed */}
      <div className="space-y-3">
        {filteredMemos.length === 0 ? (
          <div className="text-center py-16 border-[3px] border-dashed border-slate-200">
            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No memos {filter !== 'all' ? `with status "${filter}"` : 'yet'}</p>
          </div>
        ) : (
          filteredMemos.map((memo) => {
            const isExpanded = state.expanded.has(memo.id)
            const expandedSection = state.expandedSection[memo.id]
            const isSaving = state.saving[memo.id]
            const isDeleting = state.deleting[memo.id]
            const isSyncing = state.syncing[memo.id]
            const isRegenerating = state.regenerating[memo.id]
            const isFeedbackSending = state.feedbackSending[memo.id]
            const hasDirtyChanges = isDirty(memo.id)
            const liveUrl = getMemoUrl(memo)
            const wordCount = getWordCount(memo.content_markdown)
            const sourcesCount = Array.isArray(memo.sources) ? memo.sources.length : 0
            const schemaJson = memo.schema_json as { hubspot_synced_at?: string } | null
            const memoTypeLabel = memo.memo_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())

            // Title is editable when content or SEO section is open
            const isTitleEditable = expandedSection === 'content' || expandedSection === 'seo'

            return (
              <div
                key={memo.id}
                className={`border-[3px] transition-all ${
                  memo.status === 'published' 
                    ? 'border-[#0F172A]' 
                    : 'border-slate-300'
                } ${isRegenerating ? 'opacity-60 pointer-events-none' : ''}`}
                style={{ borderLeft: memo.status === 'published' ? '6px solid #10B981' : '6px solid #F59E0B' }}
              >
                {/* Card Header - Always visible */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Title row — editable when content or seo is expanded */}
                      {isTitleEditable ? (
                        <Input
                          value={state.editTitle[memo.id] ?? memo.title}
                          onChange={(e) => setState(prev => ({
                            ...prev,
                            editTitle: { ...prev.editTitle, [memo.id]: e.target.value }
                          }))}
                          className="font-bold text-base border-2 border-[#0EA5E9] mb-1"
                        />
                      ) : (
                        <h3 className="font-bold text-[#0F172A] text-base leading-tight truncate">
                          {memo.title}
                        </h3>
                      )}
                      
                      {/* Meta row */}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge 
                          variant="outline" 
                          className="text-[10px] font-bold tracking-wider border-2 py-0"
                        >
                          {memoTypeLabel}
                        </Badge>
                        <Badge 
                          className={`text-[10px] font-bold tracking-wider py-0 ${
                            memo.status === 'published' 
                              ? 'bg-[#10B981] text-white hover:bg-[#10B981]' 
                              : 'bg-[#F59E0B] text-white hover:bg-[#F59E0B]'
                          }`}
                        >
                          {memo.status === 'published' ? 'PUBLISHED' : 'DRAFT'}
                        </Badge>
                        <span className="text-[11px] text-zinc-400">
                          {wordCount} words · {sourcesCount} sources
                        </span>
                        <span className="text-[11px] text-zinc-400" title={format(new Date(memo.updated_at), 'PPpp')}>
                          · {formatDistanceToNow(new Date(memo.updated_at), { addSuffix: true })}
                        </span>
                        {schemaJson?.hubspot_synced_at && (
                          <span className="text-[10px] text-[#0EA5E9] font-bold">· HS SYNCED</span>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {memo.status === 'published' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleUnpublish(memo.id)}
                          disabled={isSaving}
                        >
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <EyeOff className="h-3 w-3" />}
                          <span className="ml-1 hidden sm:inline">Unpublish</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 px-2 text-xs bg-[#10B981] hover:bg-[#059669] text-white"
                          onClick={() => handlePublish(memo.id)}
                          disabled={isSaving}
                        >
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                          <span className="ml-1">Publish</span>
                        </Button>
                      )}

                      {memo.status === 'published' && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                          <a href={liveUrl} target="_blank" rel="noopener noreferrer" title="View live">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}

                      {hubspotEnabled && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleSyncHubSpot(memo.id)}
                          disabled={isSyncing}
                          title="Sync to HubSpot"
                        >
                          {isSyncing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ArrowUpFromLine className="h-3 w-3" />
                          )}
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(memo.id)}
                        disabled={isDeleting}
                        title="Delete"
                      >
                        {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  {/* Content Preview (when not expanded) */}
                  {!isExpanded && (
                    <p className="text-sm text-zinc-500 mt-2 line-clamp-2 leading-relaxed">
                      {getContentPreview(memo.content_markdown)}...
                    </p>
                  )}
                </div>

                {/* Section Toggle Bar */}
                <div className="flex border-t-2 border-slate-200 divide-x-2 divide-slate-200">
                  <button
                    onClick={() => toggleSection(memo.id, 'content')}
                    className={`flex-1 px-3 py-1.5 text-[10px] font-bold tracking-wider flex items-center justify-center gap-1 transition-colors ${
                      expandedSection === 'content' ? 'bg-[#0F172A] text-white' : 'text-zinc-500 hover:bg-slate-50'
                    }`}
                  >
                    <Pencil className="h-3 w-3" />
                    EDIT
                    {expandedSection === 'content' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => toggleSection(memo.id, 'feedback')}
                    className={`flex-1 px-3 py-1.5 text-[10px] font-bold tracking-wider flex items-center justify-center gap-1 transition-colors ${
                      expandedSection === 'feedback' ? 'bg-[#8B5CF6] text-white' : 'text-zinc-500 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare className="h-3 w-3" />
                    AI FEEDBACK
                  </button>
                  <button
                    onClick={() => toggleSection(memo.id, 'seo')}
                    className={`flex-1 px-3 py-1.5 text-[10px] font-bold tracking-wider flex items-center justify-center gap-1 transition-colors ${
                      expandedSection === 'seo' ? 'bg-[#0EA5E9] text-white' : 'text-zinc-500 hover:bg-slate-50'
                    }`}
                  >
                    <Settings2 className="h-3 w-3" />
                    SEO & DETAILS
                  </button>
                </div>

                {/* Expanded Content Section — always editable */}
                {expandedSection === 'content' && (
                  <div className="border-t-2 border-slate-200">
                    <div className="p-4 bg-slate-50">
                      <Textarea
                        value={state.editContent[memo.id] ?? memo.content_markdown}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          editContent: { ...prev.editContent, [memo.id]: e.target.value }
                        }))}
                        className="min-h-[300px] font-mono text-sm border-2 bg-white"
                        placeholder="Markdown content..."
                      />
                    </div>
                    {/* Bottom toolbar */}
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(memo.id)}
                          disabled={isSaving || !hasDirtyChanges}
                          className={`font-bold text-xs transition-all ${
                            hasDirtyChanges
                              ? 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                          {hasDirtyChanges ? 'SAVE' : 'SAVED'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelContentEditing(memo.id)}
                          className="text-xs text-zinc-500"
                        >
                          Cancel
                        </Button>
                        {hasDirtyChanges && (
                          <span className="text-[10px] text-amber-600 font-medium">Unsaved changes</span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerate(memo.id, memo)}
                        disabled={isRegenerating}
                        className="text-xs"
                      >
                        {isRegenerating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                        Regenerate
                      </Button>
                    </div>
                  </div>
                )}

                {/* Expanded AI Feedback Section */}
                {expandedSection === 'feedback' && (
                  <div className="border-t-2 border-slate-200 p-4 bg-purple-50/50">
                    <div className="space-y-3">
                      <p className="text-xs text-zinc-500 font-medium">How is this memo? Your feedback improves future generation.</p>
                      
                      {/* Quick feedback buttons */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAiFeedback(memo.id, memo, 'good')}
                          disabled={isFeedbackSending}
                          className="text-xs border-2 border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          This is good
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAiFeedback(memo.id, memo, 'bad')}
                          disabled={isFeedbackSending}
                          className="text-xs border-2 border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <ThumbsDown className="h-3 w-3 mr-1" />
                          This is bad
                        </Button>
                      </div>

                      {/* Tweak input */}
                      <div className="flex gap-2">
                        <Textarea
                          value={state.feedbackText[memo.id] || ''}
                          onChange={(e) => setState(prev => ({
                            ...prev,
                            feedbackText: { ...prev.feedbackText, [memo.id]: e.target.value }
                          }))}
                          placeholder="Tell the AI how to improve this... e.g. 'Make it more concise' or 'Add more comparisons with competitor X'"
                          className="text-sm min-h-[60px] border-2 bg-white"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAiFeedback(memo.id, memo, 'tweak')}
                        disabled={isFeedbackSending || !state.feedbackText[memo.id]?.trim()}
                        className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-xs"
                      >
                        {isFeedbackSending ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3 mr-1" />
                        )}
                        REGENERATE WITH FEEDBACK
                      </Button>

                      {/* Show existing feedback history */}
                      {!!(memo.schema_json as Record<string, unknown>)?.ai_feedback && (
                        <div className="mt-3 pt-3 border-t border-purple-200">
                          <p className="text-[10px] font-bold text-zinc-400 tracking-wider mb-2">FEEDBACK HISTORY</p>
                          <div className="space-y-1">
                            {((memo.schema_json as Record<string, unknown>).ai_feedback as Array<{type: string; text: string; at: string}>).slice(-5).map((fb, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-zinc-500">
                                <span className={`shrink-0 mt-0.5 ${
                                  fb.type === 'good' ? 'text-green-500' : fb.type === 'bad' ? 'text-red-500' : 'text-purple-500'
                                }`}>
                                  {fb.type === 'good' ? '👍' : fb.type === 'bad' ? '👎' : '✏️'}
                                </span>
                                <span className="line-clamp-1">{fb.text}</span>
                                <span className="shrink-0 text-zinc-300 text-[10px]">
                                  {formatDistanceToNow(new Date(fb.at), { addSuffix: true })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded SEO & Details Section — always editable */}
                {expandedSection === 'seo' && (
                  <div className="border-t-2 border-slate-200">
                    <div className="p-4 bg-sky-50/50 space-y-4">
                      {/* Slug */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 tracking-wider">URL SLUG</label>
                        <Input
                          value={state.editSlug[memo.id] ?? memo.slug}
                          onChange={(e) => setState(prev => ({
                            ...prev,
                            editSlug: { ...prev.editSlug, [memo.id]: e.target.value }
                          }))}
                          className="text-sm border-2"
                        />
                        <p className="text-[10px] text-zinc-400">{brandSubdomain}.contextmemo.com/{state.editSlug[memo.id] ?? memo.slug}</p>
                      </div>

                      {/* Meta Description */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-500 tracking-wider">META DESCRIPTION</label>
                        <Textarea
                          value={state.editMeta[memo.id] ?? (memo.meta_description || '')}
                          onChange={(e) => setState(prev => ({
                            ...prev,
                            editMeta: { ...prev.editMeta, [memo.id]: e.target.value }
                          }))}
                          className="text-sm min-h-[60px] border-2 bg-white"
                          placeholder="Meta description for search engines..."
                        />
                        <p className="text-[10px] text-zinc-400">{(state.editMeta[memo.id] ?? (memo.meta_description || '')).length}/160 characters</p>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 tracking-wider">TYPE</label>
                          <p className="text-xs text-zinc-700 mt-0.5">{memoTypeLabel}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 tracking-wider">VERSION</label>
                          <p className="text-xs text-zinc-700 mt-0.5">v{memo.version}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 tracking-wider">CREATED</label>
                          <p className="text-xs text-zinc-700 mt-0.5">{format(new Date(memo.created_at), 'MMM d, yyyy')}</p>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-500 tracking-wider">WORDS</label>
                          <p className="text-xs text-zinc-700 mt-0.5">{wordCount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    {/* Bottom toolbar */}
                    <div className="flex items-center justify-between px-4 py-2 bg-sky-100/50 border-t border-sky-200">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(memo.id)}
                          disabled={isSaving || !hasDirtyChanges}
                          className={`font-bold text-xs transition-all ${
                            hasDirtyChanges
                              ? 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white'
                              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                          {hasDirtyChanges ? 'SAVE' : 'SAVED'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelContentEditing(memo.id)}
                          className="text-xs text-zinc-500"
                        >
                          Cancel
                        </Button>
                        {hasDirtyChanges && (
                          <span className="text-[10px] text-amber-600 font-medium">Unsaved changes</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
