import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { 
  ShieldCheck, 
  Eye, 
  EyeSlash, 
  Timer, 
  Share, 
  Screencast,
  Lock
} from '@phosphor-icons/react'
import { preventScreenshot, scheduleMessageDeletion, cleanupExpiredMessages } from '@/lib/auth-security'
import { useKV } from '@github/spark/hooks'

interface PrivacySettings {
  screenshotProtection: boolean
  autoDeleteMessages: boolean
  autoDeleteHours: number
  preventForwarding: boolean
  showReadReceipts: boolean
  showOnlineStatus: boolean
  showLastSeen: boolean
}

interface PrivacySettingsProps {
  userId: string
}

export function PrivacySettings({ userId }: PrivacySettingsProps) {
  const [settings, setSettings] = useKV<PrivacySettings>(`privacy-settings-${userId}`, {
    screenshotProtection: true,
    autoDeleteMessages: false,
    autoDeleteHours: 24,
    preventForwarding: true,
    showReadReceipts: true,
    showOnlineStatus: true,
    showLastSeen: true
  })

  const [protectionActive, setProtectionActive] = useState(false)

  // Ensure settings has a default value
  const currentSettings = settings || {
    screenshotProtection: true,
    autoDeleteMessages: false,
    autoDeleteHours: 24,
    preventForwarding: true,
    showReadReceipts: true,
    showOnlineStatus: true,
    showLastSeen: true
  }

  useEffect(() => {
    // Apply screenshot protection if enabled
    if (currentSettings.screenshotProtection && !protectionActive) {
      preventScreenshot()
      setProtectionActive(true)
      toast.info('Screenshot protection enabled')
    }
  }, [currentSettings.screenshotProtection, protectionActive])

  useEffect(() => {
    // Set up automatic cleanup of expired messages
    if (currentSettings.autoDeleteMessages) {
      const interval = setInterval(() => {
        cleanupExpiredMessages().catch(console.error)
      }, 60000) // Check every minute

      return () => clearInterval(interval)
    }
  }, [currentSettings.autoDeleteMessages])

  const updateSetting = <K extends keyof PrivacySettings>(
    key: K, 
    value: PrivacySettings[K]
  ) => {
    setSettings(prev => ({ 
      ...currentSettings, 
      ...prev, 
      [key]: value 
    }))
    toast.success('Privacy setting updated')
  }

  const resetToDefaults = () => {
    setSettings({
      screenshotProtection: true,
      autoDeleteMessages: false,
      autoDeleteHours: 24,
      preventForwarding: true,
      showReadReceipts: true,
      showOnlineStatus: true,
      showLastSeen: true
    })
    toast.success('Privacy settings reset to defaults')
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Privacy Protection
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure privacy and security settings for your messages
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Screenshot Protection */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Screencast className="h-4 w-4" />
            Screen Protection
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Prevent Screenshots</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Attempt to prevent screenshots and screen recording (limited browser support)
                </p>
              </div>
              <Switch
                checked={currentSettings.screenshotProtection}
                onCheckedChange={(checked) => updateSetting('screenshotProtection', checked)}
              />
            </div>

            {currentSettings.screenshotProtection && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-sm text-warning-foreground">
                  <strong>Note:</strong> Screenshot protection has limited effectiveness and varies by browser and device. 
                  It may prevent some basic screenshot methods but cannot guarantee complete protection.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Message Auto-Delete */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Message Auto-Delete
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <span className="font-medium">Auto-delete Messages</span>
                <p className="text-sm text-muted-foreground">
                  Automatically delete messages after a specified time
                </p>
              </div>
              <Switch
                checked={currentSettings.autoDeleteMessages}
                onCheckedChange={(checked) => updateSetting('autoDeleteMessages', checked)}
              />
            </div>

            {currentSettings.autoDeleteMessages && (
              <div className="p-4 border rounded-lg">
                <label className="block text-sm font-medium mb-2">
                  Delete messages after:
                </label>
                <Select
                  value={currentSettings.autoDeleteHours.toString()}
                  onValueChange={(value) => updateSetting('autoDeleteHours', parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="6">6 hours</SelectItem>
                    <SelectItem value="24">24 hours</SelectItem>
                    <SelectItem value="72">3 days</SelectItem>
                    <SelectItem value="168">1 week</SelectItem>
                    <SelectItem value="720">30 days</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  This applies to new messages. Existing messages are not affected.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Message Forwarding */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Share className="h-4 w-4" />
            Message Sharing
          </h4>
          
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <span className="font-medium">Prevent Message Forwarding</span>
              <p className="text-sm text-muted-foreground">
                Disable forwarding of your messages to other chats
              </p>
            </div>
            <Switch
              checked={currentSettings.preventForwarding}
              onCheckedChange={(checked) => updateSetting('preventForwarding', checked)}
            />
          </div>
        </div>

        {/* Visibility Settings */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Visibility Settings
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <span className="font-medium">Show Read Receipts</span>
                <p className="text-sm text-muted-foreground">
                  Let others know when you've read their messages
                </p>
              </div>
              <Switch
                checked={currentSettings.showReadReceipts}
                onCheckedChange={(checked) => updateSetting('showReadReceipts', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <span className="font-medium">Show Online Status</span>
                <p className="text-sm text-muted-foreground">
                  Display your online/offline status to others
                </p>
              </div>
              <Switch
                checked={currentSettings.showOnlineStatus}
                onCheckedChange={(checked) => updateSetting('showOnlineStatus', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <span className="font-medium">Show Last Seen</span>
                <p className="text-sm text-muted-foreground">
                  Show when you were last active
                </p>
              </div>
              <Switch
                checked={currentSettings.showLastSeen}
                onCheckedChange={(checked) => updateSetting('showLastSeen', checked)}
              />
            </div>
          </div>
        </div>

        {/* Privacy Summary */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h5 className="font-medium mb-2">Current Privacy Level</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              {currentSettings.screenshotProtection ? (
                <ShieldCheck className="h-4 w-4 text-success" />
              ) : (
                <EyeSlash className="h-4 w-4 text-muted-foreground" />
              )}
              <span>Screenshot Protection</span>
            </div>
            <div className="flex items-center gap-2">
              {currentSettings.autoDeleteMessages ? (
                <Timer className="h-4 w-4 text-success" />
              ) : (
                <Timer className="h-4 w-4 text-muted-foreground" />
              )}
              <span>Auto-Delete Messages</span>
            </div>
            <div className="flex items-center gap-2">
              {currentSettings.preventForwarding ? (
                <Lock className="h-4 w-4 text-success" />
              ) : (
                <Share className="h-4 w-4 text-muted-foreground" />
              )}
              <span>Forwarding Protection</span>
            </div>
            <div className="flex items-center gap-2">
              {!currentSettings.showLastSeen ? (
                <EyeSlash className="h-4 w-4 text-success" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
              <span>Hidden Last Seen</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults} className="flex-1">
            Reset to Defaults
          </Button>
        </div>

        {/* Privacy Information */}
        <div className="text-xs text-muted-foreground space-y-2">
          <p>
            <strong>Privacy Notice:</strong> These settings enhance your privacy but cannot guarantee complete protection against all forms of data capture or sharing.
          </p>
          <p>
            For maximum security, avoid sharing sensitive information in any digital format.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}