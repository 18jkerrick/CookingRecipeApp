import OpenAI from 'openai';
import type { FrameAnalysis } from './frame-analyzer';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for FrameConsolidator
 */
export interface FrameConsolidatorConfig {
  /** OpenAI API key (required) */
  apiKey: string;

  /** Model to use for consolidation (default: gpt-4o-mini) */
  model?: string;

  /** Max tokens for consolidation response (default: 800) */
  maxTokens?: number;

  /** Temperature for generation (default: 0.3) */
  temperature?: number;
}

const DEFAULT_CONFIG = {
  model: 'gpt-4o-mini',
  maxTokens: 800,
  temperature: 0.3,
};

// ============================================================================
// Result Types
// ============================================================================

/**
 * Consolidated visual extraction result
 */
export interface ConsolidatedVisualExtraction {
  /** Identified dish name */
  dishName: string;

  /** Unique ingredients observed across all frames */
  ingredients: string[];

  /** Consolidated cooking steps in order */
  cookingSteps: string[];

  /** Equipment/tools used */
  equipment: string[];

  /** Any text overlays or labels captured */
  textOverlays: string[];

  /** Raw consolidated narrative */
  narrative: string;

  /** Confidence in the consolidation (0-1) */
  confidence: number;
}

// ============================================================================
// FrameConsolidator Implementation
// ============================================================================

/**
 * Consolidates multiple frame analyses into a cohesive visual extraction
 *
 * Takes individual frame observations and:
 * - Deduplicates ingredients
 * - Orders cooking steps logically
 * - Identifies the dish being made
 * - Produces a coherent narrative
 *
 * @example
 * ```typescript
 * const consolidator = createFrameConsolidator({ apiKey: process.env.OPENAI_API_KEY });
 * const result = await consolidator.consolidate(frameAnalyses);
 * console.log(`Dish: ${result.dishName}`);
 * ```
 */
export class FrameConsolidator {
  private readonly client: OpenAI;
  private readonly config: Required<FrameConsolidatorConfig>;

  constructor(config: FrameConsolidatorConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required for FrameConsolidator');
    }

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Consolidate multiple frame analyses into a unified extraction
   *
   * @param analyses - Array of frame analyses to consolidate
   * @returns Consolidated visual extraction
   */
  async consolidate(
    analyses: FrameAnalysis[]
  ): Promise<ConsolidatedVisualExtraction> {
    // Filter out frames with no useful content
    const validAnalyses = analyses.filter(
      (a) =>
        a.ingredients.length > 0 ||
        a.actions.length > 0 ||
        (a.observations && !a.observations.toLowerCase().includes('no cooking'))
    );

    if (validAnalyses.length === 0) {
      return this.createEmptyResult(
        'No cooking content detected in video frames'
      );
    }

    // First, do a simple deduplication pass
    const simpleExtraction = this.simpleConsolidate(validAnalyses);

    // If we have very little content, skip AI consolidation
    if (
      simpleExtraction.ingredients.length < 2 &&
      simpleExtraction.cookingSteps.length < 2
    ) {
      return {
        ...simpleExtraction,
        confidence: 0.4,
      };
    }

    // Use AI to create a cohesive narrative
    try {
      const aiConsolidation = await this.aiConsolidate(validAnalyses);
      return {
        ...aiConsolidation,
        confidence: this.calculateConfidence(aiConsolidation, validAnalyses),
      };
    } catch (error) {
      console.error('AI consolidation failed, using simple extraction:', error);
      return {
        ...simpleExtraction,
        confidence: 0.5,
      };
    }
  }

  /**
   * Simple consolidation without AI (fallback)
   */
  private simpleConsolidate(
    analyses: FrameAnalysis[]
  ): Omit<ConsolidatedVisualExtraction, 'confidence'> {
    // Collect all ingredients and dedupe
    const allIngredients = new Set<string>();
    const allEquipment = new Set<string>();
    const allActions: string[] = [];
    const textOverlays: string[] = [];

    for (const analysis of analyses) {
      analysis.ingredients.forEach((i) =>
        allIngredients.add(this.normalizeIngredient(i))
      );
      analysis.equipment.forEach((e) => allEquipment.add(e.toLowerCase()));
      analysis.actions.forEach((a) => allActions.push(a));
      if (analysis.hasText && analysis.observations) {
        textOverlays.push(analysis.observations);
      }
    }

    // Create cooking steps from actions (dedupe consecutive similar actions)
    const cookingSteps = this.dedupeActions(allActions);

    // Try to infer dish name from ingredients
    const dishName = this.inferDishName([...allIngredients]);

    const narrative = `${dishName}\n\nIngredients observed: ${[...allIngredients].join(', ')}\n\nSteps: ${cookingSteps.join('. ')}`;

    return {
      dishName,
      ingredients: [...allIngredients],
      cookingSteps,
      equipment: [...allEquipment],
      textOverlays,
      narrative,
    };
  }

