/**
 * Image compression utilities for recipe thumbnails
 * 
 * Compresses base64-encoded images to reduce API response sizes.
 * Target: ~50-100KB per thumbnail (down from 200KB-1.8MB)
 */

// Simple in-memory cache for compressed thumbnails
// Key: hash of original base64, Value: compressed base64
const compressionCache = new Map<string, string>();

// Cache size limit (number of entries)
const MAX_CACHE_SIZE = 500;

// Target dimensions for list view thumbnails (displayed at ~300x200px)
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 300;

// JPEG quality (0-100) - 60-70 provides good balance of quality and size
const JPEG_QUALITY = 65;

/**
 * Simple hash function for cache keys
 * Uses first and last 100 chars + length for quick identification
 */
function quickHash(str: string): string {
  const len = str.length;
  const start = str.substring(0, 100);
  const end = str.substring(Math.max(0, len - 100));
  return `${len}_${start}_${end}`;
}

/**
 * Extract the raw base64 data from a data URL
 * Handles both "data:image/..." format and raw base64
 */
function extractBase64Data(input: string): { data: string; mimeType: string } {
  const dataUrlMatch = input.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      data: dataUrlMatch[2],
    };
  }
  // Assume raw base64 with unknown type
  return {
    mimeType: 'image/jpeg',
    data: input,
  };
}

/**
 * Compress a base64-encoded image for thumbnail display
 * 
 * @param base64Input - Base64 string (with or without data URL prefix)
 * @returns Compressed base64 string with data URL prefix, or original if compression fails
 */
export async function compressThumbnail(base64Input: string): Promise<string> {
  if (!base64Input) {
    return base64Input;
  }

  // Check cache first
  const cacheKey = quickHash(base64Input);
  const cached = compressionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const { data: rawBase64 } = extractBase64Data(base64Input);
    
    // Convert base64 to buffer
    const inputBuffer = Buffer.from(rawBase64, 'base64');
    
    // Skip compression for already small images (< 80KB)
    if (inputBuffer.length < 80 * 1024) {
      // Still cache it to avoid re-checking
      compressionCache.set(cacheKey, base64Input);
      return base64Input;
    }

    // Dynamically import sharp to avoid issues in test environments
    // and ensure proper bundling with Next.js
    const sharp = await import(/* webpackIgnore: true */ 'sharp');

    // Compress with sharp
    const compressedBuffer = await sharp.default(inputBuffer)
      .resize({
        width: THUMBNAIL_WIDTH,
        height: THUMBNAIL_HEIGHT,
        fit: 'cover',
        position: 'center',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: JPEG_QUALITY,
        progressive: true,
        mozjpeg: true, // Use mozjpeg for better compression
      })
      .toBuffer();

    // Convert back to base64 with data URL prefix
    const compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;

    // Manage cache size (simple LRU-like: remove oldest entries when full)
    if (compressionCache.size >= MAX_CACHE_SIZE) {
      const firstKey = compressionCache.keys().next().value;
      if (firstKey) {
        compressionCache.delete(firstKey);
      }
    }

    // Cache the result
    compressionCache.set(cacheKey, compressedBase64);

    return compressedBase64;
  } catch (error) {
    // Log error but return original to avoid breaking the API
    console.error('Thumbnail compression failed:', error);
    return base64Input;
  }
}

/**
 * Compress thumbnails for an array of recipes
 * Processes in parallel for better performance
 * 
 * @param recipes - Array of recipe objects with optional thumbnail field
 * @returns Recipes with compressed thumbnails
 */
export async function compressRecipeThumbnails<T extends { thumbnail?: string | null }>(
  recipes: T[]
): Promise<T[]> {
  const compressionPromises = recipes.map(async (recipe) => {
    if (!recipe.thumbnail) {
      return recipe;
    }

    const compressedThumbnail = await compressThumbnail(recipe.thumbnail);
    return {
      ...recipe,
      thumbnail: compressedThumbnail,
    };
  });

  return Promise.all(compressionPromises);
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: compressionCache.size,
    maxSize: MAX_CACHE_SIZE,
  };
}

/**
 * Clear the compression cache (useful for testing or memory management)
 */
export function clearCompressionCache(): void {
  compressionCache.clear();
}
