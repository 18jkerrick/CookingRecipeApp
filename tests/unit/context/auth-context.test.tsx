import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const push = vi.fn()
const replace = vi.fn()

const authCallbackRef = vi.hoisted(() => ({
  current: null as null | ((event: string, session: any) => void),
}))

const supabaseAuth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  resend: vi.fn(),
  onAuthStateChange: vi.fn((callback: any) => {
    authCallbackRef.current = callback
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
}))

vi.mock('@acme/db/client', () => ({
  supabase: {
    auth: supabaseAuth,
  },
}))

import { AuthProvider, useAuth } from '@/context/AuthContext'

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

beforeEach(() => {
  vi.clearAllMocks()
  authCallbackRef.current = null
  supabaseAuth.getSession.mockResolvedValue({ data: { session: null } })
  supabaseAuth.signInWithPassword.mockResolvedValue({ error: null })
  supabaseAuth.signUp.mockResolvedValue({ data: { user: null }, error: null })
  supabaseAuth.resetPasswordForEmail.mockResolvedValue({ error: null })
  supabaseAuth.updateUser.mockResolvedValue({ error: null })
  supabaseAuth.signInWithOAuth.mockResolvedValue({ error: null })
  supabaseAuth.resend.mockResolvedValue({ error: null })
})

describe('AuthContext', () => {
  it('calls signInWithPassword with email and password', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signInWithEmail('user@example.com', 'Password1')
    })

    expect(supabaseAuth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Password1',
    })
  })

  it('uses emailRedirectTo on signUpWithEmail', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signUpWithEmail('user@example.com', 'Password1')
    })

    expect(supabaseAuth.signUp).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Password1',
      options: {
        emailRedirectTo: expect.stringMatching(/localhost(:3000)?\/login$/),
      },
    })
  })

  it('uses redirectTo on password reset', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.sendPasswordReset('user@example.com')
    })

    expect(supabaseAuth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      {
        redirectTo: expect.stringMatching(/localhost(:3000)?\/reset-password$/),
      }
    )
  })

  it('resends signup confirmation with redirect', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.resendConfirmation('user@example.com')
    })

    expect(supabaseAuth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'user@example.com',
      options: {
        emailRedirectTo: expect.stringMatching(/localhost(:3000)?\/login$/),
      },
    })
  })

  it('signs in with Google OAuth and redirect', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      await result.current.signInWithGoogle()
    })

    expect(supabaseAuth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.stringMatching(/localhost(:3000)?\/login$/),
      },
    })
  })

  it('pushes to cookbooks on SIGNED_IN event', async () => {
    renderHook(() => useAuth(), { wrapper })

    await act(async () => {
      authCallbackRef.current?.('SIGNED_IN', { user: { id: 'user-1' } })
    })

    expect(push).toHaveBeenCalledWith('/cookbooks')
  })
})
