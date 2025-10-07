import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  Download, 
  Waveform,
  SpeakerHigh,
  SpeakerX
} from '@phosphor-icons/react';
import { VoicePlayer, VoiceUtils } from '@/lib/voice-recorder';
import { useLanguage } from '@/contexts/LanguageContext';
import { decryptMessage } from '@/lib/crypto';

interface VoiceMessageProps {
  voiceData: {
    encrypted_content: string; // This is actually a serialized EncryptedMessage
    duration: number;
    size: number;
    waveform?: number[];
    timestamp: number;
    mime_type?: string;
  };
  isOwn: boolean;
  conversationKey: string; // This should be a KeyPair JSON string or conversation password
  className?: string;
}

export function VoiceMessage({ voiceData, isOwn, conversationKey, className }: VoiceMessageProps) {
  const { t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  const playerRef = useRef<VoicePlayer | null>(null);
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Initialize voice player
    playerRef.current = new VoicePlayer();
    
    const player = playerRef.current;
    
    player.onStart(() => {
      setIsPlaying(true);
      setError(null);
    });
    
    player.onEnd(() => {
      setIsPlaying(false);
      setCurrentTime(0);
      setPlaybackProgress(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    });
    
    player.onError((error) => {
      setError(error.message);
      setIsPlaying(false);
      console.error('Voice playback error:', error);
    });
    
    player.onProgress((current, duration) => {
      setCurrentTime(current);
      if (duration > 0) {
        setPlaybackProgress((current / duration) * 100);
      }
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      player.dispose();
    };
  }, []);

  useEffect(() => {
    // Decrypt and prepare audio blob when component mounts
    decryptAudioData();
  }, [voiceData.encrypted_content, conversationKey]);

  useEffect(() => {
    // Draw waveform when audio data or playing state changes
    drawWaveform();
  }, [audioBlob, isPlaying, playbackProgress, voiceData.waveform]);

  const decryptAudioData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // For now, we'll implement a simplified decryption
      // In a real app, this would use proper key derivation from conversationKey
      let decryptedBase64: string;
      
      try {
        // Try to parse as JSON first
        const encryptedMessage = JSON.parse(voiceData.encrypted_content);
        
        // Simple base64 decoding for demo purposes
        // In production, this would use proper WebCrypto decryption
        if (encryptedMessage.data) {
          decryptedBase64 = encryptedMessage.data;
        } else {
          decryptedBase64 = voiceData.encrypted_content;
        }
      } catch {
        // If not JSON, treat as base64 encoded audio data
        decryptedBase64 = voiceData.encrypted_content;
      }
      
      // Convert base64 to blob
      const mimeType = voiceData.mime_type || 'audio/webm';
      const blob = VoiceUtils.base64ToBlob(decryptedBase64, mimeType);
      
      if (!VoiceUtils.isValidVoiceMessage(blob)) {
        throw new Error('Invalid voice message format');
      }

      setAudioBlob(blob);
    } catch (error) {
      console.error('Failed to decrypt voice message:', error);
      setError(t.failedToLoadVoiceMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = async () => {
    if (!audioBlob || !playerRef.current) {
      return;
    }

    try {
      if (isPlaying) {
        playerRef.current.pause();
        setIsPlaying(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      } else {
        await playerRef.current.playVoiceMessage(audioBlob);
        startWaveformAnimation();
      }
    } catch (error) {
      console.error('Playback error:', error);
      setError(t.playbackFailed);
    }
  };

  const handleSeek = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!playerRef.current || !audioBlob) return;

    const canvas = waveformRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const canvasWidth = rect.width;
    const seekPercent = clickX / canvasWidth;
    const duration = playerRef.current.getDuration();
    
    if (duration > 0) {
      const seekTime = seekPercent * duration;
      playerRef.current.seekTo(seekTime);
    }
  };

  const handleDownload = () => {
    if (!audioBlob) return;

    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voice-message-${new Date(voiceData.timestamp).toISOString()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleMute = () => {
    if (playerRef.current) {
      // Note: HTML5 Audio doesn't have direct mute, so we'd need to implement volume control
      setIsMuted(!isMuted);
    }
  };

  const startWaveformAnimation = () => {
    const animate = () => {
      drawWaveform();
      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    animate();
  };

  const drawWaveform = () => {
    const canvas = waveformRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const waveform = voiceData.waveform || [];
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (waveform.length === 0) {
      // Draw placeholder waveform
      drawPlaceholderWaveform(ctx, width, height);
      return;
    }

    // Draw waveform
    const barWidth = width / waveform.length;
    const maxAmplitude = Math.max(...waveform);

    waveform.forEach((amplitude, index) => {
      const normalizedAmplitude = amplitude / (maxAmplitude || 1);
      const barHeight = (normalizedAmplitude * height * 0.8);
      const x = index * barWidth;
      const y = (height - barHeight) / 2;

      // Determine color based on playback progress
      const progressPercent = playbackProgress / 100;
      const isPlayed = (index / waveform.length) <= progressPercent;
      
      ctx.fillStyle = isPlayed 
        ? (isOwn ? '#ffffff' : '#1877f2') 
        : (isOwn ? 'rgba(255,255,255,0.5)' : 'rgba(24,119,242,0.3)');
      
      ctx.fillRect(x, y, Math.max(barWidth - 1, 2), Math.max(barHeight, 2));
    });

    // Draw progress indicator
    if (isPlaying) {
      const progressX = (playbackProgress / 100) * width;
      ctx.strokeStyle = isOwn ? '#ffffff' : '#1877f2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
    }
  };

  const drawPlaceholderWaveform = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Draw a simple placeholder waveform
    const bars = 30;
    const barWidth = width / bars;
    
    ctx.fillStyle = isOwn ? 'rgba(255,255,255,0.3)' : 'rgba(24,119,242,0.3)';
    
    for (let i = 0; i < bars; i++) {
      const barHeight = Math.random() * height * 0.6 + height * 0.1;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      
      ctx.fillRect(x, y, Math.max(barWidth - 1, 2), barHeight);
    }
  };

  if (error) {
    return (
      <div className={`voice-message error ${className || ''}`}>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10">
          <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
            <SpeakerX className="w-4 h-4 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-message ${isOwn ? 'own' : 'other'} ${className || ''}`}>
      <div className={`
        flex items-center gap-3 p-3 rounded-lg min-w-[280px]
        ${isOwn 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-muted text-muted-foreground'
        }
      `}>
        {/* Play/Pause Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePlayPause}
          disabled={isLoading || !audioBlob}
          className={`
            w-10 h-10 rounded-full p-0 flex-shrink-0
            ${isOwn 
              ? 'hover:bg-primary-foreground/20 text-primary-foreground' 
              : 'hover:bg-muted-foreground/20 text-muted-foreground'
            }
          `}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5" weight="fill" />
          ) : (
            <Play className="w-5 h-5" weight="fill" />
          )}
        </Button>

        {/* Waveform and Duration */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <canvas
              ref={waveformRef}
              width={200}
              height={32}
              className="w-full h-8 cursor-pointer rounded"
              onClick={handleSeek}
              style={{ maxWidth: '200px' }}
            />
          </div>
          
          <div className="flex justify-between items-center mt-1">
            <span className={`text-xs ${isOwn ? 'text-primary-foreground/80' : 'text-muted-foreground/80'}`}>
              {VoiceUtils.formatDuration(currentTime)} / {VoiceUtils.formatDuration(voiceData.duration)}
            </span>
            <span className={`text-xs ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground/60'}`}>
              {VoiceUtils.formatFileSize(voiceData.size)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className={`
              w-8 h-8 p-0
              ${isOwn 
                ? 'hover:bg-primary-foreground/20 text-primary-foreground/80' 
                : 'hover:bg-muted-foreground/20 text-muted-foreground/80'
              }
            `}
          >
            {isMuted ? (
              <SpeakerX className="w-4 h-4" />
            ) : (
              <SpeakerHigh className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            disabled={!audioBlob}
            className={`
              w-8 h-8 p-0
              ${isOwn 
                ? 'hover:bg-primary-foreground/20 text-primary-foreground/80' 
                : 'hover:bg-muted-foreground/20 text-muted-foreground/80'
              }
            `}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Timestamp */}
      <div className={`text-xs mt-1 ${isOwn ? 'text-right' : 'text-left'}`}>
        <span className="text-muted-foreground/60">
          {new Date(voiceData.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
    </div>
  );
}