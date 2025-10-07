import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { useLanguage } from './LanguageContext'
import { AdvancedAudioGenerator } from '@/lib/notifications/audio-generator'

interface NotificationSettings {
  soundEnabled: boolean
  desktopEnabled: boolean
  vibrationEnabled: boolean
  volume: number
}

interface NotificationContextType {
  settings: NotificationSettings
  updateSettings: (newSettings: Partial<NotificationSettings>) => void
  playNotificationSound: (type?: 'message' | 'mention' | 'join' | 'leave' | 'error' | 'success' | 'call') => void
  showNotification: (title: string, body: string, options?: NotificationOptions) => void
  requestPermission: () => Promise<boolean>
  isSupported: boolean
  getSupportedSoundTypes: () => string[]
  testSound: (type: string) => void
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
  const audioGeneratorRef = useRef<AdvancedAudioGenerator | null>(null)
  const [soundsLoaded, setSoundsLoaded] = useState(false)

  // Sync with stored settings
  useEffect(() => {
    if (storedSettings) {
      setSettings(storedSettings)
    }
  }, [storedSettings])

  // Initialize audio generator and load sounds
  useEffect(() => {
    if (!settings.soundEnabled) return

    const initAudio = async () => {
      try {
        audioGeneratorRef.current = new AdvancedAudioGenerator()
        await audioGeneratorRef.current.generateNotificationSounds()
        setSoundsLoaded(true)
      } catch (error) {
        console.warn('Failed to initialize audio generator:', error)
        setSoundsLoaded(false)
      }
    }

    initAudio()

    return () => {
      if (audioGeneratorRef.current) {
        audioGeneratorRef.current.dispose()
        audioGeneratorRef.current = null
      }
      setSoundsLoaded(false)
    }
  }, [settings.soundEnabled])

  const playNotificationSound = async (type: 'message' | 'mention' | 'join' | 'leave' | 'error' | 'success' | 'call' = 'message') => {
    if (!settings.soundEnabled || !audioGeneratorRef.current || !soundsLoaded) return

    try {
      await audioGeneratorRef.current.playSound(type, settings.volume)
    } catch (error) {
      console.warn('Failed to play notification sound:', error)
    }
  }

  const testSound = async (type: string) => {
    if (!audioGeneratorRef.current || !soundsLoaded) return
    
    try {
      await audioGeneratorRef.current.playSound(type, settings.volume)
    } catch (error) {
      console.warn('Failed to test sound:', error)
    }
  }

  const getSupportedSoundTypes = (): string[] => {
    return audioGeneratorRef.current?.getSupportedSoundTypes() || []
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
      isSupported,
      getSupportedSoundTypes,
      testSound
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