// Enhanced Authentication with Security Features Integration
import { supabase } from './supabase';
import { isAccountLocked, trackFailedLoginAttempt, LOCKOUT_REASONS } from './account-lockout';
import { savePasswordHistory, isPasswordReused } from './password-history';
import { generateDeviceFingerprint, saveTrustedDevice, isDeviceTrusted, detectSuspiciousActivity } from './trusted-devices';
import { is2FAEnabled, verify2FA } from './two-factor-auth';
import type { AuthError, User } from '@supabase/supabase-js';

export interface EnhancedAuthResult {
  success: boolean;
  user?: User;
  requiresDeviceVerification?: boolean;
  requires2FA?: boolean;
  deviceTrustToken?: string;
  error?: string;
  lockoutInfo?: {
    isLocked: boolean;
    remainingTime?: number;
    reason?: string;
  };
}

export interface LoginOptions {
  email: string;
  password: string;
  deviceName?: string;
  trustDevice?: boolean;
  twoFactorCode?: string;
}

export interface SignUpOptions {
  email: string;
  password: string;
  username: string;
  displayName?: string;
  deviceName?: string;
}

/**
 * Enhanced sign up with security features
 */
export async function enhancedSignUp(options: SignUpOptions): Promise<EnhancedAuthResult> {
  try {
    const { email, password, username, displayName, deviceName } = options;

    // Step 1: Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return { success: false, error: 'An account with this email already exists' };
    }

    // Step 2: Validate password strength
    const { isValid, feedback } = validatePasswordStrength(password);
    if (!isValid) {
      return { success: false, error: `Password requirements not met: ${feedback.join(', ')}` };
    }

    // Step 3: Create auth user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: displayName || username
        }
      }
    });

    if (signUpError) {
      console.error('Sign up error:', signUpError);
      return { success: false, error: signUpError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user account' };
    }

    // Step 4: Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        username,
        email,
        profile: {
          display_name: displayName || username,
          bio: '',
          avatar_url: null
        },
        status: 'online',
        last_activity: new Date().toISOString()
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Clean up auth user if profile creation fails
      await supabase.auth.signOut();
      return { success: false, error: 'Failed to create user profile' };
    }

    // Step 5: Save password to history
    await savePasswordHistory(authData.user.id, password);

    // Step 6: Save trusted device if specified
    if (deviceName) {
      const deviceInfo = generateDeviceFingerprint();
      await saveTrustedDevice(authData.user.id, {
        ...deviceInfo,
        name: deviceName
      });
    }

    // Step 7: Create security alert for account creation
    await supabase
      .from('security_alerts')
      .insert({
        user_id: authData.user.id,
        alert_type: 'account_created',
        description: 'New account created',
        severity: 'info',
        metadata: {
          device_info: generateDeviceFingerprint(),
          registration_ip: 'unknown', // In production, capture real IP
          user_agent: navigator.userAgent
        }
      });

    return { success: true, user: authData.user };
  } catch (error) {
    console.error('Enhanced sign up error:', error);
    return { success: false, error: 'An unexpected error occurred during registration' };
  }
}

/**
 * Enhanced sign in with security features
 */
