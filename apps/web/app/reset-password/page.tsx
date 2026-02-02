'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'

const baseInputClass =
  'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none'

export default function ResetPasswordPage() {
  const { user, loading, updatePassword } = useAuth()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isFormValid = useMemo(
    () => password.length >= 8 && confirmPassword.length >= 8,
    [password, confirmPassword]
  )

  useEffect(() => {
    if (!loading && user) {
      setInfo('Set your new password below.')
    }
  }, [loading, user])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isFormValid) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError('')
    setIsSubmitting(true)
    const authError = await updatePassword(password)
    if (authError) {
      setError(authError.message)
    } else {
      router.replace('/cookbooks')
    }
    setIsSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#14151a]">
        <div className="text-lg text-white">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#14151a] px-4 py-12">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="text-6xl">⚠️</div>
          <h1 className="text-3xl font-serif italic text-white">
            Reset link expired
          </h1>
          <p className="text-white/60">
            Request a new reset link to continue.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center rounded-xl bg-[#8F89FA] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#7e77f4]"
          >
            Get a new link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#14151a] px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🔑</div>
          <h1 className="text-4xl font-serif italic text-white">New Password</h1>
          <p className="text-white/60 mt-3">
            Choose a new password for your account
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-white/70">New Password</label>
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

          {info && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              {info}
            </div>
          )}

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
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
