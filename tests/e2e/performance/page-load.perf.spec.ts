import { test, expect } from '@playwright/test'

/**
 * Performance thresholds - should match tests/performance/thresholds.ts
 * 
 * Note: These are "relaxed" thresholds (2x social media standards) to account for:
 * - Cold start compilation in dev mode
 * - Supabase latency
 * - Development environment overhead
 * - Browser differences (webkit tends to be slower)
 */
const THRESHOLDS = {
  TIME_TO_LOADING_STATE_MS: 1500,  // Time for any loading indicator (skeleton or text) - increased for CI variance
  TIME_TO_FIRST_CONTENT_MS: 3500,  // Time for real data to appear (increased for webkit)
}

/**
 * Page load performance tests using Playwright.
 * 
 * These tests measure actual page load times:
 * - Time to loading state: How quickly a loading indicator appears
 * - Time to first content: How quickly real data appears
 * 
 * Run with: pnpm test:perf:e2e
 */
test.describe('Page Load Performance', () => {
  
  test('cookbooks page shows loading state within threshold', async ({ page }) => {
    const startTime = Date.now()
    
    // Start navigation but don't wait for full load
    const navigationPromise = page.goto('/cookbooks', { waitUntil: 'commit' })
    
    // Wait for skeleton or loading indicator (use .or() to combine locators)
    const skeleton = page.locator('[data-testid="recipe-skeleton"], [data-testid="recipe-grid-skeleton"]').first()
    const loadingText = page.getByText('Loading')
    await skeleton.or(loadingText).waitFor({ state: 'visible', timeout: THRESHOLDS.TIME_TO_LOADING_STATE_MS + 500 })
    
    const loadingTime = Date.now() - startTime
    
    await navigationPromise
    
    console.log(`Cookbooks loading state in ${loadingTime}ms (threshold: ${THRESHOLDS.TIME_TO_LOADING_STATE_MS}ms)`)
    expect(loadingTime).toBeLessThan(THRESHOLDS.TIME_TO_LOADING_STATE_MS)
  })

  test('cookbooks page shows first content within threshold', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/cookbooks')
    
    // Wait for skeleton to disappear (meaning content loaded)
    const skeleton = page.locator('[data-testid="recipe-grid-skeleton"]')
    await skeleton.waitFor({ state: 'hidden', timeout: THRESHOLDS.TIME_TO_FIRST_CONTENT_MS + 500 })
    
    const contentTime = Date.now() - startTime
    
    console.log(`Cookbooks first content in ${contentTime}ms (threshold: ${THRESHOLDS.TIME_TO_FIRST_CONTENT_MS}ms)`)
    expect(contentTime).toBeLessThan(THRESHOLDS.TIME_TO_FIRST_CONTENT_MS)
  })

  test('meal planner page shows loading state within threshold', async ({ page }) => {
    const startTime = Date.now()
    
    const navigationPromise = page.goto('/meal-planner', { waitUntil: 'commit' })
    
    // Wait for skeleton or loading indicator in the recipe sidebar
    const skeleton = page.locator('[data-testid="recipe-sidebar-skeleton"], [data-testid="recipe-skeleton"]').first()
    const loadingText = page.getByText('Loading')
    await skeleton.or(loadingText).waitFor({ state: 'visible', timeout: THRESHOLDS.TIME_TO_LOADING_STATE_MS + 500 })
    
    const loadingTime = Date.now() - startTime
    
    await navigationPromise
    
    console.log(`Meal planner loading state in ${loadingTime}ms (threshold: ${THRESHOLDS.TIME_TO_LOADING_STATE_MS}ms)`)
    expect(loadingTime).toBeLessThan(THRESHOLDS.TIME_TO_LOADING_STATE_MS)
  })

  test('grocery list page shows loading state within threshold', async ({ page }) => {
    const startTime = Date.now()
    
    const navigationPromise = page.goto('/grocery-list', { waitUntil: 'commit' })
    
    // Grocery list page shows "Loading..." text or "Your Lists" heading (if loaded fast)
    const loadingIndicator = page.locator('text="Loading..."').first()
    const listsHeading = page.getByRole('heading', { name: /your lists/i })
    
    // Wait for either loading state OR content (in case page loads very fast)
    await loadingIndicator.or(listsHeading).waitFor({ state: 'visible', timeout: THRESHOLDS.TIME_TO_LOADING_STATE_MS + 500 })
    
    const loadingTime = Date.now() - startTime
    
    await navigationPromise
    
    console.log(`Grocery list loading state in ${loadingTime}ms (threshold: ${THRESHOLDS.TIME_TO_LOADING_STATE_MS}ms)`)
    expect(loadingTime).toBeLessThan(THRESHOLDS.TIME_TO_LOADING_STATE_MS)
  })
})
