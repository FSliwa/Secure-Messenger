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
      {/* Header - Facebook Style */}
      <header className="sticky top-0 z-50 w-full bg-background border-b border-border/40 shadow-sm">
        <div className="facebook-container mx-auto flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
          {/* Left side - Logo and branding */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground facebook-button">
                <Shield className="h-5 w-5" weight="fill" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-primary">SecureChat</h1>
                <Badge variant="secondary" className="text-xs mt-0.5">
                  {t.dashboard}
                </Badge>
              </div>
            </div>
          </div>

          {/* Center - Main navigation actions */}
          <div className="hidden lg:flex items-center justify-center space-x-1 flex-1">
            <Button
              variant="ghost"
              size="lg"
              className="relative w-24 h-12 rounded-lg hover:bg-muted/70 text-muted-foreground hover:text-primary transition-all duration-200 facebook-button"
              onClick={() => setShowNotificationSettings(true)}
              title="Notifications"
            >
              <div className="flex flex-col items-center">
                <Bell className="h-5 w-5" />
                <span className="text-xs mt-0.5">Notifications</span>
              </div>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="relative w-24 h-12 rounded-lg hover:bg-muted/70 text-muted-foreground hover:text-primary transition-all duration-200 facebook-button"
              onClick={() => setShowProfileSettings(true)}
              title={t.profile}
            >
              <div className="flex flex-col items-center">
                <User className="h-5 w-5" />
                <span className="text-xs mt-0.5">{t.profile}</span>
              </div>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="relative w-24 h-12 rounded-lg hover:bg-muted/70 text-muted-foreground hover:text-primary transition-all duration-200 facebook-button"
              onClick={() => setShowSecurityInitializer(true)}
              title={t.enhancedSecurityInitialization}
            >
              <div className="flex flex-col items-center">
                <Shield className="h-5 w-5" />
                <span className="text-xs mt-0.5">Security</span>
              </div>
            </Button>
          </div>
          
          {/* Right side - User info and controls */}
          <div className="flex items-center gap-2 justify-end flex-1">
            {/* User info - visible on larger screens */}
            <div className="text-right hidden md:block mr-2">
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
            
            {/* Mobile menu buttons */}
            <div className="lg:hidden flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotificationSettings(true)}
                className="w-10 h-10 rounded-full facebook-button"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProfileSettings(true)}
                className="w-10 h-10 rounded-full facebook-button"
                title={t.profile}
              >
                <User className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Theme and Language switchers */}
            <div className="hidden sm:flex items-center gap-1">
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
            
            {/* Demo button - subtle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotificationDemo(true)}
              className="hidden md:flex gap-1 facebook-button text-xs text-muted-foreground hover:text-foreground"
              title="Test notification system"
            >
              <Bell className="h-3 w-3" />
              Demo
            </Button>
              
            {/* Logout Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2 facebook-button border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <SignOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t.logout}</span>
            </Button>
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