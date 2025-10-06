import { supabase } from './supabase'

// Database initialization functions
export const initializeDatabaseTables = async () => {
  try {
    console.log('🔄 Initializing database tables...')
    
    // Check each required table individually for better error reporting
    const requiredTables = [
      'users',
      'two_factor_auth', 
      'trusted_devices',
      'biometric_credentials',
      'login_sessions',
      'security_alerts',
      'conversations',
      'conversation_participants',
      'messages',
      'message_status'
    ]

    const tableStatus: Record<string, boolean> = {}
    const tableErrors: Record<string, string> = {}
    
    for (const tableName of requiredTables) {
      try {
        console.log(`🔍 Checking table: ${tableName}`)
        const { data, error } = await supabase.from(tableName).select('*').limit(1)
        
        if (error) {
          console.log(`❌ Table ${tableName} error:`, error.message)
          tableStatus[tableName] = false
          tableErrors[tableName] = error.message
        } else {
          console.log(`✅ Table ${tableName} is accessible`)
          tableStatus[tableName] = true
        }
      } catch (error) {
        console.error(`💥 Exception checking table ${tableName}:`, error)
        tableStatus[tableName] = false
        tableErrors[tableName] = error instanceof Error ? error.message : 'Unknown error'
      }
    }

    const allTablesReady = Object.values(tableStatus).every(exists => exists)
    const missingTables = Object.entries(tableStatus)
      .filter(([_, exists]) => !exists)
      .map(([table]) => table)
    
    if (allTablesReady) {
      console.log('🎉 All database tables are ready and accessible!')
      return { 
        success: true, 
        tables: tableStatus,
        message: 'All database tables are ready'
      }
    } else {
      console.log('⚠️  Missing or inaccessible tables:', missingTables)
      console.log('📝 Table errors:', tableErrors)
      
      return { 
        success: false, 
        tables: tableStatus,
        missing: missingTables,
        errors: tableErrors,
        message: `Missing tables: ${missingTables.join(', ')}. Please run the SQL schema in Supabase.`
      }
    }

  } catch (error) {
    console.error('💥 Database initialization failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Database initialization failed. Check your Supabase connection.'
    }
  }
}

// Get the complete database SQL schema
function getDatabaseSQL(): string {
  return `-- SecureChat Database Schema (FIXED VERSION - no infinite recursion)
-- Execute this SQL in Supabase SQL Editor to create all required tables

-- Drop existing problematic policies first (if they exist)
DROP POLICY IF EXISTS "Users can access their conversation participation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can access message status" ON message_status;

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
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

-- Two-factor authentication table
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

-- Trusted devices table
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

-- Biometric credentials table
CREATE TABLE IF NOT EXISTS biometric_credentials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  name TEXT DEFAULT 'Biometric Login',
  type TEXT DEFAULT 'fingerprint' CHECK (type IN ('fingerprint', 'faceId', 'touchId')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  last_used TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Login sessions table
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

-- Security alerts table
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

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE NOT NULL,
  access_code TEXT UNIQUE,
  created_by UUID REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Conversation participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  UNIQUE(conversation_id, user_id)
);

-- Messages table
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

-- Message status table
CREATE TABLE IF NOT EXISTS message_status (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES messages ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(message_id, user_id)
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (simplified for quick setup)
CREATE POLICY "Enable access for users based on user_id" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Enable access for users based on user_id" ON two_factor_auth FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable access for users based on user_id" ON trusted_devices FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable access for users based on user_id" ON biometric_credentials FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable access for users based on user_id" ON login_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Enable access for users based on user_id" ON security_alerts FOR ALL USING (auth.uid() = user_id);

-- More complex policies for conversations and messages (FIXED - no recursion)
CREATE POLICY "Users can access their conversations" ON conversations FOR ALL USING (
  auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = conversations.id AND user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can manage their own participation" ON conversation_participants FOR ALL USING (
  auth.uid() = user_id
);

CREATE POLICY "Users can access messages in their conversations" ON messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can manage their own message status" ON message_status FOR ALL USING (
  auth.uid() = user_id
);`
}

// Check database readiness
export const checkDatabaseReadiness = async () => {
  console.log('🔍 Checking database readiness...')
  
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
  const errors: Record<string, string> = {}
  
  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1)
      if (error) {
        status[table] = false
        errors[table] = error.message
        console.log(`❌ Table ${table}: ${error.message}`)
      } else {
        status[table] = true
        console.log(`✅ Table ${table}: OK`)
      }
    } catch (err) {
      status[table] = false
      errors[table] = err instanceof Error ? err.message : 'Unknown error'
      console.log(`💥 Table ${table}: ${errors[table]}`)
    }
  }

  const allReady = Object.values(status).every(ready => ready)
  const missing = Object.entries(status)
    .filter(([_, ready]) => !ready)
    .map(([table]) => table)
  
  console.log(`📊 Database status: ${allReady ? 'READY' : 'NOT READY'}`)
  if (!allReady) {
    console.log(`📝 Missing tables: ${missing.join(', ')}`)
  }
  
  return {
    ready: allReady,
    tables: status,
    missing,
    errors,
    message: allReady 
      ? 'All database tables are ready' 
      : `Missing ${missing.length} table(s): ${missing.join(', ')}`
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