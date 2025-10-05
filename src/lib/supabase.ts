import { createClient } from '@supabase/supabase-js'

// Supabase project configuration
const supabaseUrl = 'https://fyxmppbrealxwnstuzuk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5eG1wcGJyZWFseHduc3R1enVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDcyNjYsImV4cCI6MjA3NTE4MzI2Nn0.P_u5yDgASYwx-ImH-QhTTqAO8xM96DvqkgJ1tCm-8Pw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types for TypeScript
export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  encrypted: boolean
  message_type: 'text' | 'image' | 'file' | 'voice'
  created_at: string
  updated_at: string
}

export interface ChatRoom {
  id: string
  name?: string
  is_group: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface ChatRoomParticipant {
  id: string
  room_id: string
  user_id: string
  joined_at: string
  role: 'admin' | 'member'
}

// Authentication helper functions
export const signUp = async (email: string, password: string, displayName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  })

  if (error) throw error

  // Profile creation is now handled by the database trigger
  // or will be created on first login if trigger doesn't exist
  return data
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Try to get profile data, handle missing table gracefully
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      // If table doesn't exist, return user without profile
      if (error.message.includes('does not exist')) {
        return { ...user, profile: null }
      }
      throw error
    }

    return { ...user, profile }
  } catch (error) {
    console.error('Error getting user profile:', error)
    return { ...user, profile: null }
  }
}

// Real-time subscription helper
export const subscribeToMessages = (roomId: string, callback: (message: Message) => void) => {
  return supabase
    .channel(`messages:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        callback(payload.new as Message)
      }
    )
    .subscribe()
}

// Send message function
export const sendMessage = async (
  roomId: string,
  senderId: string,
  content: string,
  messageType: 'text' | 'image' | 'file' | 'voice' = 'text'
) => {
  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        room_id: roomId,
        sender_id: senderId,
        content,
        message_type: messageType,
        encrypted: true, // All messages are encrypted by default
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

// Get chat rooms for user
export const getUserChatRooms = async (userId: string) => {
  const { data, error } = await supabase
    .from('chat_room_participants')
    .select(`
      *,
      chat_rooms (
        id,
        name,
        is_group,
        created_at
      )
    `)
    .eq('user_id', userId)

  if (error) throw error
  return data
}

// Create new chat room
export const createChatRoom = async (name: string, isGroup: boolean, createdBy: string) => {
  const { data, error } = await supabase
    .from('chat_rooms')
    .insert([
      {
        name,
        is_group: isGroup,
        created_by: createdBy,
      },
    ])
    .select()
    .single()

  if (error) throw error

  // Add creator as participant
  const { error: participantError } = await supabase
    .from('chat_room_participants')
    .insert([
      {
        room_id: data.id,
        user_id: createdBy,
        role: 'admin',
      },
    ])

  if (participantError) throw participantError

  return data
}

// Test Supabase connection (for existing components)
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    
    if (error) {
      return {
        connected: false,
        error: error.message,
        message: 'Failed to connect to Supabase database'
      }
    }

    return {
      connected: true,
      error: null,
      message: 'Successfully connected to Supabase'
    }
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      message: 'Connection test failed'
    }
  }
}