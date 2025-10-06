import { useState, useEffect } from 'react'
import { WifiX, WifiHigh, ArrowClockwise } from '@phosphor-icons/react'
import { NetworkStatusMonitor } from '@/lib/auth-retry'

interface NetworkStatusIndicatorProps {
  className?: string
  showWhenOnline?: boolean
}

export function NetworkStatusIndicator({ 
  className = '', 
  showWhenOnline = false 
}: NetworkStatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    const networkMonitor = NetworkStatusMonitor.getInstance()
    
    const unsubscribe = networkMonitor.onStatusChange((online) => {
      if (!online) {
        setIsOnline(false)
        setIsConnecting(false)
      } else {
        setIsConnecting(true)
        // Brief connecting state before showing online
        setTimeout(() => {
          setIsOnline(true)
          setIsConnecting(false)
        }, 1000)
      }
    })

    return unsubscribe
  }, [])

  // Don't show anything if online and showWhenOnline is false
  if (isOnline && !showWhenOnline && !isConnecting) {
    return null
  }

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {isConnecting ? (
        <>
          <ArrowClockwise className="h-4 w-4 animate-spin text-primary" />
          <span className="text-primary font-medium">Reconnecting...</span>
        </>
      ) : isOnline ? (
        <>
          <WifiHigh className="h-4 w-4 text-success" />
          <span className="text-success">Connected</span>
        </>
      ) : (
        <>
          <WifiX className="h-4 w-4 text-destructive" />
          <span className="text-destructive">No connection</span>
        </>
      )}
    </div>
  )
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const networkMonitor = NetworkStatusMonitor.getInstance()
    
    const unsubscribe = networkMonitor.onStatusChange(setIsOnline)

    return unsubscribe
  }, [])

  return isOnline
}