import { supabase } from './supabase'

// Database table schemas for runtime creation
const TABLE_SCHEMAS = {
  profiles: `
    CREATE TABLE IF NOT EXISTS profiles (
      id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
  `,
  chat_rooms: `
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name TEXT,
      is_group BOOLEAN DEFAULT FALSE NOT NULL,
      created_by UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
  `,
  chat_room_participants: `
    CREATE TABLE IF NOT EXISTS chat_room_participants (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      room_id UUID REFERENCES chat_rooms ON DELETE CASCADE NOT NULL,
      user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
      role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')) NOT NULL,
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      UNIQUE(room_id, user_id)
    );
  `,
  messages: `
    CREATE TABLE IF NOT EXISTS messages (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      room_id UUID REFERENCES chat_rooms ON DELETE CASCADE NOT NULL,
      sender_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice')) NOT NULL,
      encrypted BOOLEAN DEFAULT TRUE NOT NULL,
      file_url TEXT,
      file_name TEXT,
      file_size BIGINT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
    );
  `,
  encryption_keys: `
    CREATE TABLE IF NOT EXISTS encryption_keys (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
      public_key TEXT NOT NULL,
      encrypted_private_key TEXT NOT NULL,
      key_type TEXT DEFAULT 'post-quantum' NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
      UNIQUE(user_id)
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
  const tables = ['profiles', 'chat_rooms', 'chat_room_participants', 'messages', 'encryption_keys']
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
    const tableOrder = ['profiles', 'chat_rooms', 'chat_room_participants', 'messages', 'encryption_keys']
    
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
export const safeCreateProfile = async (userId: string, username: string, displayName: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          username,
          display_name: displayName,
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

    // Try to get profile data, handle missing table gracefully
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
    console.error('Error getting current user:', error)
    return null
  }
}