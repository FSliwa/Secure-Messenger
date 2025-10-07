import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Spinner, Eye, EyeSlash, CheckCircle } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'

export function PasswordResetHandler() {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetComplete, setResetComplete] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    // Check if we have the proper hash fragments for password reset
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')
    const type = hashParams.get('type')

    if (type === 'recovery' && accessToken && refreshToken) {
      // Set the session from the tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
    } else {
      toast.error('Invalid reset link. Please request a new password reset.')
    }
  }, [])

  const validatePassword = (password: string) => {
    if (!password) return 'Password is required'
    if (password.length < 6) return 'Password must be at least 6 characters'
    return ''
  }

  const validateConfirmPassword = (password: string, confirmPassword: string) => {
    if (!confirmPassword) return 'Please confirm your password'
    if (password !== confirmPassword) return 'Passwords do not match'
    return ''
  }

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Real-time validation
    let error = ''
    if (name === 'password') {
      error = validatePassword(value)
      // Also revalidate confirm password if it exists
      if (formData.confirmPassword) {
        const confirmError = validateConfirmPassword(value, formData.confirmPassword)
        setErrors(prev => ({ ...prev, confirmPassword: confirmError }))
      }
    } else if (name === 'confirmPassword') {
      error = validateConfirmPassword(formData.password, value)
    }
    
    setErrors(prev => ({ ...prev, [name]: error }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    const passwordError = validatePassword(formData.password)
    const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword)
    
    setErrors({
      password: passwordError,
      confirmPassword: confirmPasswordError
    })

    if (passwordError || confirmPasswordError) {
      toast.error('Please fix the errors above')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      })

      if (error) {
        throw error
      }

      setResetComplete(true)
      toast.success('Password reset successfully!', {
        description: 'You can now sign in with your new password.',
        duration: 6000
      })

      // Redirect to login after a brief delay
      setTimeout(() => {
        window.location.href = '/'
      }, 3000)

    } catch (error: any) {
      console.error('Password reset error:', error)
      toast.error(error.message || 'Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (resetComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-card border border-border shadow-lg">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">Password Reset Complete</h2>
                <p className="text-muted-foreground">
                  Your password has been successfully reset. You will be redirected to the login page shortly.
                </p>
              </div>

              <Button
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-card border border-border shadow-lg">
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Set New Password</h2>
              <p className="text-muted-foreground">
                Enter your new password below.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`h-12 pr-12 ${errors.password ? 'border-destructive focus:ring-destructive' : ''}`}
                  disabled={isLoading}
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

              {/* Confirm Password */}
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`h-12 pr-12 ${errors.confirmPassword ? 'border-destructive focus:ring-destructive' : ''}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlash className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
                {errors.confirmPassword && (
                  <p className="mt-2 text-xs text-destructive">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isLoading || !formData.password || !formData.confirmPassword}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-5 w-5 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}