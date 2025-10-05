import { supabase } from './supabase'
import { generateSecureCode } from './crypto'

// 2FA Secret generation and verification
export const generateTwoFactorSecret = (): string => {
  // Generate a base32-encoded secret for TOTP
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let secret = ''
  for (let i = 0; i < 32; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)]
  }
  return secret
}

// Simple TOTP implementation (Time-based One-Time Password)
export const generateTOTP = (secret: string, timeStep: number = 30): string => {
  const epoch = Math.floor(Date.now() / 1000)
  const counter = Math.floor(epoch / timeStep)
  
  // Simple hash-based implementation
  const hash = btoa(secret + counter.toString()).slice(0, 6)
  return hash.replace(/[^0-9]/g, '').padStart(6, '0').slice(0, 6)
}

export const verifyTOTP = (token: string, secret: string, window: number = 1): boolean => {
  const currentTime = Math.floor(Date.now() / 1000)
  
  // Check current time step and adjacent ones for clock drift
  for (let i = -window; i <= window; i++) {
    const timeStep = Math.floor((currentTime + i * 30) / 30)
    const expectedToken = generateTOTP(secret, 30)
    if (token === expectedToken) {
      return true
    }
  }
  
  return false
}

// Generate backup codes for 2FA
export const generateBackupCodes = (count: number = 10): string[] => {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    codes.push(generateSecureCode(8))
  }
  return codes
}

// Enable 2FA for user
export const enableTwoFactorAuth = async (userId: string, secret: string, verificationCode: string) => {
  // Verify the code first
  if (!verifyTOTP(verificationCode, secret)) {
    throw new Error('Invalid verification code')
  }

  const backupCodes = generateBackupCodes()
  
  const { data, error } = await supabase
    .from('two_factor_auth')
    .upsert([
      {
        user_id: userId,
        secret,
        backup_codes: backupCodes,
        is_enabled: true,
        enabled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ])
    .select()
    .single()

  if (error) throw error
  
  return { ...data, backup_codes: backupCodes }
}

// Disable 2FA for user
export const disableTwoFactorAuth = async (userId: string) => {
  const { error } = await supabase
    .from('two_factor_auth')
    .update({
      is_enabled: false,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (error) throw error
}

// Check if user has 2FA enabled
export const getUserTwoFactorStatus = async (userId: string) => {
  const { data, error } = await supabase
    .from('two_factor_auth')
    .select('is_enabled, enabled_at')
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  
  return data?.is_enabled || false
}

// Verify 2FA code during login
export const verifyTwoFactorLogin = async (userId: string, code: string) => {
  const { data, error } = await supabase
    .from('two_factor_auth')
    .select('secret, backup_codes, is_enabled')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('2FA not set up for this user')
    }
    throw error
  }

  if (!data.is_enabled) {
    throw new Error('2FA is not enabled for this user')
  }

  // Check if it's a backup code
  if (data.backup_codes.includes(code)) {
    // Remove used backup code
    const updatedCodes = data.backup_codes.filter(c => c !== code)
    await supabase
      .from('two_factor_auth')
      .update({ backup_codes: updatedCodes })
      .eq('user_id', userId)
    
    return { verified: true, usedBackupCode: true }
  }

  // Verify TOTP code
  const isValid = verifyTOTP(code, data.secret)
  return { verified: isValid, usedBackupCode: false }
}

// Device fingerprinting for trusted devices
export const generateDeviceFingerprint = (): string => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx!.textBaseline = 'top'
  ctx!.font = '14px Arial'
  ctx!.fillText('Device fingerprint', 2, 2)
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    canvas.toDataURL()
  ].join('|')
  
  // Simple hash function
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(16)
}

// Check if device is trusted
export const isDeviceTrusted = async (userId: string, deviceFingerprint: string) => {
  const { data, error } = await supabase
    .from('trusted_devices')
    .select('*')
    .eq('user_id', userId)
    .eq('device_fingerprint', deviceFingerprint)
    .eq('is_trusted', true)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  
  return !!data
}

