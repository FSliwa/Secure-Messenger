import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChatInterface } from './ChatInterface'
import { SupabaseStatus } from './SupabaseStatus'
import { 
  SignOut, 
  ChatCircle, 
  Key, 
  Shield,
  User,
  Gear
} from '@phosphor-icons/react'
import { getStoredKeys, getKeyFingerprint, isCryptoSupported, KeyPair } from '@/lib/crypto'
import { FileSharing } from './FileSharing'
import { SecuritySettings } from './SecuritySettings'
import { toast } from 'sonner'

interface User {
  id: string;
  username: string;
  email: string;
  displayName?: string;
}

interface DashboardProps {
  onLogout?: () => void;
  currentUser: User | null;
}

export function Dashboard({ onLogout, currentUser }: DashboardProps) {
  const [keyInfo, setKeyInfo] = useState<KeyPair | null>(null)

  useEffect(() => {
    const loadCryptoKeys = async () => {
      const keys = await getStoredKeys()
      setKeyInfo(keys)
    }
    
    loadCryptoKeys()
  }, [])

  const handleLogout = () => {
    try {
      toast.success('Logged out successfully')
      onLogout?.()
    } catch (error) {
      toast.error('Logout failed')
    }
  }

  const userName = currentUser?.displayName || currentUser?.username || currentUser?.email?.split('@')[0] || 'User'
  const userEmail = currentUser?.email || 'demo@example.com'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">SecureChat</h1>
              <Badge variant="secondary" className="text-xs">
                Dashboard
              </Badge>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <SignOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="chat" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat" className="gap-2">
              <ChatCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-2">
              <Shield className="h-4 w-4" />
              Files
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Key className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Secure Messaging</h2>
              <p className="text-muted-foreground mb-6">
                Send end-to-end encrypted messages to your contacts
              </p>
            </div>
            
            <ChatInterface currentUser={currentUser || { id: '', username: '', email: '' }} />
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            <FileSharing 
              keyPair={keyInfo} 
              currentUserId={currentUser?.id || ''} 
            />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <SecuritySettings 
              userId={currentUser?.id || ''} 
              currentUser={currentUser || { id: '', username: '', email: '' }}
            />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Profile Settings</h2>
              <p className="text-muted-foreground mb-6">
                Manage your account and preferences
              </p>
            </div>

            {/* Database Connection Status */}
            <SupabaseStatus />

            <Card>
              <CardHeader>
                <h3 className="font-semibold">Account Information</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    Name
                  </Label>
                  <p className="text-sm mt-1">{userName}</p>
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    Email
                  </Label>
                  <p className="text-sm mt-1">{userEmail}</p>
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">
                    Account Type
                  </Label>
                  <p className="text-sm mt-1">
                    {currentUser ? 'Registered User' : 'Demo User'}
                  </p>
                </div>
                
                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => toast.info('Profile editing coming soon!')}
                  >
                    <Gear className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

// Helper component for labels
function Label({ className, children, ...props }: { className?: string; children: React.ReactNode }) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  )
}