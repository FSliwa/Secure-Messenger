import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Globe } from '@phosphor-icons/react'
import { useLanguage } from '@/contexts/LanguageContext'
import { LanguageCode } from '@/lib/language'

const languageNames: Record<LanguageCode, string> = {
  en: 'English',
  pl: 'Polski'
}

const languageFlags: Record<LanguageCode, string> = {
  en: '🇺🇸',
  pl: '🇵🇱'
}

export function LanguageSwitcher() {
  const { currentLanguage, setLanguage } = useLanguage()
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="text-sm">
            {languageFlags[currentLanguage]} {languageNames[currentLanguage]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(languageNames).map(([code, name]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setLanguage(code as LanguageCode)}
            className="gap-2"
          >
            <span>{languageFlags[code as LanguageCode]}</span>
            <span>{name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}