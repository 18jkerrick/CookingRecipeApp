import { describe, expect, it } from 'vitest'
import { mergeLists } from '@acme/core/utils/mergeLists'

describe('mergeLists', () => {
  it('merges lists without duplicates', () => {
    const listA = [
      { name: 'eggs', quantity: 2, unit: '' },
      { name: 'flour', quantity: 1, unit: 'cup' },
    ]
    const listB = [
      { name: 'milk', quantity: 1, unit: 'cup' },
      { name: 'sugar', quantity: 0.5, unit: 'cup' },
    ]

    const result = mergeLists(listA, listB)

    expect(result).toHaveLength(4)
    expect(result).toEqual(
      expect.arrayContaining([
        { name: 'eggs', quantity: 2, unit: '' },
        { name: 'flour', quantity: 1, unit: 'cup' },
        { name: 'milk', quantity: 1, unit: 'cup' },
        { name: 'sugar', quantity: 0.5, unit: 'cup' },
      ])
    )
  })

  it('combines quantities for duplicate items with same units', () => {
    const listA = [
      { name: 'flour', quantity: 1, unit: 'cup' },
      { name: 'eggs', quantity: 2, unit: '' },
    ]
    const listB = [
      { name: 'flour', quantity: 0.5, unit: 'cup' },
      { name: 'milk', quantity: 1, unit: 'cup' },
    ]

    const result = mergeLists(listA, listB)

    expect(result).toHaveLength(3)
    expect(result).toEqual(
      expect.arrayContaining([
        { name: 'flour', quantity: 1.5, unit: 'cup', displayQuantity: '1.5' },
        { name: 'eggs', quantity: 2, unit: '' },
        { name: 'milk', quantity: 1, unit: 'cup' },
      ])
    )
  })

  it('handles empty lists', () => {
    const listA = [{ name: 'eggs', quantity: 2, unit: '' }]
    const listB: typeof listA = []

    const result = mergeLists(listA, listB)

    expect(result).toEqual([{ name: 'eggs', quantity: 2, unit: '' }])
  })

  it('handles case-insensitive merging', () => {
    const listA = [{ name: 'Flour', quantity: 1, unit: 'cup' }]
    const listB = [{ name: 'flour', quantity: 0.5, unit: 'cup' }]

    const result = mergeLists(listA, listB)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(
      expect.objectContaining({
        name: 'Flour',
        quantity: 1.5,
        unit: 'cup',
        displayQuantity: '1.5',
      })
    )
  })

  it('adds ranges when both items have range quantities', () => {
    const listA = [
      {
        name: 'apples',
        quantity: 2.5,
        unit: 'cup',
        displayQuantity: '2-3',
      },
    ]
    const listB = [
      {
        name: 'apples',
        quantity: 1.5,
        unit: 'cup',
        displayQuantity: '1-2',
      },
    ]

    const result = mergeLists(listA, listB)

    expect(result).toEqual([
      {
        name: 'apples',
        quantity: 4,
        unit: 'cup',
        displayQuantity: '3-5',
      },
    ])
  })

  it('converts units when possible and sums quantities', () => {
    const listA = [{ name: 'butter', quantity: 1, unit: 'cup' }]
    const listB = [{ name: 'butter', quantity: 8, unit: 'tablespoon' }]

    const result = mergeLists(listA, listB)

    expect(result).toEqual([
      {
        name: 'butter',
        quantity: 1.5,
        unit: 'cup',
        displayQuantity: '1.5',
      },
    ])
  })

  it('adds a numeric quantity to an existing range', () => {
    const listA = [
      {
        name: 'berries',
        quantity: 1.5,
        unit: 'cup',
        displayQuantity: '1-2',
      },
    ]
    const listB = [{ name: 'berries', quantity: 1, unit: 'cup' }]

    const result = mergeLists(listA, listB)

    expect(result).toEqual([
      {
        name: 'berries',
        quantity: 2.5,
        unit: 'cup',
        displayQuantity: '2-3',
      },
    ])
  })

  it('keeps separate entries for incompatible units', () => {
    const listA = [{ name: 'sugar', quantity: 1, unit: 'cup' }]
    const listB = [{ name: 'sugar', quantity: 100, unit: 'gram' }]

    const result = mergeLists(listA, listB)

    expect(result).toEqual(
      expect.arrayContaining([
        { name: 'sugar', quantity: 1, unit: 'cup' },
        { name: 'sugar', quantity: 100, unit: 'gram' },
      ])
    )
  })
})
