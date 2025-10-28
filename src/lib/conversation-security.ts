// Conversation Security Management
import { supabase } from './supabase';
import bcrypt from 'bcryptjs';
import { logSecurityEvent } from './security-audit';

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

/**
 * Set password for a conversation
 */
export async function setConversationPassword(
  conversationId: string,
  password: string,
  userId: string,
  passwordHint?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate salt and hash password
    const saltRounds = 12;
    const salt = await bcrypt.genSalt(saltRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    // Check if password already exists
    const { data: existing } = await supabase
      .from('conversation_passwords')
      .select('id')
      .eq('conversation_id', conversationId)
      .single();

    if (existing) {
      // Update existing password
      const { error } = await supabase
        .from('conversation_passwords')
        .update({
          password_hash: passwordHash,
          salt,
          updated_at: new Date().toISOString(),
          password_hint: passwordHint
        })
        .eq('conversation_id', conversationId);

      if (error) {
        console.error('Failed to update conversation password:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Create new password
      const { error } = await supabase
        .from('conversation_passwords')
        .insert({
          conversation_id: conversationId,
          password_hash: passwordHash,
          salt,
          created_by: userId,
          password_hint: passwordHint,
          max_attempts: 3,
          lockout_duration: 300 // 5 minutes
        });

      if (error) {
        console.error('Failed to set conversation password:', error);
        return { success: false, error: error.message };
      }
    }

    // Log security event
    await logSecurityEvent(userId, 'conversation_password_set', {
      conversation_id: conversationId,
      has_hint: !!passwordHint
    }, 'medium');

    // Invalidate all existing access sessions
    await invalidateConversationSessions(conversationId);

    return { success: true };
  } catch (error) {
    console.error('Conversation password error:', error);
    return { success: false, error: 'Failed to set conversation password' };
  }
}

/**
 * Verify conversation password and create access session
 */
export async function verifyConversationPassword(
  conversationId: string,
  password: string,
  userId: string,
  deviceFingerprint?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ 
  success: boolean; 
  sessionToken?: string;
  error?: string;
  remainingAttempts?: number;
  lockedUntil?: Date;
}> {
  try {
    // Get conversation password
    const { data: conversationPassword, error: fetchError } = await supabase
      .from('conversation_passwords')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (fetchError || !conversationPassword) {
      return { success: false, error: 'Conversation password not found' };
    }

    // Check recent failed attempts
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const { data: recentAttempts, error: attemptsError } = await supabase
      .from('conversation_password_attempts')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .eq('success', false)
      .gte('attempt_time', fiveMinutesAgo.toISOString());

    if (!attemptsError && recentAttempts) {
      const failedAttempts = recentAttempts.length;
      
      if (failedAttempts >= conversationPassword.max_attempts) {
        const lastAttempt = new Date(recentAttempts[recentAttempts.length - 1].attempt_time);
        const lockedUntil = new Date(lastAttempt.getTime() + conversationPassword.lockout_duration * 1000);
        
        if (new Date() < lockedUntil) {
          // Log failed attempt due to lockout
          await logPasswordAttempt(conversationId, userId, false, ipAddress, userAgent);
          
          return { 
            success: false, 
            error: 'Too many failed attempts. Please try again later.',
            remainingAttempts: 0,
            lockedUntil
          };
        }
      }
    }

    // Verify password
    const isValid = await bcrypt.compare(password, conversationPassword.password_hash);

    // Log password attempt
    await logPasswordAttempt(conversationId, userId, isValid, ipAddress, userAgent);

    if (!isValid) {
      const failedAttempts = (recentAttempts?.length || 0) + 1;
      const remainingAttempts = Math.max(0, conversationPassword.max_attempts - failedAttempts);
      
      return { 
        success: false, 
        error: 'Invalid password',
        remainingAttempts
      };
    }

    // Create access session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    const { error: sessionError } = await supabase
      .from('conversation_access_sessions')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        device_fingerprint: deviceFingerprint,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        is_active: true
      });

    if (sessionError) {
      console.error('Failed to create access session:', sessionError);
      return { success: false, error: 'Failed to create access session' };
    }

    // Log security event
    await logSecurityEvent(userId, 'conversation_unlocked', {
      conversation_id: conversationId
    }, 'low', { ip_address: ipAddress, user_agent: userAgent, device_fingerprint: deviceFingerprint });

    return { success: true, sessionToken };
  } catch (error) {
    console.error('Conversation password verification error:', error);
    return { success: false, error: 'Failed to verify password' };
  }
}

