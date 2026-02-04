import { test, expect } from '@playwright/test'
import { mockRecipe, testRecipes } from '../fixtures/test-data'

test.describe('Recipe Lifecycle Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/recipes', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipes: [] }),
        })
        return
      }

      if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipe: { id: 'recipe-1' } }),
        })
        return
      }

      await route.fulfill({ status: 204, body: '' })
    })

    await page.route('**/api/recipes/recipe-1', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
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
  })

  test('extracts, saves, opens, and deletes a recipe', async ({ page }) => {
    await page.goto('/cookbooks')

    const urlInput = page.getByPlaceholder(/paste a recipe url here/i)
    await urlInput.fill(testRecipes.tiktokUrl)

    const start = Date.now()
    await page.getByRole('button', { name: /extract recipe/i }).click()
    await expect(
      page.getByRole('heading', { name: /test recipe/i })
    ).toBeVisible({ timeout: 15_000 })
    expect(Date.now() - start).toBeLessThan(8000)

    await page.getByRole('heading', { name: /test recipe/i }).click()
    await expect(page.getByText(/2 cups flour/i)).toBeVisible()

    await page.getByRole('button', { name: /cookbooks/i }).click()
    await expect(
      page.getByRole('heading', { name: /delete recipe/i })
    ).toBeVisible()
    await page.getByRole('button', { name: /delete/i }).click()

    await expect(
      page.getByRole('heading', { name: /test recipe/i })
    ).toHaveCount(0)
  })
})
