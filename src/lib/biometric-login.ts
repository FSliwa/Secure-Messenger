/**
 * Biometric Login Integration
 * Handles the complete biometric authentication flow with Supabase
 */

import { supabase } from './supabase';
import { BiometricAuthService } from './biometric-auth';
import { BiometricStorage } from './biometric-storage';
import { BiometricSessionAuth } from './biometric-session-auth';
import { toast } from 'sonner';

export interface BiometricLoginResult {
  success: boolean;
  user?: any;
  sessionToken?: string;
  error?: string;
}

export class BiometricLogin {
  /**
   * Perform biometric login
   */
  static async login(): Promise<BiometricLoginResult> {
    try {
      console.log('🔐 Starting biometric login process...');

      // Check if biometric is supported
      if (!BiometricAuthService.isSupported()) {
        return {
          success: false,
          error: 'Biometric authentication is not supported on this device'
        };
      }

      // Check if platform authenticator is available
      const isPlatformAvailable = await BiometricAuthService.isPlatformAuthenticatorAvailable();
      if (!isPlatformAvailable) {
        return {
          success: false,
          error: 'Platform authenticator is not available'
        };
      }

      console.log('✅ Biometric support confirmed');

      // Perform biometric authentication
      const authResult = await BiometricAuthService.authenticateBiometric();
      
      if (!authResult.success || !authResult.credentialId) {
        return {
          success: false,
          error: 'Biometric authentication failed'
        };
      }

      console.log('✅ Biometric authentication successful, credential ID:', authResult.credentialId);

      // Get stored credential from database
      const storedCredential = await BiometricStorage.getCredentialById(authResult.credentialId);
      
      if (!storedCredential) {
        return {
          success: false,
          error: 'Biometric credential not found. Please set up biometric authentication again.'
        };
      }

      console.log('✅ Stored credential found for user:', storedCredential.user_id);

      // Update last used timestamp
      await BiometricStorage.updateLastUsed(authResult.credentialId);

      // Create authenticated session
      const sessionResult = await BiometricSessionAuth.createAuthenticatedSession(
        storedCredential.user_id,
        authResult.credentialId,
        storedCredential.user_id // In real app, you'd get the email from user profile
      );

      if (!sessionResult.success) {
        return {
          success: false,
          error: sessionResult.error || 'Failed to create session'
        };
      }

      console.log('✅ Authenticated session created');

      // Get user profile from the stored credential
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', storedCredential.user_id)
        .single();
        
      if (profileError || !profile) {
        console.error('❌ User profile not found:', profileError);
        return {
          success: false,
          error: 'User profile not found'
        };
      }

      console.log('✅ User profile loaded successfully');

      // For a complete implementation, you would need to:
      // 1. Create a proper Supabase auth session using supabase.auth.setSession()
      // 2. Generate a valid JWT token on the server side
      // 3. Validate the biometric authentication server-side
      
      // For now, we'll return success with the profile data
      toast.success('Biometric authentication successful!');
      
      return {
        success: true,
        sessionToken: sessionResult.session?.session_token,
        user: {
          id: profile.id,
          email: profile.email,
          profile: profile
        }
      };

    } catch (error: any) {
      console.error('❌ Biometric login error:', error);
      
      let errorMessage = 'Biometric login failed';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Biometric authentication was cancelled';
      } else if (error.name === 'InvalidStateError') {
        errorMessage = 'Invalid biometric state';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Register biometric for a user (after they're already authenticated)
   */
  static async registerForUser(userId: string, userEmail: string, displayName: string): Promise<boolean> {
    try {
      console.log('📝 Registering biometric for user:', userId);

      // Register biometric credential
      const credentialId = await BiometricAuthService.registerBiometric(
        userId,
        userEmail,
        displayName
      );

      console.log('✅ Biometric credential registered:', credentialId);

      // Store in database
      const biometricType = this.detectBiometricType();
      await BiometricStorage.storeCredential(
        userId,
        credentialId,
        '', // Public key would be stored in real implementation
        `${biometricType} on ${this.getDeviceName()}`,
        biometricType
      );

      console.log('✅ Biometric credential stored in database');

      toast.success('Biometric authentication set up successfully!');
      return true;

    } catch (error: any) {
      console.error('❌ Biometric registration error:', error);
      toast.error(error.message || 'Failed to set up biometric authentication');
      return false;
    }
  }

  /**
   * Check if user has biometric credentials
   */
  static async hasCredentials(userId: string): Promise<boolean> {
    try {
      const credentials = await BiometricStorage.getUserCredentials(userId);
      return credentials.length > 0;
    } catch (error) {
      console.error('Error checking biometric credentials:', error);
      return false;
    }
  }

  /**
   * Remove biometric credentials for user
   */
  static async removeCredentials(userId: string): Promise<void> {
    try {
      const credentials = await BiometricStorage.getUserCredentials(userId);
      
      // Deactivate all credentials
      for (const credential of credentials) {
        await BiometricStorage.deactivateCredential(credential.credential_id);
      }

      // Revoke all active sessions
      await BiometricSessionAuth.terminateSession();

      toast.success('Biometric credentials removed successfully');
    } catch (error) {
      console.error('Error removing biometric credentials:', error);
      toast.error('Failed to remove biometric credentials');
    }
  }

  /**
   * Validate existing biometric session
   */
  static async validateExistingSession(): Promise<{ valid: boolean; user?: any }> {
    return await BiometricSessionAuth.validateAndRefreshSession();
  }

  /**
   * Logout from biometric session
   */
  static async logout(): Promise<void> {
    await BiometricSessionAuth.terminateSession();
  }

  /**
   * Detect biometric type based on user agent
   */
  private static detectBiometricType(): 'fingerprint' | 'faceId' | 'touchId' | 'windowsHello' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('windows')) {
      return 'windowsHello';
    } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'touchId'; // Could be Face ID too, but hard to detect
    } else if (userAgent.includes('mac')) {
      return 'touchId';
    } else {
      return 'fingerprint'; // Android and other devices
    }
  }

  /**
   * Get friendly device name
   */
  private static getDeviceName(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Linux')) return 'Linux Device';
    
    return 'Unknown Device';
  }

  /**
   * Get biometric capability info for UI
   */
  static async getCapabilityInfo(): Promise<{
    isSupported: boolean;
    isAvailable: boolean;
    type: string;
    description: string;
  }> {
    const isSupported = BiometricAuthService.isSupported();
    const isAvailable = isSupported ? await BiometricAuthService.isPlatformAuthenticatorAvailable() : false;
    
    let type = 'Biometric';
    let description = 'Use your biometric authentication';
    
    if (isSupported && isAvailable) {
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (userAgent.includes('windows')) {
        type = 'Windows Hello';
        description = 'Use Windows Hello to sign in';
      } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        type = 'Touch ID / Face ID';
        description = 'Use Touch ID or Face ID to sign in';
      } else if (userAgent.includes('mac')) {
        type = 'Touch ID';
        description = 'Use Touch ID to sign in';
      } else {
        type = 'Fingerprint';
        description = 'Use your fingerprint to sign in';
      }
    }
    
    return {
      isSupported,
      isAvailable,
      type,
      description
    };
  }
}