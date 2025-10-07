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
      {/* Full width container with proper alignment to match registration card */}
      <div className="w-full flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 max-w-6xl mx-auto">
        {/* Left side - Logo and Search - aligned to SecureChat Pro text */}
        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
          {/* Logo with enhanced visibility */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary text-primary-foreground facebook-button shadow-md">
              <ChatCircle className="h-5 w-5 sm:h-6 sm:w-6 icon-enhanced" weight="fill" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground hidden sm:block">SecureChat Pro</span>
          </div>
          
          {/* Search Bar - Facebook style with better contrast */}
          <div className="hidden md:flex flex-1 max-w-xs">
            <div className="relative w-full">
              <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-foreground/80 icon-enhanced" />
              <Input
                type="text"
                placeholder="Search SecureChat"
                className="w-full pl-10 pr-4 py-2 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:bg-card focus:ring-2 focus:ring-primary/20 facebook-input rounded-full text-sm"
              />
            </div>
          </div>
        </div>
        
        {/* Right side - Actions aligned to registration card edge */}
        <div className="flex items-center gap-2 justify-end">
          {/* Mobile Search Button with better visibility */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden w-9 h-9 rounded-full hover:bg-muted/70 text-foreground hover:text-foreground facebook-button"
          >
            <MagnifyingGlass className="h-5 w-5 icon-enhanced" />
          </Button>
          
          {/* Theme and Language Switchers with better contrast */}
          <div className="hidden sm:flex items-center gap-1">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
          
          {/* Login Button with enhanced visibility */}
          <Button
            onClick={onLoginClick}
            className="facebook-button bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-bold rounded-md shadow-md border border-primary/10 transition-all hover:shadow-lg btn-text-enhanced"
          >
            {t.signIn}
          </Button>
        </div>
      </div>
    </header>
  );
}