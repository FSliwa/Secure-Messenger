import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Spinner, ArrowLeft, EnvelopeSimple } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'

interface ForgotPasswordProps {
  onBack: () => void
}

export function ForgotPasswordCard({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const validateEmail = (email: string) => {
    if (!email) return 'Email is required'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return !emailRegex.test(email) ? 'Please enter a valid email address' : ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const emailError = validateEmail(email)
    if (emailError) {
      toast.error(emailError)
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        throw error
      }

      setEmailSent(true)
      toast.success('Password reset email sent!', {
        description: 'Check your inbox for instructions to reset your password.',
        duration: 6000
      })
    } catch (error: any) {
      console.error('Password reset error:', error)
      toast.error(error.message || 'Failed to send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="w-full max-w-md mx-auto animate-fade-in-up">
        <Card className="bg-card border border-border shadow-lg">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <EnvelopeSimple className="h-8 w-8 text-primary" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">Check your email</h2>
                <p className="text-muted-foreground">
                  We've sent a password reset link to
                </p>
                <p className="text-sm font-medium text-foreground bg-muted px-3 py-2 rounded-md">
                  {email}
                </p>
                <p className="text-sm text-muted-foreground">
                  Click the link in the email to reset your password. If you don't see it, check your spam folder.
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={() => {
                    setEmailSent(false)
                    setEmail('')
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Try another email
                </Button>
                
                <Button
                  type="button"
                  onClick={onBack}
                  variant="ghost"
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in-up">
      <Card className="bg-card border border-border shadow-lg">
        <CardContent className="p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Reset your password</h2>
              <p className="text-muted-foreground">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-base"
                  disabled={isLoading}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-5 w-5 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>
            </form>

            {/* Back button */}
            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}