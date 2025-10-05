import { createClient } from '@supabase/supabase-js'

// Supabase project configuration
const supabaseUrl = 'https://fyxmppbrealxwnstuzuk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5eG1wcGJyZWFseHduc3R1enVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDcyNjYsImV4cCI6MjA3NTE4MzI2Nn0.P_u5yDgASYwx-ImH-QhTTqAO8xM96DvqkgJ1tCm-8Pw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types matching the provided schema
export interface User {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  public_key: string
  status: 'online' | 'offline' | 'away'
  last_seen: string
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  name: string | null
  is_group: boolean
  access_code: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  joined_at: string
  left_at: string | null
  is_active: boolean
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  encrypted_content: string
  encryption_metadata: any
  sent_at: string
  edited_at: string | null
  is_deleted: boolean
}

export interface MessageStatus {
  id: string
  message_id: string
  user_id: string
  status: 'sent' | 'delivered' | 'read'
  timestamp: string
}

export interface LoginSession {
  id: string
  user_id: string
  login_time: string
  logout_time: string | null
  ip_address: string | null
  user_agent: string | null
  location_country: string | null
  location_city: string | null
  location_latitude: number | null
  location_longitude: number | null
  device_type: string | null
  browser: string | null
  os: string | null
  session_token: string | null
  cookies_data: any
  is_active: boolean
  created_at: string
  failed_attempts: number
  last_failed_attempt: string | null
  session_data: any
  last_activity_at: string
  screen_resolution: string | null
  language: string | null
  timezone: string | null
}

export interface SecurityAlert {
  id: string
  user_id: string
  alert_type: string
  severity: string
  description: string
  metadata: any
  ip_address: string | null
  user_agent: string | null
  location: any
  is_resolved: boolean
  resolved_at: string | null
  created_at: string
}

export interface TwoFactorAuth {
  id: string
  user_id: string
  secret: string
  backup_codes: string[]
  is_enabled: boolean
  enabled_at: string | null
  created_at: string
  updated_at: string
}

// Helper functions for browser fingerprinting
function getBrowserInfo() {
  const ua = navigator.userAgent
  let browser = 'Unknown'
  let os = 'Unknown'
  
  // Detect browser
  if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari')) browser = 'Safari'
  else if (ua.includes('Edge')) browser = 'Edge'
  
  // Detect OS
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iOS')) os = 'iOS'
  
  return { browser, os }
}

