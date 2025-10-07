import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Spinner, TestTube, CheckCircle, XCircle } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'

interface TestResult {
  type: 'signup' | 'reset'
  success: boolean
  message: string
  details?: any
}

export function EmailTestDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [isTestingSignup, setIsTestingSignup] = useState(false)
  const [isTestingReset, setIsTestingReset] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testPassword, setTestPassword] = useState('testpassword123')
  const [testResults, setTestResults] = useState<TestResult[]>([])

  const validateEmail = (email: string) => {
    if (!email) return 'Email is required'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return !emailRegex.test(email) ? 'Please enter a valid email address' : ''
  }

  const testSignupEmail = async () => {
    const emailError = validateEmail(testEmail)
    if (emailError) {
      toast.error(emailError)
      return
    }

    setIsTestingSignup(true)
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            display_name: 'Test User',
            username: `test_${Date.now()}`,
            public_key: 'test-key',
          },
        },
      })

      const result: TestResult = {
        type: 'signup',
        success: !error,
        message: error ? error.message : 'Signup email sent successfully',
        details: {
          userId: data.user?.id,
          emailConfirmed: data.user?.email_confirmed_at ? true : false,
          error: error?.message
        }
      }

      setTestResults(prev => [result, ...prev])

      if (error) {
        toast.error(`Signup test failed: ${error.message}`)
      } else {
        toast.success('Signup test completed - check email and results below')
      }

    } catch (error: any) {
      const result: TestResult = {
        type: 'signup',
        success: false,
        message: `Exception: ${error.message}`,
        details: { error: error.message }
      }
      
      setTestResults(prev => [result, ...prev])
      toast.error(`Signup test error: ${error.message}`)
    } finally {
      setIsTestingSignup(false)
    }
  }

  const testResetEmail = async () => {
    const emailError = validateEmail(testEmail)
    if (emailError) {
      toast.error(emailError)
      return
    }

    setIsTestingReset(true)
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(testEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      const result: TestResult = {
        type: 'reset',
        success: !error,
        message: error ? error.message : 'Password reset email sent successfully',
        details: {
          error: error?.message
        }
      }

      setTestResults(prev => [result, ...prev])

      if (error) {
        toast.error(`Reset test failed: ${error.message}`)
      } else {
        toast.success('Reset test completed - check email and results below')
      }

    } catch (error: any) {
      const result: TestResult = {
        type: 'reset',
        success: false,
        message: `Exception: ${error.message}`,
        details: { error: error.message }
      }
      
      setTestResults(prev => [result, ...prev])
      toast.error(`Reset test error: ${error.message}`)
    } finally {
      setIsTestingReset(false)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="fixed bottom-4 right-4 z-50">
          <TestTube className="w-4 h-4 mr-2" />
          Email Test
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Email Functionality Test</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Test Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="testEmail">Test Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="your.email@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="testPassword">Test Password</Label>
              <Input
                id="testPassword"
                type="password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={testSignupEmail}
                disabled={isTestingSignup || !testEmail}
                className="flex-1"
              >
                {isTestingSignup ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2 animate-spin" />
                    Testing Signup...
                  </>
                ) : (
                  'Test Signup Email'
                )}
              </Button>
              
              <Button
                onClick={testResetEmail}
                disabled={isTestingReset || !testEmail}
                variant="secondary"
                className="flex-1"
              >
                {isTestingReset ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2 animate-spin" />
                    Testing Reset...
                  </>
                ) : (
                  'Test Reset Email'
                )}
              </Button>
            </div>
          </div>

          {/* Results */}
          {testResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Test Results</h3>
                <Button onClick={clearResults} variant="outline" size="sm">
                  Clear Results
                </Button>
              </div>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {testResults.map((result, index) => (
                  <Card key={index} className={`border-l-4 ${
                    result.success ? 'border-l-success' : 'border-l-destructive'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium capitalize">
                              {result.type} Email Test
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              result.success 
                                ? 'bg-success/10 text-success' 
                                : 'bg-destructive/10 text-destructive'
                            }`}>
                              {result.success ? 'SUCCESS' : 'FAILED'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {result.message}
                          </p>
                          {result.details && (
                            <details className="text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                Show Details
                              </summary>
                              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-2">
            <h4 className="font-medium text-foreground">Instructions:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Enter your email address above</li>
              <li>Click "Test Signup Email" to test registration emails</li>
              <li>Click "Test Reset Email" to test password reset emails</li>
              <li>Check your email inbox (and spam folder)</li>
              <li>Results will appear below with technical details</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}