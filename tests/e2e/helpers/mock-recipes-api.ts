import { Page, Route } from '@playwright/test'

/**
 * Creates a stateful mock for the /api/recipes endpoint that:
 * - Returns paginated response format { recipes, nextCursor, hasMore }
 * - Remembers saved recipes across GET requests
 * - Supports POST to save recipes and DELETE to remove them
 */
export function createRecipesApiMock() {
  const savedRecipes: any[] = []

  return {
    /**
     * Setup route handler for /api/recipes
     */
    async setup(page: Page) {
      await page.route('**/api/recipes', async (route: Route) => {
        const method = route.request().method()
        const url = new URL(route.request().url())

        if (method === 'GET') {
          // Return saved recipes with pagination format
          const limit = parseInt(url.searchParams.get('limit') || '20')
          const cursor = url.searchParams.get('cursor')

          // Simple pagination: return all recipes for now
          // In a real implementation, you'd filter by cursor
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              recipes: savedRecipes,
              nextCursor: null,
              hasMore: false,
            }),
          })
          return
        }

        if (method === 'POST') {
          // Parse the request body to get recipe data
          const body = route.request().postDataJSON()
          const savedRecipe = {
            id: `recipe-${Date.now()}`,
            title: body.title,
            thumbnail: body.thumbnail,
            ingredients: body.ingredients,
            instructions: body.instructions,
            platform: body.platform || 'web',
            source: body.source || 'test',
            original_url: body.original_url || null,
            created_at: new Date().toISOString(),
            user_id: 'test-user',
            normalized_ingredients: body.normalizedIngredients || [],
          }

          // Add to the beginning (newest first)
          savedRecipes.unshift(savedRecipe)

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ recipe: savedRecipe }),
          })
          return
        }

        // Default response for other methods
        await route.fulfill({ status: 204, body: '' })
      })
    },

    /**
     * Setup route handler for /api/recipes/[id] (delete)
     * Matches any recipe ID
     */
    async setupDelete(page: Page) {
      await page.route('**/api/recipes/*', async (route: Route) => {
        if (route.request().method() === 'DELETE') {
          // Extract recipe ID from URL
          const url = route.request().url()
          const recipeId = url.split('/').pop()

          // Remove from saved recipes
          const index = savedRecipes.findIndex(r => r.id === recipeId)
          if (index !== -1) {
            savedRecipes.splice(index, 1)
          }

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          })
          return
        }
        await route.fulfill({ status: 204, body: '' })
      })
    },

    /**
     * Manually add a recipe to the mock (useful for test setup)
     */
    addRecipe(recipe: any) {
      savedRecipes.unshift(recipe)
    },

    /**
     * Clear all saved recipes
     */
    clear() {
      savedRecipes.length = 0
    },

    /**
     * Get current saved recipes
     */
    getRecipes() {
      return [...savedRecipes]
    },
  }
}
