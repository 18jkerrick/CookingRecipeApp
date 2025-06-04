import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UrlInput from '@/components/UrlInput'

describe('UrlInput', () => {
  test('renders input field and button', () => {
    const mockOnSubmit = jest.fn()
    render(<UrlInput onSubmit={mockOnSubmit} />)
    
    expect(screen.getByPlaceholderText('Paste recipe video URL here...')).toBeInTheDocument()
    expect(screen.getByText('Extract Recipe')).toBeInTheDocument()
  })

  test('calls onSubmit with URL when form is submitted', async () => {
    const mockOnSubmit = jest.fn()
    const user = userEvent.setup()
    
    render(<UrlInput onSubmit={mockOnSubmit} />)
    
    const input = screen.getByPlaceholderText('Paste recipe video URL here...')
    const button = screen.getByText('Extract Recipe')
    
    await user.type(input, 'https://youtube.com/watch?v=test')
    await user.click(button)
    
    expect(mockOnSubmit).toHaveBeenCalledWith('https://youtube.com/watch?v=test')
  })

  test('does not submit empty URL', async () => {
    const mockOnSubmit = jest.fn()
    const user = userEvent.setup()
    
    render(<UrlInput onSubmit={mockOnSubmit} />)
    
    const button = screen.getByText('Extract Recipe')
    await user.click(button)
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  test('trims whitespace from URL', async () => {
    const mockOnSubmit = jest.fn()
    const user = userEvent.setup()
    
    render(<UrlInput onSubmit={mockOnSubmit} />)
    
    const input = screen.getByPlaceholderText('Paste recipe video URL here...')
    const button = screen.getByText('Extract Recipe')
    
    await user.type(input, '  https://youtube.com/watch?v=test  ')
    await user.click(button)
    
    expect(mockOnSubmit).toHaveBeenCalledWith('https://youtube.com/watch?v=test')
  })
})