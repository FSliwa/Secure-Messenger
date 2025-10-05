import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { testSupabaseConnection } from '@/lib/supabase'
import { CheckCircle, XCircle, Spinner, Database } from '@phosphor-icons/react'

export function ConnectionTest() {
  const [testResult, setTestResult] = useState<{
    connected: boolean
    error: string | null
    message: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const runTest = async () => {
    setIsLoading(true)
    const result = await testSupabaseConnection()
    setTestResult(result)
    setIsLoading(false)
  }

  useEffect(() => {
    // Run test on component mount
    runTest()
  }, [])

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Database Connection</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {isLoading ? (
            <Spinner className="h-5 w-5 animate-spin text-primary" />
          ) : testResult?.connected ? (
            <CheckCircle className="h-5 w-5 text-accent" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          
          <div className="flex-1">
            <p className="text-sm font-medium">
              {isLoading ? 'Testing connection...' : testResult?.connected ? 'Connected' : 'Not Connected'}
            </p>
            {testResult && (
              <p className="text-xs text-muted-foreground mt-1">
                {testResult.message}
              </p>
            )}
          </div>
        </div>

        {testResult?.error && (
          <div className="bg-muted p-3 rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>Details:</strong> {testResult.error}
            </p>
          </div>
        )}

        <Button 
          onClick={runTest} 
          disabled={isLoading}
          variant="outline"
          size="sm"
          className="w-full"
        >
          {isLoading ? (
            <>
              <Spinner className="mr-2 h-3 w-3 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Again'
          )}
        </Button>

        <div className="bg-card border rounded-md p-3">
          <h4 className="text-xs font-medium mb-2">Setup Instructions:</h4>
          <ol className="text-xs text-muted-foreground space-y-1">
            <li>1. Create a Supabase project at supabase.com</li>
            <li>2. Copy your project URL and anon key</li>
            <li>3. Replace demo credentials in src/lib/supabase.ts</li>
            <li>4. Run database migrations for full functionality</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
}