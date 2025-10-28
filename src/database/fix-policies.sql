-- FIXED SCHEMA: TRUE FIX for infinite recursion in RLS policies
-- Uses SECURITY DEFINER functions to break circular dependencies
-- This is the PostgreSQL recommended approach for complex RLS scenarios

-- =====================================================
-- STEP 1: Create helper functions (SECURITY DEFINER)
-- =====================================================

-- Function to check if user is participant (bypasses RLS)
CREATE OR REPLACE FUNCTION is_participant(conv_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id 
    AND user_id = check_user_id
    AND is_active = true
  );
$$;

-- Function to get user's conversation IDs (bypasses RLS)
CREATE OR REPLACE FUNCTION user_conversations(check_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT conversation_id 
  FROM public.conversation_participants
  WHERE user_id = check_user_id 
  AND is_active = true;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_participant TO authenticated;
GRANT EXECUTE ON FUNCTION user_conversations TO authenticated;

-- =====================================================
-- STEP 2: Drop all existing problematic policies
-- =====================================================

DROP POLICY IF EXISTS "Users can access their conversation participation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can access messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can access message status" ON message_status;
DROP POLICY IF EXISTS "Users can access conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can manage their own participation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Users can manage their own message status" ON message_status;
DROP POLICY IF EXISTS "Message senders can view status of their messages" ON message_status;

-- =====================================================
-- STEP 3: Create NEW policies using SECURITY DEFINER functions
-- (NO RECURSION - functions bypass RLS!)
-- =====================================================

-- CONVERSATION_PARTICIPANTS: Simple own records only
CREATE POLICY "manage_own_participation" ON conversation_participants
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- CONVERSATIONS: Use function (no recursion!)
CREATE POLICY "access_own_conversations" ON conversations
  FOR ALL USING (
    id IN (SELECT user_conversations(auth.uid()))
  );

-- MESSAGES: Use function (no recursion!)
CREATE POLICY "access_conversation_messages" ON messages
  FOR ALL USING (
    is_participant(conversation_id, auth.uid())
  );

-- MESSAGE_STATUS: Simple own records
CREATE POLICY "manage_own_status" ON message_status
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());