import { render, screen } from '@testing-library/react'
import RecipeCard from '@/components/RecipeCard'

describe('RecipeCard', () => {
  const mockRecipe = {
    ingredients: ['2 eggs', '1 cup flour', '1 cup milk'],
    instructions: ['Beat eggs', 'Mix with flour', 'Add milk and stir']
  }

  test('renders recipe title', () => {
    render(<RecipeCard {...mockRecipe} />)
    expect(screen.getByText('Extracted Recipe')).toBeInTheDocument()
  })

  test('renders all ingredients', () => {
    render(<RecipeCard {...mockRecipe} />)
    
    expect(screen.getByText('2 eggs')).toBeInTheDocument()
    expect(screen.getByText('1 cup flour')).toBeInTheDocument()
    expect(screen.getByText('1 cup milk')).toBeInTheDocument()
  })

  test('renders all instructions with numbers', () => {
    render(<RecipeCard {...mockRecipe} />)
    
    expect(screen.getByText('Beat eggs')).toBeInTheDocument()
    expect(screen.getByText('Mix with flour')).toBeInTheDocument()
    expect(screen.getByText('Add milk and stir')).toBeInTheDocument()
    
    // Check that instructions are numbered
    expect(screen.getByText('1.')).toBeInTheDocument()
    expect(screen.getByText('2.')).toBeInTheDocument()
    expect(screen.getByText('3.')).toBeInTheDocument()
  })

  test('renders ingredients and instructions sections', () => {
    render(<RecipeCard {...mockRecipe} />)
    
    expect(screen.getByText('Ingredients')).toBeInTheDocument()
    expect(screen.getByText('Instructions')).toBeInTheDocument()
  })
})