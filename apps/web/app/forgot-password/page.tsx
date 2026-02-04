'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

export default function ForgotPasswordPage() {
  const { user, loading, sendPasswordReset } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      router.replace('/cookbooks')
    }
  }, [loading, user, router])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email.')
      return
    }

    setError('')
    setInfo('')
    setIsSubmitting(true)
    const trimmedEmail = email.trim()
    const authError = await sendPasswordReset(trimmedEmail)
    if (authError) {
      setError(authError.message)
    } else {
      setInfo('If that email exists, a reset link has been sent.')
      setSubmittedEmail(trimmedEmail)
    }
    setIsSubmitting(false)
  }

  const handleResend = async () => {
    const targetEmail = submittedEmail || email.trim()
    if (!targetEmail) {
      setError('Please enter your email.')
      return
    }
    setError('')
    setInfo('')
    setIsResending(true)
    const authError = await sendPasswordReset(targetEmail)
    if (authError) {
      setError(authError.message)
    } else {
      setInfo('If that email exists, a reset link has been sent.')
      setSubmittedEmail(targetEmail)
    }
    setIsResending(false)
  }

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextEmail = event.target.value
    setEmail(nextEmail)
    if (submittedEmail && nextEmail.trim() !== submittedEmail) {
      setInfo('')
      setSubmittedEmail('')
    }
  }

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary">
        <div className="text-lg text-wk-text-primary font-body">Loading...</div>
      </div>
    )
  }

  // Success state - show confirmation
  if (info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-wk-bg-surface p-8 rounded-xl shadow-wk-lg space-y-8">
            <div className="text-center">
              {/* Checkmark icon */}
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-wk-success/10">
                <svg
                  className="h-8 w-8 text-wk-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-h1 text-wk-text-primary font-display">Check Your Email</h1>
              <p className="text-wk-text-secondary font-body mt-3">
                We&apos;ve sent a password reset link to{' '}
                <span className="text-wk-text-primary font-medium">{submittedEmail}</span>
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="secondary"
                onClick={handleResend}
                disabled={isResending}
                className="w-full"
              >
                {isResending ? 'Resending...' : 'Resend reset link'}
              </Button>

              <Link href="/login" className="block">
                <Button variant="ghost" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-wk-bg-surface p-8 rounded-xl shadow-wk-lg space-y-8">
          <div className="text-center">
            {/* Email/Lock icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-wk-accent/10">
              <svg
                className="h-8 w-8 text-wk-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-h1 text-wk-text-primary font-display italic">Remy</h1>
            <h2 className="text-xl text-wk-text-primary font-display mt-2">Reset Password</h2>
            <p className="text-wk-text-secondary font-body mt-3">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-wk-text-secondary font-body">Email</label>
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={handleEmailChange}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-wk-error/40 bg-wk-error/10 px-4 py-3 text-sm text-wk-error font-body">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Sending...' : 'Reset Password'}
            </Button>
          </form>

          <div className="text-center">
            <Link href="/login">
              <Button variant="ghost" className="text-sm">
                Back to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
