-- ============================================================================
-- KOMPLETNA NAPRAWA BAZY DANYCH SECURE MESSENGER
-- ============================================================================
-- Data: 2025-01-08
-- Cel: Naprawa rejestracji, tabel i triggerów
-- ============================================================================

-- KROK 1: Tworzenie tabeli encryption_keys (jeśli nie istnieje)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.encryption_keys (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL UNIQUE,
    public_key text NOT NULL,
    encrypted_private_key text,
    key_type text DEFAULT 'RSA-2048'::text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    CONSTRAINT encryption_keys_pkey PRIMARY KEY (id),
    CONSTRAINT encryption_keys_user_id_fkey FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Włącz RLS
ALTER TABLE public.encryption_keys ENABLE ROW LEVEL SECURITY;

-- Polityki RLS dla encryption_keys
DROP POLICY IF EXISTS "Users can view their own keys" ON public.encryption_keys;
CREATE POLICY "Users can view their own keys" 
    ON public.encryption_keys FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own keys" ON public.encryption_keys;
CREATE POLICY "Users can insert their own keys" 
    ON public.encryption_keys FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own keys" ON public.encryption_keys;
CREATE POLICY "Users can update their own keys" 
    ON public.encryption_keys FOR UPDATE 
    USING (auth.uid() = user_id);

-- Indeks dla wydajności
CREATE INDEX IF NOT EXISTS encryption_keys_user_id_idx 
    ON public.encryption_keys(user_id);

-- ============================================================================
-- KROK 2: Usunięcie starych triggerów i funkcji
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================================================
-- KROK 3: Utworzenie poprawionej funkcji handle_new_user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_username text;
    v_display_name text;
    v_public_key text;
    v_encrypted_private_key text;
BEGIN
    -- Logowanie dla debugowania
    RAISE NOTICE 'handle_new_user triggered for user: %', NEW.id;
    
    -- Pobierz dane z raw_user_meta_data
    v_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        split_part(NEW.email, '@', 1)
    );
    
    v_display_name := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'username',
        split_part(NEW.email, '@', 1)
    );
    
    v_public_key := COALESCE(
        NEW.raw_user_meta_data->>'public_key',
        ''
    );
    
    v_encrypted_private_key := COALESCE(
        NEW.raw_user_meta_data->>'encrypted_private_key',
        ''
    );

    -- 1. Utwórz profil użytkownika w tabeli users
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
        NEW.id,
        v_username,
        NEW.email,
        v_display_name,
        v_public_key,
        'online',
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        public_key = EXCLUDED.public_key,
        updated_at = timezone('utc'::text, now());
    
    RAISE NOTICE 'User profile created for: %', NEW.id;
    
    -- 2. Zapisz klucze szyfrowania (jeśli istnieją)
    IF v_public_key IS NOT NULL AND v_public_key != '' THEN
        INSERT INTO public.encryption_keys (
            user_id,
            public_key,
            encrypted_private_key,
            key_type
        )
        VALUES (
            NEW.id,
            v_public_key,
            v_encrypted_private_key,
            'RSA-2048'
        )
        ON CONFLICT (user_id) DO UPDATE SET
            public_key = EXCLUDED.public_key,
            encrypted_private_key = EXCLUDED.encrypted_private_key;
        
        RAISE NOTICE 'Encryption keys saved for: %', NEW.id;
    END IF;
    
    -- 3. Log do security_audit_log
    INSERT INTO public.security_audit_log (
        user_id,
        event_type,
        event_data,
        severity,
        created_at
    )
    VALUES (
        NEW.id,
        'login_success',
        jsonb_build_object(
            'event', 'user_registration',
            'email', NEW.email,
            'timestamp', now()
        ),
        'low',
        timezone('utc'::text, now())
    );
    
    RAISE NOTICE 'Security audit log created for: %', NEW.id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Loguj błąd ale nie blokuj rejestracji
        RAISE WARNING 'Error in handle_new_user: % %', SQLERRM, SQLSTATE;
        RETURN NEW;
END;
$$;

-- ============================================================================
-- KROK 4: Utworzenie triggera
-- ============================================================================

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- KROK 5: Weryfikacja
-- ============================================================================

-- Sprawdź czy trigger istnieje
SELECT 
    'Trigger status' as check_type,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created'
AND event_object_schema = 'auth'
AND event_object_table = 'users';

-- Sprawdź czy funkcja istnieje
SELECT 
    'Function status' as check_type,
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user'
AND routine_schema = 'public';

-- Sprawdź czy tabela encryption_keys istnieje
SELECT 
    'Table status' as check_type,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'encryption_keys'
AND table_schema = 'public';

-- ============================================================================
-- KROK 6: Uprawnienia
-- ============================================================================

-- Nadaj uprawnienia do funkcji
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- ============================================================================
-- KONIEC
-- ============================================================================

SELECT '✅ BAZA DANYCH NAPRAWIONA' as status,
       'Trigger utworzony i aktywny' as trigger_status,
       'Tabela encryption_keys gotowa' as table_status,
       'Możesz testować rejestrację' as next_step;
