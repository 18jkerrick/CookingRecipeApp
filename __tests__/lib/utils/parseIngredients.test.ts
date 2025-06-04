import { parseIngredients } from '@/lib/utils/parseIngredients'

describe('parseIngredients', () => {
  test('parses simple quantities', () => {
    const ingredients = ['2 eggs', '1 cup flour', '3 tablespoons butter']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'eggs', quantity: 2, unit: '' },
      { name: 'flour', quantity: 1, unit: 'cup' },
      { name: 'butter', quantity: 3, unit: 'tablespoons' }
    ])
  })

  test('parses mixed numbers', () => {
    const ingredients = ['1 1/2 cups milk', '2 1/4 teaspoons salt']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'milk', quantity: 1.5, unit: 'cups' },
      { name: 'salt', quantity: 2.25, unit: 'teaspoons' }
    ])
  })

  test('parses fractions', () => {
    const ingredients = ['1/2 cup sugar', '3/4 teaspoon vanilla']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'sugar', quantity: 0.5, unit: 'cup' },
      { name: 'vanilla', quantity: 0.75, unit: 'teaspoon' }
    ])
  })

  test('handles ingredients without quantities', () => {
    const ingredients = ['salt', 'pepper', 'oregano']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'salt', quantity: 1, unit: '' },
      { name: 'pepper', quantity: 1, unit: '' },
      { name: 'oregano', quantity: 1, unit: '' }
    ])
  })

  test('handles decimal quantities', () => {
    const ingredients = ['1.5 cups water', '0.25 teaspoon pepper']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'water', quantity: 1.5, unit: 'cups' },
      { name: 'pepper', quantity: 0.25, unit: 'teaspoon' }
    ])
  })
}) 