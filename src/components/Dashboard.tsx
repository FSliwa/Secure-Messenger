import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChatInterface } from './ChatInterface'
import { ProfileSettings } from './ProfileSettings'
import { EnhancedSecurityInitializer } from './EnhancedSecurityInitializer'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeSwitcher } from './ThemeSwitcher'
import { NotificationSettings } from './NotificationSettings'
import { NotificationDemo } from './NotificationDemo'
import { FeatureShowcase } from './FeatureShowcase'
import { useLanguage } from '@/contexts/LanguageContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { 
  SignOut, 
  Shield,
  User,
  Gear,
  Bell
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
  const { t } = useLanguage()
  const { requestPermission } = useNotifications()
  const [keyInfo, setKeyInfo] = useState<KeyPair | null>(null)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [showSecurityInitializer, setShowSecurityInitializer] = useState(false)
  const [showNotificationSettings, setShowNotificationSettings] = useState(false)
  const [showNotificationDemo, setShowNotificationDemo] = useState(false)

  useEffect(() => {
    const loadCryptoKeys = async () => {
      const keys = await getStoredKeys()
      setKeyInfo(keys)
    }
    
    loadCryptoKeys()
    
    // Request notification permission on dashboard load
    requestPermission()
  }, [requestPermission])

  // Security guard - ensure user is properly authenticated
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t.accessDenied}</h2>
          <p className="text-muted-foreground mb-4">{t.mustBeLoggedIn}</p>
          <Button onClick={() => window.location.reload()}>
            {t.returnToLogin}
          </Button>
        </div>
      </div>
    )
  }

  const handleLogout = async () => {
    try {
      toast.loading(t.signingOut, { id: 'logout' });
      
      // Call the parent logout handler which handles all cleanup
      await onLogout?.();
      
      toast.success(t.loggedOutSuccessfully, { id: 'logout' });
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(t.logoutFailed, { id: 'logout' });
      
      // Force logout even if there's an error
      onLogout?.();
    }
  }

  const handleProfileUpdate = (updatedProfile: any) => {
    // Handle profile update - could refresh user data
    toast.success(t.profileUpdatedSuccessfully)
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
                {t.dashboard}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
              
              {/* Theme Switcher */}
              <ThemeSwitcher />
              
              {/* Language Switcher */}
              <LanguageSwitcher />
              
              {/* Notification Settings Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotificationSettings(true)}
                className="gap-2"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Notifications</span>
              </Button>
              
              {/* Notification Demo Button - Development/Testing */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotificationDemo(true)}
                className="gap-2"
                title="Test notification system"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">🧪 Demo</span>
              </Button>
              
              {/* Profile Settings Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfileSettings(true)}
                className="gap-2"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{t.profile}</span>
              </Button>
              
              {/* Enhanced Security Initializer Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSecurityInitializer(true)}
                className="gap-2"
                title={t.enhancedSecurityInitialization}
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">{t.securityInit}</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <SignOut className="h-4 w-4" />
                {t.logout}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">{t.secureChatMessenger}</h2>
          <p className="text-muted-foreground">
            {t.facebookStyleInterface}
          </p>
        </div>
        
        <div className="w-full h-[700px]">
          <ChatInterface currentUser={currentUser || { id: '', username: '', email: '' }} />
        </div>
      </main>

      {/* Feature Showcase */}
      <FeatureShowcase />

      {/* Profile Settings Dialog */}
      <ProfileSettings
        currentUser={currentUser}
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
        onProfileUpdate={handleProfileUpdate}
      />

      {/* Notification Settings Dialog */}
      {showNotificationSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Notification Settings</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotificationSettings(false)}
              >
                ✕
              </Button>
            </div>
            <div className="p-6">
              <NotificationSettings />
            </div>
          </div>
        </div>
      )}

      {/* Notification Demo Dialog */}
      {showNotificationDemo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">🧪 Notification Testing</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotificationDemo(false)}
              >
                ✕
              </Button>
            </div>
            <div className="p-6">
              <NotificationDemo />
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Security Initializer Dialog */}
      {showSecurityInitializer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t.enhancedSecurityInitialization}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSecurityInitializer(false)}
              >
                ✕
              </Button>
            </div>
            <div className="p-6">
              <EnhancedSecurityInitializer />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}