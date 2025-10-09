import { Button } from '@/components/ui/button'
import { ChatCircle, Users, Bell, User } from '@phosphor-icons/react'
import { useDevice } from '@/contexts/DeviceContext'

type MobileTab = 'chats' | 'people' | 'notifications' | 'profile'

interface MobileNavigationProps {
  activeTab: MobileTab
  onTabChange: (tab: MobileTab) => void
  unreadChats?: number
  unreadNotifications?: number
}

/**
 * Facebook-style bottom navigation for mobile devices
 * Fixed to bottom with safe-area-inset support
 */
export function MobileNavigation({ 
  activeTab, 
  onTabChange,
  unreadChats = 0,
  unreadNotifications = 0
}: MobileNavigationProps) {
  const { isMobile } = useDevice()

  // Only show on mobile devices
  if (!isMobile) return null

  const tabs: Array<{
    id: MobileTab
    icon: JSX.Element
    label: string
    badge?: number
  }> = [
    { 
      id: 'chats', 
      icon: <ChatCircle className="h-6 w-6" weight={activeTab === 'chats' ? 'fill' : 'regular'} />, 
      label: 'Chats',
      badge: unreadChats
    },
    { 
      id: 'people', 
      icon: <Users className="h-6 w-6" weight={activeTab === 'people' ? 'fill' : 'regular'} />, 
      label: 'People'
    },
    { 
      id: 'notifications', 
      icon: <Bell className="h-6 w-6" weight={activeTab === 'notifications' ? 'fill' : 'regular'} />, 
      label: 'Notifications',
      badge: unreadNotifications
    },
    { 
      id: 'profile', 
      icon: <User className="h-6 w-6" weight={activeTab === 'profile' ? 'fill' : 'regular'} />, 
      label: 'Me'
    }
  ]

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border safe-area-bottom"
      style={{
        height: '56px',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="flex items-center justify-around h-full px-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full rounded-none relative ${
              activeTab === tab.id 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            {/* Icon with badge */}
            <div className="relative">
              {tab.icon}
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </div>
            
            {/* Label */}
            <span className="text-[10px] font-medium leading-none">
              {tab.label}
            </span>
            
            {/* Active indicator */}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
            )}
          </Button>
        ))}
      </div>
    </nav>
  )
}

