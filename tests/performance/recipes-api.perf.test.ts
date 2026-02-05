import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PERF_THRESHOLDS } from './thresholds'
import { server } from '../mocks/server'
import { getTestAuthToken } from '../helpers/get-test-auth-token'

/**
 * Check if the server is reachable using a simple GET request
 */
async function isServerReachable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    // Use GET instead of HEAD - Next.js dev server handles it better
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    // Any response (even 404) means server is up
    return response.status > 0
  } catch (error) {
    // Log the actual error for debugging
    console.warn('Server check failed:', (error as Error).message)
    return false
  }
}

/**
 * Performance regression tests for the recipes API.
 * 
 * These tests measure actual response times and fail if thresholds are exceeded.
 * Run against a real backend with the dev server running.
 * 
 * Authentication is handled automatically using test user credentials from .env.local:
 * - SUPABASE_SERVICE_ROLE_EMAIL
 * - SUPABASE_AUTH_SERVICE_ACCOUNT_PASSWORD
 * 
 * Run with: pnpm test:performance (requires `pnpm dev` running in another terminal)
 */
describe.skipIf(!process.env.TEST_API_URL)('Recipes API Performance', () => {
  let authHeaders: HeadersInit
  let serverAvailable = false
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:3000'
  
  beforeAll(async () => {
    // Close MSW to allow real HTTP requests for performance testing
    server.close()
    
    // Small delay to ensure MSW is fully stopped
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Check if server is reachable
    serverAvailable = await isServerReachable(baseUrl)
    if (!serverAvailable) {
      console.warn(`\n⚠️  Server not reachable at ${baseUrl}`)
      console.warn('   Start the dev server first: pnpm dev\n')
      return
    }
    
    // Get real auth token from test user credentials in .env.local
    const token = await getTestAuthToken()
    authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  })
  
  afterAll(() => {
    // Restart MSW for other tests
    server.listen({ onUnhandledRequest: 'error' })
  })

  it('returns first batch within threshold', async ({ skip }) => {
    if (!serverAvailable) {
      skip()
      return
    }
    
    const start = performance.now()
    
    const response = await fetch(
      `${baseUrl}/api/recipes?limit=${PERF_THRESHOLDS.DEFAULT_PAGE_SIZE}`,
      { headers: authHeaders }
    )
    
    const elapsed = performance.now() - start
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API Error (${response.status}): ${errorText}`)
    }
    
    expect(response.ok).toBe(true)
    expect(elapsed).toBeLessThan(PERF_THRESHOLDS.API_FIRST_BATCH_MS)
    
    console.log(`First batch fetch: ${elapsed.toFixed(2)}ms (threshold: ${PERF_THRESHOLDS.API_FIRST_BATCH_MS}ms)`)
  })

  it('returns subsequent batches within threshold', async ({ skip }) => {
    if (!serverAvailable) {
      skip()
      return
    }
    
    // Get first page to obtain cursor
    const firstResponse = await fetch(
      `${baseUrl}/api/recipes?limit=${PERF_THRESHOLDS.DEFAULT_PAGE_SIZE}`,
      { headers: authHeaders }
    )
    const { nextCursor } = await firstResponse.json()
    
    // Skip if no more pages
    if (!nextCursor) {
      console.log('Skipping subsequent batch test - not enough recipes')
      return
    }
    
    const start = performance.now()
    
    const response = await fetch(
      `${baseUrl}/api/recipes?limit=${PERF_THRESHOLDS.DEFAULT_PAGE_SIZE}&cursor=${nextCursor}`,
      { headers: authHeaders }
    )
    
    const elapsed = performance.now() - start
    
    expect(response.ok).toBe(true)
    expect(elapsed).toBeLessThan(PERF_THRESHOLDS.API_SUBSEQUENT_BATCH_MS)
    
    console.log(`Subsequent batch fetch: ${elapsed.toFixed(2)}ms (threshold: ${PERF_THRESHOLDS.API_SUBSEQUENT_BATCH_MS}ms)`)
  })

  it('handles empty result set quickly', async ({ skip }) => {
    if (!serverAvailable) {
      skip()
      return
    }
    
    // Use a cursor that would return no results (far future date)
    const farFutureCursor = '2099-12-31T23:59:59.999Z_00000000-0000-0000-0000-000000000000'
    
    const start = performance.now()
    
    const response = await fetch(
      `${baseUrl}/api/recipes?limit=${PERF_THRESHOLDS.DEFAULT_PAGE_SIZE}&cursor=${farFutureCursor}`,
      { headers: authHeaders }
    )
    
    const elapsed = performance.now() - start
    
    // Invalid cursor should fallback to first page, not error
    expect(response.ok).toBe(true)
    expect(elapsed).toBeLessThan(PERF_THRESHOLDS.API_SUBSEQUENT_BATCH_MS)
    
    console.log(`Empty/invalid cursor fetch: ${elapsed.toFixed(2)}ms`)
  })
})
