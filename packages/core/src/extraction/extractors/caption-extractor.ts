import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import {
  AIExtractionResponseSchema,
  ExtractedRecipeSchema,
  EMPTY_EXTRACTION_RESPONSE,
  CONFIDENCE_THRESHOLD,
  type AIExtractionResponse,
  type ExtractedRecipe,
} from '../schemas/recipe-schema';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for CaptionExtractor
 */
export interface CaptionExtractorConfig {
  /** OpenAI API key */
  apiKey: string;

  /** Model to use (defaults to gpt-4o-mini) */
  model?: string;

  /** Temperature for generation (defaults to 0.1 for consistency) */
  temperature?: number;

  /** Confidence threshold for "complete" extraction (defaults to 0.7) */
  confidenceThreshold?: number;

  /** Max tokens for response */
  maxTokens?: number;
}

const DEFAULT_CONFIG = {
  model: 'gpt-4o-mini',
  temperature: 0.1,
  confidenceThreshold: CONFIDENCE_THRESHOLD,
  maxTokens: 2000,
};

// ============================================================================
// System Prompt
// ============================================================================

/**
 * System prompt for recipe extraction
 *
 * Engineered following prompt-engineering-patterns:
 * - Clear task definition
 * - Explicit rules
 * - Confidence scoring guidance
 * - Edge case handling
 */
const SYSTEM_PROMPT = `You are a recipe extraction expert. Your task is to extract structured recipe data from video captions and transcripts.

## EXTRACTION RULES

### Title
- Extract the dish name mentioned in the content
- If multiple dishes mentioned, use the primary/main one
- If no clear dish name, infer from ingredients (e.g., "Pasta with Garlic")

### Ingredients
- Extract ALL ingredients mentioned with quantities when available
- Parse into structured format: quantity, unit, name, preparation
- Common units: cups, tbsp, tsp, oz, lb, g, kg, ml, L, cloves, slices
- If quantity unclear, set quantity and unit to null
- Include preparation notes (diced, minced, melted, etc.)

**DEDUPLICATION RULES (CRITICAL)**:
- NEVER list the same ingredient twice
- If an ingredient is mentioned multiple times (e.g., "chicken" in title, then "2 lb chicken thighs" in recipe), only include the MOST SPECIFIC version with quantity
- Merge duplicates: "chicken thighs" + "2 lb boneless skinless chicken thighs" → keep only "2 lb boneless skinless chicken thighs"
- Bad: ["chicken thighs", "2 lb boneless skinless chicken thighs"] ← WRONG, duplicate
- Good: ["2 lb boneless skinless chicken thighs"] ← CORRECT, deduplicated

### Instructions  
- Extract cooking steps in logical order
- Each step should be a complete action
- Include times, temperatures, and techniques mentioned
- Merge related actions into single steps when appropriate

### Confidence Scoring
Rate your extraction quality honestly:

**overall**: 0-1 score for complete extraction quality
- 0.9-1.0: Complete recipe with all ingredients, quantities, and clear steps
- 0.7-0.9: Good extraction but missing some quantities or minor steps
- 0.5-0.7: Partial recipe - has some content but notable gaps
- 0.3-0.5: Minimal content - just a few ingredients or vague instructions
- 0-0.3: Essentially no recipe content

**isCompleteRecipe**: Can someone actually make this dish from your extraction?
- true: Yes - has enough ingredients and instructions to follow
- false: No - too incomplete to be useful

**reasoning**: Explain your confidence assessment in 1-2 sentences

## CRITICAL RULES
1. Only extract ACTUAL recipe content - not references like "recipe in bio"
2. Don't hallucinate or add information not present in the source
3. If content mentions food but has no recipe, return empty with low confidence
4. Be conservative - it's better to return low confidence than fabricate content
5. NEVER include duplicate ingredients - each ingredient should appear exactly ONCE

## OUTPUT FORMAT
Return structured JSON matching the provided schema exactly.
All fields are required - use null for unknown optional values.`;

// ============================================================================
// CaptionExtractor Implementation
// ============================================================================

