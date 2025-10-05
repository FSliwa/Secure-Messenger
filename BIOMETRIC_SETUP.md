# Biometric Authentication Setup Guide

## Overview

SecureChat now supports biometric authentication using fingerprint, Face ID, Touch ID, and Windows Hello through the Web Authentication API (WebAuthn). This provides a secure, convenient way for users to log in without typing passwords.

## Features

### Supported Biometric Methods
- **Touch ID** (macOS)
- **Face ID** (iOS/macOS)
- **Windows Hello** (Windows 10/11)
- **Android Fingerprint** (Android devices)
- **Hardware Security Keys** (FIDO2/WebAuthn compatible)

### Security Features
- **Private Key Storage**: Biometric data never leaves the device
- **Public Key Cryptography**: Only cryptographic keys are stored on servers
- **Device-Specific**: Each device generates unique credentials
- **Revocable**: Individual biometric credentials can be removed
- **Multiple Devices**: Users can register multiple devices

## How It Works

### Registration Process
1. User logs in with username/password
2. Goes to Security Settings → Biometric tab
3. Clicks "Add Biometric" button
4. System prompts for biometric authentication (fingerprint/face/PIN)
5. Browser generates a key pair using the device's secure element
6. Public key is stored on server, private key stays on device

### Login Process
1. User visits login page
2. Clicks "Sign in with [Biometric Type]" button
3. System prompts for biometric verification
4. Device signs a challenge with the private key
5. Server verifies the signature and authenticates the user

## Database Schema

The biometric authentication system adds a new table:

```sql
CREATE TABLE biometric_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  name TEXT DEFAULT 'Biometric Login',
  type TEXT CHECK (type IN ('fingerprint', 'faceId', 'touchId')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);
```

## API Reference

### BiometricAuthService Class

#### Static Methods

##### `isSupported(): boolean`
Checks if WebAuthn is supported in the current browser.

##### `isPlatformAuthenticatorAvailable(): Promise<boolean>`
Checks if platform authenticator (Touch ID, Face ID, Windows Hello) is available.

##### `registerBiometric(userId, userName, displayName): Promise<string>`
Registers a new biometric credential for the user.

##### `authenticateBiometric(userId?): Promise<{success: boolean, credentialId?: string}>`
Authenticates using biometric credentials.

##### `getBiometricCredentials(userId): Promise<BiometricCredential[]>`
Gets all active biometric credentials for a user.

##### `removeBiometricCredential(credentialId): Promise<void>`
Deactivates a biometric credential.

##### `getBiometricCapabilities(): Promise<CapabilitiesInfo>`
Gets detailed information about available biometric capabilities.

## Usage Examples

### Setting Up Biometric Registration

```tsx
import { BiometricSettings } from '@/components/BiometricSettings';

function SecurityPage({ userId, userName, displayName }) {
  return (
    <BiometricSettings 
      userId={userId}
      userName={userName}
      displayName={displayName}
    />
  );
}
```

### Adding Biometric Login Button

```tsx
import { BiometricLoginButton } from '@/components/BiometricLoginButton';

function LoginPage({ onLoginSuccess }) {
  return (
    <div className="login-form">
      {/* Regular login form */}
      
      <BiometricLoginButton 
        onSuccess={onLoginSuccess}
        className="w-full mt-4"
      />
    </div>
  );
}
```

### Direct API Usage

```tsx
import { BiometricAuthService } from '@/lib/biometric-auth';

// Check if biometric auth is available
const isAvailable = await BiometricAuthService.isPlatformAuthenticatorAvailable();

if (isAvailable) {
  // Register biometric
  try {
    const credentialId = await BiometricAuthService.registerBiometric(
      userId, 
      'john.doe@example.com', 
      'John Doe'
    );
    console.log('Biometric registered:', credentialId);
  } catch (error) {
    console.error('Registration failed:', error.message);
  }

  // Authenticate with biometric
  try {
    const result = await BiometricAuthService.authenticateBiometric(userId);
    if (result.success) {
      console.log('Authentication successful');
    }
  } catch (error) {
    console.error('Authentication failed:', error.message);
  }
}
```

## Browser Compatibility

### Supported Browsers
- **Chrome/Edge**: 67+ (full support)
- **Firefox**: 60+ (full support)  
- **Safari**: 14+ (full support)
- **Mobile Safari**: 14.5+ (full support)
- **Chrome Mobile**: 67+ (full support)

### Platform Support
- **macOS**: Touch ID, external security keys
- **iOS**: Touch ID, Face ID
- **Windows**: Windows Hello (fingerprint, face, PIN)
- **Android**: Fingerprint, face unlock
- **Linux**: FIDO2 security keys

## Security Considerations

### Best Practices
1. **Fallback Authentication**: Always provide username/password as fallback
2. **Multiple Factors**: Consider requiring 2FA even with biometrics for sensitive operations
3. **Regular Cleanup**: Implement automatic cleanup of unused credentials
4. **Audit Logging**: Log all biometric authentication attempts
5. **User Education**: Inform users about biometric security implications

### Privacy
- Biometric templates never leave the user's device
- Only cryptographic keys are transmitted and stored
- Users can revoke access at any time
- No biometric data is accessible to the application

### Threat Model
- **Device Compromise**: Private keys are protected by hardware security modules
- **Server Compromise**: Only public keys are stored, cannot be used for authentication
- **Network Attacks**: Challenge-response protocol prevents replay attacks
- **Social Engineering**: Biometric factors are difficult to social engineer

## Troubleshooting

### Common Issues

#### "Biometric authentication not supported"
- Update browser to latest version
- Ensure device has biometric hardware
- Check that biometric authentication is enabled in system settings

#### "Platform authenticator not available"
- Enable Touch ID/Face ID/Windows Hello in system settings
- Ensure hardware is functioning properly
- Try restarting the browser

#### "Registration failed"
- Clear browser data and cookies
- Disable browser extensions that might interfere
- Check if credential limit is reached (browser/device dependent)

#### "Authentication failed"
- Ensure the same browser is used for registration and authentication
- Check if credential was revoked or expired
- Verify biometric sensor is clean and functioning

### Debug Mode

Enable debug logging by setting localStorage:

```javascript
localStorage.setItem('biometric-debug', 'true');
```

This will provide detailed console logs for troubleshooting.

## Future Enhancements

### Planned Features
- **Cross-device sync**: Sync credentials across user's devices
- **Backup authentication**: QR code-based device migration
- **Advanced policies**: Admin-configurable biometric policies
- **Analytics**: Usage analytics and security metrics
- **Progressive enrollment**: Automatic biometric setup prompts

### WebAuthn Level 3 Features
- **Device attestation**: Verify device authenticity
- **Conditional UI**: Context-aware authentication prompts
- **Large blob storage**: Store additional encrypted data
- **Enterprise features**: Advanced policy controls

## Support

For technical support or feature requests related to biometric authentication:

1. Check browser console for error messages
2. Verify device compatibility
3. Test with different browsers
4. Review security settings and permissions

The biometric authentication system is designed to degrade gracefully - if biometric authentication fails, users can always fall back to traditional username/password authentication.