import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock OpenAI module before imports
const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      embeddings = {
        create: mockCreate,
      };

      constructor() {}
    },
  };
});

import {
  getEmbedding,
  cosineSimilarity,
  assertTextSimilarity,
  assertRecipeSimilarity,
  SIMILARITY_THRESHOLDS,
} from './semantic-similarity';
import type { ExtractedRecipe } from '../../packages/core/src/extraction/schemas/recipe-schema';

describe('Semantic Similarity Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      const vec = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
    });

    it('returns 0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0, 5);
    });

    it('returns -1 for opposite vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [-1, -2, -3];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(-1, 5);
    });

    it('handles normalized vectors correctly', () => {
      const vec1 = [0.6, 0.8, 0];
      const vec2 = [0.8, 0.6, 0];
      // Dot product: 0.6*0.8 + 0.8*0.6 = 0.96
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0.96, 5);
    });

    it('throws for mismatched dimensions', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [1, 2];
      expect(() => cosineSimilarity(vec1, vec2)).toThrow('dimension');
    });

    it('handles zero vectors gracefully', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 2, 3];
      // Division by zero case - returns 0
      expect(cosineSimilarity(vec1, vec2)).toBe(0);
    });
  });

  describe('getEmbedding', () => {
    it('returns embedding from OpenAI API', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4, 0.5];

      mockCreate.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }],
      });

      const result = await getEmbedding('test text');

      expect(result).toEqual(mockEmbedding);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'text-embedding-3-small',
          input: 'test text',
        })
      );
    });

    it('uses text-embedding-3-small model', async () => {
      mockCreate.mockResolvedValueOnce({
        data: [{ embedding: [0.1] }],
      });

      await getEmbedding('test');

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'text-embedding-3-small',
        })
      );
    });

    it('handles empty string', async () => {
      mockCreate.mockResolvedValueOnce({
        data: [{ embedding: [0.0, 0.0, 0.0] }],
      });

      const result = await getEmbedding('');

      expect(result).toHaveLength(3);
    });

    it('throws on API error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API error'));

      await expect(getEmbedding('test')).rejects.toThrow('API error');
    });
  });

  describe('assertTextSimilarity', () => {
    it('passes for semantically similar texts', async () => {
      // Mock embeddings that are similar
      mockCreate
        .mockResolvedValueOnce({
          data: [{ embedding: [0.9, 0.1, 0.0] }],
        })
        .mockResolvedValueOnce({
          data: [{ embedding: [0.85, 0.15, 0.0] }],
        });

      await expect(
        assertTextSimilarity('chocolate chip cookies', 'chocolate chips cookies', 0.9)
      ).resolves.not.toThrow();
    });

    it('fails for dissimilar texts', async () => {
      // Mock embeddings that are dissimilar
      mockCreate
        .mockResolvedValueOnce({
          data: [{ embedding: [1, 0, 0] }],
        })
        .mockResolvedValueOnce({
          data: [{ embedding: [0, 1, 0] }],
        });

      await expect(
        assertTextSimilarity('chocolate cookies', 'beef stew', 0.8)
      ).rejects.toThrow();
    });

    it('returns similarity score', async () => {
      mockCreate
        .mockResolvedValueOnce({
          data: [{ embedding: [0.6, 0.8, 0] }],
        })
        .mockResolvedValueOnce({
          data: [{ embedding: [0.8, 0.6, 0] }],
        });

      const result = await assertTextSimilarity('text1', 'text2', 0.9);
      expect(result.similarity).toBeCloseTo(0.96, 2);
    });
  });

  describe('assertRecipeSimilarity', () => {
    const createRecipe = (overrides: Partial<ExtractedRecipe> = {}): ExtractedRecipe => ({
      title: 'Chocolate Chip Cookies',
      description: 'Classic cookies',
      ingredients: [
        {
          raw: '2 cups flour',
          quantity: 2,
          unit: 'cups',
          name: 'flour',
          preparation: null,
          notes: null,
        },
      ],
      instructions: ['Mix ingredients', 'Bake for 12 minutes'],
      servings: 24,
      prepTime: '15 min',
      cookTime: '12 min',
      totalTime: '27 min',
      confidence: {
        overall: 0.9,
        title: 0.95,
        ingredients: 0.85,
        instructions: 0.9,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Complete recipe',
      },
      source: 'caption',
      extractionTimestamp: new Date().toISOString(),
      ...overrides,
    });

    it('compares titles with semantic similarity', async () => {
      const actual = createRecipe({ title: 'Chocolate Chip Cookies' });
      // Only pass title in expected to limit comparison scope
      const expected = { title: 'Chocolate chips cookies' };

      // Mock high similarity for title only
      mockCreate
        .mockResolvedValueOnce({ data: [{ embedding: [0.9, 0.1] }] }) // actual title
        .mockResolvedValueOnce({ data: [{ embedding: [0.89, 0.11] }] }); // expected title

      const result = await assertRecipeSimilarity(actual, expected);

      expect(result.titleSimilarity).toBeGreaterThan(0.9);
    });

    it('compares ingredients with semantic similarity', async () => {
      const actual = createRecipe({
        ingredients: [
          { raw: '2 cups flour', quantity: 2, unit: 'cups', name: 'all-purpose flour', preparation: null, notes: null },
        ],
      });
      // Only compare ingredients (no title or instructions in expected)
      const expected = {
        ingredients: [
          { raw: '2 cups all-purpose flour', quantity: 2, unit: 'cups', name: 'flour', preparation: null, notes: null },
        ],
      };

      // Mock high similarity for ingredients only
      mockCreate
        .mockResolvedValueOnce({ data: [{ embedding: [0.8, 0.2] }] }) // actual ingredients
        .mockResolvedValueOnce({ data: [{ embedding: [0.79, 0.21] }] }); // expected ingredients

      const result = await assertRecipeSimilarity(actual, expected);

      expect(result.ingredientsSimilarity).toBeGreaterThan(0.9);
    });

    it('compares instructions with semantic similarity', async () => {
      const actual = createRecipe({
        instructions: ['Combine all dry ingredients', 'Bake at 350F for 12 mins'],
      });
      const expected = createRecipe({
        instructions: ['Mix dry ingredients together', 'Bake for 12 minutes at 350 degrees'],
      });

      mockCreate
        .mockResolvedValueOnce({ data: [{ embedding: [0.9, 0.1] }] }) // actual title
        .mockResolvedValueOnce({ data: [{ embedding: [0.9, 0.1] }] }) // expected title
        .mockResolvedValueOnce({ data: [{ embedding: [0.8, 0.2] }] }) // actual ingredients
        .mockResolvedValueOnce({ data: [{ embedding: [0.8, 0.2] }] }) // expected ingredients
        .mockResolvedValueOnce({ data: [{ embedding: [0.7, 0.3] }] }) // actual instructions
        .mockResolvedValueOnce({ data: [{ embedding: [0.69, 0.31] }] }); // expected instructions

      const result = await assertRecipeSimilarity(actual, expected);

      expect(result.instructionsSimilarity).toBeGreaterThan(0.9);
    });

    it('fails if title similarity below threshold', async () => {
      const actual = createRecipe({ title: 'Chocolate Cake' });
      // Only compare title
      const expected = { title: 'Beef Stew' };

      mockCreate
        .mockResolvedValueOnce({ data: [{ embedding: [1, 0] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [0, 1] }] });

      await expect(
        assertRecipeSimilarity(actual, expected, { titleThreshold: 0.8 })
      ).rejects.toThrow('title');
    });

    it('passes with default thresholds for similar recipes', async () => {
      const actual = createRecipe();
      const expected = createRecipe();

      // Mock very high similarity for all components
      mockCreate
        .mockResolvedValueOnce({ data: [{ embedding: [0.9, 0.1] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [0.9, 0.1] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [0.9, 0.1] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [0.9, 0.1] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [0.9, 0.1] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [0.9, 0.1] }] });

      await expect(assertRecipeSimilarity(actual, expected)).resolves.not.toThrow();
    });
  });

  describe('SIMILARITY_THRESHOLDS', () => {
    it('has appropriate default values', () => {
      expect(SIMILARITY_THRESHOLDS.title).toBe(0.85);
      expect(SIMILARITY_THRESHOLDS.ingredients).toBe(0.80);
      expect(SIMILARITY_THRESHOLDS.instructions).toBe(0.75);
    });
  });
});
