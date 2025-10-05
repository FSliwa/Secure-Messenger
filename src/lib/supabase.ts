import { createClient } from '@supabase/supabase-js'

// Supabase configuration
// Replace these with your actual Supabase project credentials
// See SUPABASE_SETUP.md for detailed setup instructions
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types
export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  username: string
  avatar_url?: string
  public_key: string
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  user_id: string
  contact_user_id: string
  contact_name: string
  verified: boolean
  created_at: string
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  encrypted_content: string
  message_type: 'text' | 'image' | 'file'
  created_at: string
  read_at?: string
}

export interface Conversation {
  id: string
  participant_ids: string[]
  last_message_id?: string
  last_message_at: string
  created_at: string
}

// Auth helper functions
export const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          username: email.split('@')[0], // Generate username from email
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

// Message functions
export const sendMessage = async (recipientId: string, encryptedContent: string) => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: recipientId,
        encrypted_content: encryptedContent,
        message_type: 'text'
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export const getMessages = async (contactId: string) => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${contactId}),and(sender_id.eq.${contactId},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: true })

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

// Real-time subscription for messages
export const subscribeToMessages = (callback: (message: Message) => void) => {
  return supabase
    .channel('messages')
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, 
      (payload) => callback(payload.new as Message)
    )
    .subscribe()
}

// Contact functions
export const addContact = async (contactEmail: string) => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    // First find the user by email
    const { data: contactUser, error: findError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('email', contactEmail)
      .single()

    if (findError || !contactUser) {
      throw new Error('User not found')
    }

    // Add to contacts
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        user_id: user.id,
        contact_user_id: contactUser.id,
        contact_name: `${contactUser.first_name} ${contactUser.last_name}`,
        verified: false
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export const getContacts = async () => {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        contact_user:profiles!contacts_contact_user_id_fkey(
          id,
          first_name,
          last_name,
          email,
          avatar_url
        )
      `)
      .eq('user_id', user.id)

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

    // Test the connection with a simple query
    const { data, error } = await supabase.auth.getSession()
    
    if (error && error.message.includes('Invalid API key')) {
      return {
        connected: false,
        error: 'Invalid API credentials',
        message: 'Please check your Supabase URL and API key in the environment variables.',
        needsSetup: true
      }
    }

    // Try a simple database query to ensure tables exist
    const { error: dbError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)

    if (dbError) {
      return {
        connected: false,
        error: 'Database tables not found',
        message: 'Please run the SQL setup script from SUPABASE_SETUP.md to create the required tables.',
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
      error: error.message,
      message: 'Unable to connect to Supabase. Please check your configuration.',
      needsSetup: true
    }
  }
}