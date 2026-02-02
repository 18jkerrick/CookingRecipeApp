import { test, expect } from '@playwright/test'
import { mockRecipe, testRecipes } from '../fixtures/test-data'

test.describe('Recipe Extraction - Smoke', () => {
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
      page.getByRole('heading', { name: /your cookbooks/i })
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

    const dialogPromise = page.waitForEvent('dialog')
    await page.getByRole('button', { name: /extract recipe/i }).click()

    const dialog = await dialogPromise
    expect(dialog.message()).toMatch(/invalid url/i)
    await dialog.accept()
  })
})
