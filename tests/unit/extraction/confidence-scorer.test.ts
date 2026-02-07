import { describe, it, expect, beforeEach } from 'vitest';
import type { ConfidenceScore } from '../../../packages/core/src/extraction/schemas/recipe-schema';
import {
  ConfidenceScorer,
  createConfidenceScorer,
  type ConfidenceScorerConfig,
  type FallbackDecision,
} from '../../../packages/core/src/extraction/confidence-scorer';

// ============================================================================
// Test Data Factories
// ============================================================================

function createHighConfidence(): ConfidenceScore {
  return {
    overall: 0.9,
    title: 0.95,
    ingredients: 0.85,
    instructions: 0.88,
    hasQuantities: true,
    hasSteps: true,
    isCompleteRecipe: true,
    reasoning: 'Complete recipe with all ingredients and clear steps',
  };
}

function createLowConfidence(): ConfidenceScore {
  return {
    overall: 0.4,
    title: 0.5,
    ingredients: 0.3,
    instructions: 0.35,
    hasQuantities: false,
    hasSteps: false,
    isCompleteRecipe: false,
    reasoning: 'Partial recipe, missing most quantities and steps',
  };
}

function createPartialConfidence(): ConfidenceScore {
  return {
    overall: 0.65,
    title: 0.8,
    ingredients: 0.55,
    instructions: 0.7,
    hasQuantities: false,
    hasSteps: true,
    isCompleteRecipe: false,
    reasoning: 'Has steps but missing ingredient quantities',
  };
}

function createAtThresholdConfidence(): ConfidenceScore {
  return {
    overall: 0.7,
    title: 0.7,
    ingredients: 0.6,
    instructions: 0.6,
    hasQuantities: true,
    hasSteps: true,
    isCompleteRecipe: true,
    reasoning: 'Exactly at confidence thresholds',
  };
}

function createAllZeroConfidence(): ConfidenceScore {
  return {
    overall: 0,
    title: 0,
    ingredients: 0,
    instructions: 0,
    hasQuantities: false,
    hasSteps: false,
    isCompleteRecipe: false,
    reasoning: 'No recipe content found',
  };
}

