import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Fingerprint, 
  Shield, 
  Lock, 
  Warning,
  CheckCircle,
  X
} from '@phosphor-icons/react'
import { BiometricAuthService } from '@/lib/biometric-auth'
import { toast } from 'sonner'

interface BiometricVerificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  onCancel: () => void
  title?: string
  description?: string
  action: string // e.g., "join this conversation"
  userId?: string
}

export function BiometricVerificationDialog({
  open,
  onOpenChange,
  onSuccess,
  onCancel,
  title = "Biometric Verification Required",
  description = "This action requires biometric verification for security.",
  action,
  userId
}: BiometricVerificationDialogProps) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStep, setVerificationStep] = useState<'prompt' | 'authenticating' | 'success' | 'error'>('prompt')
  const [errorMessage, setErrorMessage] = useState('')
  const [progress, setProgress] = useState(0)

  const handleBiometricVerification = async () => {
    setIsVerifying(true)
    setVerificationStep('authenticating')
    setProgress(0)

    // Progress simulation for better UX
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 100)

    try {
      // Check if biometric is supported
      if (!BiometricAuthService.isSupported()) {
        throw new Error('Biometric authentication is not supported on this device')
      }

      const isPlatformAvailable = await BiometricAuthService.isPlatformAuthenticatorAvailable()
      if (!isPlatformAvailable) {
        throw new Error('Biometric authentication is not available. Please ensure your device supports fingerprint, face recognition, or Windows Hello.')
      }

      // Attempt biometric authentication
      const result = await BiometricAuthService.authenticateBiometric(userId)
      
      clearInterval(progressInterval)
      setProgress(100)

      if (result.success) {
        setVerificationStep('success')
        
        // Brief success display before calling onSuccess
        setTimeout(() => {
          onSuccess()
          handleClose()
        }, 1500)
      } else {
        throw new Error('Biometric verification failed')
      }

    } catch (error: any) {
      clearInterval(progressInterval)
      console.error('Biometric verification error:', error)
      
      setVerificationStep('error')
      setErrorMessage(error.message || 'Biometric verification failed')
      
      // Auto-reset to prompt after error display
      setTimeout(() => {
        setVerificationStep('prompt')
        setProgress(0)
      }, 3000)
    } finally {
      setIsVerifying(false)
    }
  }

  const handleClose = () => {
    setVerificationStep('prompt')
    setProgress(0)
    setErrorMessage('')
    setIsVerifying(false)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onCancel()
    handleClose()
  }

  const getBiometricIcon = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('mac')) {
      return <Fingerprint className="h-12 w-12 text-primary" />
    } else if (userAgent.includes('windows')) {
      return <Shield className="h-12 w-12 text-primary" />
    } else {
      return <Fingerprint className="h-12 w-12 text-primary" />
    }
  }

  const getBiometricLabel = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'Touch ID / Face ID'
    } else if (userAgent.includes('mac')) {
      return 'Touch ID'
    } else if (userAgent.includes('windows')) {
      return 'Windows Hello'
    } else {
      return 'Biometric Authentication'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description} Please use {getBiometricLabel().toLowerCase()} to {action}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {verificationStep === 'prompt' && (
            <Card>
              <CardContent className="flex flex-col items-center space-y-4 pt-6">
                {getBiometricIcon()}
                <div className="text-center">
                  <h3 className="font-semibold text-lg">{getBiometricLabel()}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verify your identity to continue
                  </p>
                </div>
                <Button 
                  onClick={handleBiometricVerification}
                  disabled={isVerifying}
                  className="w-full gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Verify with {getBiometricLabel()}
                </Button>
              </CardContent>
            </Card>
          )}

          {verificationStep === 'authenticating' && (
            <Card>
              <CardContent className="flex flex-col items-center space-y-4 pt-6">
                <div className="relative">
                  {getBiometricIcon()}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                </div>
                <div className="text-center w-full">
                  <h3 className="font-semibold text-lg">Authenticating...</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Please complete the biometric verification
                  </p>
                  <Progress value={progress} className="w-full" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {progress}% complete
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {verificationStep === 'success' && (
            <Card>
              <CardContent className="flex flex-col items-center space-y-4 pt-6">
                <CheckCircle className="h-12 w-12 text-success animate-pulse" />
                <div className="text-center">
                  <h3 className="font-semibold text-lg text-success">Verified Successfully</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Identity confirmed. Proceeding...
                  </p>
                </div>
                <Progress value={100} className="w-full" />
              </CardContent>
            </Card>
          )}

          {verificationStep === 'error' && (
            <Card>
              <CardContent className="flex flex-col items-center space-y-4 pt-6">
                <Warning className="h-12 w-12 text-destructive" />
                <div className="text-center">
                  <h3 className="font-semibold text-lg text-destructive">Verification Failed</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {errorMessage}
                  </p>
                </div>
                <Button 
                  onClick={handleBiometricVerification}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-2">
          {verificationStep === 'prompt' && (
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          {verificationStep === 'error' && (
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}