-- =====================================================
-- MESSAGE ATTACHMENTS TABLE
-- Run this in Supabase SQL Editor
-- =====================================================
-- This table stores file attachments for messages
-- (images, videos, audio, documents, voice messages)

-- =====================================================
-- CREATE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  
  -- File metadata
  file_type text NOT NULL CHECK (file_type IN ('image', 'video', 'audio', 'document', 'voice')),
  file_url text NOT NULL,
  file_name text,
  file_size bigint, -- Size in bytes
  mime_type text,
  
  -- Encryption
  encrypted boolean DEFAULT true NOT NULL,
  encryption_metadata jsonb,
  
  -- Media-specific fields
  thumbnail_url text, -- For images and videos
  duration integer, -- For audio/video in seconds
  waveform jsonb, -- For audio visualization (array of amplitude values)
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id 
  ON public.message_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_message_attachments_file_type 
  ON public.message_attachments(file_type);

CREATE INDEX IF NOT EXISTS idx_message_attachments_created_at 
  ON public.message_attachments(created_at DESC);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_view_attachments" ON public.message_attachments;
DROP POLICY IF EXISTS "users_upload_attachments" ON public.message_attachments;
DROP POLICY IF EXISTS "users_delete_own_attachments" ON public.message_attachments;

-- Policy: Users can view attachments in conversations they participate in
CREATE POLICY "users_view_attachments" ON public.message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_attachments.message_id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  );

-- Policy: Users can upload attachments to their own messages
CREATE POLICY "users_upload_attachments" ON public.message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
      AND m.sender_id = auth.uid()
    )
  );

-- Policy: Users can delete attachments from their own messages
CREATE POLICY "users_delete_own_attachments" ON public.message_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
      AND m.sender_id = auth.uid()
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate total attachment size for a message
CREATE OR REPLACE FUNCTION get_message_attachments_size(msg_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_size bigint;
BEGIN
  SELECT COALESCE(SUM(file_size), 0)
  INTO total_size
  FROM public.message_attachments
  WHERE message_id = msg_id;
  
  RETURN total_size;
END;
$$;

-- Function to count attachments for a message
CREATE OR REPLACE FUNCTION get_message_attachments_count(msg_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  count_result integer;
BEGIN
  SELECT COUNT(*)
  INTO count_result
  FROM public.message_attachments
  WHERE message_id = msg_id;
  
  RETURN count_result;
END;
$$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Message Attachments Table Created Successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Table: message_attachments';
  RAISE NOTICE 'Indexes: 3 (message_id, file_type, created_at)';
  RAISE NOTICE 'RLS Policies: %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'message_attachments');
  RAISE NOTICE 'Helper Functions: 2 (get_message_attachments_size, get_message_attachments_count)';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Ready for file attachments and voice messages!';
END $$;
