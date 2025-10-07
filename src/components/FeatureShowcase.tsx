import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Bell, 
  Moon, 
  Sun, 
  Upload, 
  SpeakerHigh, 
  Phone, 
  CloudArrowUp,
  Shield,
  CheckCircle
} from '@phosphor-icons/react'
import { useTheme } from '@/contexts/ThemeContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { useLanguage } from '@/contexts/LanguageContext'

export function FeatureShowcase() {
  const { t } = useLanguage()
  const { theme, setTheme, isDark } = useTheme()
  const { settings, playNotificationSound, showNotification } = useNotifications()
  const [showFeatures, setShowFeatures] = useState(false)

  const demoNotification = () => {
    playNotificationSound('message')
    showNotification(
      'New Feature Demo',
      'This is how real-time notifications work in SecureChat!',
      { tag: 'demo-notification' }
    )
  }

  const features = [
    {
      title: 'Real-time Notifications',
      description: 'Get instant notifications with custom sounds for messages, mentions, and events',
      icon: <Bell className="h-6 w-6" />,
      status: 'active',
      demo: demoNotification
    },
    {
      title: 'Dark Mode Support',
      description: 'Toggle between light, dark, and system theme preferences',
      icon: isDark ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />,
      status: 'active',
      demo: () => setTheme(isDark ? 'light' : 'dark')
    },
    {
      title: 'Enhanced File Sharing',
      description: 'Drag-and-drop file sharing with progress tracking and thumbnail generation',
      icon: <CloudArrowUp className="h-6 w-6" />,
      status: 'active',
      demo: () => alert('File sharing demo - drag files into the chat interface!')
    },
    {
      title: 'Voice Messages',
      description: 'Record and send encrypted voice messages with playback controls',
      icon: <SpeakerHigh className="h-6 w-6" />,
      status: 'active',
      demo: () => playNotificationSound('join')
    },
    {
      title: 'Biometric Security',
      description: 'Secure your conversations with fingerprint or face recognition',
      icon: <Shield className="h-6 w-6" />,
      status: 'active'
    },
    {
      title: 'Multi-language Support',
      description: 'Interface available in English and Polish with easy switching',
      icon: <CheckCircle className="h-6 w-6" />,
      status: 'active'
    }
  ]

  if (!showFeatures) {
    return (
      <Button 
        onClick={() => setShowFeatures(true)}
        variant="outline"
        className="fixed bottom-4 right-4 z-40"
      >
        Show New Features
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-primary" />
                <span>SecureChat Pro - New Features</span>
              </CardTitle>
              <CardDescription>
                Discover the latest enhancements to your secure messaging experience
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowFeatures(false)}
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {features.map((feature, index) => (
              <Card key={index} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
                      {feature.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold text-sm">{feature.title}</h3>
                        <Badge variant="default" className="text-xs">
                          {feature.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {feature.description}
                      </p>
                      {feature.demo && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={feature.demo}
                          className="text-xs"
                        >
                          Try Demo
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold">Current Settings</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span>Theme:</span>
                <Badge variant="secondary">{theme}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Notifications:</span>
                <Badge variant={settings.desktopEnabled ? 'default' : 'secondary'}>
                  {settings.desktopEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Sound:</span>
                <Badge variant={settings.soundEnabled ? 'default' : 'secondary'}>
                  {settings.soundEnabled ? 'On' : 'Off'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Volume:</span>
                <Badge variant="outline">
                  {Math.round(settings.volume * 100)}%
                </Badge>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              🎉 What's New
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Real-time message notifications with custom sounds</li>
              <li>• Drag-and-drop file sharing with thumbnails</li>
              <li>• Dark mode and theme switching</li>
              <li>• Enhanced security with biometric authentication</li>
              <li>• Improved voice messaging experience</li>
              <li>• Multi-language interface support</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}