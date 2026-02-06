/**
 * Manual test script for recipe extraction pipeline
 *
 * Run with: npx tsx scripts/test-extraction.ts
 *
 * Tests:
 * 1. CaptionExtractor with GPT-4o-mini
 * 2. ContentService with Supadata
 * 3. Full pipeline (content acquisition → extraction)
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env.local (Next.js convention)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Check for required env vars
const requiredVars = ['OPENAI_API_KEY'];
const optionalVars = ['SUPADATA_API_KEY', 'APIFY_TOKEN'];

console.log('\n🔑 Environment Check:\n');
for (const v of requiredVars) {
  const exists = Boolean(process.env[v]);
  console.log(`  ${exists ? '✅' : '❌'} ${v}: ${exists ? 'Set' : 'MISSING (required)'}`);
}
for (const v of optionalVars) {
  const exists = Boolean(process.env[v]);
  console.log(`  ${exists ? '✅' : '⚠️ '} ${v}: ${exists ? 'Set' : 'Not set (optional)'}`);
}

const missingRequired = requiredVars.filter((v) => !process.env[v]);
if (missingRequired.length > 0) {
  console.log('\n❌ Missing required environment variables. Add them to .env.local');
  process.exit(1);
}

// Import after env check
import { CaptionExtractor } from '../packages/core/src/extraction';
import { ContentService } from '../packages/core/src/content';

// ============================================================================
// Test 1: CaptionExtractor with sample caption
// ============================================================================

async function testCaptionExtractor() {
  console.log('\n' + '='.repeat(60));
  console.log('📝 Test 1: CaptionExtractor (GPT-4o-mini)');
  console.log('='.repeat(60));

  const extractor = new CaptionExtractor({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  const sampleCaption = `
    Easy Garlic Butter Shrimp Recipe 🦐

    Ingredients:
    - 1 lb large shrimp, peeled and deveined
    - 4 tbsp butter
    - 6 cloves garlic, minced
    - 1/4 cup white wine
    - 2 tbsp fresh parsley, chopped
    - Salt and pepper to taste
    - Lemon wedges for serving

    Instructions:
    1. Pat shrimp dry with paper towels
    2. Melt butter in a large skillet over medium-high heat
    3. Add garlic and cook for 30 seconds until fragrant
    4. Add shrimp in a single layer, cook 2 minutes per side
    5. Pour in white wine, let it reduce for 1 minute
    6. Season with salt and pepper
    7. Garnish with parsley and serve with lemon wedges

    Ready in 15 minutes! Perfect weeknight dinner 🍋
  `;

  console.log('\n📥 Input caption (truncated):', sampleCaption.slice(0, 100) + '...');

  try {
    const start = Date.now();
    const result = await extractor.extract(sampleCaption);
    const elapsed = Date.now() - start;

    console.log('\n✅ Extraction successful!');
    console.log(`⏱️  Time: ${elapsed}ms`);
    console.log('\n📊 Results:');
    console.log(`  Title: ${result.title}`);
    console.log(`  Ingredients: ${result.ingredients.length} found`);
    result.ingredients.slice(0, 3).forEach((i) => console.log(`    - ${i.raw}`));
    if (result.ingredients.length > 3) console.log(`    ... and ${result.ingredients.length - 3} more`);
    console.log(`  Instructions: ${result.instructions.length} steps`);
    result.instructions.slice(0, 2).forEach((i, idx) => console.log(`    ${idx + 1}. ${i}`));
    if (result.instructions.length > 2) console.log(`    ... and ${result.instructions.length - 2} more`);

    console.log('\n🎯 Confidence:');
    console.log(`  Overall: ${(result.confidence.overall * 100).toFixed(0)}%`);
    console.log(`  Is Complete Recipe: ${result.confidence.isCompleteRecipe ? 'Yes' : 'No'}`);
    console.log(`  Reasoning: ${result.confidence.reasoning}`);

    console.log(`\n${extractor.isConfident(result) ? '✅ HIGH CONFIDENCE - No fallback needed' : '⚠️  LOW CONFIDENCE - Would trigger fallback'}`);

    return true;
  } catch (error) {
    console.error('\n❌ Extraction failed:', error);
    return false;
  }
}

// ============================================================================
// Test 2: ContentService with Supadata (if API key available)
// ============================================================================

async function testContentService() {
  if (!process.env.SUPADATA_API_KEY) {
    console.log('\n' + '='.repeat(60));
    console.log('⏭️  Test 2: ContentService - SKIPPED (no SUPADATA_API_KEY)');
    console.log('='.repeat(60));
    return null;
  }

  console.log('\n' + '='.repeat(60));
  console.log('🌐 Test 2: ContentService (Supadata)');
  console.log('='.repeat(60));

  const service = new ContentService({
    supadata: {
      apiKey: process.env.SUPADATA_API_KEY!,
      enabled: true,
    },
    apify: {
      apiToken: process.env.APIFY_TOKEN || '',
      enabled: Boolean(process.env.APIFY_TOKEN),
    },
  });

  console.log('🔧 Configured providers:', service.getConfiguredProviders().join(', '));

  // Real test URLs from docs/recipe-extract-test-cases.txt
  const testUrls = [
    'https://www.tiktok.com/@haileyateit/video/7596405804857560351', // TikTok: Lazy Soup Dumplings
    'https://www.tiktok.com/@jujumaoo/video/7597415871853661460', // TikTok: Beef Pares
  ];

  for (const testUrl of testUrls) {
    console.log('\n📥 Test URL:', testUrl);

    try {
      const start = Date.now();
      const content = await service.acquire(testUrl);
      const elapsed = Date.now() - start;

      console.log('\n✅ Content acquisition successful!');
      console.log(`⏱️  Time: ${elapsed}ms`);
      console.log('\n📊 Results:');
      console.log(`  Provider: ${content.provider}`);
      console.log(`  Platform: ${content.platform}`);
      console.log(`  Content Type: ${content.contentType}`);
      console.log(`  Title: ${content.title || '(not available)'}`);
      console.log(`  Transcript: ${content.transcript ? content.transcript.slice(0, 100) + '...' : '(not available)'}`);
      console.log(`  Caption: ${content.caption ? content.caption.slice(0, 100) + '...' : '(not available)'}`);

      return content;
    } catch (error) {
      console.log(`\n⚠️  Failed for this URL, trying next...`);
      console.log(`   Error: ${error instanceof Error ? error.message.split('\n')[0] : error}`);
    }
  }

  console.error('\n❌ All content acquisition attempts failed');
  return null;
}

// ============================================================================
// Test 3: Full Pipeline
// ============================================================================

async function testFullPipeline(content: Awaited<ReturnType<typeof testContentService>>) {
  if (!content) {
    console.log('\n' + '='.repeat(60));
    console.log('⏭️  Test 3: Full Pipeline - SKIPPED (no content from Test 2)');
    console.log('='.repeat(60));
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('🔄 Test 3: Full Pipeline (Content → Extraction)');
  console.log('='.repeat(60));

  const extractor = new CaptionExtractor({
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // Use transcript or caption from content acquisition
  const textToExtract = content.transcript || content.caption || '';

  if (!textToExtract) {
    console.log('\n⚠️  No text content to extract from');
    return;
  }

  console.log('\n📥 Extracting from:', content.provider, 'content');
  console.log('📝 Text length:', textToExtract.length, 'chars');

  try {
    const start = Date.now();
    const result = await extractor.extract(textToExtract);
    const elapsed = Date.now() - start;

    console.log('\n✅ Full pipeline successful!');
    console.log(`⏱️  Total extraction time: ${elapsed}ms`);
    console.log('\n📊 Extracted Recipe:');
    console.log(`  Title: ${result.title || '(not found)'}`);
    console.log(`  Ingredients: ${result.ingredients.length}`);
    console.log(`  Instructions: ${result.instructions.length}`);
    console.log(`  Confidence: ${(result.confidence.overall * 100).toFixed(0)}%`);
    console.log(`  Is Complete: ${result.confidence.isCompleteRecipe}`);

    if (!result.confidence.isCompleteRecipe) {
      console.log('\n💡 Low confidence - in production, this would trigger fallback to visual extraction');
    }
  } catch (error) {
    console.error('\n❌ Full pipeline failed:', error);
  }
}

// ============================================================================
// Run all tests
// ============================================================================

async function main() {
  console.log('\n🧪 Recipe Extraction Test Suite');
  console.log('================================\n');

  // Test 1: Caption extraction (only needs OpenAI)
  const test1Pass = await testCaptionExtractor();

  // Test 2: Content acquisition (needs Supadata)
  const content = await testContentService();

  // Test 3: Full pipeline
  await testFullPipeline(content);

  console.log('\n' + '='.repeat(60));
  console.log('📋 Summary');
  console.log('='.repeat(60));
  console.log(`  Test 1 (CaptionExtractor): ${test1Pass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Test 2 (ContentService): ${content ? '✅ PASS' : process.env.SUPADATA_API_KEY ? '❌ FAIL' : '⏭️  SKIPPED'}`);
  console.log(`  Test 3 (Full Pipeline): ${content ? '✅ RAN' : '⏭️  SKIPPED'}`);
  console.log('\n');
}

main().catch(console.error);
