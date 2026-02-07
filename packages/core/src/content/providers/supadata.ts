import {
  type ContentProvider,
  type AcquiredContent,
  type Platform,
  type ContentType,
  ContentAcquisitionError,
  detectPlatform,
  detectContentType,
} from '../types';

// ============================================================================
// Supadata API Types
// ============================================================================

/**
 * Response from Supadata metadata API
 * @see https://docs.supadata.ai/get-metadata
 */
interface SupadataMetadataResponse {
  platform: string;
  type: 'video' | 'image' | 'carousel' | 'post';
  id: string;
  url: string;
  title: string | null;
  description: string | null;
  author: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    verified?: boolean;
  };
  stats: {
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
  };
  media: {
    type: string;
    duration?: number;
    thumbnailUrl?: string;
    imageUrl?: string; // Facebook uses this field for image posts
    url?: string;
    items?: Array<{ type: string; url: string }>;
  };
  tags: string[];
  createdAt: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Single transcript segment from Supadata API
 */
interface TranscriptSegment {
  text: string;
  offset: number;
  duration?: number;
  lang?: string;
}

/**
 * Response from Supadata transcript API
 * @see https://docs.supadata.ai/get-transcript
 */
interface SupadataTranscriptResponse {
  content: string | TranscriptSegment[];
  lang: string;
  availableLangs?: string[];
}

/**
 * Async job response
 */
interface SupadataJobResponse {
  jobId: string;
}

/**
 * Job status response
 */
interface SupadataJobStatusResponse {
  status: 'queued' | 'active' | 'completed' | 'failed';
  content?: string | TranscriptSegment[];
  lang?: string;
  availableLangs?: string[];
  error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for Supadata provider
 */
export interface SupadataConfig {
  /** API key for Supadata */
  apiKey: string;
  /** Base URL for API (defaults to production) */
  baseUrl?: string;
  /** Timeout for API requests in milliseconds */
  timeout?: number;
  /** Maximum poll attempts for async jobs */
  maxPollAttempts?: number;
  /** Poll interval in milliseconds */
  pollInterval?: number;
}

const DEFAULT_CONFIG = {
  baseUrl: 'https://api.supadata.ai/v1',
  timeout: 30000,
  maxPollAttempts: 60, // 60 attempts * 1s = 60s max wait
  pollInterval: 1000,
};

/**
 * Upgrade YouTube thumbnail URL to higher resolution
 * Supadata returns default.jpg (120x90) but we want hqdefault.jpg (480x360)
 */
function upgradeYouTubeThumbnailUrl(url: string): string {
  if (url.includes('ytimg.com') && url.includes('/default.jpg')) {
    return url.replace('/default.jpg', '/hqdefault.jpg');
  }
  return url;
}

/**
 * Download an image from URL and convert to base64 data URL
 * This is necessary because platform CDN URLs (especially Instagram) expire quickly
 */
async function downloadImageAsBase64(imageUrl: string, timeout = 10000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        // Some CDNs require a user agent
        'User-Agent': 'Mozilla/5.0 (compatible; RecipeExtractor/1.0)',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Supadata] Failed to download thumbnail: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.warn('[Supadata] Error downloading thumbnail:', error instanceof Error ? error.message : error);
    return null;
  }
}

// ============================================================================
// Supadata Provider Implementation
// ============================================================================

/**
 * Content provider using Supadata's metadata and transcript APIs
 *
 * Supadata provides two key endpoints:
 * 1. /metadata - Gets post metadata (title, description/caption, author, stats)
 * 2. /transcript - Gets audio transcript (speech-to-text)
 *
 * This aligns with the extraction priority:
 * 1. Text/Caption (metadata endpoint)
 * 2. Audio/Transcript (transcript endpoint)
 *
 * @see https://docs.supadata.ai
 */
export class SupadataProvider implements ContentProvider {
  readonly name = 'supadata' as const;
  readonly supportedPlatforms: Platform[] = [
    'tiktok',
    'instagram',
    'youtube',
    'facebook',
  ];

  private readonly config: Required<SupadataConfig>;

