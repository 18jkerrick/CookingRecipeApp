// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SupadataProvider } from '@acme/core/content/providers/supadata'
import { ContentAcquisitionError } from '@acme/core/content/types'

describe('SupadataProvider', () => {
  let provider: SupadataProvider
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    provider = new SupadataProvider({
      apiKey: 'test-supadata-api-key',
    })
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
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
        { url: 'https://www.youtube.com/watch?v=abc123', platform: 'YouTube video' },
        { url: 'https://youtube.com/shorts/def456', platform: 'YouTube short' },
        { url: 'https://youtu.be/ghi789', platform: 'YouTube short URL' },
        { url: 'https://www.facebook.com/reel/123456', platform: 'Facebook reel' },
        { url: 'https://facebook.com/watch?v=789', platform: 'Facebook watch' },
        { url: 'https://fb.watch/abc/', platform: 'Facebook short URL' },
      ])('returns true for $platform URL', ({ url }) => {
        expect(provider.supports(url)).toBe(true)
      })
    })

    describe('returns false for unsupported platforms', () => {
      it.each([
        { url: 'https://www.pinterest.com/pin/123/', platform: 'Pinterest' },
        { url: 'https://twitter.com/user/status/123', platform: 'Twitter' },
        { url: 'https://x.com/user/status/456', platform: 'X (Twitter)' },
        { url: 'https://www.snapchat.com/spotlight/abc', platform: 'Snapchat' },
        { url: 'https://www.reddit.com/r/recipes/comments/abc', platform: 'Reddit' },
        { url: 'https://example.com/recipe/pasta', platform: 'Generic website' },
        { url: 'https://allrecipes.com/recipe/123', platform: 'Recipe website' },
        { url: 'invalid-url', platform: 'Invalid URL' },
        { url: '', platform: 'Empty string' },
      ])('returns false for $platform URL', ({ url }) => {
        expect(provider.supports(url)).toBe(false)
      })
    })
  })

  describe('acquire()', () => {
    const tiktokUrl = 'https://www.tiktok.com/@chef/video/123456789'

    // Helper to create metadata response
    const createMetadataResponse = (overrides = {}) => ({
      platform: 'tiktok',
      type: 'video',
      id: '123456789',
      url: tiktokUrl,
      title: 'Test Recipe',
      description: 'This is a test recipe caption',
      author: { username: 'chef', displayName: 'Chef' },
      stats: { views: 1000, likes: 100, comments: 10, shares: 5 },
      media: { type: 'video', duration: 60, thumbnailUrl: 'https://example.com/thumb.jpg' },
      tags: ['recipe', 'cooking'],
      createdAt: '2024-01-01T00:00:00Z',
      ...overrides,
    })

    // Helper to create transcript response
    const createTranscriptResponse = (content: { text: string; offset: number }[]) => ({
      content,
      lang: 'en',
    })

    it('fetches metadata first, then transcript for video content', async () => {
      // Mock metadata call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMetadataResponse(),
      })
      // Mock transcript call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createTranscriptResponse([
          { text: 'First segment', offset: 0 },
          { text: 'Second segment', offset: 1000 },
        ]),
      })
      // Mock thumbnail download call (now downloads thumbnails as base64)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'image/jpeg' }),
        arrayBuffer: async () => new ArrayBuffer(100),
      })

      await provider.acquire(tiktokUrl)

      // Should make three calls: metadata, transcript, and thumbnail download
      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(mockFetch.mock.calls[0][0]).toContain('/metadata')
      expect(mockFetch.mock.calls[1][0]).toContain('/transcript')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('supadata'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'x-api-key': 'test-supadata-api-key',
          }),
        })
      )
    })

    it('returns acquired content with caption from metadata and transcript', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMetadataResponse({
          description: 'Easy pasta recipe! Follow along.',
        }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createTranscriptResponse([
          { text: 'Add two cups of flour', offset: 0 },
          { text: 'Mix in the eggs', offset: 1000 },
          { text: 'Bake at 350 degrees', offset: 2000 },
        ]),
      })

      const result = await provider.acquire(tiktokUrl)

      expect(result.caption).toBe('Easy pasta recipe! Follow along.')
      expect(result.transcript).toBe(
        'Add two cups of flour\nMix in the eggs\nBake at 350 degrees'
      )
      expect(result.url).toBe(tiktokUrl)
      expect(result.platform).toBe('tiktok')
    })

    it('returns content even when transcript fails (caption-only)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMetadataResponse({
          description: 'Recipe in caption only',
        }),
      })
      // Transcript call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const result = await provider.acquire(tiktokUrl)

      expect(result.caption).toBe('Recipe in caption only')
      expect(result.transcript).toBeUndefined()
    })

    it('throws ContentAcquisitionError with isRetryable: true on 429 rate limit (metadata)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      })

      await expect(provider.acquire(tiktokUrl)).rejects.toThrow(
        ContentAcquisitionError
      )

      // Reset and test again for error properties
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      })

      try {
        await provider.acquire(tiktokUrl)
      } catch (error) {
        expect(error).toBeInstanceOf(ContentAcquisitionError)
        const acquisitionError = error as ContentAcquisitionError
        expect(acquisitionError.isRetryable).toBe(true)
        expect(acquisitionError.provider).toBe('supadata')
        expect(acquisitionError.url).toBe(tiktokUrl)
      }
    })

    it('throws ContentAcquisitionError with isRetryable: false on 404 not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(provider.acquire(tiktokUrl)).rejects.toThrow(
        ContentAcquisitionError
      )

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      try {
        await provider.acquire(tiktokUrl)
      } catch (error) {
        expect(error).toBeInstanceOf(ContentAcquisitionError)
        const acquisitionError = error as ContentAcquisitionError
        expect(acquisitionError.isRetryable).toBe(false)
        expect(acquisitionError.provider).toBe('supadata')
      }
    })

    it('throws ContentAcquisitionError with isRetryable: true on 500 server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Internal Server Error',
      })

      try {
        await provider.acquire(tiktokUrl)
      } catch (error) {
        expect(error).toBeInstanceOf(ContentAcquisitionError)
        const acquisitionError = error as ContentAcquisitionError
        expect(acquisitionError.isRetryable).toBe(true)
      }
    })

    it('throws ContentAcquisitionError with isRetryable: true on 503 service unavailable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'Service Unavailable',
      })

      try {
        await provider.acquire(tiktokUrl)
      } catch (error) {
        expect(error).toBeInstanceOf(ContentAcquisitionError)
        const acquisitionError = error as ContentAcquisitionError
        expect(acquisitionError.isRetryable).toBe(true)
      }
    })

    it('throws ContentAcquisitionError with isRetryable: false on 400 bad request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Bad Request',
      })

      try {
        await provider.acquire(tiktokUrl)
      } catch (error) {
        expect(error).toBeInstanceOf(ContentAcquisitionError)
        const acquisitionError = error as ContentAcquisitionError
        expect(acquisitionError.isRetryable).toBe(false)
      }
    })

    it('throws ContentAcquisitionError with isRetryable: false on 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Unauthorized',
      })

      try {
        await provider.acquire(tiktokUrl)
      } catch (error) {
        expect(error).toBeInstanceOf(ContentAcquisitionError)
        const acquisitionError = error as ContentAcquisitionError
        expect(acquisitionError.isRetryable).toBe(false)
      }
    })

    it('skips transcript fetch for non-video content types', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createMetadataResponse({
          type: 'image',
          media: { type: 'image', url: 'https://example.com/photo.jpg' },
        }),
      })
      // Mock thumbnail download call (now downloads thumbnails as base64)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'image/jpeg' }),
        arrayBuffer: async () => new ArrayBuffer(100),
      })

      const result = await provider.acquire(tiktokUrl)

      // Should call metadata and thumbnail download, but not transcript
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.transcript).toBeUndefined()
    })
  })

  describe('getTranscript()', () => {
    const youtubeUrl = 'https://www.youtube.com/watch?v=recipe123'

    it('returns transcript text joined by newlines', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            { text: 'Welcome to my kitchen' },
            { text: 'Today we are making pasta' },
            { text: 'Start with fresh ingredients' },
          ],
        }),
      })

      const transcript = await provider.getTranscript(youtubeUrl)

      expect(transcript).toBe(
        'Welcome to my kitchen\nToday we are making pasta\nStart with fresh ingredients'
      )
    })

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const transcript = await provider.getTranscript(youtubeUrl)

      expect(transcript).toBeNull()
    })

    it('returns null when API returns error status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const transcript = await provider.getTranscript(youtubeUrl)

      expect(transcript).toBeNull()
    })

    it('returns null when content array is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [],
        }),
      })

      const transcript = await provider.getTranscript(youtubeUrl)

      expect(transcript).toBeNull()
    })

    it('returns null when response has no content field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      const transcript = await provider.getTranscript(youtubeUrl)

      expect(transcript).toBeNull()
    })

    it('handles content with empty text segments', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            { text: 'First line' },
            { text: '' },
            { text: 'Third line' },
          ],
        }),
      })

      const transcript = await provider.getTranscript(youtubeUrl)

      // Should filter out empty segments
      expect(transcript).toBe('First line\nThird line')
    })

    it('trims whitespace from transcript segments', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            { text: '  First line with spaces  ' },
            { text: '\tTabbed line\t' },
          ],
        }),
      })

      const transcript = await provider.getTranscript(youtubeUrl)

      expect(transcript).toBe('First line with spaces\nTabbed line')
    })
  })

  describe('provider metadata', () => {
    it('has correct provider name', () => {
      expect(provider.name).toBe('supadata')
    })

    it('reports supported platforms', () => {
      expect(provider.supportedPlatforms).toContain('tiktok')
      expect(provider.supportedPlatforms).toContain('instagram')
      expect(provider.supportedPlatforms).toContain('youtube')
      expect(provider.supportedPlatforms).toContain('facebook')
    })
  })
})
