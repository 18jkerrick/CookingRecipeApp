import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ForgotPasswordPage from '@/app/forgot-password/page'

const replace = vi.fn()
const push = vi.fn()

const authState = {
  user: null as null | { id: string },
  loading: false,
  sendPasswordReset: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithApple: vi.fn(),
  signUpWithEmail: vi.fn(),
  resendConfirmation: vi.fn(),
  updatePassword: vi.fn(),
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
  authState.sendPasswordReset.mockResolvedValue(null)
})

afterEach(() => {
  cleanup()
})

describe('Forgot password page', () => {
  it('requires an email address', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)

    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(
      await screen.findByText(/please enter your email/i)
    ).toBeInTheDocument()
    expect(authState.sendPasswordReset).not.toHaveBeenCalled()
  })

  it('shows confirmation and resend option after success', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'test@example.com'
    )
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(
      await screen.findByText(/reset link has been sent/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /resend reset link/i })
    ).toBeInTheDocument()
  })

  it('resends reset link when requested', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'test@example.com'
    )
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    const resendButton = await screen.findByRole('button', {
      name: /resend reset link/i,
    })
    await user.click(resendButton)

    expect(authState.sendPasswordReset).toHaveBeenCalledWith('test@example.com')
  })

  it('clears info state when email changes', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'test@example.com'
    )
    await user.click(screen.getByRole('button', { name: /send reset link/i }))

    expect(
      await screen.findByText(/reset link has been sent/i)
    ).toBeInTheDocument()

    await user.clear(screen.getByPlaceholderText(/you@example.com/i))
    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'new@example.com'
    )

    expect(
      screen.queryByText(/reset link has been sent/i)
    ).not.toBeInTheDocument()
  })
})
