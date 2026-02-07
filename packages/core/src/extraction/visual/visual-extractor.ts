import {
  FrameExtractor,
  createFrameExtractor,
  type FrameExtractorConfig,
  type FrameExtractionResult,
  FrameExtractionError,
} from './frame-extractor';
import {
  FrameAnalyzer,
  createFrameAnalyzer,
  type FrameAnalyzerConfig,
  type FrameAnalysisResult,
} from './frame-analyzer';
import {
  FrameConsolidator,
  createFrameConsolidator,
  type FrameConsolidatorConfig,
  type ConsolidatedVisualExtraction,
} from './frame-consolidator';
import type { ExtractedRecipe, ConfidenceScore } from '../schemas/recipe-schema';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for VisualExtractor
 */
export interface VisualExtractorConfig {
  /** OpenAI API key (required) */
  apiKey: string;

  /** Frame extractor configuration */
  frameExtractor?: Partial<FrameExtractorConfig>;

  /** Frame analyzer configuration */
  frameAnalyzer?: Partial<Omit<FrameAnalyzerConfig, 'apiKey'>>;

  /** Frame consolidator configuration */
  frameConsolidator?: Partial<Omit<FrameConsolidatorConfig, 'apiKey'>>;

  /** Enable verbose logging (default: false) */
  verbose?: boolean;
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of visual extraction pipeline
 */
export interface VisualExtractionResult {
  /** Consolidated extraction */
  extraction: ConsolidatedVisualExtraction;

  /** Number of frames extracted */
  framesExtracted: number;

  /** Number of frames successfully analyzed */
  framesAnalyzed: number;

  /** Total duration of video */
  videoDuration: number;

  /** Whether extraction was successful enough to use */
  isUsable: boolean;
}

// ============================================================================
// VisualExtractor Implementation
// ============================================================================

/**
 * Orchestrates the complete visual extraction pipeline
 *
 * Pipeline:
 * 1. Extract frames from video (FrameExtractor)
 * 2. Analyze frames with Vision API in parallel (FrameAnalyzer)
 * 3. Consolidate analyses into cohesive extraction (FrameConsolidator)
 *
 * @example
 * ```typescript
 * const extractor = createVisualExtractor({
 *   apiKey: process.env.OPENAI_API_KEY,
 * });
 *
 * const result = await extractor.extract('https://tiktok.com/...');
 * if (result.isUsable) {
 *   console.log(`Found: ${result.extraction.dishName}`);
 *   console.log(`Ingredients: ${result.extraction.ingredients.join(', ')}`);
 * }
 * ```
 */
export class VisualExtractor {
  private readonly frameExtractor: FrameExtractor;
  private readonly frameAnalyzer: FrameAnalyzer;
  private readonly frameConsolidator: FrameConsolidator;
  private readonly verbose: boolean;

  constructor(config: VisualExtractorConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required for VisualExtractor');
    }

    this.verbose = config.verbose ?? false;

    // Initialize sub-components
    this.frameExtractor = createFrameExtractor(config.frameExtractor);

    this.frameAnalyzer = createFrameAnalyzer({
      apiKey: config.apiKey,
      ...config.frameAnalyzer,
    });

    this.frameConsolidator = createFrameConsolidator({
      apiKey: config.apiKey,
      ...config.frameConsolidator,
    });
  }

