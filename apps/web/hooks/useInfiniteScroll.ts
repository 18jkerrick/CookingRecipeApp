import { useRef, useEffect, useCallback } from 'react'

// Default threshold in pixels for prefetching
const DEFAULT_PREFETCH_THRESHOLD_PX = 200

interface UseInfiniteScrollOptions {
  threshold?: number
}

/**
 * Hook for infinite scroll functionality using Intersection Observer.
 * 
 * @param onLoadMore - Callback to load more items
 * @param hasMore - Whether there are more items to load
 * @param isLoading - Whether currently loading (optional, prevents multiple calls)
 * @param options - Configuration options
 * @returns Ref to attach to the sentinel element
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  hasMore: boolean,
  isLoading?: boolean,
  options?: UseInfiniteScrollOptions
) {
  const observerRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onLoadMore)
  
  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onLoadMore
  }, [onLoadMore])

  const handleIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    if (entry.isIntersecting && hasMore && !isLoading) {
      callbackRef.current()
    }
  }, [hasMore, isLoading])

  useEffect(() => {
    const element = observerRef.current
    if (!element) return

    const threshold = options?.threshold ?? DEFAULT_PREFETCH_THRESHOLD_PX
    
    const observer = new IntersectionObserver(handleIntersect, {
      root: null, // viewport
      rootMargin: `${threshold}px`,
      threshold: 0,
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [handleIntersect, options?.threshold])

  return observerRef
}
