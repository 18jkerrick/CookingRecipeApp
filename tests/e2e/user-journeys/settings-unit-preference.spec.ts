import { test, expect } from '@playwright/test'

test.describe('Settings - Unit Preference', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    })
  })

  test('updates unit preference and saves', async ({ page }) => {
    await page.goto('/settings')

    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()

    await page.getByRole('radio', { name: /metric/i }).check()

    const start = Date.now()
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.getByText(/settings saved successfully/i)).toBeVisible()
    expect(Date.now() - start).toBeLessThan(5000)

    const stored = await page.evaluate(() => localStorage.getItem('unitPreference'))
    expect(stored).toBe('metric')
  })
})
