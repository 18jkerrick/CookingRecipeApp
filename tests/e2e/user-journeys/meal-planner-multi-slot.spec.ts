import { test, expect } from '@playwright/test'

test.describe('Meal Planner Multi-Slot Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            recipes: [
              {
                id: 'recipe-1',
                title: 'Test Recipe A',
                thumbnail: '',
                ingredients: ['2 cups flour'],
                instructions: ['Mix'],
                created_at: '2026-02-01',
              },
              {
                id: 'recipe-2',
                title: 'Test Recipe B',
                thumbnail: '',
                ingredients: ['3 eggs'],
                instructions: ['Whisk'],
                created_at: '2026-02-01',
              },
            ],
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

  test('adds recipes to two slots and removes one', async ({ page }) => {
    await page.goto('/meal-planner')

    await expect(
      page.getByRole('heading', { name: /meal planner/i })
    ).toBeVisible()

    const start = Date.now()
    await page.locator('.calendar-cell button').first().click()

    const modal = page
      .getByRole('heading', { name: /select recipe/i })
      .locator('..')
      .locator('..')
    await modal.locator('div.cursor-pointer', { hasText: /test recipe a/i }).first().click()

    await expect(
      page.locator('.calendar-cell .recipe-title', { hasText: /test recipe a/i }).first()
    ).toBeVisible()
    expect(Date.now() - start).toBeLessThan(5000)

    await page.locator('.calendar-cell button').nth(1).click()
    const modalTwo = page
      .getByRole('heading', { name: /select recipe/i })
      .locator('..')
      .locator('..')
    await modalTwo.locator('div.cursor-pointer', { hasText: /test recipe b/i }).first().click()

    await expect(
      page.locator('.calendar-cell .recipe-title', { hasText: /test recipe b/i }).first()
    ).toBeVisible()

    await page
      .locator('.calendar-cell', { hasText: /test recipe a/i })
      .locator('button')
      .filter({ hasText: '✕' })
      .first()
      .click()

    await expect(
      page.locator('.calendar-cell .recipe-title', { hasText: /test recipe a/i })
    ).toHaveCount(0)
  })
})
