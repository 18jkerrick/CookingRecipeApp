// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/test-retailers/create-pages/route'

describe('/api/test-retailers/create-pages', () => {
  it('returns 400 when retailer key is missing', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/test-retailers/create-pages', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Retailer key')
  })

  it('returns generated URLs for a retailer', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/test-retailers/create-pages', {
        method: 'POST',
        body: JSON.stringify({ retailerKey: 'test-grocery', retailerName: 'Test Grocery' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.shoppingListUrl).toContain('instacart')
    expect(data.recipeUrl).toContain('instacart')
  })
})
