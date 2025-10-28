-- MOŻE BRAKUJE TRIGGERA?
-- Ten trigger automatycznie tworzy profil użytkownika po rejestracji

-- 1. Usuń stary trigger jeśli istnieje
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Usuń starą funkcję jeśli istnieje
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Utwórz nową funkcję
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
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    username = COALESCE(users.username, EXCLUDED.username),
    display_name = COALESCE(users.display_name, EXCLUDED.display_name),
    public_key = CASE WHEN users.public_key = '' THEN EXCLUDED.public_key ELSE users.public_key END;
  
  -- Jeśli są klucze, zapisz je
  IF new.raw_user_meta_data->>'public_key' IS NOT NULL AND new.raw_user_meta_data->>'encrypted_private_key' IS NOT NULL THEN
    INSERT INTO public.encryption_keys (user_id, public_key, encrypted_private_key)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'public_key',
      new.raw_user_meta_data->>'encrypted_private_key'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      public_key = EXCLUDED.public_key,
      encrypted_private_key = EXCLUDED.encrypted_private_key;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Utwórz trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Test - sprawdź czy trigger istnieje
SELECT 
  'Trigger on_auth_user_created' as element,
  CASE WHEN EXISTS(SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created')
       THEN '✅ Utworzony' ELSE '❌ Brak' END as status;
