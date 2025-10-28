-- ============================================================================
-- FINAL FIX: Supabase Schema Cache + Conversation Loading
-- ============================================================================
-- Problem 1: "Could not find a relationship between 'conversation_participants' and 'users'" (Error PGRST200)
-- Problem 2: Status/Conversations not loading due to the above error.
--
-- Solution:
-- 1. Explicitly drop and recreate the foreign key constraint to force a schema cache refresh in Supabase.
-- 2. Grant USAGE on schema auth to the authenticated role to ensure relationships are visible.
-- ============================================================================

-- Step 1: Grant necessary permissions
-- This ensures the 'authenticated' role can see the relationship to the 'auth.users' table.
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Step 2: Force refresh the foreign key relationship
-- This is the most critical step to fix the PGRST200 error.
-- We drop the existing constraint and re-add it with the exact same definition.
-- This action forces Supabase to re-evaluate and cache the schema relationship correctly.
ALTER TABLE public.conversation_participants
DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey;

ALTER TABLE public.conversation_participants
ADD CONSTRAINT conversation_participants_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Step 3: Optional but recommended - Recreate Foreign Key to public.users as well if it's missing
-- Sometimes the intended relationship is to public.users, not auth.users for queries.
-- This ensures both are present and valid.
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_id_fkey;

ALTER TABLE public.users
ADD CONSTRAINT users_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id)
ON DELETE CASCADE;


-- Verification Step: Check if the constraints are now visible in the information schema
SELECT
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name='conversation_participants';


SELECT '✅ FINAL FIX SCRIPT APPLIED. Please hard refresh the application (Ctrl+Shift+R).' as status;
