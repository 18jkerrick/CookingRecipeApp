// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

describe('/api/test-instacart', () => {
  const originalKey = process.env.INSTACART_API_KEY
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    process.env.NODE_ENV = 'test'
  })

  it('returns retailers data on GET', async () => {
    process.env.INSTACART_API_KEY = 'test-key'
    vi.resetModules()
    const { GET } = await import('@/app/api/test-instacart/route')

    const response = await GET(
      new NextRequest('http://localhost/api/test-instacart?zipCode=94105')
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.retailersFound).toBeGreaterThan(0)
  })

  it('creates a recipe link on POST', async () => {
    process.env.INSTACART_API_KEY = 'test-key'
    vi.resetModules()
    const { POST } = await import('@/app/api/test-instacart/route')

    const response = await POST(
      new NextRequest('http://localhost/api/test-instacart', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.recipeUrl).toContain('instacart')
  })

  afterEach(() => {
    process.env.INSTACART_API_KEY = originalKey
    process.env.NODE_ENV = originalEnv
  })
})
