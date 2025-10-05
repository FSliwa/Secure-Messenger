import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  Key, 
  Lock, 
  Warning, 
  CheckCircle, 
  Clock,
  Fingerprint,
  Devices as Device,
  Download,
  Upload,
  Trash,
  Eye,
  EyeSlash
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import { generatePostQuantumKeyPair, getStoredKeys, storeKeys, getKeyFingerprint, EncryptionProgress, KeyPair } from '@/lib/crypto'

interface SecuritySettings {
  twoFactorEnabled: boolean
  biometricEnabled: boolean
  autoLockTimeout: number
  screenshotProtection: boolean
  disappearingMessages: boolean
  defaultMessageTimer: number
  forwardingRestriction: boolean
  readReceipts: boolean
  onlineStatus: boolean
}

interface TrustedDevice {
  id: string
  name: string
  type: 'mobile' | 'desktop' | 'web'
  lastAccess: number
  isCurrentDevice: boolean
  fingerprint: string
}

interface BackupData {
  created: number
  keyCount: number
  messageCount: number
  contactCount: number
  encrypted: boolean
}

export function AdvancedSecurity() {
  const [settings, setSettings] = useKV<SecuritySettings>('security-settings', {
    twoFactorEnabled: false,
    biometricEnabled: false,
    autoLockTimeout: 15,
    screenshotProtection: true,
    disappearingMessages: false,
    defaultMessageTimer: 24,
    forwardingRestriction: true,
    readReceipts: true,
    onlineStatus: true
  })

  const [trustedDevices, setTrustedDevices] = useKV<TrustedDevice[]>('trusted-devices', [])
  const [backups, setBackups] = useKV<BackupData[]>('security-backups', [])
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null)
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false)
  const [keyGenProgress, setKeyGenProgress] = useState<EncryptionProgress | null>(null)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [backupPassword, setBackupPassword] = useState('')
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)

  useEffect(() => {
    const loadKeys = async () => {
      const keys = await getStoredKeys()
      setKeyPair(keys)
    }
    loadKeys()

    // Initialize current device if not exists
    if (!trustedDevices?.find(d => d.isCurrentDevice)) {
      const currentDevice: TrustedDevice = {
        id: `device_${Date.now()}`,
        name: `${navigator.platform} - ${navigator.userAgent.split(' ')[0]}`,
        type: 'web',
        lastAccess: Date.now(),
        isCurrentDevice: true,
        fingerprint: Math.random().toString(36).substring(2, 15)
      }
      setTrustedDevices((current) => [...(current || []), currentDevice])
    }
  }, [trustedDevices, setTrustedDevices])

  const handleSettingChange = (key: keyof SecuritySettings, value: any) => {
    setSettings((current) => ({
      twoFactorEnabled: false,
      biometricEnabled: false,
      autoLockTimeout: 15,
      screenshotProtection: true,
      disappearingMessages: false,
      defaultMessageTimer: 24,
      forwardingRestriction: true,
      readReceipts: true,
      onlineStatus: true,
      ...current,
      [key]: value
    }))
    toast.success(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} updated`)
  }

  const handleGenerateNewKeys = async () => {
    setIsGeneratingKeys(true)
    try {
      const newKeyPair = await generatePostQuantumKeyPair((progress) => {
        setKeyGenProgress(progress)
      })
      
      await storeKeys(newKeyPair)
      setKeyPair(newKeyPair)
      toast.success('New encryption keys generated successfully!')
    } catch (error) {
      toast.error('Failed to generate new keys')
    } finally {
      setIsGeneratingKeys(false)
      setKeyGenProgress(null)
    }
  }

  const handleRevokeDevice = (deviceId: string) => {
    setTrustedDevices((current) => 
      (current || []).filter(device => device.id !== deviceId)
    )
    toast.success('Device access revoked')
  }

  const handleCreateBackup = async () => {
    if (!backupPassword) {
      toast.error('Please enter a backup password')
      return
    }

    setIsCreatingBackup(true)
    try {
      // Simulate backup creation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const newBackup: BackupData = {
        created: Date.now(),
        keyCount: keyPair ? 1 : 0,
        messageCount: 150, // Simulated
        contactCount: 3, // Simulated
        encrypted: true
      }

      setBackups((current) => [...(current || []), newBackup])
      toast.success('Secure backup created successfully!')
      setBackupPassword('')
    } catch (error) {
      toast.error('Failed to create backup')
    } finally {
      setIsCreatingBackup(false)
    }
  }

  const formatDeviceType = (type: string) => {
    switch (type) {
      case 'mobile': return '📱'
      case 'desktop': return '💻'
      case 'web': return '🌐'
      default: return '🔧'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Advanced Security Settings</h2>
        <p className="text-muted-foreground">
          Configure enterprise-grade security features and manage your encryption keys
        </p>
      </div>

      <Tabs defaultValue="keys" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="keys">Encryption Keys</TabsTrigger>
          <TabsTrigger value="settings">Security Settings</TabsTrigger>
          <TabsTrigger value="devices">Trusted Devices</TabsTrigger>
          <TabsTrigger value="backup">Backup & Recovery</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Post-Quantum Encryption Keys
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {keyPair ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Key Algorithm</p>
                      <p className="text-sm text-muted-foreground">{keyPair.algorithm}</p>
                    </div>
                    <Badge variant="outline" className="bg-success/10 text-success">
                      Active
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="font-medium mb-2">Public Key Fingerprint</p>
                    <div className="font-mono text-sm bg-muted p-3 rounded">
                      {getKeyFingerprint(keyPair.publicKey)}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">Private Key</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                      >
                        {showPrivateKey ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div className="font-mono text-xs bg-muted p-3 rounded">
                      {showPrivateKey ? keyPair.privateKey.slice(0, 100) + '...' : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                          <Key className="w-4 h-4" />
                          Generate New Keys
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Generate New Encryption Keys</DialogTitle>
                          <DialogDescription>
                            This will generate a new post-quantum key pair. Your old keys will be permanently deleted.
                            This process takes approximately 3 minutes.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          {isGeneratingKeys && keyGenProgress && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="capitalize">{keyGenProgress.phase.replace('-', ' ')}</span>
                                <span>{Math.round(keyGenProgress.progress)}%</span>
                              </div>
                              <Progress value={keyGenProgress.progress} className="h-2" />
                              <p className="text-sm text-muted-foreground">{keyGenProgress.message}</p>
                            </div>
                          )}
                          <Button 
                            onClick={handleGenerateNewKeys} 
                            disabled={isGeneratingKeys}
                            className="w-full"
                          >
                            {isGeneratingKeys ? 'Generating...' : 'Generate New Keys'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No encryption keys found</p>
                  <Button onClick={handleGenerateNewKeys} disabled={isGeneratingKeys}>
                    Generate Encryption Keys
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="2fa">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">Require 2FA for login</p>
                  </div>
                  <Switch
                    id="2fa"
                    checked={settings?.twoFactorEnabled || false}
                    onCheckedChange={(checked) => handleSettingChange('twoFactorEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="biometric">Biometric Authentication</Label>
                    <p className="text-sm text-muted-foreground">Use fingerprint/face ID</p>
                  </div>
                  <Switch
                    id="biometric"
                    checked={settings?.biometricEnabled || false}
                    onCheckedChange={(checked) => handleSettingChange('biometricEnabled', checked)}
                  />
                </div>

                <div>
                  <Label htmlFor="auto-lock">Auto-Lock Timeout (minutes)</Label>
                  <Select
                    value={settings?.autoLockTimeout?.toString() || '15'}
                    onValueChange={(value) => handleSettingChange('autoLockTimeout', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 minute</SelectItem>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacy Protection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="screenshot">Screenshot Protection</Label>
                    <p className="text-sm text-muted-foreground">Prevent screenshots</p>
                  </div>
                  <Switch
                    id="screenshot"
                    checked={settings?.screenshotProtection || false}
                    onCheckedChange={(checked) => handleSettingChange('screenshotProtection', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="disappearing">Disappearing Messages</Label>
                    <p className="text-sm text-muted-foreground">Auto-delete messages</p>
                  </div>
                  <Switch
                    id="disappearing"
                    checked={settings?.disappearingMessages || false}
                    onCheckedChange={(checked) => handleSettingChange('disappearingMessages', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="forwarding">Restrict Forwarding</Label>
                    <p className="text-sm text-muted-foreground">Prevent message forwarding</p>
                  </div>
                  <Switch
                    id="forwarding"
                    checked={settings?.forwardingRestriction || false}
                    onCheckedChange={(checked) => handleSettingChange('forwardingRestriction', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Device className="w-5 h-5" />
                Trusted Devices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trustedDevices?.map((device) => (
                  <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{formatDeviceType(device.type)}</span>
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {device.name}
                          {device.isCurrentDevice && (
                            <Badge variant="secondary" className="text-xs">Current</Badge>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Last access: {new Date(device.lastAccess).toLocaleString()}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">
                          {device.fingerprint}
                        </p>
                      </div>
                    </div>
                    {!device.isCurrentDevice && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevokeDevice(device.id)}
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Create Backup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create an encrypted backup of your keys, contacts, and message history.
                </p>
                <div>
                  <Label htmlFor="backup-password">Backup Password</Label>
                  <Input
                    id="backup-password"
                    type="password"
                    placeholder="Enter secure password"
                    value={backupPassword}
                    onChange={(e) => setBackupPassword(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleCreateBackup} 
                  disabled={isCreatingBackup || !backupPassword}
                  className="w-full"
                >
                  {isCreatingBackup ? 'Creating Backup...' : 'Create Encrypted Backup'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Backup History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {backups?.length ? (
                    backups.map((backup, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium text-sm">
                            {new Date(backup.created).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {backup.keyCount} keys, {backup.messageCount} messages, {backup.contactCount} contacts
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {backup.encrypted ? 'Encrypted' : 'Plain'}
                          </Badge>
                          <Button size="sm" variant="ghost">
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No backups created yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}