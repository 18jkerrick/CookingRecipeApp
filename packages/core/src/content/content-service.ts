import {
  type ContentProvider,
  type AcquiredContent,
  type Provider,
  ContentAcquisitionError,
  detectPlatform,
} from './types';
import { SupadataProvider, type SupadataConfig } from './providers/supadata';
import { ApifyProvider, type ApifyConfig } from './providers/apify';

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for the ContentService
 */
export interface ContentServiceConfig {
  /** Supadata provider configuration */
  supadata?: SupadataConfig & { enabled?: boolean };

  /** Apify provider configuration */
  apify?: ApifyConfig & { enabled?: boolean };

  /**
   * Direct provider injection (for testing or custom providers)
   * When provided, supadata/apify configs are ignored
   */
  providers?: ContentProvider[];

  /** Enable legacy parsers as final fallback */
  enableLegacyFallback?: boolean;

  /** Legacy parser function (injected to avoid circular dependencies) */
  legacyParser?: (url: string) => Promise<AcquiredContent>;

  /** Maximum retry attempts per provider */
  maxRetries?: number;

  /** Base delay for exponential backoff in milliseconds */
  baseRetryDelay?: number;

  /** Maximum delay between retries in milliseconds */
  maxRetryDelay?: number;
}

/**
 * Provider execution result (internal)
 */
interface ProviderAttempt {
  provider: Provider;
  error: Error;
  retryable: boolean;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG = {
  maxRetries: 3,
  baseRetryDelay: 1000,
  maxRetryDelay: 10000,
  enableLegacyFallback: false,
};

// ============================================================================
// ContentService Implementation
// ============================================================================

/**
 * Service for acquiring content from social media URLs
 *
 * Orchestrates multiple content providers with:
 * - Priority-based provider selection (Supadata → Apify → Legacy)
 * - Exponential backoff retry for retryable errors
 * - Detailed error aggregation when all providers fail
 *
 * @example
 * ```typescript
 * const service = new ContentService({
 *   supadata: { apiKey: process.env.SUPADATA_API_KEY, enabled: true },
 *   apify: { apiToken: process.env.APIFY_TOKEN, enabled: true },
 * });
 *
 * const content = await service.acquire('https://tiktok.com/@user/video/123');
 * console.log(content.transcript);
 * ```
 */
export class ContentService {
  private readonly providers: ContentProvider[] = [];
  private readonly config: Required<
    Pick<ContentServiceConfig, 'maxRetries' | 'baseRetryDelay' | 'maxRetryDelay' | 'enableLegacyFallback'>
  > & Pick<ContentServiceConfig, 'legacyParser'>;

  constructor(config: ContentServiceConfig) {
    this.config = {
      maxRetries: config.maxRetries ?? DEFAULT_CONFIG.maxRetries,
      baseRetryDelay: config.baseRetryDelay ?? DEFAULT_CONFIG.baseRetryDelay,
      maxRetryDelay: config.maxRetryDelay ?? DEFAULT_CONFIG.maxRetryDelay,
      enableLegacyFallback: config.enableLegacyFallback ?? DEFAULT_CONFIG.enableLegacyFallback,
      legacyParser: config.legacyParser,
    };

    // Initialize providers in priority order
    this.initializeProviders(config);
  }

  /**
   * Initialize content providers based on configuration
   */
  private initializeProviders(config: ContentServiceConfig): void {
    // If providers are directly injected (for testing), use them
    if (config.providers && config.providers.length > 0) {
      this.providers.push(...config.providers);
      return;
    }

    // Priority 1: Supadata (best for transcripts)
    if (config.supadata?.enabled !== false && config.supadata?.apiKey) {
      try {
        this.providers.push(new SupadataProvider(config.supadata));
      } catch (error) {
        console.warn('Failed to initialize Supadata provider:', error);
      }
    }

    // Priority 2: Apify (good fallback for TikTok/Instagram)
    if (config.apify?.enabled !== false && config.apify?.apiToken) {
      try {
        this.providers.push(new ApifyProvider(config.apify));
      } catch (error) {
        console.warn('Failed to initialize Apify provider:', error);
      }
    }

    if (this.providers.length === 0 && !this.config.enableLegacyFallback) {
      console.warn(
        'No content providers configured. Content acquisition will fail.'
      );
    }
  }

  /**
   * Get list of configured provider names
   */
  getConfiguredProviders(): Provider[] {
    const providers: Provider[] = this.providers.map((p) => p.name);
    if (this.config.enableLegacyFallback && this.config.legacyParser) {
      providers.push('legacy');
    }
    return providers;
  }

  /**
   * Check if any provider supports the given URL
   */
  supportsUrl(url: string): boolean {
    // Check configured providers
    for (const provider of this.providers) {
      if (provider.supports(url)) {
        return true;
      }
    }

    // Legacy fallback supports anything
    if (this.config.enableLegacyFallback && this.config.legacyParser) {
      return true;
    }

    return false;
  }

