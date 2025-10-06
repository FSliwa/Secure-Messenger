import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Play, 
  Stop, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowClockwise,
  TestTube,
  NetworkX
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { 
  NETWORK_TEST_SCENARIOS, 
  testRetryMechanism, 
  networkTester 
} from '@/lib/network-testing'

interface TestResult {
  scenario: string
  success: boolean
  retryCount: number
  totalTime: number
  error?: string
  timestamp: Date
}

interface RetryTestRunnerProps {
  onTestComplete?: (results: TestResult[]) => void
  className?: string
}

export function RetryTestRunner({ onTestComplete, className = '' }: RetryTestRunnerProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<TestResult[]>([])
  const [testStart, setTestStart] = useState<Date | null>(null)

  const runRetryTests = async () => {
    if (isRunning) return

    setIsRunning(true)
    setCurrentTest(null)
    setProgress(0)
    setResults([])
    setTestStart(new Date())

    toast.info('🧪 Starting comprehensive retry tests', {
      description: 'This will test login behavior under different network conditions',
      duration: 5000
    })

    // Test scenarios (excluding manual control)
    const scenarios = NETWORK_TEST_SCENARIOS.slice(0, -1)
    const newResults: TestResult[] = []

    try {
      for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i]
        setCurrentTest(scenario.name)
        setProgress((i / scenarios.length) * 100)

        toast.info(`Testing: ${scenario.name}`, {
          description: scenario.description,
          duration: 3000
        })

        try {
          // Create a mock login function that will fail during network outages
          const mockLogin = async () => {
            // Simulate network request
            const response = await fetch('/api/test-endpoint', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ test: true })
            })
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`)
            }
            
            return response.json()
          }

          const result = await testRetryMechanism(scenario.name, mockLogin)
          
          const testResult: TestResult = {
            scenario: scenario.name,
            success: result.success,
            retryCount: result.retryCount,
            totalTime: result.totalTime,
            error: result.error,
            timestamp: new Date()
          }

          newResults.push(testResult)
          setResults([...newResults])

          if (result.success) {
            toast.success(`✅ ${scenario.name} passed`)
          } else {
            toast.error(`❌ ${scenario.name} failed: ${result.error}`)
          }

        } catch (error: any) {
          const testResult: TestResult = {
            scenario: scenario.name,
            success: false,
            retryCount: 0,
            totalTime: 0,
            error: error.message,
            timestamp: new Date()
          }

          newResults.push(testResult)
          setResults([...newResults])
          
          toast.error(`❌ ${scenario.name} error: ${error.message}`)
        }

        // Wait between tests
        if (i < scenarios.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      setProgress(100)
      
      const passedTests = newResults.filter(r => r.success).length
      const totalTests = newResults.length
      
      toast.success(`🧪 Tests complete: ${passedTests}/${totalTests} passed`, {
        duration: 8000
      })

      onTestComplete?.(newResults)

    } catch (error: any) {
      toast.error(`Test runner error: ${error.message}`)
    } finally {
      setIsRunning(false)
      setCurrentTest(null)
      // Ensure network is restored
      networkTester.restoreConnection()
    }
  }

  const stopTests = () => {
    setIsRunning(false)
    setCurrentTest(null)
    networkTester.restoreConnection()
    toast.info('Tests stopped')
  }

  const clearResults = () => {
    setResults([])
    setProgress(0)
    setTestStart(null)
  }

  const getTotalTestTime = () => {
    if (!testStart) return 0
    const endTime = isRunning ? new Date() : (results[results.length - 1]?.timestamp || new Date())
    return Math.round((endTime.getTime() - testStart.getTime()) / 1000)
  }

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Retry Mechanism Test Runner
          {isRunning && (
            <Badge variant="secondary" className="ml-auto animate-pulse">
              Running
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Test Controls */}
        <div className="flex gap-2">
          <Button
            onClick={runRetryTests}
            disabled={isRunning}
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-2" />
            Run All Tests
          </Button>
          
          <Button
            onClick={stopTests}
            disabled={!isRunning}
            variant="outline"
          >
            <Stop className="h-4 w-4 mr-2" />
            Stop
          </Button>
          
          <Button
            onClick={clearResults}
            disabled={isRunning || results.length === 0}
            variant="outline"
          >
            Clear
          </Button>
        </div>

        {/* Progress */}
        {(isRunning || progress > 0) && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {currentTest && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ArrowClockwise className="h-3 w-3 animate-spin" />
                <span>Testing: {currentTest}</span>
              </div>
            )}
          </div>
        )}

        {/* Test Summary */}
        {results.length > 0 && (
          <>
            <Separator />
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-success">
                  {results.filter(r => r.success).length}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-destructive">
                  {results.filter(r => !r.success).length}  
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold">
                  {getTotalTestTime()}s
                </div>
                <div className="text-sm text-muted-foreground">Total Time</div>
              </div>
            </div>
          </>
        )}

        {/* Test Results */}
        {results.length > 0 && (
          <>
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-medium">Test Results</h4>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      
                      <div>
                        <div className="font-medium text-sm">
                          {result.scenario}
                        </div>
                        {result.error && (
                          <div className="text-xs text-muted-foreground">
                            {result.error}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{result.totalTime}ms</div>
                      {result.retryCount > 0 && (
                        <div>{result.retryCount} retries</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Test Scenarios Info */}
        <Separator />
        
        <div className="space-y-2">
          <h4 className="font-medium">Available Test Scenarios</h4>
          
          <div className="grid gap-2">
            {NETWORK_TEST_SCENARIOS.slice(0, -1).map((scenario, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2 bg-muted/20 rounded text-sm"
              >
                <div>
                  <div className="font-medium">{scenario.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {scenario.description}
                  </div>
                </div>
                
                <div className="text-muted-foreground">
                  {Math.round(scenario.duration / 1000)}s
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}