  constructor(config: SupadataConfig) {
    if (!config.apiKey) {
      throw new Error('Supadata API key is required');
    }

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Check if this provider supports the given URL
   */
  supports(url: string): boolean {
    const platform = detectPlatform(url);
    return this.supportedPlatforms.includes(platform);
  }

  /**
   * Acquire content from the given URL using Supadata API
   *
   * Strategy:
   * 1. Always fetch metadata first (caption/description/title)
   * 2. For video content, also fetch transcript if available
   */
  async acquire(url: string): Promise<AcquiredContent> {
    const platform = detectPlatform(url);

    if (!this.supports(url)) {
      throw new ContentAcquisitionError(
        `Supadata does not support platform: ${platform}`,
        this.name,
        url
      );
    }

    try {
      // Step 1: Get metadata (caption, title, description)
      const metadata = await this.fetchMetadata(url);
      const contentType = this.mapContentType(metadata.type, url, platform);

      // Step 2: For video content, try to get transcript
      let transcript: string | null = null;
      if (metadata.type === 'video' || metadata.media?.type === 'video') {
        transcript = await this.fetchTranscript(url).catch(() => null);
      }

      // Build result combining metadata and transcript
      const imageUrls = this.extractImageUrls(metadata);
      
      // Determine thumbnail - check multiple possible locations depending on platform
      let thumbnailUrl = metadata.media?.thumbnailUrl;
      if (!thumbnailUrl && metadata.media?.imageUrl) {
        // Facebook returns image URL in imageUrl field
        thumbnailUrl = metadata.media.imageUrl;
      }
      if (!thumbnailUrl && imageUrls && imageUrls.length > 0) {
        thumbnailUrl = imageUrls[0];
      }
      if (!thumbnailUrl && metadata.type === 'image' && metadata.media?.url) {
        thumbnailUrl = metadata.media.url;
      }
      
      // Download thumbnail and convert to base64 to avoid CDN URL expiration
      // (Instagram/TikTok CDN URLs expire quickly)
      let thumbnailBase64: string | undefined;
      if (thumbnailUrl) {
        const upgradedUrl = upgradeYouTubeThumbnailUrl(thumbnailUrl);
        const downloaded = await downloadImageAsBase64(upgradedUrl);
        thumbnailBase64 = downloaded || thumbnailUrl; // Fallback to URL if download fails
      }
      
      return {
        url,
        platform,
        contentType,
        provider: this.name,
        title: metadata.title || undefined,
        description: metadata.description || undefined,
        caption: metadata.description || undefined, // Caption is in description field
        transcript: transcript || undefined,
        thumbnailUrl: thumbnailBase64, // Use base64 version to avoid CDN URL expiration
        videoUrl: metadata.media?.url,
        imageUrls,
        metadata: {
          views: metadata.stats?.views || undefined,
          likes: metadata.stats?.likes || undefined,
          duration: metadata.media?.duration,
          creator: metadata.author?.displayName || metadata.author?.username,
        },
      };
    } catch (error) {
      if (error instanceof ContentAcquisitionError) {
        throw error;
      }

      throw new ContentAcquisitionError(
        `Failed to acquire content from Supadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        url,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get only the transcript from a video URL
   */
  async getTranscript(url: string): Promise<string | null> {
    try {
      return await this.fetchTranscript(url);
    } catch {
      return null;
    }
  }

  /**
   * Fetch metadata from Supadata API
   * @see https://docs.supadata.ai/get-metadata
   */
  private async fetchMetadata(url: string): Promise<SupadataMetadataResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const encodedUrl = encodeURIComponent(url);
      const response = await fetch(
        `${this.config.baseUrl}/metadata?url=${encodedUrl}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': this.config.apiKey,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.status === 429) {
        throw new ContentAcquisitionError(
          'Rate limited by Supadata',
          this.name,
          url,
          undefined,
          true
        );
      }

      if (response.status === 404) {
        throw new ContentAcquisitionError(
          'Content not found - video may be private or deleted',
          this.name,
          url,
          undefined,
          false
        );
      }

      if (response.status === 403) {
        throw new ContentAcquisitionError(
          'Content requires authentication or is restricted',
          this.name,
          url,
          undefined,
          false
        );
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new ContentAcquisitionError(
          `Supadata metadata API error: ${errorText}`,
          this.name,
          url,
          undefined,
          response.status >= 500
        );
      }

      return (await response.json()) as SupadataMetadataResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ContentAcquisitionError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ContentAcquisitionError(
          'Request to Supadata timed out',
          this.name,
          url,
          error,
          true
        );
      }

      throw error;
    }
  }

