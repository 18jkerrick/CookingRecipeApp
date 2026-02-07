import OpenAI from 'openai';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for FrameAnalyzer
 */
export interface FrameAnalyzerConfig {
  /** OpenAI API key (required) */
  apiKey: string;

  /** Model to use (default: gpt-4o-mini) */
  model?: string;

  /** Maximum concurrent requests (default: 3) */
  maxConcurrent?: number;

  /** Number of retry attempts (default: 3) */
  retryAttempts?: number;

  /** Delay between retries in ms (default: 2000) */
  retryDelay?: number;

  /** Delay between batches in ms (default: 1000) */
  batchDelay?: number;

  /** Max tokens for response (default: 400) */
  maxTokens?: number;
}

const DEFAULT_CONFIG = {
  model: 'gpt-4o-mini',
  maxConcurrent: 3,
  retryAttempts: 3,
  retryDelay: 2000,
  batchDelay: 1000,
  maxTokens: 400,
};

// ============================================================================
// Result Types
// ============================================================================

/**
 * Cooking stage classification
 */
export type CookingStage = 'intro' | 'cooking' | 'outro';

/**
 * Analysis of a single frame
 */
export interface FrameAnalysis {
  /** Frame index in sequence */
  frameIndex: number;

  /** Cooking stage classification */
  stage: CookingStage;

  /** Raw observation text */
  observations: string;

  /** Ingredients identified in frame */
  ingredients: string[];

  /** Cooking actions observed */
  actions: string[];

  /** Equipment/tools visible */
  equipment: string[];

  /** State of food (raw, cooking, cooked, plated) */
  foodState: string;

  /** Whether text overlays detected */
  hasText: boolean;
}

/**
 * Result of analyzing all frames
 */
export interface FrameAnalysisResult {
  /** Individual frame analyses */
  analyses: FrameAnalysis[];

  /** Number of successfully analyzed frames */
  successCount: number;

  /** Indices of frames that failed analysis */
  failedFrames: number[];
}

// ============================================================================
// Vision Response Schema
// ============================================================================

/**
 * Expected JSON structure from vision API
 */
interface VisionResponse {
  ingredients: string[];
  actions: string[];
  equipment: string[];
  foodState: string;
  hasTextOverlay: boolean;
  observations: string;
}

// ============================================================================
// FrameAnalyzer Implementation
// ============================================================================

/**
 * Analyzes video frames using OpenAI Vision API with parallel processing
 *
 * Features:
 * - Parallel batch processing for speed (3 concurrent by default)
 * - Automatic retry with exponential backoff
 * - Rate limit handling with batch delays
 * - Context-aware prompts based on cooking stage
 *
 * @example
 * ```typescript
 * const analyzer = createFrameAnalyzer({ apiKey: process.env.OPENAI_API_KEY });
 * const result = await analyzer.analyzeAll(frames);
 * console.log(`Analyzed ${result.successCount} frames`);
 * ```
 */
export class FrameAnalyzer {
  private readonly client: OpenAI;
  private readonly config: Required<FrameAnalyzerConfig>;

  constructor(config: FrameAnalyzerConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required for FrameAnalyzer');
    }

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Analyze images from URLs directly (for photo/slideshow content)
   *
   * @param imageUrls - Array of image URLs to analyze
   * @returns Analysis results for all images
   */
  async analyzeImageUrls(imageUrls: string[]): Promise<FrameAnalysisResult> {
    const analyses: FrameAnalysis[] = [];
    const failedFrames: number[] = [];

    // Process in batches for parallel execution
    for (let i = 0; i < imageUrls.length; i += this.config.maxConcurrent) {
      const batch = imageUrls.slice(i, i + this.config.maxConcurrent);
      const batchIndices = batch.map((_, idx) => i + idx);

      // Process batch in parallel using Promise.allSettled
      const batchPromises = batch.map((url, idx) =>
        this.analyzeImageUrlWithRetry(url, batchIndices[idx], imageUrls.length)
      );

      const results = await Promise.allSettled(batchPromises);

      // Process results
      results.forEach((result, idx) => {
        const frameIndex = batchIndices[idx];
        if (result.status === 'fulfilled' && result.value) {
          analyses.push(result.value);
        } else {
          failedFrames.push(frameIndex);
        }
      });

      // Delay between batches to avoid rate limits
      if (i + this.config.maxConcurrent < imageUrls.length) {
        await this.delay(this.config.batchDelay);
      }
    }

    // Sort analyses by frame index
    analyses.sort((a, b) => a.frameIndex - b.frameIndex);

    return {
      analyses,
      successCount: analyses.length,
      failedFrames,
    };
  }

