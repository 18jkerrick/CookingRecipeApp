import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Auth - Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })
  })

  test('login page renders and disables submit for short password', async ({
    page,
  }) => {
    await page.goto('/login')

    await expect(
      page.getByText(/log in to your cookbooks/i)
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: /continue with google/i })
    ).toBeVisible()

    await page.getByPlaceholder('you@example.com').fill('test@example.com')
    await page.getByPlaceholder('••••••••').fill('short')

    await expect(page.getByRole('button', { name: /log in/i })).toBeDisabled()
  })

  test('signup page renders and disables submit for short password', async ({
    page,
  }) => {
    await page.goto('/signup')

    await expect(page.getByText(/create your account/i)).toBeVisible()

    await page.getByPlaceholder('you@example.com').fill('test@example.com')
    await page.getByPlaceholder(/minimum 8 characters/i).fill('short')
    await page.getByPlaceholder(/re-enter password/i).fill('short')

    await expect(
      page.getByRole('button', { name: /create account/i })
    ).toBeDisabled()
  })

  test('forgot password requires an email', async ({ page }) => {
    await page.goto('/forgot-password')

    await page.getByRole('button', { name: /reset password/i }).click()
    await expect(page.getByText(/please enter your email/i)).toBeVisible()
  })

  test('reset password shows expired state when unauthenticated', async ({
    page,
  }) => {
    await page.goto('/reset-password')

    await expect(page.getByText(/reset link expired/i)).toBeVisible()
    await expect(
      page.getByRole('link', { name: /get a new link/i })
    ).toBeVisible()
  })
})