  /**
   * Acquire content from the given URL
   *
   * Tries providers in priority order with retry logic:
   * 1. Supadata (primary - best for transcripts)
   * 2. Apify (fallback for TikTok/Instagram)
   * 3. Legacy parsers (if enabled)
   *
   * @throws AggregateError if all providers fail
   */
  async acquire(url: string): Promise<AcquiredContent> {
    const platform = detectPlatform(url);
    const attempts: ProviderAttempt[] = [];

    // Try each provider in priority order
    for (const provider of this.providers) {
      if (!provider.supports(url)) {
        continue;
      }

      try {
        const content = await this.tryProviderWithRetry(provider, url);
        return content;
      } catch (error) {
        const isRetryable =
          error instanceof ContentAcquisitionError && error.isRetryable;

        attempts.push({
          provider: provider.name,
          error: error instanceof Error ? error : new Error(String(error)),
          retryable: isRetryable,
        });

        // Continue to next provider
        console.warn(
          `Provider ${provider.name} failed for ${url}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    // Try legacy fallback if enabled
    if (this.config.enableLegacyFallback && this.config.legacyParser) {
      try {
        const content = await this.config.legacyParser(url);
        return {
          ...content,
          provider: 'legacy',
        };
      } catch (error) {
        attempts.push({
          provider: 'legacy',
          error: error instanceof Error ? error : new Error(String(error)),
          retryable: false,
        });
      }
    }

    // All providers failed
    throw this.createAggregateError(url, platform, attempts);
  }

  /**
   * Try a provider with exponential backoff retry
   */
  private async tryProviderWithRetry(
    provider: ContentProvider,
    url: string
  ): Promise<AcquiredContent> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await provider.acquire(url);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Only retry if error is retryable
        const isRetryable =
          error instanceof ContentAcquisitionError && error.isRetryable;

        if (!isRetryable || attempt === this.config.maxRetries) {
          throw error;
        }

        // Calculate exponential backoff delay
        const delay = Math.min(
          this.config.baseRetryDelay * Math.pow(2, attempt),
          this.config.maxRetryDelay
        );

        // Add jitter (±20%)
        const jitter = delay * 0.2 * (Math.random() * 2 - 1);
        const actualDelay = Math.round(delay + jitter);

        console.log(
          `Retrying ${provider.name} for ${url} in ${actualDelay}ms (attempt ${attempt + 1}/${this.config.maxRetries})`
        );

        await this.sleep(actualDelay);
      }
    }

    throw lastError || new Error('Unknown error during retry');
  }

  /**
   * Create an aggregate error with all provider failures
   */
  private createAggregateError(
    url: string,
    platform: string,
    attempts: ProviderAttempt[]
  ): AggregateError {
    const errors = attempts.map((a) => a.error);

    const message = [
      `Failed to acquire content from ${url} (platform: ${platform})`,
      '',
      'Provider attempts:',
      ...attempts.map(
        (a) =>
          `  - ${a.provider}: ${a.error.message}${a.retryable ? ' (retryable)' : ''}`
      ),
    ].join('\n');

    const aggregateError = new AggregateError(errors, message);

    // Add custom properties for debugging
    Object.assign(aggregateError, {
      url,
      platform,
      attempts: attempts.map((a) => ({
        provider: a.provider,
        error: a.error.message,
        retryable: a.retryable,
      })),
    });

    return aggregateError;
  }

  /**
   * Get transcript only (convenience method)
   *
   * Tries providers that support getTranscript first,
   * then falls back to full acquire() if needed.
   */
  async getTranscript(url: string): Promise<string | null> {
    // Try providers with dedicated transcript method first
    for (const provider of this.providers) {
      if (!provider.supports(url)) continue;

      if (provider.getTranscript) {
        try {
          const transcript = await provider.getTranscript(url);
          if (transcript) return transcript;
        } catch {
          // Continue to next provider
        }
      }
    }

    // Fall back to full acquire
    try {
      const content = await this.acquire(url);
      return content.transcript || null;
    } catch {
      return null;
    }
  }

  /**
   * Helper to sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a ContentService instance with environment-based configuration
 *
 * Reads API keys from environment variables:
 * - SUPADATA_API_KEY
 * - APIFY_TOKEN
 */
export function createContentService(
  overrides?: Partial<ContentServiceConfig>
): ContentService {
  const config: ContentServiceConfig = {
    supadata: {
      apiKey: process.env.SUPADATA_API_KEY || '',
      enabled: Boolean(process.env.SUPADATA_API_KEY),
      ...overrides?.supadata,
    },
    apify: {
      apiToken: process.env.APIFY_TOKEN || '',
      enabled: Boolean(process.env.APIFY_TOKEN),
      ...overrides?.apify,
    },
    enableLegacyFallback: overrides?.enableLegacyFallback,
    legacyParser: overrides?.legacyParser,
    maxRetries: overrides?.maxRetries,
    baseRetryDelay: overrides?.baseRetryDelay,
    maxRetryDelay: overrides?.maxRetryDelay,
  };

  return new ContentService(config);
}
