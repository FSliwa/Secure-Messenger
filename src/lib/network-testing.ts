/**
 * Network testing utilities for simulating connection issues
 * Use only in development to test retry mechanisms
 */

import { toast } from 'sonner'

export interface NetworkTestScenario {
  name: string
  description: string
  duration: number // in milliseconds
  implement: () => void
  restore: () => void
}

class NetworkTester {
  private static instance: NetworkTester
  private originalOnlineStatus: boolean = navigator.onLine
  private isSimulatingOffline: boolean = false
  private restoreTimeout: NodeJS.Timeout | null = null

  private constructor() {
    // Save original online status
    this.originalOnlineStatus = navigator.onLine
  }

  static getInstance(): NetworkTester {
    if (!NetworkTester.instance) {
      NetworkTester.instance = new NetworkTester()
    }
    return NetworkTester.instance
  }

  /**
   * Simulate network disconnection
   */
  simulateDisconnection(durationMs: number = 10000): void {
    if (this.isSimulatingOffline) {
      toast.warning('Network simulation already active')
      return
    }

    console.log('🔌 Simulating network disconnection for', durationMs, 'ms')
    
    this.isSimulatingOffline = true

    // Override navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    })

    // Dispatch offline event
    window.dispatchEvent(new Event('offline'))

    toast.warning('🔌 Network disconnected (simulated)', {
      description: `Reconnecting in ${Math.round(durationMs / 1000)}s`,
      duration: durationMs
    })

    // Auto-restore after duration
    this.restoreTimeout = setTimeout(() => {
      this.restoreConnection()
    }, durationMs)
  }

  /**
   * Restore network connection
   */
  restoreConnection(): void {
    if (!this.isSimulatingOffline) {
      return
    }

    console.log('🔌 Restoring network connection')

    this.isSimulatingOffline = false

    // Clear any pending timeout
    if (this.restoreTimeout) {
      clearTimeout(this.restoreTimeout)
      this.restoreTimeout = null
    }

    // Restore navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })

    // Dispatch online event
    window.dispatchEvent(new Event('online'))

    toast.success('🔌 Network reconnected', {
      duration: 3000
    })
  }

  /**
   * Check if simulation is active
   */
  isSimulating(): boolean {
    return this.isSimulatingOffline
  }

  /**
   * Get the current simulated network status
   */
  getSimulatedStatus(): boolean {
    return this.isSimulatingOffline ? false : this.originalOnlineStatus
  }
}

// Pre-defined test scenarios
export const NETWORK_TEST_SCENARIOS: NetworkTestScenario[] = [
  {
    name: 'Quick Disconnect',
    description: 'Simulate 5-second network outage',
    duration: 5000,
    implement: () => NetworkTester.getInstance().simulateDisconnection(5000),
    restore: () => NetworkTester.getInstance().restoreConnection()
  },
  {
    name: 'Medium Outage',
    description: 'Simulate 15-second network outage',
    duration: 15000,
    implement: () => NetworkTester.getInstance().simulateDisconnection(15000),
    restore: () => NetworkTester.getInstance().restoreConnection()
  },
  {
    name: 'Long Disconnect',
    description: 'Simulate 30-second network outage',
    duration: 30000,
    implement: () => NetworkTester.getInstance().simulateDisconnection(30000),
    restore: () => NetworkTester.getInstance().restoreConnection()
  },
  {
    name: 'Manual Control',
    description: 'Manually control when to reconnect',
    duration: 0,
    implement: () => NetworkTester.getInstance().simulateDisconnection(999999999), // Very long timeout
    restore: () => NetworkTester.getInstance().restoreConnection()
  }
]

/**
 * Initialize network fetch interceptor for testing
 * This intercepts fetch requests when offline simulation is active
 */
export function initializeNetworkTestInterceptor(): () => void {
  const originalFetch = window.fetch
  const tester = NetworkTester.getInstance()

  // Override fetch to simulate network failures
  window.fetch = async (...args) => {
    if (tester.isSimulating()) {
      // Simulate network error
      console.log('🚫 Intercepted fetch request during simulated offline state:', args[0])
      
      // Create a realistic network error
      const error = new Error('fetch failed')
      error.name = 'TypeError'
      
      // Add common network error properties
      Object.assign(error, {
        code: 'NETWORK_ERROR',
        errno: 'ENOTFOUND',
        syscall: 'getaddrinfo'
      })
      
      throw error
    }

    // Normal fetch when online
    return originalFetch(...args)
  }

  // Return cleanup function
  return () => {
    window.fetch = originalFetch
    tester.restoreConnection()
  }
}

/**
 * Test retry mechanism with different scenarios
 */
export async function testRetryMechanism(
  scenarioName: string,
  loginFunction: () => Promise<any>
): Promise<{
  success: boolean
  retryCount: number
  totalTime: number
  error?: string
}> {
  const scenario = NETWORK_TEST_SCENARIOS.find(s => s.name === scenarioName)
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioName}`)
  }

  console.log(`🧪 Starting retry test with scenario: ${scenario.name}`)
  
  const startTime = Date.now()
  let retryCount = 0
  let success = false
  let error: string | undefined

  try {
    // Start the network simulation
    scenario.implement()
    
    // Give a moment for the simulation to take effect
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Attempt login
    await loginFunction()
    success = true
    
  } catch (err: any) {
    error = err.message
    console.error('🧪 Test login failed:', err)
  } finally {
    // Always restore network
    scenario.restore()
  }

  const totalTime = Date.now() - startTime

  const result = {
    success,
    retryCount,
    totalTime,
    error
  }

  console.log('🧪 Test results:', result)
  return result
}

// Export singleton instance
export const networkTester = NetworkTester.getInstance()

/**
 * Development helper functions
 */
export const devTools = {
  /**
   * Quick disconnect for testing
   */
  disconnect: (seconds: number = 10) => {
    networkTester.simulateDisconnection(seconds * 1000)
  },
  
  /**
   * Restore connection immediately
   */
  reconnect: () => {
    networkTester.restoreConnection()
  },
  
  /**
   * Check if simulation is active
   */
  isOffline: () => {
    return networkTester.isSimulating()
  },
  
  /**
   * Run all test scenarios
   */
  runAllTests: async (loginFunction: () => Promise<any>) => {
    const results: Array<{
      scenario: string
      success: boolean
      retryCount: number
      totalTime: number
      error?: string
    }> = []
    
    for (const scenario of NETWORK_TEST_SCENARIOS.slice(0, -1)) { // Skip manual control
      console.log(`🧪 Testing scenario: ${scenario.name}`)
      const result = await testRetryMechanism(scenario.name, loginFunction)
      results.push({ scenario: scenario.name, ...result })
      
      // Wait between tests
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    return results
  }
}

// Make dev tools available globally in development
if (process.env.NODE_ENV === 'development') {
  (window as any).networkTest = devTools
  console.log('🧪 Network testing tools available as window.networkTest')
}