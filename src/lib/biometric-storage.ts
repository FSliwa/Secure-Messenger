/**
 * Biometric Credential Storage and Management
 * Handles secure storage and retrieval of biometric credentials
 */

import { supabase } from './supabase';
import { toast } from 'sonner';

export interface BiometricStoredCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  name: string;
  type: 'fingerprint' | 'faceId' | 'touchId' | 'windowsHello';
  device_info: {
    browser: string;
    os: string;
    device_type: string;
  };
  created_at: string;
  last_used?: string;
  is_active: boolean;
}

export class BiometricStorage {
  /**
   * Store biometric credential in database
   */
  static async storeCredential(
    userId: string,
    credentialId: string,
    publicKey: string,
    name: string,
    type: 'fingerprint' | 'faceId' | 'touchId' | 'windowsHello'
  ): Promise<BiometricStoredCredential> {
    const deviceInfo = this.getDeviceInfo();
    
    const { data, error } = await supabase
      .from('biometric_credentials')
      .insert({
        user_id: userId,
        credential_id: credentialId,
        public_key: publicKey,
        name,
        type,
        device_info: deviceInfo,
        created_at: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing biometric credential:', error);
      throw new Error('Failed to store biometric credential');
    }

    return data;
  }

  /**
   * Get user's biometric credentials
   */
  static async getUserCredentials(userId: string): Promise<BiometricStoredCredential[]> {
    const { data, error } = await supabase
      .from('biometric_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching biometric credentials:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get credential by credential ID
   */
  static async getCredentialById(credentialId: string): Promise<BiometricStoredCredential | null> {
    const { data, error } = await supabase
      .from('biometric_credentials')
      .select('*')
      .eq('credential_id', credentialId)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching credential by ID:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update credential last used timestamp
   */
  static async updateLastUsed(credentialId: string): Promise<void> {
    const { error } = await supabase
      .from('biometric_credentials')
      .update({ 
        last_used: new Date().toISOString() 
      })
      .eq('credential_id', credentialId);

    if (error) {
      console.error('Error updating credential last used:', error);
    }
  }

  /**
   * Deactivate credential
   */
  static async deactivateCredential(credentialId: string): Promise<void> {
    const { error } = await supabase
      .from('biometric_credentials')
      .update({ 
        is_active: false 
      })
      .eq('credential_id', credentialId);

    if (error) {
      console.error('Error deactivating credential:', error);
      throw new Error('Failed to deactivate biometric credential');
    }
  }

  /**
   * Get device information
   */
  private static getDeviceInfo() {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let os = 'Unknown';
    let deviceType = 'desktop';

    // Browser detection
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // OS detection
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    // Device type detection
    if (/tablet|ipad/i.test(userAgent)) deviceType = 'tablet';
    else if (/mobile|iphone|android/i.test(userAgent)) deviceType = 'mobile';

    return {
      browser,
      os,
      device_type: deviceType,
    };
  }

  /**
   * Clean up expired or inactive credentials
   */
  static async cleanupInactiveCredentials(userId: string, maxAge: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    const { error } = await supabase
      .from('biometric_credentials')
      .update({ is_active: false })
      .eq('user_id', userId)
      .lt('last_used', cutoffDate.toISOString());

    if (error) {
      console.error('Error cleaning up inactive credentials:', error);
    }
  }
}