'use client'

import { useTheme } from '../../hooks/useTheme'
import { Sun, Moon } from 'lucide-react'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { isDark, toggleTheme, mounted } = useTheme()

  // Render placeholder during SSR to prevent layout shift
  if (!mounted) {
    return (
      <div 
        data-placeholder
        className={`w-10 h-10 ${className}`}
        aria-hidden="true"
      />
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        p-2 rounded-lg
        text-wk-text-secondary hover:text-wk-accent
        hover:bg-wk-bg-surface-hover
        transition-colors duration-200
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wk-accent
        ${className}
      `}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  )
}
