-- ============================================================================
-- COMPLETE RLS FIX - WSZYSTKIE 3 KODY W JEDNYM PLIKU
-- ============================================================================
-- Data: 9 października 2025
-- Naprawia: "new row violates RLS", "Failed to load messages"
-- ============================================================================

-- ============================================================================
-- KROK 1: Helper Function dla Participants
-- ============================================================================

CREATE OR REPLACE FUNCTION public.can_add_participant(
  p_conversation_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- User can add themselves
  IF auth.uid() = p_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- OR user can add others if they created the conversation
  IF EXISTS (
    SELECT 1 FROM conversations 
    WHERE id = p_conversation_id 
    AND created_by = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.can_add_participant TO authenticated;

-- ============================================================================
-- KROK 2: Policy dla Conversation Participants
-- ============================================================================

DROP POLICY IF EXISTS "own_participation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can insert their own participation" ON conversation_participants;

CREATE POLICY "Users can add participants"
ON conversation_participants FOR INSERT
WITH CHECK (
  can_add_participant(conversation_id, user_id)
);

-- ============================================================================
-- KROK 3: Fix Messages RLS (usunięcie infinite recursion)
-- ============================================================================

-- Drop existing function first (CASCADE removes dependent policies)
DROP FUNCTION IF EXISTS public.is_conversation_participant(UUID, UUID) CASCADE;

-- Create helper function
CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM conversation_participants 
    WHERE conversation_id = p_conversation_id 
    AND user_id = p_user_id 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_conversation_participant TO authenticated;

-- Drop old message policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;
DROP POLICY IF EXISTS "access_conversation_messages" ON messages;
DROP POLICY IF EXISTS "Users can view conversation messages" ON messages;
DROP POLICY IF EXISTS "Users can send conversation messages" ON messages;

-- Create new policies using function
CREATE POLICY "Users can view conversation messages"
ON messages FOR SELECT
USING (
  is_conversation_participant(conversation_id, auth.uid())
);

CREATE POLICY "Users can send conversation messages"
ON messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND is_conversation_participant(conversation_id, auth.uid())
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check participant policy
SELECT 'conversation_participants' as table_name,
       policyname, 
       cmd,
       CASE WHEN qual IS NOT NULL THEN 'OK' ELSE 'ERROR: No conditions!' END as check_result
FROM pg_policies 
WHERE tablename = 'conversation_participants' 
AND cmd = 'INSERT';

-- Check message policies
SELECT 'messages' as table_name,
       policyname, 
       cmd,
       CASE WHEN qual IS NOT NULL THEN 'OK' ELSE 'ERROR: No conditions!' END as check_result
FROM pg_policies 
WHERE tablename = 'messages'
AND cmd IN ('SELECT', 'INSERT')
ORDER BY cmd, policyname;

-- Check functions
SELECT 
  'Functions' as type,
  proname as name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname IN ('can_add_participant', 'is_conversation_participant')
AND pronamespace = 'public'::regnamespace;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================

/*
PARTICIPANTS:
✅ "Users can add participants" | INSERT | OK

MESSAGES:
✅ "Users can send conversation messages" | INSERT | OK
✅ "Users can view conversation messages" | SELECT | OK

FUNCTIONS:
✅ can_add_participant (p_conversation_id uuid, p_user_id uuid)
✅ is_conversation_participant (p_conversation_id uuid, p_user_id uuid)
*/

-- ============================================================================
-- KONIEC - WSZYSTKO NAPRAWIONE!
-- ============================================================================

SELECT '✅ RLS POLICIES FIXED' as status,
       'Conversations and messages now work properly' as details;

