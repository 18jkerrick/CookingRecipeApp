/**
 * Integration Test for Ingredient Parsing
 * 
 * This test actually calls the live API to ensure real-world parsing works correctly.
 * Run this when you want to verify the actual parsing pipeline.
 * 
 * To run: NODE_ENV=test npm test ingredient-parsing-integration.test.js
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

describe('Ingredient Parsing Integration Test', () => {
  const testUrl = 'https://www.indianhealthyrecipes.com/butter-chicken/';
  
  // Skip if not running in integration mode
  const runIntegration = process.env.NODE_ENV === 'test' && process.env.INTEGRATION === 'true';
  
  (runIntegration ? test : test.skip)('should parse butter chicken ingredients correctly via live API', async () => {
    // This test requires your Next.js app to be running
    const response = await fetch('http://localhost:3000/api/parse-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: testUrl,
        mode: 'full'
      }),
    });

    expect(response.ok).toBe(true);
    const result = await response.json();
    
    // Log results for debugging
    console.log(`\n📊 Integration Test Results:`);
    console.log(`Expected: ${expectedIngredients.length} ingredients`);
    console.log(`Received: ${result.ingredients?.length || 0} ingredients`);
    
    // Verify basic structure
    expect(result.ingredients).toBeDefined();
    expect(Array.isArray(result.ingredients)).toBe(true);
    expect(result.platform).toBe('Cooking Website');
    
    // Check ingredient count (allow some flexibility)
    expect(result.ingredients.length).toBeGreaterThanOrEqual(30);
    expect(result.ingredients.length).toBeLessThanOrEqual(35);
    
    // Check critical ingredients are present and correctly formatted
    const actualIngredients = result.ingredients.map(ing => ing.trim());
    
    // Turmeric test (most critical)
    const turmeric = actualIngredients.find(ing => ing.includes('turmeric'));
    expect(turmeric).toBe('⅛ teaspoon turmeric');
    
    // Range tests
    const ranges = actualIngredients.filter(ing => ing.includes(' to '));
    expect(ranges.length).toBeGreaterThan(10);
    
    // Unicode fraction tests
    const withFractions = actualIngredients.filter(ing => 
      /[½¼¾⅛⅓⅔]/.test(ing)
    );
    expect(withFractions.length).toBeGreaterThan(15);
    
    // Log mismatches for debugging
    const mismatches = [];
    const maxLength = Math.max(expectedIngredients.length, actualIngredients.length);
    
    for (let i = 0; i < maxLength; i++) {
      const expected = expectedIngredients[i];
      const actual = actualIngredients[i];
      
      if (expected !== actual) {
        mismatches.push({
          index: i,
          expected: expected || '[missing]',
          actual: actual || '[missing]'
        });
      }
    }
    
    if (mismatches.length > 0) {
      console.log(`\n❌ Found ${mismatches.length} mismatches:`);
      mismatches.slice(0, 10).forEach(mismatch => {
        console.log(`  ${mismatch.index}: "${mismatch.expected}" !== "${mismatch.actual}"`);
      });
      if (mismatches.length > 10) {
        console.log(`  ... and ${mismatches.length - 10} more`);
      }
    }
    
    // Success rate check
    const matches = expectedIngredients.filter((expected, index) => 
      actualIngredients[index] === expected
    ).length;
    
    const successRate = (matches / expectedIngredients.length) * 100;
    console.log(`✅ Success rate: ${matches}/${expectedIngredients.length} (${successRate.toFixed(1)}%)`);
    
    // Expect at least 90% success rate
    expect(successRate).toBeGreaterThanOrEqual(90);
    
  }, 60000); // 60 second timeout for full processing

  test('should validate expected ingredients format', () => {
    // Test the expected ingredients themselves are valid
    expectedIngredients.forEach((ingredient, index) => {
      expect(typeof ingredient).toBe('string');
      expect(ingredient.length).toBeGreaterThan(0);
      
      // Should not have excessive parentheses
      expect(ingredient).not.toMatch(/\(\(/);
      expect(ingredient).not.toMatch(/\)\)/);
      expect(ingredient).not.toMatch(/\)\s*$/);
      
      // Should have balanced parentheses
      const openCount = (ingredient.match(/\(/g) || []).length;
      const closeCount = (ingredient.match(/\)/g) || []).length;
      expect(openCount).toBe(closeCount);
    });
  });
});

// Export for manual testing
module.exports = {
  expectedIngredients,
  testUrl: 'https://www.indianhealthyrecipes.com/butter-chicken/'
};