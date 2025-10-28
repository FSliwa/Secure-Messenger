import { useState, useEffect } from 'react'

export interface DeviceInfo {
  // Device Type
  deviceType: 'mobile' | 'tablet' | 'desktop'
  
  // Orientation
  orientation: 'portrait' | 'landscape'
  
  // Screen Info
  screenSize: {
    width: number
    height: number
  }
  screenResolution: string
  viewportSize: {
    width: number
    height: number
  }
  
  // Display Properties
  aspectRatio: number
  pixelRatio: number
  isRetina: boolean
  
  // Capabilities
  isTouchDevice: boolean
  hasNotch: boolean
  supportsHover: boolean
  
  // OS Detection
  os: 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'unknown'
  osVersion: string
  
  // Browser
  browser: string
  browserVersion: string
  
  // Device Model (estimated)
  deviceModel: string
  
  // Breakpoints
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

/**
 * Detects device type, capabilities, and provides responsive breakpoint info
 * Uses screen size, touch capability, and aspect ratio (Facebook-style detection)
 */
export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => getDeviceInfo())

  useEffect(() => {
    // Update on resize or orientation change
    const handleChange = () => {
      setDeviceInfo(getDeviceInfo())
    }

    window.addEventListener('resize', handleChange)
    window.addEventListener('orientationchange', handleChange)

    // Initial check
    handleChange()

    return () => {
      window.removeEventListener('resize', handleChange)
      window.removeEventListener('orientationchange', handleChange)
    }
  }, [])

  return deviceInfo
}

function getDeviceInfo(): DeviceInfo {
  // Screen dimensions
  const screenWidth = window.screen.width
  const screenHeight = window.screen.height
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Display properties
  const pixelRatio = window.devicePixelRatio || 1
  const aspectRatio = viewportWidth / viewportHeight
  
  // Capabilities
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const supportsHover = window.matchMedia('(hover: hover)').matches
  const hasNotch = checkForNotch()
  
  // Orientation
  const orientation = viewportWidth > viewportHeight ? 'landscape' : 'portrait'
  
  // Device type detection (Facebook-style logic)
  let deviceType: 'mobile' | 'tablet' | 'desktop'
  
  if (viewportWidth < 768 && isTouchDevice) {
    deviceType = 'mobile'
  } else if (viewportWidth >= 768 && viewportWidth < 1024 && isTouchDevice) {
    deviceType = 'tablet'
  } else {
    deviceType = 'desktop'
  }
  
  // OS Detection
  const { os, osVersion } = detectOS()
  
  // Browser Detection
  const { browser, browserVersion } = detectBrowser()
  
  // Device Model (estimated)
  const deviceModel = estimateDeviceModel(screenWidth, screenHeight, pixelRatio, os)
  
  return {
    deviceType,
    orientation,
    screenSize: {
      width: screenWidth,
      height: screenHeight
    },
    screenResolution: `${screenWidth}x${screenHeight}`,
    viewportSize: {
      width: viewportWidth,
      height: viewportHeight
    },
    aspectRatio: parseFloat(aspectRatio.toFixed(2)),
    pixelRatio,
    isRetina: pixelRatio > 1,
    isTouchDevice,
    hasNotch,
    supportsHover,
    os,
    osVersion,
    browser,
    browserVersion,
    deviceModel,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop'
  }
}

function checkForNotch(): boolean {
  // Check for safe-area-inset support (iPhone X+ and similar)
  if (CSS.supports && CSS.supports('padding-top: env(safe-area-inset-top)')) {
    // Get computed safe area
    const testDiv = document.createElement('div')
    testDiv.style.paddingTop = 'env(safe-area-inset-top)'
    document.body.appendChild(testDiv)
    const computedPadding = window.getComputedStyle(testDiv).paddingTop
    document.body.removeChild(testDiv)
    
    // If safe area > 20px, device has notch
    return parseInt(computedPadding) > 20
  }
  return false
}

function detectOS(): { os: DeviceInfo['os'], osVersion: string } {
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
    const match = ua.match(/Windows NT (\d+\.\d+)/)
    const version = match ? match[1] : 'unknown'
    return { os: 'Windows', osVersion: version }
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
  
  // Chrome
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    const match = ua.match(/Chrome\/(\d+)/)
    return { browser: 'Chrome', browserVersion: match ? match[1] : 'unknown' }
  }
  
  // Edge
  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/(\d+)/)
    return { browser: 'Edge', browserVersion: match ? match[1] : 'unknown' }
  }
  
  // Firefox
  if (ua.includes('Firefox')) {
    const match = ua.match(/Firefox\/(\d+)/)
    return { browser: 'Firefox', browserVersion: match ? match[1] : 'unknown' }
  }
  
  // Safari
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
  // iOS devices
  if (os === 'iOS') {
    // iPhone sizes (portrait)
    if (screenWidth === 375 && screenHeight === 667 && pixelRatio === 2) return 'iPhone 6/7/8/SE2'
    if (screenWidth === 414 && screenHeight === 896 && pixelRatio === 2) return 'iPhone 11/XR'
    if (screenWidth === 390 && screenHeight === 844 && pixelRatio === 3) return 'iPhone 12/13/14'
    if (screenWidth === 393 && screenHeight === 852 && pixelRatio === 3) return 'iPhone 14 Pro'
    if (screenWidth === 375 && screenHeight === 812 && pixelRatio === 3) return 'iPhone X/XS/11 Pro'
    if (screenWidth === 428 && screenHeight === 926 && pixelRatio === 3) return 'iPhone 12/13/14 Pro Max'
    
    // iPad sizes
    if (screenWidth === 768 && screenHeight === 1024) return 'iPad'
    if (screenWidth === 834 && screenHeight === 1112) return 'iPad Pro 10.5"'
    if (screenWidth === 1024 && screenHeight === 1366) return 'iPad Pro 12.9"'
    
    return 'iOS Device'
  }
  
  // Android devices (common sizes)
  if (os === 'Android') {
    if (screenWidth === 360 && screenHeight === 640) return 'Android Phone (Small)'
    if (screenWidth === 412 && screenHeight === 915) return 'Android Phone (Medium)'
    if (screenWidth === 480 && screenHeight === 960) return 'Android Phone (Large)'
    
    return 'Android Device'
  }
  
  // Desktop
  if (screenWidth >= 1920) return 'Desktop (Large)'
  if (screenWidth >= 1280) return 'Desktop (Medium)'
  if (screenWidth >= 1024) return 'Desktop (Small)'
  
  return 'Unknown Device'
}

