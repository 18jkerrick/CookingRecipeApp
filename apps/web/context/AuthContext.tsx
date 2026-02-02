'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { AuthError, User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { supabase } from '@acme/db/client'

type SignUpResult = Awaited<ReturnType<typeof supabase.auth.signUp>>

interface AuthContextType {
  user: User | null
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<AuthError | null>
  signUpWithEmail: (email: string, password: string) => Promise<SignUpResult>
  sendPasswordReset: (email: string) => Promise<AuthError | null>
  resendConfirmation: (email: string) => Promise<AuthError | null>
  updatePassword: (password: string) => Promise<AuthError | null>
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
        router.push('/cookbooks')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const getRedirectUrl = (path: string) =>
    typeof window !== 'undefined' ? `${window.location.origin}${path}` : undefined

  const signInWithGoogle = async () => {
    const redirectTo = getRedirectUrl('/login')
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

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return error
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const emailRedirectTo = getRedirectUrl('/login')
    return await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    })
  }

  const sendPasswordReset = async (email: string) => {
    const redirectTo = getRedirectUrl('/reset-password')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })
    return error
  }

  const resendConfirmation = async (email: string) => {
    const emailRedirectTo = getRedirectUrl('/login')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo },
    })
    return error
  }

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    return error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    resendConfirmation,
    updatePassword,
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