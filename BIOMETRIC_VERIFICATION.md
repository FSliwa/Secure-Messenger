# Biometric Verification for Sensitive Actions

## Overview

SecureChat now includes biometric verification for sensitive conversation actions to enhance security. This feature uses WebAuthn (Web Authentication API) to verify user identity using platform authenticators like Touch ID, Face ID, or Windows Hello.

## Features Implemented

### 1. Biometric Verification Dialog
- **Component**: `BiometricVerificationDialog.tsx`
- **Purpose**: Provides a user-friendly interface for biometric authentication
- **Features**:
  - Auto-detects available biometric methods (Touch ID, Face ID, Windows Hello)
  - Progress tracking during authentication
  - Error handling with retry options
  - Success confirmation feedback

### 2. Biometric Verification Hook
- **Component**: `useBiometricVerification.ts`
- **Purpose**: Provides reusable logic for integrating biometric verification
- **Features**:
  - Checks biometric support and availability
  - Validates user has registered biometric credentials
  - Executes actions with or without biometric verification based on requirements

### 3. Sensitive Actions Protected

The following actions now require biometric verification when:
- User has biometric authentication enabled
- Device supports biometric authentication
- User has registered biometric credentials

#### Protected Actions:
1. **Joining Conversations**: Requires verification to prevent unauthorized access
2. **Creating Conversations**: Ensures only authenticated users can create secure channels
3. **Starting New User Conversations**: Protects initial contact establishment
4. **First Message in Conversations**: Secures cryptographic key exchange

## How It Works

### 1. Setup Phase
Users can register biometric credentials through the Security Settings:
- Navigate to Security Settings → Biometric tab
- Click "Register Biometric Authentication"
- Complete platform-specific biometric enrollment

### 2. Verification Phase
When performing sensitive actions:
- System checks if biometric verification is required
- If required, displays biometric verification dialog
- User completes biometric authentication
- Action proceeds upon successful verification

### 3. Fallback Behavior
- If biometric is not supported: Actions proceed without verification
- If user hasn't registered biometric: Actions proceed without verification
- If verification fails: User can retry or cancel the action

## Security Benefits

1. **Enhanced Access Control**: Prevents unauthorized users from accessing conversations even with device access
2. **Non-Repudiation**: Biometric verification provides stronger proof of user intent
3. **Real-time Verification**: Each sensitive action requires fresh authentication
4. **Device-bound Security**: Leverages hardware-level security features

## Technical Implementation

### Database Schema
```sql
CREATE TABLE biometric_credentials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  name TEXT DEFAULT 'Biometric Login',
  type TEXT DEFAULT 'fingerprint' CHECK (type IN ('fingerprint', 'faceId', 'touchId')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_used TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE NOT NULL
);
```

### Key Components

#### BiometricAuthService
Handles low-level WebAuthn operations:
- Credential registration
- Authentication verification
- Credential management

#### useBiometricVerification Hook
Provides high-level integration:
- Capability checking
- Conditional verification
- Action execution

#### BiometricVerificationDialog
User interface for verification:
- Platform-specific UI
- Progress indication
- Error handling

## Usage Example

```typescript
import { useBiometricVerification } from '@/hooks/useBiometricVerification'

function MyComponent() {
  const { executeWithBiometricVerification } = useBiometricVerification(userId)

  const handleSensitiveAction = async () => {
    await executeWithBiometricVerification(
      'perform this sensitive action',
      async () => {
        // Your sensitive action code here
        await performActualAction()
      }
    )
  }
}
```

## Browser Support

This feature requires browsers that support WebAuthn:
- Chrome 67+
- Firefox 60+
- Safari 14+
- Edge 18+

## Platform Support

- **iOS**: Touch ID / Face ID
- **macOS**: Touch ID
- **Windows**: Windows Hello (fingerprint, face, PIN)
- **Android**: Fingerprint authentication

## Testing

To test biometric verification:
1. Ensure you're using a supported device/browser
2. Register biometric credentials in Security Settings
3. Attempt to join a conversation or create a new one
4. Verify that biometric dialog appears and functions correctly

## Configuration

Biometric verification can be configured through:
- **User Level**: Individual users can enable/disable in Security Settings
- **Action Level**: Specific actions can require/skip biometric verification
- **System Level**: Global biometric requirements can be set

## Security Considerations

1. **Fallback Strategy**: Always provide alternative authentication methods
2. **Privacy**: Biometric data never leaves the device
3. **Revocation**: Users can remove biometric credentials at any time
4. **Audit Trail**: All biometric authentication attempts are logged
5. **Rate Limiting**: Failed attempts are rate-limited to prevent abuse

## Future Enhancements

Potential improvements for future versions:
1. **Conditional Verification**: Based on risk assessment
2. **Multiple Biometrics**: Support for multiple registered methods
3. **Cross-Device Sync**: Secure credential sharing across user devices
4. **Admin Controls**: Organization-level biometric policies
5. **Advanced Analytics**: Biometric usage statistics and insights