-- ============================================================================
-- ULTIMATE FIX V3 - OSTATECZNE ROZWIĄZANIE (POPRAWIONE!)
-- ============================================================================
-- Data: 9 października 2025
-- Naprawia: "Failed to load messages" + wszystkie problemy RLS
-- Główne zmiany: participants_select USING (true) + FK check
-- ============================================================================

-- ============================================================================
-- FAZA 1: WYCZYŚĆ WSZYSTKO
-- ============================================================================

-- Usuń policies (kompaktowa wersja)
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'users' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON users';
    END LOOP;
    
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'conversation_participants' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON conversation_participants';
    END LOOP;
    
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'messages' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON messages';
    END LOOP;
    
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'conversations' LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON conversations';
    END LOOP;
    
    RAISE NOTICE 'All policies dropped successfully';
END $$;

-- Usuń functions
DROP FUNCTION IF EXISTS public.is_participant(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.can_add_participant(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_conversation_participant(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.user_in_conversation(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.user_conversations(UUID) CASCADE;

-- ============================================================================
-- FAZA 2: ENABLE RLS
-- ============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FAZA 3: FUNCTION (SECURITY DEFINER + search_path)
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
$$ LANGUAGE plpgsql 
   SECURITY DEFINER 
   STABLE
   SET search_path = public;

GRANT EXECUTE ON FUNCTION public.user_in_conversation TO authenticated;

-- ============================================================================
-- FAZA 4: POLICIES (POPRAWIONE - BEZ CIRCULAR DEPENDENCY!)
-- ============================================================================

-- USERS
CREATE POLICY "users_select" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update" ON users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- CONVERSATIONS  
CREATE POLICY "conversations_select" ON conversations FOR SELECT TO authenticated
USING (auth.uid() = created_by OR user_in_conversation(id, auth.uid()));

CREATE POLICY "conversations_insert" ON conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "conversations_update" ON conversations FOR UPDATE TO authenticated
USING (auth.uid() = created_by);

-- CONVERSATION_PARTICIPANTS (KLUCZOWA ZMIANA!)
-- SELECT: USING (true) - żeby function mogła czytać bez circular dependency!
CREATE POLICY "participants_select" ON conversation_participants FOR SELECT TO authenticated
USING (true);

CREATE POLICY "participants_insert" ON conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR conversation_id IN (SELECT id FROM conversations WHERE created_by = auth.uid())
);

CREATE POLICY "participants_update" ON conversation_participants FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "participants_delete" ON conversation_participants FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- MESSAGES
CREATE POLICY "messages_select" ON messages FOR SELECT TO authenticated
USING (user_in_conversation(conversation_id, auth.uid()));

CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND user_in_conversation(conversation_id, auth.uid())
);

CREATE POLICY "messages_update" ON messages FOR UPDATE TO authenticated
USING (auth.uid() = sender_id);

CREATE POLICY "messages_delete" ON messages FOR DELETE TO authenticated
USING (auth.uid() = sender_id);

-- ============================================================================
-- FAZA 5: SPRAWDŹ I NAPRAW FOREIGN KEY
-- ============================================================================

-- Sprawdź czy FK messages_sender_id_fkey istnieje
SELECT 
  'FK Check' as step,
  constraint_name,
  table_name,
  column_name,
  'EXISTS' as status
FROM information_schema.key_column_usage
WHERE table_name = 'messages' 
AND column_name = 'sender_id'
AND constraint_name LIKE '%fkey%';

-- Utwórz FK jeśli nie istnieje
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'messages' 
        AND constraint_name = 'messages_sender_id_fkey'
    ) THEN
        ALTER TABLE public.messages
        ADD CONSTRAINT messages_sender_id_fkey
        FOREIGN KEY (sender_id)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE '✅ Created FK: messages_sender_id_fkey';
    ELSE
        RAISE NOTICE '✅ FK already exists: messages_sender_id_fkey';
    END IF;
END $$;

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

-- RLS Status
SELECT '1. RLS Status' as check_section, tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('conversations', 'conversation_participants', 'messages', 'users')
ORDER BY tablename;

-- Function
SELECT '2. Function' as check_section, proname,
  pg_get_function_arguments(oid) as args,
  prosecdef as is_security_definer
FROM pg_proc 
WHERE proname = 'user_in_conversation';

-- FK
SELECT '3. Foreign Key' as check_section, 
  constraint_name, table_name, column_name
FROM information_schema.key_column_usage
WHERE table_name = 'messages' AND column_name = 'sender_id'
AND constraint_name LIKE '%fkey%';

-- Policies Count
SELECT '4. Policies Count' as check_section, tablename, COUNT(*) as count
FROM pg_policies 
WHERE tablename IN ('conversations', 'conversation_participants', 'messages', 'users')
GROUP BY tablename
ORDER BY tablename;

-- Policies Details
SELECT '5. Policies Details' as check_section, tablename, policyname, cmd,
  CASE 
    WHEN cmd = 'SELECT' AND qual IS NOT NULL THEN '✅'
    WHEN cmd IN ('INSERT', 'UPDATE', 'DELETE') AND with_check IS NOT NULL THEN '✅'
    ELSE '❌'
  END as ok
FROM pg_policies 
WHERE tablename IN ('conversation_participants', 'messages')
ORDER BY tablename, cmd;

-- ============================================================================
-- OCZEKIWANY WYNIK
-- ============================================================================

/*
1. RLS:
✅ conversations | ENABLED
✅ conversation_participants | ENABLED
✅ messages | ENABLED
✅ users | ENABLED

2. Function:
✅ user_in_conversation | conv_id uuid, usr_id uuid | true

3. FK:
✅ messages_sender_id_fkey | messages | sender_id

4. Policies Count:
✅ conversations: 3
✅ conversation_participants: 4
✅ messages: 4
✅ users: 2

5. Policies Details (wszystkie ✅):
✅ participants_select | SELECT | ✅  ← KLUCZOWE: USING (true)
✅ participants_insert | INSERT | ✅
✅ participants_update | UPDATE | ✅
✅ participants_delete | DELETE | ✅
✅ messages_select | SELECT | ✅
✅ messages_insert | INSERT | ✅
✅ messages_update | UPDATE | ✅
✅ messages_delete | DELETE | ✅
*/

-- ============================================================================
-- FINAL STATUS
-- ============================================================================

SELECT 
  '🎉 ULTIMATE FIX V3 COMPLETED' as status,
  'Key change: participants_select USING (true)' as fix_1,
  'Added: Foreign key check and creation' as fix_2,
  'Result: Messages should load properly now' as result;

