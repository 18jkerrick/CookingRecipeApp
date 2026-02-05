import { test, expect } from '@playwright/test'
import { mockRecipe } from '../fixtures/test-data'

test.describe('Recipe to Meal Plan Journey', () => {
  test.beforeEach(async ({ page }) => {
    const savedRecipe = {
      id: 'recipe-1',
      created_at: '2026-02-02T00:00:00.000Z',
      thumbnail: '',
      ...mockRecipe,
    }

    await page.addInitScript(() => {
      if (!window.localStorage.getItem('mealPlansInitialized')) {
        window.localStorage.removeItem('mealPlans')
        window.localStorage.setItem('mealPlansInitialized', '1')
      }
    })

    // Use regex to match /api/recipes with or without query params
    await page.route(/\/api\/recipes(\?.*)?$/, async (route) => {
      const method = route.request().method()

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            recipes: [savedRecipe],
            nextCursor: null,
            hasMore: false,
          }),
        })
        return
      }

      await route.fulfill({ status: 204, body: '' })
    })

    await page.route('**/auth/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })
  })

  test('user adds recipe to meal plan and it persists', async ({ page }) => {
    await page.goto('/meal-planner')

    await expect(
      page.getByRole('heading', { name: /meal planner/i })
    ).toBeVisible()

    await page.locator('.calendar-cell button').first().click()

    await expect(
      page.getByRole('heading', { name: /select recipe/i })
    ).toBeVisible()

    const modal = page
      .getByRole('heading', { name: /select recipe/i })
      .locator('..')
      .locator('..')
    const recipeCard = modal
      .locator('div.cursor-pointer', { hasText: /test recipe/i })
      .first()
    await recipeCard.click()

    const plannedRecipe = page.locator('.calendar-cell .recipe-title', {
      hasText: /test recipe/i,
    })

    await expect(plannedRecipe.first()).toBeVisible()

    await page.reload()

    await expect(plannedRecipe.first()).toBeVisible()
  })
})