  /**
   * Analyze a single image URL with retry logic
   */
  private async analyzeImageUrlWithRetry(
    imageUrl: string,
    index: number,
    total: number
  ): Promise<FrameAnalysis | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        return await this.analyzeImageUrl(imageUrl, index, total);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's a rate limit error
        const isRateLimit =
          error instanceof Error &&
          (error.message.includes('429') || error.message.includes('rate'));

        if (isRateLimit && attempt < this.config.retryAttempts - 1) {
          // Exponential backoff for rate limits
          const backoff = this.config.retryDelay * Math.pow(2, attempt);
          await this.delay(backoff);
        } else if (attempt < this.config.retryAttempts - 1) {
          await this.delay(this.config.retryDelay);
        }
      }
    }

    console.error(
      `Failed to analyze image ${index} after ${this.config.retryAttempts} attempts:`,
      lastError?.message
    );
    return null;
  }

  /**
   * Analyze a single image from URL
   */
  async analyzeImageUrl(
    imageUrl: string,
    index: number,
    total: number
  ): Promise<FrameAnalysis> {
    const stage = this.getStage(index, total);
    const prompt = this.buildPrompt(stage);

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      max_tokens: this.config.maxTokens,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse JSON response
    const parsed = this.parseVisionResponse(content);

    return {
      frameIndex: index,
      stage,
      observations: parsed.observations,
      ingredients: parsed.ingredients,
      actions: parsed.actions,
      equipment: parsed.equipment,
      foodState: parsed.foodState,
      hasText: parsed.hasTextOverlay,
    };
  }

  /**
   * Analyze all frames with parallel processing
   *
   * @param frames - Array of frame buffers to analyze
   * @returns Analysis results for all frames
   */
  async analyzeAll(frames: Buffer[]): Promise<FrameAnalysisResult> {
    const analyses: FrameAnalysis[] = [];
    const failedFrames: number[] = [];

    // Process in batches for parallel execution
    for (let i = 0; i < frames.length; i += this.config.maxConcurrent) {
      const batch = frames.slice(i, i + this.config.maxConcurrent);
      const batchIndices = batch.map((_, idx) => i + idx);

      // Process batch in parallel using Promise.allSettled
      const batchPromises = batch.map((frame, idx) =>
        this.analyzeFrameWithRetry(frame, batchIndices[idx], frames.length)
      );

      const results = await Promise.allSettled(batchPromises);

      // Process results
      results.forEach((result, idx) => {
        const frameIndex = batchIndices[idx];
        if (result.status === 'fulfilled' && result.value) {
          analyses.push(result.value);
        } else {
          failedFrames.push(frameIndex);
        }
      });

      // Delay between batches to avoid rate limits
      if (i + this.config.maxConcurrent < frames.length) {
        await this.delay(this.config.batchDelay);
      }
    }

    // Sort analyses by frame index
    analyses.sort((a, b) => a.frameIndex - b.frameIndex);

    return {
      analyses,
      successCount: analyses.length,
      failedFrames,
    };
  }

  /**
   * Analyze a single frame with retry logic
   */
  private async analyzeFrameWithRetry(
    frame: Buffer,
    index: number,
    total: number
  ): Promise<FrameAnalysis | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        return await this.analyzeFrame(frame, index, total);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if it's a rate limit error
        const isRateLimit =
          error instanceof Error &&
          (error.message.includes('429') || error.message.includes('rate'));

        if (isRateLimit && attempt < this.config.retryAttempts - 1) {
          // Exponential backoff for rate limits
          const backoff = this.config.retryDelay * Math.pow(2, attempt);
          await this.delay(backoff);
        } else if (attempt < this.config.retryAttempts - 1) {
          await this.delay(this.config.retryDelay);
        }
      }
    }

    console.error(
      `Failed to analyze frame ${index} after ${this.config.retryAttempts} attempts:`,
      lastError?.message
    );
    return null;
  }

  /**
   * Analyze a single frame
   */
  async analyzeFrame(
    frame: Buffer,
    index: number,
    total: number
  ): Promise<FrameAnalysis> {
    const stage = this.getStage(index, total);
    const prompt = this.buildPrompt(stage);

    const base64Frame = frame.toString('base64');

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Frame}`,
              },
            },
          ],
        },
      ],
      max_tokens: this.config.maxTokens,
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse JSON response
    const parsed = this.parseVisionResponse(content);

    return {
      frameIndex: index,
      stage,
      observations: parsed.observations,
      ingredients: parsed.ingredients,
      actions: parsed.actions,
      equipment: parsed.equipment,
      foodState: parsed.foodState,
      hasText: parsed.hasTextOverlay,
    };
  }

  /**
   * Determine cooking stage based on frame position
   */
  private getStage(index: number, total: number): CookingStage {
    const position = index / total;

    if (position < 0.15) {
      return 'intro';
    } else if (position > 0.8) {
      return 'outro';
    } else {
      return 'cooking';
    }
  }

  /**
   * Build context-aware vision prompt
   */
  private buildPrompt(stage: CookingStage): string {
    const stageDescriptions: Record<CookingStage, string> = {
      intro: 'the beginning (often shows finished dish preview or title)',
      cooking: 'the main cooking process (ingredient prep, cooking action)',
      outro: 'the end (final plating, recipe summary, or finished dish)',
    };

    return `You are analyzing a single frame from a cooking video. This frame is from ${stageDescriptions[stage]}.

