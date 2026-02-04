'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

const isAlreadyRegisteredError = (message: string) => {
  const lower = message.toLowerCase()
  return (
    lower.includes('already registered') ||
    lower.includes('user already registered') ||
    lower.includes('duplicate') ||
    lower.includes('email already exists')
  )
}

const normalizeAuthError = (message: string) => {
  const lower = message.toLowerCase()
  if (lower.includes('invalid email')) {
    return 'Please enter a valid email.'
  }
  if (lower.includes('uppercase')) {
    return 'Password must contain at least one uppercase letter.'
  }
  if (lower.includes('lowercase')) {
    return 'Password must contain at least one lowercase letter.'
  }
  if (lower.includes('number') || lower.includes('digit')) {
    return 'Password must contain at least one number.'
  }
  if (lower.includes('password')) {
    return 'Password must be at least 8 characters.'
  }
  return message
}

type ResendMode = 'confirmation' | null

export default function SignupPage() {
  const { user, loading, signUpWithEmail, signInWithGoogle, resendConfirmation } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [errorType, setErrorType] = useState<'generic' | 'account-exists' | null>(
    null
  )
  const [info, setInfo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendMode, setResendMode] = useState<ResendMode>(null)
  const [resendEmail, setResendEmail] = useState('')

  const isFormValid = useMemo(
    () =>
      email.trim().length > 0 &&
      password.length >= 8 &&
      confirmPassword.length >= 8,
    [email, password, confirmPassword]
  )

  useEffect(() => {
    if (!loading && user) {
      router.replace('/cookbooks')
    }
  }, [loading, user, router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    // Password validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      setErrorType('generic')
      return
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter.')
      setErrorType('generic')
      return
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter.')
      setErrorType('generic')
      return
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number.')
      setErrorType('generic')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setErrorType('generic')
      return
    }

    setError('')
    setErrorType(null)
    setInfo('')
    setResendMode(null)
    setResendEmail('')
    setIsSubmitting(true)
    const trimmedEmail = email.trim()
    const { data, error: authError } = await signUpWithEmail(
      trimmedEmail,
      password
    )
    if (authError) {
      if (isAlreadyRegisteredError(authError.message)) {
        setError('Account already exists. Log in or reset your password.')
        setErrorType('account-exists')
      } else {
        setError(normalizeAuthError(authError.message))
        setErrorType('generic')
      }
    } else if (!data.user) {
      setError('Unable to create account. Please try again.')
      setErrorType('generic')
    } else if (!data.user.identities || data.user.identities.length === 0) {
      setError('Account already exists. Log in or reset your password.')
      setErrorType('account-exists')
    } else {
      setInfo('Check your email to verify your account before logging in.')
      setResendMode('confirmation')
      setResendEmail(trimmedEmail)
    }
    setIsSubmitting(false)
  }

  const handleResend = async () => {
    if (!resendMode || !resendEmail) return
    setError('')
    setInfo('')
    setIsResending(true)

    const authError = await resendConfirmation(resendEmail)

    if (authError) {
      setError(normalizeAuthError(authError.message))
    } else {
      setInfo('Confirmation email sent. Check your inbox.')
    }
    setIsResending(false)
  }

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextEmail = event.target.value
    setEmail(nextEmail)
    if (resendEmail && nextEmail.trim() !== resendEmail) {
      setInfo('')
      setResendMode(null)
      setResendEmail('')
    }
    if (errorType === 'account-exists') {
      setError('')
      setErrorType(null)
    }
  }

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary">
        <div className="text-lg text-wk-text-primary font-body">Loading...</div>
      </div>
    )
  }

  // Success state - email confirmation sent
  if (resendMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary px-4 py-12">
        <div
          className="w-full max-w-md bg-wk-bg-surface p-8 rounded-xl shadow-wk-lg"
          data-testid="signup-card"
        >
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">📧</div>
            <h1 className="text-2xl font-display italic text-wk-text-primary">
              Check Your Email
            </h1>
            <p className="text-wk-text-secondary font-body">
              {info || 'Check your email to verify your account before logging in.'}
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <Button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              variant="secondary"
              className="w-full"
            >
              {isResending ? 'Resending...' : 'Resend confirmation email'}
            </Button>

            <div className="text-center text-sm text-wk-text-secondary font-body">
              Already verified?{' '}
              <Link
                href="/login"
                className="text-wk-accent hover:text-wk-accent-hover transition-colors"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary px-4 py-12">
      <div
        className="w-full max-w-md bg-wk-bg-surface p-8 rounded-xl shadow-wk-lg"
        data-testid="signup-card"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍳</div>
          <h1 className="text-4xl font-display italic text-wk-text-primary">
            Remy
          </h1>
          <p className="text-wk-text-secondary font-body mt-3">
            Create your account
          </p>
        </div>

        {/* Signup Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-wk-text-secondary font-body">
              Email
            </label>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={handleEmailChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-wk-text-secondary font-body">
              Password
            </label>
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-wk-text-secondary font-body">
              Confirm Password
            </label>
            <Input
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-wk-error/40 bg-wk-error/10 px-4 py-3 text-sm text-wk-error font-body">
              <span>{error}</span>
              {errorType === 'account-exists' && (
                <span className="block mt-2">
                  <Link
                    href="/forgot-password"
                    className="underline text-wk-accent hover:text-wk-accent-hover transition-colors"
                  >
                    Reset password
                  </Link>
                </span>
              )}
            </div>
          )}

          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="h-px flex-1 bg-wk-border" />
          <span className="text-xs uppercase tracking-[0.2em] text-wk-text-muted">
            or
          </span>
          <div className="h-px flex-1 bg-wk-border" />
        </div>

        {/* Google Sign Up */}
        <Button
          type="button"
          onClick={signInWithGoogle}
          variant="secondary"
          className="w-full gap-3"
        >
          <span className="text-lg">G</span>
          Continue with Google
        </Button>

        {/* Login Link */}
        <div className="text-center text-sm text-wk-text-secondary font-body mt-6">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-wk-accent hover:text-wk-accent-hover transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
