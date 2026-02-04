import { test, expect } from '@playwright/test'

test.describe('Auth Recovery Journey', () => {
  test.use({ storageState: { cookies: [], origins: [] } })
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/recover**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })
  })

  test('user requests reset and sees expired state', async ({ page }) => {
    await page.goto('/forgot-password')

    await page.getByPlaceholder(/you@example.com/i).fill('test-user@remyapp.dev')

    const start = Date.now()
    await page.getByRole('button', { name: /send reset link/i }).click()
    await expect(
      page.getByText(/reset link has been sent/i)
    ).toBeVisible()
    expect(Date.now() - start).toBeLessThan(5000)

    await page.goto('/reset-password')
    await expect(
      page.getByRole('heading', { name: /reset link expired/i })
    ).toBeVisible()
  })
})
