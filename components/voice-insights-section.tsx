'use client'

import { useState, useEffect } from 'react'
import { VoiceInsight, VoiceInsightTopic, VOICE_INSIGHT_TOPIC_LABELS, VOICE_INSIGHT_TOPIC_DESCRIPTIONS } from '@/lib/supabase/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { VoiceRecorder } from '@/components/voice-recorder'
import { VoiceInsightCard } from '@/components/voice-insight-card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { 
  Mic, Plus, Loader2, Quote, Info, Sparkles, 
  CheckCircle2, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface VoiceInsightsSectionProps {
  brandId: string
}

export function VoiceInsightsSection({ brandId }: VoiceInsightsSectionProps) {
  const [insights, setInsights] = useState<VoiceInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'voice' | 'text'>('voice')
  
  // New insight form state
  const [newInsight, setNewInsight] = useState({
    title: '',
    transcript: '',
    topic: 'market_position' as VoiceInsightTopic,
    tags: '',
    recorded_by_name: '',
    recorded_by_title: '',
    recorded_by_linkedin_url: '',
  })
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  // Load insights
  useEffect(() => {
    loadInsights()
  }, [brandId])

  const loadInsights = async () => {
    try {
      const response = await fetch(`/api/brands/${brandId}/voice-insights`)
      if (response.ok) {
        const data = await response.json()
        setInsights(data.insights || [])
      }
    } catch (error) {
      console.error('Failed to load insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTranscription = (transcript: string, durationSeconds: number, blob?: Blob) => {
    setNewInsight(prev => ({ ...prev, transcript }))
    setAudioDuration(durationSeconds)
    if (blob) {
      setAudioBlob(blob)
    }
    // Auto-switch to show the transcript
    setActiveTab('text')
  }

  const saveInsight = async () => {
    if (!newInsight.title || !newInsight.transcript || !newInsight.recorded_by_name) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSaving(true)
    try {
      let audio_url: string | undefined

      // Upload audio if we have a recording
      if (audioBlob) {
        const uploadFormData = new FormData()
        const extension = audioBlob.type.includes('webm') ? 'webm' : 'mp4'
        uploadFormData.append('audio', audioBlob, `recording.${extension}`)
        
        const uploadResponse = await fetch(`/api/brands/${brandId}/voice-insights/upload-audio`, {
          method: 'POST',
          body: uploadFormData,
        })
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          audio_url = uploadData.audio_url
        } else {
          console.warn('Audio upload failed, proceeding without audio URL')
        }
      }

      const response = await fetch(`/api/brands/${brandId}/voice-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newInsight,
          tags: newInsight.tags.split(',').map(t => t.trim()).filter(Boolean),
          audio_duration_seconds: audioDuration,
          audio_url,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      const data = await response.json()
      setInsights([data.insight, ...insights])
      setIsAddOpen(false)
      resetForm()
      toast.success(audio_url 
        ? 'Voice insight saved with audio recording' 
        : 'Voice insight saved with verification'
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save insight')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteInsight = async (insightId: string) => {
    if (!confirm('Are you sure you want to delete this insight?')) return

    try {
      const response = await fetch(
        `/api/brands/${brandId}/voice-insights/${insightId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setInsights(insights.filter(i => i.id !== insightId))
        toast.success('Insight deleted')
      }
    } catch (error) {
      toast.error('Failed to delete insight')
    }
  }

  const resetForm = () => {
    setNewInsight({
      title: '',
      transcript: '',
      topic: 'market_position',
      tags: '',
      recorded_by_name: '',
      recorded_by_title: '',
      recorded_by_linkedin_url: '',
    })
    setAudioDuration(null)
    setAudioBlob(null)
    setActiveTab('voice')
  }

  // Group insights by topic
  const insightsByTopic = insights.reduce((acc, insight) => {
    if (!acc[insight.topic]) acc[insight.topic] = []
    acc[insight.topic].push(insight)
    return acc
  }, {} as Record<VoiceInsightTopic, VoiceInsight[]>)

  return (
    <>
      <Card className="border-2 border-purple-200 dark:border-purple-800" style={{ borderLeft: '4px solid #8B5CF6' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-purple-600" />
              <CardTitle>Expert Insights</CardTitle>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Primary Source
              </Badge>
            </div>
            <Button onClick={() => setIsAddOpen(true)} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add Insight
            </Button>
          </div>
          <CardDescription>
            Record voice insights to create verified, citable primary sources. These add human credibility to AI-generated content with timestamped, location-verified attribution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : insights.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <Quote className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="font-medium mb-1">No expert insights yet</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                Add your first voice insight to create a verified primary source. When AI generates content, it can cite your expertise with full attribution.
              </p>
              <Button onClick={() => setIsAddOpen(true)} variant="outline" className="gap-2">
                <Mic className="h-4 w-4" />
                Record Your First Insight
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(insightsByTopic).map(([topic, topicInsights]) => (
                <div key={topic}>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    {VOICE_INSIGHT_TOPIC_LABELS[topic as VoiceInsightTopic]}
                    <Badge variant="outline" className="text-xs">
                      {topicInsights.length}
                    </Badge>
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {topicInsights.map(insight => (
                      <VoiceInsightCard
                        key={insight.id}
                        insight={insight}
                        onDelete={deleteInsight}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Info box about how insights are used */}
          <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-purple-900 dark:text-purple-200">
                  How Expert Insights are used
                </p>
                <ul className="space-y-1 text-purple-800 dark:text-purple-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Cited in AI-generated memos as verified primary sources</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Full attribution: name, title, date, time, and location</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Helps AI models understand your brand's authoritative voice</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Insight Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Add Expert Insight
            </DialogTitle>
            <DialogDescription>
              Record or type an insight to create a verified, citable primary source. Your insight will be timestamped and verified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Topic selection */}
            <div className="space-y-2">
              <Label>Topic Category *</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(VOICE_INSIGHT_TOPIC_LABELS) as VoiceInsightTopic[]).map(topic => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setNewInsight(prev => ({ ...prev, topic }))}
                    className={`p-3 text-left rounded-lg border transition-colors ${
                      newInsight.topic === topic
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                        : 'border-border hover:border-purple-300 hover:bg-muted/50'
                    }`}
                  >
                    <p className="font-medium text-sm">{VOICE_INSIGHT_TOPIC_LABELS[topic]}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {VOICE_INSIGHT_TOPIC_DESCRIPTIONS[topic]}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="insight-title">Title *</Label>
              <Input
                id="insight-title"
                value={newInsight.title}
                onChange={(e) => setNewInsight(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., What is predictive operations?"
              />
            </div>

            {/* Voice/Text tabs */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>Content *</Label>
                <div className="flex gap-1 ml-auto">
                  <Button
                    type="button"
                    variant={activeTab === 'voice' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('voice')}
                    className="gap-1"
                  >
                    <Mic className="h-3 w-3" />
                    Voice
                  </Button>
                  <Button
                    type="button"
                    variant={activeTab === 'text' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveTab('text')}
                  >
                    Text
                  </Button>
                </div>
              </div>

              {activeTab === 'voice' ? (
                <VoiceRecorder
                  brandId={brandId}
                  onTranscription={handleTranscription}
                />
              ) : (
                <Textarea
                  value={newInsight.transcript}
                  onChange={(e) => setNewInsight(prev => ({ ...prev, transcript: e.target.value }))}
                  placeholder="Type your insight here, or record using voice..."
                  rows={5}
                />
              )}
              
              {newInsight.transcript && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Content captured ({newInsight.transcript.length} characters)
                  {audioDuration && ` • ${Math.round(audioDuration)}s audio`}
                </div>
              )}
            </div>

            {/* Attribution */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Attribution (for citations)</span>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="recorded-by-name">Your Name *</Label>
                  <Input
                    id="recorded-by-name"
                    value={newInsight.recorded_by_name}
                    onChange={(e) => setNewInsight(prev => ({ ...prev, recorded_by_name: e.target.value }))}
                    placeholder="Stephen Newman"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recorded-by-title">Your Title</Label>
                  <Input
                    id="recorded-by-title"
                    value={newInsight.recorded_by_title}
                    onChange={(e) => setNewInsight(prev => ({ ...prev, recorded_by_title: e.target.value }))}
                    placeholder="CEO, Checkit"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="linkedin-url">LinkedIn Profile URL</Label>
                <Input
                  id="linkedin-url"
                  value={newInsight.recorded_by_linkedin_url}
                  onChange={(e) => setNewInsight(prev => ({ ...prev, recorded_by_linkedin_url: e.target.value }))}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
                <p className="text-xs text-muted-foreground">
                  Adds additional identity verification for credibility
                </p>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="insight-tags">Tags (optional)</Label>
              <Input
                id="insight-tags"
                value={newInsight.tags}
                onChange={(e) => setNewInsight(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="predictive operations, IoT, temperature monitoring"
              />
              <p className="text-xs text-muted-foreground">Comma-separated keywords</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={saveInsight} disabled={isSaving} className="gap-2">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Verified Insight
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
