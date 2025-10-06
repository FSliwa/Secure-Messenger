/**
 * Enhanced notification system for retry operations
 * Provides user-friendly feedback during network issues and retries
 */

import { toast } from 'sonner'

export interface RetryNotificationOptions {
  operation: string
  attempt: number
  maxAttempts: number
  nextRetryDelay?: number
  error?: string
  showTechnicalDetails?: boolean
}

export class RetryNotificationManager {
  private static activeToasts = new Map<string, string>()

  /**
   * Show notification when retry operation starts
   */
  static showRetryStarted(operation: string, attempt: number, maxAttempts: number): void {
    const key = `retry-${operation}`
    
    // Dismiss any existing toast for this operation
    if (this.activeToasts.has(key)) {
      toast.dismiss(this.activeToasts.get(key))
    }

    const toastId = toast.loading(`Retrying ${operation}...`, {
      description: `Attempt ${attempt} of ${maxAttempts}`,
      duration: 0, // Keep until dismissed
    }).toString()

    this.activeToasts.set(key, toastId)
  }

  /**
   * Show notification when waiting for next retry
   */
  static showRetryWaiting(
    operation: string, 
    attempt: number, 
    maxAttempts: number, 
    delaySeconds: number
  ): void {
    const key = `retry-${operation}`
    
    // Dismiss any existing toast
    if (this.activeToasts.has(key)) {
      toast.dismiss(this.activeToasts.get(key))
    }

    const toastId = toast.info(`${operation} failed, retrying...`, {
      description: `Attempting again in ${delaySeconds}s (${attempt}/${maxAttempts})`,
      duration: delaySeconds * 1000,
    }).toString()

    this.activeToasts.set(key, toastId)
  }

  /**
   * Show notification when retry operation succeeds
   */
  static showRetrySuccess(operation: string, totalAttempts: number): void {
    const key = `retry-${operation}`
    
    // Dismiss any existing toast
    if (this.activeToasts.has(key)) {
      toast.dismiss(this.activeToasts.get(key))
      this.activeToasts.delete(key)
    }

    if (totalAttempts > 1) {
      toast.success(`${operation} successful!`, {
        description: `Completed after ${totalAttempts} attempts`,
        duration: 5000,
      })
    } else {
      toast.success(`${operation} successful!`, {
        duration: 3000,
      })
    }
  }

  /**
   * Show notification when retry operation fails completely
   */
  static showRetryFailed(
    operation: string, 
    totalAttempts: number, 
    finalError?: string
  ): void {
    const key = `retry-${operation}`
    
    // Dismiss any existing toast
    if (this.activeToasts.has(key)) {
      toast.dismiss(this.activeToasts.get(key))
      this.activeToasts.delete(key)
    }

    toast.error(`${operation} failed`, {
      description: `Failed after ${totalAttempts} attempts${finalError ? `: ${finalError}` : ''}`,
      duration: 8000,
    })
  }

  /**
   * Show network connectivity change notifications
   */
  static showNetworkStatus(isOnline: boolean): void {
    if (isOnline) {
      toast.success('🌐 Connection restored', {
        description: 'Network is back online',
        duration: 3000,
      })
    } else {
      toast.error('🌐 Connection lost', {
        description: 'Network is offline - operations will retry automatically',
        duration: 0, // Keep until connection is restored
        id: 'network-status'
      })
    }
  }

  /**
   * Show waiting for network notification
   */
  static showWaitingForNetwork(operation: string): void {
    const key = `wait-network-${operation}`
    
    const toastId = toast.info(`⏳ Waiting for connection...`, {
      description: `${operation} will continue when network is restored`,
      duration: 0, // Keep until dismissed
    }).toString()

    this.activeToasts.set(key, toastId)
  }

  /**
   * Clear waiting for network notification
   */
  static clearWaitingForNetwork(operation: string): void {
    const key = `wait-network-${operation}`
    
    if (this.activeToasts.has(key)) {
      toast.dismiss(this.activeToasts.get(key))
      this.activeToasts.delete(key)
    }
  }

