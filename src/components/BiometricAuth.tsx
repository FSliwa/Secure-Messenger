import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Spinner, Fingerprint, DeviceMobile, Check, X } from '@phosphor-icons/react'
import { 
  isBiometricSupported, 
  registerBiometric, 
  verifyBiometric 
} from '@/lib/auth-security'
import { useKV } from '@github/spark/hooks'

interface BiometricAuthProps {
  userId: string
  onSuccess?: () => void
  onCancel?: () => void
  mode?: 'setup' | 'verify'
}

export function BiometricAuth({ userId, onSuccess, onCancel, mode = 'setup' }: BiometricAuthProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [registrationStatus, setRegistrationStatus] = useState<'none' | 'registered' | 'failed'>('none')
  const [biometricCredentials, setBiometricCredentials] = useKV<string | null>(`biometric-${userId}`, null)

  useEffect(() => {
    checkBiometricSupport()
  }, [])

  const checkBiometricSupport = () => {
    const supported = isBiometricSupported()
    setIsSupported(supported)
    
    if (!supported) {
      toast.error('Biometric authentication is not supported on this device')
    }
  }

  const handleRegisterBiometric = async () => {
    setIsLoading(true)
    try {
      const credentialId = await registerBiometric(userId)
      setBiometricCredentials(credentialId)
      setRegistrationStatus('registered')
      toast.success('Biometric authentication set up successfully!')
      onSuccess?.()
    } catch (error: any) {
      console.error('Biometric registration failed:', error)
      setRegistrationStatus('failed')
      toast.error(error.message || 'Failed to set up biometric authentication')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyBiometric = async () => {
    if (!biometricCredentials) {
      toast.error('No biometric credentials found. Please set up biometric authentication first.')
      return
    }

    setIsLoading(true)
    try {
      const verified = await verifyBiometric(biometricCredentials)
      if (verified) {
        toast.success('Biometric authentication successful!')
        onSuccess?.()
      } else {
        toast.error('Biometric authentication failed')
      }
    } catch (error: any) {
      console.error('Biometric verification failed:', error)
      toast.error(error.message || 'Biometric authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  const removeBiometric = () => {
    setBiometricCredentials(null)
    setRegistrationStatus('none')
    toast.success('Biometric authentication removed')
  }

  if (!isSupported) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <X className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">Not Supported</h3>
          <p className="text-sm text-muted-foreground">
            Biometric authentication is not available on this device or browser.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-primary" />
          Biometric Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === 'setup' && (
          <>
            {registrationStatus === 'none' && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="flex justify-center gap-4 mb-4">
                    <Fingerprint className="h-12 w-12 text-primary" />
                    <DeviceMobile className="h-12 w-12 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use your fingerprint, face, or other biometric authentication to secure your account.
                  </p>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <DeviceMobile className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Supported Methods</p>
                      <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                        <li>• Touch ID / Face ID (Apple devices)</li>
                        <li>• Windows Hello (Windows devices)</li>
                        <li>• Fingerprint sensors (Android devices)</li>
                        <li>• Security keys with biometric support</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleRegisterBiometric}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4 animate-spin" />
                      Setting up biometric authentication...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="mr-2 h-4 w-4" />
                      Set up Biometric Authentication
                    </>
                  )}
                </Button>
              </div>
            )}

            {registrationStatus === 'registered' && (
              <div className="space-y-4">
                <div className="text-center">
                  <Check className="h-12 w-12 text-success mx-auto mb-2" />
                  <p className="font-medium text-success">Biometric Authentication Enabled</p>
                  <p className="text-sm text-muted-foreground">
                    You can now use biometric authentication to sign in
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={removeBiometric}
                    className="flex-1"
                  >
                    Remove
                  </Button>
                  <Button
                    onClick={handleVerifyBiometric}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Test
                  </Button>
                </div>
              </div>
            )}

            {registrationStatus === 'failed' && (
              <div className="space-y-4">
                <div className="text-center">
                  <X className="h-12 w-12 text-destructive mx-auto mb-2" />
                  <p className="font-medium text-destructive">Setup Failed</p>
                  <p className="text-sm text-muted-foreground">
                    Unable to set up biometric authentication. Please try again.
                  </p>
                </div>

                <Button
                  onClick={() => setRegistrationStatus('none')}
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
            )}
          </>
        )}

        {mode === 'verify' && (
          <div className="space-y-4">
            <div className="text-center">
              <Fingerprint className="h-16 w-16 text-primary mx-auto mb-4 animate-pulse" />
              <h3 className="font-medium mb-2">Verify Your Identity</h3>
              <p className="text-sm text-muted-foreground">
                Use your biometric authentication to continue
              </p>
            </div>

            <Button
              onClick={handleVerifyBiometric}
              disabled={isLoading || !biometricCredentials}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Fingerprint className="mr-2 h-4 w-4" />
                  Use Biometric Authentication
                </>
              )}
            </Button>

            {!biometricCredentials && (
              <p className="text-xs text-center text-muted-foreground">
                Biometric authentication not set up for this device
              </p>
            )}
          </div>
        )}

        {onCancel && (
          <Button variant="outline" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  )
}