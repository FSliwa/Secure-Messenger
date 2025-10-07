// Trusted Devices Management
import { supabase } from './supabase';

export interface TrustedDevice {
  id: string;
  user_id: string;
  device_fingerprint: string;
  device_name: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip_address: string;
  location: string;
  is_trusted: boolean;
  created_at: string;
  last_used_at: string;
}

export interface DeviceInfo {
  fingerprint: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  userAgent: string;
}

/**
 * Generate device fingerprint based on browser characteristics
 */
export function generateDeviceFingerprint(): DeviceInfo {
  const navigator = window.navigator;
  const screen = window.screen;
  
  // Create a unique fingerprint based on device characteristics
  const fingerprint = btoa([
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.platform
  ].join('|'));

  // Detect device type
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTablet = /iPad/i.test(navigator.userAgent) || (isMobile && screen.width > 800);
  
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (isTablet) deviceType = 'tablet';
  else if (isMobile) deviceType = 'mobile';

  // Extract browser info
  let browser = 'Unknown';
  if (navigator.userAgent.includes('Chrome')) browser = 'Chrome';
  else if (navigator.userAgent.includes('Firefox')) browser = 'Firefox';
  else if (navigator.userAgent.includes('Safari')) browser = 'Safari';
  else if (navigator.userAgent.includes('Edge')) browser = 'Edge';

  // Extract OS info
  let os = 'Unknown';
  if (navigator.userAgent.includes('Windows')) os = 'Windows';
  else if (navigator.userAgent.includes('Mac')) os = 'macOS';
  else if (navigator.userAgent.includes('Linux')) os = 'Linux';
  else if (navigator.userAgent.includes('Android')) os = 'Android';
  else if (navigator.userAgent.includes('iOS')) os = 'iOS';

  // Generate device name
  const deviceName = `${browser} on ${os} ${deviceType}`;

  return {
    fingerprint,
    name: deviceName,
    type: deviceType,
    browser,
    os,
    userAgent: navigator.userAgent
  };
}

/**
 * Save trusted device
 */
export async function saveTrustedDevice(
  userId: string, 
  deviceInfo: DeviceInfo,
  location?: string
): Promise<{ success: boolean; device?: TrustedDevice; error?: string }> {
  try {
    // Get user's IP address (simplified - in production use a proper service)
    const ipAddress = await getUserIpAddress();
    
    const deviceData = {
      user_id: userId,
      device_fingerprint: deviceInfo.fingerprint,
      device_name: deviceInfo.name,
      device_type: deviceInfo.type,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      ip_address: ipAddress,
      location: location || 'Unknown',
      is_trusted: true,
      last_used_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('trusted_devices')
      .insert(deviceData)
      .select()
      .single();

    if (error) {
      console.error('Failed to save trusted device:', error);
      return { success: false, error: error.message };
    }

    return { success: true, device: data };
  } catch (error) {
    console.error('Trusted device save error:', error);
    return { success: false, error: 'Failed to save trusted device' };
  }
}

/**
 * Check if device is trusted
 */
export async function isDeviceTrusted(
  userId: string, 
  deviceFingerprint: string
): Promise<{ isTrusted: boolean; device?: TrustedDevice; error?: string }> {
  try {
    const { data: device, error } = await supabase
      .from('trusted_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('device_fingerprint', deviceFingerprint)
      .eq('is_trusted', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return { isTrusted: false };
      }
      console.error('Failed to check trusted device:', error);
      return { isTrusted: false, error: error.message };
    }

    // Update last used timestamp
    await supabase
      .from('trusted_devices')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', device.id);

    return { isTrusted: true, device };
  } catch (error) {
    console.error('Trusted device check error:', error);
    return { isTrusted: false, error: 'Failed to check trusted device' };
  }
}

/**
 * Get all trusted devices for user
 */
export async function getTrustedDevices(userId: string): Promise<{
  devices: TrustedDevice[];
  error?: string;
}> {
  try {
    const { data: devices, error } = await supabase
      .from('trusted_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('is_trusted', true)
      .order('last_used_at', { ascending: false });

    if (error) {
      console.error('Failed to get trusted devices:', error);
      return { devices: [], error: error.message };
    }

    return { devices: devices || [] };
  } catch (error) {
    console.error('Get trusted devices error:', error);
    return { devices: [], error: 'Failed to get trusted devices' };
  }
}

/**
 * Revoke trusted device
 */
export async function revokeTrustedDevice(
  userId: string, 
  deviceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('trusted_devices')
      .update({ is_trusted: false })
      .eq('id', deviceId)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to revoke trusted device:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Trusted device revoke error:', error);
    return { success: false, error: 'Failed to revoke trusted device' };
  }
}

/**
 * Clean up old devices (remove devices not used in 90 days)
 */
export async function cleanupOldDevices(userId: string): Promise<{
  removedCount: number;
  error?: string;
}> {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const { data: removedDevices, error } = await supabase
      .from('trusted_devices')
      .delete()
      .eq('user_id', userId)
      .lt('last_used_at', ninetyDaysAgo.toISOString())
      .select();

    if (error) {
      console.error('Failed to cleanup old devices:', error);
      return { removedCount: 0, error: error.message };
    }

    return { removedCount: removedDevices?.length || 0 };
  } catch (error) {
    console.error('Device cleanup error:', error);
    return { removedCount: 0, error: 'Failed to cleanup old devices' };
  }
}

