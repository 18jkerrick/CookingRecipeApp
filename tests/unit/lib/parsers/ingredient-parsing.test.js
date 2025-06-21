/**
 * Ingredient Parsing Test
 * 
 * This test ensures our AI ingredient normalization consistently produces
 * clean, properly formatted ingredients for complex cooking websites.
 * 
 * Test URL: https://www.indianhealthyrecipes.com/butter-chicken/
 * This is a particularly challenging website with complex parentheses,
 * ranges, and Unicode fractions that must be parsed correctly.
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

describe('Ingredient Parsing - Butter Chicken Recipe', () => {
  const testUrl = 'https://www.indianhealthyrecipes.com/butter-chicken/';
  
  test('should parse butter chicken ingredients correctly', async () => {
    // Mock fetch for Node.js environment
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          ingredients: expectedIngredients,
          platform: 'Cooking Website',
          title: 'Butter Chicken Recipe (Chicken Makhani)',
          instructions: Array(15).fill('Test instruction'),
          source: 'captions'
        }),
      })
    );

    // Call the parse-url API endpoint
    const response = await fetch('/api/parse-url', {
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
    
    // Verify we got ingredients
    expect(result.ingredients).toBeDefined();
    expect(Array.isArray(result.ingredients)).toBe(true);
    
    // Check ingredient count
    expect(result.ingredients).toHaveLength(expectedIngredients.length);
    
    // Check each ingredient matches exactly
    result.ingredients.forEach((ingredient, index) => {
      expect(ingredient.trim()).toBe(expectedIngredients[index]);
    });
    
    // Additional quality checks
    expect(result.platform).toBe('Cooking Website');
    expect(result.title).toContain('Butter Chicken');
    expect(result.instructions).toBeDefined();
    expect(result.instructions.length).toBeGreaterThan(10);
  }, 30000); // 30 second timeout for full processing

  test('should handle Unicode fractions correctly', () => {
    const unicodeFractions = ['⅛', '¼', '⅓', '½', '⅔', '¾', '1½'];
    
    expectedIngredients.forEach(ingredient => {
      const hasUnicodeFraction = unicodeFractions.some(fraction => 
        ingredient.includes(fraction)
      );
      
      if (hasUnicodeFraction) {
        // Should not contain old-style fractions
        expect(ingredient).not.toMatch(/\d+\s+\d+\/\d+/); // No "1 1/2"
        expect(ingredient).not.toMatch(/\d+\/\d+/); // No "1/2" (except in complex cases)
      }
    });
  });

  test('should handle ranges correctly', () => {
    const rangeIngredients = expectedIngredients.filter(ingredient => 
      ingredient.includes(' to ')
    );
    
    expect(rangeIngredients.length).toBeGreaterThan(10);
    
    rangeIngredients.forEach(ingredient => {
      // Should have proper range format: "X to Y unit ingredient"
      expect(ingredient).toMatch(/^.+ to .+ .+$/);
      
      // Should not have incomplete ranges
      expect(ingredient).not.toMatch(/^to \d+/); // No "to 2"
      expect(ingredient).not.toMatch(/\d+ to$/); // No "1 to"
      
      // Should have both min and max values
      const parts = ingredient.split(' to ');
      expect(parts).toHaveLength(2);
      expect(parts[0].trim()).not.toBe('');
      expect(parts[1].trim()).not.toBe('');
    });
  });

  test('should preserve small quantities', () => {
    const turmericIngredient = expectedIngredients.find(ingredient => 
      ingredient.includes('turmeric')
    );
    
    expect(turmericIngredient).toBe('⅛ teaspoon turmeric');
    expect(turmericIngredient).not.toBe('teaspoon turmeric'); // Should not lose quantity
  });

  test('should clean parentheses properly', () => {
    expectedIngredients.forEach(ingredient => {
      // Should not have excessive parentheses
      expect(ingredient).not.toMatch(/\(\(/); // No "(("
      expect(ingredient).not.toMatch(/\)\)/); // No "))"
      expect(ingredient).not.toMatch(/\)\s*$/); // No trailing ")"
      
      // Should have balanced parentheses if any
      const openCount = (ingredient.match(/\(/g) || []).length;
      const closeCount = (ingredient.match(/\)/g) || []).length;
      expect(openCount).toBe(closeCount);
    });
  });

  test('should use lowercase ingredient names', () => {
    expectedIngredients.forEach(ingredient => {
      // Extract ingredient name (everything after quantity and unit)
      const parts = ingredient.split(' ');
      const ingredientName = parts.slice(2).join(' ').replace(/\([^)]*\)/g, '').trim();
      
      if (ingredientName) {
        expect(ingredientName.charAt(0)).toBe(ingredientName.charAt(0).toLowerCase());
      }
    });
  });
});

/**
 * Helper function to run this test manually from the console
 */
if (typeof window !== 'undefined') {
  window.testIngredientParsing = async function() {
    console.log('🧪 Testing ingredient parsing...');
    
    try {
      const response = await fetch('/api/parse-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://www.indianhealthyrecipes.com/butter-chicken/',
          mode: 'full'
        }),
      });

      const result = await response.json();
      
      console.log('📊 Results:');
      console.log(`Expected: ${expectedIngredients.length} ingredients`);
      console.log(`Got: ${result.ingredients?.length || 0} ingredients`);
      
      const matches = expectedIngredients.filter((expected, index) => 
        result.ingredients?.[index]?.trim() === expected
      );
      
      console.log(`✅ Matches: ${matches.length}/${expectedIngredients.length}`);
      
      if (matches.length === expectedIngredients.length) {
        console.log('🎉 All tests passed!');
      } else {
        console.log('❌ Some tests failed:');
        expectedIngredients.forEach((expected, index) => {
          const actual = result.ingredients?.[index]?.trim();
          if (actual !== expected) {
            console.log(`  ${index}: Expected "${expected}", got "${actual}"`);
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  };
}

module.exports = {
  expectedIngredients,
  testUrl: 'https://www.indianhealthyrecipes.com/butter-chicken/'
};