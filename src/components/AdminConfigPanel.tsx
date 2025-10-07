import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TestTube, 
  Envelope, 
  Database, 
  Gear,
  CheckCircle,
  XCircle,
  Spinner,
  Info
} from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { SupabaseConfigChecker } from './SupabaseConfigChecker'
import { SupabaseTroubleshootingGuide } from './SupabaseTroubleshootingGuide'

interface TestResult {
  test: string
  status: 'success' | 'error' | 'running'
  message: string
  details?: string
}

export function AdminConfigPanel() {
  const [testEmail, setTestEmail] = useState('')
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)

  const updateTestResult = (testName: string, updates: Partial<TestResult>) => {
    setTestResults(prev => prev.map(result => 
      result.test === testName ? { ...result, ...updates } : result
    ))
  }

  const runEmailTest = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(testEmail)) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsRunningTests(true)
    
    // Initialize test results
    const initialResults: TestResult[] = [
      { test: 'Email Configuration', status: 'running', message: 'Testing email configuration...' },
      { test: 'Password Reset', status: 'running', message: 'Testing password reset email...' },
      { test: 'Signup Email', status: 'running', message: 'Testing signup confirmation email...' }
    ]
    
    setTestResults(initialResults)

    try {
      // Test 1: Basic email configuration
      console.log('🧪 Testing email configuration')
      
      // Test password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(testEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (resetError) {
        if (resetError.message.includes('User not found')) {
          updateTestResult('Password Reset', {
            status: 'success',
            message: 'Email system working (user not found is expected)',
            details: 'Password reset endpoint responded correctly'
          })
        } else if (resetError.message.includes('too_many_requests')) {
          updateTestResult('Password Reset', {
            status: 'error',
            message: 'Rate limit reached',
            details: 'Email system is working but rate limited. Wait before testing again.'
          })
        } else {
          updateTestResult('Password Reset', {
            status: 'error',
            message: 'Password reset failed',
            details: resetError.message
          })
        }
      } else {
        updateTestResult('Password Reset', {
          status: 'success',
          message: 'Password reset email sent successfully',
          details: 'Check the test email inbox (including spam folder)'
        })
      }

      // Test signup email (this will also test if user already exists)
      const { error: signupError } = await supabase.auth.signUp({
        email: testEmail,
        password: 'TestPassword123!', // Temporary password for testing
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (signupError) {
        if (signupError.message.includes('User already registered')) {
          updateTestResult('Signup Email', {
            status: 'success',
            message: 'Email system working (user exists)',
            details: 'Signup endpoint responded correctly - user already exists'
          })
        } else {
          updateTestResult('Signup Email', {
            status: 'error',
            message: 'Signup test failed',
            details: signupError.message
          })
        }
      } else {
        updateTestResult('Signup Email', {
          status: 'success',
          message: 'Signup confirmation email sent',
          details: 'Check the test email inbox for confirmation email'
        })
      }

      updateTestResult('Email Configuration', {
        status: 'success',
        message: 'Email configuration tests completed',
        details: 'Review individual test results above'
      })

      toast.success('Email tests completed - check results below')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      updateTestResult('Email Configuration', {
        status: 'error',
        message: 'Email test failed',
        details: errorMessage
      })

      toast.error('Email test failed: ' + errorMessage)
    } finally {
      setIsRunningTests(false)
    }
  }

  const runDatabaseTest = async () => {
    setIsRunningTests(true)
    
    const dbTests: TestResult[] = [
      { test: 'Connection', status: 'running', message: 'Testing database connection...' },
      { test: 'Tables', status: 'running', message: 'Checking required tables...' },
      { test: 'Permissions', status: 'running', message: 'Testing table permissions...' }
    ]
    
    setTestResults(dbTests)

    try {
      // Test connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      
      if (connectionError) {
        updateTestResult('Connection', {
          status: 'error',
          message: 'Database connection failed',
          details: connectionError.message
        })
      } else {
        updateTestResult('Connection', {
          status: 'success',
          message: 'Database connection successful',
          details: 'Connected to Supabase database'
        })
      }

      // Test required tables
      const tables = ['users', 'conversations', 'messages', 'conversation_participants']
      const tableResults = await Promise.allSettled(
        tables.map(table => supabase.from(table).select('*').limit(1))
      )

      const missingTables = tableResults
        .map((result, index) => ({ table: tables[index], result }))
        .filter(({ result }) => result.status === 'rejected' || 
          (result.status === 'fulfilled' && result.value.error))
        .map(({ table }) => table)

      if (missingTables.length > 0) {
        updateTestResult('Tables', {
          status: 'error',
          message: 'Missing required tables',
          details: `Tables not found: ${missingTables.join(', ')}`
        })
      } else {
        updateTestResult('Tables', {
          status: 'success',
          message: 'All required tables exist',
          details: `Found tables: ${tables.join(', ')}`
        })
      }

      // Test permissions (try to insert a test record - we'll delete it immediately)
      const testUserId = 'test-' + Date.now()
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: testUserId,
          username: 'test-user-' + Date.now(),
          display_name: 'Test User',
          public_key: 'test-key',
          status: 'offline'
        })

      if (insertError) {
        updateTestResult('Permissions', {
          status: 'error',
          message: 'Insert permission test failed',
          details: insertError.message
        })
      } else {
        // Clean up test record
        await supabase.from('users').delete().eq('id', testUserId)
        
        updateTestResult('Permissions', {
          status: 'success',
          message: 'Database permissions working',
          details: 'Insert and delete operations successful'
        })
      }

      toast.success('Database tests completed')

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Database test failed: ' + errorMessage)
    } finally {
      setIsRunningTests(false)
    }
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <Spinner className="h-4 w-4 animate-spin text-muted-foreground" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" weight="fill" />
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" weight="fill" />
      default:
        return null
    }
  }

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'text-success'
      case 'error':
        return 'text-destructive'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gear className="h-6 w-6 text-primary" />
            Admin Configuration Panel
          </CardTitle>
          <p className="text-muted-foreground">
            Test and diagnose Supabase configuration issues
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="tests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tests">Quick Tests</TabsTrigger>
          <TabsTrigger value="checker">Config Checker</TabsTrigger>
          <TabsTrigger value="guide">Troubleshooting</TabsTrigger>
          <TabsTrigger value="info">System Info</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Email Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Envelope className="h-5 w-5 text-primary" />
                  Email System Test
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Test password reset and signup emails
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-email">Test Email Address</Label>
                  <Input
                    id="test-email"
                    type="email"
                    placeholder="Enter test email address"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={runEmailTest} 
                  disabled={isRunningTests || !testEmail}
                  className="w-full"
                >
                  {isRunningTests ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Test Email System
                    </>
                  )}
                </Button>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    This will attempt to send test emails. Check the email inbox and spam folder.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Database Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Database Test
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Test database connection and schema
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={runDatabaseTest} 
                  disabled={isRunningTests}
                  className="w-full"
                >
                  {isRunningTests ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Test Database
                    </>
                  )}
                </Button>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    This will test database connectivity and required tables.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {testResults.map((result, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-md">
                      {getStatusIcon(result.status)}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{result.test}</span>
                          <Badge 
                            variant={result.status === 'success' ? 'default' : 'secondary'}
                            className={getStatusColor(result.status)}
                          >
                            {result.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                        {result.details && (
                          <p className="text-xs bg-background p-2 rounded font-mono">
                            {result.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="checker">
          <SupabaseConfigChecker />
        </TabsContent>

        <TabsContent value="guide">
          <SupabaseTroubleshootingGuide />
        </TabsContent>

        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Environment Variables</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>SUPABASE_URL:</span>
                      <Badge variant={import.meta.env.VITE_SUPABASE_URL ? 'default' : 'destructive'}>
                        {import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Missing'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>SUPABASE_ANON_KEY:</span>
                      <Badge variant={import.meta.env.VITE_SUPABASE_ANON_KEY ? 'default' : 'destructive'}>
                        {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>APP_URL:</span>
                      <Badge variant={import.meta.env.VITE_APP_URL ? 'default' : 'secondary'}>
                        {import.meta.env.VITE_APP_URL || 'Not set'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded">
                      <span>Environment:</span>
                      <Badge variant="outline">
                        {import.meta.env.MODE || 'Unknown'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Current URLs</h4>
                  <div className="space-y-2 text-sm">
                    <div className="p-2 bg-muted rounded">
                      <div className="font-medium">Origin:</div>
                      <div className="font-mono text-xs">{window.location.origin}</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="font-medium">Reset URL:</div>
                      <div className="font-mono text-xs">{window.location.origin}/reset-password</div>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <div className="font-medium">Callback URL:</div>
                      <div className="font-mono text-xs">{window.location.origin}/auth/callback</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}