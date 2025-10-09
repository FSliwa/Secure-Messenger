/**
 * Notification Sound System - WhatsApp Style
 * Plays different sounds for different notification types
 */

type SoundType = 'message' | 'mention' | 'sent' | 'error'

class NotificationSoundManager {
  private audioContext: AudioContext | null = null
  private sounds: Map<SoundType, string> = new Map()
  private volume: number = 0.5

  constructor() {
    // Map sound types to data URLs (base64 encoded short beeps)
    // In production, use actual sound files from /public/sounds/
    this.sounds.set('message', '/sounds/message.mp3')
    this.sounds.set('mention', '/sounds/mention.mp3')
    this.sounds.set('sent', '/sounds/sent.mp3')
    this.sounds.set('error', '/sounds/error.mp3')
  }

  /**
   * Initialize Audio Context (requires user gesture)
   */
  async initialize() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    // Resume if suspended (browser policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  /**
   * Play notification sound
   */
  async play(type: SoundType = 'message') {
    try {
      await this.initialize()

      // Create audio element
      const audio = new Audio(this.sounds.get(type))
      audio.volume = this.volume

      // Play
      await audio.play()

    } catch (error) {
      // Fail silently - sounds are not critical
      console.warn('Failed to play notification sound:', error)
    }
  }

  /**
   * Play message received sound (WhatsApp style)
   */
  async playMessageReceived() {
    await this.play('message')
  }

  /**
   * Play mention sound (higher priority)
   */
  async playMention() {
    await this.play('mention')
  }

  /**
   * Play message sent sound (subtle)
   */
  async playMessageSent() {
    await this.play('sent')
  }

  /**
   * Play error sound
   */
  async playError() {
    await this.play('error')
  }

  /**
   * Set volume (0.0 - 1.0)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume
  }

  /**
   * Check if sounds are supported
   */
  isSupported(): boolean {
    return 'Audio' in window && ('AudioContext' in window || 'webkitAudioContext' in window)
  }
}

// Singleton instance
export const notificationSound = new NotificationSoundManager()

// Initialize on first user interaction
if (typeof window !== 'undefined') {
  const initOnInteraction = () => {
    notificationSound.initialize().catch(() => {})
    // Remove listeners after first interaction
    window.removeEventListener('click', initOnInteraction)
    window.removeEventListener('keydown', initOnInteraction)
    window.removeEventListener('touchstart', initOnInteraction)
  }

  window.addEventListener('click', initOnInteraction, { once: true })
  window.addEventListener('keydown', initOnInteraction, { once: true })
  window.addEventListener('touchstart', initOnInteraction, { once: true })
}

