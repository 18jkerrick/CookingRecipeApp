import { describe, it, expect } from 'vitest'
import {
  parseIngredient,
  parseIngredients,
} from '@acme/core/parsers/ingredient-parser'

describe('parseIngredient', () => {
  it.each([
    {
      input: '2 cups flour',
      expected: {
        quantity: 2,
        unit: 'cups',
        ingredient: 'flour',
        original: '2 cups flour',
      },
    },
    {
      input: '1/2 cup sugar',
      expected: {
        quantity: 0.5,
        unit: 'cup',
        ingredient: 'sugar',
        original: '1/2 cup sugar',
      },
    },
    {
      input: '1 1/2 cups milk',
      expected: {
        quantity: 1.5,
        unit: 'cups',
        ingredient: 'milk',
        original: '1 1/2 cups milk',
      },
    },
    {
      input: '2-3 cloves garlic',
      expected: {
        quantity: 2.5,
        unit: 'cloves',
        ingredient: 'garlic',
        original: '2-3 cloves garlic',
      },
    },
    {
      input: '1 cup finely chopped onion',
      expected: {
        quantity: 1,
        unit: 'cup',
        ingredient: 'onion',
        preparation: 'finely chopped',
        original: '1 cup finely chopped onion',
      },
    },
    {
      input: '1 teaspoon sugar optional',
      expected: {
        quantity: 1,
        unit: 'teaspoon',
        ingredient: 'sugar',
        notes: 'optional',
        original: '1 teaspoon sugar optional',
      },
    },
    {
      input: '2 large eggs',
      expected: {
        quantity: 2,
        ingredient: 'eggs',
        original: '2 large eggs',
      },
    },
    {
      input: 'salt to taste',
      expected: {
        quantity: 1,
        ingredient: 'salt',
        notes: 'to taste',
        original: 'salt to taste',
      },
    },
    {
      input: ' 1 cup of sugar ',
      expected: {
        quantity: 1,
        unit: 'cup',
        ingredient: 'sugar',
        original: '1 cup of sugar',
      },
    },
    {
      input: '½ cup sugar',
      expected: {
        quantity: 0.5,
        unit: 'cup',
        ingredient: 'sugar',
        original: '½ cup sugar',
      },
    },
  ])('parses "$input"', ({ input, expected }) => {
    expect(parseIngredient(input)).toMatchObject(expected)
  })

  it('normalizes common unit abbreviations', () => {
    expect(parseIngredient('2 c flour').unit).toBe('cup')
    expect(parseIngredient('1 tbsp butter').unit).toBe('tablespoon')
    expect(parseIngredient('3 tsp salt').unit).toBe('teaspoon')
  })
})

describe('parseIngredients', () => {
  it('maps parsing across inputs', () => {
    const [one, two] = parseIngredients(['1/2 cup flour', '2 cups milk'])

    expect(one.ingredient).toBe('flour')
    expect(two.ingredient).toBe('milk')
  })
})
