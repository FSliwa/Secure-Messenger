import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Spinner, Eye, EyeSlash } from '@phosphor-icons/react'
import { signIn, getCurrentUser } from '@/lib/supabase'

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
      // Sign in with Supabase
      const { user } = await signIn(formData.email, formData.password)
      
      if (!user) {
        toast.error('Login failed. Please check your credentials.')
        setIsLoading(false)
        return
      }

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
      console.error('Login error:', error)
      toast.error(error.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      {/* Main Login Card */}
      <Card className="bg-card border border-border shadow-lg">
        <CardContent className="p-6">
          <div className="text-center mb-6">

            <h1 className="text-2xl font-bold text-foreground mb-1">Log in to SecureChat</h1>
          </div>

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
        </CardContent>
      </Card>

      {/* Footer Links */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          <span className="font-semibold">Create a Page</span> for a celebrity, brand or business.
        </p>
      </div>
    </div>
  )
}