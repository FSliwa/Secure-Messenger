import { useState, useCallback } from 'react'
import { BiometricAuthService } from '@/lib/biometric-auth'
import { toast } from 'sonner'

export interface BiometricVerificationState {
  isOpen: boolean
  isVerifying: boolean
  action: string
  onSuccess?: () => void | Promise<void>
  onCancel?: () => void
}

export function useBiometricVerification(userId: string) {
  const [verificationState, setVerificationState] = useState<BiometricVerificationState>({
    isOpen: false,
    isVerifying: false,
    action: ''
  })
  const [biometricSupported, setBiometricSupported] = useState(false)

  // Check biometric support on hook initialization
  const checkBiometricSupport = useCallback(async () => {
    const isSupported = BiometricAuthService.isSupported()
    const isPlatformAvailable = isSupported ? await BiometricAuthService.isPlatformAuthenticatorAvailable() : false
    setBiometricSupported(isSupported && isPlatformAvailable)
    return isSupported && isPlatformAvailable
  }, [])

  // Check if user has biometric credentials registered
  const hasBiometricCredentials = useCallback(async () => {
    if (!userId) return false
    try {
      const credentials = await BiometricAuthService.getBiometricCredentials(userId)
      return credentials.length > 0
    } catch (error) {
      console.error('Failed to check biometric credentials:', error)
      return false
    }
  }, [userId])

  // Verify biometric or execute action directly if not required
  const executeWithBiometricVerification = useCallback(async (
    action: string,
    callback: () => void | Promise<void>,
    options?: {
      title?: string
      description?: string
      requireBiometric?: boolean
    }
  ) => {
    const { requireBiometric = true } = options || {}

    // If biometric verification is not required, execute directly
    if (!requireBiometric) {
      await callback()
      return
    }

    // Check if biometric is available and user has credentials
    const isSupported = await checkBiometricSupport()
    const hasCredentials = await hasBiometricCredentials()

    if (!isSupported || !hasCredentials) {
      // No biometric support or credentials, execute directly
      await callback()
      return
    }

    // Show biometric verification dialog
    setVerificationState({
      isOpen: true,
      isVerifying: false,
      action,
      onSuccess: async () => {
        try {
          await callback()
          setVerificationState(prev => ({ ...prev, isOpen: false }))
        } catch (error) {
          console.error('Action execution failed:', error)
          toast.error('Action failed to complete')
        }
      },
      onCancel: () => {
        setVerificationState(prev => ({ ...prev, isOpen: false }))
        toast.info(`${action} cancelled`)
      }
    })
  }, [checkBiometricSupport, hasBiometricCredentials])

  // Close verification dialog
  const closeVerification = useCallback(() => {
    setVerificationState(prev => ({ ...prev, isOpen: false }))
  }, [])

  return {
    verificationState,
    biometricSupported,
    executeWithBiometricVerification,
    closeVerification,
    checkBiometricSupport,
    hasBiometricCredentials
  }
}