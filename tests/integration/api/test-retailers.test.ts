// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

describe('/api/test-retailers', () => {
  const originalKey = process.env.INSTACART_API_KEY
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    process.env.NODE_ENV = 'test'
    process.env.INSTACART_API_KEY = 'test-key'
  })

  it('returns 400 when zip code is missing', async () => {
    vi.resetModules()
    const { POST } = await import('@/app/api/test-retailers/route')

    const response = await POST(
      new NextRequest('http://localhost/api/test-retailers', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Zip code')
  })

  it('returns retailers for a valid zip code', async () => {
    vi.resetModules()
    const { POST } = await import('@/app/api/test-retailers/route')

    const response = await POST(
      new NextRequest('http://localhost/api/test-retailers', {
        method: 'POST',
        body: JSON.stringify({ zipCode: '94105' }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.retailers)).toBe(true)
  })

  it('returns retailer tests when viability check is requested', async () => {
    vi.resetModules()
    const { POST } = await import('@/app/api/test-retailers/route')

    const response = await POST(
      new NextRequest('http://localhost/api/test-retailers', {
        method: 'POST',
        body: JSON.stringify({ zipCode: '94105', testViability: true }),
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.retailerTests)).toBe(true)
    expect(data.retailerTests[0]?.parseResult).toBeTruthy()
  })

  afterEach(() => {
    process.env.INSTACART_API_KEY = originalKey
    process.env.NODE_ENV = originalEnv
  })
})
