import { parseIngredients } from '@acme/core/parsers/ingredient-parser'

describe('ingredient-parser parseIngredients', () => {
  test('parses a simple fraction like 1/2', () => {
    const [one] = parseIngredients(['1/2 cup flour'])
    expect(one.quantity).toBeCloseTo(0.5, 5)
    expect(one.unit).toBe('cup')
    expect(one.ingredient).toBe('flour')
  })

  test('parses a mixed number like 1 1/2', () => {
    const [one] = parseIngredients(['1 1/2 cups milk'])
    expect(one.quantity).toBeCloseTo(1.5, 5)
    expect(one.unit).toBe('cups')
    expect(one.ingredient).toBe('milk')
  })
})