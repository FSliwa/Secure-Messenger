import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Spinner, Eye, EyeSlash, ShieldCheck, Fingerprint } from '@phosphor-icons/react'
import { signIn, getCurrentUser } from '@/lib/supabase'
import { getStoredKeys } from '@/lib/crypto'
import { useLanguage } from '@/contexts/LanguageContext'
import { 
  getUserTwoFactorStatus, 
  verifyTwoFactorLogin,
  generateDeviceFingerprint,
  isDeviceTrusted,
  addTrustedDevice
} from '@/lib/auth-security'
import { BiometricLoginButton } from './BiometricLoginButton'
import { ForgotPasswordCard } from './ForgotPasswordCard'
import { LanguageSwitcher } from './LanguageSwitcher'

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
  const { t } = useLanguage()
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
      let has2FA = false;
      try {
        has2FA = await getUserTwoFactorStatus(user.id);
        console.log('🔒 2FA enabled:', has2FA);
      } catch (error) {
        console.warn('🔒 2FA check failed, assuming no 2FA:', error);
        has2FA = false;
      }
      
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
      
      console.log('���� Calling success callback...')
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
    <div className="w-full max-w-md animate-fade-in-up space-y-4 sm:space-y-6 px-4 sm:px-0">
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
            <Card className="bg-card border border-border shadow-lg facebook-card">
              <CardContent className="p-4 sm:p-6">
                <div className="text-center space-y-3 sm:space-y-4">
                  <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-primary mx-auto" />
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm sm:text-base">Trust This Device?</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Skip 2FA on this device for 30 days
                    </p>
                  </div>
                  <div className="flex gap-2 sm:gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => handleTrustDevice(false)}
                      className="flex-1 facebook-button min-h-[44px]"
                    >
                      No
                    </Button>
                    <Button 
                      onClick={() => handleTrustDevice(true)}
                      className="flex-1 facebook-button min-h-[44px]"
                    >
                      Trust Device
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Login Card */}
          <Card className="bg-card border border-border shadow-lg facebook-card">
            <CardContent className="p-4 sm:p-6 md:p-8">

              
              <div className="text-center mb-6 sm:mb-8 md:mb-10">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2 sm:mb-3">
                  {loginStep === 'credentials' && t.signInToAccount}
                  {loginStep === '2fa' && t.twoFactorAuth}
                  {loginStep === 'biometric' && t.biometricAuth}
                </h1>
                {loginStep === '2fa' && (
                  <p className="text-sm sm:text-base text-foreground/80 px-2">
                    Enter the 6-digit code from your authenticator app
                  </p>
                )}
              </div>

              {/* Credentials Step */}
              {loginStep === 'credentials' && (
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  {/* Email */}
                  <div className="space-y-2">
                    <Input
                      id="email"
                      type="email"
                      placeholder={t.email}
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`facebook-input h-12 sm:h-14 ${errors.email ? 'border-destructive focus:ring-destructive' : ''}`}
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && (
                      <p className="text-xs sm:text-sm text-destructive px-2 font-medium">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder={t.password}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className={`facebook-input h-12 sm:h-14 pr-12 ${errors.password ? 'border-destructive focus:ring-destructive' : ''}`}
                        aria-invalid={!!errors.password}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground p-1 min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeSlash className="h-5 w-5 icon-enhanced" />
                        ) : (
                          <Eye className="h-5 w-5 icon-enhanced" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs sm:text-sm text-destructive px-2 font-medium">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Login Button - Fixed functionality */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full facebook-button h-12 sm:h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base sm:text-lg shadow-md hover:shadow-lg transition-all btn-text-enhanced"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Spinner className="mr-2 h-5 w-5 animate-spin" />
                          {t.signIn}...
                        </>
                      ) : (
                        t.signIn
                      )}
                    </Button>
                  </div>

                  {/* Forgot Password */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      className="text-sm sm:text-base text-primary hover:underline min-h-[44px] inline-flex items-center px-2 font-medium"
                      onClick={() => setLoginStep('forgot-password')}
                    >
                      {t.forgotPassword}
                    </button>
                  </div>

                  {/* Biometric Login Option */}
                  <div className="flex flex-col gap-4 sm:gap-6 pt-4">
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
                      className="h-12 sm:h-14 facebook-button"
                    />
                  </div>
                </form>
              )}

              {/* 2FA Step */}
              {loginStep === '2fa' && (
                <div className="space-y-6 sm:space-y-8">
                  <div className="text-center mb-6 sm:mb-8">
                    <ShieldCheck className="h-12 w-12 sm:h-14 sm:w-14 text-primary mx-auto mb-4 sm:mb-6 icon-enhanced" />
                  </div>
                  
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="000000"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="facebook-input text-center text-lg font-mono h-12 sm:h-14"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={handleTwoFactorSubmit}
                      disabled={isLoading || twoFactorCode.length !== 6}
                      className="w-full facebook-button h-12 sm:h-14"
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
                  </div>

                  <div className="text-center pt-4">
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-foreground min-h-[44px] inline-flex items-center px-2"
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
                  <div className="my-6 sm:my-8 md:my-10">
                    <Separator />
                  </div>

                  {/* Create Account Button */}
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="outline"
                      className="facebook-button px-6 sm:px-8 py-3 h-12 sm:h-14 bg-accent hover:bg-accent/90 text-white font-semibold border-accent text-base sm:text-lg"
                      onClick={onSwitchToSignUp}
                    >
                      {t.createNewAccount}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Footer Links - only on credentials step */}
          {loginStep === 'credentials' && (
            <div className="text-center mt-6 sm:mt-8 px-4">
              <p className="text-xs sm:text-sm text-muted-foreground">
                <span className="font-semibold">Create a Page</span> for a celebrity, brand or business.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}