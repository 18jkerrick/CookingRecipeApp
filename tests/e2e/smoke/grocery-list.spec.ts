import { test, expect } from '@playwright/test'

test.describe('Grocery List - Smoke', () => {
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

    await page.route('**/rest/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.route('**/auth/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })

    await page.goto('/grocery-list')
  })

  test('shows empty state when no lists', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /your lists/i })
    ).toBeVisible()

    await expect(
      page.getByText(/no grocery lists yet/i)
    ).toBeVisible()
  })

  test('opens create list modal from empty state', async ({ page }) => {
    await page.getByRole('button', { name: /create grocery list/i }).click()

    await expect(
      page.getByRole('heading', { name: /create grocery list/i })
    ).toBeVisible()
    await expect(
      page.getByPlaceholder(/enter list name/i)
    ).toBeVisible()
  })

  test('can cancel create list modal', async ({ page }) => {
    await page.getByRole('button', { name: /create grocery list/i }).click()
    await expect(
      page.getByRole('heading', { name: /create grocery list/i })
    ).toBeVisible()

    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(
      page.getByRole('heading', { name: /create grocery list/i })
    ).toBeHidden()
  })
})
