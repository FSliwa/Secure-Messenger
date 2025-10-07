import { useCallback } from 'react'
import { useNotifications } from '@/contexts/NotificationContext'
import { toast } from 'sonner'

export interface NotificationOptions {
  sound?: boolean
  desktop?: boolean
  toast?: boolean
  soundType?: 'message' | 'mention' | 'join' | 'leave' | 'error' | 'success' | 'call'
  priority?: 'low' | 'normal' | 'high'
  icon?: string
  requireInteraction?: boolean
}

export function useNotificationHandler() {
  const { 
    playNotificationSound, 
    showNotification, 
    settings,
    requestPermission 
  } = useNotifications()

  const notify = useCallback(async (
    title: string,
    body: string,
    options: NotificationOptions = {}
  ) => {
    const {
      sound = true,
      desktop = true,
      toast: showToast = true,
      soundType = 'message',
      priority = 'normal',
      icon = '/favicon.svg',
      requireInteraction = false
    } = options

    try {
      // Play sound notification
      if (sound && settings.soundEnabled) {
        await playNotificationSound(soundType)
      }

      // Show desktop notification
      if (desktop && settings.desktopEnabled) {
        showNotification(title, body, {
          icon,
          requireInteraction: priority === 'high' || requireInteraction,
          tag: `notification-${Date.now()}`,
          silent: !settings.soundEnabled
        })
      }

      // Show toast notification as fallback or additional notification
      if (showToast) {
        const toastOptions = {
          description: body,
          duration: priority === 'high' ? 6000 : 4000
        }

        switch (soundType) {
          case 'success':
            toast.success(title, toastOptions)
            break
          case 'error':
            toast.error(title, toastOptions)
            break
          case 'mention':
            toast.info(title, { ...toastOptions, description: `🔔 ${body}` })
            break
          default:
            toast.info(title, toastOptions)
        }
      }
    } catch (error) {
      console.warn('Failed to send notification:', error)
      // Fallback to toast only
      if (showToast) {
        toast.error('Notification failed', {
          description: 'There was an issue sending the notification'
        })
      }
    }
  }, [playNotificationSound, showNotification, settings])

  // Predefined notification types
  const notifyMessage = useCallback((senderName: string, message: string, conversationName?: string) => {
    const title = conversationName ? `${senderName} in ${conversationName}` : senderName
    notify(title, message, {
      soundType: 'message',
      priority: 'normal'
    })
  }, [notify])

  const notifyMention = useCallback((senderName: string, message: string, conversationName: string) => {
    notify(`You were mentioned by ${senderName}`, message, {
      soundType: 'mention',
      priority: 'high',
      requireInteraction: true
    })
  }, [notify])

  const notifyUserJoined = useCallback((userName: string, conversationName: string) => {
    notify('User Joined', `${userName} joined ${conversationName}`, {
      soundType: 'join',
      priority: 'low',
      toast: false // Only desktop notification for joins
    })
  }, [notify])

  const notifyUserLeft = useCallback((userName: string, conversationName: string) => {
    notify('User Left', `${userName} left ${conversationName}`, {
      soundType: 'leave',
      priority: 'low',
      toast: false // Only desktop notification for leaves
    })
  }, [notify])

  const notifyError = useCallback((error: string, details?: string) => {
    notify('Error', details || error, {
      soundType: 'error',
      priority: 'high',
      sound: true,
      desktop: true,
      toast: true
    })
  }, [notify])

  const notifySuccess = useCallback((message: string, details?: string) => {
    notify('Success', details || message, {
      soundType: 'success',
      priority: 'normal',
      desktop: false, // Usually don't need desktop notifications for success
      toast: true
    })
  }, [notify])

  const notifyCall = useCallback((callerName: string, conversationName?: string) => {
    const message = conversationName 
      ? `${callerName} is calling in ${conversationName}`
      : `${callerName} is calling you`
      
    notify('Incoming Call', message, {
      soundType: 'call',
      priority: 'high',
      requireInteraction: true
    })
  }, [notify])

  // Check and request permissions if needed
  const ensurePermissions = useCallback(async () => {
    if (!('Notification' in window)) {
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      toast.warning('Notifications blocked', {
        description: 'Please enable notifications in your browser settings'
      })
      return false
    }

    // Request permission
    const granted = await requestPermission()
    if (!granted) {
      toast.warning('Notifications not enabled', {
        description: 'You can enable them later in settings'
      })
    }
    
    return granted
  }, [requestPermission])

  // Batch notifications (useful for multiple messages)
  const notifyBatch = useCallback(async (notifications: Array<{
    title: string
    body: string
    options?: NotificationOptions
  }>) => {
    if (notifications.length === 0) return

    if (notifications.length === 1) {
      // Single notification
      await notify(notifications[0].title, notifications[0].body, notifications[0].options)
      return
    }

    // Multiple notifications - summarize
    const title = `${notifications.length} new notifications`
    const body = notifications.map(n => n.title).slice(0, 3).join(', ') + 
                (notifications.length > 3 ? ` and ${notifications.length - 3} more` : '')

    await notify(title, body, {
      soundType: 'message',
      priority: 'normal'
    })
  }, [notify])

  return {
    notify,
    notifyMessage,
    notifyMention,
    notifyUserJoined,
    notifyUserLeft,
    notifyError,
    notifySuccess,
    notifyCall,
    notifyBatch,
    ensurePermissions,
    isSupported: 'Notification' in window,
    hasPermission: 'Notification' in window && Notification.permission === 'granted'
  }
}