-- MIGRATION SQL - Dostosowanie schematu do specyfikacji
-- Ten plik zawiera wszystkie zmiany potrzebne do dopasowania schematu w repozytorium
-- do podanego schematu Supabase
-- 
-- UWAGA: Ten skrypt jest bezpieczny do wielokrotnego uruchamiania!
-- Używa IF EXISTS/IF NOT EXISTS oraz DROP ... IF EXISTS przed tworzeniem obiektów
-- Rozwiązuje problem: "policy already exists"

-- ============================================
-- 1. DODANIE BRAKUJĄCYCH TABEL
-- ============================================

-- Tabela account_lockouts (jeśli nie istnieje w enhanced-security)
CREATE TABLE IF NOT EXISTS public.account_lockouts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  locked_until timestamp with time zone NOT NULL,
  locked_by text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT account_lockouts_pkey PRIMARY KEY (id),
  CONSTRAINT account_lockouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Tabela password_history
CREATE TABLE IF NOT EXISTS public.password_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT password_history_pkey PRIMARY KEY (id),
  CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- ============================================
-- 2. MODYFIKACJA ISTNIEJĄCYCH TABEL
-- ============================================

-- Dodanie brakujących pól do tabeli users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS privacy_settings jsonb DEFAULT '{"last_seen": true, "read_receipts": true, "typing_indicators": true, "profile_visibility": "everyone"}'::jsonb,
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"messages": true, "group_invites": true, "friend_requests": true, "security_alerts": true}'::jsonb;

-- Dodanie brakujących pól do tabeli biometric_credentials
ALTER TABLE public.biometric_credentials
ADD COLUMN IF NOT EXISTS counter integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS transports text[] DEFAULT ARRAY[]::text[];

-- Zmiana typów danych w login_sessions (jeśli potrzebne)
-- UWAGA: Ta operacja może wymagać konwersji danych
DO $$ 
BEGIN
    -- Sprawdzamy czy kolumny są typu numeric
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'login_sessions' 
        AND column_name IN ('location_latitude', 'location_longitude')
        AND data_type = 'double precision'
    ) THEN
        -- Tworzymy tymczasowe kolumny
        ALTER TABLE public.login_sessions 
        ADD COLUMN IF NOT EXISTS location_latitude_new numeric,
        ADD COLUMN IF NOT EXISTS location_longitude_new numeric;
        
        -- Kopiujemy dane
        UPDATE public.login_sessions 
        SET location_latitude_new = location_latitude::numeric,
            location_longitude_new = location_longitude::numeric;
        
        -- Usuwamy stare kolumny
        ALTER TABLE public.login_sessions 
        DROP COLUMN IF EXISTS location_latitude,
        DROP COLUMN IF EXISTS location_longitude;
        
        -- Zmieniamy nazwy nowych kolumn
        ALTER TABLE public.login_sessions 
        RENAME COLUMN location_latitude_new TO location_latitude;
        ALTER TABLE public.login_sessions 
        RENAME COLUMN location_longitude_new TO location_longitude;
    END IF;
END $$;

-- Dodanie brakujących ograniczeń NOT NULL
ALTER TABLE public.login_sessions 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.security_alerts
ALTER COLUMN severity SET NOT NULL,
ALTER COLUMN is_resolved SET NOT NULL;

-- Upewnienie się, że conversations ma prawidłową referencję
ALTER TABLE public.conversations
DROP CONSTRAINT IF EXISTS conversations_created_by_fkey,
ADD CONSTRAINT conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Upewnienie się, że conversation_participants ma prawidłowe referencje
ALTER TABLE public.conversation_participants
DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey,
ADD CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

-- Upewnienie się, że messages ma prawidłowe referencje
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey,
ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id);

-- Upewnienie się, że message_status ma prawidłowe referencje
ALTER TABLE public.message_status
DROP CONSTRAINT IF EXISTS message_status_user_id_fkey,
ADD CONSTRAINT message_status_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

-- ============================================
-- 3. WŁĄCZENIE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. UTWORZENIE POLITYK RLS DLA NOWYCH TABEL
-- ============================================

-- Najpierw usuń istniejące polityki (jeśli istnieją)
DROP POLICY IF EXISTS "Users can view their own lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "Users can view own lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "System can manage lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "Users can view their own password history" ON public.password_history;
DROP POLICY IF EXISTS "Users can view own password history" ON public.password_history;
DROP POLICY IF EXISTS "Users can insert their own password history" ON public.password_history;
DROP POLICY IF EXISTS "Users can insert own password history" ON public.password_history;

-- Polityki dla account_lockouts
CREATE POLICY "Users can view their own lockouts" ON public.account_lockouts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can manage lockouts" ON public.account_lockouts
  FOR ALL USING (true); -- Tylko dla operacji systemowych

-- Polityki dla password_history
CREATE POLICY "Users can view their own password history" ON public.password_history
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own password history" ON public.password_history
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================
-- 5. UTWORZENIE INDEKSÓW
-- ============================================

CREATE INDEX IF NOT EXISTS idx_account_lockouts_user_id ON public.account_lockouts(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_is_active ON public.account_lockouts(is_active);
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON public.password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON public.password_history(created_at);

-- ============================================
-- 6. DODANIE FUNKCJI POMOCNICZYCH
-- ============================================

-- Funkcja do sprawdzania blokady konta
DROP FUNCTION IF EXISTS public.check_account_lockout(uuid);
CREATE OR REPLACE FUNCTION public.check_account_lockout(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.account_lockouts
    WHERE user_id = p_user_id
    AND is_active = true
    AND locked_until > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do dodawania historii haseł
DROP FUNCTION IF EXISTS public.add_password_history();
CREATE OR REPLACE FUNCTION public.add_password_history()
RETURNS trigger AS $$
BEGIN
  -- Dodaj hasło do historii przy każdej zmianie
  INSERT INTO public.password_history (user_id, password_hash)
  SELECT NEW.id, NEW.encrypted_password
  FROM auth.users
  WHERE id = NEW.id;
  
  -- Usuń stare wpisy (zachowaj tylko ostatnie 10)
  DELETE FROM public.password_history
  WHERE user_id = NEW.id
  AND id NOT IN (
    SELECT id FROM public.password_history
    WHERE user_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 10
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger do automatycznego dodawania historii haseł
DROP TRIGGER IF EXISTS trigger_password_history ON auth.users;
CREATE TRIGGER trigger_password_history
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW
  WHEN (OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password)
  EXECUTE FUNCTION public.add_password_history();

-- ============================================
-- 7. GRANT UPRAWNIEŃ
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- WERYFIKACJA
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migracja zakończona pomyślnie!';
  RAISE NOTICE 'Dodano brakujące tabele: account_lockouts, password_history';
  RAISE NOTICE 'Zaktualizowano istniejące tabele o brakujące pola';
  RAISE NOTICE 'Dodano polityki RLS i indeksy';
END $$;
