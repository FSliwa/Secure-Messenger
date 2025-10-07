-- Database Performance Indexes for SecureChat Pro
-- Run these in your Supabase SQL editor to improve query performance

-- ===== MESSAGE INDEXES =====
-- Primary indexes for message queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sent_at ON messages(conversation_id, sent_at DESC);

-- Indexes for message filtering
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_messages_auto_delete ON messages(auto_delete_at) WHERE auto_delete_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_forwarding ON messages(forwarding_disabled) WHERE forwarding_disabled = true;

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_messages_active_by_conversation 
  ON messages(conversation_id, sent_at DESC) 
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_messages_auto_delete_due 
  ON messages(auto_delete_at, is_deleted) 
  WHERE auto_delete_at IS NOT NULL AND is_deleted = false;

-- ===== CONVERSATION INDEXES =====
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- ===== CONVERSATION PARTICIPANTS INDEXES =====
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_joined_at ON conversation_participants(joined_at DESC);

-- Composite index for user's conversations
CREATE INDEX IF NOT EXISTS idx_user_conversations 
  ON conversation_participants(user_id, joined_at DESC);

-- ===== MESSAGE STATUS INDEXES =====
CREATE INDEX IF NOT EXISTS idx_message_status_message_id ON message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_message_status_user_id ON message_status(user_id);
CREATE INDEX IF NOT EXISTS idx_message_status_status ON message_status(status);
CREATE INDEX IF NOT EXISTS idx_message_status_updated_at ON message_status(updated_at DESC);

-- Composite indexes for status queries
CREATE INDEX IF NOT EXISTS idx_message_status_user_message 
  ON message_status(user_id, message_id, status);

CREATE INDEX IF NOT EXISTS idx_message_status_unread 
  ON message_status(user_id, updated_at DESC) 
  WHERE status != 'read';

-- ===== USER INDEXES =====
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Indexes for user search and filtering
CREATE INDEX IF NOT EXISTS idx_users_active 
  ON users(last_activity DESC) 
  WHERE status != 'offline';

-- ===== LOGIN SESSIONS INDEXES =====
CREATE INDEX IF NOT EXISTS idx_login_sessions_user_id ON login_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_session_token ON login_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_login_sessions_created_at ON login_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_sessions_expires_at ON login_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_sessions_is_active ON login_sessions(is_active) WHERE is_active = true;

-- Composite indexes for session management
CREATE INDEX IF NOT EXISTS idx_active_sessions 
  ON login_sessions(user_id, expires_at DESC) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_expired_sessions 
  ON login_sessions(expires_at) 
  WHERE is_active = true AND expires_at < NOW();

-- ===== SECURITY ALERTS INDEXES =====
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_alert_type ON security_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved) WHERE resolved = false;

