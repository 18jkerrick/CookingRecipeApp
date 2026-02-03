// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

describe('/api/test-amazon-auth', () => {
  const originalEnv = {
    AMAZON_CLIENT_ID: process.env.AMAZON_CLIENT_ID,
    AMAZON_CLIENT_SECRET: process.env.AMAZON_CLIENT_SECRET,
    AMAZON_REFRESH_TOKEN: process.env.AMAZON_REFRESH_TOKEN,
    AMAZON_MARKETPLACE_ID: process.env.AMAZON_MARKETPLACE_ID,
  }

  beforeEach(() => {
    process.env.AMAZON_MARKETPLACE_ID = 'test-solution-id'
  })

  it('returns credential check details without credentials', async () => {
    delete process.env.AMAZON_CLIENT_ID
    delete process.env.AMAZON_CLIENT_SECRET
    delete process.env.AMAZON_REFRESH_TOKEN
    vi.resetModules()
    const { GET } = await import('@/app/api/test-amazon-auth/route')

    const response = await GET(new NextRequest('http://localhost/api/test-amazon-auth'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.credentialCheck.hasClientId).toBe(false)
    expect(data.credentialCheck.hasClientSecret).toBe(false)
    expect(data.credentialCheck.hasRefreshToken).toBe(false)
  })

  it('returns token response when credentials are present', async () => {
    process.env.AMAZON_CLIENT_ID = 'client-id'
    process.env.AMAZON_CLIENT_SECRET = 'client-secret'
    process.env.AMAZON_REFRESH_TOKEN = 'refresh-token'
    vi.resetModules()
    const { GET } = await import('@/app/api/test-amazon-auth/route')

    const response = await GET(new NextRequest('http://localhost/api/test-amazon-auth'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.tokenResponse?.status).toBe(200)
  })

  afterEach(() => {
    process.env.AMAZON_CLIENT_ID = originalEnv.AMAZON_CLIENT_ID
    process.env.AMAZON_CLIENT_SECRET = originalEnv.AMAZON_CLIENT_SECRET
    process.env.AMAZON_REFRESH_TOKEN = originalEnv.AMAZON_REFRESH_TOKEN
    process.env.AMAZON_MARKETPLACE_ID = originalEnv.AMAZON_MARKETPLACE_ID
  })
})
