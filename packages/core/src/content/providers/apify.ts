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
// Apify API Types
// ============================================================================

/**
 * Apify actor run creation response
 */
interface ApifyRunResponse {
  data: {
    id: string;
    status: ApifyRunStatus;
    defaultDatasetId: string;
  };
}

/**
 * Possible status values for an Apify run
 */
type ApifyRunStatus =
  | 'READY'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'ABORTING'
  | 'ABORTED'
  | 'TIMING-OUT'
  | 'TIMED-OUT';

/**
 * Apify run status response
 */
interface ApifyRunStatusResponse {
  data: {
    id: string;
    status: ApifyRunStatus;
    defaultDatasetId: string;
    finishedAt?: string;
  };
}

/**
 * TikTok video data from Apify scraper
 */
interface ApifyTikTokItem {
  id: string;
  text?: string;
  desc?: string;
  createTime?: number;
  authorMeta?: {
    name?: string;
    nickName?: string;
  };
  videoMeta?: {
    duration?: number;
  };
  diggCount?: number;
  playCount?: number;
  covers?: string[];
  videoUrl?: string;
  imagePost?: {
    images?: string[];
  };
}

/**
 * Instagram reel data from Apify scraper
 */
interface ApifyInstagramItem {
  id: string;
  caption?: string;
  shortCode?: string;
  displayUrl?: string;
  videoUrl?: string;
  likesCount?: number;
  videoViewCount?: number;
  videoDuration?: number;
  ownerUsername?: string;
  timestamp?: string;
  images?: string[];
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Apify actor IDs for different platforms
 */
const ACTOR_IDS = {
  tiktok: 'clockworks~tiktok-scraper',
  instagram: 'apify~instagram-reel-scraper',
} as const;

/**
 * Configuration for Apify provider
 */
export interface ApifyConfig {
  /** API token for Apify */
  apiToken: string;
  /** Base URL for Apify API (defaults to production) */
  baseUrl?: string;
  /** Maximum wait time for job completion in milliseconds */
  maxWaitTime?: number;
  /** Poll interval in milliseconds */
  pollInterval?: number;
}

const DEFAULT_CONFIG = {
  baseUrl: 'https://api.apify.com/v2',
  maxWaitTime: 60000, // 60 seconds max
  pollInterval: 2000,
};

// ============================================================================
// Apify Provider Implementation
// ============================================================================

/**
 * Content provider using Apify actor APIs
 *
 * Apify provides robust scraping for TikTok and Instagram
 * when the primary provider (Supadata) fails. It extracts
 * captions, descriptions, and media URLs.
 *
 * @see https://apify.com/actors
 */
export class ApifyProvider implements ContentProvider {
  readonly name = 'apify' as const;
  readonly supportedPlatforms: Platform[] = ['tiktok', 'instagram'];

  private readonly config: Required<ApifyConfig>;

