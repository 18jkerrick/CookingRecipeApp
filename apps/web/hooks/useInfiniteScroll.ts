import { useRef, useEffect, useCallback, useState } from 'react'

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
 * @returns Callback ref to attach to the sentinel element
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  hasMore: boolean,
  isLoading?: boolean,
  options?: UseInfiniteScrollOptions
) {
  // Use state to track the element so we can trigger re-renders when it changes
  const [element, setElement] = useState<HTMLDivElement | null>(null)
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
    if (!element) return

    const threshold = options?.threshold ?? DEFAULT_PREFETCH_THRESHOLD_PX
    
    const observer = new IntersectionObserver(handleIntersect, {
      root: null, // viewport
      rootMargin: `${threshold}px`,
      threshold: 0,
    })

    observer.observe(element)

    // Check immediately if element is already visible
    // This handles the case where user navigates back and sentinel is already in view
    const rect = element.getBoundingClientRect()
    const isVisible = rect.top < window.innerHeight + threshold
    if (isVisible && hasMore && !isLoading) {
      callbackRef.current()
    }

    return () => {
      observer.disconnect()
    }
  }, [element, handleIntersect, options?.threshold, hasMore, isLoading])

  // Return a callback ref that updates our state when the element is attached
  const refCallback = useCallback((node: HTMLDivElement | null) => {
    setElement(node)
  }, [])

  return refCallback
}
