'use client'

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'

interface NetflixCarouselProps {
  children: React.ReactNode
  itemWidth: number
  gap: number
  resetKey?: string | number
  carouselId?: string
}

export default function NetflixCarousel({ children, itemWidth, gap, resetKey, carouselId }: NetflixCarouselProps) {
  // Flatten children array
  const flattenedChildren = useMemo(() => {
    const childrenArray = React.Children.toArray(children)
    return childrenArray.flatMap(child =>
      Array.isArray(child) ? child : [child]
    )
  }, [children])

  // State
  const [scrollPosition, setScrollPosition] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)

  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const wheelTimeout = useRef<NodeJS.Timeout | null>(null)
  const lastResetKey = useRef(resetKey)
  const resizeObserver = useRef<ResizeObserver | null>(null)

  // Calculate dimensions
  const totalWidth = flattenedChildren.length * (itemWidth + gap) - gap
  const maxScroll = Math.max(0, totalWidth - containerWidth)

  // Ensure scroll position is always valid
  const validScrollPosition = Math.max(0, Math.min(maxScroll, scrollPosition))

  // Debug logging
  const logDebug = useCallback((message: string, data?: any) => {
    // console.log(`[Carousel ${carouselId || 'unknown'}] ${message}`, data || '')
  }, [carouselId])

  // Reset scroll position when resetKey changes
  useEffect(() => {
    if (resetKey !== lastResetKey.current) {
      logDebug('Reset key changed, resetting scroll position', { resetKey })
      setScrollPosition(0)
      lastResetKey.current = resetKey
    }
  }, [resetKey, logDebug])

  // Set up ResizeObserver to track container width changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    resizeObserver.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        if (width !== containerWidth && width > 0) {
          logDebug('Container width changed', { from: containerWidth, to: width })
          setContainerWidth(width)
        }
      }
    })

    resizeObserver.current.observe(container)

    // Set initial width
    const initialWidth = container.offsetWidth
    if (initialWidth > 0) {
      setContainerWidth(initialWidth)
    }

    return () => {
      if (resizeObserver.current) {
        resizeObserver.current.disconnect()
        resizeObserver.current = null
      }
    }
  }, [containerWidth, logDebug])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wheelTimeout.current) {
        clearTimeout(wheelTimeout.current)
      }
      if (resizeObserver.current) {
        resizeObserver.current.disconnect()
      }
    }
  }, [])

  // Validate and fix scroll position when content changes
  useEffect(() => {
    if (containerWidth === 0) return

    const currentMaxScroll = Math.max(0, totalWidth - containerWidth)
    if (scrollPosition > currentMaxScroll) {
      logDebug('Fixing scroll position due to content change', {
        from: scrollPosition,
        to: currentMaxScroll
      })
      setScrollPosition(currentMaxScroll)
    }
  }, [totalWidth, containerWidth, scrollPosition, logDebug])

  // Handle wheel scrolling
  const handleWheel = useCallback((e: WheelEvent) => {
    const isHorizontalScroll = Math.abs(e.deltaX) > Math.abs(e.deltaY)
    const isShiftHeld = e.shiftKey

    if (!isHorizontalScroll && !isShiftHeld) {
      return // Allow normal vertical scrolling
    }

    e.preventDefault()
    e.stopPropagation()

    const delta = isHorizontalScroll ? e.deltaX : e.deltaY
    const newPosition = Math.max(0, Math.min(maxScroll, scrollPosition + delta * 0.8))

    logDebug('Wheel scroll', { delta, from: scrollPosition, to: newPosition })
    setScrollPosition(newPosition)
  }, [scrollPosition, maxScroll, logDebug])

  // Add wheel event listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // Calculate item visibility and effects
  const getItemStyle = useCallback((index: number) => {
    // Don't apply any effects until container width is measured
    // This prevents the gray overlay bug on initial render
    if (containerWidth === 0) {
      return {
        opacity: 1,
        transform: 'scale(1)',
        filter: 'brightness(1)',
        transition: 'all 0.3s ease-out'
      }
    }

    const itemX = index * (itemWidth + gap)
    const relativeX = itemX - validScrollPosition

    // Visibility calculation
    const isVisible = relativeX > -itemWidth && relativeX < containerWidth

    if (!isVisible) {
      return {
        opacity: 0.3,
        transform: 'scale(0.95)',
        filter: 'brightness(0.6)'
      }
    }

    // All visible items should have full brightness - no progressive dimming
    // The edge gradients already indicate scrollability
    return {
      opacity: 1,
      transform: 'scale(1)',
      filter: 'brightness(1)',
      transition: 'all 0.3s ease-out'
    }
  }, [itemWidth, gap, validScrollPosition, containerWidth])

  // Calculate if gradients should be shown
  const showLeftGradient = validScrollPosition > 0
  const showRightGradient = validScrollPosition < maxScroll

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        cursor: 'grab',
        touchAction: 'pan-y pinch-zoom',
        minHeight: '256px'
      }}
    >
      <div
        ref={scrollContainerRef}
        style={{
          display: 'flex',
          gap: `${gap}px`,
          transform: `translateX(-${validScrollPosition}px)`,
          transition: 'transform 0.3s ease-out',
          willChange: 'transform',
          position: 'relative',
          width: 'fit-content'
        }}
      >
        {flattenedChildren.map((child, index) => {
          const childKey = React.isValidElement(child) && child.key
            ? `${carouselId || 'carousel'}-${child.key}-${index}`
            : `${carouselId || 'carousel'}-item-${index}`

          return (
            <div
              key={childKey}
              style={{
                flexShrink: 0,
                width: `${itemWidth}px`,
                ...getItemStyle(index)
              }}
            >
              {child}
            </div>
          )
        })}
      </div>

      {/* Smart gradient overlays - only show when there are more items */}
      {/* Uses CSS custom property for theme-aware gradient color */}
      {showLeftGradient && (
        <div
          className="absolute inset-y-0 left-0 w-20 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to right, var(--bg-primary), transparent)'
          }}
        />
      )}
      {showRightGradient && (
        <div
          className="absolute inset-y-0 right-0 w-20 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to left, var(--bg-primary), transparent)'
          }}
        />
      )}
    </div>
  )
}