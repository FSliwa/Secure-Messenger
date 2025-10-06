/**
 * Automatic retry mechanism for failed login attempts
 * Implements exponential backoff and smart retry logic
 */

import { toast } from 'sonner'

export interface RetryConfig {
  maxRetries: number
  baseDelay: number // in milliseconds
  maxDelay: number // in milliseconds
  exponentialFactor: number
  jitterRange: number // 0-1, adds randomness to prevent thundering herd
}

export interface RetryAttempt {
  attempt: number
  delay: number
  error: Error
  timestamp: number
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: RetryAttempt[]
  totalTime: number
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds max
  exponentialFactor: 2,
  jitterRange: 0.3 // 30% jitter
}

// Retry-specific error types
export class RetryableError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message)
    this.name = 'RetryableError'
  }
}

export class NonRetryableError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message)
    this.name = 'NonRetryableError'
  }
}

/**
 * Determines if an error is retryable based on its type and message
 */
export function isRetryableError(error: any): boolean {
  if (error instanceof NonRetryableError) {
    return false
  }

  if (error instanceof RetryableError) {
    return true
  }

  // Network-related errors are generally retryable
  const networkErrors = [
    'network error',
    'fetch error',
    'connection error',
    'timeout',
    'fetch failed',
    'network request failed',
    'connection refused',
    'connection reset',
    'dns lookup failed',
    'service unavailable',
    'server unavailable',
    'internal server error',
    'bad gateway',
    'gateway timeout'
  ]

  const errorMessage = error?.message?.toLowerCase() || ''
  const isNetworkError = networkErrors.some(netError => 
    errorMessage.includes(netError)
  )

  // Authentication-specific retryable errors
  const authRetryableErrors = [
    'rate limit exceeded',
    'too many requests',
    'service temporarily unavailable',
    'database connection error',
    'connection pool exhausted'
  ]

  const isAuthRetryable = authRetryableErrors.some(authError => 
    errorMessage.includes(authError)
  )

  // Non-retryable authentication errors
  const nonRetryableAuthErrors = [
    'invalid login credentials',
    'invalid email or password',
    'user not found',
    'incorrect password',
    'account disabled',
    'account locked',
    'email not verified',
    'invalid email format',
    'password too weak',
    'email already registered'
  ]

  const isNonRetryableAuth = nonRetryableAuthErrors.some(authError => 
    errorMessage.includes(authError)
  )

  if (isNonRetryableAuth) {
    return false
  }

  return isNetworkError || isAuthRetryable
}

/**
 * Calculates the delay for the next retry attempt with exponential backoff and jitter
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.exponentialFactor, attempt - 1)
  const jitter = Math.random() * config.jitterRange * exponentialDelay
  const delayWithJitter = exponentialDelay + jitter
  
  return Math.min(delayWithJitter, config.maxDelay)
}

/**
 * Sleeps for the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Executes an async function with automatic retry logic
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'Operation'
): Promise<RetryResult<T>> {
  const startTime = Date.now()
  const attempts: RetryAttempt[] = []
  let lastError: Error

  console.log(`🔄 Starting ${operationName} with retry mechanism (max ${config.maxRetries} retries)`)

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      console.log(`🎯 ${operationName} attempt ${attempt}/${config.maxRetries + 1}`)
      
      const result = await operation()
      
      const totalTime = Date.now() - startTime
      console.log(`✅ ${operationName} succeeded on attempt ${attempt} (${totalTime}ms total)`)
      
      // Show success message if we had previous failures
      if (attempts.length > 0) {
        toast.success(`${operationName} succeeded after ${attempt} attempts`)
      }

      return {
        success: true,
        data: result,
        attempts,
        totalTime
      }
      
    } catch (error: any) {
      lastError = error
      const attemptTime = Date.now()
      
      console.log(`❌ ${operationName} attempt ${attempt} failed:`, error.message)
      
      // Check if we should retry this error
      if (!isRetryableError(error)) {
        console.log(`🚫 ${operationName} failed with non-retryable error:`, error.message)
        
        attempts.push({
          attempt,
          delay: 0,
          error,
          timestamp: attemptTime
        })
        
        return {
          success: false,
          error,
          attempts,
          totalTime: Date.now() - startTime
        }
      }

      // Calculate delay for next attempt
      const delay = attempt <= config.maxRetries ? calculateRetryDelay(attempt, config) : 0
      
      attempts.push({
        attempt,
        delay,
        error,
        timestamp: attemptTime
      })

      // Check if we've exhausted our retries
      if (attempt > config.maxRetries) {
        console.log(`🔚 ${operationName} failed after ${config.maxRetries + 1} attempts`)
        
        toast.error(`${operationName} failed after ${config.maxRetries + 1} attempts`, {
          description: 'Please check your connection and try again'
        })
        
        return {
          success: false,
          error: lastError,
          attempts,
          totalTime: Date.now() - startTime
        }
      }

      // Wait before retrying
      if (delay > 0) {
        console.log(`⏳ Waiting ${Math.round(delay)}ms before retry...`)
        
        // Show retry notification to user
        toast.info(`${operationName} failed, retrying in ${Math.round(delay / 1000)}s...`, {
          duration: delay,
          description: `Attempt ${attempt + 1}/${config.maxRetries + 1}`
        })
        
        await sleep(delay)
      }
    }
  }

  // This shouldn't be reached, but handle edge case
  return {
    success: false,
    error: lastError!,
    attempts,
    totalTime: Date.now() - startTime
  }
}

/**
 * Enhanced login function with automatic retry mechanism
 */
