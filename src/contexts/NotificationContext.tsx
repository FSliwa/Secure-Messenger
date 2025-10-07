import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { useLanguage } from './LanguageContext'

interface NotificationSettings {
  soundEnabled: boolean
  desktopEnabled: boolean
  vibrationEnabled: boolean
  volume: number
}

interface NotificationContextType {
  settings: NotificationSettings
  updateSettings: (newSettings: Partial<NotificationSettings>) => void
  playNotificationSound: (type?: 'message' | 'mention' | 'join' | 'error') => void
  showNotification: (title: string, body: string, options?: NotificationOptions) => void
  requestPermission: () => Promise<boolean>
  isSupported: boolean
}

const defaultSettings: NotificationSettings = {
  soundEnabled: true,
  desktopEnabled: true,
  vibrationEnabled: true,
  volume: 0.7
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage()
  const [storedSettings, setStoredSettings] = useKV<NotificationSettings>('notification-settings', defaultSettings)
  const [settings, setSettings] = useState<NotificationSettings>(storedSettings || defaultSettings)
  const audioContextRef = useRef<AudioContext | null>(null)
  const soundBuffersRef = useRef<Map<string, AudioBuffer>>(new Map())

  // Sync with stored settings
  useEffect(() => {
    if (storedSettings) {
      setSettings(storedSettings)
    }
  }, [storedSettings])

  // Initialize audio context and load sounds
  useEffect(() => {
    if (!settings.soundEnabled) return

    const initAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        await loadNotificationSounds()
      } catch (error) {
        console.warn('Failed to initialize audio context:', error)
      }
    }

    initAudio()

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [settings.soundEnabled])

  const loadNotificationSounds = async () => {
    const sounds = {
      message: generateTone(800, 0.1, 'sine'),
      mention: generateTone([800, 1000], 0.2, 'sine'),
      join: generateTone(600, 0.15, 'triangle'),
      error: generateTone(400, 0.3, 'sawtooth')
    }

    for (const [name, buffer] of Object.entries(sounds)) {
      soundBuffersRef.current.set(name, buffer)
    }
  }

  const generateTone = (frequency: number | number[], duration: number, waveType: OscillatorType): AudioBuffer => {
    if (!audioContextRef.current) throw new Error('No audio context')

    const sampleRate = audioContextRef.current.sampleRate
    const buffer = audioContextRef.current.createBuffer(1, sampleRate * duration, sampleRate)
    const data = buffer.getChannelData(0)

    const frequencies = Array.isArray(frequency) ? frequency : [frequency]

    for (let i = 0; i < data.length; i++) {
      let sample = 0
      for (const freq of frequencies) {
        const t = i / sampleRate
        sample += Math.sin(2 * Math.PI * freq * t) / frequencies.length
      }
      
      // Apply envelope (fade in/out)
      const envelope = Math.min(i / (sampleRate * 0.01), 1) * 
                      Math.min((data.length - i) / (sampleRate * 0.01), 1)
      data[i] = sample * envelope * 0.3 // Reduce volume
    }

    return buffer
  }

  const playNotificationSound = (type: 'message' | 'mention' | 'join' | 'error' = 'message') => {
    if (!settings.soundEnabled || !audioContextRef.current) return

    try {
      const buffer = soundBuffersRef.current.get(type)
      if (!buffer) return

      const source = audioContextRef.current.createBufferSource()
      const gainNode = audioContextRef.current.createGain()
      
      source.buffer = buffer
      gainNode.gain.value = settings.volume
      
      source.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)
      
      source.start()
    } catch (error) {
      console.warn('Failed to play notification sound:', error)
    }
  }

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported in this browser')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      toast.error('Notifications are blocked. Please enable them in your browser settings.')
      return false
    }

    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }

  const showNotification = (title: string, body: string, options: NotificationOptions = {}) => {
    if (!settings.desktopEnabled) return

    // Check if we have permission
    if (Notification.permission !== 'granted') {
      // Show toast as fallback
      toast.info(title, { description: body })
      return
    }

    // Check if tab is visible (don't show notifications for active tab)
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      return
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'securechat-message',
        requireInteraction: false,
        silent: !settings.soundEnabled,
        ...options
      })

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close()
      }, 5000)

      // Handle click to focus window
      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      // Vibrate if supported and enabled
      if (settings.vibrationEnabled && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }
    } catch (error) {
      console.warn('Failed to show notification:', error)
      // Fallback to toast
      toast.info(title, { description: body })
    }
  }

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)
    setStoredSettings(updatedSettings)
  }

  const isSupported = 'Notification' in window

  return (
    <NotificationContext.Provider value={{
      settings,
      updateSettings,
      playNotificationSound,
      showNotification,
      requestPermission,
      isSupported
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}