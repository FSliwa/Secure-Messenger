import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useLanguage } from '@/contexts/LanguageContext';
import { MagnifyingGlass, ChatCircle } from "@phosphor-icons/react";

interface HeaderProps {
  onLoginClick?: () => void;
}

export function Header({ onLoginClick }: HeaderProps) {
  const { t } = useLanguage()
  
  return (
    <header className="sticky top-0 z-50 w-full bg-background border-b border-border/40 shadow-sm">
      <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 max-w-5xl">
        {/* Left side - Logo and Search */}
        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
          {/* Logo */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary text-primary-foreground facebook-button">
              <ChatCircle className="h-4 w-4 sm:h-5 sm:w-5" weight="fill" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-primary hidden sm:block">SecureChat</span>
          </div>
          
          {/* Search Bar - Facebook style */}
          <div className="hidden md:flex flex-1 max-w-xs">
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
        {/* Right side - Actions */}
        <div className="flex items-center gap-2 justify-end">
          {/* Mobile Search Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden w-9 h-9 rounded-full hover:bg-muted/70 text-muted-foreground hover:text-foreground facebook-button"
          >
            <MagnifyingGlass className="h-4 w-4" />
          </Button>
          
          {/* Theme and Language Switchers */}
          <div className="hidden sm:flex items-center gap-1">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
          
          {/* Login Button */}
          <Button
            onClick={onLoginClick}
            className="facebook-button bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base font-medium rounded-md"
          >
            {t.signIn}
          </Button>
        </div>
      </div>
    </header>
  );
}