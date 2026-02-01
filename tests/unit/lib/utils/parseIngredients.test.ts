import { parseIngredients } from '@acme/core/utils/parseIngredients'

describe('parseIngredients', () => {
  it('parses simple quantities', () => {
    const ingredients = ['2 cups flour', '3 eggs', '1 cup milk']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'flour', quantity: 2, unit: 'cups', displayQuantity: '2' },
      { name: 'eggs', quantity: 3, unit: '', displayQuantity: '3' },
      { name: 'milk', quantity: 1, unit: 'cup', displayQuantity: '1' }
    ])
  })

  it('parses mixed numbers', () => {
    const ingredients = ['1 1/2 cups sugar', '2 1/4 teaspoons salt']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'sugar', quantity: 1.5, unit: 'cups', displayQuantity: '1 1/2' },
      { name: 'salt', quantity: 2.25, unit: 'teaspoons', displayQuantity: '2 1/4' }
    ])
  })

  it('parses fractions', () => {
    const ingredients = ['1/2 cup butter', '3/4 teaspoon vanilla']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'butter', quantity: 0.5, unit: 'cup', displayQuantity: '1/2' },
      { name: 'vanilla', quantity: 0.75, unit: 'teaspoon', displayQuantity: '3/4' }
    ])
  })

  it('parses ranges correctly', () => {
    const ingredients = ['2-3 cups flour', '4-6 cloves garlic']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'flour', quantity: 2.5, unit: 'cups', displayQuantity: '2-3' },
      { name: 'garlic', quantity: 5, unit: 'cloves', displayQuantity: '4-6' }
    ])
  })

  it('handles ingredients without quantities', () => {
    const ingredients = ['salt', 'pepper', 'oregano']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'salt', quantity: 0, unit: '', displayQuantity: '' },
      { name: 'pepper', quantity: 0, unit: '', displayQuantity: '' },
      { name: 'oregano', quantity: 0, unit: '', displayQuantity: '' }
    ])
  })

  it('handles decimal quantities', () => {
    const ingredients = ['0.5 cups milk', '1.25 tablespoons oil']
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'milk', quantity: 0.5, unit: 'cups', displayQuantity: '0.5' },
      { name: 'oil', quantity: 1.25, unit: 'tablespoons', displayQuantity: '1.25' }
    ])
  })

  it('handles complex ingredient descriptions', () => {
    const ingredients = [
      '2 large eggs, beaten',
      '1 cup all-purpose flour, sifted',
      '1/2 teaspoon salt'
    ]
    const result = parseIngredients(ingredients)
    
    expect(result).toEqual([
      { name: 'large eggs, beaten', quantity: 2, unit: '', displayQuantity: '2' },
      { name: 'all-purpose flour, sifted', quantity: 1, unit: 'cup', displayQuantity: '1' },
      { name: 'salt', quantity: 0.5, unit: 'teaspoon', displayQuantity: '1/2' }
    ])
  })
}) 