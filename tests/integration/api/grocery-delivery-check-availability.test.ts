// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/grocery-delivery/check-availability/route'

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/grocery-delivery/check-availability', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('/api/grocery-delivery/check-availability', () => {
  it('returns 400 for invalid zip code', async () => {
    const response = await POST(makeRequest({ zipCode: 'abc' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('ZIP')
  })

  it('returns availability for valid zip code', async () => {
    const response = await POST(makeRequest({ zipCode: '94105' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.availability).toBeTruthy()
    expect(typeof data.availability.amazonFresh).toBe('boolean')
  })
})
