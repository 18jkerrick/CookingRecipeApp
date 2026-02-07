import { describe, it, expect } from 'vitest';
import {
  PlatformSchema,
  ContentTypeSchema,
  ProviderSchema,
  AcquiredContentSchema,
  ContentAcquisitionError,
} from '../../../packages/core/src/content/types';

describe('Content Types', () => {
  describe('PlatformSchema', () => {
    it('accepts valid platforms', () => {
      expect(PlatformSchema.parse('tiktok')).toBe('tiktok');
      expect(PlatformSchema.parse('instagram')).toBe('instagram');
      expect(PlatformSchema.parse('youtube')).toBe('youtube');
      expect(PlatformSchema.parse('facebook')).toBe('facebook');
      expect(PlatformSchema.parse('pinterest')).toBe('pinterest');
      expect(PlatformSchema.parse('cooking_website')).toBe('cooking_website');
      expect(PlatformSchema.parse('unknown')).toBe('unknown');
    });

    it('rejects invalid platforms', () => {
      expect(() => PlatformSchema.parse('twitter')).toThrow();
      expect(() => PlatformSchema.parse('snapchat')).toThrow();
      expect(() => PlatformSchema.parse('')).toThrow();
    });
  });

  describe('ContentTypeSchema', () => {
    it('accepts valid content types', () => {
      expect(ContentTypeSchema.parse('video')).toBe('video');
      expect(ContentTypeSchema.parse('photo')).toBe('photo');
      expect(ContentTypeSchema.parse('slideshow')).toBe('slideshow');
      expect(ContentTypeSchema.parse('reel')).toBe('reel');
      expect(ContentTypeSchema.parse('short')).toBe('short');
    });

    it('rejects invalid content types', () => {
      expect(() => ContentTypeSchema.parse('story')).toThrow();
      expect(() => ContentTypeSchema.parse('')).toThrow();
    });
  });

  describe('ProviderSchema', () => {
    it('accepts valid providers', () => {
      expect(ProviderSchema.parse('supadata')).toBe('supadata');
      expect(ProviderSchema.parse('apify')).toBe('apify');
      expect(ProviderSchema.parse('legacy')).toBe('legacy');
    });

    it('rejects invalid providers', () => {
      expect(() => ProviderSchema.parse('custom')).toThrow();
    });
  });

  describe('AcquiredContentSchema', () => {
    it('validates complete content object', () => {
      const content = {
        url: 'https://www.tiktok.com/@user/video/123456789',
        platform: 'tiktok',
        contentType: 'video',
        provider: 'supadata',
        caption: 'Recipe for delicious soup',
        title: 'Easy Soup Recipe',
        description: 'A quick and easy soup recipe',
        transcript: 'First add the ingredients...',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        videoUrl: 'https://example.com/video.mp4',
        imageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
        audioUrl: 'https://example.com/audio.mp3',
        metadata: {
          views: 10000,
          likes: 500,
          duration: 60,
          creator: '@chefuser',
        },
      };

      const result = AcquiredContentSchema.parse(content);
      expect(result.url).toBe(content.url);
      expect(result.platform).toBe('tiktok');
      expect(result.provider).toBe('supadata');
      expect(result.caption).toBe('Recipe for delicious soup');
      expect(result.metadata?.views).toBe(10000);
    });

    it('allows optional fields', () => {
      const minimalContent = {
        url: 'https://www.tiktok.com/@user/video/123',
        platform: 'tiktok',
        contentType: 'video',
        provider: 'supadata',
      };

      const result = AcquiredContentSchema.parse(minimalContent);
      expect(result.url).toBe(minimalContent.url);
      expect(result.caption).toBeUndefined();
      expect(result.transcript).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });

    it('rejects invalid URL format', () => {
      const invalidContent = {
        url: 'not-a-valid-url',
        platform: 'tiktok',
        contentType: 'video',
        provider: 'supadata',
      };

      expect(() => AcquiredContentSchema.parse(invalidContent)).toThrow();
    });

    it('rejects missing required fields', () => {
      const missingPlatform = {
        url: 'https://www.tiktok.com/@user/video/123',
        contentType: 'video',
        provider: 'supadata',
      };

      expect(() => AcquiredContentSchema.parse(missingPlatform)).toThrow();
    });
  });

  describe('ContentAcquisitionError', () => {
    it('captures provider and url context', () => {
      const error = new ContentAcquisitionError(
        'Rate limit exceeded',
        'supadata',
        'https://example.com/video',
        undefined,
        true
      );

      expect(error.message).toBe('Rate limit exceeded');
      expect(error.provider).toBe('supadata');
      expect(error.url).toBe('https://example.com/video');
      expect(error.isRetryable).toBe(true);
      expect(error.name).toBe('ContentAcquisitionError');
    });

    it('defaults isRetryable to false', () => {
      const error = new ContentAcquisitionError(
        'Not found',
        'apify',
        'https://example.com/video'
      );

      expect(error.isRetryable).toBe(false);
    });

    it('captures cause error', () => {
      const causeError = new Error('Network timeout');
      const error = new ContentAcquisitionError(
        'Request failed',
        'supadata',
        'https://example.com/video',
        causeError,
        true
      );

      expect(error.cause).toBe(causeError);
    });

    it('is an instance of Error', () => {
      const error = new ContentAcquisitionError(
        'Test error',
        'supadata',
        'https://example.com'
      );

      expect(error).toBeInstanceOf(Error);
    });
  });
});
