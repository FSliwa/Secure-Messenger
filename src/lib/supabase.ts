import { createClient } from '@supabase/supabase-js'

// Supabase configuration
// Replace these with your actual Supabase project credentials
// See SUPABASE_SETUP.md for detailed setup instructions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key'

// Debug logging (only in development)
if (import.meta.env.DEV) {
  console.log('🔧 Supabase Configuration:');
  console.log('URL:', supabaseUrl);
  console.log('API Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Not found');
  console.log('Environment vars loaded:', {
    VITE_SUPABASE_URL: !!import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: !!import.meta.env.VITE_SUPABASE_ANON_KEY
  });
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types matching your schema
export interface User {
  id: string
  username: string
  display_name?: string
  avatar_url?: string
  public_key: string
  status: 'online' | 'offline' | 'away'
  last_seen: string
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  name?: string
  is_group: boolean
  access_code?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface ConversationParticipant {
  id: string
  conversation_id: string
  user_id: string
  joined_at: string
  left_at?: string
  is_active: boolean
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  encrypted_content: string
  encryption_metadata?: any
  sent_at: string
  edited_at?: string
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
  logout_time?: string
  ip_address?: string
  user_agent?: string
  location_country?: string
  location_city?: string
  device_type?: string
  browser?: string
  os?: string
  is_active: boolean
  last_activity_at: string
}

export interface SecurityAlert {
  id: string
  user_id: string
  alert_type: string
  severity: string
  description: string
  metadata?: any
  ip_address?: string
  user_agent?: string
  location?: any
  is_resolved: boolean
  resolved_at?: string
  created_at: string
}

export interface TwoFactorAuth {
  id: string
  user_id: string
  secret: string
  backup_codes: string[]
  is_enabled: boolean
  enabled_at?: string
  created_at: string
  updated_at: string
}

// Auth helper functions
export const signUp = async (email: string, password: string, username: string, displayName?: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName || username,
        }
      }
    })
    
    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    return null
  }
}

// User profile functions
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

// Conversation functions
export const createConversation = async (name?: string, isGroup: boolean = false) => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        name,
        is_group: isGroup,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    // Add creator as participant
    await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: data.id,
        user_id: user.id
      })

    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export const addParticipantToConversation = async (conversationId: string, userId: string) => {
  try {
    const { data, error } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: conversationId,
        user_id: userId
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export const getUserConversations = async () => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations (
          id,
          name,
          is_group,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

// Message functions
export const sendMessage = async (conversationId: string, encryptedContent: string, encryptionMetadata?: any) => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        encrypted_content: encryptedContent,
        encryption_metadata: encryptionMetadata
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export const getConversationMessages = async (conversationId: string) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('sent_at', { ascending: true })

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export const markMessageAsRead = async (messageId: string) => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('message_status')
      .upsert({
        message_id: messageId,
        user_id: user.id,
        status: 'read'
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

// Real-time subscription for messages
export const subscribeToConversationMessages = (conversationId: string, callback: (message: Message) => void) => {
  return supabase
    .channel(`conversation-${conversationId}`)
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, 
      (payload) => callback(payload.new as Message)
    )
    .subscribe()
}

// Aliases for convenience
export const getMessages = getConversationMessages
export const subscribeToMessages = subscribeToConversationMessages

// Security functions
export const createSecurityAlert = async (alertType: string, severity: string, description: string, metadata?: any) => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('security_alerts')
      .insert({
        user_id: user.id,
        alert_type: alertType,
        severity,
        description,
        metadata
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export const getUserSecurityAlerts = async () => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('security_alerts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

// Connection test function
export const testSupabaseConnection = async () => {
  try {
    // Check if we're using demo credentials
    if (supabaseUrl === 'https://demo.supabase.co' || supabaseAnonKey === 'demo-key') {
      return {
        connected: false,
        error: 'Using demo credentials',
        message: 'To enable full functionality, please set up your Supabase project. See SUPABASE_SETUP.md for instructions.',
        needsSetup: true
      }
    }

    // Check if environment variables are properly loaded
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('undefined') || supabaseAnonKey.includes('undefined')) {
      return {
        connected: false,
        error: 'Missing environment variables',
        message: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found. Please check your .env file and restart the dev server.',
        needsSetup: true
      }
    }

    // Test basic Supabase connection first
    try {
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        // More specific error handling
        if (error.message.includes('Invalid API key') || error.message.includes('invalid key')) {
          return {
            connected: false,
            error: 'Invalid API key',
            message: 'The Supabase API key appears to be invalid. Please verify your VITE_SUPABASE_ANON_KEY in the .env file.',
            needsSetup: true
          }
        }
        
        if (error.message.includes('Invalid URL') || error.message.includes('url')) {
          return {
            connected: false,
            error: 'Invalid Supabase URL',
            message: 'The Supabase URL appears to be invalid. Please verify your VITE_SUPABASE_URL in the .env file.',
            needsSetup: true
          }
        }
        
        return {
          connected: false,
          error: `Auth error: ${error.message}`,
          message: 'There was an authentication error. Please check your Supabase credentials.',
          needsSetup: true
        }
      }
    } catch (fetchError: any) {
      return {
        connected: false,
        error: 'Network or credentials error',
        message: `Unable to connect to Supabase: ${fetchError.message}. Please check your URL and API key.`,
        needsSetup: true
      }
    }

    // Try a simple database query to ensure tables exist
    try {
      const { error: dbError } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      if (dbError) {
        if (dbError.message.includes('relation "public.users" does not exist')) {
          return {
            connected: false,
            error: 'Database tables not found',
            message: 'The database tables have not been created yet. Please run the SQL setup script from SUPABASE_SETUP.md.',
            needsSetup: true
          }
        }
        
        return {
          connected: false,
          error: `Database error: ${dbError.message}`,
          message: 'There was a database error. Please check your table setup and permissions.',
          needsSetup: true
        }
      }
    } catch (dbError: any) {
      return {
        connected: false,
        error: 'Database connection failed',
        message: `Unable to query database: ${dbError.message}. Please check your setup.`,
        needsSetup: true
      }
    }

    return {
      connected: true,
      error: null,
      message: 'Supabase connection successful! All systems ready.',
      needsSetup: false
    }
  } catch (error: any) {
    return {
      connected: false,
      error: `Connection test failed: ${error.message}`,
      message: 'Unable to test Supabase connection. Please check your configuration.',
      needsSetup: true
    }
  }
}