IMPORTANT: Only describe what you SEE in this frame. Do NOT make assumptions about other frames.

Analyze this cooking video frame and respond in JSON format:
{
  "ingredients": ["ingredient 1", "ingredient 2"],
  "actions": ["action being performed"],
  "equipment": ["visible tools/equipment"],
  "foodState": "raw|cooking|cooked|plated",
  "hasTextOverlay": true|false,
  "observations": "Brief 1-2 sentence description of what's visible"
}

Guidelines:
- Be specific about ingredients (e.g., "chicken breast" not just "meat")
- Include quantities if clearly visible
- Note any text overlays, labels, or measurements
- If no clear cooking content, return empty arrays and note in observations

Respond ONLY with valid JSON.`;
  }

  /**
   * Parse vision API response into structured format
   */
  private parseVisionResponse(content: string): VisionResponse {
    // Default empty response
    const defaultResponse: VisionResponse = {
      ingredients: [],
      actions: [],
      equipment: [],
      foodState: 'unknown',
      hasTextOverlay: false,
      observations: content,
    };

    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ingredients: Array.isArray(parsed.ingredients)
            ? parsed.ingredients
            : [],
          actions: Array.isArray(parsed.actions) ? parsed.actions : [],
          equipment: Array.isArray(parsed.equipment) ? parsed.equipment : [],
          foodState: parsed.foodState || 'unknown',
          hasTextOverlay: Boolean(parsed.hasTextOverlay),
          observations: parsed.observations || content,
        };
      }
    } catch {
      // JSON parsing failed, return raw content as observations
    }

    return defaultResponse;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a FrameAnalyzer with configuration
 *
 * @param config - Configuration including required API key
 * @returns Configured FrameAnalyzer instance
 */
export function createFrameAnalyzer(config: FrameAnalyzerConfig): FrameAnalyzer {
  return new FrameAnalyzer(config);
}