  /**
   * Clear all active retry notifications
   */
  static clearAll(): void {
    this.activeToasts.forEach((toastId) => {
      toast.dismiss(toastId)
    })
    this.activeToasts.clear()
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyErrorMessage(error: any): string {
    const message = error?.message?.toLowerCase() || ''
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Network connection issue'
    }
    
    if (message.includes('timeout')) {
      return 'Request timed out'
    }
    
    if (message.includes('server') || message.includes('5')) {
      return 'Server temporarily unavailable'
    }
    
    if (message.includes('authentication') || message.includes('credential')) {
      return 'Authentication failed'
    }
    
    if (message.includes('rate limit')) {
      return 'Too many requests - please wait'
    }
    
    // Default message
    return 'Connection problem'
  }
}

/**
 * Integration with the existing retry system
 */
export function enhanceRetryWithNotifications<T>(
  retryFunction: () => Promise<T>,
  operation: string,
  maxAttempts: number = 3
): () => Promise<T> {
  return async () => {
    let lastError: any
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (attempt > 1) {
          RetryNotificationManager.showRetryStarted(operation, attempt, maxAttempts)
        }
        
        const result = await retryFunction()
        
        if (attempt > 1) {
          RetryNotificationManager.showRetrySuccess(operation, attempt)
        }
        
        return result
        
      } catch (error) {
        lastError = error
        
        if (attempt < maxAttempts) {
          const delaySeconds = Math.min(Math.pow(2, attempt - 1), 10)
          RetryNotificationManager.showRetryWaiting(
            operation, 
            attempt, 
            maxAttempts, 
            delaySeconds
          )
          
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000))
        }
      }
    }
    
    RetryNotificationManager.showRetryFailed(
      operation, 
      maxAttempts,
      RetryNotificationManager.getUserFriendlyErrorMessage(lastError)
    )
    
    throw lastError
  }
}

/**
 * Preset notification configurations for common operations
 */
export const NotificationPresets = {
  LOGIN: {
    operation: 'Login',
    successMessage: 'Welcome back!',
    failureMessage: 'Login failed',
    retryMessage: 'Signing in'
  },
  
  REGISTRATION: {
    operation: 'Registration',
    successMessage: 'Account created successfully!',
    failureMessage: 'Registration failed',
    retryMessage: 'Creating account'
  },
  
  TWO_FACTOR: {
    operation: '2FA Verification',
    successMessage: '2FA verified',
    failureMessage: '2FA verification failed',
    retryMessage: 'Verifying code'
  },
  
  PROFILE_LOAD: {
    operation: 'Profile Loading',
    successMessage: 'Profile loaded',
    failureMessage: 'Failed to load profile',
    retryMessage: 'Loading profile'
  }
}

/**
 * Quick helper functions for common scenarios
 */
export const retryNotifications = {
  /**
   * Show login retry progress
   */
  login: {
    started: () => RetryNotificationManager.showRetryStarted('Login', 1, 3),
    waiting: (attempt: number, delay: number) => 
      RetryNotificationManager.showRetryWaiting('Login', attempt, 3, delay),
    success: (attempts: number) => 
      RetryNotificationManager.showRetrySuccess('Login', attempts),
    failed: (attempts: number, error?: string) => 
      RetryNotificationManager.showRetryFailed('Login', attempts, error)
  },
  
  /**
   * Show network status changes
   */
  network: {
    offline: () => RetryNotificationManager.showNetworkStatus(false),
    online: () => RetryNotificationManager.showNetworkStatus(true),
    waiting: (operation: string) => 
      RetryNotificationManager.showWaitingForNetwork(operation),
    restored: (operation: string) => 
      RetryNotificationManager.clearWaitingForNetwork(operation)
  },
  
  /**
   * Clear all notifications
   */
  clearAll: () => RetryNotificationManager.clearAll()
}