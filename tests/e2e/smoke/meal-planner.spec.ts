import { test, expect } from '@playwright/test'

test.describe('Meal Planner - Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipes: [] }),
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

    await page.goto('/meal-planner')
  })

  test('renders meal planner grid', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /meal planner/i })
    ).toBeVisible()

    await expect(
      page.getByRole('heading', { name: /your recipes/i })
    ).toBeVisible()
  })

  test('shows days of the week', async ({ page }) => {
    await expect(page.getByText(/monday/i)).toBeVisible()
    await expect(page.getByText(/sunday/i)).toBeVisible()
  })

  test('opens recipe selection modal', async ({ page }) => {
    await page.locator('.calendar-cell button').first().click()

    await expect(
      page.getByRole('heading', { name: /select recipe/i })
    ).toBeVisible()
    await expect(page.getByText(/no recipes found/i)).toBeVisible()
  })
})
