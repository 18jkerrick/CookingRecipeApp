import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FrameExtractor,
  createFrameExtractor,
  FrameExtractionError,
} from '../../../../packages/core/src/extraction/visual/frame-extractor';

describe('FrameExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create extractor with default config', () => {
      const extractor = new FrameExtractor();
      expect(extractor).toBeInstanceOf(FrameExtractor);
    });

    it('should create extractor with custom config', () => {
      const extractor = new FrameExtractor({
        maxFrames: 10,
        minFrameSize: 500,
        timeout: 60000,
      });
      expect(extractor).toBeInstanceOf(FrameExtractor);
    });
  });

  describe('createFrameExtractor factory', () => {
    it('should create extractor using factory function', () => {
      const extractor = createFrameExtractor({ maxFrames: 5 });
      expect(extractor).toBeInstanceOf(FrameExtractor);
    });

    it('should create extractor with no config', () => {
      const extractor = createFrameExtractor();
      expect(extractor).toBeInstanceOf(FrameExtractor);
    });
  });

  describe('generateTimestamps', () => {
    it('should generate timestamps for short videos (<60s)', () => {
      const extractor = new FrameExtractor();
      const timestamps = extractor.generateTimestamps(30);

      // Should have reasonable number of timestamps
      expect(timestamps.length).toBeGreaterThan(0);
      expect(timestamps.length).toBeLessThanOrEqual(6);

      // All timestamps should be within video duration
      timestamps.forEach((ts) => {
        expect(ts).toBeGreaterThanOrEqual(0);
        expect(ts).toBeLessThan(30);
      });

      // Should be sorted
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
      }
    });

    it('should generate timestamps for medium videos (1-3min)', () => {
      const extractor = new FrameExtractor();
      const timestamps = extractor.generateTimestamps(120);

      expect(timestamps.length).toBeGreaterThan(0);
      expect(timestamps.length).toBeLessThanOrEqual(10);

      timestamps.forEach((ts) => {
        expect(ts).toBeGreaterThanOrEqual(0);
        expect(ts).toBeLessThan(120);
      });
    });

    it('should generate timestamps for long videos (>3min)', () => {
      const extractor = new FrameExtractor();
      const timestamps = extractor.generateTimestamps(300);

      expect(timestamps.length).toBeGreaterThan(0);

      timestamps.forEach((ts) => {
        expect(ts).toBeGreaterThanOrEqual(0);
        expect(ts).toBeLessThan(300);
      });
    });

    it('should include early timestamps for intro frames', () => {
      const extractor = new FrameExtractor();
      const timestamps = extractor.generateTimestamps(100);

      // Should have timestamps in the first 15%
      const hasEarlyTimestamp = timestamps.some((ts) => ts < 15);
      expect(hasEarlyTimestamp).toBe(true);
    });

    it('should include late timestamps for outro frames', () => {
      const extractor = new FrameExtractor();
      const timestamps = extractor.generateTimestamps(100);

      // Should have timestamps in the last 20%
      const hasLateTimestamp = timestamps.some((ts) => ts > 80);
      expect(hasLateTimestamp).toBe(true);
    });

    it('should handle very short videos', () => {
      const extractor = new FrameExtractor();
      const timestamps = extractor.generateTimestamps(5);

      expect(timestamps.length).toBeGreaterThan(0);
      timestamps.forEach((ts) => {
        expect(ts).toBeLessThan(5);
      });
    });

    it('should handle very long videos', () => {
      const extractor = new FrameExtractor();
      const timestamps = extractor.generateTimestamps(600);

      expect(timestamps.length).toBeGreaterThan(0);
      // Should cap timestamps to reasonable bounds
      timestamps.forEach((ts) => {
        expect(ts).toBeLessThan(600);
      });
    });
  });

  describe('FrameExtractionError', () => {
    it('should create error with all properties', () => {
      const cause = new Error('root cause');
      const error = new FrameExtractionError(
        'Test error',
        'https://example.com/video',
        cause,
        true
      );

      expect(error.message).toBe('Test error');
      expect(error.videoUrl).toBe('https://example.com/video');
      expect(error.cause).toBe(cause);
      expect(error.isRetryable).toBe(true);
      expect(error.name).toBe('FrameExtractionError');
    });

    it('should default isRetryable to false', () => {
      const error = new FrameExtractionError('Test error', 'https://example.com');

      expect(error.isRetryable).toBe(false);
    });

    it('should be instanceof Error', () => {
      const error = new FrameExtractionError('Test', 'https://example.com');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FrameExtractionError);
    });

    it('should allow undefined cause', () => {
      const error = new FrameExtractionError('Test', 'https://example.com', undefined, true);
      expect(error.cause).toBeUndefined();
    });
  });
});
