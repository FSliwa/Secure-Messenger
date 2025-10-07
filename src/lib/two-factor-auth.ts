// Two-Factor Authentication (TOTP) Management
import { supabase } from './supabase';

export interface TwoFactorAuth {
  id: string;
  user_id: string;
  secret: string;
  backup_codes: string[];
  is_enabled: boolean;
  enabled_at: string | null;
  last_used_at: string | null;
}

export interface TotpSetup {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
  backupCodes: string[];
}

/**
 * Generate TOTP secret and setup data
 */
export async function generateTotpSetup(userEmail: string): Promise<{
  success: boolean;
  setup?: TotpSetup;
  error?: string;
}> {
  try {
    // Generate a random 32-character base32 secret
    const secret = generateBase32Secret();
    
    // Generate backup codes
    const backupCodes = generateBackupCodes();
    
    // Create QR code URL for authenticator apps
    const appName = 'SecureChat Pro';
    const qrCodeUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;
    
    return {
      success: true,
      setup: {
        secret,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.match(/.{1,4}/g)?.join(' ') || secret,
        backupCodes
      }
    };
  } catch (error) {
    console.error('TOTP setup generation error:', error);
    return { success: false, error: 'Failed to generate TOTP setup' };
  }
}

/**
 * Enable 2FA for user
 */
export async function enable2FA(
  userId: string,
  secret: string,
  backupCodes: string[],
  verificationCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify the code before enabling
    const isValid = await verifyTotpCode(secret, verificationCode);
    if (!isValid) {
      return { success: false, error: 'Invalid verification code' };
    }

    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => hashBackupCode(code))
    );

    const { error } = await supabase
      .from('two_factor_auth')
      .upsert({
        user_id: userId,
        secret: secret,
        backup_codes: hashedBackupCodes,
        is_enabled: true,
        enabled_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to enable 2FA:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('2FA enable error:', error);
    return { success: false, error: 'Failed to enable 2FA' };
  }
}

/**
 * Verify TOTP code
 */
export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  try {
    // Get current time in 30-second windows
    const currentTime = Math.floor(Date.now() / 1000);
    const timeWindows = [
      Math.floor(currentTime / 30) - 1, // Previous window
      Math.floor(currentTime / 30),     // Current window
      Math.floor(currentTime / 30) + 1  // Next window
    ];

    // Check code against all time windows (allows for clock drift)
    for (const timeWindow of timeWindows) {
      const expectedCode = generateTotpCode(secret, timeWindow);
      if (expectedCode === code) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('TOTP verification error:', error);
    return false;
  }
}

/**
 * Verify 2FA code for user
 */
export async function verify2FA(
  userId: string,
  code: string
): Promise<{ success: boolean; usedBackupCode?: boolean; error?: string }> {
  try {
    const { data: twoFA, error } = await supabase
      .from('two_factor_auth')
      .select('*')
      .eq('user_id', userId)
      .eq('is_enabled', true)
      .single();

    if (error || !twoFA) {
      return { success: false, error: '2FA not enabled for this user' };
    }

    // First try TOTP verification
    if (await verifyTotpCode(twoFA.secret, code)) {
      // Update last used timestamp
      await supabase
        .from('two_factor_auth')
        .update({ last_used_at: new Date().toISOString() })
        .eq('user_id', userId);

      return { success: true };
    }

    // Try backup code verification
    for (let i = 0; i < twoFA.backup_codes.length; i++) {
      const hashedCode = twoFA.backup_codes[i];
      if (await verifyBackupCode(code, hashedCode)) {
        // Remove used backup code
        const updatedBackupCodes = [...twoFA.backup_codes];
        updatedBackupCodes.splice(i, 1);

        await supabase
          .from('two_factor_auth')
          .update({ 
            backup_codes: updatedBackupCodes,
            last_used_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        return { success: true, usedBackupCode: true };
      }
    }

    return { success: false, error: 'Invalid 2FA code' };
  } catch (error) {
    console.error('2FA verification error:', error);
    return { success: false, error: 'Failed to verify 2FA code' };
  }
}

/**
 * Disable 2FA for user
 */
export async function disable2FA(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('two_factor_auth')
      .update({ is_enabled: false })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to disable 2FA:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('2FA disable error:', error);
    return { success: false, error: 'Failed to disable 2FA' };
  }
}

/**
 * Check if 2FA is enabled for user
 */
export async function is2FAEnabled(userId: string): Promise<{
  enabled: boolean;
  hasBackupCodes: boolean;
  error?: string;
}> {
  try {
    const { data: twoFA, error } = await supabase
      .from('two_factor_auth')
      .select('is_enabled, backup_codes')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return { enabled: false, hasBackupCodes: false };
      }
      console.error('Failed to check 2FA status:', error);
      return { enabled: false, hasBackupCodes: false, error: error.message };
    }

    return {
      enabled: twoFA.is_enabled,
      hasBackupCodes: twoFA.backup_codes && twoFA.backup_codes.length > 0
    };
  } catch (error) {
    console.error('2FA status check error:', error);
    return { enabled: false, hasBackupCodes: false, error: 'Failed to check 2FA status' };
  }
}

