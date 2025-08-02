import React, { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system')
  const [isDark, setIsDark] = useState(false)
  const { profile, updateProfile } = useAuth()

  // Initialize theme from user profile or localStorage
  useEffect(() => {
    const initTheme = () => {
      if (profile?.theme_preference) {
        setThemeState(profile.theme_preference as ThemeMode)
      } else {
        const savedTheme = localStorage.getItem('tickets_theme') as ThemeMode
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
          setThemeState(savedTheme)
        }
      }
    }

    initTheme()
  }, [profile])

  // Update dark mode based on theme preference
  useEffect(() => {
    const updateDarkMode = () => {
      if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setIsDark(prefersDark)
      } else {
        setIsDark(theme === 'dark')
      }
    }

    updateDarkMode()

    // Listen for system theme changes when using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => updateDarkMode()
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
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

  const setTheme = async (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    
    // Save to localStorage
    localStorage.setItem('tickets_theme', newTheme)
    
    // Update user profile if logged in
    if (profile) {
      try {
        await updateProfile({ theme_preference: newTheme })
      } catch (error) {
        console.error('Failed to update theme preference:', error)
      }
    }
  }

  const value = {
    theme,
    setTheme,
    isDark
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}