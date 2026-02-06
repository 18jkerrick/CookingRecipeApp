# Recipe Extraction System Redesign

**Date:** 2026-02-05  
**Status:** Design Complete  
**Branch:** `tighten-recipe-extract-logic`

## Problem Statement

The current recipe extraction system has multiple failure modes:
- Platform scrapers (TikTok/Instagram/Facebook) fail when platforms update HTML structure
- LLM extracts incomplete/inaccurate recipe data from captions
- Unnecessary fallbacks to audio/visual when caption has sufficient data
- Extraction process takes too long in some cases
- No title extraction in current `extractFromCaption` function
- Using gpt-3.5-turbo without structured output enforcement

## Design Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Content Acquisition | Supadata (primary) + Apify (fallback) | Reliable APIs vs fragile scrapers |
| LLM Model | GPT-4o-mini with structured outputs | Better accuracy, cheaper than 3.5-turbo, guaranteed valid JSON |
| Completeness Check | AI confidence scoring (0-1 scale) | Avoids arbitrary thresholds, LLM reasons about recipe completeness |
| Prompt Strategy | Single-pass with structured schema | Two-pass or CoT adds latency without proportional accuracy gain |
| Audio Transcription | Supadata's Whisper-based transcript API | Replaces custom audio pipeline |
| Visual Extraction | Improved: smart frames, parallel analysis, context-aware prompts | 2-3x faster, better accuracy |
| Testing | Semantic similarity with embeddings (threshold ~0.85) | Handles natural language variance |
| Fallback Threshold | Confidence < 0.8 triggers visual extraction | Balances accuracy vs speed |

---

## Architecture Overview

### New Extraction Pipeline

```
URL Input
    ↓
Platform Detection (YouTube/TikTok/Instagram/Facebook/Pinterest/Blog)
    ↓
┌─────────────────────────────────────────────────────────┐
│  Stage 1: Content Acquisition (Supadata → Apify fallback) │
│  - Caption/description text                              │
│  - Transcript (Supadata's Whisper-based generation)      │
│  - Video metadata (title, author, etc.)                  │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│  Stage 2: AI Extraction (GPT-4o-mini + structured output) │
│  - Extract: title, ingredients, instructions             │
│  - Return: confidence score (0-1)                        │
└─────────────────────────────────────────────────────────┘
    ↓
Confidence >= 0.8? ──YES──→ Return recipe ✓
    │
    NO (confidence < 0.8)
    ↓
┌─────────────────────────────────────────────────────────┐
│  Stage 3: Visual Extraction (improved)                   │
│  - Smart frame selection                                 │
│  - Parallel frame analysis                               │
│  - Merge with Stage 2 results                            │
└─────────────────────────────────────────────────────────┘
    ↓
Return recipe (with completeness indicator)
```

### Key Changes from Current System

- Supadata replaces custom scrapers for caption + transcript acquisition
- Single LLM call with confidence scoring determines fallback need
- Visual extraction only triggered when confidence is low
- Apify as backup if Supadata fails

---

## Structured Output Schema

```typescript
interface RecipeExtraction {
  title: string;                    // Recipe name
  ingredients: Ingredient[];        // Parsed ingredients
  instructions: string[];           // Step-by-step instructions
  confidence: number;               // 0-1, LLM's assessment of completeness
  confidence_reasoning: string;     // Why confidence is high/low
  metadata?: {
    servings?: string;
    prep_time?: string;
    cook_time?: string;
    cuisine?: string;
  };
}

interface Ingredient {
  name: string;                     // e.g., "ground pork"
  quantity?: string;                // e.g., "1/2"
  unit?: string;                    // e.g., "lb"
  preparation?: string;             // e.g., "minced"
  original_text: string;            // e.g., "1/2 lb ground pork, minced"
}
```

## Prompt Design

```
SYSTEM:
You are a recipe extraction expert. Extract structured recipe data from video captions and transcripts.

EXTRACTION RULES:
- Title: Create a clear, descriptive recipe name
- Ingredients: Parse into structured format with quantity, unit, name, preparation
- Instructions: Break into numbered steps, preserve original detail level
- Include ALL mentioned ingredients and steps, even if brief

CONFIDENCE SCORING:
Rate 0.0-1.0 based on whether someone could actually cook this dish:
- 0.9-1.0: Complete recipe with clear ingredients and steps
- 0.7-0.8: Mostly complete, minor details might be missing
- 0.5-0.6: Partial recipe, key ingredients or steps unclear
- Below 0.5: Insufficient information to cook the dish

USER:
Extract the recipe from this content:
Title/Description: {caption}
Transcript: {transcript}
```

---

## Supadata Integration

### Content Acquisition Layer

```typescript
interface ContentAcquisitionResult {
  caption: string | null;           // Post description/caption
  transcript: string | null;        // Audio transcript (Whisper-generated)
  metadata: {
    title?: string;
    author?: string;
    platform: 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'pinterest' | 'blog';
    contentType: 'video' | 'photo' | 'slideshow';
  };
  source: 'supadata' | 'apify' | 'custom';
}
```

### Fallback Chain

```
1. Try Supadata transcript API
   ├─ Success → Continue with caption + transcript
   └─ Failure (timeout, rate limit, unsupported)
       ↓
2. Try Apify extractor (platform-specific)
   ├─ Success → Continue with caption + transcript  
   └─ Failure
       ↓
3. Return partial result with error context
   - Still attempt extraction with whatever data we have
   - Flag recipe as "incomplete_source" for user awareness
```

