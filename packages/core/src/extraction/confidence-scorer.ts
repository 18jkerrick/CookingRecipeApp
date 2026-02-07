import type { ConfidenceScore } from './schemas/recipe-schema';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for ConfidenceScorer thresholds and requirements
 *
 * Controls when fallback extraction is triggered based on
 * confidence metrics from the extraction.
 */
export interface ConfidenceScorerConfig {
  /** Minimum overall confidence score to consider extraction "confident" (default: 0.7) */
  overallThreshold: number;

  /** Minimum ingredient completeness score (default: 0.6) */
  ingredientThreshold: number;

  /** Minimum instruction completeness score (default: 0.6) */
  instructionThreshold: number;

  /** Whether to require hasQuantities=true for confident extraction (default: false) */
  requireQuantities: boolean;

  /** Whether to require hasSteps=true for confident extraction (default: true) */
  requireSteps: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: ConfidenceScorerConfig = {
  overallThreshold: 0.7,
  ingredientThreshold: 0.6,
  instructionThreshold: 0.6,
  requireQuantities: false,
  requireSteps: true,
};

// ============================================================================
// Fallback Decision
// ============================================================================

/**
 * Decision output from evaluating extraction confidence
 *
 * Determines whether to trigger fallback extraction (e.g., visual extraction)
 * and provides reasoning for the decision.
 */
export interface FallbackDecision {
  /** Whether to trigger fallback extraction */
  shouldFallback: boolean;

  /** Human-readable reason for the decision */
  reason: string;

  /** List of fields that are weak or missing */
  missingFields: string[];

  /** Computed overall quality score (0-1) */
  score: number;
}

// ============================================================================
// Quality Score Weights
// ============================================================================

/**
 * Weights for computing overall quality score
 * Total must equal 1.0
 */
const QUALITY_WEIGHTS = {
  overall: 0.4,
  ingredients: 0.3,
  instructions: 0.3,
} as const;

/**
 * Penalty applied when required boolean flags are not met
 */
const PENALTY_AMOUNT = 0.1;

// ============================================================================
// ConfidenceScorer Implementation
// ============================================================================

/**
 * Evaluates extraction quality and makes fallback decisions
 *
 * The ConfidenceScorer analyzes confidence metrics from recipe extraction
 * and determines whether the extraction is complete enough or if fallback
 * to another extraction method (e.g., visual) is needed.
 *
 * @example
 * ```typescript
 * const scorer = createConfidenceScorer({ overallThreshold: 0.8 });
 * const decision = scorer.evaluate(recipe.confidence);
 *
 * if (decision.shouldFallback) {
 *   console.log('Triggering visual extraction:', decision.reason);
 *   console.log('Missing fields:', decision.missingFields);
 * }
 * ```
 */
export class ConfidenceScorer {
  private readonly config: ConfidenceScorerConfig;

