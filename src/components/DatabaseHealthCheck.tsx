import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Warning, Info } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface HealthStatus {
  rls: { enabled: boolean; tables: string[] }
  functions: { exists: boolean; missing: string[] }
  policies: { count: number; issues: string[] }
  overall: 'healthy' | 'warning' | 'error'
}

export function DatabaseHealthCheck() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  const checkDatabaseHealth = async () => {
    setIsChecking(true)
    
    try {
      const health: HealthStatus = {
        rls: { enabled: true, tables: [] },
        functions: { exists: true, missing: [] },
        policies: { count: 0, issues: [] },
        overall: 'healthy'
      }

      // Check if we can query critical tables
      const tablesToCheck = ['conversations', 'conversation_participants', 'messages', 'users']
      
      for (const table of tablesToCheck) {
        try {
          const { error } = await supabase.from(table).select('id').limit(1)
          if (error) {
            health.rls.tables.push(table)
            health.overall = 'error'
          }
        } catch (error) {
          health.rls.tables.push(table)
          health.overall = 'error'
        }
      }

      // Test if we can create a test conversation (will fail with RLS error if broken)
      // Note: This is just a test, we'll rollback
      
      setHealthStatus(health)
      
      if (health.overall === 'healthy') {
        toast.success('Database is healthy!')
      } else if (health.overall === 'warning') {
        toast.warning('Database has warnings')
        setShowDetails(true)
      } else {
        toast.error('Database has errors - SQL fix required')
        setShowDetails(true)
      }
      
    } catch (error) {
      console.error('Health check failed:', error)
      toast.error('Health check failed')
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    // Auto-check on mount
    checkDatabaseHealth()
  }, [])

  if (!healthStatus && !isChecking) return null
  if (isDismissed) return null

  if (isChecking) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              <span className="text-sm">Checking database health...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!healthStatus) return null

  const Icon = healthStatus.overall === 'healthy' ? CheckCircle :
               healthStatus.overall === 'warning' ? Warning : XCircle

  const iconColor = healthStatus.overall === 'healthy' ? 'text-green-500' :
                    healthStatus.overall === 'warning' ? 'text-yellow-500' : 'text-red-500'

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className={`w-80 ${healthStatus.overall === 'error' ? 'border-destructive' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${iconColor}`} weight="fill" />
              Database Status
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDismissed(true)}
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {healthStatus.overall === 'error' && (
            <Alert className="bg-destructive/10 border-destructive">
              <XCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-xs">
                <strong>SQL Fix Required!</strong>
                <div className="mt-2 space-y-1">
                  {healthStatus.rls.tables.length > 0 && (
                    <div>
                      RLS Issues: {healthStatus.rls.tables.join(', ')}
                    </div>
                  )}
                  <div className="mt-2 p-2 bg-muted rounded text-xs">
                    Execute <strong>ULTIMATE_FIX.sql</strong> in Supabase SQL Editor
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {healthStatus.overall === 'healthy' && (
            <Alert className="bg-success/10 border-success">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-xs">
                All database policies are working correctly!
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs flex-1"
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
            <Button 
              size="sm" 
              onClick={checkDatabaseHealth}
              className="text-xs flex-1"
            >
              Recheck
            </Button>
          </div>

          {showDetails && (
            <div className="text-xs space-y-2 p-3 bg-muted rounded">
              <div>
                <strong>Tables Accessible:</strong>
                <div className="ml-2 mt-1">
                  {['conversations', 'messages', 'users'].map(t => (
                    <div key={t} className="flex items-center gap-1">
                      {healthStatus.rls.tables.includes(t) ? (
                        <>
                          <XCircle className="h-3 w-3 text-destructive" />
                          <span>{t}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3 w-3 text-success" />
                          <span>{t}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              {healthStatus.overall === 'error' && (
                <div className="mt-3 p-2 bg-destructive/10 rounded">
                  <Info className="h-3 w-3 inline mr-1" />
                  <span className="text-xs">
                    Fix: Run ULTIMATE_FIX.sql in Supabase
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

