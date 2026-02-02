// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT } from '@/app/api/grocery-lists/route'

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
  return new NextRequest('http://localhost/api/grocery-lists', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('/api/grocery-lists', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns lists with displayQuantity mapped', async () => {
    const groceryListsResult = {
      data: [
        {
          id: 'list-1',
          name: 'Weekly',
          created_at: '2026-02-01',
          grocery_items: [
            {
              id: 'item-1',
              name: 'flour',
              quantity: 2,
              unit: 'cup',
              display_quantity: '2',
            },
          ],
        },
      ],
      error: null,
    }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'grocery_lists') {
        return {
          select: vi.fn(() => ({
            order: vi.fn().mockResolvedValue(groceryListsResult),
          })),
        }
      }
      return {}
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.lists).toHaveLength(1)
    expect(data.lists[0].grocery_items[0].displayQuantity).toBe('2')
  })

  it('creates a grocery list with items', async () => {
    const listInsertResult = {
      data: { id: 'list-1', name: 'Dinner' },
      error: null,
    }
    const itemsInsertResult = { error: null }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'grocery_lists') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue(listInsertResult),
            })),
          })),
        }
      }
      if (table === 'grocery_items') {
        return {
          insert: vi.fn().mockResolvedValue(itemsInsertResult),
        }
      }
      return {}
    })

    const response = await POST(
      makeRequest({
        name: 'Dinner',
        items: [{ name: 'flour', quantity: 2, unit: 'cup' }],
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.listId).toBe('list-1')
  })

  it('updates a grocery list and items', async () => {
    const updateResult = { error: null }
    const deleteResult = { error: null }
    const itemsInsertResult = { error: null }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'grocery_lists') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue(updateResult),
          })),
        }
      }
      if (table === 'grocery_items') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue(deleteResult),
          })),
          insert: vi.fn().mockResolvedValue(itemsInsertResult),
        }
      }
      return {}
    })

    const response = await PUT(
      makeRequest({
        listId: 'list-1',
        name: 'Updated',
        items: [{ name: 'eggs', quantity: 3, unit: '' }],
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
