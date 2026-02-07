import OpenAI from 'openai';
import type { ExtractedRecipe } from '../../packages/core/src/extraction/schemas/recipe-schema';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default similarity thresholds for recipe components
 *
 * These allow for natural language variations while catching
 * significant extraction differences.
 */
export const SIMILARITY_THRESHOLDS = {
  /** Title similarity threshold (0.85 allows minor variations) */
  title: 0.85,

  /** Ingredients similarity threshold (0.80 allows quantity/unit variations) */
  ingredients: 0.80,

  /** Instructions similarity threshold (0.75 allows rephrasing) */
  instructions: 0.75,
};

/**
 * OpenAI client for embeddings
 *
 * Initialized lazily on first use to avoid requiring API key
 * when only using cosine similarity.
 */
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }
  return openaiClient;
}

// ============================================================================
// Core Similarity Functions
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 *
 * Returns a value between -1 and 1:
 * - 1: Identical direction (identical/very similar texts)
 * - 0: Orthogonal (unrelated texts)
 * - -1: Opposite direction (unlikely for text embeddings)
 *
 * @param vec1 - First embedding vector
 * @param vec2 - Second embedding vector
 * @returns Cosine similarity (-1 to 1)
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error(
      `Vector dimension mismatch: ${vec1.length} vs ${vec2.length}`
    );
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);

  // Handle zero vectors
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Get embedding for text using OpenAI's text-embedding-3-small model
 *
 * This is a fast, cost-effective model suitable for semantic similarity.
 *
 * @param text - Text to embed
 * @returns Embedding vector (1536 dimensions)
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const client = getOpenAIClient();

  const response = await client.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return response.data[0].embedding;
}

// ============================================================================
// Assertion Functions
// ============================================================================

/**
 * Result of a similarity assertion
 */
export interface SimilarityResult {
  /** Calculated similarity score (0-1) */
  similarity: number;
  /** Whether similarity passed threshold */
  passed: boolean;
  /** Actual text compared */
  actual: string;
  /** Expected text compared */
  expected: string;
}

/**
 * Assert that two texts are semantically similar above threshold
 *
 * Uses OpenAI embeddings to compare semantic meaning rather than
 * exact string matching, allowing for natural language variations.
 *
 * @param actual - Actual extracted text
 * @param expected - Expected text
 * @param threshold - Minimum similarity (0-1)
 * @throws Error if similarity below threshold
 */
export async function assertTextSimilarity(
  actual: string,
  expected: string,
  threshold: number = 0.85
): Promise<SimilarityResult> {
  const [actualEmbedding, expectedEmbedding] = await Promise.all([
    getEmbedding(actual),
    getEmbedding(expected),
  ]);

  const similarity = cosineSimilarity(actualEmbedding, expectedEmbedding);
  const passed = similarity >= threshold;

  if (!passed) {
    throw new Error(
      `Semantic similarity ${similarity.toFixed(3)} below threshold ${threshold}\n` +
        `Actual: "${actual}"\n` +
        `Expected: "${expected}"`
    );
  }

  return { similarity, passed, actual, expected };
}

// ============================================================================
// Recipe Comparison
// ============================================================================

/**
 * Options for recipe similarity assertion
 */
export interface RecipeSimilarityOptions {
  /** Title similarity threshold (default: 0.85) */
  titleThreshold?: number;

  /** Ingredients similarity threshold (default: 0.80) */
  ingredientsThreshold?: number;

  /** Instructions similarity threshold (default: 0.75) */
  instructionsThreshold?: number;
}

/**
 * Result of recipe similarity comparison
 */
export interface RecipeSimilarityResult {
  /** Title similarity score */
  titleSimilarity: number;

  /** Ingredients similarity score */
  ingredientsSimilarity: number;

  /** Instructions similarity score */
  instructionsSimilarity: number;

  /** Overall pass/fail status */
  passed: boolean;

  /** Details of any failures */
  failures: string[];
}

/**
 * Assert that two extracted recipes are semantically similar
 *
 * Compares title, ingredients, and instructions separately with
 * component-specific thresholds. This allows for natural language
 * variations in LLM output while catching extraction errors.
 *
 * @param actual - Actual extracted recipe
 * @param expected - Expected recipe values
 * @param options - Per-component thresholds
 * @throws Error if any component below threshold
 */
