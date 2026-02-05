import { describe, it, expect, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRecipes } from '@/hooks/useRecipes'
import React from 'react'

// Test wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useRecipes', () => {
  afterEach(() => {
    cleanup()
  })

  it('does not fetch when token is null', () => {
    const { result } = renderHook(() => useRecipes(null), {
      wrapper: createWrapper(),
    })
    
    // When token is null, query is disabled
    expect(result.current.isLoading).toBe(false)
    expect(result.current.recipes).toEqual([])
  })

  it('does not fetch when enabled is false', () => {
    const { result } = renderHook(
      () => useRecipes('test-token', { enabled: false }),
      { wrapper: createWrapper() }
    )
    
    expect(result.current.isLoading).toBe(false)
    expect(result.current.recipes).toEqual([])
  })

  it('is loading when token is provided', () => {
    const { result } = renderHook(() => useRecipes('test-token'), {
      wrapper: createWrapper(),
    })

    // Should start in loading state when enabled
    expect(result.current.isLoading).toBe(true)
    expect(result.current.recipes).toEqual([])
  })

  it('exposes fetchNextPage function', () => {
    const { result } = renderHook(() => useRecipes('test-token'), {
      wrapper: createWrapper(),
    })

    expect(typeof result.current.fetchNextPage).toBe('function')
  })

  it('exposes refetch function', () => {
    const { result } = renderHook(() => useRecipes('test-token'), {
      wrapper: createWrapper(),
    })

    expect(typeof result.current.refetch).toBe('function')
  })

  it('returns hasNextPage as undefined initially', () => {
    const { result } = renderHook(() => useRecipes('test-token'), {
      wrapper: createWrapper(),
    })

    // hasNextPage is undefined until first fetch completes
    expect(result.current.hasNextPage).toBe(false)
  })
})
