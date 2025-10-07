// Enhanced Biometric Credentials Management with Database Integration
import { supabase } from './supabase';

export interface BiometricCredential {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  type: 'fingerprint' | 'faceId' | 'touchId';
  counter: number;
  transports: string[];
  device_name: string;
  created_at: string;
  last_used_at: string | null;
}

export interface WebAuthnCredential {
  id: string;
  rawId: ArrayBuffer;
  response: {
    clientDataJSON: ArrayBuffer;
    attestationObject: ArrayBuffer;
  };
  type: 'public-key';
}

/**
 * Save biometric credential to database
 */
export async function saveBiometricCredential(
  userId: string,
  credential: WebAuthnCredential,
  credentialType: 'fingerprint' | 'faceId' | 'touchId' = 'fingerprint',
  deviceName?: string
): Promise<{ success: boolean; credential?: BiometricCredential; error?: string }> {
  try {
    // Extract credential data
    const credentialId = arrayBufferToBase64(credential.rawId);
    const publicKey = await extractPublicKey(credential);
    
    // Detect device name if not provided
    const detectedDeviceName = deviceName || detectDeviceName();
    
    // Get transport methods from authenticator
    const transports = getTransportMethods();

    const credentialData = {
      user_id: userId,
      credential_id: credentialId,
      public_key: publicKey,
      type: credentialType,
      counter: 0,
      transports: transports,
      device_name: detectedDeviceName
    };

    const { data, error } = await supabase
      .from('biometric_credentials')
      .insert(credentialData)
      .select()
      .single();

    if (error) {
      console.error('Failed to save biometric credential:', error);
      return { success: false, error: error.message };
    }

    return { success: true, credential: data };
  } catch (error) {
    console.error('Biometric credential save error:', error);
    return { success: false, error: 'Failed to save biometric credential' };
  }
}

/**
 * Get all biometric credentials for user
 */
export async function getBiometricCredentials(userId: string): Promise<{
  credentials: BiometricCredential[];
  error?: string;
}> {
  try {
    const { data: credentials, error } = await supabase
      .from('biometric_credentials')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get biometric credentials:', error);
      return { credentials: [], error: error.message };
    }

    return { credentials: credentials || [] };
  } catch (error) {
    console.error('Get biometric credentials error:', error);
    return { credentials: [], error: 'Failed to get biometric credentials' };
  }
}

/**
 * Verify biometric credential
 */
export async function verifyBiometricCredential(
  userId: string,
  credentialId: string,
  signature: string,
  clientData: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get stored credential
    const { data: credential, error } = await supabase
      .from('biometric_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('credential_id', credentialId)
      .single();

    if (error || !credential) {
      return { success: false, error: 'Credential not found' };
    }

    // Verify signature against stored public key
    const isValid = await verifySignature(
      credential.public_key,
      signature,
      clientData
    );

    if (!isValid) {
      return { success: false, error: 'Invalid signature' };
    }

    // Update counter and last used timestamp
    await supabase
      .from('biometric_credentials')
      .update({
        counter: credential.counter + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', credential.id);

    return { success: true };
  } catch (error) {
    console.error('Biometric verification error:', error);
    return { success: false, error: 'Failed to verify biometric credential' };
  }
}

/**
 * Remove biometric credential
 */
export async function removeBiometricCredential(
  userId: string,
  credentialId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('biometric_credentials')
      .delete()
      .eq('user_id', userId)
      .eq('credential_id', credentialId);

    if (error) {
      console.error('Failed to remove biometric credential:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Biometric credential removal error:', error);
    return { success: false, error: 'Failed to remove biometric credential' };
  }
}

/**
 * Check if user has biometric credentials
 */
export async function hasBiometricCredentials(userId: string): Promise<{
  hasCredentials: boolean;
  count: number;
  types: string[];
  error?: string;
}> {
  try {
    const { data: credentials, error } = await supabase
      .from('biometric_credentials')
      .select('type')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to check biometric credentials:', error);
      return { hasCredentials: false, count: 0, types: [], error: error.message };
    }

    const types = [...new Set(credentials?.map(c => c.type) || [])];

    return {
      hasCredentials: (credentials?.length || 0) > 0,
      count: credentials?.length || 0,
      types
    };
  } catch (error) {
    console.error('Biometric credentials check error:', error);
    return { hasCredentials: false, count: 0, types: [], error: 'Failed to check credentials' };
  }
}

/**
 * Get biometric credential statistics
 */
export async function getBiometricStats(userId: string): Promise<{
  totalCredentials: number;
  credentialsByType: Record<string, number>;
  credentialsByDevice: Record<string, number>;
  lastUsed?: string;
  oldestCredential?: string;
  error?: string;
}> {
  try {
    const { data: credentials, error } = await supabase
      .from('biometric_credentials')
      .select('type, device_name, created_at, last_used_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to get biometric stats:', error);
      return {
        totalCredentials: 0,
        credentialsByType: {},
        credentialsByDevice: {},
        error: error.message
      };
    }

    const stats = {
      totalCredentials: credentials?.length || 0,
      credentialsByType: {} as Record<string, number>,
      credentialsByDevice: {} as Record<string, number>,
      lastUsed: undefined as string | undefined,
      oldestCredential: undefined as string | undefined
    };

    if (credentials && credentials.length > 0) {
      // Group by type and device
      credentials.forEach(cred => {
        stats.credentialsByType[cred.type] = (stats.credentialsByType[cred.type] || 0) + 1;
        stats.credentialsByDevice[cred.device_name] = (stats.credentialsByDevice[cred.device_name] || 0) + 1;
      });

      // Find latest usage
      const lastUsedTimes = credentials
        .map(c => c.last_used_at)
        .filter(Boolean)
        .sort()
        .reverse();
      
      if (lastUsedTimes.length > 0) {
        stats.lastUsed = lastUsedTimes[0];
      }

      // Find oldest credential
      const createdTimes = credentials
        .map(c => c.created_at)
        .sort();
      
      if (createdTimes.length > 0) {
        stats.oldestCredential = createdTimes[0];
      }
    }

    return stats;
  } catch (error) {
    console.error('Biometric stats error:', error);
    return {
      totalCredentials: 0,
      credentialsByType: {},
      credentialsByDevice: {},
      error: 'Failed to get biometric stats'
    };
  }
}

