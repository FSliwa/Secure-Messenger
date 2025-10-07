import React, { createContext, useContext, useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [storedTheme, setStoredTheme] = useKV<Theme>('app-theme', 'system')
  const [theme, setTheme] = useState<Theme>(storedTheme || 'system')
  const [isDark, setIsDark] = useState(false)

  // Sync with stored theme
  useEffect(() => {
    if (storedTheme) {
      setTheme(storedTheme)
    }
  }, [storedTheme])

  // Calculate if we should use dark mode
  useEffect(() => {
    const calculateIsDark = () => {
      if (theme === 'dark') return true
      if (theme === 'light') return false
      
      // System preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    setIsDark(calculateIsDark())

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        setIsDark(mediaQuery.matches)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [isDark])

  const updateTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    setStoredTheme(newTheme)
  }

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme: updateTheme,
      isDark
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}