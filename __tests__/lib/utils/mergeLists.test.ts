import { mergeLists } from '@/lib/utils/mergeLists'

describe('mergeLists', () => {
  test('merges two lists with no duplicates', () => {
    const listA = [
      { name: 'eggs', quantity: 2, unit: '' },
      { name: 'flour', quantity: 1, unit: 'cup' }
    ]
    const listB = [
      { name: 'milk', quantity: 1, unit: 'cup' },
      { name: 'sugar', quantity: 0.5, unit: 'cup' }
    ]
    
    const result = mergeLists(listA, listB)
    
    expect(result).toHaveLength(4)
    expect(result).toEqual(expect.arrayContaining([
      { name: 'eggs', quantity: 2, unit: '' },
      { name: 'flour', quantity: 1, unit: 'cup' },
      { name: 'milk', quantity: 1, unit: 'cup' },
      { name: 'sugar', quantity: 0.5, unit: 'cup' }
    ]))
  })

  test('combines quantities for duplicate items with same units', () => {
    const listA = [
      { name: 'flour', quantity: 1, unit: 'cup' },
      { name: 'eggs', quantity: 2, unit: '' }
    ]
    const listB = [
      { name: 'flour', quantity: 0.5, unit: 'cup' },
      { name: 'milk', quantity: 1, unit: 'cup' }
    ]
    
    const result = mergeLists(listA, listB)
    
    expect(result).toHaveLength(3)
    expect(result).toEqual(expect.arrayContaining([
      { name: 'flour', quantity: 1.5, unit: 'cup' },
      { name: 'eggs', quantity: 2, unit: '' },
      { name: 'milk', quantity: 1, unit: 'cup' }
    ]))
  })

  test('handles empty lists', () => {
    const listA = [{ name: 'eggs', quantity: 2, unit: '' }]
    const listB = []
    
    const result = mergeLists(listA, listB)
    
    expect(result).toEqual([{ name: 'eggs', quantity: 2, unit: '' }])
  })

  test('handles case insensitive merging', () => {
    const listA = [{ name: 'Flour', quantity: 1, unit: 'cup' }]
    const listB = [{ name: 'flour', quantity: 0.5, unit: 'cup' }]
    
    const result = mergeLists(listA, listB)
    
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(1.5)
  })
})