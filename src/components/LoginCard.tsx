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
import { BiometricLoginButton } from './BiometricLoginButton'
import { ForgotPasswordCard } from './ForgotPasswordCard'

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
  const [lastError, setLastError] = useState<string | null>(null)
  
  // 2FA and biometric states
  const [loginStep, setLoginStep] = useState<'credentials' | '2fa' | 'biometric' | 'forgot-password'>('credentials')
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
    if (isLoading) {
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

    console.log('✅ Form validation passed, starting login process')
    setIsLoading(true)
    setLastError(null)

    try {
      console.log('🔑 Getting stored encryption keys...')
      const storedKeys = await getStoredKeys()
      console.log('🔑 Encryption keys retrieved:', !!storedKeys?.publicKey)
      
      console.log('🔐 Attempting Supabase sign in...')
      const result = await signIn(formData.email, formData.password, storedKeys?.publicKey)
      console.log('🔐 Supabase sign in completed:', !!result.user)
      
      if (!result.user) {
        throw new Error('No user returned from sign in')
      }

      const user = result.user
      console.log('👤 User ID:', user.id)
      setPendingUserId(user.id)

      console.log('🔒 Checking 2FA status...')
      const has2FA = await getUserTwoFactorStatus(user.id)
      console.log('🔒 2FA enabled:', has2FA)
      
      if (has2FA) {
        console.log('🔒 Checking device trust status...')
        const deviceFingerprint = generateDeviceFingerprint()
        const trusted = await isDeviceTrusted(user.id, deviceFingerprint)
        console.log('🔒 Device trusted:', trusted)
        
        if (trusted) {
          console.log('✅ Device trusted, completing login...')
          await completeLogin(user.id)
        } else {
          console.log('🔒 Device not trusted, requesting 2FA...')
          setLoginStep('2fa')
          setIsLoading(false)
          toast.info('Please enter your 2FA code to continue')
        }
      } else {
        console.log('✅ No 2FA required, completing login...')
        await completeLogin(user.id)
      }
      
    } catch (error: any) {
      console.error('❌ Login error:', error)
      setLastError(error.message)
      
      if (error.message.includes('verify your email')) {
        toast.error('Please verify your email address before signing in.', {
          description: 'Check your inbox for the verification link.',
          duration: 8000
        })
      } else if (error.message.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.')
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

    if (isLoading) {
      return
    }

    setIsLoading(true)
    
    try {
      const verificationResult = await verifyTwoFactorLogin(pendingUserId, twoFactorCode)
      
      if (verificationResult.verified) {
        if (verificationResult.usedBackupCode) {
          toast.warning('You used a backup code. Please generate new backup codes.')
        }
        
        // Ask if user wants to trust this device
        setDeviceTrustPrompt(true)
        
        // Complete login
        await completeLogin(pendingUserId)
      } else {
        toast.error('Invalid 2FA code. Please try again.')
        setIsLoading(false)
      }
    } catch (error: any) {
      console.error('2FA verification error:', error)
      setLastError(error.message)
      toast.error(error.message || '2FA verification failed')
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
    console.log('🎯 Complete login started for user:', userId)
    
    try {
      console.log('👤 Getting current user profile...')
      const currentUser = await getCurrentUser()
      console.log('👤 Current user retrieved:', !!currentUser)
      
      if (!currentUser) {
        throw new Error('Failed to load user profile')
      }

      // Create user object for callback
      const userObject: User = {
        id: currentUser.id,
        username: currentUser.profile?.username || currentUser.email?.split('@')[0] || 'user',
        email: currentUser.email || '',
        displayName: currentUser.profile?.display_name || currentUser.email?.split('@')[0] || 'User'
      }

      console.log('👤 User object created:', userObject.username)
      
      toast.success('Welcome back!')
      
      console.log('🚀 Calling success callback...')
      onSuccess?.(userObject)
      console.log('✅ Login completion successful')
      
    } catch (error: any) {
      console.error('❌ Login completion error:', error)
      setLastError(error.message)
      toast.error(error.message || 'Failed to complete login')
      
      // Reset login state on error
      resetLogin()
      
    } finally {
      console.log('🏁 Complete login finished, clearing loading state')
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
    setLastError(null)
    // Also clear any validation errors
    setErrors({
      email: '',
      password: ''
    })
  }

  return (
    <div className="w-full max-w-md animate-fade-in-up space-y-6">
      {/* Show forgot password component */}
      {loginStep === 'forgot-password' && (
        <ForgotPasswordCard 
          onBack={() => setLoginStep('credentials')} 
        />
      )}

      {/* Show login components only if not on forgot password step */}
      {loginStep !== 'forgot-password' && (
        <>
          {/* Device Trust Prompt */}
          {deviceTrustPrompt && (
            <Card className="bg-card border border-border shadow-lg">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <ShieldCheck className="h-8 w-8 text-primary mx-auto" />
                  <div className="space-y-2">
                    <h3 className="font-medium">Trust This Device?</h3>
                    <p className="text-sm text-muted-foreground">
                      Skip 2FA on this device for 30 days
                    </p>
                  </div>
                  <div className="flex gap-3">
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
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-foreground mb-2">
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
                <form onSubmit={handleSubmit} className="space-y-5">
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
                      <p className="mt-2 text-xs text-destructive">
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
                      <p className="mt-2 text-xs text-destructive">
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

                  {/* Forgot Password */}
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => setLoginStep('forgot-password')}
                    >
                      Forgotten password?
                    </button>
                  </div>

                  {/* Biometric Login Option */}
                  <div className="flex flex-col gap-4">
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
                </form>
              )}

              {/* 2FA Step */}
              {loginStep === '2fa' && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
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

              {/* Only show sign up section on credentials step */}
              {loginStep === 'credentials' && (
                <>
                  {/* Separator */}
                  <div className="my-8">
                    <Separator />
                  </div>

                  {/* Create Account Button */}
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="px-8 py-3 h-12 bg-accent hover:bg-accent/90 text-white font-semibold border-accent"
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
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Create a Page</span> for a celebrity, brand or business.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}