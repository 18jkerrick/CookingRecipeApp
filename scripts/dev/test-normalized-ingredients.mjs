// Test script to analyze the normalized ingredients structure
import { normalizeIngredientsWithAIBatch } from './lib/aiIngredientNormalizer.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testNormalizedIngredients() {
  console.log('🧪 Testing ingredient normalization...');
  
  // Test with problematic ingredients that have been causing issues
  const testIngredients = [
    "⅛ teaspoon turmeric (haldi, optional)",
    "½ teaspoon salt (adjust to taste)",
    "1½ cups (130 grams) onions (sliced)",
    "600 grams (1.3 lbs.) fresh tomatoes",
    "¼ to ⅓ teaspoon red chili powder",
    "2 tablespoons oil",
    "1 cup basmati rice",
    "4-5 garlic cloves (minced)",
    "1 inch ginger (grated)"
  ];
  
  console.log('\n📝 Input ingredients:');
  testIngredients.forEach((ingredient, index) => {
    console.log(`${index + 1}. "${ingredient}"`);
  });
  
  try {
    console.log('\n🤖 Processing with AI normalization...');
    const normalized = await normalizeIngredientsWithAIBatch(testIngredients);
    
    console.log('\n🔍 DETAILED ANALYSIS:');
    console.log('===========================================');
    
    normalized.forEach((item, index) => {
      const original = testIngredients[index];
      console.log(`\n${index + 1}. ORIGINAL: "${original}"`);
      console.log(`   NORMALIZED STRUCTURE:`);
      console.log(`   {`);
      console.log(`     quantity: ${item.quantity}`);
      console.log(`     unit: "${item.unit || 'null'}"`);
      console.log(`     ingredient: "${item.ingredient}"`);
      console.log(`     preparation: "${item.preparation || 'null'}"`);
      console.log(`     notes: "${item.notes || 'null'}"`);
      console.log(`     original: "${item.original}"`);
      console.log(`     confidence: ${item.confidence}`);
      console.log(`     range: ${item.range ? JSON.stringify(item.range) : 'null'}`);
      console.log(`   }`);
      
      // Check for specific issues
      if (original.includes('turmeric')) {
        console.log(`   🌟 TURMERIC CHECK: Expected quantity 0.125, got ${item.quantity}`);
        if (item.quantity !== 0.125) {
          console.log(`   ❌ TURMERIC ISSUE: Quantity should be 0.125 but is ${item.quantity}`);
        } else {
          console.log(`   ✅ TURMERIC OK: Quantity correctly parsed as 0.125`);
        }
      }
      
      if (original.includes('to')) {
        console.log(`   🔍 RANGE CHECK: Expected range object, got ${item.range ? 'range object' : 'null'}`);
        if (item.range) {
          console.log(`   ✅ RANGE OK: min=${item.range.min}, max=${item.range.max}`);
        } else {
          console.log(`   ❌ RANGE ISSUE: Should have range but doesn't`);
        }
      }
    });
    
    console.log('\n📊 SUMMARY:');
    console.log('===========================================');
    console.log(`Total ingredients processed: ${normalized.length}`);
    console.log(`Ingredients with quantities: ${normalized.filter(item => item.quantity && item.quantity > 0).length}`);
    console.log(`Ingredients with ranges: ${normalized.filter(item => item.range).length}`);
    console.log(`Ingredients with units: ${normalized.filter(item => item.unit).length}`);
    console.log(`Ingredients with preparation: ${normalized.filter(item => item.preparation).length}`);
    console.log(`Ingredients with notes: ${normalized.filter(item => item.notes).length}`);
    
    // Show JSON structure that would be saved to database
    console.log('\n💾 DATABASE STRUCTURE (normalized_ingredients column):');
    console.log('===========================================');
    console.log(JSON.stringify(normalized, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing normalization:', error);
  }
}

testNormalizedIngredients();