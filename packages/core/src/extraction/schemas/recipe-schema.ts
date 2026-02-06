import { z } from 'zod';

// ============================================================================
// Ingredient Schema
// ============================================================================

/**
 * Structured ingredient with parsed components
 *
 * LLM extracts raw ingredient text and parses into:
 * - quantity (number or null for "to taste")
 * - unit (cups, tbsp, etc. or null)
 * - name (main ingredient name)
 * - preparation (diced, chopped, etc.)
 * - notes (optional notes like "or substitute X")
 */
export const IngredientSchema = z.object({
  /** Original ingredient text as written in source */
  raw: z.string().describe('Original ingredient text from source'),

  /** Numeric quantity (null for "to taste", "pinch", etc.) */
  quantity: z.number().nullable().describe('Numeric quantity or null'),

  /** Unit of measurement (cups, tbsp, oz, etc.) */
  unit: z.string().nullable().describe('Unit of measurement or null'),

  /** Main ingredient name */
  name: z.string().describe('Main ingredient name'),

  /** Preparation method (diced, chopped, melted, etc.) */
  preparation: z.string().nullable().describe('Preparation method or null'),

  /** Additional notes (substitutions, optional, etc.) */
  notes: z.string().nullable().describe('Additional notes or null'),
});

export type Ingredient = z.infer<typeof IngredientSchema>;

// ============================================================================
// Confidence Score Schema
// ============================================================================

/**
 * AI confidence metrics for extraction quality assessment
 *
 * Used to determine if fallback extraction is needed.
 * Overall score < 0.7 typically triggers fallback.
 */
export const ConfidenceScoreSchema = z.object({
  /** Overall confidence (0-1) for the entire extraction */
  overall: z
    .number()
    .min(0)
    .max(1)
    .describe('Overall extraction confidence 0-1'),

  /** Confidence in extracted title accuracy */
  title: z.number().min(0).max(1).describe('Title confidence 0-1'),

  /** Confidence in ingredient completeness */
  ingredients: z
    .number()
    .min(0)
    .max(1)
    .describe('Ingredients completeness confidence 0-1'),

  /** Confidence in instruction completeness */
  instructions: z
    .number()
    .min(0)
    .max(1)
    .describe('Instructions completeness confidence 0-1'),

  /** Whether quantities are provided for most ingredients */
  hasQuantities: z
    .boolean()
    .describe('True if most ingredients have quantities'),

  /** Whether there are sequential steps */
  hasSteps: z.boolean().describe('True if instructions have clear steps'),

  /** LLM assessment: can someone make this dish from extraction? */
  isCompleteRecipe: z
    .boolean()
    .describe('True if recipe is complete enough to follow'),

  /** LLM reasoning for confidence assessment */
  reasoning: z.string().describe('Explanation of confidence assessment'),
});

export type ConfidenceScore = z.infer<typeof ConfidenceScoreSchema>;

// ============================================================================
// Extraction Source Schema
// ============================================================================

/**
 * Source of extracted content
 */
export const ExtractionSourceSchema = z.enum([
  'caption',
  'transcript',
  'visual',
  'combined',
]);

export type ExtractionSource = z.infer<typeof ExtractionSourceSchema>;

// ============================================================================
// Extracted Recipe Schema
// ============================================================================

/**
 * Complete extracted recipe with all metadata
 *
 * This is the final output of the extraction pipeline,
 * combining content from caption/transcript/visual sources.
 */
export const ExtractedRecipeSchema = z.object({
  /** Recipe title/name */
  title: z.string().describe('Recipe title or dish name'),

  /** Brief description of the dish */
  description: z.string().nullable().describe('Recipe description or null'),

  /** Structured ingredients list */
  ingredients: z.array(IngredientSchema).describe('List of ingredients'),

  /** Step-by-step instructions */
  instructions: z.array(z.string()).describe('List of instruction steps'),

  /** Number of servings */
  servings: z.number().nullable().describe('Number of servings or null'),

  /** Preparation time (e.g., "15 min") */
  prepTime: z.string().nullable().describe('Prep time string or null'),

  /** Cooking time (e.g., "30 min") */
  cookTime: z.string().nullable().describe('Cook time string or null'),

  /** Total time (e.g., "45 min") */
  totalTime: z.string().nullable().describe('Total time string or null'),

  /** AI confidence metrics */
  confidence: ConfidenceScoreSchema.describe('Confidence assessment'),

  /** Source of extraction */
  source: ExtractionSourceSchema.describe('Extraction source'),

  /** ISO timestamp of extraction */
  extractionTimestamp: z
    .string()
    .datetime()
    .describe('ISO 8601 extraction timestamp'),
});

export type ExtractedRecipe = z.infer<typeof ExtractedRecipeSchema>;

// ============================================================================
// AI Extraction Response Schema
// ============================================================================

/**
 * Schema for OpenAI structured output response
 *
 * This is the format the LLM returns directly.
 * It omits source and timestamp which are added by the extractor.
 */
export const AIExtractionResponseSchema = z.object({
  /** Recipe title/name */
  title: z.string().describe('Recipe title or dish name'),

  /** Brief description of the dish */
  description: z.string().nullable().describe('Recipe description or null'),

  /** Structured ingredients list */
  ingredients: z.array(IngredientSchema).describe('List of ingredients'),

  /** Step-by-step instructions */
  instructions: z.array(z.string()).describe('List of instruction steps'),

  /** Number of servings */
  servings: z.number().nullable().describe('Number of servings or null'),

  /** Preparation time (e.g., "15 min") */
  prepTime: z.string().nullable().describe('Prep time string or null'),

  /** Cooking time (e.g., "30 min") */
  cookTime: z.string().nullable().describe('Cook time string or null'),

  /** AI confidence metrics */
  confidence: ConfidenceScoreSchema.describe('Confidence assessment'),
});

export type AIExtractionResponse = z.infer<typeof AIExtractionResponseSchema>;

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default empty extraction response for when no recipe is found
 */
export const EMPTY_EXTRACTION_RESPONSE: AIExtractionResponse = {
  title: '',
  description: null,
  ingredients: [],
  instructions: [],
  servings: null,
  prepTime: null,
  cookTime: null,
  confidence: {
    overall: 0,
    title: 0,
    ingredients: 0,
    instructions: 0,
    hasQuantities: false,
    hasSteps: false,
    isCompleteRecipe: false,
    reasoning: 'No recipe content found in source',
  },
};

/**
 * Confidence threshold for complete recipe
 *
 * If overall confidence is below this, consider fallback to next source
 */
export const CONFIDENCE_THRESHOLD = 0.7;
