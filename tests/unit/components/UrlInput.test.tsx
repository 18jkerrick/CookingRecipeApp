import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UrlInput from '@/components/shared/UrlInput'

describe('UrlInput', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders input field and button', () => {
    render(<UrlInput onSubmit={vi.fn()} />)

    expect(
      screen.getByPlaceholderText('Enter TikTok, YouTube, or Instagram URL')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Extract Recipe (Full Analysis)' })
    ).toBeInTheDocument()
  })

  it('renders fast mode checkbox and helper text', () => {
    render(<UrlInput onSubmit={vi.fn()} />)

    expect(
      screen.getByRole('checkbox', { name: /fast mode/i })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Skip audio/video analysis for faster results')
    ).toBeInTheDocument()
  })

  it('calls onSubmit with URL in full mode', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<UrlInput onSubmit={onSubmit} />)

    await user.type(
      screen.getByPlaceholderText('Enter TikTok, YouTube, or Instagram URL'),
      'https://tiktok.com/@user/video/123'
    )
    await user.click(
      screen.getByRole('button', { name: 'Extract Recipe (Full Analysis)' })
    )

    expect(onSubmit).toHaveBeenCalledWith(
      'https://tiktok.com/@user/video/123',
      false
    )
  })

  it('calls onSubmit with fast mode enabled', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<UrlInput onSubmit={onSubmit} />)

    await user.type(
      screen.getByPlaceholderText('Enter TikTok, YouTube, or Instagram URL'),
      'https://youtube.com/watch?v=123'
    )
    await user.click(screen.getByRole('checkbox', { name: /fast mode/i }))
    await user.click(
      screen.getByRole('button', { name: 'Extract Recipe (Fast)' })
    )

    expect(onSubmit).toHaveBeenCalledWith(
      'https://youtube.com/watch?v=123',
      true
    )
  })

  it('updates button text when fast mode toggles', async () => {
    const user = userEvent.setup()
    render(<UrlInput onSubmit={vi.fn()} />)

    const checkbox = screen.getByRole('checkbox', { name: /fast mode/i })

    expect(
      screen.getByRole('button', { name: 'Extract Recipe (Full Analysis)' })
    ).toBeInTheDocument()

    await user.click(checkbox)
    expect(
      screen.getByRole('button', { name: 'Extract Recipe (Fast)' })
    ).toBeInTheDocument()

    await user.click(checkbox)
    expect(
      screen.getByRole('button', { name: 'Extract Recipe (Full Analysis)' })
    ).toBeInTheDocument()
  })

  it('does not submit when URL is empty', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<UrlInput onSubmit={onSubmit} />)

    await user.click(
      screen.getByRole('button', { name: 'Extract Recipe (Full Analysis)' })
    )

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('trims whitespace from URL before submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<UrlInput onSubmit={onSubmit} />)

    await user.type(
      screen.getByPlaceholderText('Enter TikTok, YouTube, or Instagram URL'),
      '  https://tiktok.com/@user/video/123  '
    )
    await user.click(
      screen.getByRole('button', { name: 'Extract Recipe (Full Analysis)' })
    )

    expect(onSubmit).toHaveBeenCalledWith(
      'https://tiktok.com/@user/video/123',
      false
    )
  })
})
