import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  ShieldCheck, 
  Fingerprint, 
  Desktop, 
  Eye,
  Gear
} from '@phosphor-icons/react'
import { TwoFactorSetup } from './TwoFactorSetup'
import { BiometricSettings } from './BiometricSettings'
import { TrustedDevices } from './TrustedDevices'
import { PrivacySettings } from './PrivacySettings'

interface SecuritySettingsProps {
  userId: string
  currentUser: {
    id: string
    username: string
    email: string
    displayName?: string
  }
}

export function SecuritySettings({ userId, currentUser }: SecuritySettingsProps) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          Security & Privacy Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your account security, privacy settings, and trusted devices
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Gear className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="2fa" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            2FA
          </TabsTrigger>
          <TabsTrigger value="biometric" className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4" />
            Biometric
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Desktop className="h-4 w-4" />
            Devices
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Privacy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Overview</CardTitle>
              <p className="text-sm text-muted-foreground">
                Current security status for {currentUser.displayName || currentUser.username}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Account Info */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Account Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Username:</span>
                    <span className="ml-2 font-medium">{currentUser.username}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="ml-2 font-medium">{currentUser.email}</span>
                  </div>
                </div>
              </div>

              {/* Security Features Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SecurityFeatureCard
                  title="2FA Authentication"
                  description="Two-factor authentication"
                  status="enabled"
                  icon={<ShieldCheck className="h-5 w-5" />}
                  onClick={() => setActiveTab('2fa')}
                />
                <SecurityFeatureCard
                  title="Biometric Login"
                  description="Fingerprint/Face ID"
                  status="setup"
                  icon={<Fingerprint className="h-5 w-5" />}
                  onClick={() => setActiveTab('biometric')}
                />
                <SecurityFeatureCard
                  title="Trusted Devices"
                  description="3 devices trusted"
                  status="active"
                  icon={<Desktop className="h-5 w-5" />}
                  onClick={() => setActiveTab('devices')}
                />
                <SecurityFeatureCard
                  title="Privacy Protection"
                  description="Screenshot protection"
                  status="enabled"
                  icon={<Eye className="h-5 w-5" />}
                  onClick={() => setActiveTab('privacy')}
                />
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="font-medium">Quick Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('2fa')}
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Setup 2FA
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('biometric')}
                  >
                    <Fingerprint className="mr-2 h-4 w-4" />
                    Enable Biometrics
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('devices')}
                  >
                    <Desktop className="mr-2 h-4 w-4" />
                    Manage Devices
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('privacy')}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Privacy Settings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Test biometric verification
                      import('@/hooks/useBiometricVerification').then(({ useBiometricVerification }) => {
                        // This is just a demo - in practice this would be handled in a component
                      })
                    }}
                  >
                    <Fingerprint className="mr-2 h-4 w-4 text-accent" />
                    Test Biometric
                  </Button>
                </div>
              </div>

              {/* Security Features */}
              <div className="space-y-4">
                <div className="p-4 bg-accent/5 border border-accent/10 rounded-lg">
                  <h4 className="font-medium text-accent mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Conversation Security
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Biometric verification is now required for sensitive conversation actions:
                  </p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Joining new conversations</li>
                    <li>• Creating secure conversations</li>
                    <li>• Starting conversations with new users</li>
                    <li>• Sending first messages (key exchange)</li>
                  </ul>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg">
                  <h4 className="font-medium text-primary mb-2">Security Tips</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Enable 2FA for maximum account security</li>
                    <li>• Use biometric authentication when available</li>
                    <li>• Regularly review and clean up trusted devices</li>
                    <li>• Keep your recovery codes in a safe place</li>
                    <li>• Enable privacy protection features</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="2fa" className="space-y-6">
          <div className="flex justify-center">
            <TwoFactorSetup userId={userId} />
          </div>
        </TabsContent>

        <TabsContent value="biometric" className="space-y-6">
          <div className="flex justify-center">
            <BiometricSettings 
              userId={userId} 
              userName={currentUser.username}
              displayName={currentUser.displayName || currentUser.username}
            />
          </div>
        </TabsContent>

        <TabsContent value="devices">
          <TrustedDevices userId={userId} />
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacySettings userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface SecurityFeatureCardProps {
  title: string
  description: string
  status: 'enabled' | 'disabled' | 'setup' | 'active'
  icon: React.ReactNode
  onClick: () => void
}

function SecurityFeatureCard({ title, description, status, icon, onClick }: SecurityFeatureCardProps) {
  const getStatusBadge = () => {
    switch (status) {
      case 'enabled':
        return <Badge className="bg-success/10 text-success">Enabled</Badge>
      case 'active':
        return <Badge className="bg-primary/10 text-primary">Active</Badge>
      case 'setup':
        return <Badge variant="outline">Setup Required</Badge>
      case 'disabled':
        return <Badge variant="secondary">Disabled</Badge>
      default:
        return null
    }
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          {icon}
          <div className="flex-1 min-w-0">
            <h5 className="font-medium text-sm truncate">{title}</h5>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{description}</p>
        {getStatusBadge()}
      </CardContent>
    </Card>
  )
}