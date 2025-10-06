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
 * Check if user is currently authenticated
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
 * Validate current session is still active
 */
export const validateSession = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error || !session) {
      return false
    }

    // Check if session is expired
    const now = Date.now() / 1000
    const expiresAt = session.expires_at || 0
    
    if (now >= expiresAt) {
      // Session expired, refresh it
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError || !refreshData.session) {
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Session validation error:', error)
    return false
  }
}

/**
 * Force logout if authentication is invalid
 */
export const enforceAuthLogout = async () => {
  try {
    await supabase.auth.signOut()
    
    // Clear all local storage
    localStorage.clear()
    sessionStorage.clear()
    
    // Reload page to ensure clean state
    window.location.reload()
  } catch (error) {
    console.error('Force logout error:', error)
    // Even if logout fails, reload to ensure clean state
    window.location.reload()
  }
}

/**
 * Security middleware - validates auth state before allowing access
 */
export const requireAuthentication = async (redirectToLogin = true): Promise<boolean> => {
  const authState = await checkAuthStatus()
  
  if (!authState.isAuthenticated) {
    if (redirectToLogin) {
      // Force logout to ensure clean state
      await enforceAuthLogout()
    }
    return false
  }

  // Double-check session validity
  const sessionValid = await validateSession()
  if (!sessionValid) {
    if (redirectToLogin) {
      await enforceAuthLogout()
    }
    return false
  }

  return true
}

/**
 * Check if user has required permissions for dashboard access
 */
export const validateDashboardAccess = async (userId: string): Promise<boolean> => {
  try {
    // Verify user exists in database
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('id, status')
      .eq('id', userId)
      .single()

    if (error || !userProfile) {
      console.error('User profile not found:', error)
      return false
    }

    // Check if user account is active (not banned/suspended)
    if (userProfile.status === 'banned' || userProfile.status === 'suspended') {
      console.error('User account is not active:', userProfile.status)
      return false
    }

    return true
  } catch (error) {
    console.error('Dashboard access validation error:', error)
    return false
  }
}

/**
 * Security check that runs periodically to ensure session integrity
 */
export const startSecurityMonitoring = () => {
  // Check auth status every 5 minutes
  const interval = setInterval(async () => {
    const isValid = await requireAuthentication(false)
    
    if (!isValid) {
      console.warn('Security check failed - forcing logout')
      await enforceAuthLogout()
      clearInterval(interval)
    }
  }, 5 * 60 * 1000) // 5 minutes

  // Cleanup function
  return () => clearInterval(interval)
}