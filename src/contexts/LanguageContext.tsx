import React, { createContext, useContext, useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { languages, LanguageCode, LanguageContent } from '@/lib/language'

interface LanguageContextType {
  currentLanguage: LanguageCode
  setLanguage: (lang: LanguageCode) => void
  t: LanguageContent
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [savedLanguage, setSavedLanguage] = useKV<LanguageCode>('app-language', 'en')
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(savedLanguage || 'en')
  
  // Sync state when saved language changes
  useEffect(() => {
    if (savedLanguage && savedLanguage !== currentLanguage) {
      setCurrentLanguage(savedLanguage)
    }
  }, [savedLanguage])
  
  const setLanguage = (lang: LanguageCode) => {
    setCurrentLanguage(lang)
    setSavedLanguage(lang)
    
    // Force re-render by updating the entire component tree
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }))
    }, 0)
  }
  
  const t = languages[currentLanguage] || languages.en
  
  return (
    <LanguageContext.Provider value={{ 
      currentLanguage, 
      setLanguage, 
      t 
    }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}