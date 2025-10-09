/**
 * Voice Recording and Playback Utilities
 * Provides secure voice message recording with encryption support
 */

export interface VoiceRecordingOptions {
  maxDuration?: number; // Maximum duration in seconds (default: 300 = 5 minutes)
  sampleRate?: number; // Sample rate in Hz (default: 44100)
  channels?: number; // Number of channels (default: 1 = mono)
  bitDepth?: number; // Bit depth (default: 16)
}

export interface VoiceRecording {
  blob: Blob;
  duration: number;
  size: number;
  waveform?: number[]; // Waveform data for visualization
  timestamp: number;
}

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private recordingStartTime: number = 0;
  private options: Required<VoiceRecordingOptions>;
  private onDataAvailable?: (chunk: Blob) => void;
  private onRecordingComplete?: (recording: VoiceRecording) => void;
  private onError?: (error: Error) => void;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private autoStopTimeout: NodeJS.Timeout | null = null;
  private waveformData: number[] = [];

  constructor(options: VoiceRecordingOptions = {}) {
    this.options = {
      maxDuration: options.maxDuration || 300, // 5 minutes
      sampleRate: options.sampleRate || 44100,
      channels: options.channels || 1,
      bitDepth: options.bitDepth || 16
    };
  }

  /**
   * Check if voice recording is supported in the current browser
   */
  static isSupported(): boolean {
    try {
      return !!(
        navigator.mediaDevices &&
        'getUserMedia' in navigator.mediaDevices &&
        'MediaRecorder' in window &&
        ('AudioContext' in window || 'webkitAudioContext' in window)
      );
    } catch {
      return false;
    }
  }

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: this.options.sampleRate,
          channelCount: this.options.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Test successful, stop the stream
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  /**
   * Start voice recording
   */
  async startRecording(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      throw new Error('Recording already in progress');
    }

    try {
      // Get microphone stream
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.options.sampleRate,
          channelCount: this.options.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Set up audio context for waveform analysis
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.source = this.audioContext.createMediaStreamSource(this.audioStream);
      this.source.connect(this.analyser);
      
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // Set up MediaRecorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.audioStream, {
        mimeType,
        audioBitsPerSecond: this.options.sampleRate * this.options.bitDepth * this.options.channels
      });

      this.audioChunks = [];
      this.recordingStartTime = Date.now();

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.onDataAvailable?.(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        await this.handleRecordingStop();
      };

      this.mediaRecorder.onerror = (event) => {
        const error = new Error(`Recording error: ${event}`);
        this.onError?.(error);
        console.error('MediaRecorder error:', error);
      };

      // Start recording
      this.mediaRecorder.start(100); // Collect data every 100ms

      // Set up automatic stop after max duration with cleanup
      this.autoStopTimeout = setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.stopRecording();
        }
      }, this.options.maxDuration * 1000);

      // Start waveform data collection
      this.collectWaveformData();

    } catch (error) {
      const recordingError = new Error(`Failed to start recording: ${error}`);
      this.onError?.(recordingError);
      throw recordingError;
    }
  }

  /**
   * Stop voice recording
   */
  stopRecording(): void {
    // Clear auto-stop timeout
    if (this.autoStopTimeout) {
      clearTimeout(this.autoStopTimeout);
      this.autoStopTimeout = null;
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }

    // Disconnect source to prevent memory leak
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Pause recording (if supported)
   */
  pauseRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  /**
   * Resume recording (if supported)
   */
  resumeRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  /**
   * Get current recording state
   */
  getRecordingState(): string {
    return this.mediaRecorder?.state || 'inactive';
  }

  /**
   * Get current recording duration in seconds
   */
  getCurrentDuration(): number {
    if (this.recordingStartTime === 0) return 0;
    return (Date.now() - this.recordingStartTime) / 1000;
  }

  /**
   * Get current audio level (0-100)
   */
  getCurrentAudioLevel(): number {
    if (!this.analyser) return 0;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;
    return Math.round((average / 255) * 100);
  }

  /**
   * Set event handlers
   */
  onData(callback: (chunk: Blob) => void): void {
    this.onDataAvailable = callback;
  }

  onComplete(callback: (recording: VoiceRecording) => void): void {
    this.onRecordingComplete = callback;
  }

  onErrorOccurred(callback: (error: Error) => void): void {
    this.onError = callback;
  }

  /**
   * Handle recording stop and process the final recording
   */
  private async handleRecordingStop(): Promise<void> {
    try {
      const duration = this.getCurrentDuration();
      const blob = new Blob(this.audioChunks, { 
        type: this.getSupportedMimeType() 
      });

      const recording: VoiceRecording = {
        blob,
        duration,
        size: blob.size,
        waveform: this.waveformData,
        timestamp: Date.now()
      };

      this.onRecordingComplete?.(recording);
    } catch (error) {
      const processingError = new Error(`Failed to process recording: ${error}`);
      this.onError?.(processingError);
      console.error('Recording processing error:', processingError);
    }
  }

  /**
   * Collect waveform data for visualization
   * Limits to max 1000 data points to prevent memory issues
   */
  private collectWaveformData(): void {
    if (!this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const MAX_WAVEFORM_POINTS = 1000;

    const collectData = () => {
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.analyser!.getByteTimeDomainData(dataArray);
        
        // Sample every 10th data point to reduce size
        // Only collect if we haven't reached max points
        if (this.waveformData.length < MAX_WAVEFORM_POINTS) {
          for (let i = 0; i < bufferLength; i += 10) {
            if (this.waveformData.length >= MAX_WAVEFORM_POINTS) break;
            this.waveformData.push(dataArray[i]);
          }
        }

        requestAnimationFrame(collectData);
      }
    };

    collectData();
  }

  /**
   * Get supported MIME type for recording
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Fallback
  }
}

/**
 * Voice Playback Manager
 */
export class VoicePlayer {
  private audio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private onPlaybackStart?: () => void;
  private onPlaybackEnd?: () => void;
  private onPlaybackError?: (error: Error) => void;
  private onTimeUpdate?: (currentTime: number, duration: number) => void;

  constructor() {
    // Initialize with user gesture when needed
  }

  /**
   * Play voice message from blob
   */
  async playVoiceMessage(blob: Blob): Promise<void> {
    try {
      // Stop any current playback
      this.stop();

      // Create audio element
      this.audio = new Audio();
      this.audio.src = URL.createObjectURL(blob);
      this.audio.preload = 'auto';

      // Set up audio context for visualization
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      // Resume audio context if suspended (required by browser policies)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      
      // Only create source if it doesn't exist (prevents "already created" error)
      if (!this.source) {
        this.source = this.audioContext.createMediaElementSource(this.audio);
      }
      
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // Set up event handlers
      this.audio.onplay = () => {
        this.onPlaybackStart?.();
      };

      this.audio.onended = () => {
        this.cleanup();
        this.onPlaybackEnd?.();
      };

      this.audio.onerror = (error) => {
        const playbackError = new Error(`Playback error: ${error}`);
        this.onPlaybackError?.(playbackError);
        console.error('Audio playback error:', playbackError);
      };

      this.audio.ontimeupdate = () => {
        if (this.audio) {
          this.onTimeUpdate?.(this.audio.currentTime, this.audio.duration || 0);
        }
      };

      // Start playback
      await this.audio.play();

    } catch (error) {
      const playError = new Error(`Failed to play voice message: ${error}`);
      this.onPlaybackError?.(playError);
      throw playError;
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
  }

  /**
   * Resume playback
   */
  resume(): void {
    if (this.audio && this.audio.paused) {
      this.audio.play().catch(error => {
        const resumeError = new Error(`Failed to resume playback: ${error}`);
        this.onPlaybackError?.(resumeError);
        console.error('Resume playback error:', resumeError);
      });
    }
  }

  /**
   * Stop playback
   */
  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.cleanup();
    }
  }

  /**
   * Seek to specific time
   */
  seekTo(time: number): void {
    if (this.audio) {
      this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration || 0));
    }
  }

  /**
   * Get current playback time
   */
  getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  /**
   * Get total duration
   */
  getDuration(): number {
    return this.audio?.duration || 0;
  }

  /**
   * Check if currently playing
   */
  isPlaying(): boolean {
    return this.audio ? !this.audio.paused : false;
  }

  /**
   * Get current audio level for visualization
   */
  getCurrentAudioLevel(): number {
    if (!this.analyser) return 0;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;
    return Math.round((average / 255) * 100);
  }

  /**
   * Set event handlers
   */
  onStart(callback: () => void): void {
    this.onPlaybackStart = callback;
  }

  onEnd(callback: () => void): void {
    this.onPlaybackEnd = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onPlaybackError = callback;
  }

  onProgress(callback: (currentTime: number, duration: number) => void): void {
    this.onTimeUpdate = callback;
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.audio) {
      if (this.audio.src) {
        URL.revokeObjectURL(this.audio.src);
      }
      this.audio = null;
    }

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * Utility functions for voice messages
 */
export const VoiceUtils = {
  /**
   * Format duration in MM:SS format
   */
  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  /**
   * Get file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  },

  /**
   * Validate voice message blob
   */
  isValidVoiceMessage(blob: Blob): boolean {
    return blob && blob.size > 0 && blob.type.startsWith('audio/');
  },

  /**
   * Convert blob to base64 for storage/transmission
   */
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data URL prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  /**
   * Convert base64 to blob for playback
   */
  base64ToBlob(base64: string, mimeType: string = 'audio/webm'): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
};