import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UrlInput from '@/components/shared/UrlInput'

describe('UrlInput', () => {
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    mockOnSubmit.mockClear()
  })

  test('renders input field and button', () => {
    render(<UrlInput onSubmit={mockOnSubmit} />)
    
    expect(screen.getByPlaceholderText('Enter TikTok, YouTube, or Instagram URL')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Extract Recipe \(Full Analysis\)/ })).toBeInTheDocument()
  })

  test('renders fast mode checkbox', () => {
    render(<UrlInput onSubmit={mockOnSubmit} />)
    
    expect(screen.getByLabelText(/Fast Mode \(Captions Only\)/)).toBeInTheDocument()
    expect(screen.getByText('Skip audio/video analysis for faster results')).toBeInTheDocument()
  })

  test('calls onSubmit with URL when form is submitted in full mode', () => {
    render(<UrlInput onSubmit={mockOnSubmit} />)
    
    const input = screen.getByPlaceholderText('Enter TikTok, YouTube, or Instagram URL')
    const button = screen.getByRole('button')
    
    fireEvent.change(input, { target: { value: 'https://tiktok.com/@user/video/123' } })
    fireEvent.click(button)
    
    expect(mockOnSubmit).toHaveBeenCalledWith('https://tiktok.com/@user/video/123', false)
  })

  test('calls onSubmit with fast mode enabled when checkbox is checked', () => {
    render(<UrlInput onSubmit={mockOnSubmit} />)
    
    const input = screen.getByPlaceholderText('Enter TikTok, YouTube, or Instagram URL')
    const checkbox = screen.getByLabelText(/Fast Mode \(Captions Only\)/)
    const button = screen.getByRole('button')
    
    fireEvent.change(input, { target: { value: 'https://youtube.com/watch?v=123' } })
    fireEvent.click(checkbox)
    fireEvent.click(button)
    
    expect(mockOnSubmit).toHaveBeenCalledWith('https://youtube.com/watch?v=123', true)
  })

  test('updates button text based on fast mode selection', () => {
    render(<UrlInput onSubmit={mockOnSubmit} />)
    
    const checkbox = screen.getByLabelText(/Fast Mode \(Captions Only\)/)
    const button = screen.getByRole('button')
    
    // Initially should show full analysis
    expect(button).toHaveTextContent('Extract Recipe (Full Analysis)')
    
    // After checking fast mode
    fireEvent.click(checkbox)
    expect(button).toHaveTextContent('Extract Recipe (Fast)')
    
    // After unchecking
    fireEvent.click(checkbox)
    expect(button).toHaveTextContent('Extract Recipe (Full Analysis)')
  })

  test('prevents submission with empty URL', () => {
    render(<UrlInput onSubmit={mockOnSubmit} />)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  test('trims whitespace from URL before submission', () => {
    render(<UrlInput onSubmit={mockOnSubmit} />)
    
    const input = screen.getByPlaceholderText('Enter TikTok, YouTube, or Instagram URL')
    const button = screen.getByRole('button')
    
    fireEvent.change(input, { target: { value: '  https://tiktok.com/@user/video/123  ' } })
    fireEvent.click(button)
    
    expect(mockOnSubmit).toHaveBeenCalledWith('https://tiktok.com/@user/video/123', false)
  })
})