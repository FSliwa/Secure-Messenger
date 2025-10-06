import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { 
  executeWithNetworkAwareRetry, 
  RetryResult,
  RetryConfig
} from '@/lib/auth-retry'
import { 
  getRetryConfig,
  getErrorMessage,
  shouldRetryError
} from '@/lib/auth-config'

export interface AuthRetryState {
  isLoading: boolean
  isRetrying: boolean
  retryCount: number
  lastError: string | null
  hasError: boolean
}

export interface UseAuthRetryOptions {
  operationType?: 'AUTHENTICATION' | 'TWO_FACTOR' | 'PROFILE_OPERATIONS' | 'BIOMETRIC' | 'PASSWORD_RECOVERY' | 'SESSION_MANAGEMENT'
  showSuccessToast?: boolean
  showErrorToast?: boolean
  resetOnSuccess?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
  onRetry?: (attempt: number) => void
}

export function useAuthRetry(options: UseAuthRetryOptions = {}) {
  const {
    operationType = 'AUTHENTICATION',
    showSuccessToast = true,
    showErrorToast = true,
    resetOnSuccess = true,
    onSuccess,
    onError,
    onRetry
  } = options

  const [state, setState] = useState<AuthRetryState>({
    isLoading: false,
    isRetrying: false,
    retryCount: 0,
    lastError: null,
    hasError: false
  })

  const updateState = useCallback((updates: Partial<AuthRetryState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
      lastError: null,
      hasError: false
    })
  }, [])

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string = 'Operation'
  ): Promise<T | null> => {
    try {
      // Reset state at start
      updateState({
        isLoading: true,
        isRetrying: false,
        retryCount: 0,
        lastError: null,
        hasError: false
      })

      // Get retry configuration for this operation type
      const retryConfig = getRetryConfig(operationType)

      // Track retry attempts
      let currentAttemptCount = 0
      const wrappedOperation = async () => {
        const result = await operation()
        return result
      }

      // Execute with retry mechanism
      const result: RetryResult<T> = await executeWithNetworkAwareRetry(
        wrappedOperation,
        retryConfig,
        operationName
      )

      // Update state based on result
      if (result.success && result.data !== undefined) {
        // Success
        if (resetOnSuccess) {
          resetState()
        } else {
          updateState({
            isLoading: false,
            isRetrying: false,
            hasError: false
          })
        }

        // Show success message if retries were needed
        if (showSuccessToast && result.attempts.length > 0) {
          toast.success(`${operationName} successful after ${result.attempts.length + 1} attempts`)
        }

        // Call success callback
        onSuccess?.(result.data)
        
        return result.data
      } else {
        // Failure after all retries
        const errorMessage = result.error?.message || `${operationName} failed`
        const userMessage = getErrorMessage(result.error!)
        
        updateState({
          isLoading: false,
          isRetrying: false,
          retryCount: result.attempts.length,
          lastError: errorMessage,
          hasError: true
        })

        // Show error toast
        if (showErrorToast) {
          toast.error(userMessage, {
            description: shouldRetryError(result.error!) 
              ? `Failed after ${result.attempts.length} attempts`
              : 'Please check your information and try again'
          })
        }

        // Call error callback
        onError?.(result.error!)
        
        return null
      }
    } catch (error: any) {
      // Unexpected error
      const errorMessage = error.message || `${operationName} failed unexpectedly`
      const userMessage = getErrorMessage(error)
      
      updateState({
        isLoading: false,
        isRetrying: false,
        retryCount: 0,
        lastError: errorMessage,
        hasError: true
      })

      if (showErrorToast) {
        toast.error(userMessage)
      }

      onError?.(error)
      
      return null
    }
  }, [operationType, showSuccessToast, showErrorToast, resetOnSuccess, onSuccess, onError, onRetry, updateState, resetState])

  // Create a manual retry function
  const retry = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string = 'Operation'
  ): Promise<T | null> => {
    if (state.isLoading || state.isRetrying) {
      return null
    }

    return execute(operation, operationName)
  }, [execute, state.isLoading, state.isRetrying])

  return {
    ...state,
    execute,
    retry,
    reset: resetState
  }
}

// Convenience hooks for specific operations
export function useLoginRetry(options: Omit<UseAuthRetryOptions, 'operationType'> = {}) {
  return useAuthRetry({ ...options, operationType: 'AUTHENTICATION' })
}

export function use2FARetry(options: Omit<UseAuthRetryOptions, 'operationType'> = {}) {
  return useAuthRetry({ ...options, operationType: 'TWO_FACTOR' })
}

export function useProfileRetry(options: Omit<UseAuthRetryOptions, 'operationType'> = {}) {
  return useAuthRetry({ ...options, operationType: 'PROFILE_OPERATIONS' })
}

export function useBiometricRetry(options: Omit<UseAuthRetryOptions, 'operationType'> = {}) {
  return useAuthRetry({ ...options, operationType: 'BIOMETRIC' })
}

// Hook for handling network-aware operations
export function useNetworkAwareAuth() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)

  // Listen for network changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        toast.success('Connection restored')
        setWasOffline(false)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      toast.warning('Connection lost - operations will retry automatically when reconnected')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  return {
    isOnline,
    wasOffline
  }
}