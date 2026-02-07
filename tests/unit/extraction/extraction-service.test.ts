import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// =============================================================================
// Module Mocks (Must be defined before vi.mock)
// =============================================================================

// Shared mock functions accessible across tests
const mockContentServiceAcquire = vi.fn();
const mockCaptionExtract = vi.fn();
const mockConfidenceEvaluate = vi.fn();
const mockVisualExtract = vi.fn();
const mockToExtractedRecipe = vi.fn();

// Mock ContentService
vi.mock('../../../packages/core/src/content/content-service', () => {
  class MockContentService {
    acquire = mockContentServiceAcquire;
  }
  return { ContentService: MockContentService };
});

// Mock CaptionExtractor
vi.mock('../../../packages/core/src/extraction/extractors/caption-extractor', () => {
  class MockCaptionExtractor {
    extract = mockCaptionExtract;
  }
  return { CaptionExtractor: MockCaptionExtractor };
});

// Mock ConfidenceScorer
vi.mock('../../../packages/core/src/extraction/confidence-scorer', () => {
  class MockConfidenceScorer {
    evaluate = mockConfidenceEvaluate;
  }
  return { ConfidenceScorer: MockConfidenceScorer };
});

// Mock VisualExtractor
vi.mock('../../../packages/core/src/extraction/visual/visual-extractor', () => {
  class MockVisualExtractor {
    extract = mockVisualExtract;
    toExtractedRecipe = mockToExtractedRecipe;
  }
  return { VisualExtractor: MockVisualExtractor };
});

// Import after mocks are set up
import { ExtractionService } from '../../../packages/core/src/extraction/extraction-service';
import type { AcquiredContent } from '../../../packages/core/src/content/types';
import type { ExtractedRecipe, ConfidenceScore } from '../../../packages/core/src/extraction/schemas/recipe-schema';
import type { FallbackDecision } from '../../../packages/core/src/extraction/confidence-scorer';

// =============================================================================
// Test Fixtures
// =============================================================================

const createMockContent = (overrides?: Partial<AcquiredContent>): AcquiredContent => ({
  provider: 'supadata',
  platform: 'tiktok',
  contentType: 'video',
  caption: 'Best pasta recipe ever! 🍝',
  transcript: 'Today we are making garlic pasta. You need pasta, garlic, olive oil...',
  title: 'Garlic Pasta',
  ...overrides,
});

const createMockConfidence = (overrides?: Partial<ConfidenceScore>): ConfidenceScore => ({
  overall: 0.85,
  title: 0.9,
  ingredients: 0.8,
  instructions: 0.85,
  hasQuantities: true,
  hasSteps: true,
  isCompleteRecipe: true,
  reasoning: 'Good extraction with clear ingredients and steps',
  ...overrides,
});

const createMockRecipe = (overrides?: Partial<ExtractedRecipe>): ExtractedRecipe => ({
  title: 'Garlic Pasta',
  description: 'A simple and delicious pasta dish',
  ingredients: [
    { raw: '1 lb pasta', quantity: 1, unit: 'lb', name: 'pasta', preparation: null },
    { raw: '4 cloves garlic', quantity: 4, unit: 'cloves', name: 'garlic', preparation: 'minced' },
    { raw: '3 tbsp olive oil', quantity: 3, unit: 'tbsp', name: 'olive oil', preparation: null },
  ],
  instructions: [
    'Cook pasta according to package directions',
    'Mince garlic and sauté in olive oil until fragrant',
    'Toss pasta with garlic oil and serve',
  ],
  servings: '4',
  prepTime: '5 min',
  cookTime: '15 min',
  totalTime: '20 min',
  confidence: createMockConfidence(),
  source: 'caption',
  extractionTimestamp: new Date().toISOString(),
  ...overrides,
});

const createMockFallbackDecision = (shouldFallback: boolean): FallbackDecision => ({
  shouldFallback,
  reason: shouldFallback
    ? 'Low confidence in ingredients'
    : 'Extraction meets all confidence thresholds',
  missingFields: shouldFallback ? ['ingredients'] : [],
  score: shouldFallback ? 0.55 : 0.85,
});

// =============================================================================
// Tests
// =============================================================================