/**
 * Extracts recipes from caption/transcript text using GPT-4o-mini
 *
 * Uses OpenAI's structured outputs with Zod schema validation
 * to guarantee valid JSON response format.
 *
 * @example
 * ```typescript
 * const extractor = new CaptionExtractor({ apiKey: process.env.OPENAI_API_KEY });
 * const recipe = await extractor.extract(caption);
 *
 * if (extractor.isConfident(recipe)) {
 *   // Use the extracted recipe
 * } else {
 *   // Fall back to transcript/visual extraction
 * }
 * ```
 */
export class CaptionExtractor {
  private readonly client: OpenAI;
  private readonly config: Required<CaptionExtractorConfig>;

  constructor(config: CaptionExtractorConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
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
   * Extract recipe from caption/transcript text
   *
   * @param text - Caption or transcript text to extract from
   * @returns Extracted recipe with confidence metrics
   */
  async extract(text: string): Promise<ExtractedRecipe> {
    try {
      const response = await this.client.beta.chat.completions.parse({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: this.buildUserPrompt(text),
          },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        response_format: zodResponseFormat(AIExtractionResponseSchema, 'recipe'),
      });

      const message = response.choices[0]?.message;

      // Handle refusal
      if (message?.refusal) {
        console.warn('OpenAI refused to process content:', message.refusal);
        return this.createEmptyRecipe('API refusal: ' + message.refusal);
      }

      // Handle missing parsed content
      if (!message?.parsed) {
        return this.createEmptyRecipe('No parsed content in response');
      }

      // Convert AI response to full ExtractedRecipe
      return this.toExtractedRecipe(message.parsed);
    } catch (error) {
      // Re-throw API errors for caller to handle
      throw error;
    }
  }

  /**
   * Check if extraction meets confidence threshold
   *
   * @param recipe - Extracted recipe to check
   * @returns true if recipe meets confidence threshold
   */
  isConfident(recipe: ExtractedRecipe): boolean {
    return (
      recipe.confidence.overall >= this.config.confidenceThreshold &&
      recipe.confidence.isCompleteRecipe
    );
  }

  /**
   * Build user prompt with text content
   */
  private buildUserPrompt(text: string): string {
    if (!text || text.trim().length === 0) {
      return 'Extract recipe from the following content:\n\n[Empty content]';
    }

    return `Extract recipe from the following content:\n\n${text}`;
  }

  /**
   * Convert AI response to full ExtractedRecipe
   */
  private toExtractedRecipe(aiResponse: AIExtractionResponse): ExtractedRecipe {
    return {
      ...aiResponse,
      totalTime: this.calculateTotalTime(aiResponse.prepTime, aiResponse.cookTime),
      source: 'caption',
      extractionTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate total time from prep and cook times
   */
  private calculateTotalTime(
    prepTime: string | null,
    cookTime: string | null
  ): string | null {
    if (!prepTime && !cookTime) return null;

    const prepMinutes = this.parseTimeToMinutes(prepTime);
    const cookMinutes = this.parseTimeToMinutes(cookTime);

    if (prepMinutes === null && cookMinutes === null) return null;

    const total = (prepMinutes || 0) + (cookMinutes || 0);
    return `${total} min`;
  }

  /**
   * Parse time string to minutes
   */
  private parseTimeToMinutes(time: string | null): number | null {
    if (!time) return null;

    // Try to extract number from string like "15 min" or "1 hour"
    const minMatch = time.match(/(\d+)\s*min/i);
    if (minMatch) return parseInt(minMatch[1], 10);

    const hourMatch = time.match(/(\d+)\s*h(?:our)?/i);
    if (hourMatch) return parseInt(hourMatch[1], 10) * 60;

    const numMatch = time.match(/(\d+)/);
    if (numMatch) return parseInt(numMatch[1], 10);

    return null;
  }

  /**
   * Create empty recipe with reason
   */
  private createEmptyRecipe(reason: string): ExtractedRecipe {
    return {
      ...EMPTY_EXTRACTION_RESPONSE,
      confidence: {
        ...EMPTY_EXTRACTION_RESPONSE.confidence,
        reasoning: reason,
      },
      totalTime: null,
      source: 'caption',
      extractionTimestamp: new Date().toISOString(),
    };
  }
}

/**
 * Create a CaptionExtractor with environment-based configuration
 */
export function createCaptionExtractor(
  overrides?: Partial<CaptionExtractorConfig>
): CaptionExtractor {
  return new CaptionExtractor({
    apiKey: process.env.OPENAI_API_KEY || '',
    ...overrides,
  });
}
