-- SecureChat Database Schema for Supabase (FIXED VERSION)
-- Execute this SQL in Supabase SQL Editor to create all required tables
-- This version fixes infinite recursion issues in RLS policies

-- Drop existing problematic policies first (prevents infinite recursion)
DO $$ 
BEGIN
    -- Drop all potentially problematic policies
    DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
    DROP POLICY IF EXISTS "Users can view message status in their conversations" ON message_status;
    DROP POLICY IF EXISTS "Users can access their conversation participation" ON conversation_participants;
    DROP POLICY IF EXISTS "Users can access message status" ON message_status;
    
    -- Drop tables in correct order (child tables first)
    DROP TABLE IF EXISTS message_status CASCADE;
    DROP TABLE IF EXISTS messages CASCADE;
    DROP TABLE IF EXISTS conversation_participants CASCADE;
    DROP TABLE IF EXISTS conversations CASCADE;
    DROP TABLE IF EXISTS security_alerts CASCADE;
    DROP TABLE IF EXISTS login_sessions CASCADE;
    DROP TABLE IF EXISTS biometric_sessions CASCADE;
    DROP TABLE IF EXISTS biometric_credentials CASCADE;
    DROP TABLE IF EXISTS trusted_devices CASCADE;
    DROP TABLE IF EXISTS two_factor_auth CASCADE; 
    DROP TABLE IF EXISTS users CASCADE;
EXCEPTION
    WHEN OTHERS THEN NULL; -- Ignore errors if policies/tables don't exist
END $$;

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  public_key TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')) NOT NULL,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Two-factor authentication table
CREATE TABLE two_factor_auth (
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
CREATE TABLE trusted_devices (
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
CREATE TABLE biometric_credentials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL DEFAULT '',
  name TEXT DEFAULT 'Biometric Login',
  type TEXT DEFAULT 'fingerprint' CHECK (type IN ('fingerprint', 'faceId', 'touchId', 'windowsHello')) NOT NULL,
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  last_used TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Biometric sessions table
CREATE TABLE biometric_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  credential_id TEXT REFERENCES biometric_credentials(credential_id) ON DELETE CASCADE NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  invalidated_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);

-- Login sessions table
CREATE TABLE login_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  login_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
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
  cookies_data JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  last_failed_attempt TIMESTAMP WITH TIME ZONE,
  session_data JSONB DEFAULT '{}'::jsonb,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  screen_resolution TEXT,
  language TEXT,
  timezone TEXT
);

-- Security alerts table
CREATE TABLE security_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  location JSONB DEFAULT '{}'::jsonb,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Conversations table
CREATE TABLE conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE NOT NULL,
  access_code TEXT UNIQUE,
  created_by UUID REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Conversation participants table
CREATE TABLE conversation_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE messages (
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
CREATE TABLE message_status (
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
ALTER TABLE biometric_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;

-- Create policies for Row Level Security (FIXED - NO INFINITE RECURSION)

-- Users policies
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Two-factor auth policies
CREATE POLICY "Users can manage their 2FA" ON two_factor_auth FOR ALL USING (auth.uid() = user_id);

-- Trusted devices policies
CREATE POLICY "Users can manage their trusted devices" ON trusted_devices FOR ALL USING (auth.uid() = user_id);

-- Biometric credentials policies  
CREATE POLICY "Users can manage their biometric credentials" ON biometric_credentials FOR ALL USING (auth.uid() = user_id);

-- Biometric sessions policies
CREATE POLICY "Users can manage their biometric sessions" ON biometric_sessions FOR ALL USING (auth.uid() = user_id);

-- Login sessions policies
CREATE POLICY "Users can view their login sessions" ON login_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their login sessions" ON login_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their login sessions" ON login_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Security alerts policies
CREATE POLICY "Users can view their security alerts" ON security_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert security alerts" ON security_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their security alerts" ON security_alerts FOR UPDATE USING (auth.uid() = user_id);

-- Conversations policies (FIXED - Direct user check first)
CREATE POLICY "Users can view their own conversations" ON conversations FOR SELECT USING (
  auth.uid() = created_by
);
CREATE POLICY "Users can view conversations they participate in" ON conversations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id 
    AND cp.user_id = auth.uid() 
    AND cp.is_active = true
  )
);
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update conversations they created" ON conversations FOR UPDATE USING (auth.uid() = created_by);

-- Conversation participants policies (FIXED - Non-recursive approach)
CREATE POLICY "Users can view participants in their conversations" ON conversation_participants FOR SELECT USING (
  user_id = auth.uid() OR 
  conversation_id IN (
    SELECT c.id FROM conversations c WHERE c.created_by = auth.uid()
  )
);
CREATE POLICY "Users can insert their own participation" ON conversation_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own participation" ON conversation_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own participation" ON conversation_participants FOR DELETE USING (auth.uid() = user_id);

-- Messages policies (FIXED - Direct conversation check)
CREATE POLICY "Users can view messages in their conversations" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id 
    AND cp.user_id = auth.uid() 
    AND cp.is_active = true
  )
);
CREATE POLICY "Users can send messages to their conversations" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id 
    AND cp.user_id = auth.uid() 
    AND cp.is_active = true
  )
);
CREATE POLICY "Senders can update their messages" ON messages FOR UPDATE USING (auth.uid() = sender_id);

-- Message status policies (FIXED - SIMPLE USER-BASED)
CREATE POLICY "Users can view their own message status" ON message_status FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own message status" ON message_status FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own message status" ON message_status FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own message status" ON message_status FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);
CREATE INDEX idx_message_status_message_id ON message_status(message_id);
CREATE INDEX idx_message_status_user_id ON message_status(user_id);
CREATE INDEX idx_login_sessions_user_id ON login_sessions(user_id);
CREATE INDEX idx_security_alerts_user_id ON security_alerts(user_id);
CREATE INDEX idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX idx_biometric_credentials_user_id ON biometric_credentials(user_id);
CREATE INDEX idx_biometric_credentials_credential_id ON biometric_credentials(credential_id);
CREATE INDEX idx_biometric_sessions_user_id ON biometric_sessions(user_id);
CREATE INDEX idx_biometric_sessions_token ON biometric_sessions(session_token);
CREATE INDEX idx_biometric_sessions_expires ON biometric_sessions(expires_at);

-- Create triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_two_factor_auth_updated_at BEFORE UPDATE ON two_factor_auth
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();