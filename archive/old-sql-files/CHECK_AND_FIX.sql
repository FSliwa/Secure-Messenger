-- SPRAWDZENIE I NAPRAWA
-- Ten SQL sprawdzi co istnieje i naprawi tylko to czego brakuje

-- 1. SPRAWDŹ CO ISTNIEJE
SELECT 
  'Tabela encryption_keys' as element,
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'encryption_keys' AND table_schema = 'public') 
       THEN '✅ Istnieje' ELSE '❌ Brak' END as status
UNION ALL
SELECT 
  'Policy dla encryption_keys',
  CASE WHEN EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'encryption_keys' AND schemaname = 'public') 
       THEN '✅ Istnieje' ELSE '❌ Brak' END
UNION ALL
SELECT 
  'Kolumna email w users',
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email' AND table_schema = 'public')
       THEN '✅ Istnieje' ELSE '❌ Brak' END
UNION ALL
SELECT 
  'Kolumna bio w users',
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'bio' AND table_schema = 'public')
       THEN '✅ Istnieje' ELSE '❌ Brak' END
UNION ALL
SELECT 
  'Kolumna privacy_settings w users',
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'privacy_settings' AND table_schema = 'public')
       THEN '✅ Istnieje' ELSE '❌ Brak' END
UNION ALL
SELECT 
  'Kolumna notification_preferences w users',
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'notification_preferences' AND table_schema = 'public')
       THEN '✅ Istnieje' ELSE '❌ Brak' END;

-- 2. DODAJ TYLKO BRAKUJĄCE KOLUMNY
DO $$ 
BEGIN
  -- Dodaj email jeśli brakuje
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'email' AND table_schema = 'public') THEN
    ALTER TABLE public.users ADD COLUMN email text;
    RAISE NOTICE 'Dodano kolumnę email';
  END IF;
  
  -- Dodaj bio jeśli brakuje
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'bio' AND table_schema = 'public') THEN
    ALTER TABLE public.users ADD COLUMN bio text;
    RAISE NOTICE 'Dodano kolumnę bio';
  END IF;
  
  -- Dodaj privacy_settings jeśli brakuje
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'privacy_settings' AND table_schema = 'public') THEN
    ALTER TABLE public.users ADD COLUMN privacy_settings jsonb DEFAULT '{"last_seen": true, "read_receipts": true, "typing_indicators": true, "profile_visibility": "everyone"}'::jsonb;
    RAISE NOTICE 'Dodano kolumnę privacy_settings';
  END IF;
  
  -- Dodaj notification_preferences jeśli brakuje
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'notification_preferences' AND table_schema = 'public') THEN
    ALTER TABLE public.users ADD COLUMN notification_preferences jsonb DEFAULT '{"messages": true, "group_invites": true, "friend_requests": true, "security_alerts": true}'::jsonb;
    RAISE NOTICE 'Dodano kolumnę notification_preferences';
  END IF;
END $$;

-- 3. SPRAWDŹ STRUKTURĘ TABELI encryption_keys
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'encryption_keys' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. SPRAWDŹ CZY MOŻNA WSTAWIĆ REKORD (TEST)
-- To pokaże dokładny błąd jeśli coś jest nie tak
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Znajdź pierwszego użytkownika do testu
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Spróbuj wstawić testowy rekord
    BEGIN
      INSERT INTO public.encryption_keys (user_id, public_key, encrypted_private_key)
      VALUES (test_user_id, 'test_public_key', 'test_private_key')
      ON CONFLICT (user_id) DO NOTHING;
      RAISE NOTICE 'Test INSERT do encryption_keys: SUKCES';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Test INSERT do encryption_keys BŁĄD: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Brak użytkowników w auth.users do testu';
  END IF;
END $$;

-- 5. SPRAWDŹ UPRAWNIENIA
SELECT 
  grantee,
  privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'encryption_keys'
AND table_schema = 'public'
AND grantee IN ('authenticated', 'anon');

-- KONIEC - sprawdź wyniki powyżej!
