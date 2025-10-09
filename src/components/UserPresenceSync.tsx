import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Syncs user presence status in realtime with fallback to polling
 * - Tries WebSocket realtime first (requires HTTPS)
 * - Falls back to polling if WebSocket not available
 */
export function UserPresenceSync() {
  const [realtimeAvailable, setRealtimeAvailable] = useState(true)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    console.log('🔔 UserPresenceSync: Initializing presence sync')
    
    // Check if we're on HTTPS (required for WebSocket)
    const isSecure = window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost'
    
    if (!isSecure) {
      console.warn('⚠️  UserPresenceSync: Not on HTTPS, WebSocket may not work. Using polling fallback.')
      setRealtimeAvailable(false)
    }

    let subscription: any = null

    // Try WebSocket realtime subscription
    if (isSecure) {
      console.log('🔔 UserPresenceSync: Attempting WebSocket realtime subscription')
      
      subscription = supabase
        .channel('users-presence-sync')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users'
          },
          (payload) => {
            console.log('👤 User status changed (realtime):', {
              userId: payload.new.id,
              username: payload.new.username,
              status: payload.new.status,
              lastSeen: payload.new.last_seen
            })
            
            // Dispatch custom event for other components to listen
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
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ UserPresenceSync: WebSocket realtime active')
            setRealtimeAvailable(true)
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ UserPresenceSync: WebSocket error, falling back to polling')
            setRealtimeAvailable(false)
          } else if (status === 'TIMED_OUT') {
            console.error('⏱️  UserPresenceSync: WebSocket timeout, falling back to polling')
            setRealtimeAvailable(false)
          }
        })
    }

    // Fallback: Polling when WebSocket is not available
    if (!realtimeAvailable || !isSecure) {
      console.log('🔄 UserPresenceSync: Using polling fallback (every 30 seconds)')
      
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
          
          // Check for status changes
          users?.forEach(user => {
            if (previousStatuses[user.id] && previousStatuses[user.id] !== user.status) {
              console.log('👤 User status changed (polling):', {
                userId: user.id,
                username: user.username,
                status: user.status,
                oldStatus: previousStatuses[user.id]
              })
              
              // Dispatch event
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
      
      // Initial poll
      pollUserStatuses()
      
      // Poll every 30 seconds
      pollingIntervalRef.current = setInterval(pollUserStatuses, 30000)
    }

    // Cleanup on unmount
    return () => {
      console.log('🔔 UserPresenceSync: Cleaning up')
      
      if (subscription) {
        subscription.unsubscribe()
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [realtimeAvailable])

  // This component doesn't render anything
  return null
}

