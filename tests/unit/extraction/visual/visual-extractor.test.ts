import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mocks
const mockExtractorExtract = vi.fn();
const mockAnalyzerAnalyzeAll = vi.fn();
const mockConsolidatorConsolidate = vi.fn();

// Mock all sub-components before importing
vi.mock('../../../../packages/core/src/extraction/visual/frame-extractor', () => ({
  FrameExtractor: vi.fn().mockImplementation(() => ({
    extract: mockExtractorExtract,
  })),
  createFrameExtractor: vi.fn().mockImplementation(() => ({
    extract: mockExtractorExtract,
  })),
  FrameExtractionError: class FrameExtractionError extends Error {
    constructor(
      message: string,
      public videoUrl: string,
      public cause?: Error,
      public isRetryable: boolean = false
    ) {
      super(message);
      this.name = 'FrameExtractionError';
    }
  },
}));

vi.mock('../../../../packages/core/src/extraction/visual/frame-analyzer', () => ({
  FrameAnalyzer: vi.fn().mockImplementation(() => ({
    analyzeAll: mockAnalyzerAnalyzeAll,
  })),
  createFrameAnalyzer: vi.fn().mockImplementation(() => ({
    analyzeAll: mockAnalyzerAnalyzeAll,
  })),
}));

vi.mock('../../../../packages/core/src/extraction/visual/frame-consolidator', () => ({
  FrameConsolidator: vi.fn().mockImplementation(() => ({
    consolidate: mockConsolidatorConsolidate,
  })),
  createFrameConsolidator: vi.fn().mockImplementation(() => ({
    consolidate: mockConsolidatorConsolidate,
  })),
}));

// Import after mock setup
import {
  VisualExtractor,
  createVisualExtractor,
  type VisualExtractionResult,
} from '../../../../packages/core/src/extraction/visual/visual-extractor';
import { FrameExtractionError } from '../../../../packages/core/src/extraction/visual/frame-extractor';

