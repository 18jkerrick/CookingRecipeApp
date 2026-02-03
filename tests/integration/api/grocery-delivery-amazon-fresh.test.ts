// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/grocery-delivery/amazon-fresh', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('/api/grocery-delivery/amazon-fresh', () => {
  const originalEnv = {
    AMAZON_CLIENT_ID: process.env.AMAZON_CLIENT_ID,
    AMAZON_CLIENT_SECRET: process.env.AMAZON_CLIENT_SECRET,
    AMAZON_REFRESH_TOKEN: process.env.AMAZON_REFRESH_TOKEN,
    AMAZON_MARKETPLACE_ID: process.env.AMAZON_MARKETPLACE_ID,
  }

  beforeEach(() => {
    process.env.AMAZON_MARKETPLACE_ID = 'test-solution-id'
  })

  it('returns 500 when credentials are missing', async () => {
    delete process.env.AMAZON_CLIENT_ID
    delete process.env.AMAZON_CLIENT_SECRET
    delete process.env.AMAZON_REFRESH_TOKEN
    vi.resetModules()
    const { POST } = await import('@/app/api/grocery-delivery/amazon-fresh/route')

    const response = await POST(
      makeRequest({
        items: [{ name: 'milk', quantity: 1 }],
        zipCode: '94105',
      })
    )
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('credentials')
  })

  it('returns pricing data for items', async () => {
    process.env.AMAZON_CLIENT_ID = 'client-id'
    process.env.AMAZON_CLIENT_SECRET = 'client-secret'
    process.env.AMAZON_REFRESH_TOKEN = 'refresh-token'
    vi.resetModules()
    const { POST } = await import('@/app/api/grocery-delivery/amazon-fresh/route')

    const response = await POST(
      makeRequest({
        items: [{ name: 'milk', quantity: 1 }],
        zipCode: '94105',
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.pricing).toBeTruthy()
    expect(data.cartUrl).toContain('amazon')
  })

  afterEach(() => {
    process.env.AMAZON_CLIENT_ID = originalEnv.AMAZON_CLIENT_ID
    process.env.AMAZON_CLIENT_SECRET = originalEnv.AMAZON_CLIENT_SECRET
    process.env.AMAZON_REFRESH_TOKEN = originalEnv.AMAZON_REFRESH_TOKEN
    process.env.AMAZON_MARKETPLACE_ID = originalEnv.AMAZON_MARKETPLACE_ID
  })
})
