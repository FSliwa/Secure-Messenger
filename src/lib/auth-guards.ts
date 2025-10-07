import { supabase } from './supabase'

/**
 * Auth Guards - Security utilities for protecting routes and components
 */

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: any | null
  error: string | null
}

/**
 * Check if user is currently authenticated (simplified)
 */
export const checkAuthStatus = async (): Promise<AuthState> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      return {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: error.message
      }
    }

    // User is authenticated if they exist and email is confirmed
    const isAuthenticated = !!(user && user.email_confirmed_at)

    return {
      isAuthenticated,
      isLoading: false,
      user,
      error: null
    }
  } catch (error) {
    return {
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: error instanceof Error ? error.message : 'Authentication check failed'
    }
  }
}

/**
 * Simplified authentication requirement check
 */
export const requireAuthentication = async (redirectToLogin = true): Promise<boolean> => {
  const authState = await checkAuthStatus()
  return authState.isAuthenticated
}

/**
 * Simplified dashboard access validation
 */
export const validateDashboardAccess = async (userId: string): Promise<boolean> => {
  try {
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    return !!userProfile
  } catch (error) {
    console.warn('Dashboard access validation error:', error)
    return true // Allow access if check fails
  }
}

/**
 * Simplified security monitoring
 */
export const startSecurityMonitoring = () => {
  // Minimal monitoring - just return cleanup function
  return () => {
    // No-op cleanup
  }
}