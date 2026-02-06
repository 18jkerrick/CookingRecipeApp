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
