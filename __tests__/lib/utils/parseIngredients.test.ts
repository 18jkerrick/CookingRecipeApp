import { parseIngredients } from '@/lib/utils/parseIngredients'

describe('parseIngredients', () => {
  test('parses simple quantities', () => {
    const ingredients = ['2 eggs', '1 cup flour', '3 tablespoons butter']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'eggs', quantity: 2, unit: '', displayQuantity: '2' },
      { name: 'flour', quantity: 1, unit: 'cup', displayQuantity: '1' },
      { name: 'butter', quantity: 3, unit: 'tablespoons', displayQuantity: '3' }
    ])
  })

  test('parses mixed numbers', () => {
    const ingredients = ['1 1/2 cups milk', '2 1/4 teaspoons salt']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'milk', quantity: 1.5, unit: 'cups', displayQuantity: '1 1/2' },
      { name: 'salt', quantity: 2.25, unit: 'teaspoons', displayQuantity: '2 1/4' }
    ])
  })

  test('parses fractions', () => {
    const ingredients = ['1/2 cup sugar', '3/4 teaspoon vanilla']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'sugar', quantity: 0.5, unit: 'cup', displayQuantity: '1/2' },
      { name: 'vanilla', quantity: 0.75, unit: 'teaspoon', displayQuantity: '3/4' }
    ])
  })

  test('parses ranges correctly', () => {
    const ingredients = ['10-15 sun-dried tomatoes, chopped', '1-2 cups water', '4-6 cloves garlic']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'sun-dried tomatoes, chopped', quantity: 12.5, unit: '', displayQuantity: '10-15' },
      { name: 'water', quantity: 1.5, unit: 'cups', displayQuantity: '1-2' },
      { name: 'garlic', quantity: 5, unit: 'cloves', displayQuantity: '4-6' }
    ])
  })

  test('handles ingredients without quantities', () => {
    const ingredients = ['salt', 'pepper', 'oregano']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'salt', quantity: 1, unit: '', displayQuantity: '1' },
      { name: 'pepper', quantity: 1, unit: '', displayQuantity: '1' },
      { name: 'oregano', quantity: 1, unit: '', displayQuantity: '1' }
    ])
  })

  test('handles decimal quantities', () => {
    const ingredients = ['1.5 cups water', '0.25 teaspoon pepper']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'water', quantity: 1.5, unit: 'cups', displayQuantity: '1.5' },
      { name: 'pepper', quantity: 0.25, unit: 'teaspoon', displayQuantity: '0.25' }
    ])
  })

  test('handles complex ingredient descriptions', () => {
    const ingredients = ['10-15 sun-dried tomatoes, chopped', '1 large bag kale', '2-3 medium avocados, soft']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'sun-dried tomatoes, chopped', quantity: 12.5, unit: '', displayQuantity: '10-15' },
      { name: 'large bag kale', quantity: 1, unit: '', displayQuantity: '1' },
      { name: 'medium avocados, soft', quantity: 2.5, unit: '', displayQuantity: '2-3' }
    ])
  })
}) 