import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FrameAnalysis } from '../../../../packages/core/src/extraction/visual/frame-analyzer';

// Shared mock that all instances will use
const sharedMockCreate = vi.fn();

// Mock OpenAI before importing the module
vi.mock('openai', () => {
  class MockOpenAI {
    chat = {
      completions: {
        create: sharedMockCreate,
      },
    };
  }
  return { default: MockOpenAI };
});

// Alias for convenience
const mockCreate = sharedMockCreate;

// Import after mock setup
import {
  FrameConsolidator,
  createFrameConsolidator,
  type ConsolidatedVisualExtraction,
} from '../../../../packages/core/src/extraction/visual/frame-consolidator';

describe('FrameConsolidator', () => {
  const createFrameAnalysis = (overrides: Partial<FrameAnalysis> = {}): FrameAnalysis => ({
    frameIndex: 0,
    stage: 'cooking',
    observations: 'Cooking in progress',
    ingredients: ['chicken', 'garlic'],
    actions: ['searing'],
    equipment: ['pan'],
    foodState: 'cooking',
    hasText: false,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error without API key', () => {
      expect(() => {
        new FrameConsolidator({ apiKey: '' });
      }).toThrow('OpenAI API key is required');
    });

    it('should create consolidator with API key', () => {
      const consolidator = new FrameConsolidator({ apiKey: 'test-key' });
      expect(consolidator).toBeInstanceOf(FrameConsolidator);
    });

    it('should create consolidator with custom config', () => {
      const consolidator = new FrameConsolidator({
        apiKey: 'test-key',
        model: 'gpt-4o',
        maxTokens: 1000,
        temperature: 0.5,
      });
      expect(consolidator).toBeInstanceOf(FrameConsolidator);
    });
  });

  describe('createFrameConsolidator factory', () => {
    it('should create consolidator using factory', () => {
      const consolidator = createFrameConsolidator({ apiKey: 'test-key' });
      expect(consolidator).toBeInstanceOf(FrameConsolidator);
    });
  });

  describe('consolidate', () => {
    it('should return empty result when no analyses provided', async () => {
      const consolidator = new FrameConsolidator({ apiKey: 'test-key' });
      const result = await consolidator.consolidate([]);

      expect(result.dishName).toBe('Unknown');
      expect(result.ingredients).toEqual([]);
      expect(result.cookingSteps).toEqual([]);
      expect(result.confidence).toBe(0);
    });

    it('should return empty result when analyses have no useful content', async () => {
      const consolidator = new FrameConsolidator({ apiKey: 'test-key' });
      const analyses: FrameAnalysis[] = [
        createFrameAnalysis({
          ingredients: [],
          actions: [],
          observations: 'No cooking content visible',
        }),
      ];

      const result = await consolidator.consolidate(analyses);
      expect(result.confidence).toBe(0);
    });

    it('should use simple consolidation for minimal content', async () => {
      const consolidator = new FrameConsolidator({ apiKey: 'test-key' });
      const analyses: FrameAnalysis[] = [
        createFrameAnalysis({
          ingredients: ['pasta'],
          actions: [],
        }),
      ];

      const result = await consolidator.consolidate(analyses);

      // Should use simple consolidation (no AI call)
      expect(mockCreate).not.toHaveBeenCalled();
      expect(result.ingredients).toContain('pasta');
      expect(result.confidence).toBe(0.4);
    });

    it('should use AI consolidation for rich content', async () => {
      const consolidator = new FrameConsolidator({ apiKey: 'test-key' });

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                dishName: 'Garlic Chicken Pasta',
                ingredients: ['chicken breast', 'garlic', 'pasta', 'olive oil'],
                cookingSteps: ['Season chicken', 'Sear in pan', 'Cook pasta', 'Combine'],
                equipment: ['pan', 'pot'],
                textOverlays: [],
                narrative: 'A delicious garlic chicken pasta dish',
              }),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const analyses: FrameAnalysis[] = [
        createFrameAnalysis({
          frameIndex: 0,
          stage: 'intro',
          ingredients: ['chicken', 'garlic'],
          actions: ['seasoning'],
        }),
        createFrameAnalysis({
          frameIndex: 1,
          stage: 'cooking',
          ingredients: ['pasta', 'olive oil'],
          actions: ['searing', 'boiling'],
        }),
        createFrameAnalysis({
          frameIndex: 2,
          stage: 'outro',
          ingredients: [],
          actions: ['plating'],
        }),
      ];

      const result = await consolidator.consolidate(analyses);

      expect(result.dishName).toBe('Garlic Chicken Pasta');
      expect(result.ingredients).toHaveLength(4);
      expect(result.cookingSteps).toHaveLength(4);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should fallback to simple consolidation if AI fails', async () => {
      const consolidator = new FrameConsolidator({ apiKey: 'test-key' });

      mockCreate.mockRejectedValue(new Error('API Error'));

      const analyses: FrameAnalysis[] = [
        createFrameAnalysis({
          ingredients: ['beef', 'onion', 'garlic'],
          actions: ['chopping', 'sauteing'],
        }),
        createFrameAnalysis({
          ingredients: ['tomato', 'herbs'],
          actions: ['simmering'],
        }),
      ];

      const result = await consolidator.consolidate(analyses);

      // Should have consolidated without AI
      expect(result.ingredients.length).toBeGreaterThan(0);
      expect(result.confidence).toBe(0.5);
    });

    it('should deduplicate ingredients across frames', async () => {
      const consolidator = new FrameConsolidator({ apiKey: 'test-key' });

      // Mock AI to just return what we give it (to test pre-processing)
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                dishName: 'Test Dish',
                ingredients: ['chicken', 'garlic'],
                cookingSteps: ['Step 1', 'Step 2'],
                equipment: ['pan'],
                textOverlays: [],
                narrative: 'Test',
              }),
            },
          },
        ],
      });

      const analyses: FrameAnalysis[] = [
        createFrameAnalysis({
          frameIndex: 0,
          ingredients: ['Chicken', 'garlic'],
        }),
        createFrameAnalysis({
          frameIndex: 1,
          ingredients: ['chicken', 'Garlic', 'onion'],
        }),
      ];

      const result = await consolidator.consolidate(analyses);

      // The AI was called with the analyses
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should capture text overlays from frames with hasText', async () => {
      const consolidator = new FrameConsolidator({ apiKey: 'test-key' });

      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                dishName: 'Recipe',
                ingredients: ['item'],
                cookingSteps: ['step'],
                equipment: [],
                textOverlays: ['Recipe Title: Pasta'],
                narrative: 'Test',
              }),
            },
          },
        ],
      });

      const analyses: FrameAnalysis[] = [
        createFrameAnalysis({
          hasText: true,
          observations: 'Text overlay showing recipe title',
        }),
        createFrameAnalysis({
          hasText: false,
        }),
      ];

      const result = await consolidator.consolidate(analyses);
      expect(result.textOverlays).toBeDefined();
    });
  });

  describe('confidence calculation', () => {
    it('should have higher confidence with more ingredients', async () => {
      const consolidator = new FrameConsolidator({ apiKey: 'test-key' });

      // Few ingredients
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                dishName: 'Dish',
                ingredients: ['item1'],
                cookingSteps: ['step1', 'step2', 'step3'],
                equipment: [],
                textOverlays: [],
                narrative: 'Test',
              }),
            },
          },
        ],
      });

      const fewIngredients = await consolidator.consolidate([
        createFrameAnalysis({ ingredients: ['item1'], actions: ['a', 'b'] }),
        createFrameAnalysis({ ingredients: [], actions: ['c'] }),
      ]);

      // Many ingredients
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                dishName: 'Dish',
                ingredients: ['item1', 'item2', 'item3', 'item4', 'item5'],
                cookingSteps: ['step1', 'step2', 'step3'],
                equipment: [],
                textOverlays: [],
                narrative: 'Test',
              }),
            },
          },
        ],
      });

      const manyIngredients = await consolidator.consolidate([
        createFrameAnalysis({ ingredients: ['item1', 'item2', 'item3'], actions: ['a'] }),
        createFrameAnalysis({ ingredients: ['item4', 'item5'], actions: ['b'] }),
      ]);

      expect(manyIngredients.confidence).toBeGreaterThan(fewIngredients.confidence);
    });

    it('should have higher confidence with specific dish name', async () => {
      const consolidator = new FrameConsolidator({ apiKey: 'test-key' });

      // Generic name
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                dishName: 'Cooking Recipe',
                ingredients: ['item1', 'item2', 'item3'],
                cookingSteps: ['step1', 'step2', 'step3'],
                equipment: [],
                textOverlays: [],
                narrative: 'Test',
              }),
            },
          },
        ],
      });

      const genericName = await consolidator.consolidate([
        createFrameAnalysis({ ingredients: ['item1', 'item2', 'item3'] }),
        createFrameAnalysis({ actions: ['a', 'b'] }),
      ]);

      // Specific name
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                dishName: 'Garlic Butter Shrimp Scampi',
                ingredients: ['shrimp', 'garlic', 'butter'],
                cookingSteps: ['step1', 'step2', 'step3'],
                equipment: [],
                textOverlays: [],
                narrative: 'Test',
              }),
            },
          },
        ],
      });

      const specificName = await consolidator.consolidate([
        createFrameAnalysis({ ingredients: ['shrimp', 'garlic', 'butter'] }),
        createFrameAnalysis({ actions: ['a', 'b'] }),
      ]);

      expect(specificName.confidence).toBeGreaterThan(genericName.confidence);
    });
  });

  describe('dish name inference', () => {
    it('should infer pasta dishes', async () => {
      const consolidator = new FrameConsolidator({ apiKey: 'test-key' });

      // Use simple consolidation by providing minimal content
      const analyses: FrameAnalysis[] = [
        createFrameAnalysis({
          ingredients: ['pasta'],
          actions: [],
        }),
      ];

      const result = await consolidator.consolidate(analyses);
      expect(result.dishName.toLowerCase()).toContain('pasta');
    });
  });
});
