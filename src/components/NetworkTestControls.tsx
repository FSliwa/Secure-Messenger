import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { 
  WifiX, 
  WifiHigh, 
  Play, 
  Stop, 
  Warning,
  CheckCircle,
  Clock,
  ArrowClockwise
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { NetworkStatusMonitor } from '@/lib/auth-retry'

interface NetworkTestControlsProps {
  className?: string;
}

export function NetworkTestControls({ className = '' }: NetworkTestControlsProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [testMode, setTestMode] = useState(false)
  const [simulatedOffline, setSimulatedOffline] = useState(false)
  const [testResults, setTestResults] = useState<{
    startTime?: Date
    endTime?: Date
    totalRetries?: number
    success?: boolean
    error?: string
  }>({})

  useEffect(() => {
    const networkMonitor = NetworkStatusMonitor.getInstance()
    
    const unsubscribe = networkMonitor.onStatusChange((online) => {
      setIsOnline(online)
      
      if (testMode) {
        if (!online) {
          toast.info('🔌 Network disconnected - Testing retry mechanism', {
            duration: 5000,
            description: 'Login attempts will now be retried automatically'
          })
        } else {
          toast.success('🔌 Network reconnected - Retries will resume', {
            duration: 3000
          })
        }
      }
    })

    return unsubscribe
  }, [testMode])

  const simulateNetworkDisconnection = () => {
    if (!testMode) {
      toast.error('Enable test mode first')
      return
    }

    // Simulate going offline by overriding navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    // Dispatch offline event
    window.dispatchEvent(new Event('offline'))
    setSimulatedOffline(true)
    
    toast.warning('🔌 Simulated network disconnection', {
      description: 'All network requests will now fail',
      duration: 5000
    })

    // Auto-reconnect after 10 seconds for testing
    setTimeout(() => {
      reconnectNetwork()
    }, 10000)
  }

  const reconnectNetwork = () => {
    // Restore online status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })

    // Dispatch online event
    window.dispatchEvent(new Event('online'))
    setSimulatedOffline(false)
    
    toast.success('🔌 Network reconnected', {
      description: 'Retry attempts will now succeed',
      duration: 3000
    })
  }

  const startRetryTest = () => {
    setTestResults({
      startTime: new Date(),
      totalRetries: 0,
      success: false
    })
    
    toast.info('🧪 Retry test started', {
      description: 'Now try to login. The system will automatically retry on network errors.',
      duration: 8000
    })
  }

  const stopRetryTest = () => {
    setTestResults(prev => ({
      ...prev,
      endTime: new Date()
    }))
    
    if (simulatedOffline) {
      reconnectNetwork()
    }
    
    toast.info('🧪 Retry test stopped')
  }

  const getTestDuration = () => {
    if (!testResults.startTime) return null
    const endTime = testResults.endTime || new Date()
    const duration = Math.round((endTime.getTime() - testResults.startTime.getTime()) / 1000)
    return duration
  }

  return (
    <Card className={`border-dashed ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          🧪 Network Retry Test Controls
          {testMode && (
            <Badge variant="secondary" className="ml-auto">
              Test Mode Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Network Status */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <WifiHigh className="h-4 w-4 text-success" />
            ) : (
              <WifiX className="h-4 w-4 text-destructive" />
            )}
            <span className="font-medium">
              Network Status: {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          {simulatedOffline && (
            <Badge variant="outline" className="text-warning">
              Simulated
            </Badge>
          )}
        </div>

        {/* Test Mode Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Enable Test Mode</div>
            <div className="text-sm text-muted-foreground">
              Allows simulation of network conditions
            </div>
          </div>
          <Switch 
            checked={testMode}
            onCheckedChange={setTestMode}
          />
        </div>

        {testMode && (
          <>
            <Separator />
            
            {/* Network Controls */}
            <div className="space-y-3">
              <h4 className="font-medium">Network Simulation</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={simulateNetworkDisconnection}
                  disabled={simulatedOffline}
                  className="text-destructive hover:text-destructive"
                >
                  <WifiX className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
                
                <Button
                  variant="outline"
                  onClick={reconnectNetwork}
                  disabled={!simulatedOffline}
                  className="text-success hover:text-success"
                >
                  <WifiHigh className="h-4 w-4 mr-2" />
                  Reconnect
                </Button>
              </div>
            </div>

            <Separator />
            
            {/* Test Controls */}
            <div className="space-y-3">
              <h4 className="font-medium">Retry Test</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={startRetryTest}
                  disabled={!!testResults.startTime && !testResults.endTime}
                  className="bg-primary"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Test
                </Button>
                
                <Button
                  variant="outline"
                  onClick={stopRetryTest}
                  disabled={!testResults.startTime || !!testResults.endTime}
                >
                  <Stop className="h-4 w-4 mr-2" />
                  Stop Test
                </Button>
              </div>
            </div>

            {/* Test Results */}
            {testResults.startTime && (
              <>
                <Separator />
                
                <div className="space-y-3">
                  <h4 className="font-medium">Test Results</h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Test Duration:</span>
                      <span className="font-mono">
                        {getTestDuration()}s
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <div className="flex items-center gap-1">
                        {testResults.endTime ? (
                          testResults.success ? (
                            <>
                              <CheckCircle className="h-3 w-3 text-success" />
                              <span className="text-success">Success</span>
                            </>
                          ) : (
                            <>
                              <Warning className="h-3 w-3 text-destructive" />
                              <span className="text-destructive">Failed</span>
                            </>
                          )
                        ) : (
                          <>
                            <Clock className="h-3 w-3 text-primary" />
                            <span className="text-primary">Running</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />
            
            {/* Test Instructions */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">
                🧪 How to Test Retry Mechanism
              </h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Click "Start Test" to begin monitoring</li>
                <li>Click "Disconnect" to simulate network failure</li>
                <li>Try to login - you'll see retry attempts</li>
                <li>Click "Reconnect" to restore connection</li>
                <li>Login should complete automatically</li>
              </ol>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}