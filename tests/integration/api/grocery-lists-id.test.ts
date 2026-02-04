// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE, PUT } from '@/app/api/grocery-lists/[id]/route'

vi.mock('@acme/db/server', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from '@acme/db/server'

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/grocery-lists/list-1', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('/api/grocery-lists/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('updates a grocery list and its items', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'grocery_lists') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        }
      }
      if (table === 'grocery_items') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
          insert: vi.fn().mockResolvedValue({ error: null }),
        }
      }
      return {}
    })

    const response = await PUT(
      makeRequest({
        name: 'Updated List',
        grocery_items: [{ name: 'flour', quantity: 2, unit: 'cup' }],
      }),
      { params: Promise.resolve({ id: 'list-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('deletes a grocery list and its items', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'grocery_lists') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'list-1', name: 'Weekly' },
                error: null,
              }),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null, count: 1 }),
          })),
        }
      }
      if (table === 'grocery_items') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null, count: 2 }),
          })),
        }
      }
      return {}
    })

    const response = await DELETE(
      new NextRequest('http://localhost/api/grocery-lists/list-1'),
      { params: Promise.resolve({ id: 'list-1' }) }
    )

    expect(response.status).toBe(204)
  })
})
