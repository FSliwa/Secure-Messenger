import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChatInterface } from './ChatInterface'
import { ProfileSettings } from './ProfileSettings'
import { LanguageSwitcher } from './LanguageSwitcher'
import { 
  SignOut, 
  Shield,
  User,
  Gear
} from '@phosphor-icons/react'
import { getStoredKeys, KeyPair } from '@/lib/crypto'
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
  const [showProfileSettings, setShowProfileSettings] = useState(false)

  useEffect(() => {
    const loadCryptoKeys = async () => {
      const keys = await getStoredKeys()
      setKeyInfo(keys)
    }
    
    loadCryptoKeys()
  }, [])

  // Security guard - ensure user is properly authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">You must be logged in to access the dashboard.</p>
          <Button onClick={() => window.location.reload()}>
            Return to Login
          </Button>
        </div>
      </div>
    )
  }

  const handleLogout = async () => {
    try {
      toast.loading('Signing out...', { id: 'logout' });
      
      // Call the parent logout handler which handles all cleanup
      await onLogout?.();
      
      toast.success('Logged out successfully', { id: 'logout' });
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed, but you will be redirected', { id: 'logout' });
      
      // Force logout even if there's an error
      onLogout?.();
    }
  }

  const handleProfileUpdate = (updatedProfile: any) => {
    // Handle profile update - could refresh user data
    toast.success('Profile updated successfully')
  }

  const userName = currentUser?.displayName || currentUser?.username || currentUser?.email?.split('@')[0] || 'User'
  const userEmail = currentUser?.email || 'user@example.com'

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
              
              {/* Language Switcher */}
              <LanguageSwitcher />
              
              {/* Profile Settings Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfileSettings(true)}
                className="gap-2"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </Button>
              
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
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">SecureChat Messenger</h2>
          <p className="text-muted-foreground">
            Facebook-style interface with military-grade encryption
          </p>
        </div>
        
        <div className="w-full h-[700px]">
          <ChatInterface currentUser={currentUser || { id: '', username: '', email: '' }} />
        </div>
      </main>

      {/* Profile Settings Dialog */}
      <ProfileSettings
        currentUser={currentUser}
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  )
}