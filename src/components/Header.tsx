import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useLanguage } from '@/contexts/LanguageContext';

interface HeaderProps {
  onLoginClick?: () => void;
}

export function Header({ onLoginClick }: HeaderProps) {
  const { t } = useLanguage()
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 max-w-screen-xl items-center justify-between px-6">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-foreground">SecureChat</span>
          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full font-medium">PRO</span>
        </div>
        
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <LanguageSwitcher />
          <Button 
            variant="ghost" 
            className="text-primary hover:text-primary hover:bg-primary/10"
            onClick={onLoginClick}
          >
            {t.signIn}
          </Button>
        </div>
      </div>
    </header>
  );
}