  /**
   * Fetch transcript from Supadata API
   * @see https://docs.supadata.ai/get-transcript
   */
  private async fetchTranscript(url: string): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const encodedUrl = encodeURIComponent(url);
      // Use text=true for plain text, mode=auto to try native first then generate
      const response = await fetch(
        `${this.config.baseUrl}/transcript?url=${encodedUrl}&text=true&mode=auto`,
        {
          method: 'GET',
          headers: {
            'x-api-key': this.config.apiKey,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // Handle async job (HTTP 202)
      if (response.status === 202) {
        const jobData = (await response.json()) as SupadataJobResponse;
        return this.pollTranscriptJob(jobData.jobId, url);
      }

      // Transcript unavailable (HTTP 206)
      if (response.status === 206) {
        return null;
      }

      if (response.status === 429) {
        throw new ContentAcquisitionError(
          'Rate limited by Supadata transcript API',
          this.name,
          url,
          undefined,
          true
        );
      }

      if (!response.ok) {
        // Transcript not available is not a fatal error
        return null;
      }

      const data = (await response.json()) as SupadataTranscriptResponse;
      const parsed = this.parseTranscriptContent(data.content);
      return parsed || null; // Return null for empty transcripts
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ContentAcquisitionError) {
        throw error;
      }

      // Transcript failures shouldn't fail the whole acquisition
      console.warn('Failed to fetch transcript:', error);
      return null;
    }
  }

  /**
   * Poll for async transcript job result
   */
  private async pollTranscriptJob(
    jobId: string,
    url: string
  ): Promise<string | null> {
    for (let attempt = 0; attempt < this.config.maxPollAttempts; attempt++) {
      await this.sleep(this.config.pollInterval);

      const response = await fetch(
        `${this.config.baseUrl}/transcript/${jobId}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': this.config.apiKey,
          },
        }
      );

      if (response.status === 404) {
        // Job expired or not found
        return null;
      }

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as SupadataJobStatusResponse;

      if (data.status === 'completed' && data.content) {
        return this.parseTranscriptContent(data.content);
      }

      if (data.status === 'failed') {
        console.warn('Transcript job failed:', data.error);
        return null;
      }

      // Still processing, continue polling
    }

    console.warn('Transcript job timed out');
    return null;
  }

  /**
   * Parse transcript content (can be string or segments array)
   */
  private parseTranscriptContent(
    content: string | TranscriptSegment[]
  ): string {
    if (typeof content === 'string') {
      return content;
    }

    if (!Array.isArray(content) || content.length === 0) {
      return '';
    }

    // Sort by offset and join
    const sorted = [...content].sort((a, b) => a.offset - b.offset);
    const texts = sorted
      .map((segment) => segment.text?.trim())
      .filter((text): text is string => Boolean(text));

    return texts.join('\n');
  }

  /**
   * Map Supadata content type to our ContentType
   */
  private mapContentType(
    supadataType: string,
    url: string,
    platform: Platform
  ): ContentType {
    switch (supadataType) {
      case 'video':
        // Check for specific formats
        if (url.includes('/shorts/')) return 'short';
        if (url.includes('/reel')) return 'reel';
        return 'video';
      case 'image':
        return 'photo';
      case 'carousel':
        return 'slideshow';
      case 'post':
        // Posts can be videos or photos
        return detectContentType(url, platform);
      default:
        return detectContentType(url, platform);
    }
  }

  /**
   * Extract image URLs from metadata (for carousels/slideshows)
   */
  private extractImageUrls(metadata: SupadataMetadataResponse): string[] | undefined {
    if (metadata.type === 'carousel' && metadata.media?.items) {
      return metadata.media.items
        .filter((item) => item.type === 'image' && item.url)
        .map((item) => item.url);
    }

    if (metadata.type === 'image' && metadata.media?.url) {
      return [metadata.media.url];
    }

    return undefined;
  }

  /**
   * Helper to sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a Supadata provider instance
 */
export function createSupadataProvider(config: SupadataConfig): SupadataProvider {
  return new SupadataProvider(config);
}
