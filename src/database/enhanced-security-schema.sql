-- Enhanced Security Features Schema
-- Implements: Account lockouts, Password history, Biometric credentials, Trusted devices, 2FA
-- Adds: Conversation password protection

-- Account lockout system
CREATE TABLE IF NOT EXISTS account_lockouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  lockout_reason TEXT NOT NULL CHECK (lockout_reason IN ('failed_login', 'suspicious_activity', 'admin_action', 'security_violation')),
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  unlocks_at TIMESTAMP WITH TIME ZONE,
  unlock_attempts INTEGER DEFAULT 0,
  is_permanent BOOLEAN DEFAULT FALSE,
  locked_by UUID REFERENCES auth.users ON DELETE SET NULL,
  unlock_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Login attempt tracking for lockout system
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  attempt_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  failure_reason TEXT,
  device_fingerprint TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Password history to prevent password reuse
CREATE TABLE IF NOT EXISTS password_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  password_hash TEXT NOT NULL, -- Store hash of previous passwords
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 year') -- Keep for 1 year
);

-- Enhanced biometric credentials (extending existing)
ALTER TABLE IF EXISTS biometric_credentials 
ADD COLUMN IF NOT EXISTS device_id TEXT,
ADD COLUMN IF NOT EXISTS last_used TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_usage_count INTEGER DEFAULT 1000,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days'),
ADD COLUMN IF NOT EXISTS is_backup BOOLEAN DEFAULT FALSE;

-- Enhanced trusted devices (extending existing)
ALTER TABLE IF EXISTS trusted_devices
ADD COLUMN IF NOT EXISTS trust_level INTEGER DEFAULT 1 CHECK (trust_level BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS auto_trust BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES auth.users ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS revoke_reason TEXT,
ADD COLUMN IF NOT EXISTS last_verified TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- Enhanced 2FA system (extending existing)
ALTER TABLE IF EXISTS two_factor_auth
ADD COLUMN IF NOT EXISTS recovery_codes_count INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS last_backup_generation TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS authenticator_name TEXT DEFAULT 'Google Authenticator';

-- Conversation password protection
CREATE TABLE IF NOT EXISTS conversation_passwords (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL UNIQUE,
  password_hash TEXT NOT NULL, -- bcrypt hash of conversation password
  salt TEXT NOT NULL,
  created_by UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  password_hint TEXT,
  max_attempts INTEGER DEFAULT 3,
  lockout_duration INTEGER DEFAULT 300 -- 5 minutes in seconds
);

-- Track conversation password attempts
CREATE TABLE IF NOT EXISTS conversation_password_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  attempt_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Conversation access sessions (who has unlocked which conversations)
CREATE TABLE IF NOT EXISTS conversation_access_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 hours'),
  device_fingerprint TEXT,
  session_token TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(conversation_id, user_id, device_fingerprint)
);

