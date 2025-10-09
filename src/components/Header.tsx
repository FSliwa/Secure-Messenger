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
      <div className="w-full flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6 max-w-screen-xl mx-auto">
        {/* Left side - Logo and Search - aligned to SecureChat Pro text */}
        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
          {/* Logo with enhanced visibility and better mobile touch targets */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="flex h-10 w-10 sm:h-10 sm:w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-primary text-primary-foreground facebook-button shadow-md min-h-[44px] min-w-[44px]">
              <ChatCircle className="h-5 w-5 sm:h-6 sm:w-6 icon-enhanced" weight="fill" />
            </div>
            <span className="text-base sm:text-lg md:text-xl font-bold text-foreground hidden xs:block">SecureChat Pro</span>
          </div>
          
          {/* Search Bar - Facebook style with better contrast */}
          <div className="hidden md:flex flex-1 max-w-xs">
            <div className="relative w-full">
              <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-foreground/80 icon-enhanced" />
              <Input
                type="text"
                placeholder="Search SecureChat"
                className="w-full pl-11 pr-4 py-2 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus:bg-card focus:ring-2 focus:ring-primary/20 facebook-input rounded-full text-sm"
              />
            </div>
          </div>
        </div>
        
        {/* Right side - Actions aligned to registration card edge */}
        <div className="flex items-center gap-1 sm:gap-2 justify-end">
          {/* Mobile Search Button with better visibility and touch target */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden min-w-[44px] min-h-[44px] w-10 h-10 rounded-full hover:bg-muted/70 text-foreground hover:text-foreground facebook-button p-0"
          >
            <MagnifyingGlass className="h-5 w-5 icon-enhanced" />
          </Button>
          
          {/* Theme and Language Switchers with better contrast and mobile touch targets */}
          <div className="flex items-center gap-1">
            <div className="min-h-[44px] flex items-center">
              <ThemeSwitcher />
            </div>
            <div className="hidden sm:flex min-h-[44px] items-center">
              <LanguageSwitcher />
            </div>
          </div>
          
          {/* Login Button with enhanced visibility and proper mobile touch target */}
          <Button
            onClick={onLoginClick}
            className="facebook-button bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-bold rounded-md shadow-md border border-primary/10 transition-all hover:shadow-lg btn-text-enhanced min-h-[44px]"
          >
            {t.signIn}
          </Button>
        </div>
      </div>
    </header>
  );
}