/**
 * Clean up old or unused biometric credentials
 */
export async function cleanupBiometricCredentials(
  userId: string,
  daysUnused: number = 90
): Promise<{ removedCount: number; error?: string }> {
  try {
    const cutoffDate = new Date(Date.now() - daysUnused * 24 * 60 * 60 * 1000);
    
    const { data: removedCredentials, error } = await supabase
      .from('biometric_credentials')
      .delete()
      .eq('user_id', userId)
      .or(`last_used_at.is.null,last_used_at.lt.${cutoffDate.toISOString()}`)
      .select();

    if (error) {
      console.error('Failed to cleanup biometric credentials:', error);
      return { removedCount: 0, error: error.message };
    }

    return { removedCount: removedCredentials?.length || 0 };
  } catch (error) {
    console.error('Biometric cleanup error:', error);
    return { removedCount: 0, error: 'Failed to cleanup credentials' };
  }
}

// Helper functions

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Extract public key from WebAuthn credential
 */
async function extractPublicKey(credential: WebAuthnCredential): Promise<string> {
  try {
    // This is a simplified implementation
    // In production, properly parse the attestationObject to extract the public key
    const attestationBuffer = credential.response.attestationObject;
    return arrayBufferToBase64(attestationBuffer);
  } catch (error) {
    console.error('Failed to extract public key:', error);
    return '';
  }
}

/**
 * Detect device name from user agent
 */
function detectDeviceName(): string {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) return 'Android Device';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Linux')) return 'Linux Device';
  
  return 'Unknown Device';
}

/**
 * Get available transport methods
 */
function getTransportMethods(): string[] {
  const transports: string[] = [];
  
  // Check for USB support
  if ('usb' in navigator) {
    transports.push('usb');
  }
  
  // Check for NFC support
  if ('nfc' in navigator) {
    transports.push('nfc');
  }
  
  // Check for Bluetooth support
  if ('bluetooth' in navigator) {
    transports.push('ble');
  }
  
  // Internal authenticators are always available on mobile
  if (/iPhone|iPad|Android/i.test(navigator.userAgent)) {
    transports.push('internal');
  }
  
  return transports.length > 0 ? transports : ['internal'];
}

/**
 * Verify signature using stored public key
 */
async function verifySignature(
  publicKeyBase64: string,
  signature: string,
  clientData: string
): Promise<boolean> {
  try {
    // This is a placeholder implementation
    // In production, use proper WebAuthn signature verification
    
    // Convert base64 public key to CryptoKey
    const publicKeyBuffer = base64ToArrayBuffer(publicKeyBase64);
    
    // Import the public key
    const publicKey = await crypto.subtle.importKey(
      'spki',
      publicKeyBuffer,
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      false,
      ['verify']
    );

    // Verify signature
    const signatureBuffer = base64ToArrayBuffer(signature);
    const clientDataBuffer = new TextEncoder().encode(clientData);
    
    const isValid = await crypto.subtle.verify(
      {
        name: 'ECDSA',
        hash: 'SHA-256'
      },
      publicKey,
      signatureBuffer,
      clientDataBuffer
    );

    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate challenge for biometric authentication
 */
export function generateChallenge(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return arrayBufferToBase64(array.buffer);
}

/**
 * Create WebAuthn registration options
 */
export function createRegistrationOptions(userId: string, userEmail: string, challenge: string) {
  return {
    challenge: base64ToArrayBuffer(challenge),
    rp: {
      name: 'SecureChat Pro',
      id: window.location.hostname
    },
    user: {
      id: new TextEncoder().encode(userId),
      name: userEmail,
      displayName: userEmail.split('@')[0]
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' }, // ES256
      { alg: -257, type: 'public-key' } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred'
    },
    timeout: 60000,
    attestation: 'direct'
  };
}

/**
 * Create WebAuthn authentication options
 */
export function createAuthenticationOptions(challenge: string, allowCredentials?: string[]) {
  const options: any = {
    challenge: base64ToArrayBuffer(challenge),
    timeout: 60000,
    userVerification: 'required'
  };

  if (allowCredentials && allowCredentials.length > 0) {
    options.allowCredentials = allowCredentials.map(id => ({
      id: base64ToArrayBuffer(id),
      type: 'public-key',
      transports: ['internal', 'usb', 'ble', 'nfc']
    }));
  }

  return options;
}