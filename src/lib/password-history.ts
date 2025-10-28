// Password History Management
import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

export interface PasswordHistoryEntry {
  id: string;
  user_id: string;
  password_hash: string;
  created_at: string;
  expires_at?: string;
}

/**
 * Save password to history
 */
export async function savePasswordHistory(
  userId: string, 
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Hash the password before storing
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    const { error } = await supabase
      .from('password_history')
      .insert({
        user_id: userId,
        password_hash: passwordHash
      });

    if (error) {
      console.error('Failed to save password history:', error);
      return { success: false, error: error.message };
    }

    // Keep only the last 10 passwords for each user
    await cleanupOldPasswords(userId);

    return { success: true };
  } catch (error) {
    console.error('Password history save error:', error);
    return { success: false, error: 'Failed to save password history' };
  }
}

/**
 * Check if password was used before
 */
export async function isPasswordReused(
  userId: string, 
  newPassword: string
): Promise<{ isReused: boolean; error?: string }> {
  try {
    const { data: history, error } = await supabase
      .from('password_history')
      .select('password_hash')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10); // Check last 10 passwords

    if (error) {
      console.error('Failed to check password history:', error);
      return { isReused: false, error: error.message };
    }

    if (!history || history.length === 0) {
      return { isReused: false };
    }

    // Check if new password matches any of the previous passwords
    for (const entry of history) {
      const matches = await bcrypt.compare(newPassword, entry.password_hash);
      if (matches) {
        return { isReused: true };
      }
    }

    return { isReused: false };
  } catch (error) {
    console.error('Password reuse check error:', error);
    return { isReused: false, error: 'Failed to check password reuse' };
  }
}

/**
 * Get password history count for user
 */
export async function getPasswordHistoryCount(userId: string): Promise<{
  count: number;
  error?: string;
}> {
  try {
    const { count, error } = await supabase
      .from('password_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to get password history count:', error);
      return { count: 0, error: error.message };
    }

    return { count: count || 0 };
  } catch (error) {
    console.error('Password history count error:', error);
    return { count: 0, error: 'Failed to get password history count' };
  }
}

/**
 * Clean up old passwords (keep only last 10)
 */
async function cleanupOldPasswords(userId: string): Promise<void> {
  try {
    // Get all passwords for user, ordered by creation date
    const { data: allPasswords, error: fetchError } = await supabase
      .from('password_history')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Failed to fetch password history for cleanup:', fetchError);
      return;
    }

    if (!allPasswords || allPasswords.length <= 10) {
      return; // No cleanup needed
    }

    // Keep only the first 10 (most recent), delete the rest
    const passwordsToDelete = allPasswords.slice(10);
    const idsToDelete = passwordsToDelete.map(p => p.id);

    const { error: deleteError } = await supabase
      .from('password_history')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('Failed to cleanup old passwords:', deleteError);
    }
  } catch (error) {
    console.error('Password cleanup error:', error);
  }
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  if (password.length >= 12) {
    score += 1;
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain uppercase letters');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain numbers');
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Password must contain special characters');
  }

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Avoid repeating characters');
  }

  if (/123|abc|qwe|asd|zxc/i.test(password)) {
    score -= 1;
    feedback.push('Avoid common sequences');
  }

  const isValid = score >= 4 && feedback.length === 0;

  return {
    isValid,
    score: Math.max(0, Math.min(5, score)),
    feedback
  };
}

/**
 * Clear password history for user (for GDPR compliance)
 */
export async function clearPasswordHistory(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from('password_history')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to clear password history:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Password history clear error:', error);
    return { success: false, error: 'Failed to clear password history' };
  }
}