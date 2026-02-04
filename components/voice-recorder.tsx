'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Loader2, Pause, Play } from 'lucide-react'

interface VoiceRecorderProps {
  onTranscription: (transcript: string, durationSeconds: number, audioBlob?: Blob) => void
  brandId: string
  disabled?: boolean
  maxDurationSeconds?: number
}

export function VoiceRecorder({ 
  onTranscription, 
  brandId, 
  disabled = false,
  maxDurationSeconds = 300 // 5 min default
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Auto-stop at max duration
  useEffect(() => {
    if (duration >= maxDurationSeconds && isRecording) {
      stopRecording()
    }
  }, [duration, maxDurationSeconds, isRecording])

  const startRecording = useCallback(async () => {
    setError(null)
    chunksRef.current = []
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      })
      streamRef.current = stream
      
      // Prefer webm with opus, fallback to mp4 for Safari
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm'
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }
      
      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop())
        
        // Create blob from chunks
        const audioBlob = new Blob(chunksRef.current, { type: mimeType })
        
        // Send to transcription API
        await transcribeAudio(audioBlob)
      }
      
      // Start recording with chunks every second
      mediaRecorder.start(1000)
      setIsRecording(true)
      setDuration(0)
      
      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
      
    } catch (err) {
      console.error('Failed to start recording:', err)
      setError('Microphone access denied. Please allow microphone access and try again.')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    
    setIsRecording(false)
    setIsPaused(false)
  }, [])

  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return
    
    if (isPaused) {
      mediaRecorderRef.current.resume()
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
    } else {
      mediaRecorderRef.current.pause()
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    
    setIsPaused(!isPaused)
  }, [isPaused])

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    setError(null)
    
    try {
      const formData = new FormData()
      // Convert to a file with proper extension
      const extension = audioBlob.type.includes('webm') ? 'webm' : 'mp4'
      formData.append('audio', audioBlob, `recording.${extension}`)
      
      const response = await fetch(`/api/brands/${brandId}/voice-insights/transcribe`, {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Transcription failed')
      }
      
      const data = await response.json()
      onTranscription(data.transcript, data.duration_seconds || duration, audioBlob)
      
    } catch (err) {
      console.error('Transcription error:', err)
      setError(err instanceof Error ? err.message : 'Transcription failed. Please try again.')
    } finally {
      setIsTranscribing(false)
    }
  }

  if (isTranscribing) {
    return (
      <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div>
          <p className="font-medium">Transcribing audio...</p>
          <p className="text-sm text-muted-foreground">This may take a moment</p>
        </div>
      </div>
    )
  }

  if (isRecording) {
    return (
      <div className="flex flex-col gap-3 p-4 border rounded-lg bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full bg-red-500 ${!isPaused ? 'animate-pulse' : ''}`} />
            <span className="font-medium text-red-700 dark:text-red-400">
              {isPaused ? 'Paused' : 'Recording'}
            </span>
          </div>
          <span className="font-mono text-lg font-medium text-red-700 dark:text-red-400">
            {formatDuration(duration)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePause}
            className="gap-2"
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={stopRecording}
            className="gap-2"
          >
            <Square className="h-4 w-4" />
            Stop & Transcribe
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Max duration: {formatDuration(maxDurationSeconds)}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        onClick={startRecording}
        disabled={disabled}
        className="gap-2 w-full justify-center py-6 border-dashed"
      >
        <Mic className="h-5 w-5" />
        <span>Record Voice Insight</span>
      </Button>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      <p className="text-xs text-muted-foreground text-center">
        Click to record, speak your insight, then stop to transcribe. Your voice recording adds credibility to the content.
      </p>
    </div>
  )
}
