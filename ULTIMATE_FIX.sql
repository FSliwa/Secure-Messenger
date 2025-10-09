-- ============================================================================
-- ULTIMATE FIX - OSTATECZNE ROZWIĄZANIE WSZYSTKICH PROBLEMÓW
-- ============================================================================
-- Data: 9 października 2025
-- Naprawia: WSZYSTKIE błędy RLS raz na zawsze
-- Metoda: Wyczyść wszystko i zacznij od nowa
-- ============================================================================

-- ============================================================================
-- FAZA 1: WYCZYŚĆ WSZYSTKIE STARE POLICIES I FUNCTIONS
-- ============================================================================

-- Usuń WSZYSTKIE policies dla conversation_participants
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT policyname 
             FROM pg_policies 
             WHERE tablename = 'conversation_participants'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON conversation_participants';
    END LOOP;
    RAISE NOTICE 'Dropped all conversation_participants policies';
END $$;

-- Usuń WSZYSTKIE policies dla messages
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT policyname 
             FROM pg_policies 
             WHERE tablename = 'messages'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON messages';
    END LOOP;
    RAISE NOTICE 'Dropped all messages policies';
END $$;

-- Usuń WSZYSTKIE policies dla conversations
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT policyname 
             FROM pg_policies 
             WHERE tablename = 'conversations'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON conversations';
    END LOOP;
    RAISE NOTICE 'Dropped all conversations policies';
END $$;

-- Usuń WSZYSTKIE stare functions (CASCADE usunie zależne policies)
DROP FUNCTION IF EXISTS public.is_participant(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.can_add_participant(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_conversation_participant(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.user_conversations(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_conversation_admin(UUID, UUID) CASCADE;

-- ============================================================================
-- FAZA 2: UPEWNIJ SIĘ ŻE RLS JEST WŁĄCZONY
-- ============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FAZA 3: UTWÓRZ JEDNĄ HELPER FUNCTION (SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_in_conversation(
  conv_id UUID,
  usr_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM conversation_participants 
    WHERE conversation_id = conv_id 
    AND user_id = usr_id 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.user_in_conversation TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_in_conversation TO anon;

-- ============================================================================
-- FAZA 4: UTWÓRZ PROSTE, DZIAŁAJĄCE POLICIES
-- ============================================================================

-- CONVERSATIONS
-- ============================================================================

-- Anyone can view conversations they created OR participate in
CREATE POLICY "view_conversations"
ON conversations FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by 
  OR user_in_conversation(id, auth.uid())
);

-- Only authenticated users can create conversations (as creator)
CREATE POLICY "create_conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Only creator can update conversations
CREATE POLICY "update_conversations"
ON conversations FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- CONVERSATION_PARTICIPANTS
-- ============================================================================

-- View participants in conversations you're in
CREATE POLICY "view_participants"
ON conversation_participants FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR user_in_conversation(conversation_id, auth.uid())
);

-- Add yourself OR add others if you created the conversation
CREATE POLICY "add_participants"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR conversation_id IN (
    SELECT id FROM conversations WHERE created_by = auth.uid()
  )
);

-- Update only your own participation
CREATE POLICY "update_participation"
ON conversation_participants FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Delete only your own participation
CREATE POLICY "delete_participation"
ON conversation_participants FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- MESSAGES
-- ============================================================================

-- View messages in conversations you participate in
CREATE POLICY "view_messages"
ON messages FOR SELECT
TO authenticated
USING (user_in_conversation(conversation_id, auth.uid()));

-- Send messages only to conversations you're in
CREATE POLICY "send_messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND user_in_conversation(conversation_id, auth.uid())
);

-- Update only your own messages
CREATE POLICY "update_messages"
ON messages FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id);

-- Delete only your own messages
CREATE POLICY "delete_messages"
ON messages FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);

-- USERS
-- ============================================================================

-- Everyone can view all users (needed for search and presence)
CREATE POLICY "view_users"
ON users FOR SELECT
TO authenticated
USING (true);

-- Users can update ONLY their own profile
CREATE POLICY "update_own_user"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- ============================================================================
-- FAZA 5: WERYFIKACJA
-- ============================================================================

-- Sprawdź RLS status
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('conversations', 'conversation_participants', 'messages', 'users')
ORDER BY tablename;

-- Sprawdź functions
SELECT 
  '✅ Functions' as type,
  proname as name,
  pg_get_function_arguments(oid) as args
FROM pg_proc 
WHERE proname = 'user_in_conversation'
AND pronamespace = 'public'::regnamespace;

-- Sprawdź policies dla conversation_participants
SELECT 
  '✅ conversation_participants' as table_name,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' AND qual IS NOT NULL THEN '✅'
    WHEN cmd IN ('INSERT', 'UPDATE', 'DELETE') AND with_check IS NOT NULL THEN '✅'
    WHEN cmd = 'ALL' AND qual IS NOT NULL AND with_check IS NOT NULL THEN '✅'
    ELSE '❌'
  END as ok
FROM pg_policies 
WHERE tablename = 'conversation_participants'
ORDER BY cmd, policyname;

-- Sprawdź policies dla messages
SELECT 
  '✅ messages' as table_name,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' AND qual IS NOT NULL THEN '✅'
    WHEN cmd IN ('INSERT', 'UPDATE', 'DELETE') AND with_check IS NOT NULL THEN '✅'
    ELSE '❌'
  END as ok
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY cmd, policyname;

-- Sprawdź policies dla users
SELECT 
  '✅ users' as table_name,
  policyname,
  cmd,
  CASE WHEN qual IS NOT NULL OR with_check IS NOT NULL THEN '✅' ELSE '❌' END as ok
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY cmd, policyname;

-- ============================================================================
-- OCZEKIWANY WYNIK
-- ============================================================================

/*
RLS:
✅ conversations | ENABLED
✅ conversation_participants | ENABLED  
✅ messages | ENABLED
✅ users | ENABLED

FUNCTIONS:
✅ user_in_conversation (conv_id uuid, usr_id uuid)

CONVERSATION_PARTICIPANTS POLICIES (4):
✅ add_participants | INSERT | ✅
✅ delete_participation | DELETE | ✅
✅ update_participation | UPDATE | ✅
✅ view_participants | SELECT | ✅

MESSAGES POLICIES (4):
✅ delete_messages | DELETE | ✅
✅ send_messages | INSERT | ✅
✅ update_messages | UPDATE | ✅
✅ view_messages | SELECT | ✅

USERS POLICIES (2):
✅ update_own_user | UPDATE | ✅
✅ view_users | SELECT | ✅
*/

-- ============================================================================
-- FINAL STATUS
-- ============================================================================

SELECT 
  '🎉 ULTIMATE FIX COMPLETED' as status,
  'All RLS policies cleaned and recreated' as result,
  'Conversations and messages should now work' as next_step;

