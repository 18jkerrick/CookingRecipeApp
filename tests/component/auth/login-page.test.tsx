import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from '@/app/login/page'

const replace = vi.fn()
const push = vi.fn()

const authState = {
  user: null as null | { id: string },
  loading: false,
  signInWithEmail: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithApple: vi.fn(),
  signUpWithEmail: vi.fn(),
  resendConfirmation: vi.fn(),
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
  authState.signInWithEmail.mockResolvedValue(null)
})

afterEach(() => {
  cleanup()
})

describe('Login page', () => {
  it('renders the login form when unauthenticated', () => {
    render(<LoginPage />)

    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: /continue with google/i })
    ).toBeInTheDocument()
  })

  it('disables submit for short passwords', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'test@example.com'
    )
    await user.type(screen.getByPlaceholderText('••••••••'), 'short')
    const submitButton = screen.getByRole('button', { name: /log in/i })

    expect(submitButton).toBeDisabled()

    expect(authState.signInWithEmail).not.toHaveBeenCalled()
  })

  it('calls signInWithEmail with trimmed email', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      '  test@example.com  '
    )
    await user.type(screen.getByPlaceholderText('••••••••'), 'password1')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(authState.signInWithEmail).toHaveBeenCalledWith(
      'test@example.com',
      'password1'
    )
  })

  it('normalizes invalid credential errors', async () => {
    const user = userEvent.setup()
    authState.signInWithEmail.mockResolvedValue({
      message: 'Invalid login credentials',
    })
    render(<LoginPage />)

    await user.type(
      screen.getByPlaceholderText(/you@example.com/i),
      'test@example.com'
    )
    await user.type(screen.getByPlaceholderText('••••••••'), 'password1')
    await user.click(screen.getByRole('button', { name: /log in/i }))

    expect(
      await screen.findByText(/invalid email or password/i)
    ).toBeInTheDocument()
  })

  it('shows a loading state when auth is loading', () => {
    authState.loading = true
    render(<LoginPage />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})
