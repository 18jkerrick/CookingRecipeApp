import { test, expect } from '@playwright/test'
import { mockRecipe, testRecipes } from '../fixtures/test-data'

test.describe('Recipe Extraction - Smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Suppress notification prompt
    await page.addInitScript(() => {
      localStorage.setItem('notificationPermissionRequested', 'true')
      localStorage.setItem('notificationPermission', 'denied')
    })

    // Stateful mock that persists saved recipes
    const savedRecipes: any[] = []

    await page.route('**/api/recipes*', async (route) => {
      const method = route.request().method()

      if (method === 'GET') {
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
        savedRecipes.unshift(savedRecipe)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: savedRecipe }),
        })
        return
      }

      await route.fulfill({ status: 204, body: '' })
    })

    await page.route('**/api/parse-url', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRecipe),
      })
    })

    await page.goto('/cookbooks')
  })

  test('extracts recipe from TikTok URL', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /cookbook/i })
    ).toBeVisible()

    const urlInput = page.getByPlaceholder(/paste a recipe url here/i)
    await urlInput.fill(testRecipes.tiktokUrl)

    await page.getByRole('button', { name: /extract recipe/i }).click()

    await expect(
      page.getByRole('heading', { name: /test recipe/i })
    ).toBeVisible({ timeout: 15_000 })

    await page.getByRole('heading', { name: /test recipe/i }).click()
    await expect(
      page.getByRole('button', { name: /ingredients/i })
    ).toBeVisible()
    await expect(page.getByText(/2 cups flour/i)).toBeVisible()
  })

  test('extracts recipe from YouTube URL', async ({ page }) => {
    const urlInput = page.getByPlaceholder(/paste a recipe url here/i)
    await urlInput.fill(testRecipes.youtubeUrl)

    await page.getByRole('button', { name: /extract recipe/i }).click()

    await expect(
      page.getByRole('heading', { name: /test recipe/i })
    ).toBeVisible({ timeout: 15_000 })
  })

  test('shows an error for invalid URLs', async ({ page }) => {
    await page.unroute('**/api/parse-url')
    await page.route('**/api/parse-url', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid URL' }),
      })
    })

    const urlInput = page.getByPlaceholder(/paste a recipe url here/i)
    await urlInput.fill('https://not-a-recipe-site.com')

    const dialogPromise = new Promise<string>((resolve) => {
      page.once('dialog', async (dialog) => {
        const message = dialog.message()
        await dialog.accept()
        resolve(message)
      })
    })

    const [response, dialogMessage] = await Promise.all([
      page.waitForResponse('**/api/parse-url'),
      dialogPromise,
      page.getByRole('button', { name: /extract recipe/i }).click(),
    ])

    expect(response.status()).toBe(400)
    expect(dialogMessage).toMatch(/invalid url/i)
  })
})
