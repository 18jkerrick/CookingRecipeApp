import { ContentService, type ContentServiceConfig } from '../content/content-service';
import type { AcquiredContent } from '../content/types';
import { CaptionExtractor, type CaptionExtractorConfig } from './extractors/caption-extractor';
import {
  ConfidenceScorer,
  type ConfidenceScorerConfig,
  type FallbackDecision,
} from './confidence-scorer';
import { VisualExtractor, type VisualExtractorConfig } from './visual/visual-extractor';
import type { ExtractedRecipe, Ingredient, ConfidenceScore } from './schemas/recipe-schema';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for ExtractionService
 */
export interface ExtractionServiceConfig {
  /** OpenAI API key (required) */
  openaiApiKey: string;

  /** Content service configuration */
  content?: ContentServiceConfig;

  /** Caption extractor configuration */
  captionExtractor?: Partial<Omit<CaptionExtractorConfig, 'apiKey'>>;

  /** Confidence scorer configuration */
  confidenceScorer?: Partial<ConfidenceScorerConfig>;

  /** Visual extractor configuration */
  visualExtractor?: Partial<Omit<VisualExtractorConfig, 'apiKey'>>;

  /** Enable visual fallback when confidence is low (default: true) */
  enableVisualFallback?: boolean;

  /** Confidence threshold for triggering visual fallback (default: 0.8) */
  fallbackThreshold?: number;

  /** Enable verbose logging (default: false) */
  verbose?: boolean;
}

const DEFAULT_CONFIG = {
  enableVisualFallback: true,
  fallbackThreshold: 0.8,
  verbose: false,
};

// ============================================================================
// Result Types
// ============================================================================

/**
 * Full extraction result with metadata
 */
export interface ExtractionResult {
  /** The extracted recipe */
  recipe: ExtractedRecipe;

  /** Source URL that was extracted */
  url: string;

  /** Platform detected from URL */
  platform: string;

  /** Whether visual extraction was used */
  usedVisualFallback: boolean;

  /** Content acquisition metadata */
  content: {
    provider: string;
    hasCaption: boolean;
    hasTranscript: boolean;
  };

  /** Confidence assessment */
  confidence: {
    initial: number;
    final: number;
    fallbackDecision: FallbackDecision | null;
  };

  /** Timing information */
  timing: {
    contentAcquisitionMs: number;
    captionExtractionMs: number;
    visualExtractionMs: number | null;
    totalMs: number;
  };
}

// ============================================================================
// ExtractionService Implementation
// ============================================================================

/**
 * Orchestrates the complete recipe extraction pipeline
 *
 * Pipeline flow:
 * 1. Content Acquisition: Get caption/transcript via ContentService
 * 2. AI Extraction: Extract recipe using CaptionExtractor with GPT-4o-mini
 * 3. Confidence Check: Evaluate quality via ConfidenceScorer
 * 4. Visual Fallback: If confidence < threshold, run VisualExtractor
 * 5. Merge: Combine results if visual extraction was used
 *
 * @example
 * ```typescript
 * const service = createExtractionService({
 *   openaiApiKey: process.env.OPENAI_API_KEY,
 *   content: {
 *     supadata: { apiKey: process.env.SUPADATA_API_KEY },
 *   },
 * });
 *
 * const result = await service.extract('https://tiktok.com/@user/video/123');
 * console.log(result.recipe.title);
 * console.log(`Confidence: ${result.confidence.final}`);
 * ```
 */
export class ExtractionService {
  private readonly contentService: ContentService;
  private readonly captionExtractor: CaptionExtractor;
  private readonly confidenceScorer: ConfidenceScorer;
  private readonly visualExtractor: VisualExtractor | null;
  private readonly config: {
    enableVisualFallback: boolean;
    fallbackThreshold: number;
    verbose: boolean;
  };

  constructor(config: ExtractionServiceConfig) {
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API key is required for ExtractionService');
    }

    this.config = {
      enableVisualFallback:
        config.enableVisualFallback ?? DEFAULT_CONFIG.enableVisualFallback,
      fallbackThreshold:
        config.fallbackThreshold ?? DEFAULT_CONFIG.fallbackThreshold,
      verbose: config.verbose ?? DEFAULT_CONFIG.verbose,
    };

    // Initialize ContentService
    this.contentService = new ContentService(config.content || {});

    // Initialize CaptionExtractor
    this.captionExtractor = new CaptionExtractor({
      apiKey: config.openaiApiKey,
      ...config.captionExtractor,
    });

    // Initialize ConfidenceScorer
    this.confidenceScorer = new ConfidenceScorer({
      overallThreshold: this.config.fallbackThreshold,
      ...config.confidenceScorer,
    });

