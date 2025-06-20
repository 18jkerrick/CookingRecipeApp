// Test specific ingredient parsing issues
const { parseIngredientForGrocery } = require('./lib/groceryStorageDB');

const problemIngredients = [
  {
    raw: "⅓ cup greek yogurt",
    expected: { qty: 0.33, unit: "cup", ingredient: "greek yogurt" }
  },
  {
    raw: "⅛ teaspoon turmeric",
    expected: { qty: 0.125, unit: "teaspoon", ingredient: "turmeric" }
  },
  {
    raw: "½ tablespoon kasuri methi",
    expected: { qty: 0.5, unit: "tablespoon", ingredient: "kasuri methi" }
  },
  {
    raw: "¼ to ⅓ teaspoon salt",
    expected: { qty_min: 0.25, qty_max: 0.33, unit: "teaspoon", ingredient: "salt" }
  }
];

console.log('Testing problematic ingredients:\n');

problemIngredients.forEach(({ raw, expected }) => {
  console.log(`Input: "${raw}"`);
  console.log(`Expected: qty=${expected.qty || `${expected.qty_min}-${expected.qty_max}`}, unit="${expected.unit}", ingredient="${expected.ingredient}"`);
  
  // Test without AI data (fallback parser)
  const parsed = parseIngredientForGrocery(raw);
  
  console.log(`Parsed:`);
  console.log(`  sort_name: "${parsed.sort_name}"`);
  console.log(`  quantity: ${parsed.original_quantity_min} - ${parsed.original_quantity_max}`);
  console.log(`  unit: "${parsed.original_unit}"`);
  
  const isCorrect = 
    parsed.sort_name === expected.ingredient &&
    parsed.original_unit === expected.unit &&
    (expected.qty ? parsed.original_quantity_min === expected.qty : 
     (parsed.original_quantity_min === expected.qty_min && parsed.original_quantity_max === expected.qty_max));
    
  console.log(`  Status: ${isCorrect ? '✅ CORRECT' : '❌ WRONG'}`);
  console.log('---\n');
});