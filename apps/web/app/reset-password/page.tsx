'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'

export default function ResetPasswordPage() {
  const { user, loading, updatePassword } = useAuth()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isFormValid = useMemo(
    () => password.length >= 8 && confirmPassword.length >= 8,
    [password, confirmPassword]
  )

  useEffect(() => {
    if (!loading && user) {
      // User is authenticated via reset link - ready to set new password
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
      setSuccess(true)
    }
    setIsSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary">
        <div className="text-lg text-wk-text-primary font-body">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary px-4 py-12">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-wk-bg-surface p-8 rounded-xl shadow-wk-lg space-y-6 text-center">
            <h1 className="text-4xl font-display italic text-wk-text-primary">Remy</h1>
            <div className="space-y-2">
              <h2 className="text-h1 text-wk-text-primary font-display">Reset link expired</h2>
              <p className="text-wk-text-secondary font-body">
                Request a new reset link to continue.
              </p>
            </div>
            <Link href="/forgot-password" className="block">
              <Button className="w-full">Get a new link</Button>
            </Link>
            <Link
              href="/login"
              className="block text-sm text-wk-text-secondary hover:text-wk-accent transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary px-4 py-12">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-wk-bg-surface p-8 rounded-xl shadow-wk-lg space-y-6 text-center">
            <h1 className="text-4xl font-display italic text-wk-text-primary">Remy</h1>
            <div className="space-y-2">
              <h2 className="text-h1 text-wk-text-primary font-display">Password updated</h2>
              <p className="text-wk-text-secondary font-body">
                Your password has been successfully reset.
              </p>
            </div>
            <Link href="/cookbooks" className="block">
              <Button className="w-full">Go to Cookbooks</Button>
            </Link>
            <Link
              href="/login"
              className="block text-sm text-wk-text-secondary hover:text-wk-accent transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-wk-bg-primary px-4 py-12">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-wk-bg-surface p-8 rounded-xl shadow-wk-lg space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-display italic text-wk-text-primary">Remy</h1>
            <h2 className="text-h1 text-wk-text-primary font-display mt-4">New Password</h2>
            <p className="text-wk-text-secondary font-body mt-2">
              Choose a new password for your account
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm text-wk-text-secondary font-body">New Password</label>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="Enter your new password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <p className="text-wk-text-muted text-sm font-body">
                Must be at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-wk-text-secondary font-body">Confirm Password</label>
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
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
              {isSubmitting ? 'Updating...' : 'Reset Password'}
            </Button>
          </form>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-wk-text-secondary hover:text-wk-accent transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