function getDeviceType() {
  const ua = navigator.userAgent
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

// Check if username is available
export const checkUsernameAvailability = async (username: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .single()

  if (error && error.code === 'PGRST116') {
    // No rows returned means username is available
    return { available: true }
  }
  
  if (error) {
    throw error
  }

  // Username already exists
  return { available: false }
}

// Authentication helper functions
export const signUp = async (email: string, password: string, displayName: string, publicKey: string, username?: string) => {
  // First check if username is available (if provided)
  if (username) {
    const { available } = await checkUsernameAvailability(username)
    if (!available) {
      throw new Error('Username is already taken')
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/verify-email`,
      data: {
        display_name: displayName,
        username: username,
        public_key: publicKey,
      },
    },
  })

  if (error) throw error

  // Don't create profile until email is verified
  return data
}

export const createUserProfileAfterVerification = async (user: any) => {
  const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user'
  const publicKey = user.user_metadata?.public_key || ''
  
  try {
    const { error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        username: username,
        display_name: user.user_metadata?.display_name || username,
        avatar_url: user.user_metadata?.avatar_url || null,
        public_key: publicKey,
        status: 'online',
        last_seen: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (error) throw error
    return true
  } catch (error) {
    console.error('Failed to create user profile after verification:', error)
    throw error
  }
}

export const signIn = async (email: string, password: string, publicKey?: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // Track failed login attempt
    try {
      await trackLoginAttempt(null, false, error.message)
    } catch (trackError) {
      console.error('Failed to track login attempt:', trackError)
    }
    throw error
  }

  if (data.user) {
    // Check if user email is verified
    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut()
      throw new Error('Please verify your email address before signing in. Check your inbox for the verification link.')
    }

    // Track successful login
    try {
      await trackLoginAttempt(data.user.id, true)
      
      // Check if user profile exists, if not create it (for newly verified users)
      const { data: existingProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (!existingProfile) {
        // Create profile for newly verified user
        await createUserProfileAfterVerification(data.user)
      } else {
        // Update existing profile
        await createOrUpdateUserProfile(data.user, publicKey || existingProfile.public_key || '')
      }
    } catch (trackError) {
      console.error('Failed to track login or create profile:', trackError)
    }
  }

  return data
}

export const signOut = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    // Update login session to mark as logged out
    try {
      await supabase
        .from('login_sessions')
        .update({ 
          logout_time: new Date().toISOString(),
          is_active: false 
        })
        .eq('user_id', user.id)
        .eq('is_active', true)
    } catch (error) {
      console.error('Failed to update logout time:', error)
    }
  }

  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Get user profile from users table
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error getting user profile:', error)
      return { ...user, profile: null }
    }

    return { ...user, profile }
  } catch (error) {
    console.error('Error getting user profile:', error)
    return { ...user, profile: null }
  }
}

// Create or update user profile after successful login
async function createOrUpdateUserProfile(user: any, publicKey: string) {
  const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user'
  
  try {
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      // Update existing profile
      const { error } = await supabase
        .from('users')
        .update({
          public_key: publicKey,
          status: 'online',
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error
    } else {
      // Create new profile
      const { error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          username: username,
          display_name: user.user_metadata?.display_name || username,
          avatar_url: user.user_metadata?.avatar_url || null,
          public_key: publicKey,
          status: 'online',
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) throw error
    }
  } catch (error) {
    console.error('Failed to create/update user profile:', error)
    throw error
  }
}

// Track login attempts with detailed session information
async function trackLoginAttempt(userId: string | null, success: boolean, errorMessage?: string) {
  const { browser, os } = getBrowserInfo()
  const deviceType = getDeviceType()
  
  const sessionData = {
    user_id: userId,
    login_time: success ? new Date().toISOString() : null,
    ip_address: null, // Would need server-side implementation
    user_agent: navigator.userAgent,
    location_country: null, // Would need geolocation API
    location_city: null,
    device_type: deviceType,
    browser: browser,
    os: os,
    is_active: success,
    failed_attempts: success ? 0 : 1,
    last_failed_attempt: success ? null : new Date().toISOString(),
    session_data: {
      screen_resolution: `${screen.width}x${screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      error_message: errorMessage
    },
    last_activity_at: new Date().toISOString(),
    screen_resolution: `${screen.width}x${screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }

  if (userId) {
    try {
      const { error } = await supabase
        .from('login_sessions')
        .insert([sessionData])

      if (error) throw error
    } catch (error) {
      console.error('Failed to track login session:', error)
    }
  }
}

// Real-time subscription helper
export const subscribeToMessages = (conversationId: string, callback: (message: Message) => void) => {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        callback(payload.new as Message)
      }
    )
    .subscribe()
}

// Send encrypted message function
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  encryptedContent: string,
  encryptionMetadata: any
) => {
  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        conversation_id: conversationId,
        sender_id: senderId,
        encrypted_content: encryptedContent,
        encryption_metadata: encryptionMetadata,
        sent_at: new Date().toISOString()
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

// Get conversations for user
export const getUserConversations = async (userId: string) => {
  const { data, error } = await supabase
    .from('conversation_participants')
    .select(`
      *,
      conversations (
        id,
        name,
        is_group,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) throw error
  return data
}

// Create new conversation with access code
export const createConversation = async (
  name: string | null, 
  isGroup: boolean, 
  createdBy: string,
  accessCode: string
) => {
  const { data, error } = await supabase
    .from('conversations')
    .insert([
      {
        name,
        is_group: isGroup,
        created_by: createdBy,
        access_code: accessCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
    ])
    .select()
    .single()

  if (error) throw error

  // Add creator as participant
  const { error: participantError } = await supabase
    .from('conversation_participants')
    .insert([
      {
        conversation_id: data.id,
        user_id: createdBy,
        joined_at: new Date().toISOString(),
        is_active: true
      },
    ])

  if (participantError) throw participantError

  return data
}

// Join conversation with access code
export const joinConversation = async (accessCode: string, userId: string) => {
  // First, find the conversation by access code
  const { data: conversation, error: findError } = await supabase
    .from('conversations')
    .select('*')
    .eq('access_code', accessCode)
    .single()

  if (findError) throw new Error('Invalid access code')

  // Check if user is already a participant
  const { data: existing } = await supabase
    .from('conversation_participants')
    .select('*')
    .eq('conversation_id', conversation.id)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (existing) {
    throw new Error('You are already a member of this conversation')
  }

  // Add user as participant
  const { data, error } = await supabase
    .from('conversation_participants')
    .insert([
      {
        conversation_id: conversation.id,
        user_id: userId,
        joined_at: new Date().toISOString(),
        is_active: true
      },
    ])
    .select()
    .single()

  if (error) throw error

  return { conversation, participant: data }
}

// Search users by username or display name
export const searchUsers = async (query: string, currentUserId: string) => {
  if (!query.trim()) return []

  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, status, last_seen')
    .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
    .neq('id', currentUserId)
    .limit(20)

  if (error) throw error
  return data || []
}

// Update user online status
export const updateUserStatus = async (userId: string, status: 'online' | 'offline' | 'away') => {
  const { error } = await supabase
    .from('users')
    .update({
      status,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (error) throw error
}

// Get conversation messages
export const getConversationMessages = async (conversationId: string, limit = 50, offset = 0) => {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      users!messages_sender_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      )
    `)
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data || []
}

// Create security alert
export const createSecurityAlert = async (
  userId: string,
  alertType: string,
  severity: string,
  description: string,
  metadata?: any
) => {
  const { browser, os } = getBrowserInfo()
  
  const { data, error } = await supabase
    .from('security_alerts')
    .insert([
      {
        user_id: userId,
        alert_type: alertType,
        severity,
        description,
        metadata: metadata || {},
        ip_address: null, // Would need server-side implementation
        user_agent: navigator.userAgent,
        location: {
          browser,
          os,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        created_at: new Date().toISOString()
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

// Test Supabase connection (for existing components)
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    
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