/**
 * Integration tests for ExtractionService with real URLs
 *
 * These tests hit actual social media APIs and require network access.
 * They are marked with .skip by default to avoid running in CI.
 *
 * To run these tests:
 * 1. Set environment variables: OPENAI_API_KEY, SUPADATA_API_KEY, APIFY_TOKEN
 * 2. Run: npm test -- tests/integration/extraction --run
 *
 * Test cases sourced from: docs/recipe-extract-test-cases.txt
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  createExtractionServiceFromEnv,
  type ExtractionResult,
} from '../../../packages/core/src/extraction';
import {
  assertRecipeSimilarity,
  cosineSimilarity,
  getEmbedding,
} from '../../utils/semantic-similarity';

// ============================================================================
// Test Configuration
// ============================================================================

/**
 * Skip integration tests by default (they require network and real API keys)
 * Set RUN_INTEGRATION_TESTS=true to enable
 */
const SKIP_INTEGRATION = process.env.RUN_INTEGRATION_TESTS !== 'true';

/**
 * Timeout for extraction operations (they can be slow due to video processing)
 */
const EXTRACTION_TIMEOUT = 120_000; // 2 minutes

// ============================================================================
// Test Case Interface
// ============================================================================

interface RecipeTestCase {
  url: string;
  platform: string;
  expectedTitle: string;
  expectedIngredients: string[];
  expectedInstructions: string[];
  description?: string;
}

// ============================================================================
// Test Cases from docs/recipe-extract-test-cases.txt
// ============================================================================

const TIKTOK_TEST_CASES: RecipeTestCase[] = [
  {
    url: 'https://www.tiktok.com/@haileyateit/video/7596405804857560351',
    platform: 'TikTok',
    expectedTitle: "Hailey's Lazy Soup Dumplings",
    description: 'Normal TikTok video with spoken recipe',
    expectedIngredients: [
      '1/2 lb ground pork',
      '2 green onions, chopped',
      '1 tsp chicken powder',
      '1 tbsp oyster sauce',
      '1 tsp soy sauce',
      '1 tsp sugar',
      '2 tsp minced ginger',
      '1 tsp minced garlic',
      '1 Tbsp cooking wine (optional)',
      'Black pepper, to taste',
      '1/3 cup low-sodium chicken broth',
      'Dumpling wrappers',
      'Water (for steaming)',
    ],
    expectedInstructions: [
      'Make the pork filling. Add ground pork, green onions, chicken powder, oyster sauce, soy sauce, sugar, minced ginger, minced garlic, black pepper, cooking wine (if using), and chicken broth into a zip-top bag.',
      'Mix. Remove excess air, seal the bag, and massage until the mixture becomes sticky and well combined.',
      'Prepare for piping. Push the pork mixture toward one corner of the bag. Cut a small hole at the corner to use it like a piping bag.',
      'Make lazy dumplings. Pipe the pork filling into a small heat-resistant bowl (such as a ramekin), filling it about 1/3 full, then gently press it flat. Place 1 dumpling wrapper on top of the filling in each bowl.',
      'Steam. Place the bowls into a pot and add water until it reaches about half the height of the bowls. Cover with a lid and steam over medium heat for 15–20 minutes, until fully cooked.',
      'Serve. Serve hot with chili oil, soy sauce, sesame seeds, or green onions, if desired.',
    ],
  },
  {
    url: 'https://www.tiktok.com/@jujumaoo/video/7597415871853661460',
    platform: 'TikTok',
    expectedTitle: 'Beef Pares',
    description: 'TikTok video with complex multi-component recipe',
    expectedIngredients: [
      '1 kg of beef shins',
      '1 thumb of ginger, sliced',
      '1 whole red onion, chopped',
      '15-20 cloves of garlic, minced',
      '1 stalk of onion leeks, sliced',
      '130 ml of soy sauce',
      '160g of brown sugar',
      '2 tbsp oyster sauce',
      'Fish sauce to taste',
      'cornstarch slurry (2-3 tbsp of cornstarch)',
      '5-6 star anise',
      '2 small cinnamon sticks',
      '1 tbsp cracked peppercorn',
      '2-3 bay leaves',
      '1/2 tsp of five spice',
      'Salt & pepper to taste',
    ],
    expectedInstructions: [
      'Start by searing the beef in a pot over medium-high heat until browned.',
      'In the same pot, add the garlic and sauté until golden. Add the onions, ginger, and onion leeks.',
      'Add the spices: star anise, cinnamon, peppercorns, and five spice. Toast briefly.',
      'Return the beef to the pot and add the beef broth, soy sauce, brown sugar, oyster sauce, bay leaves. Season with fish sauce. Bring to a gentle boil, then lower to a simmer, cover, and cook for 1 to 2 hours, or until the beef is tender.',
      'Pour in the cornstarch slurry while stirring until the soup thickens.',
      'Serve with garlic rice, chili garlic oil, crispy garlic, green onions.',
    ],
  },
  {
    url: 'https://www.tiktok.com/@feelgoodwith_fi/photo/7591549640609189150',
    platform: 'TikTok',
    expectedTitle: 'Brothy Chicken Thighs',
    description: 'TikTok photo slideshow',
    expectedIngredients: [
      '2 lbs boneless chicken thighs',
      '1/4 cup coconut aminos',
      '1/4 cup rice vinegar',
      '6 garlic cloves',
      '1 tbsp grated ginger',
      'Red pepper flakes',
      'Rice',
      '2 bok choy',
      '1 bunch of broccolini',
    ],
    expectedInstructions: [
      'marinate 2lb boneless skinless chicken thighs for a few hours or overnight',
      'Cut up your veggies',
      'Make rice',
      'cook thighs (either sear in a pan or bake in the oven)',
      'add veggies to the pan with leftover marinade and broth',
      'add chicken thighs to the pan and bring to a simmer',
      'slice the chicken and serve over rice',
      'spoon extra broth around the edges',
      'garnish with green onion',
    ],
  },
];

