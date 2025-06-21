// Test ingredient formatting for Instacart API

function formatIngredientsForInstacart(items) {
  return items.map(item => {
    const name = item.name.trim().toLowerCase();
    const display_text = item.name.trim();
    
    // Parse quantity and unit from the item
    let quantity = 1;
    let unit = 'piece';
    
    if (item.quantity && item.unit) {
      quantity = Number(item.quantity) || 1;
      unit = item.unit.toLowerCase();
      
      // Normalize common units to what Instacart expects
      const unitMap = {
        'lbs': 'pound',
        'lb': 'pound',
        'pounds': 'pound',
        'oz': 'ounce',
        'ounces': 'ounce',
        'cups': 'cup',
        'tbsp': 'tablespoon',
        'tablespoons': 'tablespoon',
        'tsp': 'teaspoon',
        'teaspoons': 'teaspoon',
        'bottle': 'piece',
        'bottles': 'piece',
        'item': 'piece',
        'items': 'piece'
      };
      
      unit = unitMap[unit] || unit;
    } else if (item.quantity) {
      quantity = Number(item.quantity) || 1;
      unit = 'piece';
    }
    
    return {
      name,
      display_text,
      measurements: [{
        quantity,
        unit
      }]
    };
  });
}

// Test with sample data
const testItems = [
  { name: 'Chicken Breast', quantity: 2, unit: 'lbs' },
  { name: 'Broccoli', quantity: 1, unit: 'lb' },
  { name: 'Rice', quantity: 2, unit: 'cups' },
  { name: 'Olive Oil', quantity: 1, unit: 'bottle' },
  { name: 'Salt', quantity: 1 } // no unit
];

const formatted = formatIngredientsForInstacart(testItems);
console.log('Formatted ingredients for Instacart API:');
console.log(JSON.stringify(formatted, null, 2));

// Test recipe structure
const recipeRequest = {
  title: 'Test Shopping List',
  ingredients: formatted,
  instructions: [
    'Welcome to your shopping list!',
    'All ingredients have been added below.',
    'Review the items and add them to your cart.',
    'Proceed to checkout when ready.'
  ],
  landing_page_configuration: {
    partner_linkback_url: 'https://recipe-grocery-app.vercel.app',
    enable_pantry_items: true
  }
};

console.log('\nComplete recipe request:');
console.log(JSON.stringify(recipeRequest, null, 2));