-- TEST BEZPOŚREDNIEJ REJESTRACJI W SUPABASE
-- Ten SQL przetestuje czy rejestracja działa na poziomie bazy

-- 1. SPRAWDŹ STRUKTURĘ TABEL
SELECT 'STRUCTURE CHECK' as test_type;

SELECT 'encryption_keys columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'encryption_keys' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'users columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. SPRAWDŹ POLICIES
SELECT 'RLS POLICIES CHECK' as test_type;
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename IN ('encryption_keys', 'users')
AND schemaname = 'public';

-- 3. SPRAWDŹ TRIGGERS
SELECT 'TRIGGERS CHECK' as test_type;
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%user%';

-- 4. SPRAWDŹ FUNKCJE
SELECT 'FUNCTIONS CHECK' as test_type;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%user%';

-- 5. TEST PERMISSIONS
SELECT 'PERMISSIONS CHECK' as test_type;
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_name IN ('encryption_keys', 'users')
AND table_schema = 'public'
AND grantee IN ('authenticated', 'anon', 'postgres')
ORDER BY table_name, grantee;

-- 6. SPRAWDŹ CZY MOŻNA STWORZYĆ TESTOWEGO USERA
SELECT 'TEST USER CREATION' as test_type;

-- Spróbuj stworzyć testowy wpis w users
DO $$
DECLARE
  test_id uuid := gen_random_uuid();
BEGIN
  BEGIN
    INSERT INTO public.users (id, username, public_key)
    VALUES (test_id, 'test_user_' || substring(test_id::text, 1, 8), 'test_public_key');
    RAISE NOTICE 'TEST INSERT do users: ✅ SUKCES';
    
    -- Usuń testowy wpis
    DELETE FROM public.users WHERE id = test_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST INSERT do users: ❌ BŁĄD: %', SQLERRM;
  END;
END $$;

-- 7. WYŚWIETL OSTATNIE BŁĘDY Z LOGÓW (jeśli dostępne)
SELECT 'RECENT ERRORS' as test_type;
SELECT message, detail, hint
FROM postgres_log
WHERE message LIKE '%error%' OR message LIKE '%failed%'
ORDER BY log_time DESC
LIMIT 5;
