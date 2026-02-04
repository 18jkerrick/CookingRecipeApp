// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/grocery-delivery/compare-prices/route'

vi.mock('@acme/db/server', () => ({
  supabase: {
    auth: { getSession: vi.fn() },
  },
}))

import { supabase } from '@acme/db/server'

const mockSupabase = supabase as unknown as {
  auth: { getSession: ReturnType<typeof vi.fn> }
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/grocery-delivery/compare-prices', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('/api/grocery-delivery/compare-prices', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when user is not authenticated', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } })

    const response = await POST(
      makeRequest({
        items: [{ name: 'flour', quantity: 2, unit: 'cup' }],
        zipCode: '94105',
      })
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('Unauthorized')
  })

  it('returns comparison data when request is valid', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
    })

    const response = await POST(
      makeRequest({
        items: [{ name: 'flour', quantity: 2, unit: 'cup' }],
        zipCode: '94105',
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.comparison).toBeTruthy()
    expect(data.comparison.instacart).toBeTruthy()
  })
})
