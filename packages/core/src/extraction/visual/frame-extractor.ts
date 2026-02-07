import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for FrameExtractor
 */
export interface FrameExtractorConfig {
  /** Maximum frames to extract (default: 8) */
  maxFrames?: number;

  /** Minimum valid frame size in bytes (default: 1000) */
  minFrameSize?: number;

  /** Directory for temporary files (default: process.cwd()) */
  tempDir?: string;

  /** Timeout for extraction in ms (default: 300000 = 5 min) */
  timeout?: number;
}

const DEFAULT_CONFIG: Required<FrameExtractorConfig> = {
  maxFrames: 8,
  minFrameSize: 1000,
  tempDir: process.cwd(),
  timeout: 300000,
};

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of frame extraction
 */
export interface FrameExtractionResult {
  /** Extracted frame buffers */
  frames: Buffer[];

  /** Timestamps at which frames were extracted (seconds) */
  timestamps: number[];

  /** Video duration in seconds */
  duration: number;

  /** Video metadata if available */
  metadata?: {
    width?: number;
    height?: number;
  };
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error during frame extraction
 */
export class FrameExtractionError extends Error {
  constructor(
    message: string,
    public readonly videoUrl: string,
    public readonly cause?: Error,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'FrameExtractionError';
    Object.setPrototypeOf(this, FrameExtractionError.prototype);
  }
}

// ============================================================================
// Frame Strategy
// ============================================================================

/**
 * Strategy for selecting frame timestamps based on video duration
 *
 * From design doc:
 * - intro: 5% and 10% - finished dish or title card
 * - cooking: 25%, 40%, 55%, 70% - cooking action
 * - outro: 85% and 95% - final plating, recipe card
 */
const FRAME_STRATEGY = {
  intro: [0.05, 0.1],
  cooking: [0.25, 0.4, 0.55, 0.7],
  outro: [0.85, 0.95],
} as const;

// ============================================================================
// FrameExtractor Implementation
// ============================================================================

/**
 * Extracts frames from cooking videos using yt-dlp and FFmpeg
 *
 * Implements smart frame selection to capture key moments:
 * - Beginning: finished dish previews, title cards
 * - Middle: cooking actions, ingredient additions
 * - End: plating, final presentation, recipe cards
 *
 * @example
 * ```typescript
 * const extractor = createFrameExtractor({ maxFrames: 6 });
 * const result = await extractor.extract('https://tiktok.com/...');
 * console.log(`Extracted ${result.frames.length} frames`);
 * ```
 */
export class FrameExtractor {
  private readonly config: Required<FrameExtractorConfig>;

