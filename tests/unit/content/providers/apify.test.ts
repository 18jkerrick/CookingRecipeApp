// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApifyProvider } from '@acme/core/content/providers/apify'
import { ContentAcquisitionError } from '@acme/core/content/types'

describe('ApifyProvider', () => {
  let provider: ApifyProvider
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    provider = new ApifyProvider({
      apiToken: 'test-apify-api-token',
      maxWaitTime: 30000, // 30 seconds max wait for tests
      pollInterval: 1000, // 1 second poll interval
    })
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('supports()', () => {
    describe('returns true for supported platforms', () => {
      it.each([
        { url: 'https://www.tiktok.com/@user/video/123', platform: 'TikTok' },
        { url: 'https://tiktok.com/@chef/video/456', platform: 'TikTok without www' },
        { url: 'https://vm.tiktok.com/ABC123/', platform: 'TikTok short URL' },
        { url: 'https://www.instagram.com/p/ABC123/', platform: 'Instagram post' },
        { url: 'https://instagram.com/reel/XYZ789/', platform: 'Instagram reel' },
      ])('returns true for $platform URL', ({ url }) => {
        expect(provider.supports(url)).toBe(true)
      })
    })

    describe('returns false for unsupported platforms', () => {
      it.each([
        { url: 'https://www.youtube.com/watch?v=abc123', platform: 'YouTube' },
        { url: 'https://youtube.com/shorts/def456', platform: 'YouTube shorts' },
        { url: 'https://youtu.be/ghi789', platform: 'YouTube short URL' },
        { url: 'https://www.facebook.com/reel/123456', platform: 'Facebook' },
        { url: 'https://www.pinterest.com/pin/123/', platform: 'Pinterest' },
        { url: 'https://twitter.com/user/status/123', platform: 'Twitter' },
        { url: 'https://example.com/recipe/pasta', platform: 'Generic website' },
        { url: 'invalid-url', platform: 'Invalid URL' },
        { url: '', platform: 'Empty string' },
      ])('returns false for $platform URL (not supported by Apify fallback)', ({ url }) => {
        expect(provider.supports(url)).toBe(false)
      })
    })
  })

  describe('acquire()', () => {
    const tiktokUrl = 'https://www.tiktok.com/@chef/video/123456789'
    const actorRunId = 'run-abc123'
    const datasetId = 'dataset-xyz789'

    it('creates actor run, polls for completion, and gets dataset results', async () => {
      // Mock: Create actor run
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: actorRunId,
            defaultDatasetId: datasetId,
          },
        }),
      })

      // Mock: Poll for status - RUNNING
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: actorRunId,
            status: 'RUNNING',
          },
        }),
      })

      // Mock: Poll for status - SUCCEEDED
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: actorRunId,
            status: 'SUCCEEDED',
          },
        }),
      })

      // Mock: Get dataset results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            text: 'Recipe video caption with ingredients',
            videoUrl: 'https://example.com/video.mp4',
            authorName: 'chef_user',
          },
        ],
      })

      const acquirePromise = provider.acquire(tiktokUrl)

      // Advance timers to trigger polls
      await vi.advanceTimersByTimeAsync(1000) // First poll
      await vi.advanceTimersByTimeAsync(1000) // Second poll

      const result = await acquirePromise

      // Verify actor run was created (uses token query param, not Authorization header)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/apify.*acts.*runs.*token=/i),
        expect.objectContaining({
          method: 'POST',
        })
      )

      expect(result.url).toBe(tiktokUrl)
      expect(result.platform).toBe('tiktok')
      expect(result.caption).toBe('Recipe video caption with ingredients')
    })

    it('throws ContentAcquisitionError on timeout after max wait time', async () => {
      // Create provider with shorter timeout for test
      const shortTimeoutProvider = new ApifyProvider({
        apiToken: 'test-apify-api-token',
        maxWaitTime: 5000,
        pollInterval: 1000,
      })

      // Mock: Create actor run
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: actorRunId,
            defaultDatasetId: datasetId,
          },
        }),
      })

      // Mock: Always return RUNNING status
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            id: actorRunId,
            status: 'RUNNING',
          },
        }),
      })

      // Capture rejection immediately to prevent unhandled rejection warning
      const acquirePromise = shortTimeoutProvider.acquire(tiktokUrl).catch((e) => e)

      // Advance time past the timeout
      await vi.runAllTimersAsync()

      const error = await acquirePromise
      expect(error).toBeInstanceOf(ContentAcquisitionError)
      expect(error.message).toMatch(/timeout/i)
      expect(error.provider).toBe('apify')
      expect(error.isRetryable).toBe(true)
    })

    it('handles FAILED run status', async () => {
      // Mock: Create actor run
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: actorRunId,
            defaultDatasetId: datasetId,
          },
        }),
      })

      // Mock: Poll returns FAILED status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: actorRunId,
            status: 'FAILED',
            statusMessage: 'Actor failed to complete',
          },
        }),
      })

      // Capture rejection immediately to prevent unhandled rejection warning
      const acquirePromise = provider.acquire(tiktokUrl).catch((e) => e)

      // Advance timers to trigger poll
      await vi.runAllTimersAsync()

      const error = await acquirePromise
      expect(error).toBeInstanceOf(ContentAcquisitionError)
      expect(error.provider).toBe('apify')
      expect(error.isRetryable).toBe(false)
    })

    it('handles ABORTED run status', async () => {
      // Mock: Create actor run
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: actorRunId,
            defaultDatasetId: datasetId,
          },
        }),
      })

      // Mock: Poll returns ABORTED status
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: actorRunId,
            status: 'ABORTED',
          },
        }),
      })

      // Capture rejection immediately to prevent unhandled rejection warning
      const acquirePromise = provider.acquire(tiktokUrl).catch((e) => e)
      await vi.runAllTimersAsync()

      const error = await acquirePromise
      expect(error).toBeInstanceOf(ContentAcquisitionError)
      expect(error.message).toMatch(/aborted/i)
    })

    it('throws on actor run creation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      await expect(provider.acquire(tiktokUrl)).rejects.toThrow(
        ContentAcquisitionError
      )
    })

    it('throws on dataset fetch failure', async () => {
      // Mock: Create actor run
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: actorRunId,
            defaultDatasetId: datasetId,
          },
        }),
      })

      // Mock: Poll returns SUCCEEDED
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: actorRunId,
            status: 'SUCCEEDED',
          },
        }),
      })

      // Mock: Dataset fetch fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      // Capture rejection immediately to prevent unhandled rejection warning
      const acquirePromise = provider.acquire(tiktokUrl).catch((e) => e)
      await vi.runAllTimersAsync()

      const error = await acquirePromise
      expect(error).toBeInstanceOf(ContentAcquisitionError)
      expect(error.message).toMatch(/dataset/i)
    })

    it('handles empty dataset results', async () => {
      // Mock: Create actor run
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: actorRunId,
            defaultDatasetId: datasetId,
          },
        }),
      })

      // Mock: Poll returns SUCCEEDED
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: actorRunId,
            status: 'SUCCEEDED',
          },
        }),
      })

      // Mock: Empty dataset
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      // Capture rejection immediately to prevent unhandled rejection warning
      const acquirePromise = provider.acquire(tiktokUrl).catch((e) => e)
      await vi.runAllTimersAsync()

      const error = await acquirePromise
      expect(error).toBeInstanceOf(ContentAcquisitionError)
      expect(error.message).toMatch(/no results/i)
    })
  })

  describe('Instagram URL handling', () => {
    const instagramUrl = 'https://www.instagram.com/reel/ABC123/'
    const actorRunId = 'run-insta123'
    const datasetId = 'dataset-insta789'

    it('acquires content from Instagram URLs', async () => {
      // Mock: Create actor run
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: actorRunId,
            defaultDatasetId: datasetId,
          },
        }),
      })

      // Mock: Poll returns SUCCEEDED
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: actorRunId,
            status: 'SUCCEEDED',
          },
        }),
      })

      // Mock: Get dataset results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            caption: 'Homemade pasta recipe #cooking',
            ownerUsername: 'home_chef',
            videoUrl: 'https://example.com/reel.mp4',
          },
        ],
      })

      const acquirePromise = provider.acquire(instagramUrl)
      await vi.advanceTimersByTimeAsync(1000)

      const result = await acquirePromise

      expect(result.url).toBe(instagramUrl)
      expect(result.platform).toBe('instagram')
    })
  })

  describe('provider metadata', () => {
    it('has correct provider name', () => {
      expect(provider.name).toBe('apify')
    })

    it('reports supported platforms (TikTok and Instagram only)', () => {
      expect(provider.supportedPlatforms).toContain('tiktok')
      expect(provider.supportedPlatforms).toContain('instagram')
      expect(provider.supportedPlatforms).not.toContain('youtube')
      expect(provider.supportedPlatforms).not.toContain('facebook')
    })
  })

  describe('actor selection', () => {
    it('uses TikTok scraper actor for TikTok URLs', async () => {
      // Mock: Create actor run
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'run-123',
            defaultDatasetId: 'dataset-456',
          },
        }),
      })

      // Mock: Poll returns SUCCEEDED
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 'run-123', status: 'SUCCEEDED' },
        }),
      })

      // Mock: Dataset results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ text: 'content' }],
      })

      const tiktokUrl = 'https://www.tiktok.com/@user/video/123'
      const acquirePromise = provider.acquire(tiktokUrl)
      await vi.advanceTimersByTimeAsync(1000)
      await acquirePromise

      // Verify TikTok actor was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/tiktok/i),
        expect.any(Object)
      )
    })

    it('uses Instagram scraper actor for Instagram URLs', async () => {
      // Mock: Create actor run
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'run-123',
            defaultDatasetId: 'dataset-456',
          },
        }),
      })

      // Mock: Poll returns SUCCEEDED
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { id: 'run-123', status: 'SUCCEEDED' },
        }),
      })

      // Mock: Dataset results
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ caption: 'content' }],
      })

      const instagramUrl = 'https://www.instagram.com/p/ABC123/'
      const acquirePromise = provider.acquire(instagramUrl)
      await vi.advanceTimersByTimeAsync(1000)
      await acquirePromise

      // Verify Instagram actor was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/instagram/i),
        expect.any(Object)
      )
    })
  })
})
