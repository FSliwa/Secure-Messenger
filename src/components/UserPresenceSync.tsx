import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Syncs user presence status in realtime
 * Subscribes to all users table changes and updates UI when status changes
 */
export function UserPresenceSync() {
  useEffect(() => {
    console.log('🔔 UserPresenceSync: Setting up realtime subscription for user status changes')

    // Subscribe to users table changes (status updates)
    const subscription = supabase
      .channel('users-presence-sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          console.log('👤 User status changed:', {
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
          console.log('✅ UserPresenceSync: Successfully subscribed to user status changes')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ UserPresenceSync: Channel error')
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️  UserPresenceSync: Subscription timed out')
        }
      })

    // Cleanup on unmount
    return () => {
      console.log('🔔 UserPresenceSync: Unsubscribing from user status changes')
      subscription.unsubscribe()
    }
  }, [])

  // This component doesn't render anything
  return null
}

