// Enhanced Security Types

// Account Lockout Types
export interface AccountLockout {
  id: string;
  user_id: string;
  reason: 'failed_login' | 'suspicious_activity' | 'admin_action' | 'security_violation';
  locked_until: string;
  locked_by?: string;
  is_active: boolean;
  created_at: string;
  unlock_attempts?: number;
  is_permanent?: boolean;
  unlock_token?: string;
  metadata?: Record<string, any>;
}

// Login Attempt Types
export interface LoginAttempt {
  id: string;
  email: string;
  user_id?: string;
  attempt_time: string;
  success: boolean;
  ip_address?: string;
  user_agent?: string;
  failure_reason?: string;
  device_fingerprint?: string;
  created_at: string;
}

// Password History Types
export interface PasswordHistory {
  id: string;
  user_id: string;
  password_hash: string;
  created_at: string;
  expires_at?: string;
}

// Conversation Security Types
export interface ConversationPassword {
  id: string;
  conversation_id: string;
  password_hash: string;
  salt: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  password_hint?: string;
  max_attempts: number;
  lockout_duration: number;
}

export interface ConversationPasswordAttempt {
  id: string;
  conversation_id: string;
  user_id: string;
  attempt_time: string;
  success: boolean;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface ConversationAccessSession {
  id: string;
  conversation_id: string;
  user_id: string;
  unlocked_at: string;
  expires_at: string;
  device_fingerprint?: string;
  session_token: string;
  is_active: boolean;
  created_at: string;
}

// Security Audit Log Types
export interface SecurityAuditLog {
  id: string;
  user_id?: string;
  event_type: SecurityEventType;
  event_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

export type SecurityEventType = 
  | 'login_success'
  | 'login_failure'
  | 'account_locked'
  | 'account_unlocked'
  | 'password_changed'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'device_trusted'
  | 'device_untrusted'
  | 'biometric_enrolled'
  | 'biometric_removed'
  | 'conversation_password_set'
  | 'conversation_unlocked'
  | 'suspicious_activity';

// Security Metadata
export interface SecurityMetadata {
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
}

// Security Statistics
export interface SecurityStats {
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  mediumEvents: number;
  lowEvents: number;
  recentFailedLogins: number;
  lastLoginSuccess?: Date;
  lastLoginFailure?: Date;
}

// Database Table Names
export const SECURITY_TABLES = {
  ACCOUNT_LOCKOUTS: 'account_lockouts',
  LOGIN_ATTEMPTS: 'login_attempts',
  PASSWORD_HISTORY: 'password_history',
  CONVERSATION_PASSWORDS: 'conversation_passwords',
  CONVERSATION_PASSWORD_ATTEMPTS: 'conversation_password_attempts',
  CONVERSATION_ACCESS_SESSIONS: 'conversation_access_sessions',
  SECURITY_AUDIT_LOG: 'security_audit_log'
} as const;

// Security Configuration
export interface SecurityConfig {
  passwordHistory: {
    maxEntries: number;
    expirationDays: number;
  };
  accountLockout: {
    maxFailedAttempts: number;
    lockoutDurationMinutes: number;
    checkWindowMinutes: number;
  };
  conversationPassword: {
    maxAttempts: number;
    lockoutDurationSeconds: number;
    sessionExpirationHours: number;
  };
  session: {
    maxConcurrentSessions: number;
    sessionTimeoutMinutes: number;
  };
}

// Default Security Configuration
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  passwordHistory: {
    maxEntries: 10,
    expirationDays: 365
  },
  accountLockout: {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
    checkWindowMinutes: 15
  },
  conversationPassword: {
    maxAttempts: 3,
    lockoutDurationSeconds: 300, // 5 minutes
    sessionExpirationHours: 2
  },
  session: {
    maxConcurrentSessions: 5,
    sessionTimeoutMinutes: 30
  }
};