  /**
   * Extract recipe information from images directly (for photo/slideshow content)
   *
   * Skips FrameExtractor entirely and analyzes provided image URLs directly.
   * More efficient for slideshows/carousels where images are already available.
   *
   * @param imageUrls - Array of image URLs to analyze
   * @returns Visual extraction result
   */
  async extractFromImages(imageUrls: string[]): Promise<VisualExtractionResult> {
    this.log(`Starting image-based extraction (${imageUrls.length} images)...`);

    if (imageUrls.length === 0) {
      throw new Error('No image URLs provided for visual extraction');
    }

    // Step 1: Analyze images directly (skip FrameExtractor)
    this.log('Step 1: Analyzing images with Vision API...');
    let analysisResult: FrameAnalysisResult;

    try {
      analysisResult = await this.frameAnalyzer.analyzeImageUrls(imageUrls);
      this.log(
        `Analyzed ${analysisResult.successCount}/${imageUrls.length} images successfully`
      );

      if (analysisResult.failedFrames.length > 0) {
        this.log(`Failed images: [${analysisResult.failedFrames.join(', ')}]`);
      }
    } catch (error) {
      throw new Error(
        `Image analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Step 2: Consolidate analyses
    this.log('Step 2: Consolidating image analyses...');
    let consolidation: ConsolidatedVisualExtraction;

    try {
      consolidation = await this.frameConsolidator.consolidate(
        analysisResult.analyses
      );
      this.log(
        `Consolidation complete: ${consolidation.dishName} (confidence: ${(consolidation.confidence * 100).toFixed(0)}%)`
      );
    } catch (error) {
      throw new Error(
        `Consolidation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Determine if result is usable
    const isUsable = this.isResultUsable(consolidation, analysisResult);
    this.log(`Image extraction ${isUsable ? 'successful' : 'insufficient'}`);

    return {
      extraction: consolidation,
      framesExtracted: imageUrls.length, // Images provided
      framesAnalyzed: analysisResult.successCount,
      videoDuration: 0, // Not applicable for images
      isUsable,
    };
  }

  /**
   * Extract recipe information from video using visual analysis
   *
   * @param url - Video URL to analyze
   * @returns Visual extraction result
   */
  async extract(url: string): Promise<VisualExtractionResult> {
    this.log('Starting visual extraction pipeline...');

    // Step 1: Extract frames
    this.log('Step 1: Extracting frames from video...');
    let frameResult: FrameExtractionResult;

    try {
      frameResult = await this.frameExtractor.extract(url);
      this.log(
        `Extracted ${frameResult.frames.length} frames (duration: ${frameResult.duration}s)`
      );
    } catch (error) {
      if (error instanceof FrameExtractionError) {
        throw error;
      }
      throw new Error(
        `Frame extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Step 2: Analyze frames in parallel
    this.log('Step 2: Analyzing frames with Vision API...');
    let analysisResult: FrameAnalysisResult;

    try {
      analysisResult = await this.frameAnalyzer.analyzeAll(frameResult.frames);
      this.log(
        `Analyzed ${analysisResult.successCount}/${frameResult.frames.length} frames successfully`
      );

      if (analysisResult.failedFrames.length > 0) {
        this.log(`Failed frames: [${analysisResult.failedFrames.join(', ')}]`);
      }
    } catch (error) {
      throw new Error(
        `Frame analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Step 3: Consolidate analyses
    this.log('Step 3: Consolidating frame analyses...');
    let consolidation: ConsolidatedVisualExtraction;

    try {
      consolidation = await this.frameConsolidator.consolidate(
        analysisResult.analyses
      );
      this.log(
        `Consolidation complete: ${consolidation.dishName} (confidence: ${(consolidation.confidence * 100).toFixed(0)}%)`
      );
    } catch (error) {
      throw new Error(
        `Consolidation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Determine if result is usable
    const isUsable = this.isResultUsable(consolidation, analysisResult);
    this.log(`Visual extraction ${isUsable ? 'successful' : 'insufficient'}`);

    return {
      extraction: consolidation,
      framesExtracted: frameResult.frames.length,
      framesAnalyzed: analysisResult.successCount,
      videoDuration: frameResult.duration,
      isUsable,
    };
  }

  /**
   * Convert visual extraction to ExtractedRecipe format
   *
   * This allows visual extraction results to be merged with
   * caption/transcript extractions using a common format.
   */
  toExtractedRecipe(result: VisualExtractionResult): ExtractedRecipe {
    const { extraction } = result;

    return {
      title: extraction.dishName,
      description: extraction.narrative,
      ingredients: extraction.ingredients.map((raw) => ({
        raw,
        quantity: null,
        unit: null,
        name: raw,
        preparation: null,
        notes: null,
      })),
      instructions: extraction.cookingSteps,
      servings: null,
      prepTime: null,
      cookTime: null,
      totalTime: null,
      confidence: this.buildConfidenceScore(extraction, result),
      source: 'visual',
      extractionTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Build confidence score from visual extraction
   */
  private buildConfidenceScore(
    extraction: ConsolidatedVisualExtraction,
    result: VisualExtractionResult
  ): ConfidenceScore {
    const hasGoodTitle =
      extraction.dishName !== 'Unknown' &&
      extraction.dishName !== 'Cooking Recipe';
    const hasIngredients = extraction.ingredients.length >= 2;
    const hasSteps = extraction.cookingSteps.length >= 2;

    return {
      overall: extraction.confidence,
      title: hasGoodTitle ? 0.8 : 0.3,
      ingredients: Math.min(extraction.ingredients.length / 5, 1),
      instructions: Math.min(extraction.cookingSteps.length / 4, 1),
      hasQuantities: false, // Visual extraction rarely captures precise quantities
      hasSteps: hasSteps,
      isCompleteRecipe: hasIngredients && hasSteps,
      reasoning: `Visual extraction from ${result.framesAnalyzed} frames. ${extraction.ingredients.length} ingredients and ${extraction.cookingSteps.length} steps identified.`,
    };
  }

  /**
   * Determine if result is usable
   */
  private isResultUsable(
    extraction: ConsolidatedVisualExtraction,
    analysisResult: FrameAnalysisResult
  ): boolean {
    // Need at least 2 successfully analyzed frames
    if (analysisResult.successCount < 2) {
      return false;
    }

    // Need either ingredients or cooking steps
    if (
      extraction.ingredients.length === 0 &&
      extraction.cookingSteps.length === 0
    ) {
      return false;
    }

    // Confidence should be reasonable
    return extraction.confidence >= 0.3;
  }

  /**
   * Log message if verbose mode enabled
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(`[VisualExtractor] ${message}`);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a VisualExtractor with configuration
 *
 * @param config - Configuration including required API key
 * @returns Configured VisualExtractor instance
 */
export function createVisualExtractor(
  config: VisualExtractorConfig
): VisualExtractor {
  return new VisualExtractor(config);
}
