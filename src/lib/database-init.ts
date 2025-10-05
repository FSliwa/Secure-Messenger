import { supabase } from './supabase'

// Database initialization functions
export const initializeDatabaseTables = async () => {
  try {
    console.log('Initializing database tables...')
    
    // Enable UUID extension
    try {
      await supabase.rpc('enable_uuid_extension')
    } catch (error) {
      console.log('UUID extension already enabled or not available')
    }

    // Create tables in correct order
    const tables = [
      {
        name: 'users',
        sql: `
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
        `
      },
      {
        name: 'two_factor_auth',
        sql: `
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
        `
      },
      {
        name: 'trusted_devices',
        sql: `
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
        `
      },
      {
        name: 'login_sessions',
        sql: `
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
        `
      },
      {
        name: 'security_alerts',
        sql: `
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
        `
      },
      {
        name: 'conversations',
        sql: `
          CREATE TABLE IF NOT EXISTS conversations (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            name TEXT,
            is_group BOOLEAN DEFAULT FALSE NOT NULL,
            access_code TEXT UNIQUE,
            created_by UUID REFERENCES auth.users ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
          );
        `
      },
      {
        name: 'conversation_participants',
        sql: `
          CREATE TABLE IF NOT EXISTS conversation_participants (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL,
            user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
            left_at TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN DEFAULT TRUE NOT NULL,
            UNIQUE(conversation_id, user_id)
          );
        `
      },
      {
        name: 'messages',
        sql: `
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
        `
      },
      {
        name: 'message_status',
        sql: `
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
    ]

    // Create each table
    for (const table of tables) {
      try {
        console.log(`Creating table: ${table.name}`)
        await supabase.rpc('execute_sql', { sql: table.sql })
        console.log(`✓ Table ${table.name} created successfully`)
      } catch (error) {
        console.error(`✗ Failed to create table ${table.name}:`, error)
        // Try direct execution if RPC fails
        try {
          const { error: directError } = await supabase.from(table.name).select('*').limit(0)
          if (!directError) {
            console.log(`✓ Table ${table.name} already exists`)
          }
        } catch (directError) {
          console.error(`✗ Table ${table.name} does not exist and creation failed`)
        }
      }
    }

    console.log('Database initialization completed')
    return { success: true }

  } catch (error) {
    console.error('Database initialization failed:', error)
    return { success: false, error }
  }
}

// Check database readiness
export const checkDatabaseReadiness = async () => {
  const requiredTables = [
    'users',
    'two_factor_auth', 
    'trusted_devices',
    'login_sessions',
    'security_alerts',
    'conversations',
    'conversation_participants',
    'messages',
    'message_status'
  ]

  const status: Record<string, boolean> = {}
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1)
      status[table] = !error
    } catch {
      status[table] = false
    }
  }

  const allReady = Object.values(status).every(ready => ready)
  
  return {
    ready: allReady,
    tables: status,
    missing: Object.entries(status)
      .filter(([_, ready]) => !ready)
      .map(([table]) => table)
  }
}

// Initialize database if needed
export const ensureDatabaseReady = async () => {
  const { ready, missing } = await checkDatabaseReadiness()
  
  if (!ready) {
    console.log('Database not ready, missing tables:', missing)
    const result = await initializeDatabaseTables()
    
    if (result.success) {
      console.log('Database initialized successfully')
      return await checkDatabaseReadiness()
    } else {
      console.error('Database initialization failed:', result.error)
      return { ready: false, error: result.error }
    }
  }
  
  console.log('Database is ready')
  return { ready: true }
}