/**
 * Biometric Session Authentication
 * Integrates biometric authentication with Supabase auth system
 */

import { supabase } from './supabase';
import { BiometricSessionManager } from './biometric-session';
import { createSecurityAlert } from './auth-security';

/**
 * Create a Supabase auth session after successful biometric authentication
 * Note: This is a simplified implementation for demonstration.
 * In production, this would require server-side JWT generation and validation.
 */
export class BiometricSessionAuth {
  /**
   * Create an authenticated session after biometric verification
   * This is a demo implementation - in production you'd need:
   * 1. Server-side validation of biometric authentication
   * 2. JWT token generation on the server
   * 3. Proper session creation with Supabase
   */
  static async createAuthenticatedSession(
    userId: string,
    credentialId: string,
    userEmail: string
  ): Promise<{ success: boolean; session?: any; error?: string }> {
    try {
      console.log('🔐 Creating authenticated session for biometric login...');

      // Create biometric session record
      const biometricSession = await BiometricSessionManager.createSession(
        userId,
        credentialId,
        24 // 24 hours
      );

      console.log('✅ Biometric session created:', biometricSession.id);

      // Store session token
      BiometricSessionManager.storeSessionToken(biometricSession.session_token);

      // In a real implementation, you would:
      // 1. Call your backend API to validate the biometric authentication
      // 2. Get a JWT token from your backend
      // 3. Use supabase.auth.setSession() with the JWT

      // For demonstration, we'll simulate a successful authentication
      // Note: This doesn't create a real Supabase auth session
      
      // Create security alert
      await createSecurityAlert(
        userId,
        'biometric_auth_success',
        'Successful biometric authentication and session creation',
        'low',
        {
          credential_id: credentialId,
          session_id: biometricSession.id,
          method: 'biometric'
        }
      );

      return {
        success: true,
        session: {
          biometric_session_id: biometricSession.id,
          session_token: biometricSession.session_token,
          expires_at: biometricSession.expires_at,
          user_id: userId
        }
      };

    } catch (error: any) {
      console.error('❌ Error creating authenticated session:', error);
      
      // Create security alert for failed attempt
      try {
        await createSecurityAlert(
          userId,
          'biometric_auth_failure',
          'Failed biometric authentication session creation',
          'medium',
          {
            credential_id: credentialId,
            error: error.message
          }
        );
      } catch (alertError) {
        console.error('Failed to create security alert:', alertError);
      }

      return {
        success: false,
        error: error.message || 'Failed to create authenticated session'
      };
    }
  }

  /**
   * Validate and refresh biometric session
   */
  static async validateAndRefreshSession(): Promise<{
    valid: boolean;
    session?: any;
    user?: any;
  }> {
    try {
      const sessionToken = BiometricSessionManager.getStoredSessionToken();
      
      if (!sessionToken) {
        return { valid: false };
      }

      const session = await BiometricSessionManager.validateSession(sessionToken);
      
      if (!session) {
        BiometricSessionManager.clearStoredSessionToken();
        return { valid: false };
      }

      // Get user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user_id)
        .single();

      if (profileError || !userProfile) {
        console.error('Error fetching user profile:', profileError);
        return { valid: false };
      }

      return {
        valid: true,
        session: {
          biometric_session_id: session.id,
          session_token: session.session_token,
          expires_at: session.expires_at,
          user_id: session.user_id
        },
        user: {
          id: userProfile.id,
          email: userProfile.email,
          profile: userProfile
        }
      };

    } catch (error) {
      console.error('Error validating biometric session:', error);
      return { valid: false };
    }
  }

  /**
   * Terminate biometric session
   */
  static async terminateSession(): Promise<void> {
    try {
      const sessionToken = BiometricSessionManager.getStoredSessionToken();
      
      if (sessionToken) {
        await BiometricSessionManager.invalidateSession(sessionToken);
        BiometricSessionManager.clearStoredSessionToken();
      }

      console.log('✅ Biometric session terminated');

    } catch (error) {
      console.error('Error terminating biometric session:', error);
    }
  }

  /**
   * Check if user has active biometric session
   */
  static hasActiveSession(): boolean {
    const sessionToken = BiometricSessionManager.getStoredSessionToken();
    return !!sessionToken;
  }

  /**
   * Get current session info
   */
  static async getCurrentSessionInfo(): Promise<{
    hasSession: boolean;
    sessionInfo?: any;
  }> {
    try {
      const sessionToken = BiometricSessionManager.getStoredSessionToken();
      
      if (!sessionToken) {
        return { hasSession: false };
      }

      const session = await BiometricSessionManager.validateSession(sessionToken);
      
      if (!session) {
        BiometricSessionManager.clearStoredSessionToken();
        return { hasSession: false };
      }

      return {
        hasSession: true,
        sessionInfo: {
          id: session.id,
          created_at: session.created_at,
          expires_at: session.expires_at,
          user_id: session.user_id,
          credential_id: session.credential_id
        }
      };

    } catch (error) {
      console.error('Error getting session info:', error);
      return { hasSession: false };
    }
  }
}

/**  
 * Production Implementation Notes:
 * 
 * For a production-ready biometric authentication system, you would need:
 * 
 * 1. SERVER-SIDE VALIDATION:
 *    - Validate biometric authentication server-side
 *    - Verify the WebAuthn assertion on your backend
 *    - Generate signed JWT tokens
 * 
 * 2. SECURE SESSION CREATION:
 *    - Use supabase.auth.setSession() with server-generated JWT
 *    - Implement proper session refresh mechanisms
 *    - Handle token expiration gracefully
 * 
 * 3. SECURITY MEASURES:
 *    - Rate limiting for biometric attempts
 *    - Audit logging of all authentication events
 *    - Secure credential storage and management
 *    - Cross-device session management
 * 
 * 4. BACKEND API ENDPOINTS:
 *    POST /api/auth/biometric/register - Register biometric credential
 *    POST /api/auth/biometric/verify - Verify biometric authentication
 *    POST /api/auth/biometric/sessions - Manage biometric sessions
 *    DELETE /api/auth/biometric/revoke - Revoke credentials/sessions
 * 
 * 5. DATABASE CONSIDERATIONS:
 *    - Store credential public keys securely
 *    - Implement proper credential lifecycle management
 *    - Handle device changes and credential rotation
 *    - Maintain audit trails
 */