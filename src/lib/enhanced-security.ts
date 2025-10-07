import { supabase } from './supabase';
import * as bcrypt from 'bcryptjs';

// Types for enhanced security features
export interface AccountLockout {
  id: string;
  user_id: string;
  lockout_reason: 'failed_login' | 'suspicious_activity' | 'admin_action' | 'security_violation';
  locked_at: string;
  unlocks_at: string | null;
  unlock_attempts: number;
  is_permanent: boolean;
  locked_by: string | null;
  unlock_token: string | null;
  metadata: Record<string, any>;
}

export interface LoginAttempt {
  id: string;
  email: string;
  user_id: string | null;
  attempt_time: string;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  failure_reason: string | null;
  device_fingerprint: string | null;
}

export interface PasswordHistoryEntry {
  id: string;
  user_id: string;
  password_hash: string;
  created_at: string;
  expires_at: string;
}

export interface ConversationPassword {
  id: string;
  conversation_id: string;
  password_hash: string;
  salt: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  password_hint: string | null;
  max_attempts: number;
  lockout_duration: number;
}

export interface ConversationAccessSession {
  id: string;
  conversation_id: string;
  user_id: string;
  unlocked_at: string;
  expires_at: string;
  device_fingerprint: string | null;
  session_token: string;
  is_active: boolean;
}

export interface SecurityAuditEntry {
  id: string;
  user_id: string | null;
  event_type: string;
  event_data: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  device_fingerprint: string | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

// Account Lockout Management
class AccountLockoutManager {
  static async checkAccountLocked(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('is_account_locked', { user_uuid: userId });
    
    if (error) {
      console.error('Error checking account lockout:', error);
      return false;
    }
    
    return data || false;
  }

  static async lockAccount(
    userId: string, 
    reason: AccountLockout['lockout_reason'],
    durationMinutes?: number,
    permanent: boolean = false
  ): Promise<string | null> {
    const { data, error } = await supabase
      .rpc('lock_account', { 
        user_uuid: userId, 
        reason,
        duration_minutes: durationMinutes,
        permanent
      });
    
    if (error) {
      console.error('Error locking account:', error);
      return null;
    }
    
    return data;
  }

  static async unlockAccount(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('unlock_account', { user_uuid: userId });
    
    if (error) {
      console.error('Error unlocking account:', error);
      return false;
    }
    
    return data || false;
  }

  static async getAccountLockouts(userId: string): Promise<AccountLockout[]> {
    const { data, error } = await supabase
      .from('account_lockouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching account lockouts:', error);
      return [];
    }
    
    return data || [];
  }
}

// Login Attempt Tracking
class LoginAttemptTracker {
  static async recordLoginAttempt(
    email: string,
    userId: string | null,
    success: boolean,
    failureReason?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const deviceFingerprint = this.generateDeviceFingerprint();
    const ipAddress = await this.getClientIP();
    const userAgent = navigator.userAgent;

    const { error } = await supabase
      .from('login_attempts')
      .insert({
        email,
        user_id: userId,
        success,
        failure_reason: failureReason,
        ip_address: ipAddress,
        user_agent: userAgent,
        device_fingerprint: deviceFingerprint
      });

    if (error) {
      console.error('Error recording login attempt:', error);
    }

    // Check for lockout conditions if login failed
    if (!success && email) {
      await this.checkLockoutConditions(email);
    }
  }

  private static async checkLockoutConditions(email: string): Promise<void> {
    // Get failed attempts in last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('login_attempts')
      .select('*')
      .eq('email', email)
      .eq('success', false)
      .gte('attempt_time', fifteenMinutesAgo);

    if (error || !data) return;

    // Lock account after 5 failed attempts in 15 minutes
    if (data.length >= 5) {
      // Get user ID from email - need to implement a different approach
      // Since getUserByEmail is not available, we'll query the auth.users table
      const { data: users, error: userError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', email)
        .single();
        
      if (!userError && users) {
        await AccountLockoutManager.lockAccount(
          users.id, 
          'failed_login', 
          30 // 30 minutes lockout
        );
      }
    }
  }

  private static generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    return btoa(fingerprint).slice(0, 32);
  }

  private static async getClientIP(): Promise<string | null> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return null;
    }
  }
}

