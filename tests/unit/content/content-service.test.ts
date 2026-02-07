// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ContentService } from '@acme/core/content/content-service'
import { ContentAcquisitionError } from '@acme/core/content/types'
import type { ContentProvider, AcquiredContent } from '@acme/core/content/types'

// Mock provider factory
function createMockProvider(overrides: Partial<ContentProvider> = {}): ContentProvider {
  return {
    name: 'mock-provider',
    supportedPlatforms: ['tiktok', 'instagram', 'youtube', 'facebook'],
    supports: vi.fn().mockReturnValue(true),
    acquire: vi.fn().mockResolvedValue({
      url: 'https://example.com/video',
      platform: 'tiktok',
      contentType: 'video',
      transcript: 'Mock transcript',
      acquiredAt: new Date().toISOString(),
    } as AcquiredContent),
    ...overrides,
  }
}

describe('ContentService', () => {
  let mockSupadataProvider: ContentProvider
  let mockApifyProvider: ContentProvider
  let service: ContentService

  beforeEach(() => {
    // Make tests deterministic by removing jitter from retry delays
    vi.spyOn(Math, 'random').mockReturnValue(0.5)

    mockSupadataProvider = createMockProvider({
      name: 'supadata',
      supportedPlatforms: ['tiktok', 'instagram', 'youtube', 'facebook'],
    })

    mockApifyProvider = createMockProvider({
      name: 'apify',
      supportedPlatforms: ['tiktok', 'instagram'],
    })

    service = new ContentService({
      providers: [mockSupadataProvider, mockApifyProvider],
      maxRetries: 3,
      baseRetryDelay: 100,
      maxRetryDelay: 100, // Cap at same value to disable exponential backoff in tests
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('primary provider success', () => {
    it('returns content from primary provider (Supadata) when successful', async () => {
      const url = 'https://www.tiktok.com/@chef/video/123'
      const expectedContent: AcquiredContent = {
        url,
        platform: 'tiktok',
        contentType: 'video',
        transcript: 'Supadata transcript content',
        acquiredAt: new Date().toISOString(),
      }

      vi.mocked(mockSupadataProvider.acquire).mockResolvedValueOnce(expectedContent)

      const result = await service.acquire(url)

      expect(result).toEqual(expectedContent)
      expect(mockSupadataProvider.supports).toHaveBeenCalledWith(url)
      expect(mockSupadataProvider.acquire).toHaveBeenCalledWith(url)
      expect(mockApifyProvider.acquire).not.toHaveBeenCalled()
    })

    it('does not attempt fallback when primary succeeds', async () => {
      const url = 'https://www.instagram.com/reel/ABC/'
      
      vi.mocked(mockSupadataProvider.acquire).mockResolvedValueOnce({
        url,
        platform: 'instagram',
        contentType: 'video',
        transcript: 'Primary provider content',
        acquiredAt: new Date().toISOString(),
      })

      await service.acquire(url)

      expect(mockApifyProvider.acquire).not.toHaveBeenCalled()
    })
  })

  describe('fallback behavior', () => {
    it('falls back to Apify when Supadata fails', async () => {
      const url = 'https://www.tiktok.com/@user/video/456'
      const fallbackContent: AcquiredContent = {
        url,
        platform: 'tiktok',
        contentType: 'video',
        caption: 'Apify fallback content',
        acquiredAt: new Date().toISOString(),
      }

      vi.mocked(mockSupadataProvider.acquire).mockRejectedValueOnce(
        new ContentAcquisitionError({
          message: 'Supadata failed',
          provider: 'supadata',
          url,
          isRetryable: false,
        })
      )
      vi.mocked(mockApifyProvider.acquire).mockResolvedValueOnce(fallbackContent)

      const result = await service.acquire(url)

      expect(result).toEqual(fallbackContent)
      expect(mockSupadataProvider.acquire).toHaveBeenCalledWith(url)
      expect(mockApifyProvider.acquire).toHaveBeenCalledWith(url)
    })

    it('falls back after retryable error exhausts retries', async () => {
      vi.useFakeTimers()

      const url = 'https://www.instagram.com/p/XYZ/'
      const fallbackContent: AcquiredContent = {
        url,
        platform: 'instagram',
        contentType: 'video',
        caption: 'Apify content after retry exhaustion',
        acquiredAt: new Date().toISOString(),
      }

      // Supadata fails with retryable error every time
      vi.mocked(mockSupadataProvider.acquire).mockRejectedValue(
        new ContentAcquisitionError({
          message: 'Rate limited',
          provider: 'supadata',
          url,
          isRetryable: true,
        })
      )
      vi.mocked(mockApifyProvider.acquire).mockResolvedValueOnce(fallbackContent)

      const acquirePromise = service.acquire(url)

      // Run all timers to completion
      await vi.runAllTimersAsync()

      const result = await acquirePromise

      expect(result).toEqual(fallbackContent)
      // With maxRetries: 3, loop runs attempt 0..3 = 4 calls before falling back
      expect(mockSupadataProvider.acquire).toHaveBeenCalledTimes(4)
      expect(mockApifyProvider.acquire).toHaveBeenCalledTimes(1)
    })
  })

  describe('retry behavior', () => {
    it('retries on retryable errors (429)', async () => {
      vi.useFakeTimers()

      const url = 'https://www.youtube.com/watch?v=abc123'
      const successContent: AcquiredContent = {
        url,
        platform: 'youtube',
        contentType: 'video',
        transcript: 'Success after retry',
        acquiredAt: new Date().toISOString(),
      }

      // First call fails with 429, second succeeds
      vi.mocked(mockSupadataProvider.acquire)
        .mockRejectedValueOnce(
          new ContentAcquisitionError({
            message: 'Rate limit exceeded',
            provider: 'supadata',
            url,
            isRetryable: true,
          })
        )
        .mockResolvedValueOnce(successContent)

      const acquirePromise = service.acquire(url)

      // Run all timers to completion
      await vi.runAllTimersAsync()

      const result = await acquirePromise

      expect(result).toEqual(successContent)
      expect(mockSupadataProvider.acquire).toHaveBeenCalledTimes(2)
    })

    it('does not retry on non-retryable errors (404)', async () => {
      const url = 'https://www.tiktok.com/@deleted/video/999'
      const fallbackContent: AcquiredContent = {
        url,
        platform: 'tiktok',
        contentType: 'video',
        caption: 'Fallback after 404',
        acquiredAt: new Date().toISOString(),
      }

      vi.mocked(mockSupadataProvider.acquire).mockRejectedValueOnce(
        new ContentAcquisitionError({
          message: 'Content not found',
          provider: 'supadata',
          url,
          isRetryable: false,
        })
      )
      vi.mocked(mockApifyProvider.acquire).mockResolvedValueOnce(fallbackContent)

      const result = await service.acquire(url)

      expect(result).toEqual(fallbackContent)
      // Should only be called once - no retries for 404
      expect(mockSupadataProvider.acquire).toHaveBeenCalledTimes(1)
      expect(mockApifyProvider.acquire).toHaveBeenCalledTimes(1)
    })

    it('does not retry on 401 unauthorized', async () => {
      const url = 'https://www.instagram.com/reel/private/'
      const fallbackContent: AcquiredContent = {
        url,
        platform: 'instagram',
        contentType: 'video',
        acquiredAt: new Date().toISOString(),
      }

      vi.mocked(mockSupadataProvider.acquire).mockRejectedValueOnce(
        new ContentAcquisitionError({
          message: 'Unauthorized',
          provider: 'supadata',
          url,
          isRetryable: false,
        })
      )
      vi.mocked(mockApifyProvider.acquire).mockResolvedValueOnce(fallbackContent)

      await service.acquire(url)

      expect(mockSupadataProvider.acquire).toHaveBeenCalledTimes(1)
    })
  })

  describe('all providers fail', () => {
    it('throws AggregateError when all providers fail', async () => {
      const url = 'https://www.tiktok.com/@user/video/789'

      const supadataError = new ContentAcquisitionError({
        message: 'Supadata: Content unavailable',
        provider: 'supadata',
        url,
        isRetryable: false,
      })

      const apifyError = new ContentAcquisitionError({
        message: 'Apify: Actor failed',
        provider: 'apify',
        url,
        isRetryable: false,
      })

      vi.mocked(mockSupadataProvider.acquire).mockRejectedValueOnce(supadataError)
      vi.mocked(mockApifyProvider.acquire).mockRejectedValueOnce(apifyError)

      await expect(service.acquire(url)).rejects.toThrow(AggregateError)

      try {
        await service.acquire(url)
      } catch (error) {
        expect(error).toBeInstanceOf(AggregateError)
        const aggregateError = error as AggregateError
        expect(aggregateError.errors).toHaveLength(2)
        expect(aggregateError.errors[0]).toBe(supadataError)
        expect(aggregateError.errors[1]).toBe(apifyError)
      }
    })

    it('includes all provider errors in AggregateError', async () => {
      const url = 'https://www.instagram.com/p/fail/'

      vi.mocked(mockSupadataProvider.acquire).mockRejectedValueOnce(
        new ContentAcquisitionError({
          message: 'Error 1',
          provider: 'supadata',
          url,
          isRetryable: false,
        })
      )

      vi.mocked(mockApifyProvider.acquire).mockRejectedValueOnce(
        new ContentAcquisitionError({
          message: 'Error 2',
          provider: 'apify',
          url,
          isRetryable: false,
        })
      )

      try {
        await service.acquire(url)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(AggregateError)
        const aggregateError = error as AggregateError
        const errorMessages = aggregateError.errors.map(
          (e: Error) => (e as ContentAcquisitionError).message
        )
        expect(errorMessages).toContain('Error 1')
        expect(errorMessages).toContain('Error 2')
      }
    })
  })

  describe('provider URL support filtering', () => {
    it('skips providers that do not support the URL', async () => {
      const youtubeUrl = 'https://www.youtube.com/watch?v=recipe123'

      // Apify doesn't support YouTube
      vi.mocked(mockApifyProvider.supports).mockReturnValue(false)
      vi.mocked(mockSupadataProvider.supports).mockReturnValue(true)

      const expectedContent: AcquiredContent = {
        url: youtubeUrl,
        platform: 'youtube',
        contentType: 'video',
        transcript: 'YouTube content',
        acquiredAt: new Date().toISOString(),
      }
      vi.mocked(mockSupadataProvider.acquire).mockResolvedValueOnce(expectedContent)

      const result = await service.acquire(youtubeUrl)

      expect(result).toEqual(expectedContent)
      expect(mockSupadataProvider.supports).toHaveBeenCalledWith(youtubeUrl)
      expect(mockSupadataProvider.acquire).toHaveBeenCalled()
      // Apify.supports not called because Supadata succeeded first
      expect(mockApifyProvider.acquire).not.toHaveBeenCalled()
    })

    it('skips unsupporting provider even when primary fails', async () => {
      const facebookUrl = 'https://www.facebook.com/reel/123'

      // Apify doesn't support Facebook
      vi.mocked(mockApifyProvider.supports).mockReturnValue(false)
      vi.mocked(mockSupadataProvider.supports).mockReturnValue(true)

      vi.mocked(mockSupadataProvider.acquire).mockRejectedValueOnce(
        new ContentAcquisitionError({
          message: 'Failed',
          provider: 'supadata',
          url: facebookUrl,
          isRetryable: false,
        })
      )

      // Should throw because Apify (the only fallback) doesn't support Facebook
      await expect(service.acquire(facebookUrl)).rejects.toThrow()

      expect(mockApifyProvider.acquire).not.toHaveBeenCalled()
    })

    it('throws when no providers support the URL', async () => {
      const unsupportedUrl = 'https://www.pinterest.com/pin/123/'

      vi.mocked(mockSupadataProvider.supports).mockReturnValue(false)
      vi.mocked(mockApifyProvider.supports).mockReturnValue(false)

      await expect(service.acquire(unsupportedUrl)).rejects.toThrow()

      expect(mockSupadataProvider.acquire).not.toHaveBeenCalled()
      expect(mockApifyProvider.acquire).not.toHaveBeenCalled()
    })
  })

  describe('provider ordering', () => {
    it('tries providers in order (primary first)', async () => {
      const url = 'https://www.tiktok.com/@test/video/111'
      const callOrder: string[] = []

      vi.mocked(mockSupadataProvider.acquire).mockImplementationOnce(async () => {
        callOrder.push('supadata')
        throw new ContentAcquisitionError({
          message: 'Failed',
          provider: 'supadata',
          url,
          isRetryable: false,
        })
      })

      vi.mocked(mockApifyProvider.acquire).mockImplementationOnce(async () => {
        callOrder.push('apify')
        return {
          url,
          platform: 'tiktok',
          contentType: 'video',
          acquiredAt: new Date().toISOString(),
        }
      })

      await service.acquire(url)

      expect(callOrder).toEqual(['supadata', 'apify'])
    })
  })

  describe('error handling edge cases', () => {
    it('handles non-ContentAcquisitionError errors from providers', async () => {
      const url = 'https://www.tiktok.com/@user/video/error'

      vi.mocked(mockSupadataProvider.acquire).mockRejectedValueOnce(
        new Error('Unexpected error')
      )

      const fallbackContent: AcquiredContent = {
        url,
        platform: 'tiktok',
        contentType: 'video',
        acquiredAt: new Date().toISOString(),
      }
      vi.mocked(mockApifyProvider.acquire).mockResolvedValueOnce(fallbackContent)

      const result = await service.acquire(url)

      expect(result).toEqual(fallbackContent)
    })

    it('handles network errors gracefully', async () => {
      const url = 'https://www.instagram.com/reel/network/'

      vi.mocked(mockSupadataProvider.acquire).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      )

      const fallbackContent: AcquiredContent = {
        url,
        platform: 'instagram',
        contentType: 'video',
        acquiredAt: new Date().toISOString(),
      }
      vi.mocked(mockApifyProvider.acquire).mockResolvedValueOnce(fallbackContent)

      const result = await service.acquire(url)

      expect(result).toEqual(fallbackContent)
    })
  })

  describe('configuration', () => {
    it('respects maxRetries configuration', async () => {
      vi.useFakeTimers()

      const customService = new ContentService({
        providers: [mockSupadataProvider, mockApifyProvider],
        maxRetries: 5,
        baseRetryDelay: 50,
        maxRetryDelay: 50, // Cap at same value to disable exponential backoff in tests
      })

      const url = 'https://www.tiktok.com/@test/video/123456789'

      vi.mocked(mockSupadataProvider.acquire).mockRejectedValue(
        new ContentAcquisitionError({
          message: 'Always fails',
          provider: 'supadata',
          url,
          isRetryable: true,
        })
      )

      vi.mocked(mockApifyProvider.acquire).mockResolvedValueOnce({
        url,
        platform: 'tiktok',
        contentType: 'video',
        acquiredAt: new Date().toISOString(),
      })

      const acquirePromise = customService.acquire(url)

      // Run all timers to completion
      await vi.runAllTimersAsync()

      await acquirePromise

      // With maxRetries: 5, loop runs attempt 0..5 = 6 calls before falling back
      expect(mockSupadataProvider.acquire).toHaveBeenCalledTimes(6)
    })

    it('uses default configuration when not specified', () => {
      const defaultService = new ContentService({
        providers: [mockSupadataProvider],
      })

      // Service should be created without error
      expect(defaultService).toBeDefined()
    })
  })
})