  constructor(config: ApifyConfig) {
    if (!config.apiToken) {
      throw new Error('Apify API token is required');
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
   * Acquire content from the given URL using Apify actors
   */
  async acquire(url: string): Promise<AcquiredContent> {
    const platform = detectPlatform(url);

    if (!this.supports(url)) {
      throw new ContentAcquisitionError(
        `Apify does not support platform: ${platform}`,
        this.name,
        url
      );
    }

    try {
      const actorId = this.getActorId(platform);
      const input = this.buildActorInput(url, platform);

      // Start the actor run
      const run = await this.startActorRun(actorId, input, url);

      // Wait for completion
      const completedRun = await this.waitForCompletion(run.data.id, url);

      // Fetch results from dataset
      const results = await this.fetchDatasetItems(
        completedRun.data.defaultDatasetId,
        url
      );

      if (!results || results.length === 0) {
        throw new ContentAcquisitionError(
          'No results returned from Apify actor',
          this.name,
          url
        );
      }

      // Parse results based on platform
      return this.parseResults(results[0], url, platform);
    } catch (error) {
      if (error instanceof ContentAcquisitionError) {
        throw error;
      }

      throw new ContentAcquisitionError(
        `Failed to acquire content from Apify: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.name,
        url,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get the Apify actor ID for a platform
   */
  private getActorId(platform: Platform): string {
    const actorId = ACTOR_IDS[platform as keyof typeof ACTOR_IDS];
    if (!actorId) {
      throw new Error(`No Apify actor configured for platform: ${platform}`);
    }
    return actorId;
  }

  /**
   * Build actor input based on platform
   */
  private buildActorInput(
    url: string,
    platform: Platform
  ): Record<string, unknown> {
    switch (platform) {
      case 'tiktok':
        return {
          postURLs: [url],
          resultsPerPage: 1,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
        };

      case 'instagram':
        return {
          directUrls: [url],
          resultsLimit: 1,
        };

      default:
        return { url };
    }
  }

  /**
   * Start an Apify actor run
   */
  private async startActorRun(
    actorId: string,
    input: Record<string, unknown>,
    url: string
  ): Promise<ApifyRunResponse> {
    const response = await fetch(
      `${this.config.baseUrl}/acts/${actorId}/runs?token=${this.config.apiToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      }
    );

    if (response.status === 429) {
      throw new ContentAcquisitionError(
        'Rate limited by Apify',
        this.name,
        url,
        undefined,
        true
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new ContentAcquisitionError(
        `Failed to start Apify actor: ${errorText}`,
        this.name,
        url,
        undefined,
        response.status >= 500
      );
    }

    return response.json() as Promise<ApifyRunResponse>;
  }

  /**
   * Wait for actor run to complete
   */
  private async waitForCompletion(
    runId: string,
    url: string
  ): Promise<ApifyRunStatusResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < this.config.maxWaitTime) {
      const response = await fetch(
        `${this.config.baseUrl}/actor-runs/${runId}?token=${this.config.apiToken}`
      );

      if (!response.ok) {
        throw new ContentAcquisitionError(
          `Failed to check Apify run status: ${response.statusText}`,
          this.name,
          url,
          undefined,
          true
        );
      }

      const status = (await response.json()) as ApifyRunStatusResponse;

      switch (status.data.status) {
        case 'SUCCEEDED':
          return status;

        case 'FAILED':
        case 'ABORTED':
        case 'TIMED-OUT':
          throw new ContentAcquisitionError(
            `Apify actor run ${status.data.status.toLowerCase()}`,
            this.name,
            url
          );

        case 'READY':
        case 'RUNNING':
          // Still running, wait and poll again
          await this.sleep(this.config.pollInterval);
          break;

        default:
          // Unknown status, continue polling
          await this.sleep(this.config.pollInterval);
      }
    }

    throw new ContentAcquisitionError(
      `Timeout waiting for Apify actor to complete (${this.config.maxWaitTime}ms)`,
      this.name,
      url,
      undefined,
      true
    );
  }

  /**
   * Fetch items from actor dataset
   */
  private async fetchDatasetItems(
    datasetId: string,
    url: string
  ): Promise<Array<ApifyTikTokItem | ApifyInstagramItem>> {
    const response = await fetch(
      `${this.config.baseUrl}/datasets/${datasetId}/items?token=${this.config.apiToken}&format=json&limit=1`
    );

    if (!response.ok) {
      throw new ContentAcquisitionError(
        `Failed to fetch Apify dataset: ${response.statusText}`,
        this.name,
        url
      );
    }

    return response.json() as Promise<Array<ApifyTikTokItem | ApifyInstagramItem>>;
  }

  /**
   * Parse Apify results into AcquiredContent
   */
  private parseResults(
    item: ApifyTikTokItem | ApifyInstagramItem,
    url: string,
    platform: Platform
  ): AcquiredContent {
    const contentType = detectContentType(url, platform);

    if (platform === 'tiktok') {
      return this.parseTikTokItem(item as ApifyTikTokItem, url, contentType);
    }

    if (platform === 'instagram') {
      return this.parseInstagramItem(item as ApifyInstagramItem, url, contentType);
    }

    throw new ContentAcquisitionError(
      `Unknown platform: ${platform}`,
      this.name,
      url
    );
  }

  /**
   * Parse TikTok item from Apify
   */
  private parseTikTokItem(
    item: ApifyTikTokItem,
    url: string,
    contentType: ContentType
  ): AcquiredContent {
    // TikTok uses 'text' or 'desc' for caption
    const caption = item.text || item.desc;

    // Determine if this is a slideshow (image post)
    const isSlideshow =
      item.imagePost?.images && item.imagePost.images.length > 0;
    const actualContentType = isSlideshow ? 'slideshow' : contentType;

    return {
      url,
      platform: 'tiktok',
      contentType: actualContentType,
      provider: this.name,
      caption,
      description: caption,
      thumbnailUrl: item.covers?.[0],
      videoUrl: item.videoUrl,
      imageUrls: item.imagePost?.images,
      metadata: {
        duration: item.videoMeta?.duration,
        creator: item.authorMeta?.nickName || item.authorMeta?.name,
        likes: item.diggCount,
        views: item.playCount,
      },
    };
  }

  /**
   * Parse Instagram item from Apify
   */
  private parseInstagramItem(
    item: ApifyInstagramItem,
    url: string,
    contentType: ContentType
  ): AcquiredContent {
    return {
      url,
      platform: 'instagram',
      contentType,
      provider: this.name,
      caption: item.caption,
      description: item.caption,
      thumbnailUrl: item.displayUrl,
      videoUrl: item.videoUrl,
      imageUrls: item.images,
      metadata: {
        duration: item.videoDuration,
        creator: item.ownerUsername,
        likes: item.likesCount,
        views: item.videoViewCount,
      },
    };
  }

  /**
   * Helper to sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create an Apify provider instance
 */
export function createApifyProvider(config: ApifyConfig): ApifyProvider {
  return new ApifyProvider(config);
}
