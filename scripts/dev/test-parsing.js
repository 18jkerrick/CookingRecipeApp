// Test ingredient parsing
const { parseIngredientForGrocery } = require('./lib/groceryStorageDB');

const testIngredients = [
  {
    raw: "½ kg boneless chicken",
    normalized: {
      quantity: 0.5,
      unit: "kg",
      ingredient: "boneless chicken"
    }
  },
  {
    raw: "¼ to ⅓ teaspoon salt",
    normalized: {
      range: { min: 0.25, max: 0.33 },
      unit: "teaspoon",
      ingredient: "salt"
    }
  },
  {
    raw: "600 grams fresh tomatoes",
    normalized: {
      quantity: 600,
      unit: "grams",
      ingredient: "fresh tomatoes"
    }
  },
  {
    raw: "¾ to 1 tablespoon lemon juice",
    normalized: {
      range: { min: 0.75, max: 1 },
      unit: "tablespoon",
      ingredient: "lemon juice"
    }
  }
];

console.log('Testing ingredient parsing...\n');

testIngredients.forEach(({ raw, normalized }) => {
  console.log(`Input: "${raw}"`);
  console.log('Normalized data:', JSON.stringify(normalized, null, 2));
  
  const parsed = parseIngredientForGrocery(raw, normalized);
  
  console.log('Parsed result:');
  console.log(`  name: "${parsed.name}"`);
  console.log(`  sort_name: "${parsed.sort_name}"`);
  console.log(`  quantity: ${parsed.original_quantity_min} - ${parsed.original_quantity_max}`);
  console.log(`  unit: "${parsed.original_unit}"`);
  console.log('---\n');
});

// Test without normalized data
console.log('Testing fallback parsing (no AI data):\n');
const fallbackTests = [
  "½ kg boneless chicken",
  "2 to 3 tablespoons butter",
  "1 teaspoon turmeric",
  "grams fresh tomatoes" // This seems to be what's in your DB
];

fallbackTests.forEach(raw => {
  console.log(`Input: "${raw}"`);
  const parsed = parseIngredientForGrocery(raw);
  console.log('Parsed result:');
  console.log(`  sort_name: "${parsed.sort_name}"`);
  console.log(`  quantity: ${parsed.original_quantity_min}`);
  console.log(`  unit: "${parsed.original_unit}"`);
  console.log('---\n');
});