// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/recipes/route'

vi.mock('@acme/db/server', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

import { supabase } from '@acme/db/server'

const mockSupabase = supabase as unknown as {
  from: ReturnType<typeof vi.fn>
  auth: { getUser: ReturnType<typeof vi.fn> }
}

function makeRequest(body: Record<string, unknown>, auth?: string) {
  return new NextRequest('http://localhost/api/recipes', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { authorization: auth } : {}),
    },
  })
}

describe('/api/recipes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('returns 401 when authorization header is missing', async () => {
    const request = new NextRequest('http://localhost/api/recipes', {
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('authorization')
  })

  it('returns recipes for an authenticated user', async () => {
    const recipesResult = {
      data: [{ id: 'recipe-1', title: 'Adobo' }],
      error: null,
    }

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'recipes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue(recipesResult),
            })),
          })),
        }
      }
      return {}
    })

    const request = new NextRequest('http://localhost/api/recipes', {
      headers: { authorization: 'Bearer token-1' },
    })
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.recipes).toHaveLength(1)
  })

  it('returns 400 when required fields are missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const response = await POST(
      makeRequest(
        {
          title: 'Test',
          ingredients: ['1 cup flour'],
          platform: 'TikTok',
          source: 'captions',
        },
        'Bearer token-1'
      )
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required fields')
  })

  it('creates a recipe for an authenticated user', async () => {
    const insertResult = {
      data: { id: 'recipe-1', title: 'Adobo' },
      error: null,
    }

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'recipes') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue(insertResult),
            })),
          })),
        }
      }
      return {}
    })

    const response = await POST(
      makeRequest(
        {
          title: 'Adobo',
          thumbnail: null,
          ingredients: ['2 cups flour'],
          instructions: ['Mix'],
          platform: 'TikTok',
          source: 'captions',
        },
        'Bearer token-1'
      )
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.recipe.id).toBe('recipe-1')
  })
})
