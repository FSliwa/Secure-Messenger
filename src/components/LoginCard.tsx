import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Spinner, Eye, EyeSlash, ShieldCheck, Fingerprint, ArrowClockwise } from '@phosphor-icons/react'
import { signIn, getCurrentUser } from '@/lib/supabase'
import { getStoredKeys } from '@/lib/crypto'
import { 
  getUserTwoFactorStatus, 
  verifyTwoFactorLogin,
  generateDeviceFingerprint,
  isDeviceTrusted,
  addTrustedDevice
} from '@/lib/auth-security'
import { BiometricLoginButton } from './BiometricLoginButton'
import { SimpleRetryIndicator } from './RetryStatusDisplay'
import { NetworkStatusIndicator } from './NetworkStatusIndicator'
import { 
  executeWithNetworkAwareRetry, 
  isRetryableError,
  RetryResult
} from '@/lib/auth-retry'
import { 
  AUTH_RETRY_CONFIG, 
  getErrorMessage, 
  shouldRetryError 
} from '@/lib/auth-config'

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
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  
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
    console.log('🔐 Login attempt started')

    // Prevent multiple concurrent login attempts
    if (isLoading || isRetrying) {
      console.log('⚠️ Login already in progress, ignoring duplicate attempt')
      return
    }

    // Validate form
    const emailError = validateField('email', formData.email)
    const passwordError = validateField('password', formData.password)
    
    setErrors({
      email: emailError,
      password: passwordError
    })

    if (emailError || passwordError) {
      console.log('❌ Form validation failed')
      toast.error('Please fix the errors above')
      return
    }

    console.log('✅ Form validation passed, starting login process with retry mechanism')
    setIsLoading(true)
    setLastError(null)
    setRetryCount(0)

    try {
      // Create the login operation that will be retried
      const loginOperation = async () => {
        console.log('🔑 Getting stored encryption keys...')
        // Get stored encryption keys
        const storedKeys = await getStoredKeys()
        console.log('🔑 Encryption keys retrieved:', !!storedKeys?.publicKey)
        
        console.log('🔐 Attempting Supabase sign in...')
        // Sign in with Supabase
        const result = await signIn(formData.email, formData.password, storedKeys?.publicKey)
        console.log('🔐 Supabase sign in completed:', !!result.user)
        
        if (!result.user) {
          throw new Error('No user returned from sign in')
        }

        return result.user
      }

      // Execute login with network-aware retry mechanism
      const result: RetryResult<any> = await executeWithNetworkAwareRetry(
        loginOperation,
        AUTH_RETRY_CONFIG.AUTHENTICATION, // Use authentication retry config
        'Authentication'
      )

      if (!result.success || !result.data) {
        console.log('❌ Login failed after all retries')
        setLastError(result.error?.message || 'Login failed after multiple attempts')
        setRetryCount(result.attempts.length)
        
        // Handle specific error types
        if (result.error?.message.includes('verify your email')) {
          toast.error('Please verify your email address before signing in.', {
            description: 'Check your inbox for the verification link.',
            duration: 8000
          })
        } else if (shouldRetryError(result.error!)) {
          const userMessage = getErrorMessage(result.error!)
          toast.error('Connection issues prevented login', {
            description: `${userMessage} (${result.attempts.length} attempts)`,
            duration: 10000
          })
        } else {
          const userMessage = getErrorMessage(result.error!)
          toast.error(userMessage)
        }
        return
      }

      const user = result.data
      console.log('👤 User ID:', user.id)
      setPendingUserId(user.id)

      // Show success message if retries were needed
      if (result.attempts.length > 0) {
        toast.success(`Login successful after ${result.attempts.length + 1} attempts`)
      }

      console.log('🔒 Checking 2FA status...')
      // Check if 2FA is enabled for this user
      const has2FA = await getUserTwoFactorStatus(user.id)
      console.log('🔒 2FA enabled:', has2FA)
      
      if (has2FA) {
        console.log('🔒 Checking device trust status...')
        // Check if current device is trusted
        const deviceFingerprint = generateDeviceFingerprint()
        const trusted = await isDeviceTrusted(user.id, deviceFingerprint)
        console.log('🔒 Device trusted:', trusted)
        
        if (trusted) {
          console.log('✅ Device trusted, completing login...')
          // Device is trusted, skip 2FA
          await completeLogin(user.id)
        } else {
          console.log('🔒 Device not trusted, requesting 2FA...')
          // Require 2FA verification - don't reset loading here
          setLoginStep('2fa')
          setIsLoading(false) // Only reset loading when moving to 2FA step
          toast.info('Please enter your 2FA code to continue')
        }
      } else {
        console.log('✅ No 2FA required, completing login...')
        // No 2FA, complete login (loading will be reset in completeLogin)
        await completeLogin(user.id)
      }
      
    } catch (error: any) {
      console.error('❌ Unexpected login error:', error)
      setLastError(error.message)
      
      const userMessage = getErrorMessage(error)
      
      if (error.message.includes('verify your email')) {
        toast.error('Please verify your email address before signing in.', {
          description: 'Check your inbox for the verification link.',
          duration: 8000
        })
      } else {
        toast.error(userMessage)
      }
    } finally {
      console.log('🏁 Login attempt finished, resetting loading state')
      // Only reset loading if we're not proceeding to 2FA
      if (loginStep === 'credentials') {
        setIsLoading(false)
        setIsRetrying(false)
      }
    }
  }

  const handleTwoFactorSubmit = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6 || !pendingUserId) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    // Prevent multiple concurrent attempts
    if (isLoading || isRetrying) {
      return
    }

    setIsLoading(true)
    setIsRetrying(false)
    
    try {
      // Create 2FA verification operation with retry
      const twoFactorOperation = async () => {
        return await verifyTwoFactorLogin(pendingUserId, twoFactorCode)
      }

      // Execute with retry mechanism
      const result: RetryResult<any> = await executeWithNetworkAwareRetry(
        twoFactorOperation,
        AUTH_RETRY_CONFIG.TWO_FACTOR,
        '2FA Verification'
      )

      if (!result.success || !result.data) {
        console.log('❌ 2FA verification failed after all retries')
        setLastError(result.error?.message || '2FA verification failed')
        setRetryCount(result.attempts.length)
        
        if (shouldRetryError(result.error!)) {
          const userMessage = getErrorMessage(result.error!)
          toast.error('Connection issues during 2FA verification', {
            description: `${userMessage} (${result.attempts.length} attempts)`,
            duration: 8000
          })
        } else {
          const userMessage = getErrorMessage(result.error!)
          toast.error(userMessage)
        }
        return
      }

      const verificationResult = result.data
      
      if (verificationResult.verified) {
        if (verificationResult.usedBackupCode) {
          toast.warning('You used a backup code. Please generate new backup codes.')
        }
        
        // Show success message if retries were needed
        if (result.attempts.length > 0) {
          toast.success(`2FA verified after ${result.attempts.length + 1} attempts`)
        }
        
        // Ask if user wants to trust this device
        setDeviceTrustPrompt(true)
        
        // Complete login (loading will be reset in completeLogin)
        await completeLogin(pendingUserId)
      } else {
        toast.error('Invalid 2FA code. Please try again.')
      }
    } catch (error: any) {
      console.error('2FA verification error:', error)
      setLastError(error.message)
      const userMessage = getErrorMessage(error)
      toast.error(userMessage)
    } finally {
      setIsLoading(false)
      setIsRetrying(false)
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
    console.log('🎯 Complete login started for user:', userId)
    
    try {
      // Create login completion operation with retry
      const completionOperation = async () => {
        console.log('👤 Getting current user profile...')
        const currentUser = await getCurrentUser()
        console.log('👤 Current user retrieved:', !!currentUser)
        
        if (!currentUser) {
          throw new Error('Failed to load user profile')
        }

        return currentUser
      }

      // Execute with retry mechanism
      const result: RetryResult<any> = await executeWithNetworkAwareRetry(
        completionOperation,
        AUTH_RETRY_CONFIG.PROFILE_OPERATIONS,
        'Profile Loading'
      )

      if (!result.success || !result.data) {
        console.log('❌ Failed to complete login after all retries')
        setLastError(result.error?.message || 'Failed to complete login')
        setRetryCount(result.attempts.length)
        
        toast.error('Failed to load user profile', {
          description: shouldRetryError(result.error!) 
            ? `${getErrorMessage(result.error!)} (${result.attempts.length} attempts)`
            : getErrorMessage(result.error!)
        })
        
        // Reset login state on error
        resetLogin()
        return
      }

      const currentUser = result.data

      // Create user object for callback
      const userObject: User = {
        id: currentUser.id,
        username: currentUser.profile?.username || currentUser.email?.split('@')[0] || 'user',
        email: currentUser.email || '',
        displayName: currentUser.profile?.display_name || currentUser.email?.split('@')[0] || 'User'
      }

      console.log('👤 User object created:', userObject.username)
      
      // Show success message if retries were needed
      if (result.attempts.length > 0) {
        toast.success(`Profile loaded successfully after ${result.attempts.length + 1} attempts`)
      } else {
        toast.success('Welcome back!')
      }
      
      console.log('🚀 Calling success callback...')
      // Call success callback first to trigger navigation
      onSuccess?.(userObject)
      console.log('✅ Login completion successful')
      
    } catch (error: any) {
      console.error('❌ Login completion error:', error)
      setLastError(error.message)
      const userMessage = getErrorMessage(error)
      toast.error(userMessage)
      
      // Reset login state on error
      resetLogin()
      
    } finally {
      console.log('🏁 Complete login finished, clearing loading state')
      // Always ensure loading state is cleared
      setIsLoading(false)
      setIsRetrying(false)
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
    setIsRetrying(false)
    setRetryCount(0)
    setLastError(null)
    // Also clear any validation errors
    setErrors({
      email: '',
      password: ''
    })
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
          {/* Network Status */}
          <div className="mb-4">
            <NetworkStatusIndicator className="justify-center" />
          </div>

          {/* Retry Status Banner */}
          {(retryCount > 0 || lastError || isRetrying) && loginStep === 'credentials' && (
            <div className="mb-4">
              <SimpleRetryIndicator
                isRetrying={isRetrying}
                retryCount={retryCount}
                operation="login"
                error={lastError || undefined}
                className="p-3 bg-muted/30 rounded-lg border"
              />
            </div>
          )}

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
                disabled={isLoading || isRetrying}
              >
                {isLoading || isRetrying ? (
                  <>
                    <Spinner className="mr-2 h-5 w-5 animate-spin" />
                    {isRetrying ? 'Reconnecting...' : 'Signing in...'}
                  </>
                ) : retryCount > 0 ? (
                  <>
                    <ArrowClockwise className="mr-2 h-5 w-5" />
                    Try Again
                  </>
                ) : (
                  'Log In'
                )}
              </Button>

              {/* Biometric Login Option */}
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>
                
                <BiometricLoginButton 
                  onSuccess={onSuccess || (() => {})}
                  className="h-12"
                />
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
              {/* Retry Status for 2FA */}
              {(retryCount > 0 || lastError || isRetrying) && (
                <div className="mb-4">
                  <SimpleRetryIndicator
                    isRetrying={isRetrying}
                    retryCount={retryCount}
                    operation="2FA verification"
                    error={lastError || undefined}
                    className="p-3 bg-muted/30 rounded-lg border"
                  />
                </div>
              )}

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
                disabled={isLoading || isRetrying || twoFactorCode.length !== 6}
                className="w-full h-12"
              >
                {isLoading || isRetrying ? (
                  <>
                    <Spinner className="mr-2 h-5 w-5 animate-spin" />
                    {isRetrying ? 'Reconnecting...' : 'Verifying...'}
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

          {/* Biometric Step - Removed, using direct BiometricLoginButton */}

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