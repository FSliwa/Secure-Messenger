import { createClient } from '@supabase/supabase-js'

// Get Supabase configuration from environment variables
// Updated to support new Supabase key format (sb_publishable_*)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fyxmppbrealxwnstuzuk.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Jau8JdiOFfVKQOM1svLxMQ_9-sBqnKc'

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Verify Supabase connection on initialization
const verifySupabaseConnection = async () => {
  try {
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error && error.message.includes('Invalid API key')) {
      console.error('❌ Supabase API key is invalid!');
      console.error('Current key:', supabaseKey.substring(0, 20) + '...');
      throw new Error('Supabase configuration error: Invalid API key');
    }
    console.log('✅ Supabase connection verified');
  } catch (error) {
    console.warn('Supabase connection verification failed:', error);
  }
};

// Run verification (non-blocking)
verifySupabaseConnection();

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
export const signUp = async (
  email: string, 
  password: string, 
  displayName: string, 
  publicKey: string, 
  username?: string,
  encryptedPrivateKey?: string
) => {
  // First check if username is available (if provided)
  if (username) {
    const { available } = await checkUsernameAvailability(username)
    if (!available) {
      throw new Error('Username is already taken')
    }
  }

  // Environment-aware email configuration for proper redirect handling
  const redirectUrl = import.meta.env.VITE_REDIRECT_URL || import.meta.env.VITE_APP_URL || window.location.origin
  const callbackUrl = `${redirectUrl}/auth/callback`
  
  console.log('🔹 Using callback URL for email confirmation:', callbackUrl)
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: {
        display_name: displayName,
        username: username,
        public_key: publicKey,
        encrypted_private_key: encryptedPrivateKey || '',
      },
    },
  })

  if (error) {
    // Enhanced error handling for email/registration issues
    console.error('Signup error details:', error)
    
    // Handle specific email-related errors
    if (error.message?.includes('Invalid login credentials')) {
      throw new Error('Registration failed. Please check your email and password.')
    } else if (error.message?.includes('Email not confirmed')) {
      throw new Error('Please check your email for a confirmation link before signing in.')
    } else if (error.message?.includes('User already registered')) {
      throw new Error('An account with this email already exists. Please sign in instead.')
    } else if (error.message?.includes('signup_disabled')) {
      throw new Error('New registrations are currently disabled. Please contact support.')
    } else if (error.message?.includes('email_address_invalid')) {
      throw new Error('Please enter a valid email address.')
    }
    
    throw error
  }

  // Log successful registration attempt for debugging
  console.log('Registration successful, awaiting email confirmation:', { 
    email, 
    userId: data.user?.id,
    emailConfirmed: data.user?.email_confirmed_at ? true : false 
  })

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
    throw error
  }

  if (!data.user) {
    throw new Error('No user data returned from login')
  }

  // Check if user email is verified
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut()
    throw new Error('Please verify your email address before signing in. Check your inbox for the verification link.')
  }

  // Ensure user profile exists (simplified)
  try {
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .single()

    if (!existingProfile) {
      // Create profile for newly verified user
      await createUserProfileAfterVerification(data.user)
    }
  } catch (profileError) {
    console.warn('Profile check failed, continuing with login:', profileError)
    // Don't block login for profile issues
  }

  return data
}

