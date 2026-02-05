import { describe, it, expect, beforeAll } from 'vitest'
import { PERF_THRESHOLDS } from './thresholds'

/**
 * Performance regression tests for the recipes API.
 * 
 * These tests measure actual response times and fail if thresholds are exceeded.
 * Run against a real (or realistic mock) backend to get meaningful results.
 * 
 * Note: These tests require authentication. Set up test user credentials
 * in your test environment.
 */
describe('Recipes API Performance', () => {
  let authHeaders: HeadersInit
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:3000'
  
  beforeAll(async () => {
    // Get auth token for test user
    // This should be set up in your test environment
    const token = process.env.TEST_AUTH_TOKEN || 'test-token'
    authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  })

  it('returns first batch within threshold', async () => {
    const start = performance.now()
    
    const response = await fetch(
      `${baseUrl}/api/recipes?limit=${PERF_THRESHOLDS.DEFAULT_PAGE_SIZE}`,
      { headers: authHeaders }
    )
    
    const elapsed = performance.now() - start
    
    expect(response.ok).toBe(true)
    expect(elapsed).toBeLessThan(PERF_THRESHOLDS.API_FIRST_BATCH_MS)
    
    console.log(`First batch fetch: ${elapsed.toFixed(2)}ms (threshold: ${PERF_THRESHOLDS.API_FIRST_BATCH_MS}ms)`)
  })

  it('returns subsequent batches within threshold', async () => {
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

  it('handles empty result set quickly', async () => {
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