// Password History Management
class PasswordHistoryManager {
  static async addPasswordToHistory(userId: string, passwordHash: string): Promise<void> {
    const { error } = await supabase
      .from('password_history')
      .insert({
        user_id: userId,
        password_hash: passwordHash
      });

    if (error) {
      console.error('Error adding password to history:', error);
    }

    // Clean up old entries (keep last 12 passwords)
    await this.cleanupOldPasswords(userId);
  }

  static async checkPasswordReuse(userId: string, newPasswordHash: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('password_history')
      .select('password_hash')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) {
      console.error('Error checking password history:', error);
      return false;
    }

    if (!data) return false;

    // Check if new password matches any in history
    for (const entry of data) {
      if (await bcrypt.compare(newPasswordHash, entry.password_hash)) {
        return true; // Password was used before
      }
    }

    return false;
  }

  private static async cleanupOldPasswords(userId: string): Promise<void> {
    const { data } = await supabase
      .from('password_history')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(12, 1000); // Keep newest 12, delete the rest

    if (data && data.length > 0) {
      const idsToDelete = data.map(entry => entry.id);
      await supabase
        .from('password_history')
        .delete()
        .in('id', idsToDelete);
    }
  }
}

// Conversation Password Protection
class ConversationPasswordManager {
  static async setConversationPassword(
    conversationId: string, 
    password: string, 
    hint?: string
  ): Promise<boolean> {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const { error } = await supabase
      .from('conversation_passwords')
      .upsert({
        conversation_id: conversationId,
        password_hash: passwordHash,
        salt: salt,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        password_hint: hint,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error setting conversation password:', error);
      return false;
    }

    // Log security event
    await this.logSecurityEvent('conversation_password_set', {
      conversation_id: conversationId,
      has_hint: !!hint
    });

    return true;
  }

  static async verifyConversationPassword(
    conversationId: string, 
    password: string
  ): Promise<boolean> {
    const { data: passwordData, error } = await supabase
      .from('conversation_passwords')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (error || !passwordData) {
      return false;
    }

    const isValid = await bcrypt.compare(password, passwordData.password_hash);
    
    // Record attempt
    await this.recordPasswordAttempt(conversationId, isValid);

    if (isValid) {
      // Create access session
      await this.createAccessSession(conversationId);
      
      // Log security event
      await this.logSecurityEvent('conversation_unlocked', {
        conversation_id: conversationId
      });
    }

    return isValid;
  }

  static async hasConversationAccess(conversationId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('has_conversation_access', { 
        conversation_uuid: conversationId,
        user_uuid: (await supabase.auth.getUser()).data.user?.id
      });
    
    if (error) {
      console.error('Error checking conversation access:', error);
      return false;
    }
    
    return data || false;
  }

  static async removeConversationPassword(conversationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('conversation_passwords')
      .delete()
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('Error removing conversation password:', error);
      return false;
    }

    // Also remove all access sessions
    await supabase
      .from('conversation_access_sessions')
      .delete()
      .eq('conversation_id', conversationId);

    return true;
  }

  static async getConversationPasswordInfo(conversationId: string): Promise<{
    hasPassword: boolean;
    hint: string | null;
    maxAttempts: number;
  }> {
    const { data, error } = await supabase
      .from('conversation_passwords')
      .select('password_hint, max_attempts')
      .eq('conversation_id', conversationId)
      .single();

    if (error || !data) {
      return { hasPassword: false, hint: null, maxAttempts: 3 };
    }

    return {
      hasPassword: true,
      hint: data.password_hint,
      maxAttempts: data.max_attempts
    };
  }

  private static async createAccessSession(conversationId: string): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const sessionToken = crypto.randomUUID();
    const deviceFingerprint = LoginAttemptTracker['generateDeviceFingerprint']();
    
    const { error } = await supabase
      .from('conversation_access_sessions')
      .upsert({
        conversation_id: conversationId,
        user_id: user.id,
        device_fingerprint: deviceFingerprint,
        session_token: sessionToken,
        expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
      });

    if (error) {
      console.error('Error creating access session:', error);
    }
  }

  private static async recordPasswordAttempt(conversationId: string, success: boolean): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const { error } = await supabase
      .from('conversation_password_attempts')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        success: success,
        ip_address: await LoginAttemptTracker['getClientIP'](),
        user_agent: navigator.userAgent
      });

    if (error) {
      console.error('Error recording password attempt:', error);
    }
  }

  private static async logSecurityEvent(eventType: string, eventData: Record<string, any>): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    
    const { error } = await supabase
      .from('security_audit_log')
      .insert({
        user_id: user?.id,
        event_type: eventType,
        event_data: eventData,
        ip_address: await LoginAttemptTracker['getClientIP'](),
        user_agent: navigator.userAgent,
        device_fingerprint: LoginAttemptTracker['generateDeviceFingerprint'](),
        severity: 'medium'
      });

    if (error) {
      console.error('Error logging security event:', error);
    }
  }
}

