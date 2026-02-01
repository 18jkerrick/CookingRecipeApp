#!/usr/bin/env node

/**
 * Manual Ingredient Parsing Test Script
 * 
 * Run this script to test the ingredient parsing API manually.
 * Usage: node scripts/test-parsing.js [port]
 */

const expectedIngredients = [
  "½ kg boneless chicken",
  "½ to ¾ teaspoon kashmiri red chili powder",
  "¼ to ⅓ teaspoon salt",
  "¾ to 1 tablespoon lemon juice",
  "⅓ cup greek yogurt",
  "¾ tablespoon ginger garlic paste",
  "⅛ teaspoon turmeric",
  "¾ to 1 teaspoon garam masala",
  "½ teaspoon cumin powder",
  "1 teaspoon coriander powder",
  "1 teaspoon kasuri methi",
  "¾ to 1 tablespoon oil",
  "2 to 3 tablespoons butter",
  "2 inch cinnamon",
  "2 to 4 green cardamoms",
  "2 to 4 cloves",
  "1½ cups onions",
  "600 grams fresh tomatoes",
  "¾ tablespoon ginger garlic paste",
  "1 to 2 green chilies",
  "28 grams whole raw cashews",
  "½ cup water",
  "1 to 2 teaspoons kashmiri chili powder",
  "1 to 1½ teaspoons garam masala",
  "1 to 1½ teaspoon coriander powder",
  "½ teaspoon cumin powder",
  "½ to ¾ teaspoon salt",
  "1 teaspoon sugar",
  "½ tablespoon kasuri methi",
  "1½ cups hot water",
  "⅓ cup heavy cream",
  "2 tablespoons coriander leaves"
];

async function testIngredientParsing() {
  const port = process.argv[2] || '3000';
  const url = `http://localhost:${port}/api/parse-url`;
  
  console.log('🧪 Testing Ingredient Parsing');
  console.log('==============================');
  console.log(`API URL: ${url}`);
  console.log(`Test URL: https://www.indianhealthyrecipes.com/butter-chicken/`);
  console.log(`Expected: ${expectedIngredients.length} ingredients\n`);

  try {
    console.log('⏳ Sending request...');
    const startTime = Date.now();
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.indianhealthyrecipes.com/butter-chicken/',
        mode: 'full'
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Request completed in ${duration}ms\n`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.ingredients || !Array.isArray(result.ingredients)) {
      throw new Error('No ingredients found in response');
    }

    // Analyze results
    const actualIngredients = result.ingredients.map(ing => ing.trim());
    let perfectMatches = 0;
    const mismatches = [];

    console.log('📊 Results:');
    console.log(`Expected: ${expectedIngredients.length} ingredients`);
    console.log(`Received: ${actualIngredients.length} ingredients`);
    console.log(`Platform: ${result.platform}`);
    console.log(`Title: ${result.title}\n`);

    // Compare ingredients
    const maxLength = Math.max(expectedIngredients.length, actualIngredients.length);
    
    for (let i = 0; i < maxLength; i++) {
      const expected = expectedIngredients[i];
      const actual = actualIngredients[i];
      
      if (expected === actual) {
        perfectMatches++;
      } else {
        mismatches.push({
          index: i + 1,
          expected: expected || '[missing]',
          actual: actual || '[missing]'
        });
      }
    }

    const successRate = (perfectMatches / expectedIngredients.length) * 100;
    
    console.log('✅ Perfect Matches:', perfectMatches);
    console.log('❌ Mismatches:', mismatches.length);
    console.log('📈 Success Rate:', `${successRate.toFixed(1)}%\n`);

    // Show mismatches
    if (mismatches.length > 0) {
      console.log('🔍 Mismatches:');
      console.log('=============');
      mismatches.slice(0, 10).forEach(mismatch => {
        console.log(`${mismatch.index}. Expected: "${mismatch.expected}"`);
        console.log(`   Actual:   "${mismatch.actual}"`);
        console.log('');
      });
      
      if (mismatches.length > 10) {
        console.log(`... and ${mismatches.length - 10} more mismatches\n`);
      }
    }

    // Key tests
    console.log('🔬 Key Tests:');
    console.log('=============');
    
    // Turmeric test
    const turmeric = actualIngredients.find(ing => ing.includes('turmeric'));
    const turmericTest = turmeric === '⅛ teaspoon turmeric';
    console.log(`⅛ Turmeric: ${turmericTest ? '✅' : '❌'} (got: "${turmeric || 'not found'}")`);
    
    // Range test
    const ranges = actualIngredients.filter(ing => ing.includes(' to '));
    const rangeTest = ranges.length >= 10;
    console.log(`Ranges: ${rangeTest ? '✅' : '❌'} (found: ${ranges.length})`);
    
    // Unicode fraction test
    const withFractions = actualIngredients.filter(ing => /[½¼¾⅛⅓⅔]/.test(ing));
    const fractionTest = withFractions.length >= 15;
    console.log(`Unicode Fractions: ${fractionTest ? '✅' : '❌'} (found: ${withFractions.length})`);
    
    // Parentheses test
    const badParens = actualIngredients.filter(ing => /\(\(|\)\)|\)\s*$/.test(ing));
    const parensTest = badParens.length === 0;
    console.log(`Clean Parentheses: ${parensTest ? '✅' : '❌'} (issues: ${badParens.length})`);

    console.log('\n🎯 Overall Result:');
    if (successRate >= 95) {
      console.log('🎉 EXCELLENT - Parsing is working perfectly!');
    } else if (successRate >= 90) {
      console.log('✅ GOOD - Minor issues but mostly working well');
    } else if (successRate >= 80) {
      console.log('⚠️  NEEDS WORK - Some significant issues to fix');
    } else {
      console.log('❌ FAILING - Major parsing problems detected');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check if fetch is available (Node 18+) or provide a polyfill message
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ with built-in fetch, or run:');
  console.error('   npm install node-fetch');
  console.error('   Then add: const fetch = require("node-fetch");');
  process.exit(1);
}

testIngredientParsing();