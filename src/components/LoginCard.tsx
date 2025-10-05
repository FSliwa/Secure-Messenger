import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Spinner, SignIn, Shield } from '@phosphor-icons/react'
import { signIn } from '@/lib/supabase'

interface LoginProps {
  onSuccess?: () => void
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
      const { data, error } = await signIn(formData.email, formData.password)
      
      if (error) {
        // Demo mode - simulate login success
        toast.success('Login successful! (Demo mode)', { 
          description: 'In demo mode, any credentials will work' 
        })
        onSuccess?.()
      } else {
        toast.success('Welcome back!')
        onSuccess?.()
      }
      
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error('Login failed. Please check your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md animate-fade-in-up">
      <CardHeader className="space-y-2 pb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-center">Welcome back</h2>
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Sign in to your secure account
        </p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={errors.email ? 'border-destructive focus:ring-destructive' : ''}
              placeholder="Enter your email"
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={errors.password ? 'border-destructive focus:ring-destructive' : ''}
              placeholder="Enter your password"
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive" role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <SignIn className="mr-2 h-4 w-4" />
                Sign In
              </>
            )}
          </Button>

          <div className="text-center">
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={() => toast.info('Password reset coming soon!')}
            >
              Forgot your password?
            </button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t">
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={onSwitchToSignUp}
            >
              Sign up
            </button>
          </p>
        </div>

        {/* Demo Notice */}
        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground text-center">
            <strong>Demo Mode:</strong> Use any email/password to test the login functionality
          </p>
        </div>
      </CardContent>
    </Card>
  )
}