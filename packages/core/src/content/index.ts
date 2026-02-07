/**
 * Content Acquisition Layer
 *
 * This module provides a unified interface for extracting content
 * from social media posts (TikTok, Instagram, YouTube, Facebook).
 *
 * Key components:
 * - ContentService: Main orchestrator with provider fallback and retry logic
 * - ContentProvider: Interface for content acquisition providers
 * - Providers: Supadata (primary), Apify (fallback)
 *
 * @example
 * ```typescript
 * import { createContentService } from '@acme/core/content';
 *
 * const service = createContentService();
 * const content = await service.acquire('https://tiktok.com/@user/video/123');
 *
 * console.log(content.transcript); // Video transcript
 * console.log(content.caption);    // Post caption
 * console.log(content.platform);   // 'tiktok'
 * ```
 *
 * @module
 */

// Types and interfaces
export {
  // Schemas (for runtime validation)
  PlatformSchema,
  ContentTypeSchema,
  ProviderSchema,
  AcquiredContentSchema,
  // Types
  type Platform,
  type ContentType,
  type Provider,
  type AcquiredContent,
  type ContentProvider,
  // Error class
  ContentAcquisitionError,
  // URL detection utilities
  PLATFORM_PATTERNS,
  detectPlatform,
  detectContentType,
} from './types';

// Content service
export {
  ContentService,
  createContentService,
  type ContentServiceConfig,
} from './content-service';

// Providers
export {
  // Supadata
  SupadataProvider,
  createSupadataProvider,
  type SupadataConfig,
  // Apify
  ApifyProvider,
  createApifyProvider,
  type ApifyConfig,
} from './providers';