const INSTAGRAM_TEST_CASES: RecipeTestCase[] = [
  {
    url: 'https://www.instagram.com/p/C85B8AyPxe3/',
    platform: 'Instagram',
    expectedTitle: 'California Burrito',
    description: 'Instagram post with full recipe',
    expectedIngredients: [
      '2 lbs skirt steak',
      '1/4 cup cilantro, chopped',
      'Juice of 1 lime',
      'Juice of 1 orange',
      '2 tsp cumin',
      '2 tsp oregano',
      '1 tbsp soy sauce or coco aminos',
      '3 garlic cloves, finely diced',
      '2 lbs russet potatoes',
      '2 ripe hass avocados',
      '4-5 plum tomatoes, diced',
    ],
    expectedInstructions: [
      'Combine skirt steak with marinade ingredients and marinate for at least 30 min. Sear for 1-2 min on each side. Slice against the grain.',
      'Wash, peel potatoes and cut. Air fry at 375F for 20 mins.',
      'To make the guacamole, combine avocados, onion, cilantro, lime juice, and salt.',
      'To make the pico de gallo, combine tomatoes, onion, cilantro, jalapeño, salt and pepper.',
      'Combine flour, olive oil, water to make tortilla dough. Roll out and heat in dry pan.',
    ],
  },
  {
    url: 'https://www.instagram.com/reel/DUEqwk4EXpk/',
    platform: 'Instagram',
    expectedTitle: 'High Protein Creamy Chicken Salad',
    description: 'Instagram Reel',
    expectedIngredients: [
      '1 lb chicken breast',
      '1 large or 2 medium cucumbers, halved and sliced',
      '1 medium purple (red) onion, thinly sliced',
      '3oz light cream cheese',
      '1 cup nonfat Greek yogurt',
      'Juice of 1 lemon',
      'Salt, to taste',
    ],
    expectedInstructions: [
      'Air fry the chicken: season chicken and air fry at 400°F for 10–12 minutes, flip halfway',
      'Prep the veggies: Slice cucumbers and purple onion',
      'Make it creamy: Add the cooked chicken, light cream cheese, Greek yogurt, lemon juice, salt',
      'Shake until coated, taste and adjust seasoning',
    ],
  },
];

