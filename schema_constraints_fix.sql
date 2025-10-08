-- =====================================================
-- SCHEMA CONSTRAINTS FIX
-- Naprawia brakujące Foreign Keys i inne inconsistencies
-- =====================================================

-- =====================================================
-- 1. DODAJ BRAKUJĄCE FOREIGN KEYS
-- =====================================================

-- conversation_access_sessions → conversations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'conversation_access_sessions_conversation_id_fkey'
  ) THEN
    ALTER TABLE public.conversation_access_sessions 
    ADD CONSTRAINT conversation_access_sessions_conversation_id_fkey 
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added FK: conversation_access_sessions → conversations';
  ELSE
    RAISE NOTICE 'ℹ️  FK already exists: conversation_access_sessions → conversations';
  END IF;
END $$;

-- conversation_passwords → conversations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'conversation_passwords_conversation_id_fkey'
  ) THEN
    ALTER TABLE public.conversation_passwords 
    ADD CONSTRAINT conversation_passwords_conversation_id_fkey 
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added FK: conversation_passwords → conversations';
  ELSE
    RAISE NOTICE 'ℹ️  FK already exists: conversation_passwords → conversations';
  END IF;
END $$;

-- conversation_password_attempts → conversations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'conversation_password_attempts_conversation_id_fkey'
  ) THEN
    ALTER TABLE public.conversation_password_attempts 
    ADD CONSTRAINT conversation_password_attempts_conversation_id_fkey 
    FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added FK: conversation_password_attempts → conversations';
  ELSE
    RAISE NOTICE 'ℹ️  FK already exists: conversation_password_attempts → conversations';
  END IF;
END $$;

-- message_attachments → messages
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'message_attachments_message_id_fkey'
  ) THEN
    ALTER TABLE public.message_attachments 
    ADD CONSTRAINT message_attachments_message_id_fkey 
    FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added FK: message_attachments → messages';
  ELSE
    RAISE NOTICE 'ℹ️  FK already exists: message_attachments → messages';
  END IF;
END $$;

-- =====================================================
-- 2. NAPRAW users.public_key DEFAULT
-- =====================================================

DO $$ 
BEGIN
  -- Usuń problematyczny DEFAULT ''::text
  -- Pusty string nie jest valid encryption key
  ALTER TABLE public.users 
  ALTER COLUMN public_key DROP DEFAULT;
  
  RAISE NOTICE '✅ Removed invalid DEFAULT for users.public_key';
EXCEPTION
  WHEN undefined_column THEN
    RAISE NOTICE 'ℹ️  Column public_key already has no DEFAULT';
  WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️  Could not modify public_key DEFAULT (may already be correct)';
END $$;

-- =====================================================
-- 3. DODAJ BRAKUJĄCE KOLUMNY (jeśli potrzebne)
-- =====================================================

-- Sprawdź czy conversations.access_code ma UNIQUE constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'conversations_access_code_key'
    AND table_name = 'conversations'
  ) THEN
    -- Dodaj UNIQUE constraint dla access_code
    ALTER TABLE public.conversations 
    ADD CONSTRAINT conversations_access_code_key UNIQUE (access_code);
    RAISE NOTICE '✅ Added UNIQUE constraint for conversations.access_code';
  ELSE
    RAISE NOTICE 'ℹ️  UNIQUE constraint already exists for access_code';
  END IF;
END $$;

-- =====================================================
-- 4. WERYFIKACJA INTEGRALNOŚCI
-- =====================================================

DO $$
DECLARE
  fk_count integer;
BEGIN
  -- Policz wszystkie FK constraints
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public';
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '✅ SCHEMA CONSTRAINTS FIXED!';
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Foreign Keys: %', fk_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed:';
  RAISE NOTICE '  ✅ conversation_access_sessions FK';
  RAISE NOTICE '  ✅ conversation_passwords FK';
  RAISE NOTICE '  ✅ conversation_password_attempts FK';
  RAISE NOTICE '  ✅ message_attachments FK';
  RAISE NOTICE '  ✅ users.public_key DEFAULT';
  RAISE NOTICE '  ✅ conversations.access_code UNIQUE';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Database integrity improved!';
END $$;

-- =====================================================
-- 5. SPRAWDŹ WSZYSTKIE FOREIGN KEYS (Debug)
-- =====================================================

-- Uncomment żeby zobaczyć wszystkie FK:
-- SELECT 
--   tc.table_name, 
--   tc.constraint_name, 
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
--   AND tc.table_schema = kcu.table_schema
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
--   AND ccu.table_schema = tc.table_schema
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
--   AND tc.table_schema = 'public'
-- ORDER BY tc.table_name, tc.constraint_name;
