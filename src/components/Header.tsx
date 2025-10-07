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
    <header className="sticky top-0 z-50 w-full bg-card border-b border-border/40 shadow-sm safe-area-top">
      <div className="container mx-auto flex h-14 sm:h-16 max-w-screen-xl items-center justify-between px-4 sm:px-6 safe-area-left safe-area-right">
        {/* Left side - Logo and Navigation */}
        <div className="flex items-center space-x-4 sm:space-x-6 flex-1">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <ChatCircle className="h-4 w-4 sm:h-5 sm:w-5" weight="fill" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-primary hidden xs:block">SecureChat</span>
          </div>
          
          {/* Search Bar - Hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-md relative">
            <div className="relative w-full">
              <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search SecureChat"
                className="w-full pl-10 pr-4 py-2 bg-muted/50 border-0 rounded-full text-sm placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Center Navigation Icons - Hidden on mobile */}
        <div className="hidden lg:flex items-center justify-center space-x-2 flex-1">
          <Button
            variant="ghost"
            size="lg"
            className="w-12 h-12 rounded-xl hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            <Users className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-12 h-12 rounded-xl hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            <ChatCircle className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-12 h-12 rounded-xl hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            <Bell className="h-6 w-6" />
          </Button>
        </div>
        
        {/* Right side - User actions */}
        <div className="flex items-center gap-2 sm:gap-3 justify-end flex-1">
          {/* Mobile search icon */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden w-10 h-10 rounded-full hover:bg-muted/70 text-muted-foreground hover:text-foreground"
          >
            <MagnifyingGlass className="h-5 w-5" />
          </Button>
          
          {/* Theme and Language switchers - Hidden on small screens */}
          <div className="hidden sm:flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
          
          {/* Login Button */}
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg px-4 sm:px-6 h-9 sm:h-10 text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200"
            onClick={onLoginClick}
          >
            {t.signIn}
          </Button>
        </div>
      </div>
    </header>
  );
}