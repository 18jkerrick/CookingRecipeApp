import { describe, expect, it } from 'vitest'
import { parseIngredients } from '@acme/core/parsers/ingredient-parser'

describe('parseIngredients', () => {
  it.each([
    {
      input: '1/2 cup flour',
      expected: { quantity: 0.5, unit: 'cup', ingredient: 'flour' },
    },
    {
      input: '1 1/2 cups milk',
      expected: { quantity: 1.5, unit: 'cups', ingredient: 'milk' },
    },
    {
      input: '1½ cups sugar',
      expected: { quantity: 1.5, unit: 'cups', ingredient: 'sugar' },
    },
    {
      input: '¼ tsp salt',
      expected: { quantity: 0.25, unit: 'teaspoon', ingredient: 'salt' },
    },
    {
      input: '2-3 cloves garlic',
      expected: { quantity: 2.5, unit: 'cloves', ingredient: 'garlic' },
    },
    {
      input: '1-2 tbsp olive oil',
      expected: { quantity: 1.5, unit: 'tablespoon', ingredient: 'olive oil' },
    },
    {
      input: '2 c flour',
      expected: { quantity: 2, unit: 'cup', ingredient: 'flour' },
    },
  ])('parses "$input"', ({ input, expected }) => {
    const [result] = parseIngredients([input])

    expect(result).toMatchObject(expected)
  })
})