    // Initialize VisualExtractor (only if enabled)
    if (this.config.enableVisualFallback) {
      this.visualExtractor = new VisualExtractor({
        apiKey: config.openaiApiKey,
        ...config.visualExtractor,
      });
    } else {
      this.visualExtractor = null;
    }
  }

  /**
   * Extract recipe from a URL
   *
   * @param url - Video or recipe URL to extract from
   * @returns Full extraction result with recipe and metadata
   */
  async extract(url: string): Promise<ExtractionResult> {
    const startTime = Date.now();
    let contentAcquisitionMs = 0;
    let captionExtractionMs = 0;
    let visualExtractionMs: number | null = null;
    let usedVisualFallback = false;
    let fallbackDecision: FallbackDecision | null = null;

    this.log(`Starting extraction for: ${url}`);

    // Step 1: Acquire content
    this.log('Step 1: Acquiring content...');
    const contentStart = Date.now();
    const content = await this.contentService.acquire(url);
    contentAcquisitionMs = Date.now() - contentStart;
    this.log(
      `Content acquired in ${contentAcquisitionMs}ms (provider: ${content.provider})`
    );

    // Step 2: Build extraction text
    const extractionText = this.buildExtractionText(content);
    this.log(`Extraction text: ${extractionText.length} characters`);

    // Step 3: Extract recipe via caption extractor
    this.log('Step 2: Extracting recipe via AI...');
    const extractionStart = Date.now();
    let recipe = await this.captionExtractor.extract(extractionText);
    captionExtractionMs = Date.now() - extractionStart;
    this.log(
      `AI extraction complete in ${captionExtractionMs}ms (confidence: ${recipe.confidence.overall})`
    );

    const initialConfidence = recipe.confidence.overall;

    // Step 4: Evaluate confidence and decide on fallback
    this.log('Step 3: Evaluating confidence...');
    fallbackDecision = this.confidenceScorer.evaluate(recipe.confidence);
    this.log(`Fallback decision: ${fallbackDecision.shouldFallback ? 'YES' : 'NO'}`);
    if (fallbackDecision.shouldFallback) {
      this.log(`Reason: ${fallbackDecision.reason}`);
    }

    // Step 5: Visual fallback if needed
    if (
      fallbackDecision.shouldFallback &&
      this.config.enableVisualFallback &&
      this.visualExtractor &&
      this.shouldAttemptVisualExtraction(content)
    ) {
      this.log('Step 4: Running visual extraction fallback...');
      const visualStart = Date.now();

      try {
        const visualResult = await this.visualExtractor.extract(url);
        visualExtractionMs = Date.now() - visualStart;
        usedVisualFallback = true;

        this.log(
          `Visual extraction complete in ${visualExtractionMs}ms (usable: ${visualResult.isUsable})`
        );

        if (visualResult.isUsable) {
          // Merge visual results with caption extraction
          const visualRecipe = this.visualExtractor.toExtractedRecipe(visualResult);
          recipe = this.mergeRecipes(recipe, visualRecipe);
          this.log(
            `Merged results (new confidence: ${recipe.confidence.overall})`
          );
        }
      } catch (error) {
        visualExtractionMs = Date.now() - visualStart;
        this.log(
          `Visual extraction failed after ${visualExtractionMs}ms: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        // Continue with caption-only result
      }
    }

    const totalMs = Date.now() - startTime;
    this.log(`Extraction complete in ${totalMs}ms`);

    return {
      recipe,
      url,
      platform: content.platform,
      usedVisualFallback,
      content: {
        provider: content.provider,
        hasCaption: Boolean(content.caption),
        hasTranscript: Boolean(content.transcript),
      },
      confidence: {
        initial: initialConfidence,
        final: recipe.confidence.overall,
        fallbackDecision,
      },
      timing: {
        contentAcquisitionMs,
        captionExtractionMs,
        visualExtractionMs,
        totalMs,
      },
    };
  }

  /**
   * Build extraction text from acquired content
   */
  private buildExtractionText(content: AcquiredContent): string {
    const parts: string[] = [];

    // Add title if available
    if (content.title) {
      parts.push(`Title: ${content.title}`);
    }

    // Add caption
    if (content.caption) {
      parts.push(`Caption: ${content.caption}`);
    }

    // Add transcript
    if (content.transcript) {
      parts.push(`Transcript: ${content.transcript}`);
    }

    // Add description if different from caption
    if (content.description && content.description !== content.caption) {
      parts.push(`Description: ${content.description}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Check if visual extraction should be attempted
   */
  private shouldAttemptVisualExtraction(content: AcquiredContent): boolean {
    // Only attempt visual extraction for video content
    return content.contentType === 'video';
  }

  /**
   * Merge two recipe extractions, preferring higher confidence values
   *
   * Strategy:
   * - Title: prefer non-empty, higher confidence
   * - Ingredients: dedupe and combine
   * - Instructions: merge without duplicates
   * - Confidence: take max of each field
   */
  private mergeRecipes(
    primary: ExtractedRecipe,
    secondary: ExtractedRecipe
  ): ExtractedRecipe {
    // Merge title
    const title = this.mergeTitle(primary, secondary);

    // Merge description
    const description = primary.description || secondary.description;

    // Merge ingredients (dedupe)
    const ingredients = this.mergeIngredients(
      primary.ingredients,
      secondary.ingredients
    );

    // Merge instructions (avoid duplicates)
    const instructions = this.mergeInstructions(
      primary.instructions,
      secondary.instructions
    );

    // Merge confidence (take max)
    const confidence = this.mergeConfidence(
      primary.confidence,
      secondary.confidence
    );

    // Merge time fields
    const prepTime = primary.prepTime || secondary.prepTime;
    const cookTime = primary.cookTime || secondary.cookTime;
    const totalTime = primary.totalTime || secondary.totalTime;
    const servings = primary.servings || secondary.servings;

    return {
      title,
      description,
      ingredients,
      instructions,
      servings,
      prepTime,
      cookTime,
      totalTime,
      confidence,
      source: 'combined',
      extractionTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Merge titles preferring higher confidence
   */
  private mergeTitle(
    primary: ExtractedRecipe,
    secondary: ExtractedRecipe
  ): string {
    // If primary has good title confidence, use it
    if (
      primary.title &&
      primary.title !== 'Unknown' &&
      primary.confidence.title >= 0.6
    ) {
      return primary.title;
    }

    // If secondary has better title
    if (
      secondary.title &&
      secondary.title !== 'Unknown' &&
      secondary.confidence.title > primary.confidence.title
    ) {
      return secondary.title;
    }

    // Fall back to primary
    return primary.title || secondary.title || 'Unknown Recipe';
  }

  /**
   * Merge and deduplicate ingredients
   */
  private mergeIngredients(
    primary: Ingredient[],
    secondary: Ingredient[]
  ): Ingredient[] {
    const seen = new Set<string>();
    const merged: Ingredient[] = [];

    // Add primary ingredients first
    for (const ingredient of primary) {
      const key = this.normalizeIngredientKey(ingredient);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(ingredient);
      }
    }

    // Add secondary ingredients not already present
    for (const ingredient of secondary) {
      const key = this.normalizeIngredientKey(ingredient);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(ingredient);
      }
    }

    return merged;
  }

  /**
   * Normalize ingredient for deduplication
   */
  private normalizeIngredientKey(ingredient: Ingredient): string {
    return (ingredient.name || ingredient.raw || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Merge instructions avoiding duplicates
   */
  private mergeInstructions(
    primary: string[],
    secondary: string[]
  ): string[] {
    const seen = new Set<string>();
    const merged: string[] = [];

    // Add primary instructions
    for (const instruction of primary) {
      const key = instruction.toLowerCase().trim();
      if (!seen.has(key) && instruction.trim()) {
        seen.add(key);
        merged.push(instruction);
      }
    }

    // Add secondary instructions not already covered
    for (const instruction of secondary) {
      const key = instruction.toLowerCase().trim();
      if (!seen.has(key) && instruction.trim()) {
        // Check for similar instructions
        const isSimilar = [...seen].some(
          (existing) =>
            this.calculateSimilarity(existing, key) > 0.7
        );

        if (!isSimilar) {
          seen.add(key);
          merged.push(instruction);
        }
      }
    }

    return merged;
  }

  /**
   * Simple similarity check for instructions
   */
  private calculateSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.split(' '));
    const wordsB = new Set(b.split(' '));
    const intersection = [...wordsA].filter((w) => wordsB.has(w));
    return intersection.length / Math.max(wordsA.size, wordsB.size);
  }

  /**
   * Merge confidence scores (take max of each field)
   */
  private mergeConfidence(
    primary: ConfidenceScore,
    secondary: ConfidenceScore
  ): ConfidenceScore {
    return {
      overall: Math.max(primary.overall, secondary.overall),
      title: Math.max(primary.title, secondary.title),
      ingredients: Math.max(primary.ingredients, secondary.ingredients),
      instructions: Math.max(primary.instructions, secondary.instructions),
      hasQuantities: primary.hasQuantities || secondary.hasQuantities,
      hasSteps: primary.hasSteps || secondary.hasSteps,
      isCompleteRecipe: primary.isCompleteRecipe || secondary.isCompleteRecipe,
      reasoning: `Merged from caption (${(primary.overall * 100).toFixed(0)}%) and visual (${(secondary.overall * 100).toFixed(0)}%) extraction`,
    };
  }

  /**
   * Log message if verbose mode enabled
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[ExtractionService] ${message}`);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an ExtractionService with configuration
 *
 * @param config - Configuration including required OpenAI API key
 * @returns Configured ExtractionService instance
 */
export function createExtractionService(
  config: ExtractionServiceConfig
): ExtractionService {
  return new ExtractionService(config);
}

/**
 * Create an ExtractionService using environment variables
 *
 * Required env vars:
 * - OPENAI_API_KEY
 *
 * Optional env vars:
 * - SUPADATA_API_KEY
 * - APIFY_TOKEN
 */
export function createExtractionServiceFromEnv(
  overrides?: Partial<ExtractionServiceConfig>
): ExtractionService {
  return new ExtractionService({
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    content: {
      supadata: {
        apiKey: process.env.SUPADATA_API_KEY || '',
        enabled: Boolean(process.env.SUPADATA_API_KEY),
      },
      apify: {
        apiToken: process.env.APIFY_TOKEN || '',
        enabled: Boolean(process.env.APIFY_TOKEN),
      },
    },
    ...overrides,
  });
}
