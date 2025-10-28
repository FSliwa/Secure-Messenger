// Security Audit Log Management
import { supabase } from './supabase';

export interface SecurityAuditEvent {
  id: string;
  user_id: string | null;
  event_type: SecurityEventType;
  event_data: any;
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
  severity: SecuritySeverity;
  created_at: string;
}

export type SecurityEventType = 
  | 'login_success'
  | 'login_failure'
  | 'account_locked'
  | 'account_unlocked'
  | 'password_changed'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'device_trusted'
  | 'device_untrusted'
  | 'biometric_enrolled'
  | 'biometric_removed'
  | 'conversation_password_set'
  | 'conversation_unlocked'
  | 'suspicious_activity';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEventMetadata {
  ip_address?: string;
  user_agent?: string;
  device_fingerprint?: string;
  location?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
}

/**
 * Log a security event
 */
export async function logSecurityEvent(
  userId: string | null,
  eventType: SecurityEventType,
  eventData?: any,
  severity: SecuritySeverity = 'medium',
  metadata?: SecurityEventMetadata
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('security_audit_log')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData || {},
        severity,
        ip_address: metadata?.ip_address,
        user_agent: metadata?.user_agent,
        device_fingerprint: metadata?.device_fingerprint
      });

    if (error) {
      console.error('Failed to log security event:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Security event logging error:', error);
    return { success: false, error: 'Failed to log security event' };
  }
}

/**
 * Get security audit log for a user
 */
export async function getUserSecurityLog(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    eventTypes?: SecurityEventType[];
    severities?: SecuritySeverity[];
    startDate?: Date;
    endDate?: Date;
  }
): Promise<{
  events: SecurityAuditEvent[];
  total: number;
  error?: string;
}> {
  try {
    let query = supabase
      .from('security_audit_log')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (options?.eventTypes && options.eventTypes.length > 0) {
      query = query.in('event_type', options.eventTypes);
    }

    if (options?.severities && options.severities.length > 0) {
      query = query.in('severity', options.severities);
    }

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data: events, count, error } = await query;

    if (error) {
      console.error('Failed to get security log:', error);
      return { events: [], total: 0, error: error.message };
    }

    return { 
      events: events || [], 
      total: count || 0 
    };
  } catch (error) {
    console.error('Security log retrieval error:', error);
    return { events: [], total: 0, error: 'Failed to get security log' };
  }
}

/**
 * Get system-wide security events (admin only)
 */
export async function getSystemSecurityLog(
  options?: {
    limit?: number;
    offset?: number;
    eventTypes?: SecurityEventType[];
    severities?: SecuritySeverity[];
    startDate?: Date;
    endDate?: Date;
  }
): Promise<{
  events: SecurityAuditEvent[];
  total: number;
  error?: string;
}> {
  try {
    let query = supabase
      .from('security_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (options?.eventTypes && options.eventTypes.length > 0) {
      query = query.in('event_type', options.eventTypes);
    }

    if (options?.severities && options.severities.length > 0) {
      query = query.in('severity', options.severities);
    }

    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }

    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data: events, count, error } = await query;

    if (error) {
      console.error('Failed to get system security log:', error);
      return { events: [], total: 0, error: error.message };
    }

    return { 
      events: events || [], 
      total: count || 0 
    };
  } catch (error) {
    console.error('System security log retrieval error:', error);
    return { events: [], total: 0, error: 'Failed to get system security log' };
  }
}

/**
 * Get security event statistics for a user
 */
