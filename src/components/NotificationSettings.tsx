import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useNotifications } from '@/contexts/NotificationContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { 
  Bell, 
  Volume2, 
  VolumeX, 
  Monitor, 
  Smartphone, 
  TestTube2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

export function NotificationSettings() {
  const { t } = useLanguage()
  const {
    settings,
    updateSettings,
    requestPermission,
    isSupported,
    getSupportedSoundTypes,
    testSound,
    playNotificationSound
  } = useNotifications()

  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default')
  const [testingSound, setTestingSound] = useState<string | null>(null)

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission)
    }
  }, [])

  const handleRequestPermission = async () => {
    const granted = await requestPermission()
    if (granted) {
      setPermissionStatus('granted')
      toast.success('Notifications enabled successfully!')
    } else {
      toast.error('Please enable notifications in your browser settings')
    }
  }

  const handleTestSound = async (soundType: string) => {
    setTestingSound(soundType)
    try {
      await testSound(soundType)
      toast.success(`${soundType} sound played`, {
        duration: 2000
      })
    } catch (error) {
      toast.error('Failed to play sound')
    } finally {
      setTimeout(() => setTestingSound(null), 1000)
    }
  }

  const handleVolumeChange = (value: number[]) => {
    updateSettings({ volume: value[0] })
  }

  const getPermissionIcon = () => {
    switch (permissionStatus) {
      case 'granted':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'denied':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
    }
  }

  const getPermissionText = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'Granted'
      case 'denied':
        return 'Denied'
      default:
        return 'Not requested'
    }
  }

  const supportedSounds = getSupportedSoundTypes()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure how you receive notifications for messages and app events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Permission Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {getPermissionIcon()}
              <div>
                <h4 className="font-medium">Browser Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  Status: {getPermissionText()}
                </p>
              </div>
            </div>
            {permissionStatus !== 'granted' && (
              <Button 
                onClick={handleRequestPermission}
                size="sm"
                disabled={!isSupported}
              >
                Enable Notifications
              </Button>
            )}
          </div>

          <Separator />

          {/* Sound Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-primary" />
                ) : (
                  <VolumeX className="w-5 h-5 text-muted-foreground" />
                )}
                <div>
                  <h4 className="font-medium">Sound Notifications</h4>
                  <p className="text-sm text-muted-foreground">
                    Play sounds for incoming messages and events
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
              />
            </div>

            {settings.soundEnabled && (
              <div className="ml-8 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Volume</label>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(settings.volume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[settings.volume]}
                    onValueChange={handleVolumeChange}
                    max={1}
                    min={0}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Sound Test Panel */}
                <div className="p-4 bg-muted/30 rounded-lg">
                  <h5 className="font-medium mb-3 flex items-center gap-2">
                    <TestTube2 className="w-4 h-4" />
                    Test Sounds
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {supportedSounds.map((soundType) => (
                      <Button
                        key={soundType}
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestSound(soundType)}
                        disabled={testingSound === soundType}
                        className="text-xs"
                      >
                        {testingSound === soundType ? 'Playing...' : soundType}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Desktop Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5 text-primary" />
              <div>
                <h4 className="font-medium">Desktop Notifications</h4>
                <p className="text-sm text-muted-foreground">
                  Show system notifications when the app is in background
                </p>
              </div>
            </div>
            <Switch
              checked={settings.desktopEnabled}
              onCheckedChange={(checked) => updateSettings({ desktopEnabled: checked })}
              disabled={permissionStatus !== 'granted'}
            />
          </div>

          {/* Vibration (Mobile) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-primary" />
              <div>
                <h4 className="font-medium">Vibration</h4>
                <p className="text-sm text-muted-foreground">
                  Vibrate device for notifications (mobile devices)
                </p>
              </div>
            </div>
            <Switch
              checked={settings.vibrationEnabled}
              onCheckedChange={(checked) => updateSettings({ vibrationEnabled: checked })}
              disabled={!('vibrate' in navigator)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Quick test different notification sounds and their intended use
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {[
              { type: 'message', description: 'New message received', color: 'blue' },
              { type: 'mention', description: 'You were mentioned in a conversation', color: 'orange' },
              { type: 'join', description: 'Someone joined a conversation', color: 'green' },
              { type: 'leave', description: 'Someone left a conversation', color: 'gray' },
              { type: 'success', description: 'Action completed successfully', color: 'green' },
              { type: 'error', description: 'Error or warning notification', color: 'red' },
              { type: 'call', description: 'Incoming call or urgent notification', color: 'purple' }
            ].map(({ type, description, color }) => (
              <div
                key={type}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={`bg-${color}-50 text-${color}-700 border-${color}-200`}>
                    {type}
                  </Badge>
                  <span className="text-sm">{description}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => playNotificationSound(type as any)}
                  disabled={!settings.soundEnabled}
                >
                  <TestTube2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Browser Support Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Browser Support</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={isSupported ? "default" : "secondary"}>
              {isSupported ? 'Notifications Supported' : 'Notifications Not Supported'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={'vibrate' in navigator ? "default" : "secondary"}>
              {'vibrate' in navigator ? 'Vibration Supported' : 'Vibration Not Supported'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={'audioContext' in window || 'webkitAudioContext' in window ? "default" : "secondary"}>
              {('AudioContext' in window || 'webkitAudioContext' in window) ? 'Web Audio Supported' : 'Web Audio Not Supported'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}