export async function enhancedSignIn(options: LoginOptions): Promise<EnhancedAuthResult> {
  try {
    const { email, password, deviceName, trustDevice = false, twoFactorCode } = options;

    // Step 1: Get user by email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, username, email')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      // Create security alert for failed login attempt
      await createSecurityAlert(null, 'login_failed', 'Login attempt with non-existent email', {
        email: email,
        reason: 'email_not_found'
      });
      return { success: false, error: 'Invalid email or password' };
    }

    // Step 2: Check if account is locked
    const lockoutCheck = await isAccountLocked(userData.id);
    if (lockoutCheck.isLocked) {
      return {
        success: false,
        error: `Account is locked. Try again in ${lockoutCheck.remainingTime} minutes.`,
        lockoutInfo: {
          isLocked: true,
          remainingTime: lockoutCheck.remainingTime,
          reason: lockoutCheck.lockout?.reason
        }
      };
    }

    // Step 3: Attempt authentication
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError || !authData.user) {
      // Track failed login attempt
      const attemptResult = await trackFailedLoginAttempt(userData.id);
      
      // Create security alert
      await createSecurityAlert(userData.id, 'login_failed', 'Failed login attempt', {
        email: email,
        reason: 'invalid_credentials',
        attempts_count: attemptResult.attemptsCount,
        will_lock: attemptResult.shouldLock
      });

      if (attemptResult.shouldLock) {
        return {
          success: false,
          error: 'Too many failed attempts. Account has been locked for 30 minutes.',
          lockoutInfo: {
            isLocked: true,
            remainingTime: 30,
            reason: LOCKOUT_REASONS.TOO_MANY_FAILED_LOGINS
          }
        };
      }

      return { success: false, error: 'Invalid email or password' };
    }

    // Step 4: Check if 2FA is enabled
    const twoFAStatus = await is2FAEnabled(userData.id);
    if (twoFAStatus.enabled) {
      if (!twoFactorCode) {
        return {
          success: false,
          requires2FA: true,
          error: 'Two-factor authentication code required'
        };
      }

      // Verify 2FA code
      const twoFAResult = await verify2FA(userData.id, twoFactorCode);
      if (!twoFAResult.success) {
        await createSecurityAlert(userData.id, 'two_factor_failed', '2FA verification failed', {
          used_backup_code: twoFAResult.usedBackupCode
        });
        return { success: false, error: twoFAResult.error };
      }

      if (twoFAResult.usedBackupCode) {
        await createSecurityAlert(userData.id, 'backup_code_used', 'Backup code used for 2FA', {});
      }
    }

    // Step 5: Check device trust
    const deviceInfo = generateDeviceFingerprint();
    const deviceTrustCheck = await isDeviceTrusted(userData.id, deviceInfo.fingerprint);

    if (!deviceTrustCheck.isTrusted) {
      // Check for suspicious activity
      const suspiciousCheck = await detectSuspiciousActivity(userData.id, deviceInfo.fingerprint);
      
      if (suspiciousCheck.suspicious) {
        await createSecurityAlert(userData.id, 'suspicious_login', 'Suspicious login detected', {
          reasons: suspiciousCheck.reasons,
          device_info: deviceInfo
        });
      }

      if (trustDevice && deviceName) {
        // Save as trusted device
        await saveTrustedDevice(userData.id, {
          ...deviceInfo,
          name: deviceName
        });
      } else {
        return {
          success: false,
          requiresDeviceVerification: true,
          error: 'Device verification required'
        };
      }
    }

    // Step 6: Update user status and activity
    await supabase
      .from('users')
      .update({
        status: 'online',
        last_activity: new Date().toISOString()
      })
      .eq('id', userData.id);

    // Step 7: Create successful login security alert
    await createSecurityAlert(userData.id, 'login_success', 'Successful login', {
      device_info: deviceInfo,
      trusted_device: deviceTrustCheck.isTrusted,
      two_factor_used: twoFAStatus.enabled
    });

    return { success: true, user: authData.user };
  } catch (error) {
    console.error('Enhanced sign in error:', error);
    return { success: false, error: 'An unexpected error occurred during login' };
  }
}

/**
 * Enhanced password change with security features
 */
export async function enhancedChangePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Step 1: Validate new password strength
    const { isValid, feedback } = validatePasswordStrength(newPassword);
    if (!isValid) {
      return { success: false, error: `Password requirements not met: ${feedback.join(', ')}` };
    }

    // Step 2: Check if password was used before
    const reuseCheck = await isPasswordReused(user.id, newPassword);
    if (reuseCheck.isReused) {
      return { success: false, error: 'Cannot reuse a previous password' };
    }

    // Step 3: Verify current password by attempting re-authentication
    const { data: authData, error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword
    });

    if (verifyError) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Step 4: Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Step 5: Save new password to history
    await savePasswordHistory(user.id, newPassword);

    // Step 6: Create security alert
    await createSecurityAlert(user.id, 'password_changed', 'Password changed successfully', {
      device_info: generateDeviceFingerprint()
    });

    return { success: true };
  } catch (error) {
    console.error('Enhanced password change error:', error);
    return { success: false, error: 'Failed to change password' };
  }
}