-- Composite indexes for security monitoring
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_type_time 
  ON security_alerts(user_id, alert_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_alerts_unresolved 
  ON security_alerts(user_id, created_at DESC) 
  WHERE resolved = false;

-- ===== ACCOUNT LOCKOUTS INDEXES =====
CREATE INDEX IF NOT EXISTS idx_account_lockouts_user_id ON account_lockouts(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_locked_until ON account_lockouts(locked_until);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_is_active ON account_lockouts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_account_lockouts_created_at ON account_lockouts(created_at DESC);

-- Composite index for active lockouts
CREATE INDEX IF NOT EXISTS idx_active_lockouts 
  ON account_lockouts(user_id, locked_until DESC) 
  WHERE is_active = true;

-- ===== BIOMETRIC CREDENTIALS INDEXES =====
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_user_id ON biometric_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_credential_id ON biometric_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_type ON biometric_credentials(type);
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_created_at ON biometric_credentials(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_last_used ON biometric_credentials(last_used_at DESC);

-- Composite index for credential lookup
CREATE INDEX IF NOT EXISTS idx_biometric_user_credential 
  ON biometric_credentials(user_id, credential_id);

-- ===== PASSWORD HISTORY INDEXES =====
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history(created_at DESC);

-- Composite index for password history queries
CREATE INDEX IF NOT EXISTS idx_password_history_user_time 
  ON password_history(user_id, created_at DESC);

-- ===== TRUSTED DEVICES INDEXES =====
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint ON trusted_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_is_trusted ON trusted_devices(is_trusted) WHERE is_trusted = true;
CREATE INDEX IF NOT EXISTS idx_trusted_devices_created_at ON trusted_devices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_last_used ON trusted_devices(last_used_at DESC);

-- Composite indexes for device management
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_fingerprint 
  ON trusted_devices(user_id, device_fingerprint) 
  WHERE is_trusted = true;

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_active 
  ON trusted_devices(user_id, last_used_at DESC) 
  WHERE is_trusted = true;

-- ===== TWO FACTOR AUTH INDEXES =====
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_user_id ON two_factor_auth(user_id);
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_is_enabled ON two_factor_auth(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_enabled_at ON two_factor_auth(enabled_at DESC);
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_last_used ON two_factor_auth(last_used_at DESC);

-- ===== PARTIAL INDEXES FOR BETTER PERFORMANCE =====
-- Index only active/non-deleted records where applicable

-- Active conversations only
CREATE INDEX IF NOT EXISTS idx_conversations_active 
  ON conversations(updated_at DESC) 
  WHERE created_at IS NOT NULL;

-- Non-deleted messages with recent activity
CREATE INDEX IF NOT EXISTS idx_messages_recent_active 
  ON messages(conversation_id, sent_at DESC) 
  WHERE is_deleted = false 
  AND sent_at > (NOW() - INTERVAL '30 days');

-- Active user sessions
CREATE INDEX IF NOT EXISTS idx_sessions_active_recent 
  ON login_sessions(user_id, last_activity DESC) 
  WHERE is_active = true 
  AND last_activity > (NOW() - INTERVAL '7 days');

-- Recent security alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_recent 
  ON security_alerts(user_id, created_at DESC) 
  WHERE created_at > (NOW() - INTERVAL '90 days');

-- ===== CLEANUP INDEXES =====
-- Indexes to help with data cleanup operations

-- Find old sessions to cleanup
CREATE INDEX IF NOT EXISTS idx_sessions_cleanup 
  ON login_sessions(expires_at) 
  WHERE is_active = false;

-- Find old security alerts to archive
CREATE INDEX IF NOT EXISTS idx_security_alerts_cleanup 
  ON security_alerts(created_at) 
  WHERE resolved = true 
  AND created_at < (NOW() - INTERVAL '1 year');

-- Find old password history to cleanup
CREATE INDEX IF NOT EXISTS idx_password_history_cleanup 
  ON password_history(user_id, created_at) 
  WHERE created_at < (NOW() - INTERVAL '1 year');

-- ===== FULL TEXT SEARCH INDEXES =====
-- For searching encrypted content metadata (if using full-text search)

-- Search in conversation titles/descriptions
CREATE INDEX IF NOT EXISTS idx_conversations_search 
  ON conversations USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Search in user profiles
CREATE INDEX IF NOT EXISTS idx_users_search 
  ON users USING gin(to_tsvector('english', 
    username || ' ' || 
    COALESCE(email, '') || ' ' || 
    COALESCE((profile->>'display_name'), '') || ' ' ||
    COALESCE((profile->>'bio'), '')
  ));

-- ===== MONITORING AND STATISTICS =====
-- Create statistics for query planner optimization

ANALYZE messages;
ANALYZE conversations;
ANALYZE conversation_participants;
ANALYZE message_status;
ANALYZE users;
ANALYZE login_sessions;
ANALYZE security_alerts;
ANALYZE account_lockouts;
ANALYZE biometric_credentials;
ANALYZE password_history;
ANALYZE trusted_devices;
ANALYZE two_factor_auth;

-- ===== COMMENTS FOR DOCUMENTATION =====
COMMENT ON INDEX idx_messages_conversation_sent_at IS 'Primary index for message retrieval in conversations';
COMMENT ON INDEX idx_messages_auto_delete_due IS 'Index for auto-deletion cleanup job';
COMMENT ON INDEX idx_active_sessions IS 'Index for active session management';
COMMENT ON INDEX idx_security_alerts_unresolved IS 'Index for security monitoring dashboard';
COMMENT ON INDEX idx_active_lockouts IS 'Index for account lockout checks during login';
COMMENT ON INDEX idx_trusted_devices_user_fingerprint IS 'Index for device trust verification';

-- ===== PERFORMANCE TIPS =====
/*
Performance optimization tips:

1. Monitor index usage with:
   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
   FROM pg_stat_user_indexes 
   ORDER BY idx_scan DESC;

2. Find unused indexes:
   SELECT schemaname, tablename, indexname, idx_scan 
   FROM pg_stat_user_indexes 
   WHERE idx_scan = 0;

3. Check table sizes:
   SELECT schemaname, tablename, 
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
   FROM pg_tables 
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

4. Monitor slow queries in Supabase Dashboard > Reports > Query Performance

5. Consider partitioning large tables (messages, security_alerts) by date if they grow very large

6. Regular VACUUM and ANALYZE operations are handled automatically by Supabase
*/