import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Bell, SpeakerHigh, Phone, Warning, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useNotifications } from '@/contexts/NotificationContext'
import { useLanguage } from '@/contexts/LanguageContext'

export function NotificationSettings() {
  const { t } = useLanguage()
  const { 
    settings, 
    updateSettings, 
    playNotificationSound, 
    requestPermission, 
    isSupported 
  } = useNotifications()
  const [isRequesting, setIsRequesting] = useState(false)

  const handlePermissionRequest = async () => {
    setIsRequesting(true)
    try {
      const granted = await requestPermission()
      if (granted) {
        toast.success('Notifications enabled successfully!')
        updateSettings({ desktopEnabled: true })
      } else {
        toast.error('Notification permission denied')
      }
    } catch (error) {
      toast.error('Failed to request notification permission')
    } finally {
      setIsRequesting(false)
    }
  }

  const testSound = (type: 'message' | 'mention' | 'join' | 'error') => {
    playNotificationSound(type)
    toast.info(`Playing ${type} sound`)
  }

  const testNotification = () => {
    if (Notification.permission !== 'granted') {
      toast.error('Please enable notifications first')
      return
    }

    // Create a test notification
    const notification = new Notification('Test Notification', {
      body: 'This is a test notification from SecureChat',
      icon: '/favicon.ico',
      tag: 'test-notification'
    })

    setTimeout(() => {
      notification.close()
    }, 3000)

    toast.success('Test notification sent!')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notification Settings</span>
          </CardTitle>
          <CardDescription>
            Customize how you receive notifications for messages and events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Permission Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Desktop Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show system notifications when new messages arrive
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {Notification.permission === 'granted' ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Enabled
                  </Badge>
                ) : Notification.permission === 'denied' ? (
                  <Badge variant="destructive">
                    <Warning className="h-3 w-3 mr-1" />
                    Blocked
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    Not enabled
                  </Badge>
                )}
              </div>
            </div>

            {Notification.permission !== 'granted' && isSupported && (
              <Button 
                onClick={handlePermissionRequest}
                disabled={isRequesting || Notification.permission === 'denied'}
                variant="outline"
                className="w-full"
              >
                {isRequesting ? 'Requesting...' : 'Enable Desktop Notifications'}
              </Button>
            )}

            {Notification.permission === 'denied' && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Warning className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Notifications Blocked
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 mt-1">
                      To enable notifications, please allow them in your browser settings and refresh the page.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isSupported && (
              <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Warning className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      Notifications Not Supported
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                      Your browser doesn't support desktop notifications.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Notification Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="desktop-notifications">Desktop Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show notifications when the app is in the background
                </p>
              </div>
              <Switch
                id="desktop-notifications"
                checked={settings.desktopEnabled}
                onCheckedChange={(checked) => updateSettings({ desktopEnabled: checked })}
                disabled={Notification.permission !== 'granted'}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="sound-notifications">Sound Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Play sounds when receiving messages
                </p>
              </div>
              <Switch
                id="sound-notifications"
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="vibration-notifications">Vibration</Label>
                <p className="text-sm text-muted-foreground">
                  Vibrate device for notifications (mobile)
                </p>
              </div>
              <Switch
                id="vibration-notifications"
                checked={settings.vibrationEnabled}
                onCheckedChange={(checked) => updateSettings({ vibrationEnabled: checked })}
                disabled={!('vibrate' in navigator)}
              />
            </div>
          </div>

          <Separator />

          {/* Volume Control */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notification Volume</Label>
              <div className="flex items-center space-x-4">
                <SpeakerHigh className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[settings.volume * 100]}
                  onValueChange={(value) => updateSettings({ volume: value[0] / 100 })}
                  max={100}
                  step={10}
                  className="flex-1"
                  disabled={!settings.soundEnabled}
                />
                <span className="text-sm text-muted-foreground w-8">
                  {Math.round(settings.volume * 100)}%
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Test Controls */}
          <div className="space-y-4">
            <Label>Test Notifications</Label>
            
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => testSound('message')}
                disabled={!settings.soundEnabled}
                size="sm"
              >
                Message Sound
              </Button>
              <Button
                variant="outline"
                onClick={() => testSound('mention')}
                disabled={!settings.soundEnabled}
                size="sm"
              >
                Mention Sound
              </Button>
              <Button
                variant="outline"
                onClick={() => testSound('join')}
                disabled={!settings.soundEnabled}
                size="sm"
              >
                Join Sound
              </Button>
              <Button
                variant="outline"
                onClick={() => testSound('error')}
                disabled={!settings.soundEnabled}
                size="sm"
              >
                Error Sound
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={testNotification}
              disabled={!settings.desktopEnabled || Notification.permission !== 'granted'}
              className="w-full"
            >
              <Bell className="h-4 w-4 mr-2" />
              Test Desktop Notification
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}