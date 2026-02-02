'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'

const baseInputClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none'

const normalizeAuthError = (message: string) => {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Invalid email or password.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Please verify your email before logging in.'
  }
  if (lower.includes('invalid email')) {
    return 'Please enter a valid email.'
  }
  return message
}

export default function LoginPage() {
  const { user, loading, signInWithEmail, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isFormValid = useMemo(
    () => email.trim().length > 0 && password.length >= 8,
    [email, password]
  )

  useEffect(() => {
    if (!loading && user) {
      router.replace('/cookbooks')
    }
  }, [loading, user, router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isFormValid) {
      setError('Password must be at least 8 characters.')
      return
    }

    setError('')
    setIsSubmitting(true)
    const authError = await signInWithEmail(email.trim(), password)
    if (authError) {
      setError(normalizeAuthError(authError.message))
    }
    setIsSubmitting(false)
  }

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#14151a]">
        <div className="text-lg text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#14151a] px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🍳</div>
          <h1 className="text-4xl font-serif italic text-white">Remy</h1>
          <p className="text-white/60 mt-3">Log in to your cookbooks</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-white/70">Email</label>
            <input
              type="email"
              autoComplete="email"
              className={baseInputClass}
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/70">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              className={baseInputClass}
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full rounded-xl bg-[#8F89FA] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7e77f4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="flex items-center justify-between text-sm text-white/70">
          <Link href="/forgot-password" className="hover:text-white">
            Forgot password?
          </Link>
          <Link href="/signup" className="hover:text-white">
            Create an account
          </Link>
        </div>

        <div className="flex items-center gap-4 text-white/30">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs uppercase tracking-[0.2em]">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white transition hover:bg-[#8F89FA]/80"
        >
          <span className="text-lg">G</span>
          Continue with Google
        </button>
      </div>
    </div>
  )
}
