'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'

const baseInputClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none'

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
      <div className="min-h-screen flex items-center justify-center bg-[#14151a]">
        <div className="text-lg text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#14151a] px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-4xl font-serif italic text-white">Reset Password</h1>
          <p className="text-white/60 mt-3">We will email you a reset link</p>
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

          {error && (
            <div className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {info && (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {info}
            </div>
          )}

          {info && (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isResending ? 'Resending...' : 'Resend reset link'}
            </button>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#8F89FA] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#7e77f4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="text-center text-sm text-white/70">
          <Link href="/login" className="hover:text-white">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
