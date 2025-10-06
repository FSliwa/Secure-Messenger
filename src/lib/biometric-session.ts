/**
 * Biometric Session Management
 * Handles creating and managing authentication sessions after successful biometric login
 */

import { supabase } from './supabase';
import { createSecurityAlert } from './auth-security';

export interface BiometricSession {
  id: string;
  user_id: string;
  credential_id: string;
  session_token: string;
  expires_at: string;
  created_at: string;
  is_active: boolean;
}

export class BiometricSessionManager {
  /**
   * Create a biometric authentication session
   */
  static async createSession(
    userId: string,
    credentialId: string,
    sessionDurationHours: number = 24
  ): Promise<BiometricSession> {
    try {
      // Generate session token
      const sessionToken = this.generateSessionToken();
      
      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + sessionDurationHours);

      // Store session in database
      const { data, error } = await supabase
        .from('biometric_sessions')
        .insert({
          user_id: userId,
          credential_id: credentialId,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating biometric session:', error);
        throw new Error('Failed to create biometric session');
      }

      // Create security alert for successful biometric login
      await createSecurityAlert(
        userId,
        'biometric_login_success',
        'Successful biometric authentication',
        'low',
        {
          credential_id: credentialId,
          session_id: data.id,
          device_info: this.getDeviceInfo()
        }
      );

      return data;

    } catch (error) {
      console.error('Error in createSession:', error);
      throw error;
    }
  }

  /**
   * Validate a biometric session
   */
  static async validateSession(sessionToken: string): Promise<BiometricSession | null> {
    try {
      const { data, error } = await supabase
        .from('biometric_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Session not found
        }
        console.error('Error validating session:', error);
        throw error;
      }

      return data;

    } catch (error) {
      console.error('Error in validateSession:', error);
      return null;
    }
  }

  /**
   * Invalidate a biometric session
   */
  static async invalidateSession(sessionToken: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('biometric_sessions')
        .update({ 
          is_active: false,
          invalidated_at: new Date().toISOString()
        })
        .eq('session_token', sessionToken);

      if (error) {
        console.error('Error invalidating session:', error);
        throw error;
      }

    } catch (error) {
      console.error('Error in invalidateSession:', error);
      throw error;
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(userId?: string): Promise<void> {
    try {
      let query = supabase
        .from('biometric_sessions')
        .update({ is_active: false })
        .lt('expires_at', new Date().toISOString())
        .eq('is_active', true);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) {
        console.error('Error cleaning up expired sessions:', error);
      }

    } catch (error) {
      console.error('Error in cleanupExpiredSessions:', error);
    }
  }

  /**
   * Get user's active biometric sessions
   */
  static async getUserSessions(userId: string): Promise<BiometricSession[]> {
    try {
      const { data, error } = await supabase
        .from('biometric_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user sessions:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error in getUserSessions:', error);
      return [];
    }
  }

  /**
   * Revoke all biometric sessions for a user
   */
  static async revokeAllUserSessions(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('biometric_sessions')
        .update({ 
          is_active: false,
          invalidated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error revoking user sessions:', error);
        throw error;
      }

      // Create security alert
      await createSecurityAlert(
        userId,
        'biometric_sessions_revoked',
        'All biometric sessions have been revoked',
        'medium',
        {
          action: 'revoke_all_sessions',
          device_info: this.getDeviceInfo()
        }
      );

    } catch (error) {
      console.error('Error in revokeAllUserSessions:', error);
      throw error;
    }
  }

  /**
   * Generate secure session token
   */
  private static generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get device information for logging
   */
  private static getDeviceInfo() {
    const userAgent = navigator.userAgent;
    return {
      userAgent,
      language: navigator.language,
      platform: navigator.platform,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${screen.width}x${screen.height}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Store session token in secure storage
   */
  static storeSessionToken(token: string): void {
    try {
      // Store in sessionStorage (cleared when tab closes)
      sessionStorage.setItem('biometric_session_token', token);
    } catch (error) {
      console.error('Error storing session token:', error);
    }
  }

  /**
   * Get stored session token
   */
  static getStoredSessionToken(): string | null {
    try {
      return sessionStorage.getItem('biometric_session_token');
    } catch (error) {
      console.error('Error getting stored session token:', error);
      return null;
    }
  }

  /**
   * Clear stored session token
   */
  static clearStoredSessionToken(): void {
    try {
      sessionStorage.removeItem('biometric_session_token');
    } catch (error) {
      console.error('Error clearing session token:', error);
    }
  }
}