import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useLanguage } from '@/contexts/LanguageContext';
import { MagnifyingGlass, Bell, ChatCircle, Users } from "@phosphor-icons/react";

interface HeaderProps {
  onLoginClick?: () => void;
}

export function Header({ onLoginClick }: HeaderProps) {
  const { t } = useLanguage()
  
  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b border-border/40 shadow-sm">
      <div className="facebook-container mx-auto flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
        {/* Left side - Logo and Search */}
        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
          {/* Logo */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground facebook-button">
              <ChatCircle className="h-5 w-5" weight="fill" />
            </div>
            <span className="text-xl font-bold text-primary hidden sm:block">SecureChat</span>
          </div>
          
          {/* Search Bar - Facebook style */}
          <div className="hidden lg:flex flex-1 max-w-md">
            <div className="relative w-full">
              <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search SecureChat"
                className="w-full pl-10 pr-4 py-2 bg-muted/50 border-0 rounded-full text-sm placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 facebook-input"
              />
            </div>
          </div>
        </div>

        {/* Center Navigation Icons - Facebook style */}
        <div className="hidden lg:flex items-center justify-center space-x-1 flex-1">
          <Button
            variant="ghost"
            size="lg"
            className="relative w-28 h-12 rounded-lg hover:bg-muted/70 text-muted-foreground hover:text-primary transition-all duration-200 facebook-button"
            title="Home"
          >
            <div className="flex flex-col items-center">
              <Users className="h-6 w-6" />
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full opacity-0 group-hover:opacity-100"></div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="relative w-28 h-12 rounded-lg hover:bg-muted/70 text-muted-foreground hover:text-primary transition-all duration-200 facebook-button"
            title="Messages"
          >
            <div className="flex flex-col items-center">
              <ChatCircle className="h-6 w-6" />
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full opacity-100"></div>
            </div>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="relative w-28 h-12 rounded-lg hover:bg-muted/70 text-muted-foreground hover:text-primary transition-all duration-200 facebook-button"
            title="Notifications"
          >
            <div className="flex flex-col items-center">
              <Bell className="h-6 w-6" />
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full opacity-0 group-hover:opacity-100"></div>
            </div>
          </Button>
        </div>
        
        {/* Right side - User actions */}
        <div className="flex items-center gap-2 justify-end flex-1">
          {/* Mobile search icon */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden w-10 h-10 rounded-full hover:bg-muted/70 text-muted-foreground hover:text-foreground facebook-button"
          >
            <MagnifyingGlass className="h-5 w-5" />
          </Button>
          
          {/* Theme and Language switchers */}
          <div className="hidden sm:flex items-center gap-1">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
          
          {/* Login Button - Facebook style */}
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg px-4 sm:px-6 h-9 sm:h-10 text-sm sm:text-base facebook-button transition-all duration-200 hover:shadow-lg"
            onClick={onLoginClick}
          >
            {t.signIn}
          </Button>
        </div>
      </div>
    </header>
  );
}