-- =====================================================
-- DEBUG: Sprawdzenie co brakuje w bazie danych
-- =====================================================

-- 1. Sprawdź czy istnieje tabela encryption_keys
SELECT 
  'Tabela encryption_keys' as item,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'encryption_keys' AND table_schema = 'public') as exists
UNION ALL
-- 2. Sprawdź czy istnieją kolumny w users
SELECT 
  'Kolumna email w users',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email' AND table_schema = 'public')
UNION ALL
SELECT 
  'Kolumna bio w users',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'bio' AND table_schema = 'public')
UNION ALL
SELECT 
  'Kolumna privacy_settings w users',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'privacy_settings' AND table_schema = 'public')
UNION ALL
-- 3. Sprawdź trigger
SELECT 
  'Trigger handle_new_user',
  EXISTS(SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created')
UNION ALL
-- 4. Sprawdź RLS
SELECT 
  'RLS dla encryption_keys',
  EXISTS(SELECT 1 FROM pg_policies WHERE tablename = 'encryption_keys' AND schemaname = 'public');

-- =====================================================
-- QUICK FIX: Minimalne wymagania do rejestracji
-- =====================================================

-- Jeśli brakuje tylko tabeli encryption_keys, uruchom to:
CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  public_key text NOT NULL DEFAULT '',
  encrypted_private_key text NOT NULL DEFAULT '',
  key_type text DEFAULT 'RSA-2048' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- RLS dla encryption_keys
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own keys" ON public.encryption_keys;
CREATE POLICY "Users can manage own keys" ON public.encryption_keys
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Uprawnienia
GRANT ALL ON public.encryption_keys TO authenticated;

-- Dodaj brakujące kolumny do users (jeśli nie istnieją)
DO $$ 
BEGIN
  -- Dodaj email jeśli brakuje
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'email') THEN
    ALTER TABLE public.users ADD COLUMN email text;
  END IF;
  
  -- Dodaj bio jeśli brakuje
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'bio') THEN
    ALTER TABLE public.users ADD COLUMN bio text;
  END IF;
  
  -- Dodaj privacy_settings jeśli brakuje
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'privacy_settings') THEN
    ALTER TABLE public.users ADD COLUMN privacy_settings jsonb DEFAULT '{"last_seen": true, "read_receipts": true, "typing_indicators": true, "profile_visibility": "everyone"}'::jsonb;
  END IF;
  
  -- Dodaj notification_preferences jeśli brakuje
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'users' AND column_name = 'notification_preferences') THEN
    ALTER TABLE public.users ADD COLUMN notification_preferences jsonb DEFAULT '{"messages": true, "group_invites": true, "friend_requests": true, "security_alerts": true}'::jsonb;
  END IF;
END $$;

-- =====================================================
-- TEST: Sprawdź czy możesz teraz utworzyć użytkownika
-- =====================================================

-- Po uruchomieniu tego SQL, spróbuj ponownie się zarejestrować