/**
 * Check if user has active access session for conversation
 */
export async function hasConversationAccess(
  conversationId: string,
  userId: string,
  sessionToken?: string,
  deviceFingerprint?: string
): Promise<boolean> {
  try {
    // Check if conversation has password protection
    const { data: hasPassword } = await supabase
      .from('conversation_passwords')
      .select('id')
      .eq('conversation_id', conversationId)
      .single();

    if (!hasPassword) {
      return true; // No password protection
    }

    // Build query
    let query = supabase
      .from('conversation_access_sessions')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString());

    // Add optional filters
    if (sessionToken) {
      query = query.eq('session_token', sessionToken);
    }

    if (deviceFingerprint) {
      query = query.eq('device_fingerprint', deviceFingerprint);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error('Failed to check conversation access:', error);
      return false;
    }

    return sessions && sessions.length > 0;
  } catch (error) {
    console.error('Conversation access check error:', error);
    return false;
  }
}

/**
 * Remove conversation password
 */
export async function removeConversationPassword(
  conversationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if user is the creator
    const { data: conversationPassword, error: fetchError } = await supabase
      .from('conversation_passwords')
      .select('created_by')
      .eq('conversation_id', conversationId)
      .single();

    if (fetchError || !conversationPassword) {
      return { success: false, error: 'Conversation password not found' };
    }

    if (conversationPassword.created_by !== userId) {
      return { success: false, error: 'Only the password creator can remove it' };
    }

    // Remove password
    const { error } = await supabase
      .from('conversation_passwords')
      .delete()
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('Failed to remove conversation password:', error);
      return { success: false, error: error.message };
    }

    // Invalidate all access sessions
    await invalidateConversationSessions(conversationId);

    // Log security event
    await logSecurityEvent(userId, 'conversation_password_set', {
      conversation_id: conversationId,
      action: 'removed'
    }, 'medium');

    return { success: true };
  } catch (error) {
    console.error('Remove conversation password error:', error);
    return { success: false, error: 'Failed to remove conversation password' };
  }
}

/**
 * Get conversation password hint
 */
export async function getPasswordHint(conversationId: string): Promise<{
  hint?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('conversation_passwords')
      .select('password_hint')
      .eq('conversation_id', conversationId)
      .single();

    if (error) {
      console.error('Failed to get password hint:', error);
      return { error: error.message };
    }

    return { hint: data?.password_hint };
  } catch (error) {
    console.error('Get password hint error:', error);
    return { error: 'Failed to get password hint' };
  }
}

/**
 * Invalidate all access sessions for a conversation
 */
async function invalidateConversationSessions(conversationId: string): Promise<void> {
  try {
    await supabase
      .from('conversation_access_sessions')
      .update({ is_active: false })
      .eq('conversation_id', conversationId)
      .eq('is_active', true);
  } catch (error) {
    console.error('Failed to invalidate conversation sessions:', error);
  }
}

/**
 * Log password attempt
 */
async function logPasswordAttempt(
  conversationId: string,
  userId: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await supabase
      .from('conversation_password_attempts')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        success,
        ip_address: ipAddress,
        user_agent: userAgent
      });
  } catch (error) {
    console.error('Failed to log password attempt:', error);
  }
}

/**
 * Generate secure session token
 */
function generateSessionToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return token;
}

export default {
  setConversationPassword,
  verifyConversationPassword,
  hasConversationAccess,
  removeConversationPassword,
  getPasswordHint
};
