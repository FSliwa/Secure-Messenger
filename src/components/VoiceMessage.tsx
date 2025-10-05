import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Microphone, 
  Stop, 
  Play, 
  Pause, 
  Trash,
  PaperPlaneRight,
  Lock
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface VoiceMessageProps {
  onSendVoiceMessage: (audioBlob: Blob, duration: number) => void
  isRecording?: boolean
  disabled?: boolean
}

export function VoiceMessage({ onSendVoiceMessage, isRecording = false, disabled = false }: VoiceMessageProps) {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (audioURL) URL.revokeObjectURL(audioURL)
    }
  }, [audioURL])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true 
        } 
      })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      mediaRecorderRef.current = mediaRecorder

      const chunks: Blob[] = []
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' })
        setAudioBlob(blob)
        setDuration(recordingTime)
        
        const url = URL.createObjectURL(blob)
        setAudioURL(url)
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorder.start(100) // Record in 100ms chunks
      setRecording(true)
      setRecordingTime(0)
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      toast.success('Recording started - speak clearly')

    } catch (error) {
      console.error('Error starting recording:', error)
      toast.error('Could not access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
      
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      
      toast.success('Recording completed!')
    }
  }

  const playAudio = () => {
    if (audioURL && !playing) {
      const audio = new Audio(audioURL)
      audioRef.current = audio
      
      audio.onended = () => {
        setPlaying(false)
        audioRef.current = null
      }
      
      audio.play()
      setPlaying(true)
    } else if (audioRef.current && playing) {
      audioRef.current.pause()
      audioRef.current = null
      setPlaying(false)
    }
  }

  const deleteRecording = () => {
    setAudioBlob(null)
    setDuration(0)
    setPlaying(false)
    
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    
    if (audioURL) {
      URL.revokeObjectURL(audioURL)
      setAudioURL(null)
    }
    
    toast.success('Recording deleted')
  }

  const sendVoiceMessage = () => {
    if (audioBlob) {
      onSendVoiceMessage(audioBlob, duration)
      deleteRecording()
      toast.success('Voice message sent!')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getRecordingProgress = () => {
    const maxDuration = 300 // 5 minutes max
    return Math.min((recordingTime / maxDuration) * 100, 100)
  }

  if (recording) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Button
                size="lg"
                variant="destructive"
                className="rounded-full w-12 h-12 animate-pulse"
                onClick={stopRecording}
              >
                <Stop className="w-5 h-5" />
              </Button>
              <div className="absolute -inset-1 bg-destructive/20 rounded-full animate-ping"></div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Recording...</span>
                <span className="text-sm text-muted-foreground">
                  {formatTime(recordingTime)} / 5:00
                </span>
              </div>
              <Progress value={getRecordingProgress()} className="h-2" />
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" />
              <span>Encrypted</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (audioBlob) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Button
              size="lg"
              variant="outline"
              className="rounded-full w-12 h-12"
              onClick={playAudio}
            >
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">Voice Message</span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(duration)}
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/20 animate-pulse"></div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={deleteRecording}
              >
                <Trash className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={sendVoiceMessage}
                disabled={disabled}
              >
                <PaperPlaneRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Button
      size="lg"
      variant="outline"
      className="rounded-full w-12 h-12"
      onClick={startRecording}
      disabled={disabled || isRecording}
    >
      <Microphone className="w-5 h-5" />
    </Button>
  )
}