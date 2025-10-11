-- ============================================================================
-- QUICK FIX - EXECUTE THIS IN SUPABASE SQL EDITOR
-- ============================================================================
-- Naprawia: RLS dla conversations + Status użytkownika
-- Czas wykonania: 2-3 sekundy
-- ============================================================================

-- 1. Drop old policies
DROP POLICY IF EXISTS conversations_insert ON conversations;
DROP POLICY IF EXISTS conversations_select ON conversations;
DROP POLICY IF EXISTS conversations_update ON conversations;
DROP POLICY IF EXISTS conversations_delete ON conversations;
DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_insert ON users;
DROP POLICY IF EXISTS users_update ON users;
DROP POLICY IF EXISTS users_delete ON users;
DROP POLICY IF EXISTS view_users ON users;

-- 2. Create conversations policies
CREATE POLICY conversations_insert ON conversations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY conversations_select ON conversations FOR SELECT TO authenticated USING (id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY conversations_update ON conversations FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY conversations_delete ON conversations FOR DELETE TO authenticated USING (created_by = auth.uid());

-- 3. Create users policies
CREATE POLICY users_select ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY users_insert ON users FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY users_update ON users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY users_delete ON users FOR DELETE TO authenticated USING (id = auth.uid());

-- 4. Create status function
CREATE OR REPLACE FUNCTION public.set_user_status(p_user_id UUID, p_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN
  IF p_status NOT IN ('online', 'offline', 'away') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  IF p_user_id != auth.uid() THEN RAISE EXCEPTION 'Cannot update status for other users'; END IF;
  UPDATE users SET status = p_status, last_seen = NOW(), updated_at = NOW() WHERE id = p_user_id;
END; $$;

-- 5. Verify
SELECT 'conversations' as table_name, COUNT(*) as policies FROM pg_policies WHERE tablename = 'conversations'
UNION ALL
SELECT 'users' as table_name, COUNT(*) as policies FROM pg_policies WHERE tablename = 'users';

-- Success message
SELECT '✅ QUICK FIX COMPLETE - Refresh aplikacji (Ctrl+Shift+R)' as status;

