-- =====================================================
-- ULTIMATE FIX: SECURITY DEFINER Functions (POPRAWIONE)
-- =====================================================

-- STEP 1: Create functions (bypass RLS for queries)
CREATE OR REPLACE FUNCTION is_participant(conv_id uuid, check_user_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_id = conv_id 
    AND user_id = check_user_id AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION user_conversations(check_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT conversation_id FROM public.conversation_participants
  WHERE user_id = check_user_id AND is_active = true;
$$;

GRANT EXECUTE ON FUNCTION is_participant TO authenticated;
GRANT EXECUTE ON FUNCTION user_conversations TO authenticated;

-- STEP 2: Drop ALL old policies (POPRAWIONE)
DO $$
DECLARE r RECORD;
BEGIN
  -- Poprawione: używamy pełnych kolumn z pg_policies
  FOR r IN SELECT tablename, policyname FROM pg_policies 
           WHERE schemaname = 'public' 
           AND tablename IN ('messages', 'conversations', 'conversation_participants', 'message_status') 
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- STEP 3: Create simple policies using functions
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_participation" ON conversation_participants
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "own_conversations" ON conversations
  FOR ALL USING (id IN (SELECT user_conversations(auth.uid())));

CREATE POLICY "conversation_messages" ON messages
  FOR ALL USING (is_participant(conversation_id, auth.uid()));

CREATE POLICY "own_status" ON message_status
  FOR ALL USING (user_id = auth.uid());

GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversation_participants TO authenticated;
GRANT ALL ON public.message_status TO authenticated;

-- STEP 4: Weryfikacja
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('messages', 'conversations', 'conversation_participants', 'message_status')
ORDER BY tablename, policyname;
