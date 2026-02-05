import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

describe('useInfiniteScroll', () => {
  afterEach(() => {
    cleanup()
  })

  it('returns a callback ref function', () => {
    const onLoadMore = vi.fn()
    const { result } = renderHook(() => useInfiniteScroll(onLoadMore, true))
    
    // Now returns a callback ref (function) instead of a ref object
    expect(typeof result.current).toBe('function')
  })

  it('accepts hasMore parameter', () => {
    const onLoadMore = vi.fn()
    const { result: resultTrue } = renderHook(() => useInfiniteScroll(onLoadMore, true))
    const { result: resultFalse } = renderHook(() => useInfiniteScroll(onLoadMore, false))
    
    // Both should return callback refs
    expect(typeof resultTrue.current).toBe('function')
    expect(typeof resultFalse.current).toBe('function')
  })

  it('accepts isLoading parameter', () => {
    const onLoadMore = vi.fn()
    const { result } = renderHook(() => useInfiniteScroll(onLoadMore, true, true))
    
    expect(typeof result.current).toBe('function')
  })

  it('accepts custom threshold option', () => {
    const onLoadMore = vi.fn()
    const { result } = renderHook(() => 
      useInfiniteScroll(onLoadMore, true, false, { threshold: 500 })
    )
    
    expect(typeof result.current).toBe('function')
  })
})
