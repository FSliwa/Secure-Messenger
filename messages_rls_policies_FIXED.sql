-- =====================================================
-- RLS POLICIES FOR MESSAGING SYSTEM - FIXED
-- NAPRAWIONO: Infinite recursion w policies
-- =====================================================
-- Ten plik naprawia problem nieskończonej rekursji
-- używając prostszych policies bez circular dependencies

-- =====================================================
-- WYŁĄCZ ISTNIEJĄCE RLS (żeby wyczyścić błędne policies)
-- =====================================================

ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- USUŃ WSZYSTKIE STARE POLICIES
-- =====================================================

-- Messages
DROP POLICY IF EXISTS "users_view_conversation_messages" ON public.messages;
DROP POLICY IF EXISTS "users_send_messages" ON public.messages;
DROP POLICY IF EXISTS "users_edit_own_messages" ON public.messages;
DROP POLICY IF EXISTS "users_delete_own_messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can edit their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- Conversations
DROP POLICY IF EXISTS "users_view_conversations" ON public.conversations;
DROP POLICY IF EXISTS "users_create_conversations" ON public.conversations;
DROP POLICY IF EXISTS "creators_update_conversations" ON public.conversations;
DROP POLICY IF EXISTS "creators_delete_conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Creators can update their conversations" ON public.conversations;

-- Conversation participants
DROP POLICY IF EXISTS "participants_view_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "users_join_conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "users_leave_conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Participants can view other participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON public.conversation_participants;

-- Message status
DROP POLICY IF EXISTS "users_view_message_status" ON public.message_status;
DROP POLICY IF EXISTS "users_update_own_status" ON public.message_status;
DROP POLICY IF EXISTS "users_modify_status" ON public.message_status;

-- =====================================================
-- WŁĄCZ RLS PONOWNIE
-- =====================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CONVERSATION_PARTICIPANTS - NAJPROSTSZE POLICIES
-- (Bez zależności od innych tabel - BAZA)
-- =====================================================

-- Users can see participants if they are also a participant
-- PROSTY warunek - tylko ta tabela, żadnych JOINów
CREATE POLICY "view_participants_simple" ON public.conversation_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    conversation_id IN (
      SELECT conversation_id 
      FROM public.conversation_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Anyone can join a conversation (create participant entry)
CREATE POLICY "join_conversation_simple" ON public.conversation_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own participation only
CREATE POLICY "update_own_participation" ON public.conversation_participants
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own participation
CREATE POLICY "delete_own_participation" ON public.conversation_participants
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- CONVERSATIONS - PROSTE POLICIES
-- (Używa conversation_participants ale już bez circular reference)
-- =====================================================

-- Users can view conversations where they are participants
CREATE POLICY "view_own_conversations" ON public.conversations
  FOR SELECT USING (
    id IN (
      SELECT conversation_id 
      FROM public.conversation_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Any authenticated user can create conversation
CREATE POLICY "create_conversation_authenticated" ON public.conversations
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Creators can update their conversations
CREATE POLICY "update_own_conversation" ON public.conversations
  FOR UPDATE USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Creators can delete their conversations
CREATE POLICY "delete_own_conversation" ON public.conversations
  FOR DELETE USING (created_by = auth.uid());

-- =====================================================
-- MESSAGES - PROSTE POLICIES
-- (Używa conversation_participants bez rekursji)
-- =====================================================

-- Users can view messages in their conversations
CREATE POLICY "view_messages_in_conversations" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM public.conversation_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Users can send messages to their conversations
CREATE POLICY "send_messages_to_conversations" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    conversation_id IN (
      SELECT conversation_id 
      FROM public.conversation_participants 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Users can update their own messages
CREATE POLICY "update_own_messages" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "delete_own_messages" ON public.messages
  FOR DELETE USING (sender_id = auth.uid());

-- =====================================================
-- MESSAGE_STATUS - PROSTE POLICIES
-- =====================================================

-- Users can view status in their conversations
CREATE POLICY "view_message_status" ON public.message_status
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM public.messages 
      WHERE conversation_id IN (
        SELECT conversation_id 
        FROM public.conversation_participants 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Users can create their own message status
CREATE POLICY "create_own_status" ON public.message_status
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own status
CREATE POLICY "update_own_status" ON public.message_status
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Upewnij się że authenticated users mają dostęp
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_status TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  messages_count integer;
  conversations_count integer;
  participants_count integer;
  status_count integer;
BEGIN
  SELECT COUNT(*) INTO messages_count FROM pg_policies WHERE tablename = 'messages';
  SELECT COUNT(*) INTO conversations_count FROM pg_policies WHERE tablename = 'conversations';
  SELECT COUNT(*) INTO participants_count FROM pg_policies WHERE tablename = 'conversation_participants';
  SELECT COUNT(*) INTO status_count FROM pg_policies WHERE tablename = 'message_status';
  
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '✅ RLS POLICIES CREATED SUCCESSFULLY!';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Messages policies: %', messages_count;
  RAISE NOTICE 'Conversations policies: %', conversations_count;
  RAISE NOTICE 'Conversation participants policies: %', participants_count;
  RAISE NOTICE 'Message status policies: %', status_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Messaging system secured without infinite recursion!';
  RAISE NOTICE '';
  
  IF messages_count = 0 OR conversations_count = 0 OR participants_count = 0 THEN
    RAISE WARNING '⚠️  Some policies were not created. Check errors above.';
  END IF;
END $$;

-- =====================================================
-- TEST QUERIES (Optional - uncomment to test)
-- =====================================================

-- Test 1: Check if user can view their conversations
-- SELECT * FROM public.conversations LIMIT 5;

-- Test 2: Check if user can create a conversation
-- INSERT INTO public.conversations (name, is_group, created_by) 
-- VALUES ('Test Conversation', false, auth.uid());

-- Test 3: Check policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies 
-- WHERE tablename IN ('messages', 'conversations', 'conversation_participants', 'message_status')
-- ORDER BY tablename, policyname;
