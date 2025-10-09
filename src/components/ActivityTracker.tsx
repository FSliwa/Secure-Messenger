import { useEffect } from 'react'
import { updateUserStatus } from '@/lib/supabase'

interface ActivityTrackerProps {
  userId: string
}

/**
 * Tracks user activity and updates online status
 * - Sets 'online' on mount and every 30 seconds
 * - Sets 'away' after 5 minutes of inactivity
 * - Sets 'offline' on unmount/page close
 */
export function ActivityTracker({ userId }: ActivityTrackerProps) {
  useEffect(() => {
    // Set online on mount
    updateUserStatus(userId, 'online').catch(err => 
      console.error('Failed to set online status:', err)
    )
    
    // Update last_seen every 30 seconds while user is active
    const heartbeatInterval = setInterval(() => {
      updateUserStatus(userId, 'online').catch(err => 
        console.error('Failed to update heartbeat:', err)
      )
    }, 30000) // 30 seconds
    
    // Track user inactivity
    let inactivityTimeout: NodeJS.Timeout
    
    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimeout)
      
      // Update to online on activity
      updateUserStatus(userId, 'online').catch(err => 
        console.error('Failed to set online on activity:', err)
      )
      
      // Set to "away" after 5 minutes of inactivity
      inactivityTimeout = setTimeout(() => {
        updateUserStatus(userId, 'away').catch(err => 
          console.error('Failed to set away status:', err)
        )
      }, 5 * 60 * 1000) // 5 minutes
    }
    
    // Listen for user activity events
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']
    
    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer, { passive: true })
    })
    
    // Start inactivity timer
    resetInactivityTimer()
    
    // Set offline on page close/unmount
    const handleBeforeUnload = () => {
      // Use navigator.sendBeacon for reliable offline status on page close
      const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/users?id=eq.${userId}`
      const payload = JSON.stringify({
        status: 'offline',
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      try {
        navigator.sendBeacon(
          endpoint,
          new Blob([payload], { type: 'application/json' })
        )
      } catch (error) {
        // Fallback to synchronous update
        updateUserStatus(userId, 'offline').catch(err => 
          console.error('Failed to set offline status:', err)
        )
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)
    
    // Cleanup
    return () => {
      clearInterval(heartbeatInterval)
      clearTimeout(inactivityTimeout)
      
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer)
      })
      
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
      
      // Set offline on component unmount
      updateUserStatus(userId, 'offline').catch(err => 
        console.error('Failed to set offline on unmount:', err)
      )
    }
  }, [userId])
  
  // This component doesn't render anything
  return null
}