export async function assertRecipeSimilarity(
  actual: ExtractedRecipe,
  expected: Partial<ExtractedRecipe>,
  options: RecipeSimilarityOptions = {}
): Promise<RecipeSimilarityResult> {
  const {
    titleThreshold = SIMILARITY_THRESHOLDS.title,
    ingredientsThreshold = SIMILARITY_THRESHOLDS.ingredients,
    instructionsThreshold = SIMILARITY_THRESHOLDS.instructions,
  } = options;

  const failures: string[] = [];
  let titleSimilarity = 1;
  let ingredientsSimilarity = 1;
  let instructionsSimilarity = 1;

  // Compare titles
  if (expected.title !== undefined) {
    const [actualTitleEmb, expectedTitleEmb] = await Promise.all([
      getEmbedding(actual.title),
      getEmbedding(expected.title),
    ]);

    titleSimilarity = cosineSimilarity(actualTitleEmb, expectedTitleEmb);

    if (titleSimilarity < titleThreshold) {
      failures.push(
        `title similarity ${titleSimilarity.toFixed(3)} < ${titleThreshold} ` +
          `("${actual.title}" vs "${expected.title}")`
      );
    }
  }

  // Compare ingredients (join into single text for comparison)
  if (expected.ingredients !== undefined && expected.ingredients.length > 0) {
    const actualIngredientsText = actual.ingredients
      .map((i) => i.raw)
      .join('\n');
    const expectedIngredientsText = expected.ingredients
      .map((i) => i.raw)
      .join('\n');

    const [actualIngrEmb, expectedIngrEmb] = await Promise.all([
      getEmbedding(actualIngredientsText),
      getEmbedding(expectedIngredientsText),
    ]);

    ingredientsSimilarity = cosineSimilarity(actualIngrEmb, expectedIngrEmb);

    if (ingredientsSimilarity < ingredientsThreshold) {
      failures.push(
        `ingredients similarity ${ingredientsSimilarity.toFixed(3)} < ${ingredientsThreshold}`
      );
    }
  }

  // Compare instructions (join into single text for comparison)
  if (expected.instructions !== undefined && expected.instructions.length > 0) {
    const actualInstructionsText = actual.instructions.join('\n');
    const expectedInstructionsText = expected.instructions.join('\n');

    const [actualInstrEmb, expectedInstrEmb] = await Promise.all([
      getEmbedding(actualInstructionsText),
      getEmbedding(expectedInstructionsText),
    ]);

    instructionsSimilarity = cosineSimilarity(actualInstrEmb, expectedInstrEmb);

    if (instructionsSimilarity < instructionsThreshold) {
      failures.push(
        `instructions similarity ${instructionsSimilarity.toFixed(3)} < ${instructionsThreshold}`
      );
    }
  }

  const passed = failures.length === 0;

  if (!passed) {
    throw new Error(
      `Recipe similarity assertion failed:\n${failures.map((f) => `  - ${f}`).join('\n')}`
    );
  }

  return {
    titleSimilarity,
    ingredientsSimilarity,
    instructionsSimilarity,
    passed,
    failures,
  };
}

// ============================================================================
// Batch Comparison Utilities
// ============================================================================

/**
 * Compare a single ingredient between actual and expected
 */
export async function compareIngredient(
  actual: string,
  expected: string,
  threshold: number = SIMILARITY_THRESHOLDS.ingredients
): Promise<{ similarity: number; passed: boolean }> {
  const [actualEmb, expectedEmb] = await Promise.all([
    getEmbedding(actual),
    getEmbedding(expected),
  ]);

  const similarity = cosineSimilarity(actualEmb, expectedEmb);

  return {
    similarity,
    passed: similarity >= threshold,
  };
}

/**
 * Find best matching ingredient from a list
 *
 * Useful when ingredient order may vary between actual and expected.
 */
export async function findBestMatch(
  actual: string,
  expectedList: string[]
): Promise<{ bestMatch: string; similarity: number; index: number }> {
  const actualEmb = await getEmbedding(actual);

  const expectedEmbeddings = await Promise.all(
    expectedList.map((e) => getEmbedding(e))
  );

  let bestMatch = expectedList[0];
  let bestSimilarity = -1;
  let bestIndex = 0;

  for (let i = 0; i < expectedList.length; i++) {
    const similarity = cosineSimilarity(actualEmb, expectedEmbeddings[i]);
    if (similarity > bestSimilarity) {
      bestMatch = expectedList[i];
      bestSimilarity = similarity;
      bestIndex = i;
    }
  }

  return { bestMatch, similarity: bestSimilarity, index: bestIndex };
}