  /**
   * AI-powered consolidation for cohesive narrative
   */
  private async aiConsolidate(
    analyses: FrameAnalysis[]
  ): Promise<Omit<ConsolidatedVisualExtraction, 'confidence'>> {
    const frameData = analyses
      .map(
        (a, i) => `--- FRAME ${i + 1} (${a.stage}) ---
Ingredients: ${a.ingredients.join(', ') || 'none visible'}
Actions: ${a.actions.join(', ') || 'none observed'}
Equipment: ${a.equipment.join(', ') || 'none visible'}
Food State: ${a.foodState}
Observations: ${a.observations}`
      )
      .join('\n\n');

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'user',
          content: `You are analyzing multiple frames from a cooking video to create one cohesive recipe extraction.

GOALS:
1. Identify the SPECIFIC DISH being made (be descriptive)
2. Consolidate duplicate ingredients (list each only once)
3. Create logical cooking steps from observed actions
4. Remove redundant observations

Frame analyses:
${frameData}

Respond in JSON format:
{
  "dishName": "Specific name of the dish",
  "ingredients": ["unique ingredient 1", "unique ingredient 2"],
  "cookingSteps": ["Step 1: action", "Step 2: action"],
  "equipment": ["tool 1", "tool 2"],
  "textOverlays": ["any text seen in frames"],
  "narrative": "Brief 2-3 sentence summary of the cooking process"
}

Be specific with dish names (e.g., "Garlic Butter Shrimp Pasta" not just "Pasta").
List ingredients with quantities if observed.
Order cooking steps logically.`,
        },
      ],
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
    });

    const content = response.choices[0]?.message?.content || '';

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          dishName: parsed.dishName || 'Unknown Dish',
          ingredients: Array.isArray(parsed.ingredients)
            ? parsed.ingredients
            : [],
          cookingSteps: Array.isArray(parsed.cookingSteps)
            ? parsed.cookingSteps
            : [],
          equipment: Array.isArray(parsed.equipment) ? parsed.equipment : [],
          textOverlays: Array.isArray(parsed.textOverlays)
            ? parsed.textOverlays
            : [],
          narrative: parsed.narrative || content,
        };
      }
    } catch {
      // JSON parsing failed
    }

    // Fallback to simple consolidation if AI response can't be parsed
    return this.simpleConsolidate(analyses);
  }

  /**
   * Normalize ingredient text for deduplication
   */
  private normalizeIngredient(ingredient: string): string {
    return ingredient
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(a |an |the |some )/i, '');
  }

  /**
   * Remove duplicate/similar consecutive actions
   */
  private dedupeActions(actions: string[]): string[] {
    if (actions.length === 0) return [];

    const deduped: string[] = [actions[0]];
    for (let i = 1; i < actions.length; i++) {
      const current = actions[i].toLowerCase();
      const previous = actions[i - 1].toLowerCase();

      // Skip if very similar to previous
      if (!this.isSimilarAction(current, previous)) {
        deduped.push(actions[i]);
      }
    }
    return deduped;
  }

  /**
   * Check if two actions are similar
   */
  private isSimilarAction(a: string, b: string): boolean {
    // Simple similarity check
    const wordsA = new Set(a.split(' '));
    const wordsB = new Set(b.split(' '));
    const intersection = [...wordsA].filter((w) => wordsB.has(w));
    return intersection.length / Math.max(wordsA.size, wordsB.size) > 0.6;
  }

  /**
   * Infer dish name from ingredients
   */
  private inferDishName(ingredients: string[]): string {
    const ingredientStr = ingredients.join(' ').toLowerCase();

    // Common dish patterns
    if (ingredientStr.includes('pasta') || ingredientStr.includes('noodle')) {
      if (ingredientStr.includes('shrimp'))
        return 'Shrimp Pasta';
      if (ingredientStr.includes('chicken'))
        return 'Chicken Pasta';
      return 'Pasta Dish';
    }
    if (ingredientStr.includes('rice')) {
      if (ingredientStr.includes('fried')) return 'Fried Rice';
      return 'Rice Dish';
    }
    if (ingredientStr.includes('steak') || ingredientStr.includes('beef')) {
      return 'Beef Dish';
    }

    return 'Cooking Recipe';
  }

  /**
   * Calculate confidence based on extraction quality
   */
  private calculateConfidence(
    extraction: Omit<ConsolidatedVisualExtraction, 'confidence'>,
    analyses: FrameAnalysis[]
  ): number {
    let score = 0.5; // Base score

    // More ingredients = higher confidence
    if (extraction.ingredients.length >= 3) score += 0.15;
    if (extraction.ingredients.length >= 5) score += 0.1;

    // More cooking steps = higher confidence
    if (extraction.cookingSteps.length >= 3) score += 0.1;

    // Specific dish name = higher confidence
    if (
      extraction.dishName &&
      extraction.dishName !== 'Cooking Recipe' &&
      extraction.dishName !== 'Unknown Dish'
    ) {
      score += 0.1;
    }

    // More successful frame analyses = higher confidence
    const successRate = analyses.length / 8; // Assume 8 max frames
    score += Math.min(successRate * 0.1, 0.1);

    return Math.min(score, 1);
  }

  /**
   * Create empty result with reason
   */
  private createEmptyResult(reason: string): ConsolidatedVisualExtraction {
    return {
      dishName: 'Unknown',
      ingredients: [],
      cookingSteps: [],
      equipment: [],
      textOverlays: [],
      narrative: reason,
      confidence: 0,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a FrameConsolidator with configuration
 *
 * @param config - Configuration including required API key
 * @returns Configured FrameConsolidator instance
 */
export function createFrameConsolidator(
  config: FrameConsolidatorConfig
): FrameConsolidator {
  return new FrameConsolidator(config);
}
