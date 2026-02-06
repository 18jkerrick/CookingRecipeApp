/**
 * Content acquisition providers
 *
 * Each provider implements the ContentProvider interface
 * and handles content extraction from specific platforms.
 */

// Supadata provider - primary provider for video transcripts
export {
  SupadataProvider,
  createSupadataProvider,
  type SupadataConfig,
} from './supadata';

// Apify provider - fallback for TikTok/Instagram
export {
  ApifyProvider,
  createApifyProvider,
  type ApifyConfig,
} from './apify';
