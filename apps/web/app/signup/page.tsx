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

const baseInputClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none'

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
  const { user, loading, signUpWithEmail, resendConfirmation } = useAuth()
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
          <h1 className="text-4xl font-serif italic text-white">Create Account</h1>
          <p className="text-white/60 mt-3">
            Sign up with email and password
          </p>
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
              onChange={handleEmailChange}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/70">Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className={baseInputClass}
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/70">Confirm Password</label>
            <input
              type="password"
              autoComplete="new-password"
              className={baseInputClass}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              <span>{error}</span>
              {errorType === 'account-exists' && (
                <span className="block mt-2">
                  <Link href="/forgot-password" className="underline hover:text-white">
                    Reset password
                  </Link>
                </span>
              )}
            </div>
          )}

          {info && (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {info}
            </div>
          )}

          {resendMode && (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResending ? 'Resending...' : 'Resend confirmation email'}
            </button>
          )}

          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full rounded-xl bg-[#8F89FA] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7e77f4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="text-center text-sm text-white/70">
          Already have an account?{' '}
          <Link href="/login" className="hover:text-white">
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
