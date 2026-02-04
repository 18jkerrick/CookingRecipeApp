import { test, expect } from '@playwright/test'
import { mockRecipe, testRecipes } from '../fixtures/test-data'

test.describe('Recipe to Grocery List Journey', () => {
  test.beforeEach(async ({ page }) => {
    let listCreated = false
    let listName = ''
    let listCreatedAt = new Date().toISOString()
    let groceryItems: Array<Record<string, unknown>> = []
    let groceryListRecipes: Array<Record<string, unknown>> = []

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

    await page.route('**/rest/v1/**', async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const method = request.method()

      if (url.pathname.includes('/grocery_lists')) {
        if (method === 'GET') {
          if (!listCreated) {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([]),
            })
            return
          }

          const listResponse = [
            {
              id: 'list-1',
              name: listName,
              created_at: listCreatedAt,
              visual: {
                type: 'gradient',
                gradient: { from: '#667eea', to: '#764ba2' },
              },
              grocery_items: groceryItems,
              grocery_list_recipes: groceryListRecipes,
            },
          ]

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(listResponse),
          })
          return
        }

        if (method === 'POST') {
          const body = request.postDataJSON() as { name?: string }
          listName = body.name ?? 'New List'
          listCreatedAt = new Date().toISOString()
          listCreated = true

          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'list-1',
              name: listName,
              created_at: listCreatedAt,
              visual: {
                type: 'gradient',
                gradient: { from: '#667eea', to: '#764ba2' },
              },
            }),
          })
          return
        }
      }

      if (url.pathname.includes('/grocery_list_recipes')) {
        if (method === 'POST') {
          const body = request.postDataJSON()
          const relations = Array.isArray(body) ? body : [body]
          groceryListRecipes = relations.map((relation: any) => ({
            grocery_list_id: relation.grocery_list_id,
            recipe_id: relation.recipe_id,
            recipes: {
              id: relation.recipe_id,
              title: mockRecipe.title,
            },
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
          const items = Array.isArray(body) ? body : [body]
          groceryItems = items.map((item: any, index: number) => ({
            id: `item-${index + 1}`,
            name: item.name,
            sort_name: item.sort_name,
            original_quantity_min: item.original_quantity_min,
            original_quantity_max: item.original_quantity_max,
            original_unit: item.original_unit,
            metric_quantity_min: item.metric_quantity_min,
            metric_quantity_max: item.metric_quantity_max,
            metric_unit: item.metric_unit,
            imperial_quantity_min: item.imperial_quantity_min,
            imperial_quantity_max: item.imperial_quantity_max,
            imperial_unit: item.imperial_unit,
            category: item.category,
            recipe_id: item.recipe_id,
            checked: item.checked,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))

          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify(groceryItems),
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })
  })

  test('user extracts recipe and creates grocery list', async ({ page }) => {
    await page.goto('/cookbooks')

    await expect(
      page.getByRole('heading', { name: /cookbook/i })
    ).toBeVisible()

    const urlInput = page.getByPlaceholder(/paste a recipe url here/i)
    await urlInput.fill(testRecipes.tiktokUrl)
    await page.getByRole('button', { name: /extract recipe/i }).click()

    const recipeHeading = page.getByRole('heading', { name: /test recipe/i })
    await expect(recipeHeading).toBeVisible({ timeout: 15_000 })
    await recipeHeading.first().click()

    await page.getByRole('button', { name: /^grocery$/i }).click()
    await expect(
      page.getByRole('heading', { name: /add to grocery list/i })
    ).toBeVisible()

    await page.getByRole('button', { name: /add \d+ items?/i }).click()
    await expect(
      page.getByRole('heading', { name: /choose list/i })
    ).toBeVisible()

    await page.getByRole('button', { name: /\+ create new list/i }).click()
    await page.getByPlaceholder(/enter list name/i).fill('Weeknight Dinner')
    await page.getByRole('button', { name: /^create$/i }).click()

    await expect(
      page.getByRole('heading', { name: /choose list/i })
    ).toHaveCount(0)

    await page.goto('/grocery-list')
    await expect(
      page.getByRole('heading', { name: /your lists/i })
    ).toBeVisible()
    await expect(page.getByText(/weeknight dinner/i)).toBeVisible()
    await expect(page.getByText(/^flour$/i)).toBeVisible()
  })
})
