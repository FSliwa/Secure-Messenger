import { supabase } from './supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export type UserStatus = 'online' | 'offline' | 'away'

interface PresenceState {
  user_id: string
  username: string
  status: UserStatus
  last_seen: string
}

class UserPresenceManager {
  private channel: RealtimeChannel | null = null
  private userId: string | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private awayTimeout: NodeJS.Timeout | null = null
  private readonly HEARTBEAT_INTERVAL = 30000
  private readonly AWAY_TIMEOUT = 300000

  async initialize(userId: string) {
    this.userId = userId
    await this.setStatus('online')
    this.setupPresenceChannel()
    this.startHeartbeat()
    this.setupActivityListeners()
  }

  private setupPresenceChannel() {
    if (!this.userId) return

    this.channel = supabase.channel('user-presence', {
      config: {
        presence: {
          key: this.userId,
        },
      },
    })

    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel?.presenceState()
        console.log('Presence synced:', state)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
        this.handleUserLeft(key)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this.channel?.track({
            user_id: this.userId,
            status: 'online',
            last_seen: new Date().toISOString(),
          })
        }
      })
  }

  private async handleUserLeft(userId: string) {
    try {
      await supabase
        .from('users')
        .update({
          status: 'offline',
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
    } catch (error) {
      console.error('Error updating user status on leave:', error)
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(async () => {
      if (this.userId) {
        await this.updateLastSeen()
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  private setupActivityListeners() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const resetAwayTimer = () => {
      if (this.awayTimeout) {
        clearTimeout(this.awayTimeout)
      }
      
      this.setStatus('online')
      
      this.awayTimeout = setTimeout(() => {
        this.setStatus('away')
      }, this.AWAY_TIMEOUT)
    }

    events.forEach(event => {
      document.addEventListener(event, resetAwayTimer, { passive: true })
    })

    window.addEventListener('focus', () => {
      this.setStatus('online')
    })

    window.addEventListener('blur', () => {
      this.awayTimeout = setTimeout(() => {
        this.setStatus('away')
      }, this.AWAY_TIMEOUT)
    })

    window.addEventListener('beforeunload', () => {
      this.setStatus('offline')
    })

    resetAwayTimer()
  }

  async setStatus(status: UserStatus) {
    if (!this.userId) return

    try {
      const { error } = await supabase
        .from('users')
        .update({
          status,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.userId)

      if (error) throw error

      await this.channel?.track({
        user_id: this.userId,
        status,
        last_seen: new Date().toISOString(),
      })

      console.log(`User status updated to: ${status}`)
    } catch (error) {
      console.error('Error updating user status:', error)
    }
  }

  private async updateLastSeen() {
    if (!this.userId) return

    try {
      await supabase
        .from('users')
        .update({
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', this.userId)
    } catch (error) {
      console.error('Error updating last_seen:', error)
    }
  }

  async getUserStatus(userId: string): Promise<UserStatus> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('status, last_seen')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (!data) return 'offline'

      const lastSeen = new Date(data.last_seen).getTime()
      const now = Date.now()
      const timeDiff = now - lastSeen

      if (timeDiff > 5 * 60 * 1000) {
        return 'offline'
      }

      return data.status as UserStatus
    } catch (error) {
      console.error('Error getting user status:', error)
      return 'offline'
    }
  }

  subscribeToUserStatus(userId: string, callback: (status: UserStatus) => void) {
    const channel = supabase
      .channel(`user-status-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as UserStatus
          callback(newStatus)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }

  async cleanup() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    
    if (this.awayTimeout) {
      clearTimeout(this.awayTimeout)
    }

    if (this.userId) {
      await this.setStatus('offline')
    }

    if (this.channel) {
      await this.channel.unsubscribe()
    }

    this.userId = null
    this.channel = null
  }
}

export const userPresence = new UserPresenceManager()
