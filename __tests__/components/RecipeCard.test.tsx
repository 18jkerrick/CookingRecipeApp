import { render, screen } from '@testing-library/react'
import RecipeCard from '@/components/RecipeCard'

describe('RecipeCard', () => {
  const mockIngredients = [
    '2 cups flour',
    '3 eggs',
    '1 cup milk'
  ]

  const mockInstructions = [
    'Mix dry ingredients',
    'Add wet ingredients',
    'Bake at 350°F for 30 minutes'
  ]

  it('renders the recipe title', () => {
    render(<RecipeCard ingredients={mockIngredients} instructions={mockInstructions} />)
    
    expect(screen.getByText('Extracted Recipe')).toBeInTheDocument()
  })

  it('renders all ingredients', () => {
    render(<RecipeCard ingredients={mockIngredients} instructions={mockInstructions} />)
    
    expect(screen.getByText('Ingredients')).toBeInTheDocument()
    expect(screen.getByText('2 cups flour')).toBeInTheDocument()
    expect(screen.getByText('3 eggs')).toBeInTheDocument()
    expect(screen.getByText('1 cup milk')).toBeInTheDocument()
  })

  it('renders all instructions', () => {
    render(<RecipeCard ingredients={mockIngredients} instructions={mockInstructions} />)
    
    expect(screen.getByText('Instructions')).toBeInTheDocument()
    expect(screen.getByText('Mix dry ingredients')).toBeInTheDocument()
    expect(screen.getByText('Add wet ingredients')).toBeInTheDocument()
    expect(screen.getByText('Bake at 350°F for 30 minutes')).toBeInTheDocument()
  })

  it('renders proper layout structure', () => {
    render(<RecipeCard ingredients={mockIngredients} instructions={mockInstructions} />)
    
    // Check for ingredients section
    const ingredientsSection = screen.getByText('Ingredients').closest('div')
    expect(ingredientsSection).toBeInTheDocument()
    
    // Check for instructions section
    const instructionsSection = screen.getByText('Instructions').closest('div')
    expect(instructionsSection).toBeInTheDocument()
  })
})