describe('VisualExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error without API key', () => {
      expect(() => {
        new VisualExtractor({ apiKey: '' });
      }).toThrow('OpenAI API key is required');
    });

    it('should create extractor with API key', () => {
      const extractor = new VisualExtractor({ apiKey: 'test-key' });
      expect(extractor).toBeInstanceOf(VisualExtractor);
    });

    it('should create extractor with custom sub-component configs', () => {
      const extractor = new VisualExtractor({
        apiKey: 'test-key',
        frameExtractor: { maxFrames: 10 },
        frameAnalyzer: { maxConcurrent: 5 },
        frameConsolidator: { maxTokens: 1000 },
        verbose: true,
      });
      expect(extractor).toBeInstanceOf(VisualExtractor);
    });
  });

  describe('createVisualExtractor factory', () => {
    it('should create extractor using factory', () => {
      const extractor = createVisualExtractor({ apiKey: 'test-key' });
      expect(extractor).toBeInstanceOf(VisualExtractor);
    });
  });

  describe('extract', () => {
    it('should run full extraction pipeline', async () => {
      const extractor = new VisualExtractor({ apiKey: 'test-key' });

      // Mock frame extraction
      mockExtractorExtract.mockResolvedValue({
        frames: [Buffer.alloc(1000), Buffer.alloc(1000), Buffer.alloc(1000)],
        timestamps: [5, 15, 25],
        duration: 30,
      });

      // Mock frame analysis
      mockAnalyzerAnalyzeAll.mockResolvedValue({
        analyses: [
          {
            frameIndex: 0,
            stage: 'intro',
            observations: 'Test',
            ingredients: ['chicken'],
            actions: ['prep'],
            equipment: ['knife'],
            foodState: 'raw',
            hasText: false,
          },
          {
            frameIndex: 1,
            stage: 'cooking',
            observations: 'Cooking',
            ingredients: ['garlic'],
            actions: ['sauteing'],
            equipment: ['pan'],
            foodState: 'cooking',
            hasText: false,
          },
          {
            frameIndex: 2,
            stage: 'outro',
            observations: 'Done',
            ingredients: [],
            actions: ['plating'],
            equipment: [],
            foodState: 'cooked',
            hasText: true,
          },
        ],
        successCount: 3,
        failedFrames: [],
      });

      // Mock consolidation
      mockConsolidatorConsolidate.mockResolvedValue({
        dishName: 'Garlic Chicken',
        ingredients: ['chicken', 'garlic'],
        cookingSteps: ['Prep chicken', 'Saute with garlic', 'Plate'],
        equipment: ['knife', 'pan'],
        textOverlays: [],
        narrative: 'A simple garlic chicken dish',
        confidence: 0.8,
      });

      const result = await extractor.extract('https://tiktok.com/video');

      expect(result.framesExtracted).toBe(3);
      expect(result.framesAnalyzed).toBe(3);
      expect(result.videoDuration).toBe(30);
      expect(result.isUsable).toBe(true);
      expect(result.extraction.dishName).toBe('Garlic Chicken');
    });

    it('should mark result as unusable with low confidence', async () => {
      const extractor = new VisualExtractor({ apiKey: 'test-key' });

      mockExtractorExtract.mockResolvedValue({
        frames: [Buffer.alloc(1000)],
        timestamps: [5],
        duration: 30,
      });

      mockAnalyzerAnalyzeAll.mockResolvedValue({
        analyses: [
          {
            frameIndex: 0,
            stage: 'cooking',
            observations: 'Not clear',
            ingredients: [],
            actions: [],
            equipment: [],
            foodState: 'unknown',
            hasText: false,
          },
        ],
        successCount: 1,
        failedFrames: [],
      });

      mockConsolidatorConsolidate.mockResolvedValue({
        dishName: 'Unknown',
        ingredients: [],
        cookingSteps: [],
        equipment: [],
        textOverlays: [],
        narrative: 'Could not identify dish',
        confidence: 0.1,
      });

      const result = await extractor.extract('https://tiktok.com/video');

      expect(result.isUsable).toBe(false);
    });

    it('should mark result as unusable with too few analyzed frames', async () => {
      const extractor = new VisualExtractor({ apiKey: 'test-key' });

      mockExtractorExtract.mockResolvedValue({
        frames: [Buffer.alloc(1000), Buffer.alloc(1000)],
        timestamps: [5, 15],
        duration: 30,
      });

      mockAnalyzerAnalyzeAll.mockResolvedValue({
        analyses: [
          {
            frameIndex: 0,
            stage: 'cooking',
            observations: 'Single frame',
            ingredients: ['ingredient'],
            actions: ['action'],
            equipment: [],
            foodState: 'cooking',
            hasText: false,
          },
        ],
        successCount: 1, // Only 1 frame succeeded
        failedFrames: [1],
      });

      mockConsolidatorConsolidate.mockResolvedValue({
        dishName: 'Dish',
        ingredients: ['ingredient'],
        cookingSteps: ['step'],
        equipment: [],
        textOverlays: [],
        narrative: 'Test',
        confidence: 0.6,
      });

      const result = await extractor.extract('https://tiktok.com/video');

      expect(result.isUsable).toBe(false);
    });

    it('should propagate FrameExtractionError', async () => {
      const extractor = new VisualExtractor({ apiKey: 'test-key' });

      const error = new FrameExtractionError(
        'Download failed',
        'https://test.com',
        undefined,
        true
      );
      mockExtractorExtract.mockRejectedValue(error);

      await expect(extractor.extract('https://test.com')).rejects.toThrow(
        'Download failed'
      );
    });

    it('should wrap non-FrameExtractionError in generic error', async () => {
      const extractor = new VisualExtractor({ apiKey: 'test-key' });

      mockExtractorExtract.mockRejectedValue(new Error('Network error'));

      await expect(extractor.extract('https://test.com')).rejects.toThrow(
        'Frame extraction failed'
      );
    });

    it('should throw on frame analysis failure', async () => {
      const extractor = new VisualExtractor({ apiKey: 'test-key' });

      mockExtractorExtract.mockResolvedValue({
        frames: [Buffer.alloc(1000)],
        timestamps: [5],
        duration: 30,
      });

      mockAnalyzerAnalyzeAll.mockRejectedValue(new Error('OpenAI API error'));

      await expect(extractor.extract('https://test.com')).rejects.toThrow(
        'Frame analysis failed'
      );
    });

    it('should throw on consolidation failure', async () => {
      const extractor = new VisualExtractor({ apiKey: 'test-key' });

      mockExtractorExtract.mockResolvedValue({
        frames: [Buffer.alloc(1000)],
        timestamps: [5],
        duration: 30,
      });

      mockAnalyzerAnalyzeAll.mockResolvedValue({
        analyses: [],
        successCount: 0,
        failedFrames: [0],
      });

      mockConsolidatorConsolidate.mockRejectedValue(
        new Error('Consolidation error')
      );

      await expect(extractor.extract('https://test.com')).rejects.toThrow(
        'Consolidation failed'
      );
    });
  });

  describe('toExtractedRecipe', () => {
    it('should convert visual extraction to ExtractedRecipe format', () => {
      const extractor = new VisualExtractor({ apiKey: 'test-key' });

      const visualResult: VisualExtractionResult = {
        extraction: {
          dishName: 'Pasta Dish',
          ingredients: ['pasta', 'tomato sauce', 'garlic'],
          cookingSteps: ['Boil pasta', 'Make sauce', 'Combine'],
          equipment: ['pot', 'pan'],
          textOverlays: [],
          narrative: 'A simple pasta dish',
          confidence: 0.7,
        },
        framesExtracted: 5,
        framesAnalyzed: 5,
        videoDuration: 60,
        isUsable: true,
      };

      const recipe = extractor.toExtractedRecipe(visualResult);

      expect(recipe.title).toBe('Pasta Dish');
      expect(recipe.description).toBe('A simple pasta dish');
      expect(recipe.ingredients).toHaveLength(3);
      expect(recipe.ingredients[0].raw).toBe('pasta');
      expect(recipe.instructions).toHaveLength(3);
      expect(recipe.source).toBe('visual');
      expect(recipe.confidence.overall).toBe(0.7);
    });

    it('should set appropriate confidence scores', () => {
      const extractor = new VisualExtractor({ apiKey: 'test-key' });

      const visualResult: VisualExtractionResult = {
        extraction: {
          dishName: 'Garlic Shrimp Pasta',
          ingredients: ['shrimp', 'garlic', 'pasta', 'butter', 'parsley'],
          cookingSteps: [
            'Cook shrimp',
            'Add garlic',
            'Toss with pasta',
            'Garnish',
          ],
          equipment: ['pan'],
          textOverlays: [],
          narrative: 'Delicious garlic shrimp pasta',
          confidence: 0.85,
        },
        framesExtracted: 6,
        framesAnalyzed: 6,
        videoDuration: 45,
        isUsable: true,
      };

      const recipe = extractor.toExtractedRecipe(visualResult);

      // Should have good title confidence (specific dish name)
      expect(recipe.confidence.title).toBe(0.8);
      // Should have reasonable ingredient confidence
      expect(recipe.confidence.ingredients).toBe(1); // 5/5 = 1
      // Should have reasonable instruction confidence
      expect(recipe.confidence.instructions).toBe(1); // 4/4 = 1
      // Visual extraction rarely captures quantities
      expect(recipe.confidence.hasQuantities).toBe(false);
      // Should have steps
      expect(recipe.confidence.hasSteps).toBe(true);
    });

    it('should handle unknown dish names with lower confidence', () => {
      const extractor = new VisualExtractor({ apiKey: 'test-key' });

      const visualResult: VisualExtractionResult = {
        extraction: {
          dishName: 'Unknown',
          ingredients: ['something'],
          cookingSteps: ['step'],
          equipment: [],
          textOverlays: [],
          narrative: 'Could not identify',
          confidence: 0.3,
        },
        framesExtracted: 2,
        framesAnalyzed: 1,
        videoDuration: 30,
        isUsable: false,
      };

      const recipe = extractor.toExtractedRecipe(visualResult);

      // Should have low title confidence for "Unknown"
      expect(recipe.confidence.title).toBe(0.3);
    });
  });

  describe('verbose logging', () => {
    it('should log progress when verbose is true', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const extractor = new VisualExtractor({
        apiKey: 'test-key',
        verbose: true,
      });

      mockExtractorExtract.mockResolvedValue({
        frames: [Buffer.alloc(1000)],
        timestamps: [5],
        duration: 30,
      });

      mockAnalyzerAnalyzeAll.mockResolvedValue({
        analyses: [
          {
            frameIndex: 0,
            stage: 'cooking',
            observations: 'Test',
            ingredients: ['item'],
            actions: ['action'],
            equipment: [],
            foodState: 'cooking',
            hasText: false,
          },
        ],
        successCount: 1,
        failedFrames: [],
      });

      mockConsolidatorConsolidate.mockResolvedValue({
        dishName: 'Test',
        ingredients: ['item'],
        cookingSteps: ['step'],
        equipment: [],
        textOverlays: [],
        narrative: 'Test',
        confidence: 0.5,
      });

      await extractor.extract('https://test.com');

      expect(consoleSpy).toHaveBeenCalled();
      const logCalls = consoleSpy.mock.calls.map((call) => call[0]);
      expect(logCalls.some((log) => log.includes('[VisualExtractor]'))).toBe(
        true
      );

      consoleSpy.mockRestore();
    });

    it('should not log when verbose is false', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const extractor = new VisualExtractor({
        apiKey: 'test-key',
        verbose: false,
      });

      mockExtractorExtract.mockResolvedValue({
        frames: [Buffer.alloc(1000)],
        timestamps: [5],
        duration: 30,
      });

      mockAnalyzerAnalyzeAll.mockResolvedValue({
        analyses: [
          {
            frameIndex: 0,
            stage: 'cooking',
            observations: 'Test',
            ingredients: ['item'],
            actions: ['action'],
            equipment: [],
            foodState: 'cooking',
            hasText: false,
          },
        ],
        successCount: 1,
        failedFrames: [],
      });

      mockConsolidatorConsolidate.mockResolvedValue({
        dishName: 'Test',
        ingredients: ['item'],
        cookingSteps: ['step'],
        equipment: [],
        textOverlays: [],
        narrative: 'Test',
        confidence: 0.5,
      });

      await extractor.extract('https://test.com');

      const visualExtractorLogs = consoleSpy.mock.calls.filter(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('[VisualExtractor]')
      );
      expect(visualExtractorLogs.length).toBe(0);

      consoleSpy.mockRestore();
    });
  });
});
