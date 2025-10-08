-- =====================================================
-- NAPRAW REJESTRACJĘ I BRAKUJĄCE TABELE
-- =====================================================

-- 1. UTWÓRZ BRAKUJĄCĄ TABELĘ encryption_keys
CREATE TABLE IF NOT EXISTS public.encryption_keys (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  public_key text NOT NULL,
  encrypted_private_key text NOT NULL,
  key_type text DEFAULT 'RSA-2048' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. DODAJ BRAKUJĄCE KOLUMNY DO users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS privacy_settings jsonb DEFAULT '{"last_seen": true, "read_receipts": true, "typing_indicators": true, "profile_visibility": "everyone"}'::jsonb,
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"messages": true, "group_invites": true, "friend_requests": true, "security_alerts": true}'::jsonb;

-- 3. UTWÓRZ INDEKSY
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_user ON public.encryption_keys(user_id);

-- 4. WŁĄCZ RLS DLA encryption_keys
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

-- 5. UTWÓRZ POLICIES DLA encryption_keys
CREATE POLICY "Users can view own keys" ON public.encryption_keys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own keys" ON public.encryption_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own keys" ON public.encryption_keys
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own keys" ON public.encryption_keys
  FOR DELETE USING (user_id = auth.uid());

-- 6. NADAJ UPRAWNIENIA
GRANT ALL ON public.encryption_keys TO authenticated;

-- 7. UTWÓRZ TRIGGER DO AUTOMATYCZNEGO TWORZENIA PROFILU
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Utwórz profil użytkownika
  INSERT INTO public.users (id, username, email, display_name, public_key)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'public_key', '')
  );
  
  -- Jeśli są klucze, zapisz je
  IF new.raw_user_meta_data->>'public_key' IS NOT NULL AND new.raw_user_meta_data->>'encrypted_private_key' IS NOT NULL THEN
    INSERT INTO public.encryption_keys (user_id, public_key, encrypted_private_key)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'public_key',
      new.raw_user_meta_data->>'encrypted_private_key'
    );
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. USUŃ STARY TRIGGER JEŚLI ISTNIEJE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 9. UTWÓRZ NOWY TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. NAPRAW ISTNIEJĄCYCH UŻYTKOWNIKÓW BEZ KLUCZY
INSERT INTO public.encryption_keys (user_id, public_key, encrypted_private_key, key_type)
SELECT 
  u.id,
  COALESCE(u.public_key, 'PLACEHOLDER_PUBLIC_KEY'),
  'PLACEHOLDER_PRIVATE_KEY',
  'RSA-2048'
FROM public.users u
LEFT JOIN public.encryption_keys ek ON u.id = ek.user_id
WHERE ek.id IS NULL AND u.public_key IS NOT NULL;

-- 11. ZAKTUALIZUJ EMAIL W PROFILACH
UPDATE public.users u
SET email = au.email
FROM auth.users au
WHERE u.id = au.id AND u.email IS NULL;

-- =====================================================
-- SPRAWDZENIE
-- =====================================================

-- Sprawdź czy wszystko działa
SELECT 
  'Tabela encryption_keys' as check_item,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'encryption_keys') as status
UNION ALL
SELECT 
  'Kolumna email w users',
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email')
UNION ALL
SELECT 
  'Trigger handle_new_user',
  EXISTS(SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created');

-- =====================================================
-- KONFIGURACJA EMAIL W SUPABASE DASHBOARD
-- =====================================================
-- 1. Przejdź do: Authentication > Email Templates
-- 2. Włącz: "Enable email confirmations"
-- 3. Dla custom SMTP: Settings > Project Settings > Auth > SMTP Settings
-- 4. Testuj z: Authentication > Users > Invite User
