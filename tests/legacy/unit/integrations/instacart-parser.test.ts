import { parseShoppingListHtml } from '@acme/integrations/grocery-delivery/instacart-parser'

describe('instacart-parser', () => {
  it('returns a structured result for empty HTML', async () => {
    const result = await parseShoppingListHtml('<html></html>')
    expect(result).toEqual(
      expect.objectContaining({
        retailerAvailable: expect.any(Boolean),
        totalIngredients: expect.any(Number),
        dataFound: expect.any(Boolean),
      })
    )
    expect(result.retailerName === null || typeof result.retailerName === 'string').toBe(true)
  })
})
