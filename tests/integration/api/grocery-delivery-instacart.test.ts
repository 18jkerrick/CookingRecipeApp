// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/grocery-delivery/instacart', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('/api/grocery-delivery/instacart', () => {
  const originalKey = process.env.INSTACART_API_KEY
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    process.env.NODE_ENV = 'test'
  })

  it('returns 500 when API key is missing', async () => {
    delete process.env.INSTACART_API_KEY
    vi.resetModules()
    const { POST } = await import('@/app/api/grocery-delivery/instacart/route')

    const response = await POST(
      makeRequest({
        items: [{ name: 'flour', quantity: 2, unit: 'cup' }],
      })
    )
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Instacart API key')
  })

  it('creates a shopping list URL', async () => {
    process.env.INSTACART_API_KEY = 'test-key'
    vi.resetModules()
    const { POST } = await import('@/app/api/grocery-delivery/instacart/route')

    const response = await POST(
      makeRequest({
        items: [{ name: 'flour', quantity: 2, unit: 'cup' }],
        groceryListTitle: 'Weeknight Dinner',
        groceryListId: 'list-1',
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.recipePageUrl).toContain('instacart')
  })

  afterEach(() => {
    process.env.INSTACART_API_KEY = originalKey
    process.env.NODE_ENV = originalEnv
  })
})
