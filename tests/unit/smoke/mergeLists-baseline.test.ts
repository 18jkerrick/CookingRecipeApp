import { describe, it, expect } from 'vitest'
import { mergeLists } from '@acme/core/utils/mergeLists'

describe('mergeLists (baseline)', () => {
  it('merges quantities when item names match (case-insensitive)', () => {
    const a = [{ name: 'Egg', quantity: 2, unit: '' }]
    const b = [{ name: 'egg', quantity: 3, unit: '' }]

    expect(mergeLists(a, b)).toEqual([
      { name: 'Egg', quantity: 5, unit: '', displayQuantity: '5' },
    ])
  })
})
