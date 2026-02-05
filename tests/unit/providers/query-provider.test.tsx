import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { QueryProvider } from '@/providers/QueryProvider'

function TestComponent() {
  const { data, isSuccess } = useQuery({
    queryKey: ['test'],
    queryFn: async () => {
      return 'test-data'
    },
  })
  return (
    <div>
      <div data-testid="result">{data}</div>
      <div data-testid="status">{isSuccess ? 'success' : 'loading'}</div>
    </div>
  )
}

describe('QueryProvider', () => {
  it('provides QueryClient to children', async () => {
    render(
      <QueryProvider>
        <TestComponent />
      </QueryProvider>
    )
    
    // Wait for query to succeed
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('success')
    })
    
    expect(screen.getByTestId('result').textContent).toBe('test-data')
  })
})