-- Security audit log
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login_success', 'login_failure', 'account_locked', 'account_unlocked',
    'password_changed', '2fa_enabled', '2fa_disabled', 'device_trusted',
    'device_untrusted', 'biometric_enrolled', 'biometric_removed',
    'conversation_password_set', 'conversation_unlocked', 'suspicious_activity'
  )),
  event_data JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_lockouts_user_id ON account_lockouts(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_unlocks_at ON account_lockouts(unlocks_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempt_time ON login_attempts(attempt_time);
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_expires_at ON password_history(expires_at);
CREATE INDEX IF NOT EXISTS idx_conversation_passwords_conversation_id ON conversation_passwords(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_password_attempts_conversation_id ON conversation_password_attempts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_access_sessions_conversation_user ON conversation_access_sessions(conversation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_access_sessions_expires_at ON conversation_access_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at);

-- Enable RLS on new tables
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_password_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_access_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Account lockouts - users can only see their own lockouts
CREATE POLICY "Users can view own lockouts" ON account_lockouts
FOR SELECT USING (user_id = auth.uid());

-- Login attempts - users can only see their own attempts
CREATE POLICY "Users can view own login attempts" ON login_attempts
FOR SELECT USING (user_id = auth.uid());

-- Password history - users can only see their own history
CREATE POLICY "Users can view own password history" ON password_history
FOR SELECT USING (user_id = auth.uid());

-- Conversation passwords - only conversation participants can see
CREATE POLICY "Participants can view conversation passwords" ON conversation_passwords
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_participants.conversation_id = conversation_passwords.conversation_id 
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can insert conversation passwords" ON conversation_passwords
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_participants.conversation_id = conversation_passwords.conversation_id 
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can update conversation passwords" ON conversation_passwords
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_participants.conversation_id = conversation_passwords.conversation_id 
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Conversation password attempts - users can see attempts for conversations they participate in
CREATE POLICY "Participants can view password attempts" ON conversation_password_attempts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_participants.conversation_id = conversation_password_attempts.conversation_id 
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert password attempts" ON conversation_password_attempts
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Conversation access sessions - users can only see their own sessions
CREATE POLICY "Users can view own access sessions" ON conversation_access_sessions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own access sessions" ON conversation_access_sessions
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own access sessions" ON conversation_access_sessions
FOR UPDATE USING (user_id = auth.uid());

-- Security audit log - users can only see their own audit entries
CREATE POLICY "Users can view own audit log" ON security_audit_log
FOR SELECT USING (user_id = auth.uid());

-- Functions for security operations

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION is_account_locked(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM account_lockouts 
    WHERE user_id = user_uuid 
    AND (unlocks_at IS NULL OR unlocks_at > NOW())
    AND NOT is_permanent = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to lock account
CREATE OR REPLACE FUNCTION lock_account(
  user_uuid UUID,
  reason TEXT,
  duration_minutes INTEGER DEFAULT NULL,
  permanent BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
  lockout_id UUID;
  unlock_time TIMESTAMP WITH TIME ZONE;
BEGIN
  IF duration_minutes IS NOT NULL AND NOT permanent THEN
    unlock_time := NOW() + (duration_minutes || ' minutes')::INTERVAL;
  END IF;

  INSERT INTO account_lockouts (user_id, lockout_reason, unlocks_at, is_permanent)
  VALUES (user_uuid, reason, unlock_time, permanent)
  RETURNING id INTO lockout_id;

  -- Log the event
  INSERT INTO security_audit_log (user_id, event_type, event_data, severity)
  VALUES (user_uuid, 'account_locked', 
    jsonb_build_object('reason', reason, 'duration_minutes', duration_minutes, 'permanent', permanent),
    CASE WHEN permanent THEN 'critical' ELSE 'high' END
  );

  RETURN lockout_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlock account
CREATE OR REPLACE FUNCTION unlock_account(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE account_lockouts 
  SET unlocks_at = NOW()
  WHERE user_id = user_uuid 
  AND (unlocks_at IS NULL OR unlocks_at > NOW())
  AND NOT is_permanent;

  -- Log the event
  INSERT INTO security_audit_log (user_id, event_type, event_data)
  VALUES (user_uuid, 'account_unlocked', jsonb_build_object('unlocked_at', NOW()));

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check conversation password access
CREATE OR REPLACE FUNCTION has_conversation_access(
  conversation_uuid UUID,
  user_uuid UUID
) RETURNS BOOLEAN AS $$
BEGIN
  -- Check if conversation has password protection
  IF NOT EXISTS (SELECT 1 FROM conversation_passwords WHERE conversation_id = conversation_uuid) THEN
    RETURN TRUE; -- No password protection
  END IF;

  -- Check if user has valid access session
  RETURN EXISTS (
    SELECT 1 FROM conversation_access_sessions 
    WHERE conversation_id = conversation_uuid 
    AND user_id = user_uuid 
    AND is_active = TRUE
    AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM conversation_access_sessions 
  WHERE expires_at < NOW();
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run cleanup periodically (approximation)
DROP TRIGGER IF EXISTS cleanup_expired_sessions_trigger ON conversation_access_sessions;
CREATE TRIGGER cleanup_expired_sessions_trigger
  AFTER INSERT ON conversation_access_sessions
  EXECUTE FUNCTION cleanup_expired_sessions();