### Platform-Specific Handling

| Platform | Supadata Endpoint | Apify Fallback | Notes |
|----------|-------------------|----------------|-------|
| TikTok | `/v1/transcript` | `tiktok-transcript-extractor` | Handles video + photo posts |
| Instagram | `/v1/transcript` | `instagram-reel-scraper` | Reels + Posts |
| Facebook | `/v1/transcript` | Custom scraper | Videos + Reels |
| YouTube | `/v1/transcript` | `youtube-transcript` | Best native caption support |
| Pinterest | Follow "Visit site" → Blog scraper | N/A | Redirect to source |
| Blogs | Firecrawl/web scraper | N/A | Already have this |

---

## Improved Visual Extraction

### When Visual Extraction Triggers

- Only when confidence < 0.8 from caption + transcript extraction
- User sees progress indicator: "Analyzing video frames for additional details..."

### Smart Frame Selection

```typescript
const frameStrategy = {
  // Beginning: Usually shows finished dish or title card
  intro: [0.05, 0.10],  // 5% and 10% into video
  
  // Middle: Cooking action, ingredient additions
  cooking: [0.25, 0.40, 0.55, 0.70],
  
  // End: Final plating, recipe card often shown
  outro: [0.85, 0.95]
};

// For short videos (<60s): 4-5 frames
// For long videos (>5min): 6-8 frames, weighted toward beginning/end
```

### Parallel Frame Analysis

```typescript
// Current: Sequential (slow)
for (const frame of frames) {
  results.push(await analyzeFrame(frame));
}

// Improved: Parallel with Promise.all
const results = await Promise.all(
  frames.map(frame => analyzeFrame(frame))
);
```

### Context-Aware Prompts

```typescript
// Tell Vision API what we're missing
const prompt = buildVisualPrompt({
  existingTitle: extraction.title,
  existingIngredients: extraction.ingredients,
  existingInstructions: extraction.instructions,
  missingFields: extraction.confidence_reasoning
});
```

### Merge Strategy

```typescript
function mergeExtractions(textBased: RecipeExtraction, visual: VisualExtraction): RecipeExtraction {
  return {
    title: textBased.title || visual.title,
    ingredients: dedupeIngredients([...textBased.ingredients, ...visual.ingredients]),
    instructions: mergeInstructions(textBased.instructions, visual.instructions),
    confidence: Math.max(textBased.confidence, visual.confidence),
  };
}
```

---

## Testing Strategy

### Semantic Similarity Approach

```typescript
async function assertRecipeSimilarity(
  actual: RecipeExtraction,
  expected: RecipeTestCase,
  threshold: number = 0.85
): Promise<TestResult> {
  const titleSimilarity = await compareTitles(actual.title, expected.expectedTitle);
  
  const actualIngredients = actual.ingredients.map(i => i.original_text).join('\n');
  const expectedIngredients = expected.expectedIngredients.join('\n');
  const ingredientsSimilarity = cosineSimilarity(
    await getEmbedding(actualIngredients),
    await getEmbedding(expectedIngredients)
  );
  
  const actualInstructions = actual.instructions.join('\n');
  const expectedInstructions = expected.expectedInstructions.join('\n');
  const instructionsSimilarity = cosineSimilarity(
    await getEmbedding(actualInstructions),
    await getEmbedding(expectedInstructions)
  );
  
  return {
    passed: titleSimilarity >= threshold && 
            ingredientsSimilarity >= threshold && 
            instructionsSimilarity >= threshold,
    scores: { titleSimilarity, ingredientsSimilarity, instructionsSimilarity }
  };
}
```

### Thresholds by Field

| Field | Threshold | Rationale |
|-------|-----------|-----------|
| Title | 0.80 | Titles can vary ("Lazy Soup Dumplings" vs "Easy Dumpling Soup") |
| Ingredients | 0.85 | Core ingredients must match, minor variations OK |
| Instructions | 0.80 | Step wording can vary significantly |

### Test Structure

- **Unit tests**: Mock Supadata/OpenAI - fast, deterministic
- **E2E tests**: Hit real APIs - slow, run less frequently
- Test cases from `docs/recipe-extract-test-cases.txt`

---

## Implementation Order

1. **Supadata Integration** - Replace custom scrapers, biggest reliability win
2. **Structured Output Schema** - Define Zod schema for recipe extraction
3. **GPT-4o-mini Migration** - Swap model, update prompt with confidence scoring
4. **Testing Infrastructure** - Set up semantic similarity tests with test cases
5. **Visual Extraction Improvements** - Parallel analysis, smart frame selection
6. **Apify Fallback** - Add backup for Supadata failures

## New Dependencies

- `@supadata/sdk` or direct API calls
- Apify SDK (for fallback)
- No new OpenAI dependencies (already using it)

## Estimated API Costs (per 1000 recipes)

| Service | Cost | Notes |
|---------|------|-------|
| Supadata | ~$1-3 | Transcript extraction |
| OpenAI GPT-4o-mini | ~$0.30 | Recipe extraction |
| OpenAI Embeddings | ~$0.02 | Test comparisons |
| Visual fallback | ~$2-5 additional | Only when needed |

---

## References

- Current architecture: `docs/architecture.md`
- URL extraction logic: `docs/url-extract-logic.txt`
- Test cases: `docs/recipe-extract-test-cases.txt`
- Supadata docs: https://docs.supadata.ai/
- Apify TikTok extractor: https://apify.com/sian.agency/best-tiktok-ai-transcript-extractor
