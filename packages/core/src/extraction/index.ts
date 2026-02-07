// ============================================================================
// Recipe Extraction Module
// ============================================================================

// Schemas
export {
  IngredientSchema,
  ConfidenceScoreSchema,
  ExtractionSourceSchema,
  ExtractedRecipeSchema,
  AIExtractionResponseSchema,
  EMPTY_EXTRACTION_RESPONSE,
  CONFIDENCE_THRESHOLD,
  type Ingredient,
  type ConfidenceScore,
  type ExtractionSource,
  type ExtractedRecipe,
  type AIExtractionResponse,
} from './schemas/recipe-schema';

// Extractors
export {
  CaptionExtractor,
  createCaptionExtractor,
  type CaptionExtractorConfig,
} from './extractors/caption-extractor';

// Confidence Scoring
export {
  ConfidenceScorer,
  createConfidenceScorer,
  type ConfidenceScorerConfig,
  type FallbackDecision,
} from './confidence-scorer';

// Visual Extraction
export {
  // Frame Extractor
  FrameExtractor,
  createFrameExtractor,
  FrameExtractionError,
  type FrameExtractorConfig,
  type FrameExtractionResult,
  // Frame Analyzer
  FrameAnalyzer,
  createFrameAnalyzer,
  type FrameAnalyzerConfig,
  type FrameAnalysis,
  type FrameAnalysisResult,
  type CookingStage,
  // Frame Consolidator
  FrameConsolidator,
  createFrameConsolidator,
  type FrameConsolidatorConfig,
  type ConsolidatedVisualExtraction,
  // Visual Extractor (orchestrator)
  VisualExtractor,
  createVisualExtractor,
  type VisualExtractorConfig,
  type VisualExtractionResult,
} from './visual';

// Extraction Service (Main Orchestrator)
export {
  ExtractionService,
  createExtractionService,
  createExtractionServiceFromEnv,
  type ExtractionServiceConfig,
  type ExtractionResult,
} from './extraction-service';
