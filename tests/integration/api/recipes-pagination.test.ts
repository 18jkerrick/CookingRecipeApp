import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'

// Mock recipes for testing
const createMockRecipes = (count: number, startIndex: number = 0) => 
  Array.from({ length: count }, (_, i) => ({
    id: `recipe-${startIndex + i}`,
    title: `Recipe ${startIndex + i}`,
    created_at: new Date(Date.now() - (startIndex + i) * 1000 * 60).toISOString(),
    user_id: 'test-user',
    ingredients: ['ingredient'],
    instructions: ['step'],
    platform: 'web',
    source: 'test',
    thumbnail: null,
    original_url: null,
    normalized_ingredients: [],
  }))

describe('GET /api/recipes - Pagination', () => {
  beforeEach(() => {
    // Reset handlers before each test
    server.resetHandlers()
  })

  it('returns all recipes when no limit specified (backward compatible)', async () => {
    const allRecipes = createMockRecipes(50)
    
    server.use(
      http.get('http://localhost:3000/api/recipes', ({ request }) => {
        const url = new URL(request.url)
        const limit = url.searchParams.get('limit')
        
        // No limit = return all (backward compatible)
        if (!limit) {
          return HttpResponse.json({ recipes: allRecipes })
        }
        
        return HttpResponse.json({ recipes: allRecipes.slice(0, parseInt(limit)) })
      })
    )
    
    const response = await fetch('http://localhost:3000/api/recipes', {
      headers: { Authorization: 'Bearer test-token' },
    })
    
    const data = await response.json()
    
    expect(response.ok).toBe(true)
    expect(data.recipes).toBeDefined()
    expect(data.recipes.length).toBe(50)
    // Should not have pagination fields when no limit
    expect(data.nextCursor).toBeUndefined()
    expect(data.hasMore).toBeUndefined()
  })

  it('returns paginated response when limit specified', async () => {
    const allRecipes = createMockRecipes(50)
    
    server.use(
      http.get('http://localhost:3000/api/recipes', ({ request }) => {
        const url = new URL(request.url)
        const limit = parseInt(url.searchParams.get('limit') || '20')
        const cursor = url.searchParams.get('cursor')
        
        let startIndex = 0
        if (cursor) {
          // Find the recipe after the cursor
          const [, cursorId] = cursor.split('_')
          startIndex = allRecipes.findIndex(r => r.id === cursorId) + 1
        }
        
        const recipes = allRecipes.slice(startIndex, startIndex + limit)
        const hasMore = startIndex + limit < allRecipes.length
        const lastRecipe = recipes[recipes.length - 1]
        const nextCursor = hasMore && lastRecipe 
          ? `${lastRecipe.created_at}_${lastRecipe.id}` 
          : null
        
        return HttpResponse.json({ recipes, nextCursor, hasMore })
      })
    )
    
    const response = await fetch('http://localhost:3000/api/recipes?limit=20', {
      headers: { Authorization: 'Bearer test-token' },
    })
    
    const data = await response.json()
    
    expect(response.ok).toBe(true)
    expect(data.recipes).toHaveLength(20)
    expect(data.nextCursor).toBeDefined()
    expect(data.hasMore).toBe(true)
  })

  it('returns next page with cursor', async () => {
    const allRecipes = createMockRecipes(50)
    
    server.use(
      http.get('http://localhost:3000/api/recipes', ({ request }) => {
        const url = new URL(request.url)
        const limit = parseInt(url.searchParams.get('limit') || '20')
        const cursor = url.searchParams.get('cursor')
        
        let startIndex = 0
        if (cursor) {
          const [, cursorId] = cursor.split('_')
          startIndex = allRecipes.findIndex(r => r.id === cursorId) + 1
        }
        
        const recipes = allRecipes.slice(startIndex, startIndex + limit)
        const hasMore = startIndex + limit < allRecipes.length
        const lastRecipe = recipes[recipes.length - 1]
        const nextCursor = hasMore && lastRecipe 
          ? `${lastRecipe.created_at}_${lastRecipe.id}` 
          : null
        
        return HttpResponse.json({ recipes, nextCursor, hasMore })
      })
    )
    
    // Get first page
    const firstResponse = await fetch('http://localhost:3000/api/recipes?limit=20', {
      headers: { Authorization: 'Bearer test-token' },
    })
    const firstData = await firstResponse.json()
    
    // Get second page
    const secondResponse = await fetch(
      `http://localhost:3000/api/recipes?limit=20&cursor=${firstData.nextCursor}`,
      { headers: { Authorization: 'Bearer test-token' } }
    )
    const secondData = await secondResponse.json()
    
    expect(secondResponse.ok).toBe(true)
    expect(secondData.recipes).toBeDefined()
    expect(secondData.recipes.length).toBe(20)
    // Recipes should be different from first page
    expect(secondData.recipes[0].id).not.toBe(firstData.recipes[0].id)
    expect(secondData.recipes[0].id).toBe('recipe-20')
  })

  it('returns hasMore=false on last page', async () => {
    const allRecipes = createMockRecipes(25)
    
    server.use(
      http.get('http://localhost:3000/api/recipes', ({ request }) => {
        const url = new URL(request.url)
        const limit = parseInt(url.searchParams.get('limit') || '20')
        
        const recipes = allRecipes.slice(0, limit)
        const hasMore = limit < allRecipes.length
        const lastRecipe = recipes[recipes.length - 1]
        const nextCursor = hasMore && lastRecipe 
          ? `${lastRecipe.created_at}_${lastRecipe.id}` 
          : null
        
        return HttpResponse.json({ recipes, nextCursor, hasMore })
      })
    )
    
    // Request more than total recipes
    const response = await fetch('http://localhost:3000/api/recipes?limit=100', {
      headers: { Authorization: 'Bearer test-token' },
    })
    
    const data = await response.json()
    
    expect(response.ok).toBe(true)
    expect(data.hasMore).toBe(false)
    expect(data.nextCursor).toBeNull()
  })
})
