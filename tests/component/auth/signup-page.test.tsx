import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignupPage from '@/app/signup/page'

const replace = vi.fn()
const push = vi.fn()

const authState = {
  user: null as null | { id: string },
  loading: false,
  signUpWithEmail: vi.fn(),
  resendConfirmation: vi.fn(),
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithApple: vi.fn(),
  sendPasswordReset: vi.fn(),
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
  authState.signUpWithEmail.mockResolvedValue({
    data: { user: { identities: [{}] } },
    error: null,
  })
  authState.resendConfirmation.mockResolvedValue(null)
})

afterEach(() => {
  cleanup()
})

describe('Signup page', () => {
  it('disables submit for short passwords', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'test@example.com'
    )
    await user.type(screen.getByPlaceholderText(/minimum 8 characters/i), 'short')
    await user.type(screen.getByPlaceholderText(/re-enter password/i), 'short')

    expect(
      screen.getByRole('button', { name: /create account/i })
    ).toBeDisabled()
    expect(authState.signUpWithEmail).not.toHaveBeenCalled()
  })

  it('requires an uppercase letter', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'test@example.com'
    )
    await user.type(
      screen.getByPlaceholderText(/minimum 8 characters/i),
      'password1'
    )
    await user.type(
      screen.getByPlaceholderText(/re-enter password/i),
      'password1'
    )
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      await screen.findByText(/uppercase letter/i)
    ).toBeInTheDocument()
    expect(authState.signUpWithEmail).not.toHaveBeenCalled()
  })

  it('requires a lowercase letter', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'test@example.com'
    )
    await user.type(
      screen.getByPlaceholderText(/minimum 8 characters/i),
      'PASSWORD1'
    )
    await user.type(
      screen.getByPlaceholderText(/re-enter password/i),
      'PASSWORD1'
    )
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      await screen.findByText(/lowercase letter/i)
    ).toBeInTheDocument()
    expect(authState.signUpWithEmail).not.toHaveBeenCalled()
  })

  it('requires a number', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'test@example.com'
    )
    await user.type(
      screen.getByPlaceholderText(/minimum 8 characters/i),
      'Password'
    )
    await user.type(
      screen.getByPlaceholderText(/re-enter password/i),
      'Password'
    )
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/one number/i)).toBeInTheDocument()
    expect(authState.signUpWithEmail).not.toHaveBeenCalled()
  })

  it('requires matching passwords', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'test@example.com'
    )
    await user.type(
      screen.getByPlaceholderText(/minimum 8 characters/i),
      'Password1'
    )
    await user.type(
      screen.getByPlaceholderText(/re-enter password/i),
      'Password2'
    )
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument()
    expect(authState.signUpWithEmail).not.toHaveBeenCalled()
  })

  it('shows success state and resend option on new signup', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'test@example.com'
    )
    await user.type(
      screen.getByPlaceholderText(/minimum 8 characters/i),
      'Password1'
    )
    await user.type(
      screen.getByPlaceholderText(/re-enter password/i),
      'Password1'
    )
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      await screen.findByText(/check your email to verify/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /resend confirmation email/i })
    ).toBeInTheDocument()
  })

  it('shows account exists error when identities are empty', async () => {
    const user = userEvent.setup()
    authState.signUpWithEmail.mockResolvedValue({
      data: { user: { identities: [] } },
      error: null,
    })

    render(<SignupPage />)

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'test@example.com'
    )
    await user.type(
      screen.getByPlaceholderText(/minimum 8 characters/i),
      'Password1'
    )
    await user.type(
      screen.getByPlaceholderText(/re-enter password/i),
      'Password1'
    )
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      await screen.findByText(/account already exists/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /reset password/i })
    ).toHaveAttribute('href', '/forgot-password')
  })

  it('resends confirmation email after success', async () => {
    const user = userEvent.setup()
    render(<SignupPage />)

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'test@example.com'
    )
    await user.type(
      screen.getByPlaceholderText(/minimum 8 characters/i),
      'Password1'
    )
    await user.type(
      screen.getByPlaceholderText(/re-enter password/i),
      'Password1'
    )
    await user.click(screen.getByRole('button', { name: /create account/i }))

    const resendButton = await screen.findByRole('button', {
      name: /resend confirmation email/i,
    })
    await user.click(resendButton)

    expect(authState.resendConfirmation).toHaveBeenCalledWith('test@example.com')
    expect(
      await screen.findByText(/confirmation email sent/i)
    ).toBeInTheDocument()
  })

  it('clears account-exists error on email change', async () => {
    const user = userEvent.setup()
    authState.signUpWithEmail.mockResolvedValue({
      data: { user: { identities: [] } },
      error: null,
    })

    render(<SignupPage />)

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'test@example.com'
    )
    await user.type(
      screen.getByPlaceholderText(/minimum 8 characters/i),
      'Password1'
    )
    await user.type(
      screen.getByPlaceholderText(/re-enter password/i),
      'Password1'
    )
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(
      await screen.findByText(/account already exists/i)
    ).toBeInTheDocument()

    await user.clear(screen.getByPlaceholderText(/you@example.com/i))
    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'new@example.com'
    )

    expect(
      screen.queryByText(/account already exists/i)
    ).not.toBeInTheDocument()
  })
})
