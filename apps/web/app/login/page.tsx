'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

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
      <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary">
        <div className="text-lg text-wk-text-primary font-body">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary px-4 py-12">
      <div className="w-full max-w-md">
        <div
          data-testid="login-card"
          className="bg-wk-bg-surface p-8 rounded-xl shadow-wk-lg space-y-8"
        >
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-wk-accent rounded-full p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="/chefs-hat-logo.svg" 
                  alt="Remy Logo" 
                  className="h-24 w-24"
                />
              </div>
            </div>
            <h1 className="text-4xl font-display italic text-wk-text-primary">Remy</h1>
            <p className="text-wk-text-secondary font-body mt-3">Log in to your cookbooks</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-wk-text-secondary font-body">Email</label>
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-wk-text-secondary font-body">Password</label>
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-wk-error/40 bg-wk-error/10 px-4 py-3 text-sm text-wk-error font-body">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Logging in...' : 'Log In'}
            </Button>
          </form>

          <div className="flex items-center justify-between text-sm">
            <Link
              href="/forgot-password"
              className="text-wk-text-secondary hover:text-wk-accent transition-colors"
            >
              Forgot password?
            </Link>
            <Link
              href="/signup"
              className="text-wk-text-secondary hover:text-wk-accent transition-colors"
            >
              Create an account
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-wk-border" />
            <span className="text-xs uppercase tracking-[0.2em] text-wk-text-muted">or</span>
            <div className="h-px flex-1 bg-wk-border" />
          </div>

          <Button
            variant="secondary"
            onClick={signInWithGoogle}
            className="w-full"
          >
            <span className="text-lg mr-2">G</span>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  )
}