  constructor(config?: Partial<FrameExtractorConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Extract frames from a video URL
   *
   * @param url - Video URL (TikTok, YouTube, Instagram, etc.)
   * @returns Extraction result with frames and metadata
   */
  async extract(url: string): Promise<FrameExtractionResult> {
    let videoPath: string | null = null;

    try {
      // Step 1: Download video
      videoPath = await this.downloadVideo(url);

      // Step 2: Get video duration
      const duration = await this.getVideoDuration(videoPath);

      // Step 3: Generate smart timestamps
      const timestamps = this.generateTimestamps(duration);

      // Step 4: Extract frames at each timestamp
      const frames: Buffer[] = [];
      const extractedTimestamps: number[] = [];

      for (const timestamp of timestamps) {
        if (frames.length >= this.config.maxFrames) break;

        const frame = await this.extractFrame(videoPath, timestamp);
        if (frame && frame.length >= this.config.minFrameSize) {
          frames.push(frame);
          extractedTimestamps.push(timestamp);
        }
      }

      if (frames.length === 0) {
        throw new FrameExtractionError(
          'No valid frames extracted from video',
          url,
          undefined,
          false
        );
      }

      return {
        frames,
        timestamps: extractedTimestamps,
        duration,
      };
    } catch (error) {
      if (error instanceof FrameExtractionError) {
        throw error;
      }

      throw new FrameExtractionError(
        `Frame extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url,
        error instanceof Error ? error : undefined,
        this.isRetryableError(error)
      );
    } finally {
      // Cleanup
      if (videoPath) {
        await this.cleanup(videoPath);
      }
    }
  }

  /**
   * Download video using yt-dlp
   */
  async downloadVideo(url: string): Promise<string> {
    const outputPath = path.join(
      this.config.tempDir,
      `temp_video_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`
    );

    return new Promise((resolve, reject) => {
      const ytdlp = spawn('yt-dlp', [
        '--format',
        'best[ext=mp4]/best',
        '--output',
        outputPath,
        '--force-overwrites',
        '--no-playlist',
        url,
      ]);

      let errorOutput = '';

      ytdlp.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      const timeout = setTimeout(() => {
        ytdlp.kill('SIGTERM');
        reject(
          new FrameExtractionError(
            'Video download timeout',
            url,
            undefined,
            true
          )
        );
      }, this.config.timeout);

      ytdlp.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          reject(
            new FrameExtractionError(
              `Video download failed: ${errorOutput || 'Unknown error'}`,
              url,
              undefined,
              true
            )
          );
        }
      });

      ytdlp.on('error', (error) => {
        clearTimeout(timeout);
        reject(
          new FrameExtractionError(
            `Failed to spawn yt-dlp: ${error.message}`,
            url,
            error,
            false
          )
        );
      });
    });
  }

  /**
   * Get video duration using ffprobe
   */
  async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve) => {
      const ffprobe = spawn('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'csv=p=0',
        videoPath,
      ]);

      let output = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0 && output.trim()) {
          const duration = parseFloat(output.trim());
          resolve(Math.floor(duration));
        } else {
          // Default to 60 seconds if we can't determine duration
          resolve(60);
        }
      });

      ffprobe.on('error', () => {
        resolve(60);
      });
    });
  }

  /**
   * Generate smart timestamps based on video duration
   *
   * Strategy:
   * - Short videos (<60s): 4-5 frames
   * - Medium (1-3min): 6-8 frames
   * - Long (>5min): 8-10 frames, weighted toward beginning/end
   */
  generateTimestamps(duration: number): number[] {
    const timestamps: number[] = [];

    if (duration <= 60) {
      // Short videos: use percentage-based strategy
      const allPercentages = [
        ...FRAME_STRATEGY.intro,
        ...FRAME_STRATEGY.cooking.slice(0, 2),
        ...FRAME_STRATEGY.outro,
      ];

      for (const pct of allPercentages) {
        const ts = Math.floor(duration * pct);
        if (ts > 0 && ts < duration - 1) {
          timestamps.push(ts);
        }
      }
    } else if (duration <= 180) {
      // Medium videos: full strategy
      const allPercentages = [
        ...FRAME_STRATEGY.intro,
        ...FRAME_STRATEGY.cooking,
        ...FRAME_STRATEGY.outro,
      ];

      for (const pct of allPercentages) {
        const ts = Math.floor(duration * pct);
        if (ts > 0 && ts < duration - 1) {
          timestamps.push(ts);
        }
      }
    } else {
      // Long videos: extended coverage
      const extendedPercentages = [
        0.02, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95,
      ];

      for (const pct of extendedPercentages) {
        const ts = Math.floor(duration * pct);
        if (ts > 0 && ts < duration - 1) {
          timestamps.push(ts);
        }
      }
    }

    // Sort and deduplicate
    return [...new Set(timestamps)].sort((a, b) => a - b);
  }

  /**
   * Extract a single frame at a specific timestamp
   */
  async extractFrame(
    videoPath: string,
    timestampSeconds: number
  ): Promise<Buffer | null> {
    return new Promise((resolve) => {
      // Format timestamp as HH:MM:SS.mmm
      const hours = Math.floor(timestampSeconds / 3600);
      const minutes = Math.floor((timestampSeconds % 3600) / 60);
      const seconds = timestampSeconds % 60;
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      const ffmpeg = spawn(
        'ffmpeg',
        [
          '-ss',
          timeStr,
          '-i',
          videoPath,
          '-frames:v',
          '1',
          '-f',
          'image2pipe',
          '-vcodec',
          'png',
          '-q:v',
          '2',
          '-y',
          'pipe:1',
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );

      let frameBuffer = Buffer.alloc(0);

      ffmpeg.stdout.on('data', (chunk) => {
        frameBuffer = Buffer.concat([frameBuffer, chunk]);
      });

      const timeout = setTimeout(() => {
        ffmpeg.kill('SIGTERM');
        resolve(frameBuffer.length > 0 ? frameBuffer : null);
      }, 30000); // 30s timeout per frame

      ffmpeg.on('close', () => {
        clearTimeout(timeout);
        resolve(frameBuffer.length >= this.config.minFrameSize ? frameBuffer : null);
      });

      ffmpeg.on('error', () => {
        clearTimeout(timeout);
        resolve(null);
      });
    });
  }

  /**
   * Clean up temporary video file
   */
  async cleanup(videoPath: string): Promise<void> {
    try {
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('timeout') ||
        message.includes('rate limit') ||
        message.includes('network') ||
        message.includes('temporary')
      );
    }
    return false;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a FrameExtractor with optional configuration
 *
 * @param config - Partial configuration to override defaults
 * @returns Configured FrameExtractor instance
 */
export function createFrameExtractor(
  config?: Partial<FrameExtractorConfig>
): FrameExtractor {
  return new FrameExtractor(config);
}
