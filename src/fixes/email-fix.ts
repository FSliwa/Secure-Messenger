/**
 * Email System Fix
 * Fixes email sending issues with Supabase
 */

import { supabase } from '../lib/supabase'

export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the app URL from environment or use default
    const redirectTo = `${window.location.origin}/reset-password`
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    })

    if (error) {
      console.error('Password reset error:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function sendVerificationEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email
    })

    if (error) {
      console.error('Verification email error:', error)
      return { 
        success: false, 
        error: error.message 
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to send verification email:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Check if email service is configured in Supabase
export async function checkEmailServiceStatus(): Promise<{
  configured: boolean
  provider?: string
  error?: string
}> {
  try {
    // Test by attempting to send a test email to a non-existent address
    const testEmail = `test_${Date.now()}@nonexistent.example`
    const { error } = await supabase.auth.resetPasswordForEmail(testEmail)
    
    // If we get a specific error about email not being configured
    if (error?.message?.includes('Email provider not configured')) {
      return { 
        configured: false, 
        error: 'Email provider not configured in Supabase' 
      }
    }
    
    // If we get here, email is likely configured
    return { 
      configured: true, 
      provider: 'Supabase Auth' 
    }
  } catch (error) {
    return { 
      configured: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
