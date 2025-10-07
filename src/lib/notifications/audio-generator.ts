/**
 * Advanced Audio Notification System
 * Generates high-quality notification sounds using Web Audio API
 */

export interface SoundConfig {
  type: 'simple' | 'chord' | 'melody' | 'percussion'
  frequencies: number[]
  duration: number
  waveType: OscillatorType
  envelope?: EnvelopeConfig
  effects?: AudioEffect[]
}

export interface EnvelopeConfig {
  attack: number
  decay: number
  sustain: number
  release: number
}

export interface AudioEffect {
  type: 'reverb' | 'delay' | 'filter' | 'distortion'
  params: any
}

export class AdvancedAudioGenerator {
  private audioContext: AudioContext | null = null
  private soundCache = new Map<string, AudioBuffer>()

  constructor() {
    this.initAudioContext()
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.warn('Failed to initialize audio context:', error)
    }
  }

  /**
   * Generate notification sounds with different characteristics
   */
  async generateNotificationSounds(): Promise<Map<string, AudioBuffer>> {
    if (!this.audioContext) {
      throw new Error('Audio context not available')
    }

    const sounds = new Map<string, AudioBuffer>()

    // Message notification - Pleasant chime
    sounds.set('message', await this.generateSound({
      type: 'chord',
      frequencies: [523.25, 659.25, 783.99], // C5, E5, G5 chord
      duration: 0.4,
      waveType: 'sine',
      envelope: {
        attack: 0.05,
        decay: 0.1,
        sustain: 0.7,
        release: 0.25
      }
    }))

    // Mention notification - More urgent, higher pitch
    sounds.set('mention', await this.generateSound({
      type: 'melody',
      frequencies: [880, 1046.5, 880], // A5, C6, A5 sequence
      duration: 0.6,
      waveType: 'sine',
      envelope: {
        attack: 0.02,
        decay: 0.05,
        sustain: 0.8,
        release: 0.2
      }
    }))

    // Join notification - Welcoming tone
    sounds.set('join', await this.generateSound({
      type: 'chord',
      frequencies: [440, 554.37, 659.25], // A4, C#5, E5 - A major chord
      duration: 0.5,
      waveType: 'triangle',
      envelope: {
        attack: 0.1,
        decay: 0.15,
        sustain: 0.6,
        release: 0.25
      }
    }))

    // Leave notification - Softer, descending
    sounds.set('leave', await this.generateSound({
      type: 'melody',
      frequencies: [659.25, 523.25, 440], // E5, C5, A4 descending
      duration: 0.5,
      waveType: 'sine',
      envelope: {
        attack: 0.05,
        decay: 0.1,
        sustain: 0.5,
        release: 0.35
      }
    }))

    // Error notification - Sharp, attention-grabbing
    sounds.set('error', await this.generateSound({
      type: 'simple',
      frequencies: [400, 350], // Dissonant interval
      duration: 0.3,
      waveType: 'sawtooth',
      envelope: {
        attack: 0.01,
        decay: 0.05,
        sustain: 0.6,
        release: 0.24
      }
    }))

    // Success notification - Uplifting
    sounds.set('success', await this.generateSound({
      type: 'melody',
      frequencies: [523.25, 659.25, 783.99, 1046.5], // C5, E5, G5, C6 arpeggio
      duration: 0.8,
      waveType: 'sine',
      envelope: {
        attack: 0.02,
        decay: 0.05,
        sustain: 0.8,
        release: 0.15
      }
    }))

    // Call notification - Attention-demanding
    sounds.set('call', await this.generateSound({
      type: 'melody',
      frequencies: [880, 1046.5, 880, 1046.5], // Alternating A5, C6
      duration: 1.2,
      waveType: 'sine',
      envelope: {
        attack: 0.05,
        decay: 0.1,
        sustain: 0.7,
        release: 0.15
      }
    }))

    this.soundCache = sounds
    return sounds
  }

  private async generateSound(config: SoundConfig): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('Audio context not available')
    }

    const sampleRate = this.audioContext.sampleRate
    const buffer = this.audioContext.createBuffer(1, sampleRate * config.duration, sampleRate)
    const data = buffer.getChannelData(0)

    switch (config.type) {
      case 'simple':
        this.generateSimpleTone(data, config, sampleRate)
        break
      case 'chord':
        this.generateChord(data, config, sampleRate)
        break
      case 'melody':
        this.generateMelody(data, config, sampleRate)
        break
      case 'percussion':
        this.generatePercussion(data, config, sampleRate)
        break
    }

    return buffer
  }

  private generateSimpleTone(data: Float32Array, config: SoundConfig, sampleRate: number) {
    const frequency = config.frequencies[0]
    
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      let sample = 0

      // Generate oscillator
      switch (config.waveType) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * frequency * t)
          break
        case 'triangle':
          sample = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t))
          break
        case 'sawtooth':
          sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5))
          break
        case 'square':
          sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1
          break
      }

      // Apply envelope
      const envelope = this.calculateEnvelope(i, data.length, config.envelope, sampleRate)
      data[i] = sample * envelope * 0.3
    }
  }

  private generateChord(data: Float32Array, config: SoundConfig, sampleRate: number) {
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      let sample = 0

      // Mix all frequencies
      for (const frequency of config.frequencies) {
        switch (config.waveType) {
          case 'sine':
            sample += Math.sin(2 * Math.PI * frequency * t)
            break
          case 'triangle':
            sample += (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t))
            break
          case 'sawtooth':
            sample += 2 * (t * frequency - Math.floor(t * frequency + 0.5))
            break
          case 'square':
            sample += Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1
            break
        }
      }

      // Normalize by number of frequencies
      sample /= config.frequencies.length

      // Apply envelope
      const envelope = this.calculateEnvelope(i, data.length, config.envelope, sampleRate)
      data[i] = sample * envelope * 0.3
    }
  }

  private generateMelody(data: Float32Array, config: SoundConfig, sampleRate: number) {
    const noteLength = data.length / config.frequencies.length
    
    for (let noteIndex = 0; noteIndex < config.frequencies.length; noteIndex++) {
      const frequency = config.frequencies[noteIndex]
      const startSample = Math.floor(noteIndex * noteLength)
      const endSample = Math.floor((noteIndex + 1) * noteLength)

      for (let i = startSample; i < endSample && i < data.length; i++) {
        const t = (i - startSample) / sampleRate
        let sample = 0

        switch (config.waveType) {
          case 'sine':
            sample = Math.sin(2 * Math.PI * frequency * t)
            break
          case 'triangle':
            sample = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * t))
            break
          case 'sawtooth':
            sample = 2 * (t * frequency - Math.floor(t * frequency + 0.5))
            break
          case 'square':
            sample = Math.sin(2 * Math.PI * frequency * t) > 0 ? 1 : -1
            break
        }

        // Apply envelope for each note
        const noteEnvelope = this.calculateEnvelope(i - startSample, endSample - startSample, config.envelope, sampleRate)
        data[i] = sample * noteEnvelope * 0.3
      }
    }
  }

  private generatePercussion(data: Float32Array, config: SoundConfig, sampleRate: number) {
    // Generate noise-based percussion sounds
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      
      // White noise
      let sample = (Math.random() * 2 - 1)
      
      // Apply frequency filtering if specified
      if (config.frequencies.length > 0) {
        const frequency = config.frequencies[0]
        sample *= Math.sin(2 * Math.PI * frequency * t)
      }

      // Apply envelope
      const envelope = this.calculateEnvelope(i, data.length, config.envelope, sampleRate)
      data[i] = sample * envelope * 0.2
    }
  }

  private calculateEnvelope(sampleIndex: number, totalSamples: number, envelope: EnvelopeConfig | undefined, sampleRate: number): number {
    if (!envelope) {
      // Default envelope
      const fadeIn = Math.min(sampleIndex / (sampleRate * 0.01), 1)
      const fadeOut = Math.min((totalSamples - sampleIndex) / (sampleRate * 0.01), 1)
      return fadeIn * fadeOut
    }

    const { attack, decay, sustain, release } = envelope
    const attackSamples = attack * sampleRate
    const decaySamples = decay * sampleRate
    const releaseSamples = release * sampleRate
    const sustainSamples = totalSamples - attackSamples - decaySamples - releaseSamples

    if (sampleIndex < attackSamples) {
      // Attack phase
      return sampleIndex / attackSamples
    } else if (sampleIndex < attackSamples + decaySamples) {
      // Decay phase
      const decayProgress = (sampleIndex - attackSamples) / decaySamples
      return 1 - (1 - sustain) * decayProgress
    } else if (sampleIndex < attackSamples + decaySamples + sustainSamples) {
      // Sustain phase
      return sustain
    } else {
      // Release phase
      const releaseProgress = (sampleIndex - attackSamples - decaySamples - sustainSamples) / releaseSamples
      return sustain * (1 - releaseProgress)
    }
  }

  async playSound(soundType: string, volume: number = 0.7): Promise<void> {
    if (!this.audioContext) return

    // Resume audio context if suspended (required for user interaction)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    const buffer = this.soundCache.get(soundType)
    if (!buffer) {
      console.warn(`Sound "${soundType}" not found`)
      return
    }

    try {
      const source = this.audioContext.createBufferSource()
      const gainNode = this.audioContext.createGain()
      
      source.buffer = buffer
      gainNode.gain.value = Math.max(0, Math.min(1, volume))
      
      source.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      
      source.start()
    } catch (error) {
      console.warn('Failed to play sound:', error)
    }
  }

  getSupportedSoundTypes(): string[] {
    return Array.from(this.soundCache.keys())
  }

  dispose() {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.soundCache.clear()
  }
}