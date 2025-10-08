-- OSTATECZNA NAPRAWA REJESTRACJI
-- Ten SQL utworzy trigger który automatycznie tworzy profil użytkownika

-- 1. Usuń stare triggery i funkcje
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Utwórz nową funkcję handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Utwórz profil w tabeli users
  INSERT INTO public.users (
    id, 
    username, 
    email, 
    display_name, 
    public_key,
    status,
    last_seen,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'public_key', ''),
    'online',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = timezone('utc'::text, now());
  
  -- Jeśli są klucze szyfrowania, zapisz je
  IF new.raw_user_meta_data->>'public_key' IS NOT NULL THEN
    INSERT INTO public.encryption_keys (
      user_id, 
      public_key, 
      encrypted_private_key,
      key_type
    )
    VALUES (
      new.id,
      new.raw_user_meta_data->>'public_key',
      COALESCE(new.raw_user_meta_data->>'encrypted_private_key', ''),
      'RSA-2048'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      public_key = EXCLUDED.public_key,
      encrypted_private_key = EXCLUDED.encrypted_private_key;
  END IF;
  
  RETURN new;
END;
$$;

-- 3. Utwórz trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Weryfikacja
SELECT 
  'Trigger created' as status,
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 5. Test funkcji
SELECT 
  'Function exists' as status,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
AND routine_schema = 'public';

-- GOTOWE! Teraz przy rejestracji automatycznie utworzy się profil użytkownika.
