/**
 * Centralized authentication configuration
 * Including retry policies and error handling settings
 */

import { RETRY_CONFIGS, RetryConfig } from './auth-retry'

// Authentication retry configurations
export const AUTH_RETRY_CONFIG = {
  // Quick authentication operations (login, logout, token refresh)
  AUTHENTICATION: {
    ...RETRY_CONFIGS.FAST,
    maxRetries: 3,
    baseDelay: 800,
    maxDelay: 5000
  } as RetryConfig,

  // Two-factor authentication verification
  TWO_FACTOR: {
    ...RETRY_CONFIGS.FAST,
    maxRetries: 2, // Fewer retries for 2FA to prevent lockout
    baseDelay: 1000,
    maxDelay: 3000
  } as RetryConfig,

  // User profile and data operations
  PROFILE_OPERATIONS: {
    ...RETRY_CONFIGS.STANDARD,
    maxRetries: 4,
    baseDelay: 1000,
    maxDelay: 8000
  } as RetryConfig,

  // Biometric authentication
  BIOMETRIC: {
    ...RETRY_CONFIGS.FAST,
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 2000
  } as RetryConfig,

  // Password reset and recovery
  PASSWORD_RECOVERY: {
    ...RETRY_CONFIGS.STANDARD,
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 10000
  } as RetryConfig,

  // Session management
  SESSION_MANAGEMENT: {
    ...RETRY_CONFIGS.FAST,
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 4000
  } as RetryConfig
}

// Error classification for authentication
export const AUTH_ERROR_TYPES = {
  NETWORK: ['network error', 'fetch failed', 'connection error', 'timeout'],
  RATE_LIMIT: ['rate limit', 'too many requests', 'quota exceeded'],
  SERVER: ['internal server error', 'service unavailable', 'bad gateway'],
  AUTH_PERMANENT: [
    'invalid login credentials',
    'invalid email or password', 
    'user not found',
    'account disabled',
    'account locked',
    'email not verified'
  ],
  AUTH_TEMPORARY: [
    'service temporarily unavailable',
    'database connection error',
    'authentication service down'
  ],
  VALIDATION: [
    'invalid email format',
    'password too weak',
    'missing required field'
  ]
}

// Timeout configurations
export const AUTH_TIMEOUTS = {
  LOGIN: 15000, // 15 seconds
  LOGOUT: 10000, // 10 seconds
  TOKEN_REFRESH: 8000, // 8 seconds
  TWO_FACTOR: 12000, // 12 seconds
  BIOMETRIC: 20000, // 20 seconds (hardware dependent)
  PROFILE_LOAD: 12000, // 12 seconds
  PASSWORD_RESET: 20000 // 20 seconds
}

// User feedback messages
export const AUTH_MESSAGES = {
  RETRY: {
    LOGIN: 'Retrying login...',
    TWO_FACTOR: 'Retrying 2FA verification...',
    PROFILE: 'Loading profile...',
    BIOMETRIC: 'Retrying biometric authentication...'
  },
  SUCCESS: {
    LOGIN: 'Login successful!',
    LOGOUT: 'Logged out successfully',
    TWO_FACTOR: '2FA verified successfully',
    BIOMETRIC: 'Biometric authentication successful'
  },
  ERROR: {
    NETWORK: 'Connection issues. Please check your internet connection.',
    RATE_LIMIT: 'Too many attempts. Please wait before trying again.',
    AUTH_FAILED: 'Invalid credentials. Please check your email and password.',
    TWO_FACTOR_FAILED: 'Invalid 2FA code. Please try again.',
    SERVER_ERROR: 'Server is temporarily unavailable. Please try again later.',
    TIMEOUT: 'Request timed out. Please try again.',
    UNKNOWN: 'An unexpected error occurred. Please try again.'
  }
}

// Security settings
export const SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
  TRUSTED_DEVICE_DURATION: 30, // days
  TWO_FACTOR_WINDOW: 30 // seconds
}

// Feature flags for retry behavior
export const RETRY_FEATURES = {
  NETWORK_AWARE: true, // Wait for network connectivity
  EXPONENTIAL_BACKOFF: true,
  JITTER: true, // Randomize retry delays
  USER_FEEDBACK: true, // Show retry status to user
  ADAPTIVE_TIMEOUTS: true, // Adjust timeouts based on connection
  RETRY_ON_TAB_FOCUS: true // Retry when user returns to tab
}

/**
 * Get appropriate retry configuration for an operation type
 */
export function getRetryConfig(operationType: keyof typeof AUTH_RETRY_CONFIG): RetryConfig {
  return AUTH_RETRY_CONFIG[operationType] || AUTH_RETRY_CONFIG.AUTHENTICATION
}

/**
 * Classify error type for appropriate handling
 */
export function classifyAuthError(error: Error): string {
  const message = error.message.toLowerCase()
  
  for (const [category, patterns] of Object.entries(AUTH_ERROR_TYPES)) {
    if (patterns.some(pattern => message.includes(pattern))) {
      return category
    }
  }
  
  return 'UNKNOWN'
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: Error): string {
  const errorType = classifyAuthError(error)
  
  switch (errorType) {
    case 'NETWORK':
      return AUTH_MESSAGES.ERROR.NETWORK
    case 'RATE_LIMIT':
      return AUTH_MESSAGES.ERROR.RATE_LIMIT
    case 'AUTH_PERMANENT':
      return AUTH_MESSAGES.ERROR.AUTH_FAILED
    case 'SERVER':
      return AUTH_MESSAGES.ERROR.SERVER_ERROR
    case 'VALIDATION':
      return error.message // Keep original validation messages
    default:
      return AUTH_MESSAGES.ERROR.UNKNOWN
  }
}

/**
 * Determine if error should be retried
 */
export function shouldRetryError(error: Error): boolean {
  const errorType = classifyAuthError(error)
  
  // Don't retry permanent authentication errors or validation errors
  return !['AUTH_PERMANENT', 'VALIDATION'].includes(errorType)
}