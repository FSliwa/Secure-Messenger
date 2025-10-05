import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Spinner, ShieldCheck, Key, Copy, Check } from '@phosphor-icons/react'
import { 
  generateTwoFactorSecret, 
  generateTOTP, 
  enableTwoFactorAuth,
  disableTwoFactorAuth,
  getUserTwoFactorStatus 
} from '@/lib/auth-security'

interface TwoFactorSetupProps {
  userId: string
  onClose?: () => void
}

export function TwoFactorSetup({ userId, onClose }: TwoFactorSetupProps) {
  const [step, setStep] = useState<'check' | 'setup' | 'verify' | 'complete'>('check')
  const [secret, setSecret] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    checkTwoFactorStatus()
  }, [userId])

  const checkTwoFactorStatus = async () => {
    try {
      const enabled = await getUserTwoFactorStatus(userId)
      setIs2FAEnabled(enabled)
      setStep(enabled ? 'complete' : 'setup')
    } catch (error) {
      console.error('Error checking 2FA status:', error)
      setStep('setup')
    }
  }

  const startSetup = () => {
    const newSecret = generateTwoFactorSecret()
    setSecret(newSecret)
    
    // Generate QR code URL for authenticator apps
    const issuer = 'SecureChat Pro'
    const accountName = `SecureChat:${userId}`
    const qrUrl = `otpauth://totp/${encodeURIComponent(accountName)}?secret=${newSecret}&issuer=${encodeURIComponent(issuer)}`
    setQrCodeUrl(qrUrl)
    
    setStep('verify')
  }

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit verification code')
      return
    }

    setIsLoading(true)
    try {
      const result = await enableTwoFactorAuth(userId, secret, verificationCode)
      setBackupCodes(result.backup_codes)
      setIs2FAEnabled(true)
      setStep('complete')
      toast.success('Two-factor authentication enabled successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to enable 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  const disable2FA = async () => {
    setIsLoading(true)
    try {
      await disableTwoFactorAuth(userId)
      setIs2FAEnabled(false)
      setStep('setup')
      toast.success('Two-factor authentication disabled')
    } catch (error: any) {
      toast.error(error.message || 'Failed to disable 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      toast.success('Secret copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Failed to copy secret')
    }
  }

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
      toast.success('Backup codes copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy backup codes')
    }
  }

  if (step === 'check') {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Spinner className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Checking 2FA status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Two-Factor Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'setup' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account by enabling two-factor authentication.
            </p>
            <Button 
              onClick={startSetup} 
              className="w-full"
              disabled={isLoading}
            >
              <Key className="mr-2 h-4 w-4" />
              Set up 2FA
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">
                1. Add this secret to your authenticator app:
              </p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded border font-mono text-sm">
                <span className="flex-1 break-all">{secret}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copySecret}
                  className="shrink-0"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">
                2. Or scan this QR code:
              </p>
              <div className="p-4 bg-white rounded border text-center">
                <div className="text-xs text-muted-foreground mb-2">QR Code</div>
                <div className="text-xs font-mono break-all bg-muted p-2 rounded">
                  {qrCodeUrl}
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">
                3. Enter the 6-digit code from your app:
              </p>
              <Input
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-lg font-mono"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('setup')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={verifyAndEnable}
                disabled={isLoading || verificationCode.length !== 6}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Enable 2FA'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4">
            {is2FAEnabled ? (
              <>
                <div className="text-center">
                  <ShieldCheck className="h-12 w-12 text-success mx-auto mb-2" />
                  <p className="font-medium text-success">2FA is enabled</p>
                  <p className="text-sm text-muted-foreground">
                    Your account is protected with two-factor authentication
                  </p>
                </div>

                {backupCodes.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 text-warning">
                      Save these backup codes:
                    </p>
                    <div className="p-3 bg-muted rounded border text-sm font-mono space-y-1">
                      {backupCodes.map((code, index) => (
                        <div key={index}>{code}</div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyBackupCodes}
                      className="mt-2 w-full"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Backup Codes
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Keep these codes safe. You can use them to access your account if you lose your authenticator device.
                    </p>
                  </div>
                )}

                <Button
                  variant="destructive"
                  onClick={disable2FA}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4 animate-spin" />
                      Disabling...
                    </>
                  ) : (
                    'Disable 2FA'
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center">
                <p className="font-medium">2FA is disabled</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Enable two-factor authentication for better security
                </p>
                <Button onClick={() => setStep('setup')} className="w-full">
                  Enable 2FA
                </Button>
              </div>
            )}

            {onClose && (
              <Button variant="outline" onClick={onClose} className="w-full">
                Close
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}