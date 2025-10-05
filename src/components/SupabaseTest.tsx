import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { testSupabaseConnection } from '@/lib/supabase'
import { CheckCircle, XCircle, Spinner, Database, ArrowSquareOut } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function SupabaseTest() {
  const [testResult, setTestResult] = useState<{
    connected: boolean
    error: string | null
    message: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runConnectionTest = async () => {
    setIsLoading(true)
    toast.loading('Testing Supabase connection...', { id: 'connection-test' })
    
    try {
      const result = await testSupabaseConnection()
      setTestResult(result)
      
      if (result.connected) {
        toast.success('Supabase connection successful!', { id: 'connection-test' })
      } else {
        toast.error('Connection failed (expected with demo credentials)', { id: 'connection-test' })
      }
    } catch (error) {
      toast.error('Connection test failed', { id: 'connection-test' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Supabase Connection Test</h3>
          </div>
          
          {testResult && (
            <Badge variant={testResult.connected ? "default" : "destructive"}>
              {testResult.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-start gap-3">
          {isLoading ? (
            <Spinner className="h-5 w-5 animate-spin text-primary mt-0.5" />
          ) : testResult?.connected ? (
            <CheckCircle className="h-5 w-5 text-accent mt-0.5" />
          ) : testResult ? (
            <XCircle className="h-5 w-5 text-destructive mt-0.5" />
          ) : (
            <Database className="h-5 w-5 text-muted-foreground mt-0.5" />
          )}
          
          <div className="flex-1">
            <p className="text-sm font-medium">
              {isLoading 
                ? 'Testing connection...' 
                : testResult?.connected 
                  ? 'Database Connected' 
                  : testResult
                    ? 'Connection Failed (Expected)'
                    : 'Connection Not Tested'
              }
            </p>
            
            {testResult && (
              <p className="text-xs text-muted-foreground mt-1">
                {testResult.message}
              </p>
            )}
          </div>
        </div>

        {/* Error Details */}
        {testResult?.error && (
          <div className="bg-muted p-3 rounded-md border border-border">
            <p className="text-xs font-medium mb-1">Technical Details:</p>
            <p className="text-xs text-muted-foreground font-mono">
              {testResult.error}
            </p>
          </div>
        )}

        {/* Test Button */}
        <Button 
          onClick={runConnectionTest} 
          disabled={isLoading}
          variant="outline"
          className="w-full"
          size="sm"
        >
          {isLoading ? (
            <>
              <Spinner className="mr-2 h-4 w-4 animate-spin" />
              Testing Connection...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Test Connection
            </>
          )}
        </Button>

        {/* Setup Instructions */}
        <div className="bg-card border rounded-md p-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <ArrowSquareOut className="h-4 w-4" />
            Setup Instructions
          </h4>
          
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-primary">1.</span>
              <span>Create a free Supabase project at <code className="bg-muted px-1 rounded">supabase.com</code></span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="font-semibold text-primary">2.</span>
              <span>Copy your project URL and anon key from Settings → API</span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="font-semibold text-primary">3.</span>
              <span>Replace demo credentials in <code className="bg-muted px-1 rounded">src/lib/supabase.ts</code></span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="font-semibold text-primary">4.</span>
              <span>Run the SQL migrations to create required tables</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-2">Current Configuration:</p>
            <div className="bg-muted p-2 rounded text-xs font-mono">
              <div>URL: <span className="text-muted-foreground">https://demo.supabase.co</span></div>
              <div>Key: <span className="text-muted-foreground">demo-key</span></div>
              <div>Status: <span className="text-warning">Demo Mode</span></div>
            </div>
          </div>
        </div>

        {/* Demo Mode Notice */}
        <div className="bg-warning/10 border border-warning/20 rounded-md p-3">
          <p className="text-xs text-warning-foreground">
            <strong>Demo Mode Active:</strong> The application is currently using demo credentials. 
            All functionality works in demonstration mode, but data is not persisted to a real database.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}