import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  XCircle, 
  Warning, 
  Info, 
  Spinner,
  Copy,
  Eye,
  EyeSlash
} from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface ConfigCheck {
  name: string
  status: 'checking' | 'success' | 'warning' | 'error'
  message: string
  details?: string
  fix?: string
}

interface SupabaseAuthConfig {
  emailConfirmRequired: boolean
  emailProvider: boolean
  siteUrl: string
  redirectUrls: string[]
}

export function SupabaseConfigChecker() {
  const [checks, setChecks] = useState<ConfigCheck[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [showEnvVars, setShowEnvVars] = useState(false)
  const [authConfig, setAuthConfig] = useState<SupabaseAuthConfig | null>(null)

  const envVars = {
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    APP_URL: import.meta.env.VITE_APP_URL,
    REDIRECT_URL: import.meta.env.VITE_REDIRECT_URL,
    ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT || import.meta.env.NODE_ENV,
  }

  const updateCheck = (name: string, updates: Partial<ConfigCheck>) => {
    setChecks(prev => prev.map(check => 
      check.name === name ? { ...check, ...updates } : check
    ))
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    
    const initialChecks: ConfigCheck[] = [
      { name: 'Environment Variables', status: 'checking', message: 'Checking environment configuration...' },
      { name: 'Supabase Connection', status: 'checking', message: 'Testing Supabase connection...' },
      { name: 'Database Schema', status: 'checking', message: 'Verifying database tables...' },
      { name: 'Authentication Settings', status: 'checking', message: 'Checking auth configuration...' },
      { name: 'Email Configuration', status: 'checking', message: 'Testing email functionality...' },
      { name: 'URL Configuration', status: 'checking', message: 'Validating redirect URLs...' },
    ]

    setChecks(initialChecks)

    // Check 1: Environment Variables
    try {
      if (!envVars.SUPABASE_URL || !envVars.SUPABASE_ANON_KEY) {
        updateCheck('Environment Variables', {
          status: 'error',
          message: 'Missing required environment variables',
          details: 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required',
          fix: 'Create a .env file with your Supabase credentials. Check .env.example for reference.'
        })
      } else if (envVars.SUPABASE_URL.includes('your-project') || envVars.SUPABASE_ANON_KEY.includes('your-anon-key')) {
        updateCheck('Environment Variables', {
          status: 'error',
          message: 'Environment variables contain placeholder values',
          details: 'Replace placeholder values with actual Supabase credentials',
          fix: 'Update .env file with real values from your Supabase project dashboard'
        })
      } else {
        updateCheck('Environment Variables', {
          status: 'success',
          message: 'Environment variables configured correctly',
          details: `Using project: ${envVars.SUPABASE_URL.split('//')[1]?.split('.')[0]}`
        })
      }
    } catch (error) {
      updateCheck('Environment Variables', {
        status: 'error',
        message: 'Error checking environment variables',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Check 2: Supabase Connection
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1)
      
      if (error) {
        updateCheck('Supabase Connection', {
          status: 'error',
          message: 'Failed to connect to Supabase',
          details: error.message,
          fix: 'Verify your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file'
        })
      } else {
        updateCheck('Supabase Connection', {
          status: 'success',
          message: 'Successfully connected to Supabase',
          details: 'Database connection established'
        })
      }
    } catch (error) {
      updateCheck('Supabase Connection', {
        status: 'error',
        message: 'Connection test failed',
        details: error instanceof Error ? error.message : 'Unknown connection error'
      })
    }

    // Check 3: Database Schema
    try {
      const tables = ['users', 'conversations', 'messages', 'conversation_participants']
      const results = await Promise.allSettled(
        tables.map(table => supabase.from(table).select('*').limit(1))
      )

      const missingTables = results
        .map((result, index) => ({ table: tables[index], result }))
        .filter(({ result }) => result.status === 'rejected' || 
          (result.status === 'fulfilled' && result.value.error))
        .map(({ table }) => table)

      if (missingTables.length > 0) {
        updateCheck('Database Schema', {
          status: 'error',
          message: 'Missing database tables',
          details: `Tables not found: ${missingTables.join(', ')}`,
          fix: 'Run database migrations or check DatabaseInit component'
        })
      } else {
        updateCheck('Database Schema', {
          status: 'success',
          message: 'All required tables exist',
          details: 'Database schema is properly configured'
        })
      }
    } catch (error) {
      updateCheck('Database Schema', {
        status: 'error',
        message: 'Error checking database schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Check 4: Authentication Settings
    try {
      // Test authentication by checking current session
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        updateCheck('Authentication Settings', {
          status: 'warning',
          message: 'Authentication check completed with warnings',
          details: error.message,
          fix: 'Check Supabase Dashboard → Authentication → Providers'
        })
      } else {
        updateCheck('Authentication Settings', {
          status: 'success',
          message: 'Authentication system is functional',
          details: session ? 'Currently authenticated' : 'Ready for authentication'
        })
      }
    } catch (error) {
      updateCheck('Authentication Settings', {
        status: 'error',
        message: 'Authentication system error',
        details: error instanceof Error ? error.message : 'Unknown auth error'
      })
    }

    // Check 5: Email Configuration (Test)
    try {
      // Try to get auth configuration (this will give us insights)
      const testEmail = 'test@example.com'
      const { error } = await supabase.auth.resetPasswordForEmail(testEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) {
        if (error.message.includes('User not found')) {
          updateCheck('Email Configuration', {
            status: 'success',
            message: 'Email system is configured',
            details: 'Password reset endpoint is working (test email not found is expected)'
          })
        } else if (error.message.includes('too_many_requests')) {
          updateCheck('Email Configuration', {
            status: 'warning',
            message: 'Email rate limit reached',
            details: 'Email system is working but rate limited',
            fix: 'Wait a few minutes before sending more emails'
          })
        } else {
          updateCheck('Email Configuration', {
            status: 'error',
            message: 'Email configuration issue',
            details: error.message,
            fix: 'Check Supabase Dashboard → Authentication → Providers → Email'
          })
        }
      } else {
        updateCheck('Email Configuration', {
          status: 'success',
          message: 'Email system is working',
          details: 'Password reset email functionality confirmed'
        })
      }
    } catch (error) {
      updateCheck('Email Configuration', {
        status: 'error',
        message: 'Email test failed',
        details: error instanceof Error ? error.message : 'Unknown email error'
      })
    }

    // Check 6: URL Configuration
    try {
      const currentOrigin = window.location.origin
      const expectedUrls = [
        `${currentOrigin}/**`,
        `${currentOrigin}/reset-password`,
        `${currentOrigin}/auth/callback`,
        `${currentOrigin}/dashboard`
      ]

      updateCheck('URL Configuration', {
        status: 'warning',
        message: 'Manual verification required',
        details: 'Check these URLs are configured in Supabase Dashboard',
        fix: `Add to Redirect URLs: ${expectedUrls.join(', ')}`
      })
    } catch (error) {
      updateCheck('URL Configuration', {
        status: 'error',
        message: 'URL validation error',
        details: error instanceof Error ? error.message : 'Unknown URL error'
      })
    }

    setIsRunning(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const getStatusIcon = (status: ConfigCheck['status']) => {
    switch (status) {
      case 'checking':
        return <Spinner className="h-4 w-4 animate-spin text-muted-foreground" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" weight="fill" />
      case 'warning':
        return <Warning className="h-4 w-4 text-warning" weight="fill" />
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" weight="fill" />
      default:
        return null
    }
  }

  const getStatusColor = (status: ConfigCheck['status']) => {
    switch (status) {
      case 'success':
        return 'text-success'
      case 'warning':
        return 'text-warning'
      case 'error':
        return 'text-destructive'
      default:
        return 'text-muted-foreground'
    }
  }

  useEffect(() => {
    // Auto-run diagnostics on component mount
    runDiagnostics()
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Supabase Configuration Checker
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Run Diagnostics Button */}
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">
              Diagnose Supabase configuration and authentication setup issues
            </p>
            <Button 
              onClick={runDiagnostics} 
              disabled={isRunning}
              variant="outline"
            >
              {isRunning ? (
                <>
                  <Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                'Run Diagnostics'
              )}
            </Button>
          </div>

          {/* Environment Variables Display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Environment Variables
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEnvVars(!showEnvVars)}
                >
                  {showEnvVars ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showEnvVars && (
                <div className="space-y-3">
                  {Object.entries(envVars).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between bg-muted p-3 rounded-md">
                      <div className="font-mono text-sm">
                        <span className="text-muted-foreground">VITE_{key}=</span>
                        <span className={value ? 'text-foreground' : 'text-destructive'}>
                          {value || '<not set>'}
                        </span>
                      </div>
                      {value && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(value)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Diagnostic Results */}
          {checks.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Diagnostic Results</h3>
              {checks.map((check) => (
                <Card key={check.name} className={`border-l-4 border-l-transparent ${
                  check.status === 'success' ? 'border-l-success' :
                  check.status === 'warning' ? 'border-l-warning' :
                  check.status === 'error' ? 'border-l-destructive' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(check.status)}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{check.name}</h4>
                          <Badge 
                            variant={check.status === 'success' ? 'default' : 'secondary'}
                            className={getStatusColor(check.status)}
                          >
                            {check.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{check.message}</p>
                        {check.details && (
                          <p className="text-xs bg-muted p-2 rounded font-mono">
                            {check.details}
                          </p>
                        )}
                        {check.fix && (
                          <Alert className="mt-2">
                            <AlertDescription className="text-sm">
                              <strong>Fix:</strong> {check.fix}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Quick Fix Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Fix Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <input type="checkbox" className="rounded" />
                  <span>Create .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <input type="checkbox" className="rounded" />
                  <span>Configure Redirect URLs in Supabase Dashboard → Authentication → URL Configuration</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <input type="checkbox" className="rounded" />
                  <span>Enable Email provider in Supabase Dashboard → Authentication → Providers</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <input type="checkbox" className="rounded" />
                  <span>Check Email Templates contain {`{{ .ConfirmationURL }}`}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <input type="checkbox" className="rounded" />
                  <span>Verify database tables exist (run DatabaseInit if needed)</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <input type="checkbox" className="rounded" />
                  <span>Check Supabase → Logs → Auth Logs for errors</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Helpful Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a 
                  href="https://app.supabase.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 border rounded-md hover:bg-muted transition-colors"
                >
                  <h4 className="font-medium">Supabase Dashboard</h4>
                  <p className="text-sm text-muted-foreground">Manage your project settings</p>
                </a>
                <a 
                  href="https://supabase.com/docs/guides/auth" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-3 border rounded-md hover:bg-muted transition-colors"
                >
                  <h4 className="font-medium">Auth Documentation</h4>
                  <p className="text-sm text-muted-foreground">Supabase authentication guide</p>
                </a>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}