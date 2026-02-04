import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResetPasswordPage from '@/app/reset-password/page'

const replace = vi.fn()
const push = vi.fn()

const authState = {
  user: null as null | { id: string },
  loading: false,
  updatePassword: vi.fn(),
  sendPasswordReset: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithApple: vi.fn(),
  signUpWithEmail: vi.fn(),
  resendConfirmation: vi.fn(),
  signOut: vi.fn(),
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('../../../apps/web/context/AuthContext', () => ({
  useAuth: () => authState,
}))

beforeEach(() => {
  vi.clearAllMocks()
  authState.user = null
  authState.loading = false
  authState.updatePassword.mockResolvedValue(null)
})

afterEach(() => {
  cleanup()
})

describe('Reset password page', () => {
  it('shows expired state when user is missing', () => {
    render(<ResetPasswordPage />)

    expect(screen.getByText(/reset link expired/i)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /get a new link/i })
    ).toHaveAttribute('href', '/forgot-password')
  })

  it('shows form when user is present', async () => {
    authState.user = { id: 'user-1' }
    render(<ResetPasswordPage />)

    // The heading says "New Password"
    expect(
      await screen.findByRole('heading', { name: /new password/i })
    ).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(/enter your new password/i)
    ).toBeInTheDocument()
  })

  it('validates password mismatch', async () => {
    const user = userEvent.setup()
    authState.user = { id: 'user-1' }
    render(<ResetPasswordPage />)

    await user.type(
      screen.getByPlaceholderText(/enter your new password/i),
      'Password1'
    )
    await user.type(
      screen.getByPlaceholderText(/re-enter your password/i),
      'Password2'
    )
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
    expect(authState.updatePassword).not.toHaveBeenCalled()
  })

  it('updates password and shows success state', async () => {
    const user = userEvent.setup()
    authState.user = { id: 'user-1' }
    render(<ResetPasswordPage />)

    await user.type(
      screen.getByPlaceholderText(/enter your new password/i),
      'Password1'
    )
    await user.type(
      screen.getByPlaceholderText(/re-enter your password/i),
      'Password1'
    )
    await user.click(screen.getByRole('button', { name: /reset password/i }))

    expect(authState.updatePassword).toHaveBeenCalledWith('Password1')
    // New implementation shows success state instead of immediate redirect
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument()
  })
})
