import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { useRecipes } from '@/hooks/useRecipes'

/**
 * Test that the onUpdate callback pattern used in cookbooks page works correctly.
 * 
 * This test ensures that after migrating to React Query, the onUpdate callback
 * uses refetch() instead of the removed setRecipes() function.
 * 
 * Regression test for: ReferenceError: setRecipes is not defined
 */
describe('Cookbooks page callbacks', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    server.resetHandlers()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('useRecipes exposes refetch function for onUpdate callback', async () => {
    // Setup MSW handler
    server.use(
      http.get('*/api/recipes', () => {
        return HttpResponse.json({
          recipes: [{ id: '1', title: 'Test Recipe' }],
          nextCursor: null,
          hasMore: false,
        })
      })
    )

    const { result } = renderHook(() => useRecipes('test-token'), { wrapper })

    // Verify refetch is exposed and is a function
    expect(result.current.refetch).toBeDefined()
    expect(typeof result.current.refetch).toBe('function')
  })

  it('refetch can be called without errors (simulates onUpdate callback)', async () => {
    let fetchCount = 0
    
    // Setup MSW handler that tracks calls
    server.use(
      http.get('*/api/recipes', () => {
        fetchCount++
        return HttpResponse.json({
          recipes: [{ id: '1', title: 'Test Recipe' }],
          nextCursor: null,
          hasMore: false,
        })
      })
    )

    const { result } = renderHook(() => useRecipes('test-token'), { wrapper })

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Simulate what onUpdate does: call refetch
    // This should not throw "setRecipes is not defined"
    await act(async () => {
      await result.current.refetch()
    })

    // Verify refetch was called (fetch should be called twice: initial + refetch)
    expect(fetchCount).toBeGreaterThanOrEqual(2)
  })

  it('recipes are updated after refetch (simulates edit flow)', async () => {
    let fetchCount = 0
    
    // Setup MSW handler that returns different data on subsequent calls
    server.use(
      http.get('*/api/recipes', () => {
        fetchCount++
        const title = fetchCount === 1 ? 'Original Title' : 'Updated Title'
        return HttpResponse.json({
          recipes: [{ id: '1', title }],
          nextCursor: null,
          hasMore: false,
        })
      })
    )

    const { result } = renderHook(() => useRecipes('test-token'), { wrapper })

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.recipes).toHaveLength(1)
    })

    expect(result.current.recipes[0].title).toBe('Original Title')

    // Simulate onUpdate callback calling refetch
    await act(async () => {
      await result.current.refetch()
    })

    // Verify the updated recipe is now in the list
    await waitFor(() => {
      expect(result.current.recipes[0].title).toBe('Updated Title')
    })
  })
})