export async function getUserSecurityStats(userId: string): Promise<{
  stats: {
    totalEvents: number;
    criticalEvents: number;
    highEvents: number;
    mediumEvents: number;
    lowEvents: number;
    recentFailedLogins: number;
    lastLoginSuccess?: Date;
    lastLoginFailure?: Date;
  };
  error?: string;
}> {
  try {
    // Get overall counts by severity
    const { data: severityCounts, error: severityError } = await supabase
      .from('security_audit_log')
      .select('severity')
      .eq('user_id', userId);

    if (severityError) {
      throw severityError;
    }

    // Count events by severity
    const stats = {
      totalEvents: severityCounts?.length || 0,
      criticalEvents: 0,
      highEvents: 0,
      mediumEvents: 0,
      lowEvents: 0,
      recentFailedLogins: 0,
      lastLoginSuccess: undefined as Date | undefined,
      lastLoginFailure: undefined as Date | undefined
    };

    severityCounts?.forEach(event => {
      switch (event.severity) {
        case 'critical':
          stats.criticalEvents++;
          break;
        case 'high':
          stats.highEvents++;
          break;
        case 'medium':
          stats.mediumEvents++;
          break;
        case 'low':
          stats.lowEvents++;
          break;
      }
    });

    // Get recent failed logins (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: recentFailures, error: failuresError } = await supabase
      .from('security_audit_log')
      .select('created_at')
      .eq('user_id', userId)
      .eq('event_type', 'login_failure')
      .gte('created_at', oneDayAgo.toISOString());

    if (!failuresError) {
      stats.recentFailedLogins = recentFailures?.length || 0;
    }

    // Get last login success
    const { data: lastSuccess, error: successError } = await supabase
      .from('security_audit_log')
      .select('created_at')
      .eq('user_id', userId)
      .eq('event_type', 'login_success')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!successError && lastSuccess) {
      stats.lastLoginSuccess = new Date(lastSuccess.created_at);
    }

    // Get last login failure
    const { data: lastFailure, error: failureError } = await supabase
      .from('security_audit_log')
      .select('created_at')
      .eq('user_id', userId)
      .eq('event_type', 'login_failure')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!failureError && lastFailure) {
      stats.lastLoginFailure = new Date(lastFailure.created_at);
    }

    return { stats };
  } catch (error) {
    console.error('Security stats error:', error);
    return { 
      stats: {
        totalEvents: 0,
        criticalEvents: 0,
        highEvents: 0,
        mediumEvents: 0,
        lowEvents: 0,
        recentFailedLogins: 0
      },
      error: 'Failed to get security statistics' 
    };
  }
}

/**
 * Check for suspicious activity patterns
 */
export async function checkSuspiciousActivity(
  userId: string,
  currentMetadata: SecurityEventMetadata
): Promise<{
  isSuspicious: boolean;
  reasons: string[];
}> {
  try {
    const reasons: string[] = [];
    
    // Check for multiple login locations in short time
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const { data: recentLogins, error } = await supabase
      .from('security_audit_log')
      .select('event_data, ip_address')
      .eq('user_id', userId)
      .eq('event_type', 'login_success')
      .gte('created_at', oneHourAgo.toISOString());

    if (!error && recentLogins) {
      const uniqueIPs = new Set(recentLogins.map(e => e.ip_address).filter(Boolean));
      if (uniqueIPs.size > 2) {
        reasons.push('Multiple login locations detected');
      }
    }

    // Check for rapid failed attempts
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const { data: recentFailures, error: failureError } = await supabase
      .from('security_audit_log')
      .select('created_at')
      .eq('user_id', userId)
      .eq('event_type', 'login_failure')
      .gte('created_at', fiveMinutesAgo.toISOString());

    if (!failureError && recentFailures && recentFailures.length > 3) {
      reasons.push('Rapid failed login attempts');
    }

    const isSuspicious = reasons.length > 0;

    // Log suspicious activity if detected
    if (isSuspicious) {
      await logSecurityEvent(
        userId,
        'suspicious_activity',
        { reasons, metadata: currentMetadata },
        'high',
        currentMetadata
      );
    }

    return { isSuspicious, reasons };
  } catch (error) {
    console.error('Suspicious activity check error:', error);
    return { isSuspicious: false, reasons: [] };
  }
}

export default {
  logSecurityEvent,
  getUserSecurityLog,
  getSystemSecurityLog,
  getUserSecurityStats,
  checkSuspiciousActivity
};
