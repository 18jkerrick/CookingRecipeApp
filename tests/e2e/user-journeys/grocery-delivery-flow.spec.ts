import { test, expect } from '@playwright/test'

test.describe('Grocery Delivery Journey', () => {
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

    await page.route('**/api/grocery-delivery/instacart', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          recipePageUrl:
            'https://customers.dev.instacart.tools/store/recipes/7289260?retailer_key=test-grocery',
        }),
      })
    })

    await page.route('**/rest/v1/**', async (route) => {
      const url = new URL(route.request().url())
      if (url.pathname.includes('/grocery_lists')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'list-1',
              name: 'Weeknight Dinner',
              created_at: '2026-02-01',
              visual: {
                type: 'gradient',
                gradient: { from: '#667eea', to: '#764ba2' },
              },
              grocery_items: [
                {
                  id: 'item-1',
                  name: 'flour',
                  sort_name: 'flour',
                  original_quantity_min: 2,
                  original_quantity_max: 2,
                  original_unit: 'cup',
                  category: 'pantry',
                  recipe_id: 'recipe-1',
                  checked: false,
                },
              ],
              grocery_list_recipes: [],
            },
          ]),
        })
        return
      }

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
  })

  test('opens Instacart shopping list from grocery list', async ({ page }) => {
    await page.goto('/grocery-list')

    await expect(
      page.getByRole('heading', { name: /your lists/i })
    ).toBeVisible()

    await page.getByRole('button', { name: /buy groceries/i }).click()
    await expect(
      page.getByRole('heading', { name: /shop for \d+ ingredients/i })
    ).toBeVisible()

    const start = Date.now()
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('button', { name: /shop on instacart/i }).click(),
    ])

    await expect(popup).toHaveURL(/instacart/)
    expect(Date.now() - start).toBeLessThan(8000)
  })
})