/**
 * Generate new backup codes
 */
export async function generateNewBackupCodes(userId: string): Promise<{
  success: boolean;
  backupCodes?: string[];
  error?: string;
}> {
  try {
    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => hashBackupCode(code))
    );

    const { error } = await supabase
      .from('two_factor_auth')
      .update({ backup_codes: hashedBackupCodes })
      .eq('user_id', userId)
      .eq('is_enabled', true);

    if (error) {
      console.error('Failed to generate new backup codes:', error);
      return { success: false, error: error.message };
    }

    return { success: true, backupCodes };
  } catch (error) {
    console.error('Backup codes generation error:', error);
    return { success: false, error: 'Failed to generate backup codes' };
  }
}

// Helper functions

/**
 * Generate base32 secret for TOTP
 */
function generateBase32Secret(): string {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  
  for (let i = 0; i < 32; i++) {
    secret += base32Chars[Math.floor(Math.random() * base32Chars.length)];
  }
  
  return secret;
}

/**
 * Generate backup codes
 */
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < 8; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    codes.push(code);
  }
  
  return codes;
}

/**
 * Generate TOTP code for given time window
 */
function generateTotpCode(secret: string, timeWindow: number): string {
  // This is a simplified implementation
  // In production, use a proper TOTP library like 'otplib'
  
  // Convert base32 secret to bytes (simplified)
  const secretBytes = base32ToBytes(secret);
  
  // Create HMAC-SHA1 hash
  const timeBytes = new ArrayBuffer(8);
  const timeView = new DataView(timeBytes);
  timeView.setUint32(4, timeWindow);
  
  // This is a placeholder - use proper HMAC-SHA1 implementation
  const hash = simpleHash(secretBytes, new Uint8Array(timeBytes));
  
  // Extract 6-digit code
  const offset = hash[hash.length - 1] & 0x0f;
  const code = ((hash[offset] & 0x7f) << 24) |
               ((hash[offset + 1] & 0xff) << 16) |
               ((hash[offset + 2] & 0xff) << 8) |
               (hash[offset + 3] & 0xff);
               
  return (code % 1000000).toString().padStart(6, '0');
}

/**
 * Simple base32 to bytes conversion (placeholder)
 */
function base32ToBytes(base32: string): Uint8Array {
  // Simplified implementation - use proper base32 library in production
  return new TextEncoder().encode(base32);
}

/**
 * Simple hash function (placeholder)
 */
function simpleHash(key: Uint8Array, data: Uint8Array): Uint8Array {
  // Placeholder - use proper HMAC-SHA1 implementation
  const result = new Uint8Array(20);
  for (let i = 0; i < 20; i++) {
    result[i] = (key[i % key.length] ^ data[i % data.length]) & 0xff;
  }
  return result;
}

/**
 * Hash backup code for secure storage
 */
async function hashBackupCode(code: string): Promise<string> {
  // Simple hash - in production use bcrypt or similar
  const encoder = new TextEncoder();
  const data = encoder.encode(code + 'backup_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify backup code against hash
 */
async function verifyBackupCode(code: string, hashedCode: string): Promise<boolean> {
  const hashedInput = await hashBackupCode(code);
  return hashedInput === hashedCode;
}

/**
 * Get 2FA recovery information
 */
export async function get2FARecoveryInfo(userId: string): Promise<{
  backupCodesCount: number;
  lastUsed?: string;
  error?: string;
}> {
  try {
    const { data: twoFA, error } = await supabase
      .from('two_factor_auth')
      .select('backup_codes, last_used_at')
      .eq('user_id', userId)
      .eq('is_enabled', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return { backupCodesCount: 0 };
      }
      console.error('Failed to get 2FA recovery info:', error);
      return { backupCodesCount: 0, error: error.message };
    }

    return {
      backupCodesCount: twoFA.backup_codes?.length || 0,
      lastUsed: twoFA.last_used_at || undefined
    };
  } catch (error) {
    console.error('2FA recovery info error:', error);
    return { backupCodesCount: 0, error: 'Failed to get recovery info' };
  }
}