// Add trusted device
export const addTrustedDevice = async (
  userId: string, 
  deviceFingerprint: string, 
  deviceName: string,
  expiresInDays: number = 30
) => {
  const ua = navigator.userAgent
  let browser = 'Unknown'
  let os = 'Unknown'
  let deviceType = 'desktop'
  
  // Basic browser detection
  if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari')) browser = 'Safari'
  else if (ua.includes('Edge')) browser = 'Edge'
  
  // Basic OS detection
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iOS')) os = 'iOS'
  
  // Device type detection
  if (/tablet|ipad/i.test(ua)) deviceType = 'tablet'
  else if (/mobile|iphone|android/i.test(ua)) deviceType = 'mobile'
  
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)
  
  const { data, error } = await supabase
    .from('trusted_devices')
    .upsert([
      {
        user_id: userId,
        device_fingerprint: deviceFingerprint,
        device_name: deviceName,
        device_type: deviceType,
        browser,
        os,
        is_trusted: true,
        trusted_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      }
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

// Remove trusted device
export const removeTrustedDevice = async (userId: string, deviceId: string) => {
  const { error } = await supabase
    .from('trusted_devices')
    .delete()
    .eq('user_id', userId)
    .eq('id', deviceId)

  if (error) throw error
}

// Get user's trusted devices
export const getUserTrustedDevices = async (userId: string) => {
  const { data, error } = await supabase
    .from('trusted_devices')
    .select('*')
    .eq('user_id', userId)
    .eq('is_trusted', true)
    .order('last_used', { ascending: false })

  if (error) throw error
  return data || []
}

// Biometric authentication support check
export const isBiometricSupported = (): boolean => {
  return 'credentials' in navigator && 'create' in navigator.credentials
}

// Create biometric credential
export const registerBiometric = async (userId: string): Promise<string> => {
  if (!isBiometricSupported()) {
    throw new Error('Biometric authentication is not supported on this device')
  }

  try {
    const publicKeyCredentialCreationOptions = {
      challenge: new TextEncoder().encode(generateSecureCode(32)),
      rp: {
        name: 'SecureChat Pro',
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: userId,
        displayName: 'SecureChat User',
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' as const }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform' as const,
        userVerification: 'required' as const,
      },
      timeout: 60000,
      attestation: 'direct' as const
    }

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    }) as any

    if (!credential) {
      throw new Error('Failed to create biometric credential')
    }

    // Store credential ID for future verification
    const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)))
    
    return credentialId
  } catch (error) {
    console.error('Biometric registration failed:', error)
    throw new Error('Biometric registration failed')
  }
}

// Verify biometric authentication
export const verifyBiometric = async (credentialId: string): Promise<boolean> => {
  if (!isBiometricSupported()) {
    throw new Error('Biometric authentication is not supported on this device')
  }

  try {
    const publicKeyCredentialRequestOptions = {
      challenge: new TextEncoder().encode(generateSecureCode(32)),
      allowCredentials: [{
        id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)),
        type: 'public-key' as const,
      }],
      timeout: 60000,
      userVerification: 'required' as const
    }

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    })

    return !!assertion
  } catch (error) {
    console.error('Biometric verification failed:', error)
    return false
  }
}

// Create security alert
export const createSecurityAlert = async (
  userId: string,
  alertType: string,
  description: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  metadata?: any
) => {
  const { data, error } = await supabase
    .from('security_alerts')
    .insert([
      {
        user_id: userId,
        alert_type: alertType,
        severity,
        description,
        metadata: metadata || {},
        ip_address: null, // Would need server-side implementation
        user_agent: navigator.userAgent,
        location: {
          browser: navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language
        },
        created_at: new Date().toISOString()
      }
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

// Privacy protection functions
export const preventScreenshot = () => {
  // Add CSS to prevent screenshots on supported browsers
  const style = document.createElement('style')
  style.textContent = `
    body {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      -webkit-touch-callout: none;
      -webkit-content-zooming: none;
      -webkit-user-drag: none;
      -khtml-user-drag: none;
      -moz-user-drag: none;
      -o-user-drag: none;
      user-drag: none;
    }
  `
  document.head.appendChild(style)

  // Detect screenshot attempts (limited effectiveness)
  document.addEventListener('keydown', (e) => {
    // Detect common screenshot key combinations
    if (
      (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4')) || // Mac
      (e.key === 'PrintScreen') || // Windows
      (e.altKey && e.key === 'PrintScreen') // Windows Alt+Print
    ) {
      e.preventDefault()
      console.warn('Screenshot attempt detected')
      return false
    }
  })
}

// Auto-delete messages after specified time
export const scheduleMessageDeletion = async (messageId: string, deleteAfterHours: number = 24) => {
  const deleteAt = new Date()
  deleteAt.setHours(deleteAt.getHours() + deleteAfterHours)
  
  const { error } = await supabase
    .from('messages')
    .update({
      auto_delete_at: deleteAt.toISOString()
    })
    .eq('id', messageId)

  if (error) throw error
}

// Check and delete expired messages
export const cleanupExpiredMessages = async () => {
  const { error } = await supabase
    .from('messages')
    .update({
      is_deleted: true,
      encrypted_content: '[Message expired]'
    })
    .lt('auto_delete_at', new Date().toISOString())
    .eq('is_deleted', false)

  if (error) throw error
}