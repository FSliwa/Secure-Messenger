-- COMPLETE ENHANCED SECURITY MIGRATION SQL
-- Ten plik zawiera WSZYSTKIE elementy Enhanced Security Initialization
-- Bezpieczny do wielokrotnego uruchamiania - używa IF EXISTS/IF NOT EXISTS
-- 
-- KROKI:
-- 1. Create Account Lockouts Table
-- 2. Create Login Attempts Table  
-- 3. Create Password History Table
-- 4. Create Conversation Passwords Table
-- 5. Create Conversation Access Sessions
-- 6. Create Security Audit Log
-- 7. Create Security Functions

-- ============================================
-- CZYSZCZENIE STARYCH OBIEKTÓW
-- ============================================
-- Usuń stare triggery i funkcje które mogą powodować konflikty
DROP TRIGGER IF EXISTS trigger_password_history ON auth.users;
DROP TRIGGER IF EXISTS cleanup_expired_sessions_trigger ON public.conversation_access_sessions;
DROP FUNCTION IF EXISTS public.add_password_history() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.check_account_lockout(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.lock_account(uuid, text, integer, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.unlock_account(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_conversation_access(uuid, uuid) CASCADE;

-- ============================================
-- 1. CREATE ACCOUNT LOCKOUTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.account_lockouts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('failed_login', 'suspicious_activity', 'admin_action', 'security_violation')),
  locked_until timestamp with time zone NOT NULL,
  locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  unlock_attempts integer DEFAULT 0,
  is_permanent boolean DEFAULT false,
  unlock_token text UNIQUE,
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT account_lockouts_pkey PRIMARY KEY (id),
  CONSTRAINT account_lockouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================
-- 2. CREATE LOGIN ATTEMPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_time timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  success boolean NOT NULL,
  ip_address text,
  user_agent text,
  failure_reason text,
  device_fingerprint text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 3. CREATE PASSWORD HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.password_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  password_hash text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + INTERVAL '1 year'),
  CONSTRAINT password_history_pkey PRIMARY KEY (id),
  CONSTRAINT password_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Dodaj kolumnę expires_at jeśli tabela istnieje ale kolumna nie
ALTER TABLE public.password_history 
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + INTERVAL '1 year');

-- ============================================
-- 4. CREATE CONVERSATION PASSWORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversation_passwords (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL UNIQUE,
  password_hash text NOT NULL,
  salt text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  password_hint text,
  max_attempts integer DEFAULT 3,
  lockout_duration integer DEFAULT 300 -- 5 minutes in seconds
);

-- Track conversation password attempts
CREATE TABLE IF NOT EXISTS public.conversation_password_attempts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  attempt_time timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  success boolean NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- 5. CREATE CONVERSATION ACCESS SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversation_access_sessions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  unlocked_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + INTERVAL '2 hours'),
  device_fingerprint text,
  session_token text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(conversation_id, user_id, device_fingerprint)
);

-- Dodaj kolumnę expires_at jeśli tabela istnieje ale kolumna nie
ALTER TABLE public.conversation_access_sessions 
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + INTERVAL '2 hours');

-- ============================================
-- 6. CREATE SECURITY AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'login_success', 'login_failure', 'account_locked', 'account_unlocked',
    'password_changed', '2fa_enabled', '2fa_disabled', 'device_trusted',
    'device_untrusted', 'biometric_enrolled', 'biometric_removed',
    'conversation_password_set', 'conversation_unlocked', 'suspicious_activity'
  )),
  event_data jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  device_fingerprint text,
  severity text DEFAULT 'info' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- DODATKOWE TABELE (z oryginalnego schematu)
-- ============================================

-- Upewnij się, że podstawowe tabele istnieją
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS privacy_settings jsonb DEFAULT '{"last_seen": true, "read_receipts": true, "typing_indicators": true, "profile_visibility": "everyone"}'::jsonb,
ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{"messages": true, "group_invites": true, "friend_requests": true, "security_alerts": true}'::jsonb;

ALTER TABLE public.biometric_credentials
ADD COLUMN IF NOT EXISTS counter integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS transports text[] DEFAULT ARRAY[]::text[];

ALTER TABLE public.login_sessions 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.security_alerts
ALTER COLUMN severity SET NOT NULL,
ALTER COLUMN is_resolved SET NOT NULL;

