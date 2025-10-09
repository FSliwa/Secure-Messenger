import { supabase } from './supabase'

export interface DeviceInfo {
  deviceType: 'mobile' | 'tablet' | 'desktop'
  deviceModel: string
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  screenResolution: string
  viewportSize: string
  pixelRatio: number
  orientation: 'portrait' | 'landscape'
  aspectRatio: number
  isMobile: boolean
  isTablet: boolean
  userAgent: string
  language: string
  timezone: string
}

/**
 * Get comprehensive device information for tracking
 */
export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent
  const screenWidth = window.screen.width
  const screenHeight = window.screen.height
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const pixelRatio = window.devicePixelRatio || 1
  const aspectRatio = viewportWidth / viewportHeight
  
  // Touch detection
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  
  // Device type
  let deviceType: 'mobile' | 'tablet' | 'desktop'
  if (viewportWidth < 768 && isTouchDevice) {
    deviceType = 'mobile'
  } else if (viewportWidth >= 768 && viewportWidth < 1024 && isTouchDevice) {
    deviceType = 'tablet'
  } else {
    deviceType = 'desktop'
  }
  
  // Orientation
  const orientation = viewportWidth > viewportHeight ? 'landscape' : 'portrait'
  
  // OS Detection
  const { os, osVersion } = detectOS()
  
  // Browser Detection
  const { browser, browserVersion } = detectBrowser()
  
  // Device Model
  const deviceModel = estimateDeviceModel(screenWidth, screenHeight, pixelRatio, os)
  
  return {
    deviceType,
    deviceModel,
    browser,
    browserVersion,
    os,
    osVersion,
    screenResolution: `${screenWidth}x${screenHeight}`,
    viewportSize: `${viewportWidth}x${viewportHeight}`,
    pixelRatio,
    orientation,
    aspectRatio: parseFloat(aspectRatio.toFixed(2)),
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    userAgent: ua,
    language: navigator.language || 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  }
}

/**
 * Track device login in database
 */
export async function trackDeviceLogin(userId: string): Promise<void> {
  try {
    const deviceInfo = getDeviceInfo()
    
    console.log('📱 Tracking device login:', {
      userId,
      deviceType: deviceInfo.deviceType,
      os: deviceInfo.os,
      browser: deviceInfo.browser
    })
    
    const { error } = await supabase
      .from('login_sessions')
      .insert({
        user_id: userId,
        login_time: new Date().toISOString(),
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        screen_resolution: deviceInfo.screenResolution,
        user_agent: deviceInfo.userAgent,
        language: deviceInfo.language,
        timezone: deviceInfo.timezone,
        is_active: true
      })
    
    if (error) {
      console.error('❌ Failed to track device login:', error)
    } else {
      console.log('✅ Device login tracked successfully')
    }
  } catch (error) {
    console.error('❌ trackDeviceLogin exception:', error)
  }
}

function detectOS(): { os: string, osVersion: string } {
  const ua = navigator.userAgent
  const platform = navigator.platform
  
  // iOS
  if (/iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    const match = ua.match(/OS (\d+)_(\d+)/)
    const version = match ? `${match[1]}.${match[2]}` : 'unknown'
    return { os: 'iOS', osVersion: version }
  }
  
  // Android
  if (/Android/.test(ua)) {
    const match = ua.match(/Android (\d+\.?\d*)/)
    const version = match ? match[1] : 'unknown'
    return { os: 'Android', osVersion: version }
  }
  
  // Windows
  if (/Windows/.test(ua)) {
    return { os: 'Windows', osVersion: 'unknown' }
  }
  
  // macOS
  if (/Mac OS X/.test(ua)) {
    const match = ua.match(/Mac OS X (\d+)[._](\d+)/)
    const version = match ? `${match[1]}.${match[2]}` : 'unknown'
    return { os: 'macOS', osVersion: version }
  }
  
  // Linux
  if (/Linux/.test(ua)) {
    return { os: 'Linux', osVersion: 'unknown' }
  }
  
  return { os: 'unknown', osVersion: 'unknown' }
}

function detectBrowser(): { browser: string, browserVersion: string } {
  const ua = navigator.userAgent
  
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    const match = ua.match(/Chrome\/(\d+)/)
    return { browser: 'Chrome', browserVersion: match ? match[1] : 'unknown' }
  }
  
  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/(\d+)/)
    return { browser: 'Edge', browserVersion: match ? match[1] : 'unknown' }
  }
  
  if (ua.includes('Firefox')) {
    const match = ua.match(/Firefox\/(\d+)/)
    return { browser: 'Firefox', browserVersion: match ? match[1] : 'unknown' }
  }
  
  if (ua.includes('Safari') && !ua.includes('Chrome')) {
    const match = ua.match(/Version\/(\d+)/)
    return { browser: 'Safari', browserVersion: match ? match[1] : 'unknown' }
  }
  
  return { browser: 'unknown', browserVersion: 'unknown' }
}

function estimateDeviceModel(
  screenWidth: number,
  screenHeight: number,
  pixelRatio: number,
  os: string
): string {
  if (os === 'iOS') {
    // iPhone models (portrait)
    if (screenWidth === 375 && screenHeight === 667 && pixelRatio === 2) return 'iPhone 6/7/8/SE2'
    if (screenWidth === 414 && screenHeight === 896 && pixelRatio === 2) return 'iPhone 11/XR'
    if (screenWidth === 390 && screenHeight === 844 && pixelRatio === 3) return 'iPhone 12/13/14'
    if (screenWidth === 393 && screenHeight === 852 && pixelRatio === 3) return 'iPhone 14 Pro'
    if (screenWidth === 375 && screenHeight === 812 && pixelRatio === 3) return 'iPhone X/XS/11 Pro'
    if (screenWidth === 428 && screenHeight === 926 && pixelRatio === 3) return 'iPhone 12/13/14 Pro Max'
    
    // iPad models
    if (screenWidth === 768 && screenHeight === 1024) return 'iPad'
    if (screenWidth === 834 && screenHeight === 1112) return 'iPad Pro 10.5"'
    if (screenWidth === 1024 && screenHeight === 1366) return 'iPad Pro 12.9"'
    
    return 'iOS Device'
  }
  
  if (os === 'Android') {
    // Common Android sizes
    if (screenWidth === 360 && screenHeight === 640) return 'Android Phone (Small)'
    if (screenWidth === 412 && screenHeight === 915) return 'Android Phone (Medium)'
    if (screenWidth === 480 && screenHeight === 960) return 'Android Phone (Large)'
    
    return 'Android Device'
  }
  
  // Desktop
  if (screenWidth >= 1920) return 'Desktop (FHD+)'
  if (screenWidth >= 1280) return 'Desktop (HD)'
  
  return 'Desktop'
}

