-- =====================================================
-- RLS POLICIES FOR MESSAGING SYSTEM
-- Run this in Supabase SQL Editor
-- =====================================================
-- This file enables Row Level Security for the messaging system
-- and creates policies to control access to messages, conversations,
-- and related tables.

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MESSAGES TABLE POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_view_conversation_messages" ON public.messages;
DROP POLICY IF EXISTS "users_send_messages" ON public.messages;
DROP POLICY IF EXISTS "users_edit_own_messages" ON public.messages;
DROP POLICY IF EXISTS "users_delete_own_messages" ON public.messages;

-- Policy: Users can view messages in conversations they participate in
CREATE POLICY "users_view_conversation_messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_participants.conversation_id = messages.conversation_id 
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.is_active = true
    )
  );

-- Policy: Users can send messages to conversations they participate in
CREATE POLICY "users_send_messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_participants.conversation_id = messages.conversation_id 
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.is_active = true
    )
  );

-- Policy: Users can edit their own messages
CREATE POLICY "users_edit_own_messages" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Policy: Users can delete their own messages
CREATE POLICY "users_delete_own_messages" ON public.messages
  FOR DELETE USING (sender_id = auth.uid());

-- =====================================================
-- CONVERSATIONS TABLE POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_view_conversations" ON public.conversations;
DROP POLICY IF EXISTS "users_create_conversations" ON public.conversations;
DROP POLICY IF EXISTS "creators_update_conversations" ON public.conversations;
DROP POLICY IF EXISTS "creators_delete_conversations" ON public.conversations;

-- Policy: Users can view conversations they participate in
CREATE POLICY "users_view_conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_participants.conversation_id = conversations.id 
      AND conversation_participants.user_id = auth.uid()
      AND conversation_participants.is_active = true
    )
  );

-- Policy: Authenticated users can create conversations
CREATE POLICY "users_create_conversations" ON public.conversations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (created_by = auth.uid() OR created_by IS NULL)
  );

-- Policy: Conversation creators can update their conversations
CREATE POLICY "creators_update_conversations" ON public.conversations
  FOR UPDATE USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy: Conversation creators can delete their conversations
CREATE POLICY "creators_delete_conversations" ON public.conversations
  FOR DELETE USING (created_by = auth.uid());

-- =====================================================
-- CONVERSATION_PARTICIPANTS TABLE POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "participants_view_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "users_join_conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "users_leave_conversations" ON public.conversation_participants;

-- Policy: Participants can view other participants in the same conversation
CREATE POLICY "participants_view_participants" ON public.conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp 
      WHERE cp.conversation_id = conversation_participants.conversation_id 
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  );

-- Policy: Users can join conversations (create participant record)
CREATE POLICY "users_join_conversations" ON public.conversation_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Policy: Users can update their own participation (e.g., leave conversation)
CREATE POLICY "users_leave_conversations" ON public.conversation_participants
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- MESSAGE_STATUS TABLE POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_view_message_status" ON public.message_status;
DROP POLICY IF EXISTS "users_update_own_status" ON public.message_status;
DROP POLICY IF EXISTS "users_modify_status" ON public.message_status;

-- Policy: Users can view message status in conversations they participate in
CREATE POLICY "users_view_message_status" ON public.message_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_status.message_id
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  );

-- Policy: Users can create their own message status records
CREATE POLICY "users_update_own_status" ON public.message_status
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own message status
CREATE POLICY "users_modify_status" ON public.message_status
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if policies were created successfully
DO $$
BEGIN
  RAISE NOTICE '✅ RLS Policies Created Successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Messages policies: %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'messages');
  RAISE NOTICE 'Conversations policies: %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'conversations');
  RAISE NOTICE 'Conversation participants policies: %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'conversation_participants');
  RAISE NOTICE 'Message status policies: %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'message_status');
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Messaging system is now secured with RLS!';
END $$;
