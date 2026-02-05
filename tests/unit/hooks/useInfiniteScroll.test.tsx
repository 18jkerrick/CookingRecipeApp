import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, cleanup } from '@testing-library/react'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'

describe('useInfiniteScroll', () => {
  afterEach(() => {
    cleanup()
  })

  it('returns a ref object', () => {
    const onLoadMore = vi.fn()
    const { result } = renderHook(() => useInfiniteScroll(onLoadMore, true))
    
    expect(result.current).toHaveProperty('current')
    expect(result.current.current).toBeNull()
  })

  it('accepts hasMore parameter', () => {
    const onLoadMore = vi.fn()
    const { result: resultTrue } = renderHook(() => useInfiniteScroll(onLoadMore, true))
    const { result: resultFalse } = renderHook(() => useInfiniteScroll(onLoadMore, false))
    
    // Both should return refs
    expect(resultTrue.current).toHaveProperty('current')
    expect(resultFalse.current).toHaveProperty('current')
  })

  it('accepts isLoading parameter', () => {
    const onLoadMore = vi.fn()
    const { result } = renderHook(() => useInfiniteScroll(onLoadMore, true, true))
    
    expect(result.current).toHaveProperty('current')
  })

  it('accepts custom threshold option', () => {
    const onLoadMore = vi.fn()
    const { result } = renderHook(() => 
      useInfiniteScroll(onLoadMore, true, false, { threshold: 500 })
    )
    
    expect(result.current).toHaveProperty('current')
  })
})
