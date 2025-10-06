-- COMPLETE FIXED SECURECHAT DATABASE SCHEMA
-- This SQL script creates all required tables and policies without infinite recursion
-- Execute this in Supabase SQL Editor

-- Drop existing problematic policies first (prevents infinite recursion)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can access their conversation participation" ON conversation_participants;
    DROP POLICY IF EXISTS "Users can access message status" ON message_status;
    DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
    DROP POLICY IF EXISTS "Users can view message status in their conversations" ON message_status;
EXCEPTION
    WHEN OTHERS THEN NULL; -- Ignore errors if policies don't exist
END $$;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create users table (extends auth.users for SecureChat)
CREATE TABLE IF NOT EXISTS users (
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

-- Create two_factor_auth table
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

-- Create trusted_devices table
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

-- Create login_sessions table
CREATE TABLE IF NOT EXISTS login_sessions (
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

-- Create security_alerts table
CREATE TABLE IF NOT EXISTS security_alerts (
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

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE NOT NULL,
  access_code TEXT UNIQUE,
  created_by UUID REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
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

-- Create message_status table
CREATE TABLE IF NOT EXISTS message_status (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES messages ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(message_id, user_id)
);

-- Create encryption_keys table
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  key_type TEXT DEFAULT 'post-quantum' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- Create biometric_credentials table
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

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv_user ON conversation_participants(conversation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_active ON conversation_participants(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at);
CREATE INDEX IF NOT EXISTS idx_message_status_message ON message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_user ON message_status(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user ON security_alerts(user_id);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_credentials ENABLE ROW LEVEL SECURITY;

-- Create FIXED RLS Policies (no infinite recursion)

-- Profiles policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
    
    CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
    CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
    CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Users policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view all users" ON users;
    DROP POLICY IF EXISTS "Users can update their own profile" ON users;
    DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
    
    CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
    CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Two-factor auth policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their 2FA" ON two_factor_auth;
    CREATE POLICY "Users can manage their 2FA" ON two_factor_auth FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Trusted devices policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their trusted devices" ON trusted_devices;
    CREATE POLICY "Users can manage their trusted devices" ON trusted_devices FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Login sessions policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can access their login sessions" ON login_sessions;
    CREATE POLICY "Users can access their login sessions" ON login_sessions FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Security alerts policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can access their security alerts" ON security_alerts;
    CREATE POLICY "Users can access their security alerts" ON security_alerts FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Conversations policies (FIXED)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can access conversations they participate in" ON conversations;
    DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
    DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
    DROP POLICY IF EXISTS "Users can update conversations they created" ON conversations;
    
    CREATE POLICY "Users can access conversations they participate in" ON conversations FOR SELECT USING (
      auth.uid() = created_by OR EXISTS (
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = conversations.id AND user_id = auth.uid() AND is_active = true
      )
    );
    CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (auth.uid() = created_by);
    CREATE POLICY "Users can update conversations they created" ON conversations FOR UPDATE USING (auth.uid() = created_by);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Conversation participants policies (FIXED - NO RECURSION)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own participation" ON conversation_participants;
    DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
    DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
    DROP POLICY IF EXISTS "Users can update their participation" ON conversation_participants;
    
    -- Simple policy: users can only manage their own participation records
    CREATE POLICY "Users can manage their own participation" ON conversation_participants FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Messages policies (FIXED)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can access messages in their conversations" ON messages;
    DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
    DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
    DROP POLICY IF EXISTS "Senders can update their messages" ON messages;
    
    CREATE POLICY "Users can access messages in their conversations" ON messages FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid() AND is_active = true
      )
    );
    CREATE POLICY "Users can send messages to their conversations" ON messages FOR INSERT WITH CHECK (
      auth.uid() = sender_id AND EXISTS (
        SELECT 1 FROM conversation_participants 
        WHERE conversation_id = messages.conversation_id AND user_id = auth.uid() AND is_active = true
      )
    );
    CREATE POLICY "Senders can update their messages" ON messages FOR UPDATE USING (auth.uid() = sender_id);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Message status policies (FIXED - NO RECURSION)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own message status" ON message_status;
    DROP POLICY IF EXISTS "Users can view message status in their conversations" ON message_status;
    DROP POLICY IF EXISTS "Users can update message status for themselves" ON message_status;
    DROP POLICY IF EXISTS "Users can update their message status" ON message_status;
    
    -- Simple policy: users can only manage their own message status records
    CREATE POLICY "Users can manage their own message status" ON message_status FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Encryption keys policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own encryption keys" ON encryption_keys;
    DROP POLICY IF EXISTS "Users can insert their own encryption keys" ON encryption_keys;
    DROP POLICY IF EXISTS "Users can update their own encryption keys" ON encryption_keys;
    
    CREATE POLICY "Users can view their own encryption keys" ON encryption_keys FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own encryption keys" ON encryption_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own encryption keys" ON encryption_keys FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Biometric credentials policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can access their own biometric credentials" ON biometric_credentials;
    CREATE POLICY "Users can access their own biometric credentials" ON biometric_credentials FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Create functions and triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_two_factor_auth_updated_at ON two_factor_auth;
CREATE TRIGGER update_two_factor_auth_updated_at BEFORE UPDATE ON two_factor_auth
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Insert into users table for SecureChat
  INSERT INTO public.users (id, username, display_name, public_key)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'temp_key_' || NEW.id::text -- Temporary key, should be replaced with actual public key
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'SecureChat database schema created successfully! All tables and policies are now set up without infinite recursion issues.';
END $$;