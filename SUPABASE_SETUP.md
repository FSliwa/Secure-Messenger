# Supabase Database Setup Guide

This guide will help you set up the database schema required for SecureChat Pro to work properly.

## Prerequisites

1. A Supabase project (create one at [supabase.com](https://supabase.com))
2. Your project's URL and anon key configured in the app

## Database Schema Setup

### Step 1: Access SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Schema Script

Copy and paste the entire contents of `src/database/schema.sql` into the SQL editor and run it.

Alternatively, you can copy the following SQL and run it:

```sql
-- Enable the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create chat_rooms table
CREATE TABLE chat_rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE NOT NULL,
  created_by UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create chat_room_participants table
CREATE TABLE chat_room_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(room_id, user_id)
);

-- Create messages table
CREATE TABLE messages (
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

-- Create encryption_keys table for storing user encryption keys
CREATE TABLE encryption_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  key_type TEXT DEFAULT 'post-quantum' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_messages_room_id ON messages(room_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_chat_room_participants_room_id ON chat_room_participants(room_id);
CREATE INDEX idx_chat_room_participants_user_id ON chat_room_participants(user_id);
CREATE INDEX idx_profiles_username ON profiles(username);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone." ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile." ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for chat_rooms
CREATE POLICY "Users can view chat rooms they participate in." ON chat_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_room_participants 
      WHERE room_id = chat_rooms.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chat rooms." ON chat_rooms
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room admins can update chat rooms." ON chat_rooms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chat_room_participants 
      WHERE room_id = chat_rooms.id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for chat_room_participants
CREATE POLICY "Users can view participants of rooms they're in." ON chat_room_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_room_participants AS crp 
      WHERE crp.room_id = chat_room_participants.room_id AND crp.user_id = auth.uid()
    )
  );

CREATE POLICY "Room admins can manage participants." ON chat_room_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_room_participants AS crp 
      WHERE crp.room_id = chat_room_participants.room_id AND crp.user_id = auth.uid() AND crp.role = 'admin'
    )
  );

-- RLS Policies for messages
CREATE POLICY "Users can view messages in rooms they participate in." ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_room_participants 
      WHERE room_id = messages.room_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to rooms they participate in." ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM chat_room_participants 
      WHERE room_id = messages.room_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for encryption_keys
CREATE POLICY "Users can view their own encryption keys." ON encryption_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own encryption keys." ON encryption_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own encryption keys." ON encryption_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- Functions to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Step 3: Verify Setup

1. After running the SQL, you should see all tables created successfully
2. Go to **Table Editor** in the left sidebar
3. Verify you can see these tables:
   - `profiles`
   - `chat_rooms` 
   - `chat_room_participants`
   - `messages`
   - `encryption_keys`

### Step 4: Test the Application

1. Refresh your SecureChat Pro application
2. The connection banner should now show a success message
3. Try creating a new account to test the setup

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**: Make sure you're running the SQL as the project owner
2. **"Function does not exist" errors**: Ensure the `uuid-ossp` extension is enabled
3. **RLS policy errors**: The policies are set up to be secure by default - users can only see their own data

### Manual Profile Creation

If the automatic profile creation trigger doesn't work, you can manually create profiles for existing users:

```sql
-- Replace USER_ID and details with actual values
INSERT INTO profiles (id, username, display_name)
VALUES ('USER_ID_HERE', 'username_here', 'Display Name Here');
```

### Reset Database

If you need to start over, you can drop all tables:

```sql
DROP TABLE IF EXISTS encryption_keys CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_room_participants CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
```

Then re-run the setup script.

## Security Notes

- All tables have Row Level Security (RLS) enabled
- Users can only access their own data and rooms they participate in
- Encryption keys are stored securely with proper access controls
- All user actions are logged with timestamps

## Next Steps

Once the database is set up:

1. Test user registration and login
2. Try creating chat rooms
3. Send encrypted messages
4. Explore the voice message and file sharing features

For any issues, check the browser console for detailed error messages.