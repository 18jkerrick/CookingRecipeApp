import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ExtractedRecipe } from '../../../../packages/core/src/extraction/schemas/recipe-schema';

// Mock OpenAI module
const mockParse = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      beta = {
        chat: {
          completions: {
            parse: mockParse,
          },
        },
      };

      constructor() {}
    },
  };
});

// Import after mock is set up
import { CaptionExtractor } from '../../../../packages/core/src/extraction/extractors/caption-extractor';

describe('CaptionExtractor', () => {
  let extractor: CaptionExtractor;

  beforeEach(() => {
    vi.clearAllMocks();
    extractor = new CaptionExtractor({ apiKey: 'test-api-key' });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('extract', () => {
    it('extracts recipe from caption using GPT-4o-mini', async () => {
      const mockResponse = {
        title: 'Garlic Butter Shrimp',
        description: 'Quick and easy shrimp dish',
        ingredients: [
          {
            raw: '1 lb shrimp, peeled',
            quantity: 1,
            unit: 'lb',
            name: 'shrimp',
            preparation: 'peeled',
            notes: null,
          },
          {
            raw: '4 cloves garlic, minced',
            quantity: 4,
            unit: 'cloves',
            name: 'garlic',
            preparation: 'minced',
            notes: null,
          },
        ],
        instructions: ['Melt butter in pan', 'Add garlic', 'Cook shrimp 3 min per side'],
        servings: 4,
        prepTime: '10 min',
        cookTime: '10 min',
        confidence: {
          overall: 0.9,
          title: 0.95,
          ingredients: 0.85,
          instructions: 0.9,
          hasQuantities: true,
          hasSteps: true,
          isCompleteRecipe: true,
          reasoning: 'Complete recipe with clear ingredients and steps',
        },
      };

      mockParse.mockResolvedValueOnce({
        choices: [
          {
            message: {
              parsed: mockResponse,
              refusal: null,
            },
          },
        ],
      });

      const result = await extractor.extract('Garlic butter shrimp: 1 lb shrimp, 4 cloves garlic...');

      expect(result.title).toBe('Garlic Butter Shrimp');
      expect(result.ingredients).toHaveLength(2);
      expect(result.instructions).toHaveLength(3);
      expect(result.confidence.overall).toBe(0.9);
      expect(result.source).toBe('caption');
      expect(result.extractionTimestamp).toBeDefined();
    });

    it('uses gpt-4o-mini model by default', async () => {
      mockParse.mockResolvedValueOnce({
        choices: [
          {
            message: {
              parsed: {
                title: 'Test',
                description: null,
                ingredients: [],
                instructions: [],
                servings: null,
                prepTime: null,
                cookTime: null,
                confidence: {
                  overall: 0.5,
                  title: 0.5,
                  ingredients: 0.5,
                  instructions: 0.5,
                  hasQuantities: false,
                  hasSteps: false,
                  isCompleteRecipe: false,
                  reasoning: 'Incomplete',
                },
              },
              refusal: null,
            },
          },
        ],
      });

      await extractor.extract('Test caption');

      expect(mockParse).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
        })
      );
    });

    it('returns low confidence for non-recipe captions', async () => {
      const mockResponse = {
        title: '',
        description: null,
        ingredients: [],
        instructions: [],
        servings: null,
        prepTime: null,
        cookTime: null,
        confidence: {
          overall: 0.1,
          title: 0.0,
          ingredients: 0.0,
          instructions: 0.0,
          hasQuantities: false,
          hasSteps: false,
          isCompleteRecipe: false,
          reasoning: 'Caption mentions food but contains no recipe instructions',
        },
      };

      mockParse.mockResolvedValueOnce({
        choices: [
          {
            message: {
              parsed: mockResponse,
              refusal: null,
            },
          },
        ],
      });

      const result = await extractor.extract('Just made the best pasta ever! Link in bio');

      expect(result.confidence.overall).toBeLessThan(0.5);
      expect(result.confidence.isCompleteRecipe).toBe(false);
      expect(result.ingredients).toHaveLength(0);
    });

    it('handles API refusal gracefully', async () => {
      mockParse.mockResolvedValueOnce({
        choices: [
          {
            message: {
              parsed: null,
              refusal: 'Content policy violation',
            },
          },
        ],
      });

      const result = await extractor.extract('Some content');

      expect(result.confidence.overall).toBe(0);
      expect(result.confidence.isCompleteRecipe).toBe(false);
    });

    it('throws on API error', async () => {
      mockParse.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      await expect(extractor.extract('Test caption')).rejects.toThrow(
        'API rate limit exceeded'
      );
    });

    it('handles empty caption', async () => {
      const mockResponse = {
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
          reasoning: 'Empty input',
        },
      };

      mockParse.mockResolvedValueOnce({
        choices: [
          {
            message: {
              parsed: mockResponse,
              refusal: null,
            },
          },
        ],
      });

      const result = await extractor.extract('');

      expect(result.confidence.overall).toBe(0);
    });
  });

  describe('isConfident', () => {
    it('returns true for high confidence extraction', () => {
      const recipe = {
        confidence: { overall: 0.85, isCompleteRecipe: true },
      } as ExtractedRecipe;

      expect(extractor.isConfident(recipe)).toBe(true);
    });

    it('returns false for low confidence extraction', () => {
      const recipe = {
        confidence: { overall: 0.5, isCompleteRecipe: false },
      } as ExtractedRecipe;

      expect(extractor.isConfident(recipe)).toBe(false);
    });

    it('returns false when confidence is below threshold', () => {
      const recipe = {
        confidence: { overall: 0.65, isCompleteRecipe: true },
      } as ExtractedRecipe;

      expect(extractor.isConfident(recipe)).toBe(false);
    });

    it('uses custom threshold when provided', () => {
      const customExtractor = new CaptionExtractor({
        apiKey: 'test-key',
        confidenceThreshold: 0.5,
      });

      const recipe = {
        confidence: { overall: 0.55, isCompleteRecipe: true },
      } as ExtractedRecipe;

      expect(customExtractor.isConfident(recipe)).toBe(true);
    });
  });

  describe('system prompt', () => {
    it('includes confidence scoring instructions', async () => {
      mockParse.mockResolvedValueOnce({
        choices: [
          {
            message: {
              parsed: {
                title: 'Test',
                description: null,
                ingredients: [],
                instructions: [],
                servings: null,
                prepTime: null,
                cookTime: null,
                confidence: {
                  overall: 0.5,
                  title: 0.5,
                  ingredients: 0.5,
                  instructions: 0.5,
                  hasQuantities: false,
                  hasSteps: false,
                  isCompleteRecipe: false,
                  reasoning: 'Test',
                },
              },
              refusal: null,
            },
          },
        ],
      });

      await extractor.extract('Test');

      const callArgs = mockParse.mock.calls[0][0];
      const systemPrompt = callArgs.messages.find(
        (m: { role: string }) => m.role === 'system'
      )?.content;

      expect(systemPrompt).toContain('confidence');
      expect(systemPrompt).toContain('isCompleteRecipe');
    });

    it('includes structured output format instructions', async () => {
      mockParse.mockResolvedValueOnce({
        choices: [
          {
            message: {
              parsed: {
                title: 'Test',
                description: null,
                ingredients: [],
                instructions: [],
                servings: null,
                prepTime: null,
                cookTime: null,
                confidence: {
                  overall: 0.5,
                  title: 0.5,
                  ingredients: 0.5,
                  instructions: 0.5,
                  hasQuantities: false,
                  hasSteps: false,
                  isCompleteRecipe: false,
                  reasoning: 'Test',
                },
              },
              refusal: null,
            },
          },
        ],
      });

      await extractor.extract('Test');

      const callArgs = mockParse.mock.calls[0][0];
      expect(callArgs.response_format).toBeDefined();
    });
  });
});
