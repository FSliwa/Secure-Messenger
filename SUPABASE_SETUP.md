# Supabase Setup Guide

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

## 3. Update Configuration

Replace the demo credentials in `src/lib/supabase.ts`:

```typescript
// Replace these lines:
const supabaseUrl = 'https://demo.supabase.co'
const supabaseAnonKey = 'demo-key'

// With your actual credentials:
const supabaseUrl = 'YOUR_SUPABASE_URL_HERE'
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY_HERE'
```

## 4. Create Database Tables

Go to your Supabase project → SQL Editor and run this SQL:

```sql
-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  public_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create contacts table
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  contact_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, contact_user_id)
);

-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create conversations table
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_ids UUID[] NOT NULL,
  last_message_id UUID REFERENCES messages(id),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for contacts
CREATE POLICY "Users can view own contacts" ON contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON contacts FOR DELETE USING (auth.uid() = user_id);

-- Create policies for messages
CREATE POLICY "Users can view messages they sent or received" ON messages 
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can insert messages they send" ON messages 
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update messages they sent" ON messages 
  FOR UPDATE USING (auth.uid() = sender_id);

-- Create policies for conversations
CREATE POLICY "Users can view conversations they participate in" ON conversations 
  FOR SELECT USING (auth.uid() = ANY(participant_ids));
CREATE POLICY "Users can create conversations they participate in" ON conversations 
  FOR INSERT WITH CHECK (auth.uid() = ANY(participant_ids));

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, username)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX messages_sender_id_idx ON messages(sender_id);
CREATE INDEX messages_recipient_id_idx ON messages(recipient_id);
CREATE INDEX messages_created_at_idx ON messages(created_at);
CREATE INDEX contacts_user_id_idx ON contacts(user_id);
CREATE INDEX contacts_contact_user_id_idx ON contacts(contact_user_id);
```

## 5. Enable Realtime (Optional)

For real-time messaging, enable Realtime on the messages table:

1. Go to Database → Replication
2. Create a new publication
3. Add the `messages` table
4. Enable realtime for the table

## 6. Test Connection

After updating the credentials, the app will automatically test the connection and show the status in the UI.

## Environment Variables (Production)

For production, use environment variables instead of hardcoding credentials:

```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
```

Create a `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```