export const signOut = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    try {
      // Update user status to offline
      await supabase
        .from('users')
        .update({ 
          status: 'offline',
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      // Update all active login sessions to mark as logged out
      await supabase
        .from('login_sessions')
        .update({ 
          logout_time: new Date().toISOString(),
          is_active: false,
          last_activity_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('is_active', true)

      // Create security log entry for logout
      await supabase
        .from('security_alerts')
        .insert([{
          user_id: user.id,
          alert_type: 'logout',
          severity: 'info',
          description: 'User logged out successfully',
          metadata: {
            logout_time: new Date().toISOString(),
            user_agent: navigator.userAgent,
            browser: getBrowserInfo().browser,
            os: getBrowserInfo().os
          },
          user_agent: navigator.userAgent,
          location: {
            browser: getBrowserInfo().browser,
            os: getBrowserInfo().os,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }])

    } catch (error) {
      console.error('Failed to update logout information:', error)
      // Continue with logout even if database updates fail
    }
  }

  // Clear all local session data
  try {
    // Clear Supabase session storage
    localStorage.removeItem('supabase.auth.token')
    sessionStorage.clear()
    
    // Clear any additional app-specific storage
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('supabase.') || key.startsWith('securechat.'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (error) {
    console.error('Failed to clear local storage:', error)
  }

  // Sign out from Supabase Auth - this must be last
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('Supabase signOut error:', error)
    throw error
  }
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
  try {
    const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user'
    
    // Check if profile already exists
    const { data: existingProfile, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      // Error other than "no rows found"
      console.error('Error checking existing profile:', selectError)
      throw selectError
    }

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

      if (error) {
        console.error('Error updating user profile:', error)
        throw error
      }
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

      if (error) {
        console.error('Error creating user profile:', error)
        throw error
      }
    }
  } catch (error) {
    console.error('Failed to create/update user profile:', error)
    throw error
  }
}

// Track login attempts with detailed session information
async function trackLoginAttempt(userId: string | null, success: boolean, errorMessage?: string) {
  try {
    const { browser, os } = getBrowserInfo()
    const deviceType = getDeviceType()
    
    // Only track if we have a userId and it's a successful login
    if (!userId || !success) {
      return
    }
    
    const sessionData = {
      user_id: userId,
      login_time: new Date().toISOString(),
      ip_address: null, // Would need server-side implementation
      user_agent: navigator.userAgent,
      location_country: null, // Would need geolocation API
      location_city: null,
      device_type: deviceType,
      browser: browser,
      os: os,
      is_active: true,
      failed_attempts: 0,
      last_failed_attempt: null,
      session_data: {
        screen_resolution: `${screen.width}x${screen.height}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      last_activity_at: new Date().toISOString(),
      screen_resolution: `${screen.width}x${screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }

    const { error } = await supabase
      .from('login_sessions')
      .insert([sessionData])

    if (error) {
      console.error('Failed to track login session:', error)
      // Don't throw error, just log it
    }
  } catch (error) {
    console.error('Failed to track login session:', error)
    // Don't throw error, just log it to prevent blocking login
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

// Get conversations for user with enhanced logging
export const getUserConversations = async (userId: string) => {
  console.log(`📋 Loading conversations for user: ${userId}`)
  
  try {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        joined_at,
        conversations!inner (
          id,
          name,
          is_group,
          access_code,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })
    
    if (error) {
      console.error('❌ Failed to load conversations:', error)
      throw error
    }
    
    const conversations = data?.map(item => (item as any).conversations) || []
    console.log(`✅ Loaded ${conversations.length} conversations`)
    
    return conversations
  } catch (error) {
    console.error('❌ getUserConversations exception:', error)
    throw error
  }
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

// Create direct message conversation (1-on-1) with automatic participant addition
export const createDirectMessage = async (
  createdBy: string,
  recipientId: string,
  accessCode: string
) => {
  try {
    console.log(`💬 Creating direct message: ${createdBy} → ${recipientId}`)
    
    // Check if conversation already exists between these two users
    const { data: existing, error: existingError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, conversations!inner(id, name, is_group, access_code, created_by, created_at, updated_at)')
      .eq('user_id', createdBy)
      .eq('conversations.is_group', false)
      .eq('is_active', true)
    
    if (existingError) {
      console.error('❌ Error checking existing conversations:', existingError)
    }
    
    if (existing && existing.length > 0) {
      // Check if recipient is also in any of these conversations
      for (const conv of existing) {
        const { data: recipientParticipant } = await supabase
          .from('conversation_participants')
          .select('id')
          .eq('conversation_id', conv.conversation_id)
          .eq('user_id', recipientId)
          .eq('is_active', true)
          .single()
        
        if (recipientParticipant) {
          // Conversation already exists, return it
          console.log(`✅ Found existing conversation: ${conv.conversation_id}`)
          return (conv as any).conversations
        }
      }
    }
    
    // Create new conversation
    console.log(`💬 Creating new conversation...`)
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert([{
        name: null, // Direct messages don't need names
        is_group: false,
        created_by: createdBy,
        access_code: accessCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (error) {
      console.error('❌ Failed to create conversation:', error)
      throw error
    }
    
    console.log(`✅ Conversation created: ${conversation.id}`)
    
    // Add BOTH users as participants
    console.log(`👥 Adding both users as participants...`)
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .insert([
        {
          conversation_id: conversation.id,
          user_id: createdBy,
          joined_at: new Date().toISOString(),
          is_active: true
        },
        {
          conversation_id: conversation.id,
          user_id: recipientId,
          joined_at: new Date().toISOString(),
          is_active: true
        }
      ])
      .select()
    
    if (participantsError) {
      console.error('❌ Failed to add participants:', participantsError)
      console.error('Participants error details:', {
        code: participantsError.code,
        message: participantsError.message,
        details: participantsError.details,
        hint: participantsError.hint
      })
      throw participantsError
    }
    
    console.log(`✅ Added ${participants?.length || 0} participants`)
    console.log(`✅ Direct message conversation created successfully`)
    
    return conversation
  } catch (error) {
    console.error('❌ createDirectMessage exception:', error)
    throw error
  }
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
    .order('status', { ascending: false }) // Online users first
    .order('last_seen', { ascending: false }) // Then by last seen
    .limit(50) // Increased from 20 to 50

  if (error) throw error
  return data || []
}

// Update user online status with enhanced error handling and logging
export const updateUserStatus = async (userId: string, status: 'online' | 'offline' | 'away') => {
  try {
    console.log(`📊 Updating user status: ${userId} → ${status}`)
    
    const { data, error } = await supabase
      .from('users')
      .update({
        status,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
    
    if (error) {
      console.error('❌ Failed to update user status:', error)
      throw error
    }
    
    console.log(`✅ User status updated successfully:`, data)
    return data
  } catch (error) {
    console.error('❌ updateUserStatus exception:', error)
    throw error
  }
}

// Get conversation messages with enhanced error handling
export const getConversationMessages = async (conversationId: string, limit = 50, offset = 0) => {
  try {
    console.log(`📨 Loading messages for conversation: ${conversationId}`)
    
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

    if (error) {
      console.error('❌ Failed to load messages:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      throw error
    }
    
    console.log(`✅ Loaded ${data?.length || 0} messages`)
    return data || []
  } catch (error) {
    console.error('❌ getConversationMessages exception:', error)
    throw error
  }
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

// Generate a random access code for conversations
export const generateAccessCode = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Regenerate access code for existing conversation
export const regenerateAccessCode = async (conversationId: string, userId: string): Promise<string> => {
  // Check if user has permission to regenerate access code (is creator or admin)
  const { data: conversation, error: fetchError } = await supabase
    .from('conversations')
    .select('created_by')
    .eq('id', conversationId)
    .single()

  if (fetchError) throw fetchError
  
  if (conversation.created_by !== userId) {
    throw new Error('Only conversation creator can regenerate access code')
  }

  const newAccessCode = generateAccessCode()
  
  const { data, error } = await supabase
    .from('conversations')
    .update({ 
      access_code: newAccessCode,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId)
    .select()
    .single()

  if (error) throw error
  return newAccessCode
}