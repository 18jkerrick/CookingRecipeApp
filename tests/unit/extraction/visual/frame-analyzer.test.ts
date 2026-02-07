import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';

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
  FrameAnalyzer,
  createFrameAnalyzer,
  type FrameAnalyzerConfig,
  type FrameAnalysis,
} from '../../../../packages/core/src/extraction/visual/frame-analyzer';

describe('FrameAnalyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should throw error without API key', () => {
      expect(() => {
        new FrameAnalyzer({ apiKey: '' });
      }).toThrow('OpenAI API key is required');
    });

    it('should create analyzer with API key', () => {
      const analyzer = new FrameAnalyzer({ apiKey: 'test-key' });
      expect(analyzer).toBeInstanceOf(FrameAnalyzer);
    });

    it('should create analyzer with custom config', () => {
      const analyzer = new FrameAnalyzer({
        apiKey: 'test-key',
        model: 'gpt-4o',
        maxConcurrent: 5,
        retryAttempts: 5,
        batchDelay: 2000,
      });
      expect(analyzer).toBeInstanceOf(FrameAnalyzer);
    });
  });

  describe('createFrameAnalyzer factory', () => {
    it('should create analyzer using factory', () => {
      const analyzer = createFrameAnalyzer({ apiKey: 'test-key' });
      expect(analyzer).toBeInstanceOf(FrameAnalyzer);
    });
  });

  describe('analyzeFrame', () => {
    it('should analyze a single frame and return structured result', async () => {
      const analyzer = new FrameAnalyzer({ apiKey: 'test-key' });

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                ingredients: ['chicken breast', 'garlic'],
                actions: ['searing', 'flipping'],
                equipment: ['pan', 'spatula'],
                foodState: 'cooking',
                hasTextOverlay: false,
                observations: 'Chicken being seared in a pan',
              }),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const frameBuffer = Buffer.alloc(1000);
      const result = await analyzer.analyzeFrame(frameBuffer, 0, 5);

      expect(result).toMatchObject({
        frameIndex: 0,
        stage: 'intro',
        ingredients: ['chicken breast', 'garlic'],
        actions: ['searing', 'flipping'],
        equipment: ['pan', 'spatula'],
        foodState: 'cooking',
        hasText: false,
      });
    });

    it('should handle non-JSON response gracefully', async () => {
      const analyzer = new FrameAnalyzer({ apiKey: 'test-key' });

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Just some plain text observation about cooking',
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const frameBuffer = Buffer.alloc(1000);
      const result = await analyzer.analyzeFrame(frameBuffer, 2, 5);

      // Should fallback to default structure with content as observations
      expect(result.frameIndex).toBe(2);
      expect(result.observations).toContain('plain text observation');
      expect(result.ingredients).toEqual([]);
      expect(result.actions).toEqual([]);
    });

    it('should determine cooking stage based on frame position', async () => {
      const analyzer = new FrameAnalyzer({ apiKey: 'test-key' });

      const mockResponse = {
        choices: [{ message: { content: '{}' } }],
      };
      mockCreate.mockResolvedValue(mockResponse);

      const frameBuffer = Buffer.alloc(1000);

      // First frame should be intro
      const introResult = await analyzer.analyzeFrame(frameBuffer, 0, 10);
      expect(introResult.stage).toBe('intro');

      // Middle frame should be cooking
      const cookingResult = await analyzer.analyzeFrame(frameBuffer, 5, 10);
      expect(cookingResult.stage).toBe('cooking');

      // Last frame should be outro
      const outroResult = await analyzer.analyzeFrame(frameBuffer, 9, 10);
      expect(outroResult.stage).toBe('outro');
    });
  });

  describe('analyzeAll', () => {
    it('should analyze all frames and return results', async () => {
      const analyzer = new FrameAnalyzer({
        apiKey: 'test-key',
        maxConcurrent: 2,
        batchDelay: 0,
      });

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                ingredients: ['ingredient'],
                actions: ['cooking'],
                equipment: ['pan'],
                foodState: 'cooking',
                hasTextOverlay: false,
                observations: 'Cooking in progress',
              }),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const frames = [
        Buffer.alloc(1000),
        Buffer.alloc(1000),
        Buffer.alloc(1000),
      ];

      const resultPromise = analyzer.analyzeAll(frames);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.successCount).toBe(3);
      expect(result.analyses.length).toBe(3);
      expect(result.failedFrames).toEqual([]);
    });

    it('should track failed frames', async () => {
      const analyzer = new FrameAnalyzer({
        apiKey: 'test-key',
        maxConcurrent: 1,
        retryAttempts: 1,
        batchDelay: 0,
      });

      // First call succeeds, second fails
      let callCount = 0;
      mockCreate.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('API Error'));
        }
        return Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  ingredients: [],
                  actions: [],
                  equipment: [],
                  foodState: 'unknown',
                  hasTextOverlay: false,
                  observations: 'Test',
                }),
              },
            },
          ],
        });
      });

      const frames = [Buffer.alloc(1000), Buffer.alloc(1000)];

      const resultPromise = analyzer.analyzeAll(frames);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      expect(result.successCount).toBe(1);
      expect(result.failedFrames).toContain(1);
    });

    it('should process frames in batches', async () => {
      const analyzer = new FrameAnalyzer({
        apiKey: 'test-key',
        maxConcurrent: 2,
        batchDelay: 100,
      });

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                ingredients: [],
                actions: [],
                equipment: [],
                foodState: 'unknown',
                hasTextOverlay: false,
                observations: 'Test',
              }),
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const frames = [
        Buffer.alloc(1000),
        Buffer.alloc(1000),
        Buffer.alloc(1000),
        Buffer.alloc(1000),
      ];

      const resultPromise = analyzer.analyzeAll(frames);

      // Advance through batch delays
      await vi.advanceTimersByTimeAsync(200);
      await vi.runAllTimersAsync();

      const result = await resultPromise;
      expect(result.successCount).toBe(4);
    });

    it('should sort results by frame index', async () => {
      const analyzer = new FrameAnalyzer({
        apiKey: 'test-key',
        maxConcurrent: 3,
        batchDelay: 0,
      });

      let callIndex = 0;
      mockCreate.mockImplementation(() => {
        const idx = callIndex++;
        return Promise.resolve({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  ingredients: [`ingredient-${idx}`],
                  actions: [],
                  equipment: [],
                  foodState: 'unknown',
                  hasTextOverlay: false,
                  observations: `Frame ${idx}`,
                }),
              },
            },
          ],
        });
      });

      const frames = [
        Buffer.alloc(1000),
        Buffer.alloc(1000),
        Buffer.alloc(1000),
      ];

      const resultPromise = analyzer.analyzeAll(frames);
      await vi.runAllTimersAsync();
      const result = await resultPromise;

      // Should be sorted by frameIndex
      for (let i = 1; i < result.analyses.length; i++) {
        expect(result.analyses[i].frameIndex).toBeGreaterThanOrEqual(
          result.analyses[i - 1].frameIndex
        );
      }
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully in analyzeAll', async () => {
      vi.useRealTimers();

      const analyzer = new FrameAnalyzer({
        apiKey: 'test-key',
        retryAttempts: 1,
        retryDelay: 1,
        batchDelay: 0,
      });

      // Make API always fail
      mockCreate.mockRejectedValue(new Error('API Error'));

      const frames = [Buffer.alloc(1000)];
      const result = await analyzer.analyzeAll(frames);

      // Should handle failure and report it
      expect(result.failedFrames).toContain(0);
      expect(result.successCount).toBe(0);

      vi.useFakeTimers();
    });

    it('should return partial results when some frames fail', async () => {
      vi.useRealTimers();

      const analyzer = new FrameAnalyzer({
        apiKey: 'test-key',
        retryAttempts: 1,
        retryDelay: 1,
        batchDelay: 0,
        maxConcurrent: 1,
      });

      let callCount = 0;
      mockCreate.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    ingredients: ['success'],
                    actions: [],
                    equipment: [],
                    foodState: 'cooking',
                    hasTextOverlay: false,
                    observations: 'Success',
                  }),
                },
              },
            ],
          });
        }
        return Promise.reject(new Error('API Error'));
      });

      const frames = [Buffer.alloc(1000), Buffer.alloc(1000)];
      const result = await analyzer.analyzeAll(frames);

      // First frame succeeds, second fails
      expect(result.successCount).toBe(1);
      expect(result.failedFrames).toContain(1);

      vi.useFakeTimers();
    });
  });
});