function createPerfectConfidence(): ConfidenceScore {
  return {
    overall: 1,
    title: 1,
    ingredients: 1,
    instructions: 1,
    hasQuantities: true,
    hasSteps: true,
    isCompleteRecipe: true,
    reasoning: 'Perfect extraction with complete recipe',
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('ConfidenceScorer', () => {
  let scorer: ConfidenceScorer;

  beforeEach(() => {
    scorer = new ConfidenceScorer();
  });

  // --------------------------------------------------------------------------
  // Constructor & Defaults
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    it('uses default thresholds when no config provided', () => {
      const defaultScorer = new ConfidenceScorer();
      const confidence = createAtThresholdConfidence();
      const decision = defaultScorer.evaluate(confidence);

      // At exactly 0.7 overall, 0.6 ingredients, 0.6 instructions should pass
      expect(decision.shouldFallback).toBe(false);
    });

    it('accepts custom threshold overrides', () => {
      const customScorer = new ConfidenceScorer({
        overallThreshold: 0.9,
        ingredientThreshold: 0.8,
        instructionThreshold: 0.8,
      });

      const confidence = createHighConfidence(); // 0.9, 0.85, 0.88
      const decision = customScorer.evaluate(confidence);

      // 0.85 ingredients < 0.8 threshold should pass, 0.88 instructions > 0.8 threshold
      expect(decision.shouldFallback).toBe(false);
    });

    it('handles partial config with only some overrides', () => {
      const partialScorer = new ConfidenceScorer({
        overallThreshold: 0.8, // only override this
      });

      // Should use 0.8 for overall, defaults for others (0.6, 0.6)
      const confidence: ConfidenceScore = {
        overall: 0.75, // below custom 0.8
        title: 0.8,
        ingredients: 0.65, // above default 0.6
        instructions: 0.65, // above default 0.6
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Test',
      };

      const decision = partialScorer.evaluate(confidence);
      expect(decision.shouldFallback).toBe(true);
      expect(decision.reason).toContain('overall'); // Field name in weak confidence message
    });
  });

  // --------------------------------------------------------------------------
  // evaluate() - High Confidence Cases
  // --------------------------------------------------------------------------

  describe('evaluate() - high confidence cases', () => {
    it('returns shouldFallback=false when all scores above thresholds', () => {
      const confidence = createHighConfidence();
      const decision = scorer.evaluate(confidence);

      expect(decision.shouldFallback).toBe(false);
      expect(decision.score).toBeGreaterThan(0.7);
    });

    it('returns shouldFallback=false when overall=0.9, ingredients=0.8, instructions=0.8', () => {
      const confidence: ConfidenceScore = {
        overall: 0.9,
        title: 0.9,
        ingredients: 0.8,
        instructions: 0.8,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'High quality extraction',
      };

      const decision = scorer.evaluate(confidence);

      expect(decision.shouldFallback).toBe(false);
    });

    it('includes reasoning in the decision', () => {
      const confidence = createHighConfidence();
      const decision = scorer.evaluate(confidence);

      expect(decision.reason).toBeDefined();
      expect(decision.reason.length).toBeGreaterThan(0);
      expect(decision.reason).toContain('confidence thresholds');
    });
  });

  // --------------------------------------------------------------------------
  // evaluate() - Low Confidence Cases
  // --------------------------------------------------------------------------

  describe('evaluate() - low confidence cases', () => {
    it('returns shouldFallback=true when overall below threshold', () => {
      const confidence: ConfidenceScore = {
        overall: 0.5, // below 0.7
        title: 0.8,
        ingredients: 0.7,
        instructions: 0.7,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Low overall confidence',
      };

      const decision = scorer.evaluate(confidence);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.missingFields).toContain('overall');
    });

    it('returns shouldFallback=true when ingredients below threshold', () => {
      const confidence: ConfidenceScore = {
        overall: 0.8,
        title: 0.8,
        ingredients: 0.4, // below 0.6
        instructions: 0.7,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Low ingredient confidence',
      };

      const decision = scorer.evaluate(confidence);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.missingFields).toContain('ingredients');
    });

    it('returns shouldFallback=true when instructions below threshold', () => {
      const confidence: ConfidenceScore = {
        overall: 0.8,
        title: 0.8,
        ingredients: 0.7,
        instructions: 0.4, // below 0.6
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Low instruction confidence',
      };

      const decision = scorer.evaluate(confidence);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.missingFields).toContain('instructions');
    });

    it('returns shouldFallback=true when isCompleteRecipe=false', () => {
      const confidence: ConfidenceScore = {
        overall: 0.8,
        title: 0.9,
        ingredients: 0.7,
        instructions: 0.7,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: false, // incomplete
        reasoning: 'Not a complete recipe',
      };

      const decision = scorer.evaluate(confidence);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.reason).toContain('not complete');
    });

    it('identifies correct missingFields', () => {
      const confidence = createLowConfidence();
      const decision = scorer.evaluate(confidence);

      expect(decision.missingFields).toContain('ingredients');
      expect(decision.missingFields).toContain('instructions');
    });
  });

  // --------------------------------------------------------------------------
  // evaluate() - Edge Cases
  // --------------------------------------------------------------------------

  describe('evaluate() - edge cases', () => {
    it('handles exactly-at-threshold values (0.7 should pass if threshold is 0.7)', () => {
      const confidence = createAtThresholdConfidence();
      const decision = scorer.evaluate(confidence);

      expect(decision.shouldFallback).toBe(false);
    });

    it('handles all zeros gracefully', () => {
      const confidence = createAllZeroConfidence();
      const decision = scorer.evaluate(confidence);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.score).toBe(0);
      expect(decision.missingFields).toContain('overall');
      expect(decision.missingFields).toContain('ingredients');
      expect(decision.missingFields).toContain('instructions');
    });

    it('handles all ones correctly', () => {
      const confidence = createPerfectConfidence();
      const decision = scorer.evaluate(confidence);

      expect(decision.shouldFallback).toBe(false);
      expect(decision.score).toBe(1);
      expect(decision.missingFields).toHaveLength(0);
    });

    it('handles just-below-threshold values', () => {
      const confidence: ConfidenceScore = {
        overall: 0.69, // just below 0.7
        title: 0.8,
        ingredients: 0.6,
        instructions: 0.6,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Just below threshold',
      };

      const decision = scorer.evaluate(confidence);

      expect(decision.shouldFallback).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // computeQualityScore()
  // --------------------------------------------------------------------------

  describe('computeQualityScore()', () => {
    it('returns weighted average (40% overall, 30% ingredients, 30% instructions)', () => {
      const confidence: ConfidenceScore = {
        overall: 0.8,
        title: 0.9,
        ingredients: 0.7,
        instructions: 0.6,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Test weighted average',
      };

      // Expected: 0.8*0.4 + 0.7*0.3 + 0.6*0.3 = 0.32 + 0.21 + 0.18 = 0.71
      const score = scorer.computeQualityScore(confidence);

      expect(score).toBeCloseTo(0.71, 2);
    });

    it('applies penalty when requireQuantities=true and hasQuantities=false', () => {
      const strictScorer = new ConfidenceScorer({ requireQuantities: true });
      const confidence: ConfidenceScore = {
        overall: 0.8,
        title: 0.9,
        ingredients: 0.8,
        instructions: 0.8,
        hasQuantities: false, // penalty applies
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Missing quantities',
      };

      const score = strictScorer.computeQualityScore(confidence);
      const baseScore = 0.8 * 0.4 + 0.8 * 0.3 + 0.8 * 0.3; // 0.8
      const expectedWithPenalty = baseScore - 0.1; // 0.7

      expect(score).toBeCloseTo(expectedWithPenalty, 2);
    });

    it('applies penalty when requireSteps=true and hasSteps=false', () => {
      // Default requireSteps is true
      const confidence: ConfidenceScore = {
        overall: 0.8,
        title: 0.9,
        ingredients: 0.8,
        instructions: 0.8,
        hasQuantities: true,
        hasSteps: false, // penalty applies
        isCompleteRecipe: true,
        reasoning: 'Missing steps',
      };

      const score = scorer.computeQualityScore(confidence);
      const baseScore = 0.8 * 0.4 + 0.8 * 0.3 + 0.8 * 0.3; // 0.8
      const expectedWithPenalty = baseScore - 0.1; // 0.7

      expect(score).toBeCloseTo(expectedWithPenalty, 2);
    });

    it('clamps result to [0, 1] - minimum', () => {
      const strictScorer = new ConfidenceScorer({
        requireQuantities: true,
        requireSteps: true,
      });
      const confidence = createAllZeroConfidence();

      const score = strictScorer.computeQualityScore(confidence);

      // 0*0.4 + 0*0.3 + 0*0.3 - 0.1 - 0.1 = -0.2, should clamp to 0
      expect(score).toBe(0);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('clamps result to [0, 1] - maximum', () => {
      const confidence = createPerfectConfidence();

      const score = scorer.computeQualityScore(confidence);

      // 1*0.4 + 1*0.3 + 1*0.3 = 1.0
      expect(score).toBe(1);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('calculates example: overall=0.8, ingredients=0.7, instructions=0.6 → 0.71', () => {
      const confidence: ConfidenceScore = {
        overall: 0.8,
        title: 0.8,
        ingredients: 0.7,
        instructions: 0.6,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Example calculation',
      };

      // Expected: 0.8*0.4 + 0.7*0.3 + 0.6*0.3 = 0.32 + 0.21 + 0.18 = 0.71
      const score = scorer.computeQualityScore(confidence);

      expect(score).toBeCloseTo(0.71, 2);
    });
  });

  // --------------------------------------------------------------------------
  // getMissingFields()
  // --------------------------------------------------------------------------

  describe('getMissingFields()', () => {
    it('returns empty array when all fields above threshold', () => {
      const confidence = createHighConfidence();

      const missing = scorer.getMissingFields(confidence);

      expect(missing).toEqual([]);
    });

    it('returns ["ingredients"] when ingredients below threshold', () => {
      const confidence: ConfidenceScore = {
        overall: 0.8,
        title: 0.9,
        ingredients: 0.5, // below 0.6
        instructions: 0.7,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Low ingredients',
      };

      const missing = scorer.getMissingFields(confidence);

      expect(missing).toContain('ingredients');
      expect(missing).not.toContain('instructions');
    });

    it('returns ["instructions"] when instructions below threshold', () => {
      const confidence: ConfidenceScore = {
        overall: 0.8,
        title: 0.9,
        ingredients: 0.7,
        instructions: 0.5, // below 0.6
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Low instructions',
      };

      const missing = scorer.getMissingFields(confidence);

      expect(missing).toContain('instructions');
      expect(missing).not.toContain('ingredients');
    });

    it('returns empty when title is 0 but other fields pass thresholds', () => {
      // Note: The implementation doesn't track title as a separate threshold field
      // Title confidence is informational but not used in fallback decisions
      const confidence: ConfidenceScore = {
        overall: 0.8,
        title: 0, // explicitly zero, but not checked
        ingredients: 0.7,
        instructions: 0.7,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'No title found',
      };

      const missing = scorer.getMissingFields(confidence);

      // Title is not in the threshold-based checks
      expect(missing).toEqual([]);
    });

    it('returns multiple fields when multiple below threshold', () => {
      const confidence = createLowConfidence();

      const missing = scorer.getMissingFields(confidence);

      expect(missing).toContain('ingredients');
      expect(missing).toContain('instructions');
      expect(missing.length).toBeGreaterThanOrEqual(2);
    });

    it('respects custom thresholds', () => {
      const strictScorer = new ConfidenceScorer({
        ingredientThreshold: 0.9,
        instructionThreshold: 0.9,
      });

      const confidence: ConfidenceScore = {
        overall: 0.85,
        title: 0.9,
        ingredients: 0.85, // below strict 0.9
        instructions: 0.85, // below strict 0.9
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Below strict thresholds',
      };

      const missing = strictScorer.getMissingFields(confidence);

      expect(missing).toContain('ingredients');
      expect(missing).toContain('instructions');
    });
  });

  // --------------------------------------------------------------------------
  // isComplete()
  // --------------------------------------------------------------------------

  describe('isComplete()', () => {
    it('returns true when isCompleteRecipe=true AND overall >= threshold', () => {
      const confidence = createHighConfidence();

      const complete = scorer.isComplete(confidence);

      expect(complete).toBe(true);
    });

    it('returns false when isCompleteRecipe=false', () => {
      const confidence: ConfidenceScore = {
        overall: 0.9,
        title: 0.9,
        ingredients: 0.8,
        instructions: 0.8,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: false, // incomplete
        reasoning: 'Not complete',
      };

      const complete = scorer.isComplete(confidence);

      expect(complete).toBe(false);
    });

    it('returns false when overall below threshold', () => {
      const confidence: ConfidenceScore = {
        overall: 0.5, // below 0.7
        title: 0.9,
        ingredients: 0.8,
        instructions: 0.8,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true, // complete but low confidence
        reasoning: 'Low confidence',
      };

      const complete = scorer.isComplete(confidence);

      expect(complete).toBe(false);
    });

    it('returns true at exactly threshold', () => {
      const confidence = createAtThresholdConfidence();

      const complete = scorer.isComplete(confidence);

      expect(complete).toBe(true);
    });

    it('returns false when both conditions fail', () => {
      const confidence = createLowConfidence();

      const complete = scorer.isComplete(confidence);

      expect(complete).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // getRecommendation()
  // --------------------------------------------------------------------------

  describe('getRecommendation()', () => {
    it('returns appropriate message for shouldFallback=true', () => {
      const decision: FallbackDecision = {
        shouldFallback: true,
        reason: 'Overall confidence 0.5 below threshold 0.7',
        missingFields: [],
        score: 0.5,
      };

      const recommendation = scorer.getRecommendation(decision);

      // Actual format: "Extraction incomplete (quality: X%). Recommend visual extraction for verification."
      expect(recommendation).toContain('Recommend visual extraction');
      expect(recommendation).toContain('50%');
    });

    it('returns appropriate message for shouldFallback=false', () => {
      const decision: FallbackDecision = {
        shouldFallback: false,
        reason: 'Confidence meets all thresholds',
        missingFields: [],
        score: 0.85,
      };

      const recommendation = scorer.getRecommendation(decision);

      // Actual format: "Extraction successful (quality: X%). No additional extraction needed."
      expect(recommendation).toContain('successful');
      expect(recommendation).toContain('No additional extraction needed');
    });

    it('includes missing fields in recommendation when present', () => {
      const decision: FallbackDecision = {
        shouldFallback: true,
        reason: 'Ingredient confidence too low',
        missingFields: ['ingredients', 'instructions'],
        score: 0.4,
      };

      const recommendation = scorer.getRecommendation(decision);

      // Actual format: "Extraction has gaps in ingredients, instructions (quality: X%). Recommend visual extraction to supplement."
      expect(recommendation).toContain('ingredients');
      expect(recommendation).toContain('instructions');
      expect(recommendation).toContain('gaps');
    });

    it('handles empty missingFields gracefully', () => {
      const decision: FallbackDecision = {
        shouldFallback: true,
        reason: 'Recipe is not complete',
        missingFields: [],
        score: 0.6,
      };

      const recommendation = scorer.getRecommendation(decision);

      // Actual format: "Extraction incomplete (quality: X%). Recommend visual extraction for verification."
      expect(recommendation).not.toContain('gaps');
      expect(recommendation).toContain('Recommend visual extraction');
    });
  });

  // --------------------------------------------------------------------------
  // Custom Thresholds
  // --------------------------------------------------------------------------

  describe('custom thresholds', () => {
    it('custom overallThreshold=0.9 requires higher scores', () => {
      const strictScorer = new ConfidenceScorer({ overallThreshold: 0.9 });

      const confidence: ConfidenceScore = {
        overall: 0.85, // would pass default 0.7, fails strict 0.9
        title: 0.9,
        ingredients: 0.8,
        instructions: 0.8,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Good but not excellent',
      };

      const decision = strictScorer.evaluate(confidence);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.missingFields).toContain('overall');
    });

    it('custom ingredientThreshold=0.8 requires higher ingredient scores', () => {
      const strictScorer = new ConfidenceScorer({ ingredientThreshold: 0.8 });

      const confidence: ConfidenceScore = {
        overall: 0.9,
        title: 0.9,
        ingredients: 0.75, // would pass default 0.6, fails strict 0.8
        instructions: 0.8,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Good ingredients but not enough',
      };

      const decision = strictScorer.evaluate(confidence);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.missingFields).toContain('ingredients');
    });

    it('custom instructionThreshold=0.8 requires higher instruction scores', () => {
      const strictScorer = new ConfidenceScorer({ instructionThreshold: 0.8 });

      const confidence: ConfidenceScore = {
        overall: 0.9,
        title: 0.9,
        ingredients: 0.85,
        instructions: 0.75, // would pass default 0.6, fails strict 0.8
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Good instructions but not enough',
      };

      const decision = strictScorer.evaluate(confidence);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.missingFields).toContain('instructions');
    });

    it('requireQuantities=true fails recipes without quantities', () => {
      const strictScorer = new ConfidenceScorer({ requireQuantities: true });

      const confidence: ConfidenceScore = {
        overall: 0.9,
        title: 0.9,
        ingredients: 0.8,
        instructions: 0.8,
        hasQuantities: false, // fails requireQuantities
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Good but missing quantities',
      };

      const decision = strictScorer.evaluate(confidence);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.reason).toContain('quantities');
    });

    it('requireSteps=false allows recipes without steps', () => {
      const lenientScorer = new ConfidenceScorer({ requireSteps: false });

      const confidence: ConfidenceScore = {
        overall: 0.8,
        title: 0.9,
        ingredients: 0.8,
        instructions: 0.7,
        hasQuantities: true,
        hasSteps: false, // would fail default, passes with requireSteps=false
        isCompleteRecipe: true,
        reasoning: 'No explicit steps',
      };

      const decision = lenientScorer.evaluate(confidence);

      expect(decision.shouldFallback).toBe(false);
    });

    it('combines multiple custom thresholds', () => {
      const customScorer = new ConfidenceScorer({
        overallThreshold: 0.85,
        ingredientThreshold: 0.75,
        instructionThreshold: 0.75,
        requireQuantities: true,
        requireSteps: true,
      });

      const goodConfidence: ConfidenceScore = {
        overall: 0.9,
        title: 0.9,
        ingredients: 0.8,
        instructions: 0.8,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Meets all custom thresholds',
      };

      const decision = customScorer.evaluate(goodConfidence);

      expect(decision.shouldFallback).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Integration-style Tests
  // --------------------------------------------------------------------------

  describe('integration scenarios', () => {
    it('handles typical high-quality TikTok recipe extraction', () => {
      const tiktokRecipe: ConfidenceScore = {
        overall: 0.85,
        title: 0.95,
        ingredients: 0.75,
        instructions: 0.8,
        hasQuantities: true,
        hasSteps: true,
        isCompleteRecipe: true,
        reasoning: 'Clear recipe with all key components',
      };

      const decision = scorer.evaluate(tiktokRecipe);

      expect(decision.shouldFallback).toBe(false);
      expect(decision.score).toBeGreaterThan(0.7);
    });

    it('handles typical low-quality caption-only extraction', () => {
      const captionOnly: ConfidenceScore = {
        overall: 0.45,
        title: 0.7,
        ingredients: 0.35,
        instructions: 0.4,
        hasQuantities: false,
        hasSteps: false,
        isCompleteRecipe: false,
        reasoning: 'Caption mentions dish but lacks recipe details',
      };

      const decision = scorer.evaluate(captionOnly);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.missingFields).toContain('ingredients');
      expect(decision.missingFields).toContain('instructions');
    });

    it('handles edge case of partial recipe that needs enhancement', () => {
      const partialRecipe = createPartialConfidence();

      const decision = scorer.evaluate(partialRecipe);

      expect(decision.shouldFallback).toBe(true);
      expect(decision.missingFields).toContain('ingredients');
      expect(decision.reason).toBeDefined();
    });

    it('workflow: evaluate → getRecommendation provides actionable guidance', () => {
      const confidence = createLowConfidence();

      const decision = scorer.evaluate(confidence);
      const recommendation = scorer.getRecommendation(decision);

      expect(recommendation).toBeTruthy();
      expect(recommendation.length).toBeGreaterThan(20);
      expect(recommendation).toContain('visual extraction');
    });
  });
});
