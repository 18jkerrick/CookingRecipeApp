import { z } from 'zod';

// ============================================================================
// Platform & Content Type Definitions
// ============================================================================

/**
 * Supported social media platforms for recipe extraction
 */
export const PlatformSchema = z.enum([
  'tiktok',
  'instagram',
  'youtube',
  'facebook',
  'pinterest',
  'cooking_website',
  'unknown',
]);
export type Platform = z.infer<typeof PlatformSchema>;

/**
 * Types of content that can be extracted from social media
 */
export const ContentTypeSchema = z.enum([
  'video',
  'photo',
  'slideshow',
  'reel',
  'short',
]);
export type ContentType = z.infer<typeof ContentTypeSchema>;

/**
 * Available content acquisition providers
 */
export const ProviderSchema = z.enum(['supadata', 'apify', 'legacy']);
export type Provider = z.infer<typeof ProviderSchema>;

// ============================================================================
// Acquired Content Schema
// ============================================================================

/**
 * Schema for content acquired from any provider
 * Contains all extracted data from a social media post
 */
export const AcquiredContentSchema = z.object({
  /** Original URL that was processed */
  url: z.string().url(),

  /** Detected platform */
  platform: PlatformSchema,

  /** Type of content (video, photo, etc.) */
  contentType: ContentTypeSchema,

  /** Provider that successfully acquired the content */
  provider: ProviderSchema,

  /** Post caption/description text */
  caption: z.string().optional(),

  /** Video/post title if available */
  title: z.string().optional(),

  /** Extended description */
  description: z.string().optional(),

  /** Transcript from video/audio */
  transcript: z.string().optional(),

  /** Thumbnail image URL */
  thumbnailUrl: z.string().url().optional(),

  /** Direct video URL for download */
  videoUrl: z.string().url().optional(),

  /** Array of image URLs (for slideshows/carousels) */
  imageUrls: z.array(z.string().url()).optional(),

  /** Direct audio URL if available */
  audioUrl: z.string().url().optional(),

  /** Additional metadata about the content */
  metadata: z
    .object({
      /** View count */
      views: z.number().optional(),
      /** Like count */
      likes: z.number().optional(),
      /** Duration in seconds */
      duration: z.number().optional(),
      /** Creator username/handle */
      creator: z.string().optional(),
    })
    .optional(),
});

export type AcquiredContent = z.infer<typeof AcquiredContentSchema>;

// ============================================================================
// Content Provider Interface
// ============================================================================

/**
 * Interface for content acquisition providers
 *
 * Providers are responsible for fetching content from specific platforms
 * using their respective APIs (Supadata, Apify, etc.)
 */
export interface ContentProvider {
  /** Provider identifier */
  name: Provider;

  /** Platforms this provider can handle */
  supportedPlatforms: Platform[];

  /**
   * Acquire content from the given URL
   * @param url - The social media URL to extract content from
   * @returns Promise resolving to acquired content
   * @throws ContentAcquisitionError on failure
   */
  acquire(url: string): Promise<AcquiredContent>;

  /**
   * Check if this provider can handle the given URL
   * @param url - URL to check
   * @returns true if provider supports this URL
   */
  supports(url: string): boolean;

  /**
   * Get transcript from video content (optional capability)
   * @param url - Video URL
   * @returns Promise resolving to transcript text or null
   */
  getTranscript?(url: string): Promise<string | null>;
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Options for ContentAcquisitionError when using object form
 */
interface ContentAcquisitionErrorOptions {
  message: string;
  provider: string;
  url: string;
  cause?: Error;
  isRetryable?: boolean;
}

/**
 * Error thrown when content acquisition fails
 *
 * Includes information about the provider, URL, and whether
 * the error is retryable (e.g., rate limiting)
 *
 * Supports both positional and object-based construction:
 * - new ContentAcquisitionError('msg', 'provider', 'url', undefined, true)
 * - new ContentAcquisitionError({ message: 'msg', provider: 'provider', url: 'url', isRetryable: true })
 */
export class ContentAcquisitionError extends Error {
  /** Provider that encountered the error */
  public readonly provider: string;
  /** URL that was being processed */
  public readonly url: string;
  /** Original error that caused this failure */
  public readonly cause?: Error;
  /** Whether this error is retryable (e.g., rate limit) */
  public readonly isRetryable: boolean;

