/**
 * Voice Recording Fix
 * Fixes common issues with voice recording in the application
 */

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private isRecording = false

  async startRecording(): Promise<void> {
    try {
      // Request microphone permission
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      })

      // Create media recorder with proper MIME type
      const mimeType = this.getSupportedMimeType()
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType })
      
      this.audioChunks = []
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start(100) // Collect data every 100ms
      this.isRecording = true
    } catch (error) {
      console.error('Failed to start recording:', error)
      throw new Error('Microphone access denied or not available')
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('No recording in progress'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.getSupportedMimeType()
        const audioBlob = new Blob(this.audioChunks, { type: mimeType })
        
        // Clean up
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop())
          this.stream = null
        }
        
        this.isRecording = false
        resolve(audioBlob)
      }

      this.mediaRecorder.stop()
    })
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg'
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    return 'audio/webm' // Default fallback
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording
  }
}

// Export singleton instance
export const voiceRecorder = new VoiceRecorder()