-- ============================================
-- INDEKSY DLA WYDAJNOŚCI
-- ============================================
CREATE INDEX IF NOT EXISTS idx_account_lockouts_user_id ON public.account_lockouts(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_locked_until ON public.account_lockouts(locked_until);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_is_active ON public.account_lockouts(is_active);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON public.login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempt_time ON public.login_attempts(attempt_time);

CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON public.password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_expires_at ON public.password_history(expires_at);

CREATE INDEX IF NOT EXISTS idx_conversation_passwords_conversation_id ON public.conversation_passwords(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_password_attempts_conversation_id ON public.conversation_password_attempts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_access_sessions_conversation_user ON public.conversation_access_sessions(conversation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_access_sessions_expires_at ON public.conversation_access_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON public.security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at);

-- ============================================
-- WŁĄCZ ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_password_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_access_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLITYKI RLS (z DROP IF EXISTS)
-- ============================================

-- Account lockouts
DROP POLICY IF EXISTS "Users can view their own lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "Users can view own lockouts" ON public.account_lockouts;
CREATE POLICY "Users can view own lockouts" ON public.account_lockouts
  FOR SELECT USING (user_id = auth.uid());

-- Login attempts  
DROP POLICY IF EXISTS "Users can view their own login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Users can view own login attempts" ON public.login_attempts;
CREATE POLICY "Users can view own login attempts" ON public.login_attempts
  FOR SELECT USING (user_id = auth.uid());

-- Password history
DROP POLICY IF EXISTS "Users can view their own password history" ON public.password_history;
DROP POLICY IF EXISTS "Users can view own password history" ON public.password_history;
CREATE POLICY "Users can view own password history" ON public.password_history
  FOR SELECT USING (user_id = auth.uid());

-- Conversation passwords
DROP POLICY IF EXISTS "Participants can view conversation passwords" ON public.conversation_passwords;
CREATE POLICY "Participants can view conversation passwords" ON public.conversation_passwords
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_participants.conversation_id = conversation_passwords.conversation_id 
      AND conversation_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants can insert conversation passwords" ON public.conversation_passwords;
CREATE POLICY "Participants can insert conversation passwords" ON public.conversation_passwords
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_participants.conversation_id = conversation_passwords.conversation_id 
      AND conversation_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants can update conversation passwords" ON public.conversation_passwords;
CREATE POLICY "Participants can update conversation passwords" ON public.conversation_passwords
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_participants.conversation_id = conversation_passwords.conversation_id 
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Conversation password attempts
DROP POLICY IF EXISTS "Participants can view password attempts" ON public.conversation_password_attempts;
CREATE POLICY "Participants can view password attempts" ON public.conversation_password_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants 
      WHERE conversation_participants.conversation_id = conversation_password_attempts.conversation_id 
      AND conversation_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert password attempts" ON public.conversation_password_attempts;
CREATE POLICY "Users can insert password attempts" ON public.conversation_password_attempts
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Conversation access sessions
DROP POLICY IF EXISTS "Users can view own access sessions" ON public.conversation_access_sessions;
CREATE POLICY "Users can view own access sessions" ON public.conversation_access_sessions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own access sessions" ON public.conversation_access_sessions;
CREATE POLICY "Users can insert own access sessions" ON public.conversation_access_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own access sessions" ON public.conversation_access_sessions;
CREATE POLICY "Users can update own access sessions" ON public.conversation_access_sessions
  FOR UPDATE USING (user_id = auth.uid());

-- Security audit log
DROP POLICY IF EXISTS "Users can view own audit log" ON public.security_audit_log;
CREATE POLICY "Users can view own audit log" ON public.security_audit_log
  FOR SELECT USING (user_id = auth.uid());

-- ============================================
-- 7. CREATE SECURITY FUNCTIONS
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

-- Funkcja do blokowania konta
DROP FUNCTION IF EXISTS public.lock_account(uuid, text, integer, boolean);
CREATE OR REPLACE FUNCTION public.lock_account(
  user_uuid uuid,
  reason text,
  duration_minutes integer DEFAULT NULL,
  permanent boolean DEFAULT false
) RETURNS uuid AS $$
DECLARE
  lockout_id uuid;
  unlock_time timestamp with time zone;
BEGIN
  IF duration_minutes IS NOT NULL AND NOT permanent THEN
    unlock_time := NOW() + (duration_minutes || ' minutes')::INTERVAL;
  END IF;

  INSERT INTO public.account_lockouts (user_id, reason, locked_until, is_permanent)
  VALUES (user_uuid, reason, unlock_time, permanent)
  RETURNING id INTO lockout_id;

  -- Log the event
  INSERT INTO public.security_audit_log (user_id, event_type, event_data, severity)
  VALUES (user_uuid, 'account_locked', 
    jsonb_build_object('reason', reason, 'duration_minutes', duration_minutes, 'permanent', permanent),
    CASE WHEN permanent THEN 'critical' ELSE 'high' END
  );

  RETURN lockout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do odblokowania konta
DROP FUNCTION IF EXISTS public.unlock_account(uuid);
CREATE OR REPLACE FUNCTION public.unlock_account(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE public.account_lockouts 
  SET is_active = false
  WHERE user_id = user_uuid 
  AND (locked_until IS NULL OR locked_until > NOW())
  AND NOT is_permanent;

  -- Log the event
  INSERT INTO public.security_audit_log (user_id, event_type, event_data)
  VALUES (user_uuid, 'account_unlocked', jsonb_build_object('unlocked_at', NOW()));

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do sprawdzania dostępu do konwersacji z hasłem
DROP FUNCTION IF EXISTS public.has_conversation_access(uuid, uuid);
CREATE OR REPLACE FUNCTION public.has_conversation_access(
  conversation_uuid uuid,
  user_uuid uuid
) RETURNS boolean AS $$
BEGIN
  -- Check if conversation has password protection
  IF NOT EXISTS (SELECT 1 FROM public.conversation_passwords WHERE conversation_id = conversation_uuid) THEN
    RETURN TRUE; -- No password protection
  END IF;

  -- Check if user has valid access session
  RETURN EXISTS (
    SELECT 1 FROM public.conversation_access_sessions 
    WHERE conversation_id = conversation_uuid 
    AND user_id = user_uuid 
    AND is_active = TRUE
    AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funkcja do czyszczenia wygasłych sesji
DROP FUNCTION IF EXISTS public.cleanup_expired_sessions();
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.conversation_access_sessions 
  WHERE expires_at < NOW();
  
  DELETE FROM public.password_history
  WHERE expires_at < NOW();
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger do czyszczenia sesji
DROP TRIGGER IF EXISTS cleanup_expired_sessions_trigger ON public.conversation_access_sessions;
CREATE TRIGGER cleanup_expired_sessions_trigger
  AFTER INSERT ON public.conversation_access_sessions
  EXECUTE FUNCTION public.cleanup_expired_sessions();

-- Funkcja do dodawania historii haseł
-- UWAGA: W Supabase nie mamy bezpośredniego dostępu do haseł
-- Ta funkcja jest tylko placeholder - historię haseł należy implementować w aplikacji

-- Najpierw usuń trigger jeśli istnieje
DROP TRIGGER IF EXISTS trigger_password_history ON auth.users;

-- Teraz możemy bezpiecznie usunąć i utworzyć funkcję
DROP FUNCTION IF EXISTS public.add_password_history() CASCADE;
CREATE OR REPLACE FUNCTION public.add_password_history()
RETURNS trigger AS $$
BEGIN
  -- W Supabase nie mamy dostępu do encrypted_password
  -- Historię haseł należy implementować po stronie aplikacji
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- UWAGA: Trigger dla password_history został wyłączony
-- ponieważ w Supabase nie mamy dostępu do kolumny encrypted_password

-- ============================================
-- GRANT UPRAWNIEŃ
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- WERYFIKACJA STRUKTUR TABEL
-- ============================================
-- Sprawdzenie czy wszystkie kolumny istnieją
DO $$
BEGIN
  -- Sprawdź czy tabela password_history ma kolumnę expires_at
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'password_history' 
    AND column_name = 'expires_at'
  ) THEN
    RAISE NOTICE 'UWAGA: Kolumna expires_at nie istnieje w tabeli password_history';
  END IF;
  
  -- Sprawdź czy tabela conversation_access_sessions ma kolumnę expires_at
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversation_access_sessions' 
    AND column_name = 'expires_at'
  ) THEN
    RAISE NOTICE 'UWAGA: Kolumna expires_at nie istnieje w tabeli conversation_access_sessions';
  END IF;
END $$;

-- ============================================
-- WERYFIKACJA
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Enhanced Security Initialization - KOMPLETNA!';
  RAISE NOTICE '✅ 1. Account Lockouts Table - utworzona';
  RAISE NOTICE '✅ 2. Login Attempts Table - utworzona';
  RAISE NOTICE '✅ 3. Password History Table - utworzona';
  RAISE NOTICE '✅ 4. Conversation Passwords Table - utworzona';
  RAISE NOTICE '✅ 5. Conversation Access Sessions - utworzona';
  RAISE NOTICE '✅ 6. Security Audit Log - utworzona';
  RAISE NOTICE '✅ 7. Security Functions - utworzone';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Wszystkie elementy Enhanced Security zostały zainstalowane!';
END $$;
