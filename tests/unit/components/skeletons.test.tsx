import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { RecipeCardSkeleton, RecipeGridSkeleton, RecipeSidebarSkeleton } from '@/components/skeletons'

afterEach(() => {
  cleanup()
})

describe('RecipeCardSkeleton', () => {
  it('renders with correct test id', () => {
    render(<RecipeCardSkeleton />)
    expect(screen.getByTestId('recipe-skeleton')).toBeInTheDocument()
  })

  it('has animate-pulse class for loading animation', () => {
    render(<RecipeCardSkeleton />)
    expect(screen.getByTestId('recipe-skeleton')).toHaveClass('animate-pulse')
  })
})

describe('RecipeGridSkeleton', () => {
  it('renders default 8 skeleton cards', () => {
    render(<RecipeGridSkeleton />)
    expect(screen.getAllByTestId('recipe-skeleton')).toHaveLength(8)
  })

  it('renders custom count of skeleton cards', () => {
    render(<RecipeGridSkeleton count={12} />)
    expect(screen.getAllByTestId('recipe-skeleton')).toHaveLength(12)
  })
})

describe('RecipeSidebarSkeleton', () => {
  it('renders default 6 skeleton items', () => {
    render(<RecipeSidebarSkeleton />)
    expect(screen.getAllByTestId('recipe-sidebar-skeleton-item')).toHaveLength(6)
  })

  it('renders custom count of skeleton items', () => {
    render(<RecipeSidebarSkeleton count={4} />)
    expect(screen.getAllByTestId('recipe-sidebar-skeleton-item')).toHaveLength(4)
  })
})
