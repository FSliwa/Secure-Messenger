import { useEffect, useRef } from 'react'
import { updateUserStatus } from '@/lib/supabase'

interface ActivityTrackerProps {
  userId: string
}

/**
 * Tracks user activity and updates online status with throttling
 * - Sets 'online' on mount
 * - Heartbeat every 60 seconds (not on every mouse move!)
 * - Sets 'away' after 5 minutes of inactivity
 * - Sets 'offline' on unmount/page close
 */
export function ActivityTracker({ userId }: ActivityTrackerProps) {
  const lastUpdateRef = useRef<number>(0)
  const isActiveRef = useRef<boolean>(true)
  
  useEffect(() => {
    // Set online on mount
    updateUserStatus(userId, 'online').catch(err => 
      console.error('Failed to set online status:', err)
    )
    lastUpdateRef.current = Date.now()
    
    // Track user inactivity
    let inactivityTimeout: NodeJS.Timeout
    let heartbeatInterval: NodeJS.Timeout
    
    const updateStatus = (status: 'online' | 'away') => {
      const now = Date.now()
      // Throttle: update only if 30+ seconds passed since last update
      if (now - lastUpdateRef.current >= 30000) {
        lastUpdateRef.current = now
        updateUserStatus(userId, status).catch(err => 
          console.error('Failed to update status:', err)
        )
      }
    }
    
    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimeout)
      
      // Mark as active but don't update immediately (throttled)
      isActiveRef.current = true
      updateStatus('online')
      
      // Set to "away" after 5 minutes of inactivity
      inactivityTimeout = setTimeout(() => {
        isActiveRef.current = false
        updateUserStatus(userId, 'away').catch(err => 
          console.error('Failed to set away status:', err)
        )
        lastUpdateRef.current = Date.now()
      }, 5 * 60 * 1000) // 5 minutes
    }
    
    // Heartbeat every 60 seconds (only if user is still active)
    heartbeatInterval = setInterval(() => {
      if (isActiveRef.current) {
        updateStatus('online')
      }
    }, 60000) // 60 seconds
    
    // Listen for user activity events (removed mousemove - too frequent!)
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart']
    
    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer, { passive: true })
    })
    
    // Start inactivity timer
    resetInactivityTimer()
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is hidden, set offline
        updateUserStatus(userId, 'offline').catch(err => 
          console.error('Failed to set offline status:', err)
        )
      } else if (document.visibilityState === 'visible') {
        // Page is visible again, set online
        updateUserStatus(userId, 'online').catch(err => 
          console.error('Failed to set online status:', err)
        )
        lastUpdateRef.current = Date.now()
        resetInactivityTimer()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Cleanup
    return () => {
      clearInterval(heartbeatInterval)
      clearTimeout(inactivityTimeout)
      
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer)
      })
      
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      
      // Set offline on component unmount
      updateUserStatus(userId, 'offline').catch(err => 
        console.error('Failed to set offline on unmount:', err)
      )
    }
  }, [userId])
  
  // This component doesn't render anything
  return null
}

