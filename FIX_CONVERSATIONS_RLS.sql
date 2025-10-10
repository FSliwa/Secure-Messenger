-- ============================================================================
--  FIX: Conversations RLS Policy + User Status
-- ============================================================================
-- Problem 1: "new row violates row-level security policy for table conversations"
-- Problem 2: Status użytkownika (online/offline) nie działa
-- ============================================================================

-- 1. FIX CONVERSATIONS RLS POLICIES
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS conversations_insert ON conversations;
DROP POLICY IF EXISTS conversations_select ON conversations;
DROP POLICY IF EXISTS conversations_update ON conversations;
DROP POLICY IF EXISTS conversations_delete ON conversations;

-- Create new policies with proper permissions

-- INSERT: User can create conversations
CREATE POLICY conversations_insert
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- SELECT: User can view conversations they're participating in
CREATE POLICY conversations_select
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid() 
      AND is_active = true
    )
  );

-- UPDATE: Only creator can update conversation details
CREATE POLICY conversations_update
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE: Only creator can delete (soft delete via is_active in participants)
CREATE POLICY conversations_delete
  ON conversations
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- 2. FIX USER STATUS UPDATES
-- ============================================================================

-- Drop old status update policies if exist
DROP POLICY IF EXISTS users_update_own_status ON users;
DROP POLICY IF EXISTS users_update ON users;

-- Recreate users policies with status update support

-- SELECT: All authenticated users can view other users
CREATE POLICY users_select
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Only during registration (handled by trigger)
CREATE POLICY users_insert
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- UPDATE: Users can update their own profile and status
CREATE POLICY users_update
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE: Users can delete their own profile
CREATE POLICY users_delete
  ON users
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());

-- 3. CREATE STATUS UPDATE FUNCTION (for automatic updates)
-- ============================================================================

-- Function to automatically update user status to online on login
CREATE OR REPLACE FUNCTION public.update_user_status_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update user status to online and last_seen
  UPDATE users
  SET 
    status = 'online',
    last_seen = NOW(),
    updated_at = NOW()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Trigger on login_sessions insert (when user logs in)
DROP TRIGGER IF EXISTS trigger_update_status_on_login ON login_sessions;
CREATE TRIGGER trigger_update_status_on_login
  AFTER INSERT ON login_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_status_on_activity();

-- 4. CREATE STATUS UPDATE HELPER FUNCTION (for manual calls)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_user_status(
  p_user_id UUID,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate status value
  IF p_status NOT IN ('online', 'offline', 'away') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be online, offline, or away', p_status;
  END IF;
  
  -- Verify user is updating their own status
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot update status for other users';
  END IF;
  
  -- Update status
  UPDATE users
  SET 
    status = p_status,
    last_seen = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- 5. VERIFICATION QUERIES
-- ============================================================================

-- Verify conversations policies
SELECT 
  'Conversations Policies' as check_type,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'conversations';

-- Verify users policies
SELECT 
  'Users Policies' as check_type,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'users';

-- Verify functions exist
SELECT 
  'Status Functions' as check_type,
  COUNT(*) as function_count
FROM pg_proc
WHERE proname IN ('update_user_status_on_activity', 'set_user_status');

-- Show all conversations policies
SELECT 
  '📋 Conversations Policies' as section,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'conversations'
ORDER BY policyname;

-- Show all users policies
SELECT 
  '📋 Users Policies' as section,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'users'
ORDER BY policyname;

-- Final status
SELECT '✅ FIX COMPLETE' as status,
       'Conversations RLS fixed + User status tracking enabled' as result;

