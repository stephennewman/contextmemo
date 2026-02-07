'use client'

import { useState, useRef, useCallback } from 'react'
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
  Loader2,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Send,
  FileText,
  Settings2,
  ArrowUpFromLine,
  ArrowLeft,
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  Code,
  Quote,
  Minus,
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

type EditorTab = 'content' | 'seo' | 'feedback'

interface MemoCardState {
  saving: Record<string, boolean>
  deleting: Record<string, boolean>
  syncing: Record<string, boolean>
  regenerating: Record<string, boolean>
  feedbackText: Record<string, string>
  feedbackSending: Record<string, boolean>
  // Edit fields
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [state, setState] = useState<MemoCardState>({
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

  // Editor mode
  const [editorMemoId, setEditorMemoId] = useState<string | null>(null)
  const [editorTab, setEditorTab] = useState<EditorTab>('content')

  // Insert markdown formatting around selection or at cursor
  const insertMarkdown = useCallback((prefix: string, suffix: string = '', placeholder: string = '') => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = ta.value
    const selected = text.substring(start, end)
    const insert = selected || placeholder
    const newText = text.substring(0, start) + prefix + insert + suffix + text.substring(end)
    const memoId = editorMemoId
    if (!memoId) return
    setState(prev => ({ ...prev, editContent: { ...prev.editContent, [memoId]: newText } }))
    requestAnimationFrame(() => {
      ta.focus()
      const cursorPos = selected ? start + prefix.length + selected.length + suffix.length : start + prefix.length + insert.length
      ta.setSelectionRange(
        selected ? cursorPos : start + prefix.length,
        selected ? cursorPos : start + prefix.length + insert.length
      )
    })
  }, [editorMemoId])

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

  // Open full-screen editor for a memo
  const openEditor = (memo: Memo) => {
    setState(prev => ({
      ...prev,
      editTitle: { ...prev.editTitle, [memo.id]: memo.title },
      editContent: { ...prev.editContent, [memo.id]: memo.content_markdown },
      editMeta: { ...prev.editMeta, [memo.id]: memo.meta_description || '' },
      editSlug: { ...prev.editSlug, [memo.id]: memo.slug },
    }))
    setEditorMemoId(memo.id)
    setEditorTab('content')
  }

  // Close editor, discard changes
  const closeEditor = () => {
    if (editorMemoId) {
      const memo = memos.find(m => m.id === editorMemoId)
      if (memo) {
        setState(prev => ({
          ...prev,
          editTitle: { ...prev.editTitle, [editorMemoId]: memo.title },
          editContent: { ...prev.editContent, [editorMemoId]: memo.content_markdown },
          editMeta: { ...prev.editMeta, [editorMemoId]: memo.meta_description || '' },
          editSlug: { ...prev.editSlug, [editorMemoId]: memo.slug },
        }))
      }
    }
    setEditorMemoId(null)
  }

  // Check if the currently-editing memo has unsaved changes
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

  // Resolve the memo currently in the editor
  const editorMemo = editorMemoId ? memos.find(m => m.id === editorMemoId) : null
  const editorDirty = editorMemoId ? isDirty(editorMemoId) : false
  const editorSaving = editorMemoId ? state.saving[editorMemoId] : false
  const editorRegenerating = editorMemoId ? state.regenerating[editorMemoId] : false
  const editorFeedbackSending = editorMemoId ? state.feedbackSending[editorMemoId] : false

  // --- Full-screen editor overlay ---
  if (editorMemoId && editorMemo) {
    const liveUrl = getMemoUrl(editorMemo)
    const wordCount = getWordCount(state.editContent[editorMemoId] ?? editorMemo.content_markdown)
    const memoTypeLabel = editorMemo.memo_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())

    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        {/* Editor Top Bar */}
        <div className="shrink-0 border-b-[3px] border-[#0F172A] bg-white">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => {
                  if (editorDirty && !confirm('You have unsaved changes. Discard?')) return
                  closeEditor()
                }}
                className="shrink-0 p-1.5 hover:bg-slate-100 transition-colors"
                title="Back to feed"
              >
                <ArrowLeft className="h-4 w-4 text-[#0F172A]" />
              </button>
              <div className="min-w-0 flex-1">
                <Input
                  value={state.editTitle[editorMemoId] ?? editorMemo.title}
                  onChange={(e) => setState(prev => ({
                    ...prev,
                    editTitle: { ...prev.editTitle, [editorMemoId]: e.target.value }
                  }))}
                  className="font-bold text-lg border-0 border-b-2 border-transparent focus:border-[#0EA5E9] rounded-none px-0 h-auto py-1 bg-transparent"
                  placeholder="Memo title..."
                />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-[10px] font-bold tracking-wider border-2 py-0">
                {memoTypeLabel}
              </Badge>
              <Badge className={`text-[10px] font-bold tracking-wider py-0 ${
                editorMemo.status === 'published'
                  ? 'bg-[#10B981] text-white hover:bg-[#10B981]'
                  : 'bg-[#F59E0B] text-white hover:bg-[#F59E0B]'
              }`}>
                {editorMemo.status === 'published' ? 'PUBLISHED' : 'DRAFT'}
              </Badge>
              {editorMemo.status === 'published' ? (
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleUnpublish(editorMemoId)} disabled={editorSaving}>
                  <EyeOff className="h-3 w-3 mr-1" /> Unpublish
                </Button>
              ) : (
                <Button size="sm" className="h-7 px-2 text-xs bg-[#10B981] hover:bg-[#059669] text-white" onClick={() => handlePublish(editorMemoId)} disabled={editorSaving}>
                  <Eye className="h-3 w-3 mr-1" /> Publish
                </Button>
              )}
              {editorMemo.status === 'published' && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                  <a href={liveUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
                </Button>
              )}
              {hubspotEnabled && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleSyncHubSpot(editorMemoId)} disabled={state.syncing[editorMemoId]} title="Sync to HubSpot">
                  {state.syncing[editorMemoId] ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpFromLine className="h-3 w-3" />}
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { handleDelete(editorMemoId); setEditorMemoId(null) }} disabled={state.deleting[editorMemoId]}>
                {state.deleting[editorMemoId] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </Button>
            </div>
          </div>

          {/* Editor Tab Bar */}
          <div className="max-w-6xl mx-auto px-6 flex border-t border-slate-200">
            <button
              onClick={() => setEditorTab('content')}
              className={`px-5 py-2 text-[11px] font-bold tracking-wider transition-colors border-b-[3px] -mb-px ${
                editorTab === 'content' ? 'border-[#0F172A] text-[#0F172A]' : 'border-transparent text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <Pencil className="h-3 w-3 inline mr-1.5 -mt-0.5" />
              CONTENT
            </button>
            <button
              onClick={() => setEditorTab('feedback')}
              className={`px-5 py-2 text-[11px] font-bold tracking-wider transition-colors border-b-[3px] -mb-px ${
                editorTab === 'feedback' ? 'border-[#8B5CF6] text-[#8B5CF6]' : 'border-transparent text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <MessageSquare className="h-3 w-3 inline mr-1.5 -mt-0.5" />
              AI FEEDBACK
            </button>
            <button
              onClick={() => setEditorTab('seo')}
              className={`px-5 py-2 text-[11px] font-bold tracking-wider transition-colors border-b-[3px] -mb-px ${
                editorTab === 'seo' ? 'border-[#0EA5E9] text-[#0EA5E9]' : 'border-transparent text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <Settings2 className="h-3 w-3 inline mr-1.5 -mt-0.5" />
              SEO & DETAILS
            </button>
            <div className="flex-1" />
            <span className="self-center text-[11px] text-zinc-400 tabular-nums">{wordCount} words</span>
          </div>
        </div>

        {/* Editor Content Area — fills remaining space */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-6">
            {/* Content Tab — editor + AI optimization sidebar */}
            {editorTab === 'content' && (() => {
              const editContent = state.editContent[editorMemoId] ?? editorMemo.content_markdown
              const editMeta = state.editMeta[editorMemoId] ?? (editorMemo.meta_description || '')

              // AI optimization analysis
              const headingCount = (editContent.match(/^##\s/gm) || []).length + (editContent.match(/^#\s/gm) || []).length
              const subheadingCount = (editContent.match(/^###\s/gm) || []).length
              const bulletCount = (editContent.match(/^[\-\*]\s/gm) || []).length
              const exclamationCount = (editContent.match(/!/g) || []).length
              const brandMentions = (editContent.toLowerCase().match(new RegExp(brandName.toLowerCase(), 'g')) || []).length

              const checks = [
                { label: 'Headings', hint: 'Use ## for sections. AI navigates by these.', pass: headingCount > 0, count: headingCount },
                { label: 'Subheadings', hint: 'Use ### to break sections. Helps AI find details.', pass: subheadingCount > 0, count: subheadingCount },
                { label: 'Bullet points', hint: 'Lists are easy for AI to parse and cite.', pass: bulletCount > 0, count: bulletCount },
                { label: 'Verified date', hint: 'Include "Last verified: [date]" for freshness.', pass: editContent.toLowerCase().includes('verified') || editContent.toLowerCase().includes('last updated'), count: null },
                { label: 'Sources cited', hint: 'Add a ## Sources section. AI trusts sourced content.', pass: editContent.toLowerCase().includes('source') || editContent.toLowerCase().includes('reference'), count: null },
                { label: 'Factual tone', hint: 'Avoid hype (!!!). AI prefers neutral statements.', pass: exclamationCount < 3, count: `${exclamationCount}!` },
                { label: 'Content length', hint: '500-3000 chars. Too short lacks detail, too long gets truncated.', pass: editContent.length >= 500 && editContent.length <= 3000, count: editContent.length.toLocaleString() },
                { label: 'Meta description', hint: '50+ chars. AI reads this as a page summary.', pass: editMeta.length >= 50, count: `${editMeta.length}/160` },
                { label: 'Brand mentions', hint: `Mention "${brandName}" so AI associates this with your brand.`, pass: brandMentions > 0, count: brandMentions },
              ]
              const passCount = checks.filter(c => c.pass).length
              const scorePercent = Math.round((passCount / checks.length) * 100)

              return (
                <div className="flex gap-6">
                  {/* Main editor */}
                  <div className="flex-1 min-w-0">
                    {/* Editor container — single unified border */}
                    <div className="border-2 border-slate-300 rounded-md">
                      {/* Formatting Toolbar */}
                      <div className="flex items-center gap-0.5 border-b border-slate-300 bg-slate-50 px-2 py-1.5 rounded-t-md sticky top-0 z-10">
                        <button type="button" onClick={() => insertMarkdown('**', '**', 'bold')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors" title="Bold (⌘B)">
                          <Bold className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => insertMarkdown('*', '*', 'italic')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors" title="Italic (⌘I)">
                          <Italic className="h-4 w-4" />
                        </button>
                        <div className="w-px h-5 bg-slate-300 mx-1" />
                        <button type="button" onClick={() => insertMarkdown('\n## ', '\n', 'Heading')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors" title="Heading 2">
                          <Heading2 className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => insertMarkdown('\n### ', '\n', 'Subheading')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors" title="Heading 3">
                          <Heading3 className="h-4 w-4" />
                        </button>
                        <div className="w-px h-5 bg-slate-300 mx-1" />
                        <button type="button" onClick={() => insertMarkdown('\n- ', '\n', 'list item')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors" title="Bullet List">
                          <List className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => insertMarkdown('\n1. ', '\n', 'list item')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors" title="Numbered List">
                          <ListOrdered className="h-4 w-4" />
                        </button>
                        <div className="w-px h-5 bg-slate-300 mx-1" />
                        <button type="button" onClick={() => insertMarkdown('[', '](url)', 'link text')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors" title="Link">
                          <Link2 className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => insertMarkdown('`', '`', 'code')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors" title="Inline Code">
                          <Code className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => insertMarkdown('\n> ', '\n', 'quote')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors" title="Blockquote">
                          <Quote className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => insertMarkdown('\n---\n', '', '')} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors" title="Horizontal Rule">
                          <Minus className="h-4 w-4" />
                        </button>
                      </div>
                      <Textarea
                        ref={textareaRef}
                        value={editContent}
                        onChange={(e) => setState(prev => ({
                          ...prev,
                          editContent: { ...prev.editContent, [editorMemoId]: e.target.value }
                        }))}
                        onKeyDown={(e) => {
                          if (e.metaKey || e.ctrlKey) {
                            if (e.key === 'b') { e.preventDefault(); insertMarkdown('**', '**', 'bold') }
                            if (e.key === 'i') { e.preventDefault(); insertMarkdown('*', '*', 'italic') }
                          }
                        }}
                        className="w-full min-h-[calc(100vh-300px)] font-mono text-sm border-0 bg-white p-4 resize-none rounded-none shadow-none focus-visible:ring-0 focus-visible:border-0"
                        placeholder="Write your memo content in Markdown..."
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* AI Optimization Sidebar */}
                  <div className="w-72 shrink-0 hidden lg:block">
                    <div className="border-[3px] border-[#0F172A] sticky top-0">
                      <div className="px-4 py-3 bg-[#0F172A] flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-widest text-slate-300">AI OPTIMIZATION</span>
                        <span className={`text-sm font-bold ${
                          scorePercent >= 70 ? 'text-[#10B981]' : scorePercent >= 40 ? 'text-[#F59E0B]' : 'text-red-400'
                        }`}>
                          {scorePercent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200">
                        <div
                          className={`h-1.5 transition-all ${
                            scorePercent >= 70 ? 'bg-[#10B981]' : scorePercent >= 40 ? 'bg-[#F59E0B]' : 'bg-red-400'
                          }`}
                          style={{ width: `${scorePercent}%` }}
                        />
                      </div>
                      <div className="p-3 space-y-1.5">
                        {checks.map((check) => (
                          <div key={check.label}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {check.pass ? (
                                  <Check className="h-3 w-3 text-[#10B981] shrink-0" />
                                ) : (
                                  <X className="h-3 w-3 text-red-400 shrink-0" />
                                )}
                                <span className={`text-xs ${check.pass ? 'text-zinc-700' : 'text-zinc-400'}`}>
                                  {check.label}
                                </span>
                              </div>
                              {check.count !== null && (
                                <span className="text-[10px] text-zinc-400 font-mono">{check.count}</span>
                              )}
                            </div>
                            <p className="text-[10px] text-zinc-400 ml-[18px] leading-tight">{check.hint}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* AI Feedback Tab */}
            {editorTab === 'feedback' && (
              <div className="max-w-2xl space-y-4">
                <p className="text-sm text-zinc-500">How is this memo? Your feedback will improve future AI generation.</p>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleAiFeedback(editorMemoId, editorMemo, 'good')}
                    disabled={editorFeedbackSending}
                    className="border-2 border-green-300 text-green-700 hover:bg-green-50 px-5 py-3 h-auto"
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    This is good
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAiFeedback(editorMemoId, editorMemo, 'bad')}
                    disabled={editorFeedbackSending}
                    className="border-2 border-red-300 text-red-700 hover:bg-red-50 px-5 py-3 h-auto"
                  >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    This is bad
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 tracking-wider">TWEAK IT</label>
                  <Textarea
                    value={state.feedbackText[editorMemoId] || ''}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      feedbackText: { ...prev.feedbackText, [editorMemoId]: e.target.value }
                    }))}
                    placeholder="e.g. 'Make it more concise' or 'Add more comparisons with competitor X' or 'Focus on enterprise use cases'"
                    className="min-h-[100px] border-2 bg-white"
                  />
                  <Button
                    onClick={() => handleAiFeedback(editorMemoId, editorMemo, 'tweak')}
                    disabled={editorFeedbackSending || !state.feedbackText[editorMemoId]?.trim()}
                    className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-xs"
                  >
                    {editorFeedbackSending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                    REGENERATE WITH FEEDBACK
                  </Button>
                </div>

                {!!(editorMemo.schema_json as Record<string, unknown>)?.ai_feedback && (
                  <div className="mt-6 pt-4 border-t border-purple-200">
                    <p className="text-[10px] font-bold text-zinc-400 tracking-wider mb-3">FEEDBACK HISTORY</p>
                    <div className="space-y-2">
                      {((editorMemo.schema_json as Record<string, unknown>).ai_feedback as Array<{type: string; text: string; at: string}>).slice(-10).map((fb, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-zinc-500">
                          <span className={`shrink-0 mt-0.5 ${fb.type === 'good' ? 'text-green-500' : fb.type === 'bad' ? 'text-red-500' : 'text-purple-500'}`}>
                            {fb.type === 'good' ? '👍' : fb.type === 'bad' ? '👎' : '✏️'}
                          </span>
                          <span>{fb.text}</span>
                          <span className="shrink-0 text-zinc-300 text-xs ml-auto">
                            {formatDistanceToNow(new Date(fb.at), { addSuffix: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SEO & Details Tab */}
            {editorTab === 'seo' && (
              <div className="max-w-2xl space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 tracking-wider">URL SLUG</label>
                  <Input
                    value={state.editSlug[editorMemoId] ?? editorMemo.slug}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      editSlug: { ...prev.editSlug, [editorMemoId]: e.target.value }
                    }))}
                    className="text-sm border-2"
                  />
                  <p className="text-xs text-zinc-400">{brandSubdomain}.contextmemo.com/{state.editSlug[editorMemoId] ?? editorMemo.slug}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 tracking-wider">META DESCRIPTION</label>
                  <Textarea
                    value={state.editMeta[editorMemoId] ?? (editorMemo.meta_description || '')}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      editMeta: { ...prev.editMeta, [editorMemoId]: e.target.value }
                    }))}
                    className="min-h-[80px] border-2 bg-white"
                    placeholder="Brief description for search engines..."
                  />
                  <p className="text-xs text-zinc-400">{(state.editMeta[editorMemoId] ?? (editorMemo.meta_description || '')).length}/160 characters</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 tracking-wider">TYPE</label>
                    <p className="text-sm text-zinc-700 mt-1">{memoTypeLabel}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 tracking-wider">VERSION</label>
                    <p className="text-sm text-zinc-700 mt-1">v{editorMemo.version}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 tracking-wider">CREATED</label>
                    <p className="text-sm text-zinc-700 mt-1">{format(new Date(editorMemo.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 tracking-wider">UPDATED</label>
                    <p className="text-sm text-zinc-700 mt-1">{formatDistanceToNow(new Date(editorMemo.updated_at), { addSuffix: true })}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Persistent Bottom Toolbar */}
        <div className="shrink-0 border-t-[3px] border-[#0F172A] bg-white">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {editorDirty && (
                <>
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
                </>
              )}
              {!editorDirty && (
                <span className="text-xs text-zinc-400">No changes</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (editorDirty && !confirm('Discard unsaved changes?')) return
                  closeEditor()
                }}
                className="text-xs text-zinc-500 hover:text-zinc-700"
              >
                <X className="h-3 w-3 mr-1" />
                Close
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRegenerate(editorMemoId, editorMemo)}
                disabled={editorRegenerating}
                className="text-xs"
              >
                {editorRegenerating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Regenerate
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave(editorMemoId)}
                disabled={editorSaving || !editorDirty}
                className={`font-bold text-xs px-5 transition-all ${
                  editorDirty
                    ? 'bg-[#0EA5E9] hover:bg-[#0284C7] text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {editorSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                {editorDirty ? 'SAVE' : 'SAVED'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- Feed view ---
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
            const isSaving = state.saving[memo.id]
            const isDeleting = state.deleting[memo.id]
            const isSyncing = state.syncing[memo.id]
            const isRegenerating = state.regenerating[memo.id]
            const liveUrl = getMemoUrl(memo)
            const wordCount = getWordCount(memo.content_markdown)
            const sourcesCount = Array.isArray(memo.sources) ? memo.sources.length : 0
            const schemaJson = memo.schema_json as { hubspot_synced_at?: string } | null
            const memoTypeLabel = memo.memo_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())

            return (
              <div
                key={memo.id}
                className={`border-[3px] transition-all ${
                  memo.status === 'published' ? 'border-[#0F172A]' : 'border-slate-300'
                } ${isRegenerating ? 'opacity-60 pointer-events-none' : ''}`}
                style={{ borderLeft: memo.status === 'published' ? '6px solid #10B981' : '6px solid #F59E0B' }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[#0F172A] text-base leading-tight truncate">
                        {memo.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-bold tracking-wider border-2 py-0">{memoTypeLabel}</Badge>
                        <Badge className={`text-[10px] font-bold tracking-wider py-0 ${
                          memo.status === 'published' ? 'bg-[#10B981] text-white hover:bg-[#10B981]' : 'bg-[#F59E0B] text-white hover:bg-[#F59E0B]'
                        }`}>
                          {memo.status === 'published' ? 'PUBLISHED' : 'DRAFT'}
                        </Badge>
                        <span className="text-[11px] text-zinc-400">{wordCount} words · {sourcesCount} sources</span>
                        <span className="text-[11px] text-zinc-400" title={format(new Date(memo.updated_at), 'PPpp')}>
                          · {formatDistanceToNow(new Date(memo.updated_at), { addSuffix: true })}
                        </span>
                        {schemaJson?.hubspot_synced_at && (
                          <span className="text-[10px] text-[#0EA5E9] font-bold">· HS SYNCED</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {memo.status === 'published' ? (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleUnpublish(memo.id)} disabled={isSaving}>
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <EyeOff className="h-3 w-3" />}
                          <span className="ml-1 hidden sm:inline">Unpublish</span>
                        </Button>
                      ) : (
                        <Button size="sm" className="h-7 px-2 text-xs bg-[#10B981] hover:bg-[#059669] text-white" onClick={() => handlePublish(memo.id)} disabled={isSaving}>
                          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                          <span className="ml-1">Publish</span>
                        </Button>
                      )}
                      {memo.status === 'published' && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                          <a href={liveUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
                        </Button>
                      )}
                      {hubspotEnabled && (
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleSyncHubSpot(memo.id)} disabled={isSyncing} title="Sync to HubSpot">
                          {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpFromLine className="h-3 w-3" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(memo.id)} disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500 mt-2 line-clamp-2 leading-relaxed">
                    {getContentPreview(memo.content_markdown)}...
                  </p>
                </div>

                {/* Edit button — opens full-screen editor */}
                <button
                  onClick={() => openEditor(memo)}
                  className="w-full px-4 py-2 border-t-2 border-slate-200 text-[10px] font-bold tracking-wider text-zinc-500 hover:bg-slate-50 hover:text-[#0F172A] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Pencil className="h-3 w-3" />
                  EDIT MEMO
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