/**
 * Get device analytics
 */
export async function getDeviceAnalytics(userId: string): Promise<{
  totalDevices: number;
  deviceTypes: Record<string, number>;
  browsers: Record<string, number>;
  operatingSystems: Record<string, number>;
  error?: string;
}> {
  try {
    const { data: devices, error } = await supabase
      .from('trusted_devices')
      .select('device_type, browser, os')
      .eq('user_id', userId)
      .eq('is_trusted', true);

    if (error) {
      console.error('Failed to get device analytics:', error);
      return {
        totalDevices: 0,
        deviceTypes: {},
        browsers: {},
        operatingSystems: {},
        error: error.message
      };
    }

    const analytics = {
      totalDevices: devices?.length || 0,
      deviceTypes: {} as Record<string, number>,
      browsers: {} as Record<string, number>,
      operatingSystems: {} as Record<string, number>
    };

    devices?.forEach(device => {
      analytics.deviceTypes[device.device_type] = (analytics.deviceTypes[device.device_type] || 0) + 1;
      analytics.browsers[device.browser] = (analytics.browsers[device.browser] || 0) + 1;
      analytics.operatingSystems[device.os] = (analytics.operatingSystems[device.os] || 0) + 1;
    });

    return analytics;
  } catch (error) {
    console.error('Device analytics error:', error);
    return {
      totalDevices: 0,
      deviceTypes: {},
      browsers: {},
      operatingSystems: {},
      error: 'Failed to get device analytics'
    };
  }
}

/**
 * Helper function to get user IP address
 */
async function getUserIpAddress(): Promise<string> {
  try {
    // In a real application, you'd use a proper IP geolocation service
    // For now, return a placeholder
    return 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Detect suspicious device activity
 */
export async function detectSuspiciousActivity(
  userId: string,
  deviceFingerprint: string
): Promise<{ suspicious: boolean; reasons: string[] }> {
  try {
    const reasons: string[] = [];
    
    // Check if device was used from multiple locations recently
    const { data: recentDevices, error } = await supabase
      .from('trusted_devices')
      .select('location, created_at')
      .eq('user_id', userId)
      .eq('device_fingerprint', deviceFingerprint)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (!error && recentDevices && recentDevices.length > 0) {
      const uniqueLocations = new Set(recentDevices.map(d => d.location));
      if (uniqueLocations.size > 2) {
        reasons.push('Device used from multiple locations in short time');
      }
    }

    // Check if too many devices were added recently
    const { data: recentTrusted, error: recentError } = await supabase
      .from('trusted_devices')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    if (!recentError && recentTrusted && recentTrusted.length > 3) {
      reasons.push('Too many trusted devices added recently');
    }

    return {
      suspicious: reasons.length > 0,
      reasons
    };
  } catch (error) {
    console.error('Suspicious activity detection error:', error);
    return { suspicious: false, reasons: [] };
  }
}