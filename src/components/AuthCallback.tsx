import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Spinner, CheckCircle, XCircle } from '@phosphor-icons/react'
import { supabase, createUserProfileAfterVerification } from '@/lib/supabase'

export function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash parameters from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')
        const errorDescription = hashParams.get('error_description')

        console.log('Auth callback params:', { type, hasAccessToken: !!accessToken, errorDescription })

        // Handle error cases first
        if (errorDescription) {
          setStatus('error')
          setError(decodeURIComponent(errorDescription))
          setMessage('Authentication failed')
          toast.error(`Authentication error: ${decodeURIComponent(errorDescription)}`)
          return
        }

        if (!accessToken || !refreshToken) {
          setStatus('error')
          setError('Missing authentication tokens in callback URL')
          setMessage('Invalid authentication link')
          toast.error('Invalid authentication link. Please try again.')
          return
        }

        // Set the session from the tokens
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (sessionError) {
          console.error('Session error:', sessionError)
          setStatus('error')
          setError(sessionError.message)
          setMessage('Failed to establish session')
          toast.error(`Session error: ${sessionError.message}`)
          return
        }

        const user = sessionData.user
        if (!user) {
          setStatus('error')
          setError('No user data in session')
          setMessage('Authentication incomplete')
          toast.error('Authentication incomplete. Please try again.')
          return
        }

        console.log('User authenticated:', { 
          id: user.id, 
          email: user.email, 
          emailConfirmed: user.email_confirmed_at ? true : false 
        })

        // Handle different callback types
        if (type === 'signup') {
          // Email confirmation for new signup
          try {
            // Create user profile after email verification
            await createUserProfileAfterVerification(user)
            
            setStatus('success')
            setMessage('Email confirmed successfully!')
            toast.success('Welcome! Your email has been confirmed. You can now sign in.', {
              duration: 5000
            })

            // Redirect to login after delay
            setTimeout(() => {
              window.location.href = '/'
            }, 3000)

          } catch (profileError) {
            console.error('Profile creation error:', profileError)
            setStatus('success') // Still successful auth, just warn about profile
            setMessage('Email confirmed, but profile setup incomplete')
            toast.warning('Email confirmed successfully, but there was an issue creating your profile. You can still sign in.', {
              duration: 6000
            })
            
            setTimeout(() => {
              window.location.href = '/'
            }, 4000)
          }

        } else if (type === 'recovery') {
          // Password reset confirmation
          setStatus('success')
          setMessage('Password reset link confirmed')
          toast.success('Password reset link confirmed. You can now set your new password.', {
            duration: 5000
          })

          // Redirect to password reset form
          setTimeout(() => {
            window.location.href = '/reset-password'
          }, 2000)

        } else {
          // Generic email confirmation
          setStatus('success')
          setMessage('Email confirmed successfully!')
          toast.success('Your email has been confirmed successfully.', {
            duration: 5000
          })
          
          setTimeout(() => {
            window.location.href = '/'
          }, 3000)
        }

      } catch (error: any) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setError(error.message || 'An unexpected error occurred')
        setMessage('Authentication failed')
        toast.error(`Authentication failed: ${error.message || 'Unknown error'}`)
      }
    }

    handleAuthCallback()
  }, [])

  const handleRetry = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-card border border-border shadow-lg">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {status === 'loading' && (
              <>
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Spinner className="h-8 w-8 text-primary animate-spin" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Processing...</h2>
                  <p className="text-muted-foreground">
                    Please wait while we confirm your email.
                  </p>
                </div>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Success!</h2>
                  <p className="text-muted-foreground">
                    {message}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You will be redirected automatically...
                  </p>
                </div>
                <Button onClick={() => window.location.href = '/'} className="w-full">
                  Continue to App
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">Error</h2>
                  <p className="text-muted-foreground">
                    {message}
                  </p>
                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                      {error}
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <Button onClick={handleRetry} className="w-full">
                    Back to App
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    If this error persists, please contact support or try registering again.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}