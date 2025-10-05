import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Database, Check, X, ArrowClockwise } from '@phosphor-icons/react'
import { ensureDatabaseReady, checkDatabaseReadiness } from '@/lib/database-init'
import { DatabaseSetupHelper } from '@/components/DatabaseSetupHelper'

interface DatabaseInitProps {
  onComplete: () => void
}

export function DatabaseInit({ onComplete }: DatabaseInitProps) {
  const [isInitializing, setIsInitializing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'checking' | 'initializing' | 'complete' | 'error'>('checking')
  const [errorMessage, setErrorMessage] = useState('')
  const [tableStatus, setTableStatus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    checkDatabase()
  }, [])

  const checkDatabase = async () => {
    setStatus('checking')
    try {
      const result = await checkDatabaseReadiness()
      setTableStatus(result.tables)
      
      if (result.ready) {
        setStatus('complete')
        setTimeout(onComplete, 1000)
      } else {
        setStatus('error')
        setErrorMessage(`Missing tables: ${result.missing.join(', ')}`)
      }
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Database check failed')
    }
  }

  const initializeDatabase = async () => {
    setIsInitializing(true)
    setStatus('initializing')
    setProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 500)

      const result = await ensureDatabaseReady()
      
      clearInterval(progressInterval)
      setProgress(100)

      if (result.ready) {
        setStatus('complete')
        toast.success('Database initialized successfully!')
        setTimeout(onComplete, 1500)
      } else {
        setStatus('error')
        setErrorMessage('Database initialization failed')
        toast.error('Database initialization failed')
      }
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Initialization failed')
      toast.error('Database initialization failed')
    } finally {
      setIsInitializing(false)
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <ArrowClockwise className="h-8 w-8 text-primary animate-spin" />
      case 'initializing':
        return <Database className="h-8 w-8 text-primary animate-pulse" />
      case 'complete':
        return <Check className="h-8 w-8 text-success" />
      case 'error':
        return <X className="h-8 w-8 text-destructive" />
      default:
        return <Database className="h-8 w-8 text-muted-foreground" />
    }
  }

  const getStatusMessage = () => {
    switch (status) {
      case 'checking':
        return 'Checking database status...'
      case 'initializing':
        return 'Initializing database tables...'
      case 'complete':
        return 'Database is ready!'
      case 'error':
        return 'Database setup required'
      default:
        return 'Unknown status'
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle>Database Setup</CardTitle>
          <p className="text-sm text-muted-foreground">
            {getStatusMessage()}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'initializing' && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground text-center">
                {progress}% complete
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">
                  {errorMessage}
                </p>
              </div>

              {Object.keys(tableStatus).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Table Status:</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {Object.entries(tableStatus).map(([table, exists]) => (
                      <div key={table} className="flex items-center justify-between text-xs">
                        <span className="font-mono">{table}</span>
                        {exists ? (
                          <Check className="h-3 w-3 text-success" />
                        ) : (
                          <X className="h-3 w-3 text-destructive" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-muted/50 border border-border rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">
                  <strong>Manual Setup Required:</strong>
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  The database tables need to be created manually in Supabase.
                </p>
                <div className="flex justify-center mb-2">
                  <DatabaseSetupHelper />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={checkDatabase}
                  className="flex-1"
                >
                  <ArrowClockwise className="mr-2 h-4 w-4" />
                  Recheck
                </Button>
                <Button
                  onClick={initializeDatabase}
                  disabled={isInitializing}
                  className="flex-1"
                >
                  <Database className="mr-2 h-4 w-4" />
                  Try Auto-Init
                </Button>
              </div>
            </div>
          )}

          {status === 'complete' && (
            <div className="text-center space-y-2">
              <p className="text-sm text-success">
                All database tables are ready!
              </p>
              <p className="text-xs text-muted-foreground">
                Redirecting to application...
              </p>
            </div>
          )}

          {status === 'checking' && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Please wait while we verify the database setup...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}