import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Microphone, 
  MicrophoneSlash,
  Stop,
  Trash,
  PaperPlaneTilt,
  Play,
  Pause
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { VoiceRecorder as VoiceRecorderLib, VoicePlayer, VoiceUtils, VoiceRecording } from '@/lib/voice-recorder';
import { useLanguage } from '@/contexts/LanguageContext';

interface VoiceRecorderProps {
  onVoiceMessage: (recording: VoiceRecording) => void;
  onCancel?: () => void;
  maxDuration?: number;
  className?: string;
  disabled?: boolean;
}

export function VoiceRecorder({ 
  onVoiceMessage, 
  onCancel, 
  maxDuration = 300, 
  className, 
  disabled = false 
}: VoiceRecorderProps) {
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [recording, setRecording] = useState<VoiceRecording | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<VoiceRecorderLib | null>(null);
  const playerRef = useRef<VoicePlayer | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Check if voice recording is supported
    if (!VoiceRecorderLib.isSupported()) {
      setError(t.voiceRecordingNotSupported);
      return;
    }

    // Initialize recorder
    recorderRef.current = new VoiceRecorderLib({
      maxDuration,
      sampleRate: 44100,
      channels: 1
    });

    // Initialize player
    playerRef.current = new VoicePlayer();

    const recorder = recorderRef.current;
    const player = playerRef.current;

    // Set up recorder event handlers
    recorder.onComplete((voiceRecording) => {
      setRecording(voiceRecording);
      setIsRecording(false);
      setIsPaused(false);
      clearIntervals();
      toast.success(t.voiceMessageRecorded);
    });

    recorder.onErrorOccurred((error) => {
      setError(error.message);
      setIsRecording(false);
      setIsPaused(false);
      clearIntervals();
      toast.error(t.recordingFailed);
    });

    // Set up player event handlers
    player.onStart(() => {
      setIsPlaying(true);
    });

    player.onEnd(() => {
      setIsPlaying(false);
    });

    player.onError((error) => {
      setError(error.message);
      setIsPlaying(false);
      toast.error(t.playbackFailed);
    });

    return () => {
      clearIntervals();
      if (recorderRef.current) {
        recorderRef.current.stopRecording();
      }
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, [maxDuration, t]);

  useEffect(() => {
    // Check microphone permissions on mount
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    if (!recorderRef.current) return;

    try {
      const hasPermission = await recorderRef.current.requestPermissions();
      setHasPermission(hasPermission);
      
      if (!hasPermission) {
        setError(t.microphonePermissionDenied);
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      setHasPermission(false);
      setError(t.microphonePermissionDenied);
    }
  };

  const startRecording = async () => {
    if (!recorderRef.current || !hasPermission) {
      await checkPermissions();
      return;
    }

    try {
      setError(null);
      setRecording(null);
      
      await recorderRef.current.startRecording();
      setIsRecording(true);
      setIsPaused(false);
      
      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        if (recorderRef.current) {
          setDuration(recorderRef.current.getCurrentDuration());
        }
      }, 100);

      // Start audio level monitoring
      audioLevelIntervalRef.current = setInterval(() => {
        if (recorderRef.current) {
          setAudioLevel(recorderRef.current.getCurrentAudioLevel());
        }
      }, 50);

      toast.success(t.recordingStarted);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError(t.recordingFailed);
      toast.error(t.recordingFailed);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stopRecording();
    }
  };

  const pauseRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.pauseRecording();
      setIsPaused(true);
      clearIntervals();
    }
  };

  const resumeRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.resumeRecording();
      setIsPaused(false);
      
      // Restart intervals
      durationIntervalRef.current = setInterval(() => {
        if (recorderRef.current) {
          setDuration(recorderRef.current.getCurrentDuration());
        }
      }, 100);

      audioLevelIntervalRef.current = setInterval(() => {
        if (recorderRef.current) {
          setAudioLevel(recorderRef.current.getCurrentAudioLevel());
        }
      }, 50);
    }
  };

  const playRecording = async () => {
    if (!recording || !playerRef.current) return;

    try {
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        await playerRef.current.playVoiceMessage(recording.blob);
      }
    } catch (error) {
      console.error('Playback failed:', error);
      toast.error(t.playbackFailed);
    }
  };

  const deleteRecording = () => {
    setRecording(null);
    setDuration(0);
    setAudioLevel(0);
    if (playerRef.current) {
      playerRef.current.stop();
    }
  };

  const sendRecording = () => {
    if (recording) {
      onVoiceMessage(recording);
      setRecording(null);
      setDuration(0);
      setAudioLevel(0);
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    deleteRecording();
    onCancel?.();
  };

  const clearIntervals = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (audioLevelIntervalRef.current) {
      clearInterval(audioLevelIntervalRef.current);
      audioLevelIntervalRef.current = null;
    }
  };

  // Draw audio level visualization
  useEffect(() => {
    drawAudioLevel();
  }, [audioLevel, isRecording]);

  const drawAudioLevel = () => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!isRecording || audioLevel === 0) {
      // Draw inactive state
      ctx.fillStyle = 'rgba(156, 163, 175, 0.3)';
      ctx.fillRect(0, height / 2 - 1, width, 2);
      return;
    }

    // Draw audio level bars
    const barCount = 20;
    const barWidth = width / barCount;
    const normalizedLevel = audioLevel / 100;

    for (let i = 0; i < barCount; i++) {
      const barHeight = Math.random() * normalizedLevel * height * 0.8;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;

      // Color based on audio level
      let color = 'rgba(34, 197, 94, 0.7)'; // Green for normal levels
      if (normalizedLevel > 0.7) {
        color = 'rgba(239, 68, 68, 0.7)'; // Red for high levels
      } else if (normalizedLevel > 0.5) {
        color = 'rgba(245, 158, 11, 0.7)'; // Yellow for medium levels
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, y, Math.max(barWidth - 1, 2), Math.max(barHeight, 2));
    }
  };

  if (error && !hasPermission) {
    return (
      <div className={`voice-recorder error ${className || ''}`}>
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <MicrophoneSlash className="w-6 h-6 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive mb-1">
              {t.microphoneAccessRequired}
            </p>
            <p className="text-xs text-destructive/80">
              {error}
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={checkPermissions}
              className="mt-2"
            >
              {t.requestPermission}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-recorder ${className || ''}`}>
      {/* Recording Interface */}
      {!recording ? (
        <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
          {/* Recording Button */}
          <Button
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={disabled || !hasPermission}
            className={`
              w-12 h-12 rounded-full p-0 flex-shrink-0 transition-all duration-200
              ${isRecording ? 'animate-pulse' : ''}
            `}
          >
            {isRecording ? (
              <Stop className="w-6 h-6" weight="fill" />
            ) : (
              <Microphone className="w-6 h-6" weight="fill" />
            )}
          </Button>

          {/* Recording Status */}
          <div className="flex-1 min-w-0">
            {isRecording ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {isPaused ? t.recordingPaused : t.recording}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {VoiceUtils.formatDuration(duration)} / {VoiceUtils.formatDuration(maxDuration)}
                  </span>
                </div>
                
                {/* Audio Level Visualization */}
                <div className="relative">
                  <canvas
                    ref={waveformCanvasRef}
                    width={200}
                    height={24}
                    className="w-full h-6 rounded"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  {t.tapToStartRecording}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {t.maxDuration}: {VoiceUtils.formatDuration(maxDuration)}
                </p>
              </div>
            )}
          </div>

          {/* Recording Controls */}
          {isRecording && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={isPaused ? resumeRecording : pauseRecording}
                className="w-10 h-10 p-0"
              >
                {isPaused ? (
                  <Play className="w-4 h-4" />
                ) : (
                  <Pause className="w-4 h-4" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelRecording}
                className="w-10 h-10 p-0 text-destructive hover:text-destructive"
              >
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Recording Preview */
        <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
          {/* Play Button */}
          <Button
            variant="default"
            size="lg"
            onClick={playRecording}
            className="w-12 h-12 rounded-full p-0 flex-shrink-0"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" weight="fill" />
            ) : (
              <Play className="w-6 h-6" weight="fill" />
            )}
          </Button>

          {/* Recording Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-foreground">
                {t.voiceMessage}
              </span>
              <span className="text-xs text-muted-foreground">
                {VoiceUtils.formatFileSize(recording.size)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-1">
                <div 
                  className="bg-primary h-1 rounded-full transition-all duration-300"
                  style={{ width: isPlaying ? '100%' : '0%' }}
                />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {VoiceUtils.formatDuration(recording.duration)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={deleteRecording}
              className="w-10 h-10 p-0 text-destructive hover:text-destructive"
            >
              <Trash className="w-4 h-4" />
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={sendRecording}
              className="w-10 h-10 p-0"
            >
              <PaperPlaneTilt className="w-4 h-4" weight="fill" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}