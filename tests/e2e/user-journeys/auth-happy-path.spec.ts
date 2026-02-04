import { test, expect } from '@playwright/test'

test.describe('Auth Happy Path Journey', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/signup', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-1',
            email: 'test-user@remyapp.dev',
            identities: [{ id: 'identity-1' }],
          },
          session: null,
        }),
      })
    })

    await page.route('**/auth/v1/token*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          token_type: 'bearer',
          expires_in: 3600,
          user: { id: 'user-1', email: 'test-user@remyapp.dev' },
        }),
      })
    })

    await page.route('**/auth/v1/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'user-1', email: 'test-user@remyapp.dev' }),
      })
    })

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
  })

  test('user signs up then logs in to cookbooks', async ({ page }) => {
    await page.goto('/signup')

    await page.getByPlaceholder(/you@example.com/i).fill('test-user@remyapp.dev')
    await page.getByPlaceholder(/minimum 8 characters/i).fill('StrongPass1')
    await page.getByPlaceholder(/re-enter password/i).fill('StrongPass1')
    await page.getByRole('button', { name: /create account/i }).click()

    await expect(
      page.getByText(/check your email to verify|account already exists/i)
    ).toBeVisible()

    await page.goto('/login')
    await page.getByPlaceholder(/you@example.com/i).fill('test-user@remyapp.dev')
    await page.getByPlaceholder(/••••••••/).fill('StrongPass1')

    const start = Date.now()
    await page.getByRole('button', { name: /log in/i }).click()
    await expect(page).toHaveURL(/\/cookbooks/)
    await expect(
      page.getByRole('heading', { name: /cookbook/i })
    ).toBeVisible()
    expect(Date.now() - start).toBeLessThan(5000)
  })
})
