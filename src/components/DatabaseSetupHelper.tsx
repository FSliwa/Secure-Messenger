import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Copy, Database, ArrowSquareOut } from '@phosphor-icons/react'

const DATABASE_SCHEMA_SQL = `-- SecureChat Database Schema
-- Execute this SQL in Supabase SQL Editor to create all required tables

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

-- More complex policies for conversations and messages
CREATE POLICY "Users can access their conversations" ON conversations FOR ALL USING (
  auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = conversations.id AND user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can access their conversation participation" ON conversation_participants FOR ALL USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM conversation_participants cp 
    WHERE cp.conversation_id = conversation_participants.conversation_id AND cp.user_id = auth.uid() AND cp.is_active = true
  )
);

CREATE POLICY "Users can access messages in their conversations" ON messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can access message status" ON message_status FOR ALL USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
    WHERE m.id = message_status.message_id AND cp.user_id = auth.uid() AND cp.is_active = true
  )
);`

export function DatabaseSetupHelper() {
  const [isOpen, setIsOpen] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(DATABASE_SCHEMA_SQL)
      toast.success('SQL schema copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const openSupabaseSQL = () => {
    // Open Supabase SQL Editor in new tab
    window.open('https://supabase.com/dashboard/project/_/sql', '_blank')
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Database className="mr-2 h-4 w-4" />
          View SQL Schema
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Database Setup - SQL Schema</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 border border-border rounded-lg">
            <h4 className="text-sm font-medium mb-2">Setup Instructions:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Copy the SQL schema below</li>
              <li>Go to your Supabase project dashboard</li>
              <li>Open the SQL Editor</li>
              <li>Paste and execute the SQL</li>
              <li>Return here and click "Recheck" on the database init screen</li>
            </ol>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={copyToClipboard} className="flex-1">
              <Copy className="mr-2 h-4 w-4" />
              Copy SQL Schema
            </Button>
            <Button onClick={openSupabaseSQL} variant="outline" className="flex-1">
              <ArrowSquareOut className="mr-2 h-4 w-4" />
              Open Supabase SQL Editor
            </Button>
          </div>

          <div className="relative">
            <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96 border border-border">
              <code>{DATABASE_SCHEMA_SQL}</code>
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}