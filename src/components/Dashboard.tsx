import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChatInterface } from './ChatInterface'
import { ProfileSettings } from './ProfileSettings'
import { EnhancedSecurityInitializer } from './EnhancedSecurityInitializer'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeSwitcher } from './ThemeSwitcher'
import { NotificationSettings } from './NotificationSettings'
import { NotificationDemo } from './NotificationDemo'
import { useLanguage } from '@/contexts/LanguageContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { 
  SignOut, 
  Shield,
  User,
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
      {/* Header - Full Width Messenger Style */}
      <header className="sticky top-0 z-50 w-full bg-card border-b border-border/40 shadow-sm">
        <div className="w-full flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Left side - Logo and search */}
          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0 max-w-xs lg:max-w-sm">
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5" weight="fill" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold text-primary">SecureChat</h1>
              </div>
            </div>
          </div>

          {/* Center - User greeting and status */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-sm sm:text-base font-semibold text-foreground">
                Welcome back, {userName}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-muted-foreground">Online</span>
              </div>
            </div>
          </div>
          
          {/* Right side - Controls and user actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-1 justify-end max-w-xs lg:max-w-sm">
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotificationSettings(true)}
                className="w-9 h-9 rounded-full facebook-button"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfileSettings(true)}
                className="w-9 h-9 rounded-full facebook-button"
                title={t.profile}
              >
                <User className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSecurityInitializer(true)}
                className="w-9 h-9 rounded-full facebook-button"
                title={t.enhancedSecurityInitialization}
              >
                <Shield className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Theme and Language switchers */}
            <div className="hidden sm:flex items-center gap-1">
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
              
            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-9 h-9 rounded-full text-destructive hover:bg-destructive/10 facebook-button"
              title={t.logout}
            >
              <SignOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content - Full width like Messenger */}
      <main className="w-full h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
        <ChatInterface currentUser={currentUser || { id: '', username: '', email: '' }} />
      </main>

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