  constructor(config?: Partial<ConfidenceScorerConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Evaluate confidence and produce a fallback decision
   *
   * @param confidence - Confidence score from extraction
   * @returns Decision about whether to trigger fallback
   */
  evaluate(confidence: ConfidenceScore): FallbackDecision {
    const score = this.computeQualityScore(confidence);
    const missingFields = this.getMissingFields(confidence);
    const isComplete = this.isComplete(confidence);

    // Determine if fallback is needed
    const shouldFallback = !isComplete || missingFields.length > 0;

    // Build reason string
    let reason: string;
    if (!shouldFallback) {
      reason = 'Extraction meets all confidence thresholds';
    } else if (!confidence.isCompleteRecipe) {
      reason = 'Recipe is not complete enough to follow';
    } else if (missingFields.length > 0) {
      reason = `Weak confidence in: ${missingFields.join(', ')}`;
    } else {
      reason = `Quality score ${score.toFixed(2)} below threshold`;
    }

    return {
      shouldFallback,
      reason,
      missingFields,
      score,
    };
  }

  /**
   * Compute weighted quality score from confidence metrics
   *
   * Formula:
   * - overall * 0.4 + ingredients * 0.3 + instructions * 0.3
   * - Penalty: -0.1 if requireQuantities and !hasQuantities
   * - Penalty: -0.1 if requireSteps and !hasSteps
   * - Result clamped to [0, 1]
   *
   * @param confidence - Confidence score from extraction
   * @returns Quality score between 0 and 1
   */
  computeQualityScore(confidence: ConfidenceScore): number {
    // Calculate weighted base score
    let score =
      confidence.overall * QUALITY_WEIGHTS.overall +
      confidence.ingredients * QUALITY_WEIGHTS.ingredients +
      confidence.instructions * QUALITY_WEIGHTS.instructions;

    // Apply penalties for missing required flags
    if (this.config.requireQuantities && !confidence.hasQuantities) {
      score -= PENALTY_AMOUNT;
    }

    if (this.config.requireSteps && !confidence.hasSteps) {
      score -= PENALTY_AMOUNT;
    }

    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get list of fields that are below threshold or missing required flags
   *
   * @param confidence - Confidence score from extraction
   * @returns Array of field names that are weak or missing
   */
  getMissingFields(confidence: ConfidenceScore): string[] {
    const missing: string[] = [];

    // Check threshold-based fields
    if (confidence.overall < this.config.overallThreshold) {
      missing.push('overall');
    }

    if (confidence.ingredients < this.config.ingredientThreshold) {
      missing.push('ingredients');
    }

    if (confidence.instructions < this.config.instructionThreshold) {
      missing.push('instructions');
    }

    // Check required boolean flags
    if (this.config.requireQuantities && !confidence.hasQuantities) {
      missing.push('quantities');
    }

    if (this.config.requireSteps && !confidence.hasSteps) {
      missing.push('steps');
    }

    return missing;
  }

  /**
   * Check if extraction meets all completeness criteria
   *
   * An extraction is complete when:
   * - isCompleteRecipe is true
   * - Overall confidence meets threshold
   * - No missing fields
   *
   * @param confidence - Confidence score from extraction
   * @returns true if extraction is complete
   */
  isComplete(confidence: ConfidenceScore): boolean {
    // Must be marked as complete recipe by the LLM
    if (!confidence.isCompleteRecipe) {
      return false;
    }

    // Must meet overall threshold
    if (confidence.overall < this.config.overallThreshold) {
      return false;
    }

    // Must have no missing fields
    const missingFields = this.getMissingFields(confidence);
    return missingFields.length === 0;
  }

  /**
   * Get human-readable recommendation based on fallback decision
   *
   * @param decision - Fallback decision to generate recommendation for
   * @returns Human-readable recommendation string
   */
  getRecommendation(decision: FallbackDecision): string {
    if (!decision.shouldFallback) {
      return `Extraction successful (quality: ${(decision.score * 100).toFixed(0)}%). No additional extraction needed.`;
    }

    const scorePercent = (decision.score * 100).toFixed(0);

    if (decision.missingFields.length === 0) {
      return `Extraction incomplete (quality: ${scorePercent}%). Recommend visual extraction for verification.`;
    }

    const fieldList = decision.missingFields.join(', ');
    return `Extraction has gaps in ${fieldList} (quality: ${scorePercent}%). Recommend visual extraction to supplement.`;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a ConfidenceScorer with optional configuration overrides
 *
 * @param overrides - Partial configuration to override defaults
 * @returns Configured ConfidenceScorer instance
 *
 * @example
 * ```typescript
 * // Use all defaults
 * const scorer = createConfidenceScorer();
 *
 * // Override specific thresholds
 * const strictScorer = createConfidenceScorer({
 *   overallThreshold: 0.85,
 *   requireQuantities: true,
 * });
 * ```
 */
export function createConfidenceScorer(
  overrides?: Partial<ConfidenceScorerConfig>
): ConfidenceScorer {
  const config: ConfidenceScorerConfig = {
    ...DEFAULT_CONFIG,
    ...overrides,
  };

  return new ConfidenceScorer(config);
}
