'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { supabase } from '@acme/db/client'
import { getLastVisitedPage } from '../hooks/useNavigationPersistence'

interface AuthContextType {
  user: User | null
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signOut: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (event === 'SIGNED_IN' && session?.user) {
        router.push(getLastVisitedPage())
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const signInWithGoogle = async () => {
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  const signInWithApple = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    signInWithGoogle,
    signInWithApple,
    signOut,
    loading: loading || !isClient,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 