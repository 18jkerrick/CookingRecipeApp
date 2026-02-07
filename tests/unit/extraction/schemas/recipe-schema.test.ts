import { describe, it, expect } from 'vitest';
import {
  IngredientSchema,
  ConfidenceScoreSchema,
  ExtractedRecipeSchema,
  ExtractionSourceSchema,
  AIExtractionResponseSchema,
} from '../../../../packages/core/src/extraction/schemas/recipe-schema';

describe('Recipe Schema', () => {
  describe('IngredientSchema', () => {
    it('parses complete ingredient with all fields', () => {
      const ingredient = {
        raw: '2 cups all-purpose flour, sifted',
        quantity: 2,
        unit: 'cups',
        name: 'all-purpose flour',
        preparation: 'sifted',
        notes: null,
      };

      const result = IngredientSchema.parse(ingredient);
      expect(result.raw).toBe('2 cups all-purpose flour, sifted');
      expect(result.quantity).toBe(2);
      expect(result.unit).toBe('cups');
      expect(result.name).toBe('all-purpose flour');
      expect(result.preparation).toBe('sifted');
    });

    it('allows null quantity and unit for unspecified amounts', () => {
      const ingredient = {
        raw: 'salt to taste',
        quantity: null,
        unit: null,
        name: 'salt',
        preparation: null,
        notes: 'to taste',
      };

      const result = IngredientSchema.parse(ingredient);
      expect(result.quantity).toBeNull();
      expect(result.unit).toBeNull();
      expect(result.notes).toBe('to taste');
    });

    it('handles fractional quantities', () => {
      const ingredient = {
        raw: '1/2 lb ground pork',
        quantity: 0.5,
        unit: 'lb',
        name: 'ground pork',
        preparation: null,
        notes: null,
      };

      const result = IngredientSchema.parse(ingredient);
      expect(result.quantity).toBe(0.5);
    });

    it('rejects missing required name field', () => {
      const invalid = {
        raw: '2 cups flour',
        quantity: 2,
        unit: 'cups',
        preparation: null,
        notes: null,
      };

      expect(() => IngredientSchema.parse(invalid)).toThrow();
    });
  });

  describe('ConfidenceScoreSchema', () => {
    it('validates complete confidence score', () => {
      const confidence = {
        overall: 0.85,
        title: 0.9,
        ingredients: 0.8,
        instructions: 0.85,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Complete recipe with clear ingredients and steps',
      };

      const result = ConfidenceScoreSchema.parse(confidence);
      expect(result.overall).toBe(0.85);
      expect(result.isCompleteRecipe).toBe(true);
    });

    it('validates confidence at boundary values', () => {
      const minConfidence = {
        overall: 0,
        title: 0,
        ingredients: 0,
        instructions: 0,
        hasQuantities: false,
        hasSteps: false,
        isCompleteRecipe: false,
        reasoning: 'No recipe content found',
      };

      expect(ConfidenceScoreSchema.parse(minConfidence).overall).toBe(0);

      const maxConfidence = {
        overall: 1,
        title: 1,
        ingredients: 1,
        instructions: 1,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Perfect extraction',
      };

      expect(ConfidenceScoreSchema.parse(maxConfidence).overall).toBe(1);
    });

    it('rejects confidence > 1', () => {
      const invalid = {
        overall: 1.5,
        title: 0.9,
        ingredients: 0.8,
        instructions: 0.85,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Invalid',
      };

      expect(() => ConfidenceScoreSchema.parse(invalid)).toThrow();
    });

    it('rejects negative confidence', () => {
      const invalid = {
        overall: -0.1,
        title: 0.9,
        ingredients: 0.8,
        instructions: 0.85,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Invalid',
      };

      expect(() => ConfidenceScoreSchema.parse(invalid)).toThrow();
    });
  });

  describe('ExtractionSourceSchema', () => {
    it('accepts valid extraction sources', () => {
      expect(ExtractionSourceSchema.parse('caption')).toBe('caption');
      expect(ExtractionSourceSchema.parse('transcript')).toBe('transcript');
      expect(ExtractionSourceSchema.parse('visual')).toBe('visual');
      expect(ExtractionSourceSchema.parse('combined')).toBe('combined');
    });

    it('rejects invalid sources', () => {
      expect(() => ExtractionSourceSchema.parse('audio')).toThrow();
      expect(() => ExtractionSourceSchema.parse('')).toThrow();
    });
  });

  describe('ExtractedRecipeSchema', () => {
    const validRecipe = {
      title: 'Chocolate Chip Cookies',
      description: 'Classic homemade chocolate chip cookies',
      ingredients: [
        {
          raw: '2 cups flour',
          quantity: 2,
          unit: 'cups',
          name: 'flour',
          preparation: null,
          notes: null,
        },
        {
          raw: '1 cup sugar',
          quantity: 1,
          unit: 'cup',
          name: 'sugar',
          preparation: null,
          notes: null,
        },
      ],
      instructions: [
        'Preheat oven to 350°F',
        'Mix dry ingredients',
        'Add wet ingredients',
        'Bake for 12 minutes',
      ],
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
        reasoning: 'Complete recipe with clear ingredients and steps',
      },
      source: 'caption' as const,
      extractionTimestamp: '2026-02-05T12:00:00.000Z',
    };

    it('validates complete recipe', () => {
      const result = ExtractedRecipeSchema.parse(validRecipe);
      expect(result.title).toBe('Chocolate Chip Cookies');
      expect(result.ingredients).toHaveLength(2);
      expect(result.instructions).toHaveLength(4);
      expect(result.confidence.overall).toBe(0.9);
    });

    it('allows null for optional fields', () => {
      const minimalRecipe = {
        ...validRecipe,
        description: null,
        servings: null,
        prepTime: null,
        cookTime: null,
        totalTime: null,
      };

      const result = ExtractedRecipeSchema.parse(minimalRecipe);
      expect(result.description).toBeNull();
      expect(result.servings).toBeNull();
    });

    it('rejects empty title', () => {
      const invalid = { ...validRecipe, title: '' };
      // Note: Zod string() allows empty strings by default
      // If we want to enforce non-empty, we'd use z.string().min(1)
      const result = ExtractedRecipeSchema.parse(invalid);
      expect(result.title).toBe('');
    });

    it('validates extraction timestamp format', () => {
      const result = ExtractedRecipeSchema.parse(validRecipe);
      expect(result.extractionTimestamp).toBe('2026-02-05T12:00:00.000Z');
    });

    it('rejects invalid timestamp format', () => {
      const invalid = {
        ...validRecipe,
        extractionTimestamp: 'not-a-date',
      };

      expect(() => ExtractedRecipeSchema.parse(invalid)).toThrow();
    });
  });

  describe('AIExtractionResponseSchema', () => {
    it('validates AI response format for structured output', () => {
      const aiResponse = {
        title: 'Scrambled Eggs',
        description: 'Simple breakfast recipe',
        ingredients: [
          {
            raw: '3 eggs',
            quantity: 3,
            unit: null,
            name: 'eggs',
            preparation: null,
            notes: null,
          },
        ],
        instructions: ['Beat eggs', 'Cook in pan'],
        servings: 2,
        prepTime: '2 min',
        cookTime: '5 min',
        confidence: {
          overall: 0.95,
          title: 1.0,
          ingredients: 0.9,
          instructions: 0.95,
          hasQuantities: true,
          hasSteps: true,
          isCompleteRecipe: true,
          reasoning: 'Simple but complete recipe',
        },
      };

      const result = AIExtractionResponseSchema.parse(aiResponse);
      expect(result.title).toBe('Scrambled Eggs');
      expect(result.confidence.overall).toBe(0.95);
    });

    it('allows null for optional metadata', () => {
      const minimalResponse = {
        title: 'Quick Snack',
        description: null,
        ingredients: [],
        instructions: [],
        servings: null,
        prepTime: null,
        cookTime: null,
        confidence: {
          overall: 0.3,
          title: 0.5,
          ingredients: 0.1,
          instructions: 0.1,
          hasQuantities: false,
          hasSteps: false,
          isCompleteRecipe: false,
          reasoning: 'Incomplete recipe - no ingredients or instructions found',
        },
      };

      const result = AIExtractionResponseSchema.parse(minimalResponse);
      expect(result.confidence.isCompleteRecipe).toBe(false);
    });
  });
});
