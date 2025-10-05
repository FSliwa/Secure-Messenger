import { supabase } from './supabase'

// Database table schemas for runtime creation
const TABLE_SCHEMAS = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      public_key TEXT NOT NULL,
      status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')) NOT NULL,
      last_seen TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
  `,
  two_factor_auth: `
    CREATE TABLE IF NOT EXISTS two_factor_auth (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
      secret TEXT NOT NULL,
      backup_codes TEXT[] DEFAULT '{}',
      is_enabled BOOLEAN DEFAULT FALSE NOT NULL,
      enabled_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      UNIQUE(user_id)
    );
  `,
  trusted_devices: `
    CREATE TABLE IF NOT EXISTS trusted_devices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
      device_fingerprint TEXT NOT NULL,
      device_name TEXT NOT NULL,
      device_type TEXT,
      browser TEXT,
      os TEXT,
      is_trusted BOOLEAN DEFAULT FALSE NOT NULL,
      trusted_at TIMESTAMP WITH TIME ZONE,
      last_used TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      UNIQUE(user_id, device_fingerprint)
    );
  `,
  login_sessions: `
    CREATE TABLE IF NOT EXISTS login_sessions (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES auth.users ON DELETE CASCADE,
      login_time TIMESTAMP WITH TIME ZONE,
      logout_time TIMESTAMP WITH TIME ZONE,
      ip_address TEXT,
      user_agent TEXT,
      location_country TEXT,
      location_city TEXT,
      location_latitude DOUBLE PRECISION,
      location_longitude DOUBLE PRECISION,
      device_type TEXT,
      browser TEXT,
      os TEXT,
      session_token TEXT,
      cookies_data JSONB,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      failed_attempts INTEGER DEFAULT 0,
      last_failed_attempt TIMESTAMP WITH TIME ZONE,
      session_data JSONB,
      last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      screen_resolution TEXT,
      language TEXT,
      timezone TEXT
    );
  `,
  security_alerts: `
    CREATE TABLE IF NOT EXISTS security_alerts (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
      alert_type TEXT NOT NULL,
      severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
      description TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      ip_address TEXT,
      user_agent TEXT,
      location JSONB,
      is_resolved BOOLEAN DEFAULT FALSE,
      resolved_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
  `,
  conversations: `
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name TEXT,
      is_group BOOLEAN DEFAULT FALSE NOT NULL,
      access_code TEXT UNIQUE,
      created_by UUID REFERENCES auth.users ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
  `,
  conversation_participants: `
    CREATE TABLE IF NOT EXISTS conversation_participants (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL,
      user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      left_at TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      UNIQUE(conversation_id, user_id)
    );
  `,
  messages: `
    CREATE TABLE IF NOT EXISTS messages (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL,
      sender_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
      encrypted_content TEXT NOT NULL,
      encryption_metadata JSONB DEFAULT '{}'::jsonb,
      sent_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      edited_at TIMESTAMP WITH TIME ZONE,
      is_deleted BOOLEAN DEFAULT FALSE,
      auto_delete_at TIMESTAMP WITH TIME ZONE,
      forwarding_disabled BOOLEAN DEFAULT TRUE NOT NULL
    );
  `,
  message_status: `
    CREATE TABLE IF NOT EXISTS message_status (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      message_id UUID REFERENCES messages ON DELETE CASCADE NOT NULL,
      user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
      status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')) NOT NULL,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      UNIQUE(message_id, user_id)
    );
  `
}

// Check if a table exists
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    // If we get data or null, table exists
    // If we get an error about missing table, it doesn't exist
    return !error || !error.message.includes('does not exist')
  } catch (err) {
    return false
  }
}

// Get current database status
export const getDatabaseStatus = async () => {
  const tables = ['users', 'two_factor_auth', 'trusted_devices', 'login_sessions', 'security_alerts', 'conversations', 'conversation_participants', 'messages', 'message_status']
  const status: Record<string, boolean> = {}
  
  for (const table of tables) {
    status[table] = await checkTableExists(table)
  }
  
  const allExist = Object.values(status).every(exists => exists)
  const noneExist = Object.values(status).every(exists => !exists)
  
  return {
    tables: status,
    allExist,
    noneExist,
    partialSetup: !allExist && !noneExist
  }
}

// Initialize database schema (Note: This requires admin privileges)
export const initializeDatabase = async () => {
  try {
    // First enable uuid extension
    await supabase.rpc('enable_uuid_extension')
    
    // Create tables in order
    const tableOrder = ['users', 'two_factor_auth', 'trusted_devices', 'login_sessions', 'security_alerts', 'conversations', 'conversation_participants', 'messages', 'message_status']
    
    for (const tableName of tableOrder) {
      const schema = TABLE_SCHEMAS[tableName as keyof typeof TABLE_SCHEMAS]
      await supabase.rpc('execute_sql', { sql: schema })
    }
    
    return { success: true, message: 'Database initialized successfully' }
  } catch (error) {
    console.error('Database initialization error:', error)
    return { 
      success: false, 
      message: 'Database initialization failed. Manual setup required.',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Test connection with better error handling
export const testDatabaseConnection = async () => {
  try {
    // First test basic connection
    const { data: authData } = await supabase.auth.getSession()
    
    // Then check database status
    const status = await getDatabaseStatus()
    
    if (status.noneExist) {
      return {
        connected: true,
        databaseReady: false,
        message: 'Connected to Supabase but database schema not set up',
        status: 'schema_missing',
        canAutoSetup: false // Usually requires admin privileges
      }
    }
    
    if (status.partialSetup) {
      return {
        connected: true,
        databaseReady: false,
        message: 'Connected to Supabase but database schema incomplete',
        status: 'schema_partial',
        missingTables: Object.entries(status.tables)
          .filter(([_, exists]) => !exists)
          .map(([table]) => table)
      }
    }
    
    if (status.allExist) {
      return {
        connected: true,
        databaseReady: true,
        message: 'Successfully connected to Supabase with complete schema',
        status: 'ready'
      }
    }
    
    return {
      connected: true,
      databaseReady: false,
      message: 'Unknown database state',
      status: 'unknown'
    }
    
  } catch (error) {
    return {
      connected: false,
      databaseReady: false,
      message: 'Failed to connect to Supabase',
      status: 'connection_failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Safe profile creation that handles missing table
export const safeCreateProfile = async (userId: string, username: string, displayName: string, publicKey: string) => {
  try {
    const { error } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          username,
          display_name: displayName,
          public_key: publicKey,
          status: 'online',
          last_seen: new Date().toISOString()
        },
      ])

    if (error) {
      // If table doesn't exist, provide helpful error
      if (error.message.includes('does not exist')) {
        throw new Error('Database not set up. Please run the schema setup first.')
      }
      throw error
    }
    
    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Safe user retrieval that handles missing table
export const safeGetCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return null

    // Try to get profile data from users table, handle missing table gracefully
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      // If table doesn't exist or user not found, return user without profile
      if (error.message.includes('does not exist') || error.code === 'PGRST116') {
        return { ...user, profile: null }
      }
      throw error
    }

    return { ...user, profile }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}