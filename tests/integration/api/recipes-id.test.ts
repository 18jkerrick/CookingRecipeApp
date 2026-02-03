// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE, PUT } from '@/app/api/recipes/[id]/route'

vi.mock('@acme/db/server', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}))

import { supabase } from '@acme/db/server'

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>
  auth: { getUser: ReturnType<typeof vi.fn> }
}

function makeRequest(body: Record<string, unknown>, auth?: string) {
  return new NextRequest('http://localhost/api/recipes/recipe-1', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { authorization: auth } : {}),
    },
  })
}

describe('/api/recipes/[id]', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when authorization header is missing', async () => {
    const response = await PUT(
      makeRequest(
        { title: 'Test', ingredients: ['1 cup flour'], instructions: ['Mix'] },
        undefined
      ),
      { params: Promise.resolve({ id: 'recipe-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('authorization')
  })

  it('updates a recipe for an authenticated user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'recipes') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'recipe-1', title: 'Adobo' },
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        }
      }
      return {}
    })

    const response = await PUT(
      makeRequest(
        {
          title: 'Adobo',
          ingredients: ['2 cups flour'],
          instructions: ['Mix'],
          thumbnail: null,
        },
        'Bearer token-1'
      ),
      { params: Promise.resolve({ id: 'recipe-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('recipe-1')
  })

  it('deletes a recipe for an authenticated user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'recipes') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          })),
        }
      }
      return {}
    })

    const response = await DELETE(
      new NextRequest('http://localhost/api/recipes/recipe-1', {
        headers: { authorization: 'Bearer token-1' },
      }),
      { params: Promise.resolve({ id: 'recipe-1' }) }
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
