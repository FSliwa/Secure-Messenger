import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Spinner, Eye, EyeSlash, ShieldCheck, Fingerprint } from '@phosphor-icons/react'
import { signIn, getCurrentUser } from '@/lib/supabase'
import { getStoredKeys } from '@/lib/crypto'
import { 
  getUserTwoFactorStatus, 
  verifyTwoFactorLogin,
  generateDeviceFingerprint,
  isDeviceTrusted,
  addTrustedDevice
} from '@/lib/auth-security'
import { BiometricAuth } from './BiometricAuth'

interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
}

interface LoginProps {
  onSuccess?: (user: User) => void
  onSwitchToSignUp?: () => void
}

export function LoginCard({ onSuccess, onSwitchToSignUp }: LoginProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  // 2FA and biometric states
  const [loginStep, setLoginStep] = useState<'credentials' | '2fa' | 'biometric'>('credentials')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [deviceTrustPrompt, setDeviceTrustPrompt] = useState(false)

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'email':
        if (!value) return 'Email is required'
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return !emailRegex.test(value) ? 'Please enter a valid email address' : ''
      case 'password':
        return !value ? 'Password is required' : ''
      default:
        return ''
    }
  }

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Real-time validation
    const error = validateField(name, value)
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const emailError = validateField('email', formData.email)
    const passwordError = validateField('password', formData.password)
    
    setErrors({
      email: emailError,
      password: passwordError
    })

    if (emailError || passwordError) {
      toast.error('Please fix the errors above')
      return
    }

    setIsLoading(true)

    try {
      // Get stored encryption keys
      const storedKeys = await getStoredKeys()
      
      // Sign in with Supabase
      const { user } = await signIn(formData.email, formData.password, storedKeys?.publicKey)
      
      if (!user) {
        toast.error('Login failed. Please check your credentials.')
        setIsLoading(false)
        return
      }

      setPendingUserId(user.id)

      // Check if 2FA is enabled for this user
      const has2FA = await getUserTwoFactorStatus(user.id)
      
      if (has2FA) {
        // Check if current device is trusted
        const deviceFingerprint = generateDeviceFingerprint()
        const trusted = await isDeviceTrusted(user.id, deviceFingerprint)
        
        if (trusted) {
          // Device is trusted, skip 2FA
          await completeLogin(user.id)
        } else {
          // Require 2FA verification
          setLoginStep('2fa')
          toast.info('Please enter your 2FA code to continue')
        }
      } else {
        // No 2FA, complete login
        await completeLogin(user.id)
      }
      
    } catch (error: any) {
      console.error('Login error:', error)
      
      if (error.message.includes('verify your email')) {
        toast.error('Please verify your email address before signing in.', {
          description: 'Check your inbox for the verification link.',
          duration: 8000
        })
      } else {
        toast.error(error.message || 'Login failed. Please try again.')
      }
      setIsLoading(false)
    }
  }

  const handleTwoFactorSubmit = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6 || !pendingUserId) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    setIsLoading(true)
    try {
      const result = await verifyTwoFactorLogin(pendingUserId, twoFactorCode)
      
      if (result.verified) {
        if (result.usedBackupCode) {
          toast.warning('You used a backup code. Please generate new backup codes.')
        }
        
        // Ask if user wants to trust this device
        setDeviceTrustPrompt(true)
        
        await completeLogin(pendingUserId)
      } else {
        toast.error('Invalid 2FA code. Please try again.')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify 2FA code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTrustDevice = async (trust: boolean) => {
    if (trust && pendingUserId) {
      try {
        const deviceFingerprint = generateDeviceFingerprint()
        const deviceName = getCurrentDeviceName()
        await addTrustedDevice(pendingUserId, deviceFingerprint, deviceName, 30)
        toast.success('Device trusted for 30 days')
      } catch (error) {
        console.error('Failed to trust device:', error)
      }
    }
    setDeviceTrustPrompt(false)
  }

  const completeLogin = async (userId: string) => {
    try {
      // Get full user profile
      const currentUser = await getCurrentUser()
      
      if (!currentUser) {
        toast.error('Failed to load user profile.')
        setIsLoading(false)
        return
      }

      // Create user object for callback
      const userObject: User = {
        id: currentUser.id,
        username: currentUser.profile?.username || currentUser.email?.split('@')[0] || 'user',
        email: currentUser.email || '',
        displayName: currentUser.profile?.display_name || currentUser.email?.split('@')[0] || 'User'
      }

      toast.success('Welcome back!')
      onSuccess?.(userObject)
      
    } catch (error: any) {
      console.error('Login completion error:', error)
      toast.error(error.message || 'Failed to complete login')
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentDeviceName = () => {
    const ua = navigator.userAgent
    let deviceName = 'Unknown Device'
    
    if (ua.includes('Mac')) {
      deviceName = ua.includes('Mobile') ? 'iPhone/iPad' : 'Mac'
    } else if (ua.includes('Windows')) {
      deviceName = 'Windows PC'
    } else if (ua.includes('Android')) {
      deviceName = 'Android Device'
    } else if (ua.includes('Linux')) {
      deviceName = 'Linux Device'
    }
    
    if (ua.includes('Chrome')) deviceName += ' - Chrome'
    else if (ua.includes('Firefox')) deviceName += ' - Firefox'
    else if (ua.includes('Safari')) deviceName += ' - Safari'
    else if (ua.includes('Edge')) deviceName += ' - Edge'
    
    return deviceName
  }

  const handleBiometricSuccess = () => {
    if (pendingUserId) {
      completeLogin(pendingUserId)
    }
  }

  const resetLogin = () => {
    setLoginStep('credentials')
    setTwoFactorCode('')
    setPendingUserId(null)
    setDeviceTrustPrompt(false)
    setIsLoading(false)
  }

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      {/* Device Trust Prompt */}
      {deviceTrustPrompt && (
        <Card className="bg-card border border-border shadow-lg mb-4">
          <CardContent className="p-4">
            <div className="text-center space-y-3">
              <ShieldCheck className="h-8 w-8 text-primary mx-auto" />
              <div>
                <h3 className="font-medium">Trust This Device?</h3>
                <p className="text-sm text-muted-foreground">
                  Skip 2FA on this device for 30 days
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleTrustDevice(false)}
                  className="flex-1"
                >
                  No
                </Button>
                <Button 
                  onClick={() => handleTrustDevice(true)}
                  className="flex-1"
                >
                  Trust Device
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Login Card */}
      <Card className="bg-card border border-border shadow-lg">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {loginStep === 'credentials' && 'Log in to SecureChat'}
              {loginStep === '2fa' && 'Two-Factor Authentication'}
              {loginStep === 'biometric' && 'Biometric Verification'}
            </h1>
            {loginStep === '2fa' && (
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            )}
          </div>

          {/* Credentials Step */}
          {loginStep === 'credentials' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <Input
                  id="email"
                  type="email"
                  placeholder="Email or phone number"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`h-12 ${errors.email ? 'border-destructive focus:ring-destructive' : ''}`}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`h-12 pr-12 ${errors.password ? 'border-destructive focus:ring-destructive' : ''}`}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlash className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Log In'
                )}
              </Button>

              {/* Biometric Login Option */}
              <div className="text-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLoginStep('biometric')}
                  className="text-sm"
                >
                  <Fingerprint className="mr-2 h-4 w-4" />
                  Use Biometric Login
                </Button>
              </div>

              {/* Forgot Password */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={() => toast.info('Password reset feature coming soon!')}
                >
                  Forgotten password?
                </button>
              </div>
            </form>
          )}

          {/* 2FA Step */}
          {loginStep === '2fa' && (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-2" />
              </div>
              
              <div>
                <Input
                  type="text"
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-lg font-mono h-12"
                />
              </div>

              <Button
                onClick={handleTwoFactorSubmit}
                disabled={isLoading || twoFactorCode.length !== 6}
                className="w-full h-12"
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={resetLogin}
                >
                  Back to login
                </button>
              </div>
            </div>
          )}

          {/* Biometric Step */}
          {loginStep === 'biometric' && pendingUserId && (
            <div className="space-y-4">
              <BiometricAuth
                userId={pendingUserId}
                mode="verify"
                onSuccess={handleBiometricSuccess}
                onCancel={() => setLoginStep('credentials')}
              />
            </div>
          )}

          {/* Only show sign up section on credentials step */}
          {loginStep === 'credentials' && (
            <>
              {/* Separator */}
              <div className="my-6">
                <Separator />
              </div>

              {/* Create Account Button */}
              <div className="text-center">
                <Button
                  type="button"
                  variant="outline"
                  className="px-8 py-3 h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold border-accent"
                  onClick={onSwitchToSignUp}
                >
                  Create new account
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Footer Links - only on credentials step */}
      {loginStep === 'credentials' && (
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            <span className="font-semibold">Create a Page</span> for a celebrity, brand or business.
          </p>
        </div>
      )}
    </div>
  )
}