  constructor(
    messageOrOptions: string | ContentAcquisitionErrorOptions,
    provider?: string,
    url?: string,
    cause?: Error,
    isRetryable?: boolean
  ) {
    // Handle object form
    if (typeof messageOrOptions === 'object') {
      super(messageOrOptions.message);
      this.provider = messageOrOptions.provider;
      this.url = messageOrOptions.url;
      this.cause = messageOrOptions.cause;
      this.isRetryable = messageOrOptions.isRetryable ?? false;
    } else {
      // Handle positional form
      super(messageOrOptions);
      this.provider = provider!;
      this.url = url!;
      this.cause = cause;
      this.isRetryable = isRetryable ?? false;
    }

    this.name = 'ContentAcquisitionError';
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ContentAcquisitionError.prototype);
  }
}

// ============================================================================
// URL Detection Utilities
// ============================================================================

/**
 * URL patterns for detecting social media platforms
 */
export const PLATFORM_PATTERNS: Record<Platform, RegExp[]> = {
  tiktok: [
    /(?:www\.)?tiktok\.com\/@[\w.-]+\/(?:video|photo)\/\d+/i,
    /(?:vm|vt)\.tiktok\.com\/[\w]+/i,
  ],
  instagram: [
    /(?:www\.)?instagram\.com\/(?:p|reel|reels)\/[\w-]+/i,
    /(?:www\.)?instagram\.com\/[\w.-]+\/reel\/[\w-]+/i,
  ],
  youtube: [
    /(?:www\.)?youtube\.com\/watch\?v=[\w-]+/i,
    /(?:www\.)?youtube\.com\/shorts\/[\w-]+/i,
    /youtu\.be\/[\w-]+/i,
  ],
  facebook: [
    /(?:www\.)?facebook\.com\/[\w.-]+\/videos\/\d+/i,
    /(?:www\.)?facebook\.com\/reel\/\d+/i,
    /(?:www\.)?facebook\.com\/watch\?v=[\w-]+/i,
    /(?:www\.)?fb\.watch\/[\w]+/i,
  ],
  pinterest: [/(?:www\.)?pinterest\.com\/pin\/\d+/i],
  cooking_website: [], // Detected by exclusion
  unknown: [],
};

/**
 * Detect the platform from a URL
 * @param url - URL to analyze
 * @returns Detected platform or 'unknown'
 */
export function detectPlatform(url: string): Platform {
  const normalizedUrl = url.toLowerCase();

  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    if (platform === 'unknown' || platform === 'cooking_website') continue;

    for (const pattern of patterns) {
      if (pattern.test(normalizedUrl)) {
        return platform as Platform;
      }
    }
  }

  // Check if it looks like a cooking website (has recipe indicators)
  if (
    normalizedUrl.includes('recipe') ||
    normalizedUrl.includes('cook') ||
    normalizedUrl.includes('food')
  ) {
    return 'cooking_website';
  }

  return 'unknown';
}

/**
 * Detect content type from URL and platform
 * @param url - URL to analyze
 * @param platform - Already detected platform
 * @returns Detected content type
 */
export function detectContentType(url: string, platform: Platform): ContentType {
  const normalizedUrl = url.toLowerCase();

  // YouTube Shorts
  if (platform === 'youtube' && normalizedUrl.includes('/shorts/')) {
    return 'short';
  }

  // Instagram/Facebook Reels
  if (
    (platform === 'instagram' || platform === 'facebook') &&
    normalizedUrl.includes('/reel')
  ) {
    return 'reel';
  }

  // TikTok photos are slideshows
  if (platform === 'tiktok' && normalizedUrl.includes('/photo/')) {
    return 'slideshow';
  }

  // Pinterest is typically photos
  if (platform === 'pinterest') {
    return 'photo';
  }

  // Default to video for most social media
  if (['tiktok', 'instagram', 'youtube', 'facebook'].includes(platform)) {
    return 'video';
  }

  return 'video';
}
