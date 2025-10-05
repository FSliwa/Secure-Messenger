import { supabase } from './supabase';
import { toast } from 'sonner';

export interface BiometricCredential {
  id: string;
  name: string;
  type: 'fingerprint' | 'faceId' | 'touchId';
  createdAt: string;
  lastUsed?: string;
}

export interface BiometricRegistrationOptions {
  challenge: ArrayBuffer;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: ArrayBuffer;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  authenticatorSelection: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    userVerification: 'required' | 'preferred' | 'discouraged';
    requireResidentKey?: boolean;
  };
  timeout: number;
  attestation: 'none' | 'indirect' | 'direct';
}

export class BiometricAuthService {
  private static readonly RP_NAME = 'SecureChat';
  private static readonly RP_ID = window.location.hostname;

  /**
   * Check if biometric authentication is supported
   */
  static isSupported(): boolean {
    return !!(typeof window !== 'undefined' && 
             window.PublicKeyCredential && 
             navigator.credentials && 
             typeof navigator.credentials.create === 'function' && 
             typeof navigator.credentials.get === 'function');
  }

  /**
   * Check if platform authenticator (Touch ID, Face ID, Windows Hello) is available
   */
  static async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false;
    
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.error('Error checking platform authenticator:', error);
      return false;
    }
  }

  /**
   * Generate a cryptographically secure challenge
   */
  private static generateChallenge(): ArrayBuffer {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    return challenge.buffer;
  }

  /**
   * Convert string to ArrayBuffer
   */
  private static stringToArrayBuffer(str: string): ArrayBuffer {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
  }

  /**
   * Convert ArrayBuffer to base64url string
   */
  private static arrayBufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Convert base64url string to ArrayBuffer
   */
  private static base64urlToArrayBuffer(base64url: string): ArrayBuffer {
    const padding = '='.repeat((4 - base64url.length % 4) % 4);
    const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Register a new biometric credential
   */
  static async registerBiometric(userId: string, userName: string, displayName: string): Promise<string> {
    if (!this.isSupported()) {
      throw new Error('Biometric authentication is not supported on this device');
    }

    const isPlatformAvailable = await this.isPlatformAuthenticatorAvailable();
    if (!isPlatformAvailable) {
      throw new Error('Platform authenticator (Touch ID/Face ID/Windows Hello) is not available');
    }

    try {
      const challenge = this.generateChallenge();
      const userIdBuffer = this.stringToArrayBuffer(userId);

      const publicKeyCredentialCreationOptions: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: {
            name: this.RP_NAME,
            id: this.RP_ID,
          },
          user: {
            id: userIdBuffer,
            name: userName,
            displayName,
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 }, // ES256
            { type: 'public-key', alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false,
          },
          timeout: 60000,
          attestation: 'none',
        },
      };

      const credential = await navigator.credentials.create(publicKeyCredentialCreationOptions) as PublicKeyCredential;
      
      if (!credential) {
        throw new Error('Failed to create credential');
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialId = this.arrayBufferToBase64url(credential.rawId);
      const publicKey = this.arrayBufferToBase64url(response.getPublicKey()!);

      // Store credential in Supabase
      const { error } = await supabase
        .from('biometric_credentials')
        .insert({
          user_id: userId,
          credential_id: credentialId,
          public_key: publicKey,
          name: this.detectBiometricType(),
          type: this.detectBiometricType(),
          created_at: new Date().toISOString(),
          is_active: true,
        });

      if (error) {
        console.error('Error storing biometric credential:', error);
        throw new Error('Failed to store biometric credential');
      }

      toast.success('Biometric authentication registered successfully');
      return credentialId;

    } catch (error: any) {
      console.error('Biometric registration error:', error);
      
      if (error.name === 'NotAllowedError') {
        throw new Error('Biometric registration was cancelled or not allowed');
      } else if (error.name === 'InvalidStateError') {
        throw new Error('This biometric is already registered');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('Biometric authentication is not supported');
      } else {
        throw new Error(error.message || 'Failed to register biometric authentication');
      }
    }
  }

  /**
   * Authenticate using biometric
   */
  static async authenticateBiometric(userId?: string): Promise<{ success: boolean; credentialId?: string }> {
    if (!this.isSupported()) {
      throw new Error('Biometric authentication is not supported on this device');
    }

    try {
      const challenge = this.generateChallenge();
      
      // Get stored credentials for the user (if userId provided) or all credentials
      let allowCredentials: PublicKeyCredentialDescriptor[] = [];
      
      if (userId) {
        const { data: credentials, error } = await supabase
          .from('biometric_credentials')
          .select('credential_id')
          .eq('user_id', userId)
          .eq('is_active', true);

        if (error) {
          console.error('Error fetching credentials:', error);
        } else if (credentials) {
          allowCredentials = credentials.map(cred => ({
            type: 'public-key' as const,
            id: this.base64urlToArrayBuffer(cred.credential_id),
          }));
        }
      }

      const publicKeyCredentialRequestOptions: CredentialRequestOptions = {
        publicKey: {
          challenge,
          allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
          userVerification: 'required',
          timeout: 60000,
        },
      };

      const credential = await navigator.credentials.get(publicKeyCredentialRequestOptions) as PublicKeyCredential;
      
      if (!credential) {
        return { success: false };
      }

      const credentialId = this.arrayBufferToBase64url(credential.rawId);
      
      // Update last used timestamp
      await supabase
        .from('biometric_credentials')
        .update({ last_used: new Date().toISOString() })
        .eq('credential_id', credentialId);

      return { success: true, credentialId };

    } catch (error: any) {
      console.error('Biometric authentication error:', error);
      
      if (error.name === 'NotAllowedError') {
        throw new Error('Biometric authentication was cancelled');
      } else if (error.name === 'InvalidStateError') {
        throw new Error('Invalid biometric state');
      } else {
        throw new Error(error.message || 'Biometric authentication failed');
      }
    }
  }

  /**
   * Get user's biometric credentials
   */
  static async getBiometricCredentials(userId: string): Promise<BiometricCredential[]> {
    try {
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

      return data?.map(cred => ({
        id: cred.credential_id,
        name: cred.name || 'Biometric Login',
        type: cred.type || 'fingerprint',
        createdAt: cred.created_at,
        lastUsed: cred.last_used,
      })) || [];

    } catch (error) {
      console.error('Error getting biometric credentials:', error);
      return [];
    }
  }

  /**
   * Remove a biometric credential
   */
  static async removeBiometricCredential(credentialId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('biometric_credentials')
        .update({ is_active: false })
        .eq('credential_id', credentialId);

      if (error) {
        throw new Error('Failed to remove biometric credential');
      }

      toast.success('Biometric credential removed successfully');
    } catch (error) {
      console.error('Error removing biometric credential:', error);
      throw error;
    }
  }

  /**
   * Detect biometric type based on user agent
   */
  private static detectBiometricType(): 'fingerprint' | 'faceId' | 'touchId' {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      // iOS devices - could be Touch ID or Face ID
      return 'touchId'; // We'll assume Touch ID as default, Face ID detection is complex
    } else if (userAgent.includes('mac')) {
      return 'touchId';
    } else {
      return 'fingerprint'; // Windows/Android fingerprint
    }
  }

  /**
   * Get biometric capability description
   */
  static async getBiometricCapabilities(): Promise<{
    isSupported: boolean;
    isPlatformAvailable: boolean;
    type: string;
    description: string;
  }> {
    const isSupported = this.isSupported();
    const isPlatformAvailable = isSupported ? await this.isPlatformAuthenticatorAvailable() : false;
    
    let type = 'none';
    let description = 'Biometric authentication is not available';

    if (isSupported && isPlatformAvailable) {
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        type = 'Touch ID / Face ID';
        description = 'Use your fingerprint or face to sign in securely';
      } else if (userAgent.includes('mac')) {
        type = 'Touch ID';
        description = 'Use your fingerprint to sign in securely';
      } else if (userAgent.includes('windows')) {
        type = 'Windows Hello';
        description = 'Use Windows Hello to sign in with your face, fingerprint, or PIN';
      } else {
        type = 'Biometric';
        description = 'Use your biometric authentication to sign in securely';
      }
    }

    return {
      isSupported,
      isPlatformAvailable,
      type,
      description,
    };
  }
}