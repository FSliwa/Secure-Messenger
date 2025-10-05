import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { 
  DeviceMobile, 
  Desktop, 
  DeviceTablet, 
  Trash, 
  CheckCircle, 
  Plus,
  Spinner
} from '@phosphor-icons/react'
import { 
  generateDeviceFingerprint,
  addTrustedDevice,
  removeTrustedDevice,
  getUserTrustedDevices,
  isDeviceTrusted
} from '@/lib/auth-security'

interface TrustedDevice {
  id: string
  device_fingerprint: string
  device_name: string
  device_type: string
  browser: string
  os: string
  is_trusted: boolean
  trusted_at: string
  last_used: string
  expires_at: string
}

interface TrustedDevicesProps {
  userId: string
}

export function TrustedDevices({ userId }: TrustedDevicesProps) {
  const [devices, setDevices] = useState<TrustedDevice[]>([])
  const [currentDeviceFingerprint, setCurrentDeviceFingerprint] = useState('')
  const [isCurrentDeviceTrusted, setIsCurrentDeviceTrusted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    initializeDeviceInfo()
    loadTrustedDevices()
  }, [userId])

  const initializeDeviceInfo = async () => {
    const fingerprint = generateDeviceFingerprint()
    setCurrentDeviceFingerprint(fingerprint)
    
    try {
      const trusted = await isDeviceTrusted(userId, fingerprint)
      setIsCurrentDeviceTrusted(trusted)
    } catch (error) {
      console.error('Error checking device trust status:', error)
    }
  }

  const loadTrustedDevices = async () => {
    try {
      const trustedDevices = await getUserTrustedDevices(userId)
      setDevices(trustedDevices)
    } catch (error) {
      console.error('Error loading trusted devices:', error)
      toast.error('Failed to load trusted devices')
    } finally {
      setIsLoading(false)
    }
  }

  const trustCurrentDevice = async () => {
    setActionLoading('trust-current')
    try {
      const deviceName = getCurrentDeviceName()
      await addTrustedDevice(userId, currentDeviceFingerprint, deviceName, 30)
      setIsCurrentDeviceTrusted(true)
      await loadTrustedDevices()
      toast.success('Current device added to trusted devices')
    } catch (error: any) {
      toast.error(error.message || 'Failed to trust current device')
    } finally {
      setActionLoading(null)
    }
  }

  const removeDevice = async (deviceId: string) => {
    setActionLoading(deviceId)
    try {
      await removeTrustedDevice(userId, deviceId)
      await loadTrustedDevices()
      
      // Check if we just removed the current device
      const removedDevice = devices.find(d => d.id === deviceId)
      if (removedDevice?.device_fingerprint === currentDeviceFingerprint) {
        setIsCurrentDeviceTrusted(false)
      }
      
      toast.success('Device removed from trusted devices')
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove device')
    } finally {
      setActionLoading(null)
    }
  }

  const getCurrentDeviceName = () => {
    const ua = navigator.userAgent
    let deviceName = 'Unknown Device'
    
    if (ua.includes('Mac')) {
      if (ua.includes('Mobile')) {
        deviceName = 'iPhone/iPad'
      } else {
        deviceName = 'Mac'
      }
    } else if (ua.includes('Windows')) {
      deviceName = 'Windows PC'
    } else if (ua.includes('Android')) {
      deviceName = 'Android Device'
    } else if (ua.includes('Linux')) {
      deviceName = 'Linux Device'
    }
    
    // Add browser info
    if (ua.includes('Chrome')) deviceName += ' - Chrome'
    else if (ua.includes('Firefox')) deviceName += ' - Firefox'
    else if (ua.includes('Safari')) deviceName += ' - Safari'
    else if (ua.includes('Edge')) deviceName += ' - Edge'
    
    return deviceName
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <DeviceMobile className="h-5 w-5" />
      case 'tablet':
        return <DeviceTablet className="h-5 w-5" />
      default:
        return <Desktop className="h-5 w-5" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Spinner className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Loading trusted devices...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Desktop className="h-5 w-5 text-primary" />
          Trusted Devices
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage devices that can access your account without additional verification
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Device Status */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getDeviceIcon('desktop')}
              <div>
                <p className="font-medium">Current Device</p>
                <p className="text-sm text-muted-foreground">{getCurrentDeviceName()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCurrentDeviceTrusted ? (
                <Badge variant="secondary" className="bg-success/10 text-success">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Trusted
                </Badge>
              ) : (
                <Button
                  size="sm"
                  onClick={trustCurrentDevice}
                  disabled={actionLoading === 'trust-current'}
                >
                  {actionLoading === 'trust-current' ? (
                    <>
                      <Spinner className="mr-1 h-3 w-3 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1 h-3 w-3" />
                      Trust Device
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Trusted Devices List */}
        <div className="space-y-3">
          <h4 className="font-medium">Trusted Devices ({devices.length})</h4>
          
          {devices.length === 0 ? (
            <div className="text-center py-8">
              <Desktop className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No trusted devices</p>
              <p className="text-sm text-muted-foreground">
                Trust this device to skip 2FA verification
              </p>
            </div>
          ) : (
            devices.map((device) => (
              <div
                key={device.id}
                className={`p-4 border rounded-lg ${
                  device.device_fingerprint === currentDeviceFingerprint 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(device.device_type)}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{device.device_name}</p>
                        {device.device_fingerprint === currentDeviceFingerprint && (
                          <Badge variant="outline" className="text-xs">Current</Badge>
                        )}
                        {isExpired(device.expires_at) && (
                          <Badge variant="destructive" className="text-xs">Expired</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {device.browser} on {device.os}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last used: {formatDate(device.last_used)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires: {formatDate(device.expires_at)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeDevice(device.id)}
                    disabled={actionLoading === device.id}
                    className="text-destructive hover:text-destructive"
                  >
                    {actionLoading === device.id ? (
                      <Spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground p-4 bg-muted/50 rounded">
          <p className="mb-1">
            <strong>Note:</strong> Trusted devices expire after 30 days for security.
          </p>
          <p>
            You can trust up to 5 devices at a time. Remove unused devices regularly.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}