// Security Audit System
class SecurityAuditManager {
  static async logSecurityEvent(
    eventType: string,
    eventData: Record<string, any> = {},
    severity: SecurityAuditEntry['severity'] = 'medium'
  ): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    
    const { error } = await supabase
      .from('security_audit_log')
      .insert({
        user_id: user?.id,
        event_type: eventType,
        event_data: eventData,
        ip_address: await LoginAttemptTracker['getClientIP'](),
        user_agent: navigator.userAgent,
        device_fingerprint: LoginAttemptTracker['generateDeviceFingerprint'](),
        severity: severity
      });

    if (error) {
      console.error('Error logging security event:', error);
    }
  }

  static async getSecurityAuditLog(userId?: string, limit: number = 50): Promise<SecurityAuditEntry[]> {
    let query = supabase
      .from('security_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching security audit log:', error);
      return [];
    }

    return data || [];
  }
}

// Enhanced Biometric Management
class EnhancedBiometricManager {
  static async registerBiometric(
    credentialId: string,
    publicKey: string,
    deviceId?: string
  ): Promise<boolean> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return false;

    const { error } = await supabase
      .from('biometric_credentials')
      .insert({
        user_id: user.id,
        credential_id: credentialId,
        public_key: publicKey,
        device_id: deviceId,
        is_active: true,
        last_used: new Date().toISOString(),
        usage_count: 0,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
      });

    if (error) {
      console.error('Error registering biometric:', error);
      return false;
    }

    await SecurityAuditManager.logSecurityEvent('biometric_enrolled', {
      credential_id: credentialId,
      device_id: deviceId
    }, 'medium');

    return true;
  }

  static async updateBiometricUsage(credentialId: string): Promise<void> {
    const { error } = await supabase
      .from('biometric_credentials')
      .update({
        last_used: new Date().toISOString(),
        usage_count: 'usage_count + 1'
      })
      .eq('credential_id', credentialId);

    if (error) {
      console.error('Error updating biometric usage:', error);
    }
  }

  static async getBiometricCredentials(): Promise<any[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];

    const { data, error } = await supabase
      .from('biometric_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error fetching biometric credentials:', error);
      return [];
    }

    return data || [];
  }
}

// Enhanced Trusted Device Management
class EnhancedTrustedDeviceManager {
  static async addTrustedDevice(
    deviceFingerprint: string,
    deviceName: string,
    trustLevel: number = 1,
    expirationDays: number = 30
  ): Promise<boolean> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return false;

    const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('trusted_devices')
      .upsert({
        user_id: user.id,
        device_fingerprint: deviceFingerprint,
        device_name: deviceName,
        trust_level: trustLevel,
        is_trusted: true,
        trusted_at: new Date().toISOString(),
        expires_at: expiresAt,
        last_verified: new Date().toISOString()
      });

    if (error) {
      console.error('Error adding trusted device:', error);
      return false;
    }

    await SecurityAuditManager.logSecurityEvent('device_trusted', {
      device_name: deviceName,
      trust_level: trustLevel,
      expires_at: expiresAt
    });

    return true;
  }

  static async revokeTrustedDevice(deviceId: string, reason?: string): Promise<boolean> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return false;

    const { error } = await supabase
      .from('trusted_devices')
      .update({
        is_trusted: false,
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
        revoke_reason: reason
      })
      .eq('id', deviceId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error revoking trusted device:', error);
      return false;
    }

    await SecurityAuditManager.logSecurityEvent('device_untrusted', {
      device_id: deviceId,
      reason: reason
    }, 'high');

    return true;
  }

  static async getTrustedDevices(): Promise<any[]> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];

    const { data, error } = await supabase
      .from('trusted_devices')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_trusted', true)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error fetching trusted devices:', error);
      return [];
    }

    return data || [];
  }
}

// Export all managers
export {
  AccountLockoutManager,
  LoginAttemptTracker,
  PasswordHistoryManager,
  ConversationPasswordManager,
  SecurityAuditManager,
  EnhancedBiometricManager,
  EnhancedTrustedDeviceManager
};