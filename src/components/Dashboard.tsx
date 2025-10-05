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
  Database, 
  Key, 
  Shield,
  User,
  Gear
} from '@phosphor-icons/react'
import { signOut, getCurrentUser } from '@/lib/supabase'
import { getStoredKeys, getKeyFingerprint, isCryptoSupported } from '@/lib/crypto'
import { toast } from 'sonner'

interface DashboardProps {
  onLogout?: () => void
}

export function Dashboard({ onLogout }: DashboardProps) {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [keyInfo, setKeyInfo] = useState<{ publicKey: string; privateKey: string } | null>(null)

  useEffect(() => {
    const loadUserData = async () => {
      const user = await getCurrentUser()
      setCurrentUser(user)
      
      const keys = getStoredKeys()
      setKeyInfo(keys)
    }
    
    loadUserData()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
      toast.success('Logged out successfully')
      onLogout?.()
    } catch (error) {
      toast.error('Logout failed')
    }
  }

  const userName = currentUser?.user_metadata?.first_name || currentUser?.email?.split('@')[0] || 'User'
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
            <TabsTrigger value="security" className="gap-2">
              <Key className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2">
              <Database className="h-4 w-4" />
              Database
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
            
            <ChatInterface />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Security Center</h2>
              <p className="text-muted-foreground mb-6">
                Manage your encryption keys and security settings
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Encryption Status */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-accent" />
                    <h3 className="font-semibold">Encryption Status</h3>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                    <span className="text-sm">
                      {isCryptoSupported() ? 'Web Crypto API Supported' : 'Basic encryption only'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                    <span className="text-sm">
                      {keyInfo ? 'Encryption keys generated' : 'No keys found'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                    <span className="text-sm">End-to-end encryption active</span>
                  </div>
                </CardContent>
              </Card>

              {/* Key Information */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Your Keys</h3>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {keyInfo ? (
                    <>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">
                          Public Key Fingerprint
                        </Label>
                        <p className="font-mono text-sm mt-1">
                          {getKeyFingerprint(keyInfo.publicKey)}
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">
                          Key Type
                        </Label>
                        <p className="text-sm mt-1">
                          {isCryptoSupported() ? 'RSA-OAEP 2048-bit' : 'Demo encryption'}
                        </p>
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toast.info('Key export feature coming soon!')}
                      >
                        Export Public Key
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-muted-foreground">
                        No encryption keys found
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sign up to generate new keys
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="database" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Database Connection</h2>
              <p className="text-muted-foreground mb-6">
                Test and configure your Supabase database connection
              </p>
            </div>

            <div className="max-w-2xl">
              <SupabaseStatus />
            </div>

            <Card>
              <CardHeader>
                <h3 className="font-semibold">Database Schema</h3>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  For full functionality, create these tables in your Supabase project:
                </p>
                
                <div className="space-y-3 text-xs">
                  <div className="bg-muted p-3 rounded font-mono">
                    <strong>profiles</strong> - User profile information<br />
                    <span className="text-muted-foreground">
                      id, email, first_name, last_name, username, avatar_url, public_key
                    </span>
                  </div>
                  
                  <div className="bg-muted p-3 rounded font-mono">
                    <strong>contacts</strong> - User contact relationships<br />
                    <span className="text-muted-foreground">
                      id, user_id, contact_user_id, contact_name, verified
                    </span>
                  </div>
                  
                  <div className="bg-muted p-3 rounded font-mono">
                    <strong>messages</strong> - Encrypted messages<br />
                    <span className="text-muted-foreground">
                      id, sender_id, recipient_id, encrypted_content, message_type
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Profile Settings</h2>
              <p className="text-muted-foreground mb-6">
                Manage your account and preferences
              </p>
            </div>

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