export async function loginWithRetry(
  signInFunction: () => Promise<any>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<any>> {
  const retryConfig: RetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...config
  }

  return executeWithRetry(
    signInFunction,
    retryConfig,
    'Login'
  )
}

/**
 * Creates a retry-aware wrapper for any async authentication operation
 */
export function createRetryWrapper<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  operationName: string,
  config: Partial<RetryConfig> = {}
) {
  return async (...args: T): Promise<RetryResult<R>> => {
    const retryConfig: RetryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config
    }

    return executeWithRetry(
      () => operation(...args),
      retryConfig,
      operationName
    )
  }
}

/**
 * Retry configurations for different types of operations
 */
export const RETRY_CONFIGS = {
  // Quick operations (login, logout)
  FAST: {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 5000,
    exponentialFactor: 2,
    jitterRange: 0.2
  } as RetryConfig,
  
  // Standard operations (data fetching)
  STANDARD: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialFactor: 2,
    jitterRange: 0.3
  } as RetryConfig,
  
  // Slow operations (encryption, complex operations)
  SLOW: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    exponentialFactor: 1.5,
    jitterRange: 0.4
  } as RetryConfig,
  
  // Critical operations (security-related)
  CRITICAL: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 15000,
    exponentialFactor: 1.8,
    jitterRange: 0.25
  } as RetryConfig
}

/**
 * Network status monitoring for smarter retries
 */
export class NetworkStatusMonitor {
  private static instance: NetworkStatusMonitor
  private isOnline: boolean = navigator.onLine
  private listeners: Set<(online: boolean) => void> = new Set()

  private constructor() {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.notifyListeners()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
      this.notifyListeners()
    })
  }

  static getInstance(): NetworkStatusMonitor {
    if (!NetworkStatusMonitor.instance) {
      NetworkStatusMonitor.instance = new NetworkStatusMonitor()
    }
    return NetworkStatusMonitor.instance
  }

  getStatus(): boolean {
    return this.isOnline
  }

  onStatusChange(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.isOnline))
  }
}

/**
 * Smart retry that waits for network connectivity
 */
export async function executeWithNetworkAwareRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'Operation'
): Promise<RetryResult<T>> {
  const networkMonitor = NetworkStatusMonitor.getInstance()
  
  // If offline, wait for connection before starting
  if (!networkMonitor.getStatus()) {
    console.log(`📱 ${operationName} waiting for network connection...`)
    toast.info('Waiting for network connection...', {
      duration: 0 // Keep until dismissed
    })
    
    await new Promise<void>((resolve) => {
      const unsubscribe = networkMonitor.onStatusChange((online) => {
        if (online) {
          toast.dismiss()
          toast.success('Network connection restored')
          unsubscribe()
          resolve()
        }
      })
    })
  }

  return executeWithRetry(operation, config, operationName)
}