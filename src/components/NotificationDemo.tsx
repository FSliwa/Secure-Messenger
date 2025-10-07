import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useNotifications } from '@/contexts/NotificationContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { 
  Send, 
  TestTube2,
  MessageCircle,
  AtSign,
  UserPlus,
  UserMinus,
  CheckCircle,
  AlertTriangle,
  Phone
} from 'lucide-react'
import { toast } from 'sonner'

export function NotificationDemo() {
  const { t } = useLanguage()
  const { playNotificationSound, showNotification, settings } = useNotifications()
  
  const [customTitle, setCustomTitle] = useState('SecureChat Pro')
  const [customBody, setCustomBody] = useState('You have a new message!')
  const [selectedSound, setSelectedSound] = useState<string>('message')

  const notificationTypes = [
    {
      id: 'message',
      label: 'New Message',
      icon: MessageCircle,
      title: 'New Message',
      body: 'John Doe: Hey! How are you doing?',
      color: 'text-blue-500'
    },
    {
      id: 'mention',
      label: 'Mention',
      icon: AtSign,
      title: 'You were mentioned',
      body: 'Alice mentioned you in #general: @you check this out!',
      color: 'text-orange-500'
    },
    {
      id: 'join',
      label: 'User Joined',
      icon: UserPlus,
      title: 'User Joined',
      body: 'Sarah Wilson joined the conversation',
      color: 'text-green-500'
    },
    {
      id: 'leave',
      label: 'User Left',
      icon: UserMinus,
      title: 'User Left',
      body: 'Mike Johnson left the conversation',
      color: 'text-gray-500'
    },
    {
      id: 'success',
      label: 'Success',
      icon: CheckCircle,
      title: 'Action Completed',
      body: 'Your message has been sent successfully',
      color: 'text-green-600'
    },
    {
      id: 'error',
      label: 'Error',
      icon: AlertTriangle,
      title: 'Connection Error',
      body: 'Failed to send message. Please try again.',
      color: 'text-red-500'
    },
    {
      id: 'call',
      label: 'Incoming Call',
      icon: Phone,
      title: 'Incoming Call',
      body: 'Emma is calling you...',
      color: 'text-purple-500'
    }
  ]

  const handleTestNotification = async (type: typeof notificationTypes[0]) => {
    try {
      // Play sound
      if (settings.soundEnabled) {
        await playNotificationSound(type.id as any)
      }
      
      // Show desktop notification
      if (settings.desktopEnabled) {
        showNotification(type.title, type.body, {
          icon: '/favicon.svg',
          tag: `test-${type.id}`,
          requireInteraction: false
        })
      }
      
      // Show toast as fallback
      toast.success(`${type.label} notification sent!`, {
        description: 'Check your system notifications',
        duration: 3000
      })
    } catch (error) {
      toast.error('Failed to send notification')
    }
  }

  const handleCustomNotification = async () => {
    if (!customTitle.trim() || !customBody.trim()) {
      toast.error('Please enter both title and message')
      return
    }

    try {
      // Play selected sound
      if (settings.soundEnabled) {
        await playNotificationSound(selectedSound as any)
      }
      
      // Show desktop notification
      if (settings.desktopEnabled) {
        showNotification(customTitle, customBody, {
          icon: '/favicon.svg',
          tag: 'custom-notification'
        })
      }
      
      toast.success('Custom notification sent!')
    } catch (error) {
      toast.error('Failed to send custom notification')
    }
  }

  const handleSoundOnly = async (soundType: string) => {
    try {
      await playNotificationSound(soundType as any)
      toast.info(`${soundType} sound played`, { duration: 2000 })
    } catch (error) {
      toast.error('Failed to play sound')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube2 className="w-5 h-5" />
            Notification Demo
          </CardTitle>
          <CardDescription>
            Test different types of notifications to see how they work
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quick Test Buttons */}
          <div>
            <h4 className="font-medium mb-3">Test Predefined Notifications</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {notificationTypes.map((type) => {
                const IconComponent = type.icon
                return (
                  <Button
                    key={type.id}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-muted/50"
                    onClick={() => handleTestNotification(type)}
                  >
                    <IconComponent className={`w-5 h-5 ${type.color}`} />
                    <span className="text-sm font-medium">{type.label}</span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Sound Only Tests */}
          <div>
            <h4 className="font-medium mb-3">Test Sounds Only</h4>
            <div className="flex flex-wrap gap-2">
              {notificationTypes.map((type) => (
                <Button
                  key={`sound-${type.id}`}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSoundOnly(type.id)}
                  disabled={!settings.soundEnabled}
                >
                  🔊 {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Notification */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
            <h4 className="font-medium">Custom Notification</h4>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="title">Notification Title</Label>
                <Input
                  id="title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Enter notification title"
                />
              </div>
              <div>
                <Label htmlFor="body">Notification Message</Label>
                <Input
                  id="body"
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  placeholder="Enter notification message"
                />
              </div>
              <div>
                <Label htmlFor="sound">Sound Type</Label>
                <Select value={selectedSound} onValueChange={setSelectedSound}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sound type" />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCustomNotification} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                Send Custom Notification
              </Button>
            </div>
          </div>

          {/* Status Info */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              <strong>Sound notifications:</strong> {settings.soundEnabled ? '✅ Enabled' : '❌ Disabled'}
            </p>
            <p>
              <strong>Desktop notifications:</strong> {settings.desktopEnabled ? '✅ Enabled' : '❌ Disabled'}
            </p>
            <p>
              <strong>Volume:</strong> {Math.round(settings.volume * 100)}%
            </p>
            <p className="text-xs mt-2 p-2 bg-muted/50 rounded">
              💡 <strong>Tip:</strong> Desktop notifications only appear when the browser tab is not active. 
              Toast notifications appear regardless.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}