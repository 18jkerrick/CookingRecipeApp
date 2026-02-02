import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import RecipeCard from '@/components/features/recipe/RecipeCard'

vi.mock('lottie-react', () => ({
  default: () => <div data-testid="lottie" />,
}))

describe('RecipeCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders default title when none is provided', () => {
    render(<RecipeCard />)

    expect(
      screen.getByRole('heading', { name: 'Extracted Recipe' })
    ).toBeInTheDocument()
  })

  it('renders provided title', () => {
    render(<RecipeCard title="Brothy Chicken Thighs" />)

    expect(
      screen.getByRole('heading', { name: 'Brothy Chicken Thighs' })
    ).toBeInTheDocument()
  })

  it('renders image when imageUrl is provided', () => {
    render(
      <RecipeCard title="Adobo" imageUrl="https://example.com/adobo.jpg" />
    )

    expect(screen.getByAltText('Adobo')).toBeInTheDocument()
  })

  it('shows placeholder when no imageUrl is provided', () => {
    render(<RecipeCard title="Adobo" />)

    expect(screen.getByText('🍽️')).toBeInTheDocument()
  })

  it('shows processing state messages for text extraction', () => {
    render(<RecipeCard processing />)

    expect(
      screen.getByText('Getting Recipe from Text')
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('shows processing state messages for audio extraction', () => {
    render(<RecipeCard processing extractionPhase="audio" />)

    expect(screen.getByText('Listening to the Audio')).toBeInTheDocument()
  })

  it('shows processing state messages for video extraction', () => {
    render(<RecipeCard processing extractionPhase="video" />)

    expect(
      screen.getByText('Analyzing Video & Images')
    ).toBeInTheDocument()
    expect(
      screen.getByText('This may take several minutes')
    ).toBeInTheDocument()
  })
})
