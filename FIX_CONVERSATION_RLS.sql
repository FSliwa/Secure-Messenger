-- ============================================================================
-- FIX: RLS POLICY FOR CONVERSATIONS
-- ============================================================================
-- Data: 9 października 2025
-- Problem: "new row violates row-level security policy for table conversations"
-- Rozwiązanie: Pozwól dodawać innych uczestników jeśli jesteś twórcą konwersacji
-- ============================================================================

-- Drop old restrictive policy
DROP POLICY IF EXISTS "Users can insert their own participation" ON conversation_participants;

-- New policy - allows adding others if you created the conversation
CREATE POLICY "Users can add participants to their conversations" 
ON conversation_participants FOR INSERT 
WITH CHECK (
  -- You can add yourself
  auth.uid() = user_id 
  OR
  -- OR you can add others if you created the conversation
  conversation_id IN (
    SELECT id FROM conversations WHERE created_by = auth.uid()
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 
    policyname, 
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'Has conditions'
        ELSE 'No conditions'
    END as conditions
FROM pg_policies 
WHERE tablename = 'conversation_participants' 
AND cmd = 'INSERT'
ORDER BY policyname;

-- ============================================================================
-- EXPECTED RESULT:
-- ============================================================================
/*
Should show:
policyname: "Users can add participants to their conversations"
cmd: "INSERT"
conditions: "Has conditions"

This allows:
✅ User A can add themselves to conversation
✅ User A (creator) can add User B to conversation
✅ createDirectMessage() works - adds both users automatically
*/

-- ============================================================================
-- KONIEC
-- ============================================================================

SELECT '✅ RLS POLICY FIXED' as status,
       'Users can now add others to conversations they created' as details;

