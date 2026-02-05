/**
 * Performance thresholds for regression testing.
 * 
 * These are "relaxed" thresholds (2x social media standards)
 * to account for Supabase latency and development environments.
 * 
 * Social media apps (TikTok, Instagram) target:
 * - Initial batch: < 500ms
 * - Subsequent batch: < 300ms
 * - Time to first content: < 1s
 */
export const PERF_THRESHOLDS = {
  // API response time thresholds (milliseconds)
  API_FIRST_BATCH_MS: 2000,       // Initial 20 recipes
  API_SUBSEQUENT_BATCH_MS: 1000,  // Next page fetch
  
  // Page load thresholds (milliseconds)
  TIME_TO_SKELETON_MS: 500,       // Skeleton should show within 500ms
  TIME_TO_FIRST_CONTENT_MS: 3000, // First real content within 3s
  
  // Pagination configuration
  DEFAULT_PAGE_SIZE: 20,
  PREFETCH_THRESHOLD_PX: 200,     // Prefetch when 200px from bottom
  
  // Cache configuration (milliseconds)
  STALE_TIME_MS: 5 * 60 * 1000,   // 5 minutes
  GC_TIME_MS: 30 * 60 * 1000,     // 30 minutes
} as const

export type PerfThresholds = typeof PERF_THRESHOLDS