/**
 * Enhanced sign out with cleanup
 */
export async function enhancedSignOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Update user status to offline
      await supabase
        .from('users')
        .update({
          status: 'offline',
          last_activity: new Date().toISOString()
        })
        .eq('id', user.id);

      // Invalidate active sessions
      await supabase
        .from('login_sessions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Create security alert
      await createSecurityAlert(user.id, 'logout', 'User logged out', {
        device_info: generateDeviceFingerprint()
      });
    }

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Enhanced sign out error:', error);
    return { success: false, error: 'Failed to sign out' };
  }
}

// Helper functions

/**
 * Create security alert
 */
async function createSecurityAlert(
  userId: string | null,
  alertType: string,
  description: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    if (!userId) return;

    await supabase
      .from('security_alerts')
      .insert({
        user_id: userId,
        alert_type: alertType,
        description,
        severity: getSeverityForAlert(alertType),
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent
        }
      });
  } catch (error) {
    console.error('Failed to create security alert:', error);
  }
}

/**
 * Get severity level for alert type
 */
function getSeverityForAlert(alertType: string): 'low' | 'medium' | 'high' | 'critical' {
  const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    'login_success': 'low',
    'login_failed': 'medium',
    'account_created': 'low',
    'password_changed': 'medium',
    'two_factor_failed': 'high',
    'suspicious_login': 'high',
    'backup_code_used': 'medium',
    'logout': 'low'
  };

  return severityMap[alertType] || 'medium';
}

/**
 * Validate password strength
 */
function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  if (password.length >= 12) {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain uppercase letters');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain numbers');
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain special characters');
  }

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Avoid repeating characters');
  }

  if (/123|abc|qwe|asd|zxc/i.test(password)) {
    score -= 1;
    feedback.push('Avoid common sequences');
  }

  const isValid = score >= 4 && feedback.length === 0;

  return {
    isValid,
    score: Math.max(0, Math.min(6, score)),
    feedback
  };
}

/**
 * Get user security status
 */
export async function getUserSecurityStatus(userId: string): Promise<{
  has2FA: boolean;
  trustedDevicesCount: number;
  recentAlertsCount: number;
  passwordAge: number;
  securityScore: number;
  recommendations: string[];
}> {
  try {
    // Check 2FA status
    const twoFAStatus = await is2FAEnabled(userId);

    // Get trusted devices count
    const { data: trustedDevices } = await supabase
      .from('trusted_devices')
      .select('id')
      .eq('user_id', userId)
      .eq('is_trusted', true);

    // Get recent security alerts
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { data: recentAlerts } = await supabase
      .from('security_alerts')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString());

    // Get password history to calculate age
    const { data: passwordHistory } = await supabase
      .from('password_history')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    const passwordAge = passwordHistory && passwordHistory.length > 0
      ? Math.floor((Date.now() - new Date(passwordHistory[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate security score
    let securityScore = 0;
    const recommendations: string[] = [];

    if (twoFAStatus.enabled) {
      securityScore += 30;
    } else {
      recommendations.push('Enable two-factor authentication');
    }

    if ((trustedDevices?.length || 0) > 0) {
      securityScore += 20;
    } else {
      recommendations.push('Add trusted devices for better security');
    }

    if (passwordAge < 90) {
      securityScore += 25;
    } else {
      recommendations.push('Consider changing your password (current password is over 90 days old)');
    }

    if ((recentAlerts?.length || 0) === 0) {
      securityScore += 25;
    } else {
      recommendations.push('Review recent security alerts');
    }

    return {
      has2FA: twoFAStatus.enabled,
      trustedDevicesCount: trustedDevices?.length || 0,
      recentAlertsCount: recentAlerts?.length || 0,
      passwordAge,
      securityScore,
      recommendations
    };
  } catch (error) {
    console.error('Failed to get user security status:', error);
    return {
      has2FA: false,
      trustedDevicesCount: 0,
      recentAlertsCount: 0,
      passwordAge: 0,
      securityScore: 0,
      recommendations: ['Unable to assess security status']
    };
  }
}