describe('ExtractionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error if OpenAI API key is missing', () => {
      expect(
        () => new ExtractionService({ openaiApiKey: '' })
      ).toThrow('OpenAI API key is required');
    });

    it('should create service with valid configuration', () => {
      const service = new ExtractionService({
        openaiApiKey: 'test-key',
      });
      expect(service).toBeInstanceOf(ExtractionService);
    });

    it('should respect enableVisualFallback option', () => {
      const serviceWithFallback = new ExtractionService({
        openaiApiKey: 'test-key',
        enableVisualFallback: true,
      });
      expect(serviceWithFallback).toBeDefined();

      const serviceWithoutFallback = new ExtractionService({
        openaiApiKey: 'test-key',
        enableVisualFallback: false,
      });
      expect(serviceWithoutFallback).toBeDefined();
    });
  });

  describe('extract', () => {
    let service: ExtractionService;

    beforeEach(() => {
      service = new ExtractionService({
        openaiApiKey: 'test-key',
        enableVisualFallback: true,
      });
    });

    it('should complete extraction without visual fallback when confidence is high', async () => {
      const mockContent = createMockContent();
      const mockRecipe = createMockRecipe({ confidence: createMockConfidence({ overall: 0.9 }) });
      const mockDecision = createMockFallbackDecision(false);

      mockContentServiceAcquire.mockResolvedValue(mockContent);
      mockCaptionExtract.mockResolvedValue(mockRecipe);
      mockConfidenceEvaluate.mockReturnValue(mockDecision);

      const result = await service.extract('https://tiktok.com/@user/video/123');

      expect(result.usedVisualFallback).toBe(false);
      expect(result.recipe.title).toBe('Garlic Pasta');
      expect(result.confidence.initial).toBeGreaterThan(0.7);
      expect(result.confidence.fallbackDecision?.shouldFallback).toBe(false);
      expect(mockVisualExtract).not.toHaveBeenCalled();
    });

    it('should trigger visual fallback when confidence is low', async () => {
      const mockContent = createMockContent();
      const lowConfidenceRecipe = createMockRecipe({
        confidence: createMockConfidence({ overall: 0.5, ingredients: 0.4 }),
      });
      const highConfidenceVisualRecipe = createMockRecipe({
        title: 'Garlic Butter Pasta',
        confidence: createMockConfidence({ overall: 0.8, ingredients: 0.85 }),
        source: 'visual',
      });
      const mockDecision = createMockFallbackDecision(true);

      mockContentServiceAcquire.mockResolvedValue(mockContent);
      mockCaptionExtract.mockResolvedValue(lowConfidenceRecipe);
      mockConfidenceEvaluate.mockReturnValue(mockDecision);
      mockVisualExtract.mockResolvedValue({
        frames: 5,
        successful: 5,
        analyses: [],
        extraction: {
          dishName: 'Garlic Butter Pasta',
          ingredients: ['pasta', 'garlic', 'butter'],
          instructions: [],
          confidence: 0.8,
        },
        isUsable: true,
        totalTimeMs: 5000,
      });
      mockToExtractedRecipe.mockReturnValue(highConfidenceVisualRecipe);

      const result = await service.extract('https://tiktok.com/@user/video/123');

      expect(result.usedVisualFallback).toBe(true);
      expect(mockVisualExtract).toHaveBeenCalled();
      expect(result.recipe.source).toBe('combined');
      expect(result.confidence.final).toBeGreaterThanOrEqual(result.confidence.initial);
    });

    it('should not attempt visual extraction for non-video content', async () => {
      const mockContent = createMockContent({ contentType: 'text' });
      const lowConfidenceRecipe = createMockRecipe({
        confidence: createMockConfidence({ overall: 0.5 }),
      });
      const mockDecision = createMockFallbackDecision(true);

      mockContentServiceAcquire.mockResolvedValue(mockContent);
      mockCaptionExtract.mockResolvedValue(lowConfidenceRecipe);
      mockConfidenceEvaluate.mockReturnValue(mockDecision);

      const result = await service.extract('https://example.com/recipe');

      expect(result.usedVisualFallback).toBe(false);
      expect(mockVisualExtract).not.toHaveBeenCalled();
    });

    it('should continue with caption result if visual extraction fails', async () => {
      const mockContent = createMockContent();
      const lowConfidenceRecipe = createMockRecipe({
        confidence: createMockConfidence({ overall: 0.5 }),
      });
      const mockDecision = createMockFallbackDecision(true);

      mockContentServiceAcquire.mockResolvedValue(mockContent);
      mockCaptionExtract.mockResolvedValue(lowConfidenceRecipe);
      mockConfidenceEvaluate.mockReturnValue(mockDecision);
      mockVisualExtract.mockRejectedValue(new Error('FFmpeg not available'));

      const result = await service.extract('https://tiktok.com/@user/video/123');

      expect(result.usedVisualFallback).false;
      expect(result.recipe).toEqual(lowConfidenceRecipe);
      expect(result.timing.visualExtractionMs).not.toBeNull();
    });

    it('should include timing information in result', async () => {
      const mockContent = createMockContent();
      const mockRecipe = createMockRecipe();
      const mockDecision = createMockFallbackDecision(false);

      mockContentServiceAcquire.mockResolvedValue(mockContent);
      mockCaptionExtract.mockResolvedValue(mockRecipe);
      mockConfidenceEvaluate.mockReturnValue(mockDecision);

      const result = await service.extract('https://tiktok.com/@user/video/123');

      expect(result.timing.contentAcquisitionMs).toBeGreaterThanOrEqual(0);
      expect(result.timing.captionExtractionMs).toBeGreaterThanOrEqual(0);
      expect(result.timing.totalMs).toBeGreaterThanOrEqual(0);
    });

    it('should include content metadata in result', async () => {
      const mockContent = createMockContent({
        provider: 'apify',
        caption: 'Test caption',
        transcript: null,
      });
      const mockRecipe = createMockRecipe();
      const mockDecision = createMockFallbackDecision(false);

      mockContentServiceAcquire.mockResolvedValue(mockContent);
      mockCaptionExtract.mockResolvedValue(mockRecipe);
      mockConfidenceEvaluate.mockReturnValue(mockDecision);

      const result = await service.extract('https://tiktok.com/@user/video/123');

      expect(result.content.provider).toBe('apify');
      expect(result.content.hasCaption).toBe(true);
      expect(result.content.hasTranscript).toBe(false);
      expect(result.platform).toBe('tiktok');
    });
  });

  describe('recipe merging', () => {
    let service: ExtractionService;

    beforeEach(() => {
      service = new ExtractionService({
        openaiApiKey: 'test-key',
        enableVisualFallback: true,
      });
    });

    it('should merge ingredients without duplicates', async () => {
      const mockContent = createMockContent();
      const captionRecipe = createMockRecipe({
        ingredients: [
          { raw: '1 lb pasta', quantity: 1, unit: 'lb', name: 'pasta', preparation: null },
          { raw: '4 cloves garlic', quantity: 4, unit: 'cloves', name: 'garlic', preparation: null },
        ],
        confidence: createMockConfidence({ overall: 0.5 }),
      });
      const visualRecipe = createMockRecipe({
        ingredients: [
          { raw: '1 lb pasta', quantity: 1, unit: 'lb', name: 'pasta', preparation: null }, // duplicate
          { raw: '2 tbsp butter', quantity: 2, unit: 'tbsp', name: 'butter', preparation: null }, // new
        ],
        confidence: createMockConfidence({ overall: 0.7 }),
        source: 'visual',
      });
      const mockDecision = createMockFallbackDecision(true);

      mockContentServiceAcquire.mockResolvedValue(mockContent);
      mockCaptionExtract.mockResolvedValue(captionRecipe);
      mockConfidenceEvaluate.mockReturnValue(mockDecision);
      mockVisualExtract.mockResolvedValue({
        frames: 5,
        successful: 5,
        analyses: [],
        extraction: { dishName: 'Pasta', ingredients: [], instructions: [], confidence: 0.7 },
        isUsable: true,
        totalTimeMs: 5000,
      });
      mockToExtractedRecipe.mockReturnValue(visualRecipe);

      const result = await service.extract('https://tiktok.com/@user/video/123');

      // Should have 3 ingredients (pasta deduplicated)
      expect(result.recipe.ingredients).toHaveLength(3);
      const ingredientNames = result.recipe.ingredients.map((i) => i.name);
      expect(ingredientNames).toContain('pasta');
      expect(ingredientNames).toContain('garlic');
      expect(ingredientNames).toContain('butter');
    });

    it('should take maximum confidence values when merging', async () => {
      const mockContent = createMockContent();
      const captionRecipe = createMockRecipe({
        confidence: createMockConfidence({
          overall: 0.6,
          title: 0.9,
          ingredients: 0.5,
          instructions: 0.7,
        }),
      });
      const visualRecipe = createMockRecipe({
        confidence: createMockConfidence({
          overall: 0.7,
          title: 0.6,
          ingredients: 0.8,
          instructions: 0.6,
        }),
        source: 'visual',
      });
      const mockDecision = createMockFallbackDecision(true);

      mockContentServiceAcquire.mockResolvedValue(mockContent);
      mockCaptionExtract.mockResolvedValue(captionRecipe);
      mockConfidenceEvaluate.mockReturnValue(mockDecision);
      mockVisualExtract.mockResolvedValue({
        frames: 5,
        successful: 5,
        analyses: [],
        extraction: { dishName: 'Pasta', ingredients: [], instructions: [], confidence: 0.7 },
        isUsable: true,
        totalTimeMs: 5000,
      });
      mockToExtractedRecipe.mockReturnValue(visualRecipe);

      const result = await service.extract('https://tiktok.com/@user/video/123');

      expect(result.recipe.confidence.overall).toBe(0.7); // max(0.6, 0.7)
      expect(result.recipe.confidence.title).toBe(0.9); // max(0.9, 0.6)
      expect(result.recipe.confidence.ingredients).toBe(0.8); // max(0.5, 0.8)
      expect(result.recipe.confidence.instructions).toBe(0.7); // max(0.7, 0.6)
    });

    it('should prefer primary title when confidence is higher', async () => {
      const mockContent = createMockContent();
      const captionRecipe = createMockRecipe({
        title: 'Garlic Butter Pasta',
        confidence: createMockConfidence({ title: 0.9, overall: 0.5 }),
      });
      const visualRecipe = createMockRecipe({
        title: 'Pasta Dish',
        confidence: createMockConfidence({ title: 0.5, overall: 0.7 }),
        source: 'visual',
      });
      const mockDecision = createMockFallbackDecision(true);

      mockContentServiceAcquire.mockResolvedValue(mockContent);
      mockCaptionExtract.mockResolvedValue(captionRecipe);
      mockConfidenceEvaluate.mockReturnValue(mockDecision);
      mockVisualExtract.mockResolvedValue({
        frames: 5,
        successful: 5,
        analyses: [],
        extraction: { dishName: 'Pasta Dish', ingredients: [], instructions: [], confidence: 0.7 },
        isUsable: true,
        totalTimeMs: 5000,
      });
      mockToExtractedRecipe.mockReturnValue(visualRecipe);

      const result = await service.extract('https://tiktok.com/@user/video/123');

      expect(result.recipe.title).toBe('Garlic Butter Pasta');
    });
  });

  describe('disabled visual fallback', () => {
    it('should not attempt visual extraction when disabled', async () => {
      const service = new ExtractionService({
        openaiApiKey: 'test-key',
        enableVisualFallback: false,
      });

      const mockContent = createMockContent();
      const lowConfidenceRecipe = createMockRecipe({
        confidence: createMockConfidence({ overall: 0.4 }),
      });
      const mockDecision = createMockFallbackDecision(true);

      mockContentServiceAcquire.mockResolvedValue(mockContent);
      mockCaptionExtract.mockResolvedValue(lowConfidenceRecipe);
      mockConfidenceEvaluate.mockReturnValue(mockDecision);

      const result = await service.extract('https://tiktok.com/@user/video/123');

      expect(result.usedVisualFallback).toBe(false);
      expect(mockVisualExtract).not.toHaveBeenCalled();
      expect(result.recipe.confidence.overall).toBe(0.4);
    });
  });

  describe('verbose logging', () => {
    it('should log progress when verbose is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const service = new ExtractionService({
        openaiApiKey: 'test-key',
        verbose: true,
      });

      const mockContent = createMockContent();
      const mockRecipe = createMockRecipe();
      const mockDecision = createMockFallbackDecision(false);

      mockContentServiceAcquire.mockResolvedValue(mockContent);
      mockCaptionExtract.mockResolvedValue(mockRecipe);
      mockConfidenceEvaluate.mockReturnValue(mockDecision);

      await service.extract('https://tiktok.com/@user/video/123');

      expect(consoleSpy).toHaveBeenCalled();
      const logCalls = consoleSpy.mock.calls.map((c) => c[0]);
      expect(logCalls.some((c) => c.includes('[ExtractionService]'))).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should not log when verbose is disabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const service = new ExtractionService({
        openaiApiKey: 'test-key',
        verbose: false,
      });

      const mockContent = createMockContent();
      const mockRecipe = createMockRecipe();
      const mockDecision = createMockFallbackDecision(false);

      mockContentServiceAcquire.mockResolvedValue(mockContent);
      mockCaptionExtract.mockResolvedValue(mockRecipe);
      mockConfidenceEvaluate.mockReturnValue(mockDecision);

      await service.extract('https://tiktok.com/@user/video/123');

      const logCalls = consoleSpy.mock.calls.map((c) => c[0]);
      expect(logCalls.some((c) => c.includes('[ExtractionService]'))).toBe(false);

      consoleSpy.mockRestore();
    });
  });
});
