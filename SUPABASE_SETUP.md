# Supabase Setup Guide for SecureChat

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project"
3. Choose your organization and enter project details:
   - Name: `securechat` (or any name you prefer)
   - Database Password: Choose a strong password
   - Region: Select closest to your users

## 2. Get Your Project Credentials

After your project is created:

1. Go to Project Settings → API
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **Project API Key** (anon/public key)

## 3. Configure Environment Variables

Create a `.env` file in your project root:

```bash
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Replace `your_supabase_url_here` and `your_supabase_anon_key_here` with your actual Supabase credentials.

## 4. Create Database Tables

Go to your Supabase project → SQL Editor and run this exact SQL schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (extends auth.users)
CREATE TABLE public.users (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  public_key text NOT NULL,
  status text DEFAULT 'offline'::text CHECK (status = ANY (ARRAY['online'::text, 'offline'::text, 'away'::text])),
  last_seen timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Create conversations table
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text,
  is_group boolean DEFAULT false,
  access_code text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- Create conversation_participants table
CREATE TABLE public.conversation_participants (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  left_at timestamp with time zone,
  is_active boolean DEFAULT true,
  CONSTRAINT conversation_participants_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Create messages table
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  encrypted_content text NOT NULL,
  encryption_metadata jsonb,
  sent_at timestamp with time zone DEFAULT now(),
  edited_at timestamp with time zone,
  is_deleted boolean DEFAULT false,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id)
);

-- Create message_status table
CREATE TABLE public.message_status (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['sent'::text, 'delivered'::text, 'read'::text])),
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT message_status_pkey PRIMARY KEY (id),
  CONSTRAINT message_status_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id),
  CONSTRAINT message_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Create login_sessions table
CREATE TABLE public.login_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  login_time timestamp with time zone DEFAULT now(),
  logout_time timestamp with time zone,
  ip_address text,
  user_agent text,
  location_country text,
  location_city text,
  location_latitude numeric,
  location_longitude numeric,
  device_type text,
  browser text,
  os text,
  session_token text,
  cookies_data jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  failed_attempts integer DEFAULT 0,
  last_failed_attempt timestamp with time zone,
  session_data jsonb,
  last_activity_at timestamp with time zone DEFAULT now(),
  screen_resolution text,
  language text,
  timezone text,
  CONSTRAINT login_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT login_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- Create security_alerts table
CREATE TABLE public.security_alerts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  alert_type text NOT NULL,
  severity text NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  ip_address text,
  user_agent text,
  location jsonb,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT security_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT security_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create two_factor_auth table
CREATE TABLE public.two_factor_auth (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL UNIQUE,
  secret text NOT NULL,
  backup_codes text[] NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  enabled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT two_factor_auth_pkey PRIMARY KEY (id),
  CONSTRAINT two_factor_auth_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create password_history table
CREATE TABLE public.password_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT password_history_pkey PRIMARY KEY (id),
  CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create account_lockouts table
CREATE TABLE public.account_lockouts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  locked_until timestamp with time zone NOT NULL,
  locked_by text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT account_lockouts_pkey PRIMARY KEY (id),
  CONSTRAINT account_lockouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_factor_auth ENABLE ROW LEVEL SECURITY;

-- Create policies for users
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for conversations
CREATE POLICY "Users can view conversations they participate in" ON public.conversations 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = conversations.id 
      AND user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can create conversations" ON public.conversations 
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Create policies for conversation_participants
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = conversation_participants.conversation_id 
      AND cp.user_id = auth.uid() 
      AND cp.is_active = true
    )
  );

CREATE POLICY "Users can add participants to their conversations" ON public.conversation_participants 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id 
      AND c.created_by = auth.uid()
    )
  );

-- Create policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = messages.conversation_id 
      AND user_id = auth.uid() 
      AND is_active = true
    )
  );

CREATE POLICY "Users can insert messages in their conversations" ON public.messages 
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_id = messages.conversation_id 
      AND user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Create policies for message_status
CREATE POLICY "Users can view message status" ON public.message_status 
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.messages m 
      WHERE m.id = message_id 
      AND m.sender_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their message status" ON public.message_status 
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create policies for login_sessions
CREATE POLICY "Users can view own sessions" ON public.login_sessions 
  FOR SELECT USING (user_id = auth.uid());

-- Create policies for security_alerts
CREATE POLICY "Users can view own security alerts" ON public.security_alerts 
  FOR SELECT USING (user_id = auth.uid());

-- Create policies for two_factor_auth
CREATE POLICY "Users can manage own 2FA" ON public.two_factor_auth 
  FOR ALL USING (user_id = auth.uid());

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, display_name, public_key)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'placeholder-key' -- You'll need to generate proper keys in your app
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX messages_conversation_id_idx ON public.messages(conversation_id);
CREATE INDEX messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX messages_sent_at_idx ON public.messages(sent_at);
CREATE INDEX conversation_participants_user_id_idx ON public.conversation_participants(user_id);
CREATE INDEX conversation_participants_conversation_id_idx ON public.conversation_participants(conversation_id);
CREATE INDEX message_status_message_id_idx ON public.message_status(message_id);
CREATE INDEX message_status_user_id_idx ON public.message_status(user_id);
CREATE INDEX login_sessions_user_id_idx ON public.login_sessions(user_id);
CREATE INDEX security_alerts_user_id_idx ON public.security_alerts(user_id);
```

## 5. Enable Realtime

For real-time messaging, enable Realtime on the messages table:

1. Go to Database → Replication
2. Create a new publication
3. Add the `messages` table
4. Enable realtime for the table

## 6. Test Connection

After updating the credentials and running the SQL, restart your development server. The app will automatically test the connection and show the status in the UI.

## Environment Variables Summary

Create a `.env` file with:
```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Troubleshooting

1. **"Database tables not found"**: Make sure you've run the complete SQL script above
2. **"Invalid API key"**: Check your `.env` file and restart the development server
3. **Connection issues**: Verify your Supabase project URL and API key are correct

The app includes a connection status banner that will show you exactly what's wrong and guide you through fixing it.