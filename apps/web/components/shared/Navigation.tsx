'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { Button } from '../ui/button'
import { Settings } from 'lucide-react'
import Link from 'next/link'

interface NavigationProps {
  currentPath?: string // Optional override for active state
}

const navLinks = [
  { href: '/cookbooks', label: 'Cookbook' },
  { href: '/meal-planner', label: 'Meal Planner' },
  { href: '/grocery-list', label: 'Grocery Lists' },
]

export function Navigation({ currentPath }: NavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const activePath = currentPath ?? pathname

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <header className="bg-wk-bg-surface shadow-wk sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Left: Logo */}
        <Link href="/cookbooks" className="flex items-center gap-2 group">
          <div className="bg-wk-accent rounded-full p-1 transition-transform duration-200 group-hover:scale-105">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/chefs-hat-logo.svg" 
              alt="Remy Logo" 
              className="h-8 w-8"
            />
          </div>
          <span className="text-2xl font-display italic text-wk-text-primary">
            Remy
          </span>
        </Link>

        {/* Center: Nav links (hidden on mobile) */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = activePath === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  relative py-2 text-base font-medium font-body transition-colors duration-200
                  ${isActive 
                    ? 'text-wk-accent' 
                    : 'text-wk-text-secondary hover:text-wk-text-primary'
                  }
                `}
              >
                {link.label}
                {isActive && (
                  <span 
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-wk-accent rounded-full"
                    aria-hidden="true"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right: Welcome, ThemeToggle, Settings, Sign Out */}
        <div className="flex items-center gap-2">
          {user?.email && (
            <span className="text-sm text-wk-text-secondary font-body hidden sm:block">
              Welcome, {user.email.split('@')[0]}
            </span>
          )}
          
          <ThemeToggle />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/settings')}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  )
}
