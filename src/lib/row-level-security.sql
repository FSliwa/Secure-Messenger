-- Row Level Security (RLS) Policies for SecureChat Pro
-- Run these in your Supabase SQL editor to enable comprehensive data security

-- ===== ENABLE RLS ON ALL TABLES =====
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;

-- ===== USERS TABLE POLICIES =====
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (during registration)
CREATE POLICY "Users can create own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can view other users' basic info (for conversations)
CREATE POLICY "Users can view others basic info" ON users
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND 
    id IN (
      SELECT DISTINCT cp2.user_id 
      FROM conversation_participants cp1
      JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.user_id = auth.uid()
    )
  );

-- ===== CONVERSATIONS TABLE POLICIES =====
-- Users can view conversations they participate in
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (
    id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Users can create conversations
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update conversations they created or are admin of
CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (
    auth.uid() = created_by OR
    id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ===== CONVERSATION PARTICIPANTS POLICIES =====
-- Users can view participants of conversations they're in
CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Users can add participants to conversations they're admin of
CREATE POLICY "Admins can add participants" ON conversation_participants
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Users can update participant roles if they're admin
CREATE POLICY "Admins can update participant roles" ON conversation_participants
  FOR UPDATE USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Users can leave conversations (delete their participation)
CREATE POLICY "Users can leave conversations" ON conversation_participants
  FOR DELETE USING (user_id = auth.uid() OR
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- ===== MESSAGES TABLE POLICIES =====
-- Users can view messages in conversations they participate in
CREATE POLICY "Users can view conversation messages" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Users can send messages to conversations they participate in
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- ===== MESSAGE STATUS POLICIES =====
-- Users can view message status for messages they can see
CREATE POLICY "Users can view message status" ON message_status
  FOR SELECT USING (
    message_id IN (
      SELECT id FROM messages 
      WHERE conversation_id IN (
        SELECT conversation_id 
        FROM conversation_participants 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Users can create/update their own message status
CREATE POLICY "Users can manage own message status" ON message_status
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ===== LOGIN SESSIONS POLICIES =====
-- Users can only view their own sessions
CREATE POLICY "Users can view own sessions" ON login_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own sessions
CREATE POLICY "Users can create own sessions" ON login_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions" ON login_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions" ON login_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ===== SECURITY ALERTS POLICIES =====
-- Users can only view their own security alerts
CREATE POLICY "Users can view own security alerts" ON security_alerts
  FOR SELECT USING (auth.uid() = user_id);

-- System can create security alerts for users
CREATE POLICY "System can create security alerts" ON security_alerts
  FOR INSERT WITH CHECK (user_id IS NOT NULL);

-- Users can mark their own alerts as resolved
CREATE POLICY "Users can resolve own alerts" ON security_alerts
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ===== ACCOUNT LOCKOUTS POLICIES =====
-- Users can view their own lockout status
CREATE POLICY "Users can view own lockouts" ON account_lockouts
  FOR SELECT USING (auth.uid() = user_id);

-- System can create account lockouts
CREATE POLICY "System can create lockouts" ON account_lockouts
  FOR INSERT WITH CHECK (user_id IS NOT NULL);

-- System can update account lockouts
CREATE POLICY "System can update lockouts" ON account_lockouts
  FOR UPDATE USING (user_id IS NOT NULL);

-- ===== BIOMETRIC CREDENTIALS POLICIES =====
-- Users can only view their own biometric credentials
CREATE POLICY "Users can view own biometric credentials" ON biometric_credentials
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own biometric credentials
CREATE POLICY "Users can create own biometric credentials" ON biometric_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own biometric credentials
CREATE POLICY "Users can update own biometric credentials" ON biometric_credentials
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own biometric credentials
CREATE POLICY "Users can delete own biometric credentials" ON biometric_credentials
  FOR DELETE USING (auth.uid() = user_id);

-- ===== PASSWORD HISTORY POLICIES =====
-- Users can view their own password history
CREATE POLICY "Users can view own password history" ON password_history
  FOR SELECT USING (auth.uid() = user_id);

-- System can create password history entries
CREATE POLICY "System can create password history" ON password_history
  FOR INSERT WITH CHECK (user_id IS NOT NULL);

-- Users can delete their own password history (for GDPR compliance)
CREATE POLICY "Users can delete own password history" ON password_history
  FOR DELETE USING (auth.uid() = user_id);

-- ===== TRUSTED DEVICES POLICIES =====
-- Users can only view their own trusted devices
CREATE POLICY "Users can view own trusted devices" ON trusted_devices
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own trusted devices
CREATE POLICY "Users can create own trusted devices" ON trusted_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own trusted devices
CREATE POLICY "Users can update own trusted devices" ON trusted_devices
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own trusted devices
CREATE POLICY "Users can delete own trusted devices" ON trusted_devices
  FOR DELETE USING (auth.uid() = user_id);

-- ===== TWO FACTOR AUTH POLICIES =====
-- Users can only view their own 2FA settings
CREATE POLICY "Users can view own 2FA settings" ON two_factor_auth
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own 2FA settings
CREATE POLICY "Users can create own 2FA settings" ON two_factor_auth
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own 2FA settings
CREATE POLICY "Users can update own 2FA settings" ON two_factor_auth
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own 2FA settings
CREATE POLICY "Users can delete own 2FA settings" ON two_factor_auth
  FOR DELETE USING (auth.uid() = user_id);

-- ===== ADMIN POLICIES (Optional) =====
-- Create admin role policies if needed

-- Admin users can view all data (uncomment if you have admin users)
/*
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE (profile->>'role') = 'admin'
    )
  );

CREATE POLICY "Admins can manage all conversations" ON conversations
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE (profile->>'role') = 'admin'
    )
  );

CREATE POLICY "Admins can view all security alerts" ON security_alerts
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE (profile->>'role') = 'admin'
    )
  );

CREATE POLICY "Admins can manage account lockouts" ON account_lockouts
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE (profile->>'role') = 'admin'
    )
  );
*/

-- ===== SYSTEM/SERVICE POLICIES =====
-- For system operations that might not have a user context

-- System can read/write for maintenance operations
-- These should be used sparingly and with service role keys

-- Allow service role to perform cleanup operations
CREATE POLICY "Service role maintenance" ON messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role maintenance" ON login_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role maintenance" ON security_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- ===== ADDITIONAL SECURITY FUNCTIONS =====
-- Helper functions for complex RLS policies

-- Function to check if user is conversation admin
CREATE OR REPLACE FUNCTION is_conversation_admin(conversation_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = conversation_uuid 
    AND user_id = user_uuid 
    AND role IN ('admin', 'owner')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access message
CREATE OR REPLACE FUNCTION can_access_message(message_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
    WHERE m.id = message_uuid 
    AND cp.user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is account owner or admin
CREATE OR REPLACE FUNCTION can_manage_user_data(target_user_id uuid, current_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN target_user_id = current_user_id OR
         EXISTS (
           SELECT 1 FROM users 
           WHERE id = current_user_id 
           AND (profile->>'role') = 'admin'
         );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== AUDIT POLICIES =====
-- Enable audit logging for sensitive operations

-- Log user profile changes
CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS trigger AS $$
BEGIN
  INSERT INTO security_alerts (user_id, alert_type, description, metadata)
  VALUES (
    NEW.id,
    'profile_updated',
    'User profile was updated',
    jsonb_build_object(
      'changed_fields', jsonb_object_keys(to_jsonb(NEW) - to_jsonb(OLD))
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER user_profile_changes
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION log_user_changes();

-- Log password changes
CREATE OR REPLACE FUNCTION log_password_changes()
RETURNS trigger AS $$
BEGIN
  INSERT INTO security_alerts (user_id, alert_type, description)
  VALUES (
    NEW.user_id,
    'password_changed',
    'Password was changed'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER password_history_changes
  AFTER INSERT ON password_history
  FOR EACH ROW
  EXECUTE FUNCTION log_password_changes();

-- ===== SECURITY VALIDATIONS =====
-- Additional security checks

-- Ensure message sender is conversation participant
CREATE OR REPLACE FUNCTION validate_message_sender()
RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id
    AND user_id = NEW.sender_id
  ) THEN
    RAISE EXCEPTION 'User is not a participant in this conversation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER validate_message_sender_trigger
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_message_sender();

-- Ensure conversation participant constraints
CREATE OR REPLACE FUNCTION validate_conversation_participant()
RETURNS trigger AS $$
BEGIN
  -- Prevent duplicate participants
  IF EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = NEW.conversation_id
    AND user_id = NEW.user_id
    AND id != COALESCE(NEW.id, uuid_nil())
  ) THEN
    RAISE EXCEPTION 'User is already a participant in this conversation';
  END IF;
  
  -- Ensure at least one owner/admin exists
  IF OLD.role IN ('owner', 'admin') AND NEW.role NOT IN ('owner', 'admin') THEN
    IF NOT EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = NEW.conversation_id
      AND role IN ('owner', 'admin')
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Cannot remove last admin/owner from conversation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER validate_conversation_participant_trigger
  BEFORE INSERT OR UPDATE ON conversation_participants
  FOR EACH ROW
  EXECUTE FUNCTION validate_conversation_participant();

-- ===== COMMENTS FOR DOCUMENTATION =====
COMMENT ON POLICY "Users can view own profile" ON users IS 'Users have full access to their own profile data';
COMMENT ON POLICY "Users can view conversation messages" ON messages IS 'Users can only see messages in conversations they participate in';
COMMENT ON POLICY "Users can view own security alerts" ON security_alerts IS 'Users can monitor their own security events';
COMMENT ON FUNCTION is_conversation_admin IS 'Helper function to check conversation admin privileges';
COMMENT ON FUNCTION can_access_message IS 'Helper function to validate message access permissions';

-- ===== TESTING RLS POLICIES =====
/*
Test your RLS policies with these queries (run as different users):

-- Test user can only see their own data
SELECT * FROM users; -- Should only return current user's data

-- Test conversation access
SELECT * FROM conversations; -- Should only return conversations user participates in

-- Test message access
SELECT * FROM messages; -- Should only return messages from user's conversations

-- Test cross-user data access (should return no results)
SELECT * FROM users WHERE id != auth.uid(); -- Should return empty for basic users

-- Test admin access (if admin policies are enabled)
-- Run as admin user to verify elevated permissions
*/