import { test, expect } from '@playwright/test'

test.describe('Grocery List Lifecycle Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('notificationPermissionRequested', 'true')
      localStorage.setItem('notificationPermission', 'denied')
    })
    const recipes = [
      {
        id: 'recipe-1',
        title: 'Test Recipe',
        thumbnail: '',
        ingredients: ['2 cups flour', '3 eggs'],
        instructions: ['Mix'],
        created_at: '2026-02-01',
      },
    ]

    let list: any = null
    let items: any[] = []
    let listRecipes: any[] = []

    await page.route('**/api/recipes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ recipes }),
        })
        return
      }
      await route.fulfill({ status: 204, body: '' })
    })

    await page.route('**/rest/v1/**', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const method = request.method()

      if (url.pathname.includes('/grocery_lists')) {
        if (method === 'GET') {
          const response = list
            ? [
                {
                  ...list,
                  grocery_items: items,
                  grocery_list_recipes: listRecipes,
                },
              ]
            : []
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(response),
          })
          return
        }

        if (method === 'POST') {
          const body = request.postDataJSON() as { name?: string }
          list = {
            id: 'list-1',
            name: body.name ?? 'New List',
            created_at: new Date().toISOString(),
            visual: { type: 'gradient', gradient: { from: '#667eea', to: '#764ba2' } },
          }
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(list),
          })
          return
        }

        if (method === 'DELETE') {
          list = null
          items = []
          listRecipes = []
          await route.fulfill({ status: 204, body: '' })
          return
        }
      }

      if (url.pathname.includes('/grocery_list_recipes')) {
        if (method === 'POST') {
          const body = request.postDataJSON()
          const relations = Array.isArray(body) ? body : [body]
          listRecipes = relations.map((relation: any) => ({
            grocery_list_id: relation.grocery_list_id,
            recipe_id: relation.recipe_id,
            recipes: { id: relation.recipe_id, title: recipes[0].title },
          }))
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(relations),
          })
          return
        }
      }

      if (url.pathname.includes('/grocery_items')) {
        if (method === 'POST') {
          const body = request.postDataJSON()
          const newItems = (Array.isArray(body) ? body : [body]).map((item: any, index: number) => ({
            id: `item-${index + 1}`,
            name: item.name,
            sort_name: item.sort_name ?? item.name,
            original_quantity_min: item.original_quantity_min ?? item.quantity ?? 1,
            original_quantity_max: item.original_quantity_max ?? item.quantity ?? 1,
            original_unit: item.original_unit ?? item.unit ?? '',
            category: item.category ?? 'pantry',
            recipe_id: item.recipe_id ?? 'recipe-1',
            checked: item.checked ?? false,
          }))
          items = newItems
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(newItems),
          })
          return
        }

        if (method === 'PATCH') {
          const body = request.postDataJSON()
          const itemId = url.searchParams.get('id')?.replace('eq.', '')
          items = items.map((item) =>
            item.id === itemId ? { ...item, ...body } : item
          )
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(items),
          })
          return
        }
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.route('**/auth/v1/**', async (route) => {
      const url = route.request().url()
      if (url.includes('/user')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'user-1', email: 'test-user@remyapp.dev' }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })
  })

  test('creates, edits, and deletes a grocery list', async ({ page }) => {
    await page.goto('/cookbooks')
    const dismissPrompt = page.getByRole('button', { name: /not now/i })
    if (await dismissPrompt.isVisible()) {
      await dismissPrompt.click()
    }
    await page.getByRole('link', { name: /grocery lists/i }).click()
    await expect(page).toHaveURL(/\/grocery-list/)

    await expect(
      page.getByRole('heading', { name: /your lists/i })
    ).toBeVisible()

    await page.getByRole('button', { name: /create grocery list/i }).click()
    await page.getByPlaceholder(/enter list name/i).fill('Weeknight Dinner')
    await page.getByText(/test recipe/i).click()

    const start = Date.now()
    await page.getByRole('button', { name: /create list/i }).click()
    await expect(page.getByText(/weeknight dinner/i)).toBeVisible()
    expect(Date.now() - start).toBeLessThan(8000)

    const flourCard = page.locator('div.w-72.h-64').filter({ hasText: /flour/i }).first()
    await flourCard.locator('button').first().click()
    const qtyInput = page.getByPlaceholder(/4 or 4-5/i).first()
    await qtyInput.fill('3')
    await page.getByRole('button', { name: /^save$/i }).first().click()

    const listCard = page.getByText(/weeknight dinner/i).first().locator('..')
    await listCard.locator('button').nth(2).click()
    await expect(page.getByText(/weeknight dinner/i)).toHaveCount(0)
  })
})
