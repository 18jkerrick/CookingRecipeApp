import { test, expect } from '@playwright/test'

test.describe('Grocery List Merge Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('notificationPermissionRequested', 'true')
      localStorage.setItem('notificationPermission', 'denied')
    })

    const recipes = [
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
        ingredients: ['1 tbsp butter'],
        instructions: ['Stir'],
        created_at: '2026-02-01',
      },
    ]

    let list = {
      id: 'list-1',
      name: 'Weeknight Dinner',
      created_at: '2026-02-01',
      visual: { type: 'gradient', gradient: { from: '#667eea', to: '#764ba2' } },
    }
    let items = [
      {
        id: 'item-1',
        name: 'Flour',
        sort_name: 'flour',
        original_quantity_min: 2,
        original_quantity_max: 2,
        original_unit: 'cups',
        category: 'flours-sugars',
        recipe_id: 'recipe-1',
        checked: false,
      },
    ]
    let listRecipes = [
      {
        grocery_list_id: 'list-1',
        recipe_id: 'recipe-1',
        recipes: { id: 'recipe-1', title: 'Test Recipe A' },
      },
    ]

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
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                ...list,
                grocery_items: items,
                grocery_list_recipes: listRecipes,
              },
            ]),
          })
          return
        }
      }

      if (url.pathname.includes('/grocery_list_recipes')) {
        if (method === 'GET') {
          const recipeId = url.searchParams.get('recipe_id')?.replace('eq.', '')
          if (recipeId === 'recipe-2') {
            await route.fulfill({ status: 404, body: '' })
            return
          }
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ id: 'rel-1' }),
          })
          return
        }

        if (method === 'POST') {
          const body = request.postDataJSON()
          const relations = Array.isArray(body) ? body : [body]
          listRecipes = [
            ...listRecipes,
            ...relations.map((relation: any) => ({
              grocery_list_id: relation.grocery_list_id,
              recipe_id: relation.recipe_id,
              recipes: { id: relation.recipe_id, title: 'Test Recipe B' },
            })),
          ]
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
          const newItems = (Array.isArray(body) ? body : [body]).map(
            (item: any, index: number) => ({
              id: `item-${items.length + index + 1}`,
              name: item.name,
              sort_name: item.sort_name ?? item.name,
              original_quantity_min: item.original_quantity_min ?? 1,
              original_quantity_max: item.original_quantity_max ?? 1,
              original_unit: item.original_unit ?? '',
              category: item.category ?? 'dairy-eggs-fridge',
              recipe_id: item.recipe_id ?? 'recipe-2',
              checked: false,
            })
          )
          items = [...items, ...newItems]
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(newItems),
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

  test('adds another recipe to an existing list', async ({ page }) => {
    await page.goto('/cookbooks')
    await page.getByRole('link', { name: /grocery lists/i }).click()
    await expect(page).toHaveURL(/\/grocery-list/)

    await expect(page.getByText(/weeknight dinner/i)).toBeVisible()

    await page.getByRole('button', { name: /add recipe to list/i }).click()
    await expect(
      page.getByRole('heading', { name: /add recipe to list/i })
    ).toBeVisible()

    const start = Date.now()
    await page.getByText(/test recipe b/i).click()
    await expect(page.getByText(/test recipe b/i)).toBeVisible()
    await expect(page.getByText(/butter/i)).toBeVisible()
    expect(Date.now() - start).toBeLessThan(8000)
  })
})