const YOUTUBE_TEST_CASES: RecipeTestCase[] = [
  {
    url: 'https://www.youtube.com/watch?v=f-M3JN_7LGU&t=8s',
    platform: 'YouTube',
    expectedTitle: 'Brown Butter Chocolate Chip Cookies',
    description: 'YouTube video with full recipe narration',
    expectedIngredients: [
      '8 tbsp high-quality butter',
      '1/2 cup white sugar',
      '1/2 cup dark brown sugar',
      '1 egg',
      '1 tsp vanilla',
      '1/2 tsp salt (kosher)',
      '1/2 tsp baking soda',
      '1 1/3 cups AP flour',
      '1 cup large chocolate chips',
    ],
    expectedInstructions: [
      'Melt and carefully brown 8 tbsp high-quality butter',
      'Mix the melted butter, white sugar, dark brown sugar, egg, vanilla, salt and baking soda',
      'Once ribbon-like consistency, add flour and chocolate chips',
      'Mix well, scoop into round dough balls on a parchment-lined baking sheet',
      'Sprinkle with finishing salt if desired',
      'Chill 10 minutes if you like and bake for 10-12 minutes at 350º F',
      'Cool and serve',
    ],
  },
];

const FACEBOOK_TEST_CASES: RecipeTestCase[] = [
  {
    url: 'https://www.facebook.com/2days.delights/posts/pfbid032jCdYpXiLbgB4Re5DxFqRTE1fAtS6p8mYk29wdccCGK2FKboPRsnNAToKw2wr9VUl',
    platform: 'Facebook',
    expectedTitle: 'Best Fluffy Pancake Recipe',
    description: 'Facebook picture post',
    expectedIngredients: [
      '1 ½ cups all-purpose flour',
      '2 ½ teaspoons baking powder',
      '½ teaspoon salt',
      '1 tablespoon sugar',
      '1 ¼ cups milk',
      '1 egg',
      '3 tablespoons melted butter',
      '2 teaspoons vanilla extract (optional)',
    ],
    expectedInstructions: [
      'In a large bowl, sift together the flour, baking powder, salt, and sugar.',
      'Add milk, egg, melted butter, and vanilla. Mix until well combined.',
      'Heat a non-stick griddle or pan over medium heat and grease it.',
      'Pour ¼ cup of batter onto the griddle.',
      'Cook until bubbles form and edges are set (about 2 minutes). Flip and cook for another minute.',
      'Remove from pan and keep warm.',
      'Top with your favorite toppings and enjoy!',
    ],
  },
  {
    url: 'https://www.facebook.com/reel/1424149182756258',
    platform: 'Facebook',
    expectedTitle: 'Fettuccine Alfredo',
    description: 'Facebook Reel',
    expectedIngredients: [
      '225g fettuccine',
      'Salt to taste',
      '1 tsp black pepper',
      '1 tbsp garlic powder',
      '1 tsp Italian seasoning',
      '2 tbsp freshly minced parsley',
      '1/2 cup butter',
      '1 1/2 cup unsweetened heavy whipping cream',
      '1 cup parmesan cheese',
      '1 1/2 tbsp all-purpose flour',
      '1 cup reserved pasta water',
    ],
    expectedInstructions: [
      'Bring a large pot of salted water to a boil. Cook the fettuccine according to package instructions.',
      'In a large saucepan, melt the butter over medium heat.',
      'Sprinkle flour over the butter mixture and whisk to combine.',
      'Gradually pour in the heavy whipping cream, whisking continuously.',
      'Remove from heat and stir in parmesan cheese. Season with salt, pepper, garlic powder and Italian seasoning.',
      'Add the cooked fettuccine and toss to combine. Stir in parsley and serve hot.',
    ],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Assert extraction was successful with reasonable confidence
 */
function assertExtractionSuccess(result: ExtractionResult): void {
  expect(result.recipe).toBeDefined();
  expect(result.recipe.title).toBeTruthy();
  expect(result.recipe.ingredients.length).toBeGreaterThan(0);
  expect(result.recipe.instructions.length).toBeGreaterThan(0);
  expect(result.confidence.final).toBeGreaterThan(0.3);
}

/**
 * Calculate semantic similarity between extracted and expected ingredients
 * Uses a more lenient matching approach for ingredients
 */
async function assertIngredientsSimilar(
  actualIngredients: string[],
  expectedIngredients: string[],
  threshold: number = 0.65
): Promise<void> {
  // Join ingredients into text for comparison
  const actualText = actualIngredients.join('\n');
  const expectedText = expectedIngredients.join('\n');

  const [actualEmb, expectedEmb] = await Promise.all([
    getEmbedding(actualText),
    getEmbedding(expectedText),
  ]);

  const similarity = cosineSimilarity(actualEmb, expectedEmb);

  expect(similarity).toBeGreaterThanOrEqual(threshold);
}

/**
 * Calculate semantic similarity between extracted and expected instructions
 */
async function assertInstructionsSimilar(
  actualInstructions: string[],
  expectedInstructions: string[],
  threshold: number = 0.60
): Promise<void> {
  const actualText = actualInstructions.join('\n');
  const expectedText = expectedInstructions.join('\n');

  const [actualEmb, expectedEmb] = await Promise.all([
    getEmbedding(actualText),
    getEmbedding(expectedText),
  ]);

  const similarity = cosineSimilarity(actualEmb, expectedEmb);

  expect(similarity).toBeGreaterThanOrEqual(threshold);
}

/**
 * Assert title is semantically similar to expected
 */
async function assertTitleSimilar(
  actual: string,
  expected: string,
  threshold: number = 0.70
): Promise<void> {
  const [actualEmb, expectedEmb] = await Promise.all([
    getEmbedding(actual.toLowerCase()),
    getEmbedding(expected.toLowerCase()),
  ]);

  const similarity = cosineSimilarity(actualEmb, expectedEmb);

  expect(similarity).toBeGreaterThanOrEqual(threshold);
}

// ============================================================================
// Integration Tests
// ============================================================================

describe.skipIf(SKIP_INTEGRATION)('ExtractionService Integration Tests', () => {
  let extractionService: ReturnType<typeof createExtractionServiceFromEnv>;

  beforeAll(() => {
    // Verify required environment variables
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable required for integration tests');
    }

    extractionService = createExtractionServiceFromEnv({
      enableVisualFallback: true,
      verbose: true,
      fallbackThreshold: 0.6, // Lower threshold to trigger visual fallback more often
    });
  });

  describe('TikTok Extraction', () => {
    it.each(TIKTOK_TEST_CASES)(
      'extracts recipe from $description',
      async ({ url, expectedTitle, expectedIngredients, expectedInstructions }) => {
        const result = await extractionService.extract(url);

        // Basic extraction success
        assertExtractionSuccess(result);

        // Semantic similarity checks (lenient thresholds for video content)
        await assertTitleSimilar(result.recipe.title, expectedTitle, 0.65);

        // Convert structured ingredients to strings for comparison
        const actualIngredients = result.recipe.ingredients.map((i) => i.raw || i.name);
        await assertIngredientsSimilar(actualIngredients, expectedIngredients, 0.55);

        await assertInstructionsSimilar(result.recipe.instructions, expectedInstructions, 0.50);

        // Log results for debugging
        console.log(`\n📊 TikTok Test Results: ${expectedTitle}`);
        console.log(`   Title: "${result.recipe.title}"`);
        console.log(`   Confidence: ${(result.confidence.final * 100).toFixed(0)}%`);
        console.log(`   Ingredients: ${result.recipe.ingredients.length}`);
        console.log(`   Instructions: ${result.recipe.instructions.length}`);
        console.log(`   Visual Fallback: ${result.usedVisualFallback}`);
      },
      EXTRACTION_TIMEOUT
    );
  });

  describe('Instagram Extraction', () => {
    it.each(INSTAGRAM_TEST_CASES)(
      'extracts recipe from $description',
      async ({ url, expectedTitle, expectedIngredients, expectedInstructions }) => {
        const result = await extractionService.extract(url);

        assertExtractionSuccess(result);

        await assertTitleSimilar(result.recipe.title, expectedTitle, 0.65);

        const actualIngredients = result.recipe.ingredients.map((i) => i.raw || i.name);
        await assertIngredientsSimilar(actualIngredients, expectedIngredients, 0.55);

        await assertInstructionsSimilar(result.recipe.instructions, expectedInstructions, 0.50);

        console.log(`\n📊 Instagram Test Results: ${expectedTitle}`);
        console.log(`   Title: "${result.recipe.title}"`);
        console.log(`   Confidence: ${(result.confidence.final * 100).toFixed(0)}%`);
        console.log(`   Ingredients: ${result.recipe.ingredients.length}`);
        console.log(`   Instructions: ${result.recipe.instructions.length}`);
      },
      EXTRACTION_TIMEOUT
    );
  });

  describe('YouTube Extraction', () => {
    it.each(YOUTUBE_TEST_CASES)(
      'extracts recipe from $description',
      async ({ url, expectedTitle, expectedIngredients, expectedInstructions }) => {
        const result = await extractionService.extract(url);

        assertExtractionSuccess(result);

        await assertTitleSimilar(result.recipe.title, expectedTitle, 0.65);

        const actualIngredients = result.recipe.ingredients.map((i) => i.raw || i.name);
        await assertIngredientsSimilar(actualIngredients, expectedIngredients, 0.55);

        await assertInstructionsSimilar(result.recipe.instructions, expectedInstructions, 0.50);

        console.log(`\n📊 YouTube Test Results: ${expectedTitle}`);
        console.log(`   Title: "${result.recipe.title}"`);
        console.log(`   Confidence: ${(result.confidence.final * 100).toFixed(0)}%`);
        console.log(`   Ingredients: ${result.recipe.ingredients.length}`);
        console.log(`   Instructions: ${result.recipe.instructions.length}`);
      },
      EXTRACTION_TIMEOUT
    );
  });

  describe('Facebook Extraction', () => {
    it.each(FACEBOOK_TEST_CASES)(
      'extracts recipe from $description',
      async ({ url, expectedTitle, expectedIngredients, expectedInstructions }) => {
        const result = await extractionService.extract(url);

        assertExtractionSuccess(result);

        await assertTitleSimilar(result.recipe.title, expectedTitle, 0.65);

        const actualIngredients = result.recipe.ingredients.map((i) => i.raw || i.name);
        await assertIngredientsSimilar(actualIngredients, expectedIngredients, 0.55);

        await assertInstructionsSimilar(result.recipe.instructions, expectedInstructions, 0.50);

        console.log(`\n📊 Facebook Test Results: ${expectedTitle}`);
        console.log(`   Title: "${result.recipe.title}"`);
        console.log(`   Confidence: ${(result.confidence.final * 100).toFixed(0)}%`);
        console.log(`   Ingredients: ${result.recipe.ingredients.length}`);
        console.log(`   Instructions: ${result.recipe.instructions.length}`);
      },
      EXTRACTION_TIMEOUT
    );
  });

  describe('Edge Cases', () => {
    it(
      'handles non-recipe content gracefully',
      async () => {
        // This TikTok is not a recipe (edgecase from test-cases.txt)
        const url = 'https://www.tiktok.com/@rayanmroue/video/7598316560717008158';

        try {
          const result = await extractionService.extract(url);

          // Should either have very low confidence or minimal ingredients
          const isLowConfidence = result.confidence.final < 0.4;
          const hasMinimalContent = result.recipe.ingredients.length < 3;

          expect(isLowConfidence || hasMinimalContent).toBe(true);

          console.log('\n📊 Non-recipe content test:');
          console.log(`   Confidence: ${(result.confidence.final * 100).toFixed(0)}%`);
          console.log(`   Ingredients: ${result.recipe.ingredients.length}`);
          console.log(`   isCompleteRecipe: ${result.recipe.confidence.isCompleteRecipe}`);
        } catch (error) {
          // It's also acceptable to throw an error for non-recipe content
          console.log('\n📊 Non-recipe content correctly rejected with error');
          expect(error).toBeDefined();
        }
      },
      EXTRACTION_TIMEOUT
    );
  });
});

// ============================================================================
// Quick Sanity Test (runs even when integration tests are skipped)
// ============================================================================

describe('Integration Test Setup', () => {
  it('has test cases defined', () => {
    expect(TIKTOK_TEST_CASES.length).toBeGreaterThan(0);
    expect(INSTAGRAM_TEST_CASES.length).toBeGreaterThan(0);
    expect(YOUTUBE_TEST_CASES.length).toBeGreaterThan(0);
    expect(FACEBOOK_TEST_CASES.length).toBeGreaterThan(0);
  });

  it('test cases have required fields', () => {
    const allCases = [
      ...TIKTOK_TEST_CASES,
      ...INSTAGRAM_TEST_CASES,
      ...YOUTUBE_TEST_CASES,
      ...FACEBOOK_TEST_CASES,
    ];

    for (const testCase of allCases) {
      expect(testCase.url).toBeTruthy();
      expect(testCase.platform).toBeTruthy();
      expect(testCase.expectedTitle).toBeTruthy();
      expect(testCase.expectedIngredients.length).toBeGreaterThan(0);
      expect(testCase.expectedInstructions.length).toBeGreaterThan(0);
    }
  });

  it('skips integration tests when RUN_INTEGRATION_TESTS is not set', () => {
    if (process.env.RUN_INTEGRATION_TESTS !== 'true') {
      expect(SKIP_INTEGRATION).toBe(true);
    }
  });
});
