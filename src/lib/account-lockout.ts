// Account Lockout Management
import { supabase } from './supabase';
import { logSecurityEvent as logSecurityAuditEvent } from './security-audit';

export interface AccountLockout {
  id: string;
  user_id: string;
  reason: string;
  locked_until: string;
  locked_by?: string;
  is_active: boolean;
  created_at: string;
  unlock_attempts?: number;
  is_permanent?: boolean;
  unlock_token?: string;
  metadata?: any;
}

export interface LockoutReason {
  FAILED_LOGIN: 'failed_login';
  SUSPICIOUS_ACTIVITY: 'suspicious_activity';
  ADMIN_ACTION: 'admin_action';
  SECURITY_VIOLATION: 'security_violation';
}

const LOCKOUT_REASONS: LockoutReason = {
  FAILED_LOGIN: 'failed_login',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity', 
  ADMIN_ACTION: 'admin_action',
  SECURITY_VIOLATION: 'security_violation'
};

/**
 * Lock user account for specified duration
 */
export async function lockAccount(
  userId: string, 
  reason: keyof LockoutReason, 
  durationMinutes: number = 30,
  isPermanent: boolean = false,
  metadata?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    
    const { error } = await supabase
      .from('account_lockouts')
      .insert({
        user_id: userId,
        reason: LOCKOUT_REASONS[reason],
        locked_until: lockedUntil.toISOString(),
        is_active: true,
        is_permanent: isPermanent,
        metadata: metadata || {}
      });

    if (error) {
      console.error('Failed to lock account:', error);
      return { success: false, error: error.message };
    }

    // Log security event
    await logSecurityAuditEvent(userId, 'account_locked', {
      reason,
      duration_minutes: durationMinutes,
      is_permanent: isPermanent
    }, isPermanent ? 'critical' : 'high');

    // Update user status to reflect lockout
    await supabase
      .from('users')
      .update({ 
        status: 'offline',
        last_seen: new Date().toISOString()
      })
      .eq('id', userId);

    return { success: true };
  } catch (error) {
    console.error('Account lockout error:', error);
    return { success: false, error: 'Failed to lock account' };
  }
}

/**
 * Check if user account is currently locked
 */
export async function isAccountLocked(userId: string): Promise<{
  isLocked: boolean;
  lockout?: AccountLockout;
  remainingTime?: number;
}> {
  try {
    const { data: lockouts, error } = await supabase
      .from('account_lockouts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('locked_until', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to check account lockout:', error);
      return { isLocked: false };
    }

    if (!lockouts || lockouts.length === 0) {
      return { isLocked: false };
    }

    const lockout = lockouts[0];
    const lockedUntil = new Date(lockout.locked_until);
    const now = new Date();
    
    if (now < lockedUntil) {
      const remainingTime = Math.ceil((lockedUntil.getTime() - now.getTime()) / (1000 * 60)); // minutes
      return { 
        isLocked: true, 
        lockout,
        remainingTime 
      };
    }

    // Lockout expired, deactivate it
    await unlockAccount(userId);
    return { isLocked: false };

  } catch (error) {
    console.error('Error checking account lockout:', error);
    return { isLocked: false };
  }
}

/**
 * Unlock user account
 */
export async function unlockAccount(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('account_lockouts')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to unlock account:', error);
      return { success: false, error: error.message };
    }

    // Log security event
    await logSecurityAuditEvent(userId, 'account_unlocked', {
      unlocked_at: new Date().toISOString()
    }, 'medium');

    return { success: true };
  } catch (error) {
    console.error('Account unlock error:', error);
    return { success: false, error: 'Failed to unlock account' };
  }
}

/**
 * Get account lockout history
 */
export async function getAccountLockoutHistory(userId: string): Promise<{
  lockouts: AccountLockout[];
  error?: string;
}> {
  try {
    const { data: lockouts, error } = await supabase
      .from('account_lockouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get lockout history:', error);
      return { lockouts: [], error: error.message };
    }

    return { lockouts: lockouts || [] };
  } catch (error) {
    console.error('Error getting lockout history:', error);
    return { lockouts: [], error: 'Failed to get lockout history' };
  }
}

/**
 * Track failed login attempt
 */
export async function trackFailedLoginAttempt(
  email: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  failureReason?: string
): Promise<{
  shouldLock: boolean;
  attemptsCount: number;
}> {
  try {
    // Log the failed attempt
    await supabase
      .from('login_attempts')
      .insert({
        email,
        user_id: userId,
        success: false,
        ip_address: ipAddress,
        user_agent: userAgent,
        failure_reason: failureReason
      });

    if (!userId) {
      return { shouldLock: false, attemptsCount: 0 };
    }

    // Get recent failed attempts (last 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const { data: recentAttempts, error } = await supabase
      .from('login_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('success', false)
      .gte('attempt_time', fifteenMinutesAgo.toISOString());

    if (error) {
      console.error('Failed to check recent attempts:', error);
      return { shouldLock: false, attemptsCount: 0 };
    }

    const attemptsCount = recentAttempts?.length || 0;
    
    // Lock account after 5 failed attempts
    if (attemptsCount >= 5) {
      await lockAccount(userId, 'FAILED_LOGIN', 30, false, {
        attempts_count: attemptsCount,
        ip_address: ipAddress
      });
      return { shouldLock: true, attemptsCount };
    }

    return { shouldLock: false, attemptsCount };
  } catch (error) {
    console.error('Error tracking failed login attempt:', error);
    return { shouldLock: false, attemptsCount: 0 };
  }
}


/**
 * Track successful login
 */
export async function trackSuccessfulLogin(
  email: string,
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    // Log the successful attempt
    await supabase
      .from('login_attempts')
      .insert({
        email,
        user_id: userId,
        success: true,
        ip_address: ipAddress,
        user_agent: userAgent
      });

    // Log security event
    await logSecurityAuditEvent(userId, 'login_success', {
      email,
      ip_address: ipAddress
    }, 'low', { ip_address: ipAddress, user_agent: userAgent });
  } catch (error) {
    console.error('Error tracking successful login:', error);
  }
}

export { LOCKOUT_REASONS };