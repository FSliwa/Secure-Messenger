import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Syncs user presence status in realtime with a robust fallback to polling.
 * - Prioritizes WebSocket realtime connection.
 * - Automatically falls back to polling if WebSocket fails for ANY reason
 *   (e.g., non-HTTPS environment, network issues, Supabase URL misconfiguration).
 * - Prevents application crash by handling WebSocket errors gracefully.
 */
export function UserPresenceSync() {
  const [usePolling, setUsePolling] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const subscriptionRef = useRef<any>(null)

  useEffect(() => {
    console.log('🔔 UserPresenceSync: Initializing presence sync...')
    
    // Cleanup function to be called on unmount or before re-running
    const cleanup = () => {
      console.log('🔔 UserPresenceSync: Cleaning up...')
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }

    // Attempt WebSocket Realtime Subscription
    const tryRealtime = () => {
      console.log('🔔 UserPresenceSync: Attempting WebSocket realtime subscription...')
      
      try {
        subscriptionRef.current = supabase
          .channel('users-presence-sync')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'users' },
            (payload) => {
              console.log('👤 User status changed (realtime):', payload.new)
              window.dispatchEvent(new CustomEvent('user-status-changed', {
                detail: {
                  userId: payload.new.id,
                  status: payload.new.status,
                  lastSeen: payload.new.last_seen,
                  username: payload.new.username
                }
              }))
            }
          )
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ UserPresenceSync: WebSocket realtime active.')
              setUsePolling(false) // Ensure polling is off
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
              console.error('❌ UserPresenceSync: WebSocket error, falling back to polling.', err)
              cleanup() // Clean up failed subscription
              setUsePolling(true) // Switch to polling
            }
          })
      } catch (error) {
        console.error('❌ UserPresenceSync: Critical error during WebSocket setup, falling back to polling.', error)
        cleanup() // Clean up any partial setup
        setUsePolling(true) // Switch to polling
      }
    }

    // Polling Fallback Logic
    const startPolling = () => {
      console.log('🔄 UserPresenceSync: Using polling fallback (every 30 seconds).')
      
      let previousStatuses: Record<string, string> = {}
      
      const pollUserStatuses = async () => {
        try {
          const { data: users, error } = await supabase
            .from('users')
            .select('id, username, status, last_seen')
          
          if (error) {
            console.error('❌ Polling error:', error)
            return
          }
          
          users?.forEach(user => {
            if (previousStatuses[user.id] && previousStatuses[user.id] !== user.status) {
              console.log('👤 User status changed (polling):', user)
              window.dispatchEvent(new CustomEvent('user-status-changed', {
                detail: {
                  userId: user.id,
                  status: user.status,
                  lastSeen: user.last_seen,
                  username: user.username
                }
              }))
            }
            previousStatuses[user.id] = user.status
          })
        } catch (error) {
          console.error('❌ Polling exception:', error)
        }
      }
      
      pollUserStatuses() // Initial poll
      pollingIntervalRef.current = setInterval(pollUserStatuses, 30000)
    }

    if (usePolling) {
      startPolling()
    } else {
      tryRealtime()
    }

    // Cleanup on component unmount
    return cleanup
  }, [usePolling])

  // This component doesn't render anything
  return null
}

