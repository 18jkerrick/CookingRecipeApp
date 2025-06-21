/**
 * Ingredient category mappings for better product matching
 */

export const ingredientCategories: Record<string, string[]> = {
  // Produce
  'produce': [
    'apple', 'banana', 'orange', 'lemon', 'lime', 'grape', 'strawberry', 'blueberry',
    'raspberry', 'blackberry', 'pear', 'peach', 'plum', 'cherry', 'watermelon',
    'cantaloupe', 'honeydew', 'pineapple', 'mango', 'papaya', 'kiwi', 'avocado',
    'tomato', 'cucumber', 'lettuce', 'spinach', 'kale', 'arugula', 'cabbage',
    'broccoli', 'cauliflower', 'carrot', 'celery', 'onion', 'garlic', 'potato',
    'sweet potato', 'yam', 'squash', 'zucchini', 'eggplant', 'pepper', 'corn',
    'mushroom', 'asparagus', 'green bean', 'pea', 'brussels sprout'
  ],
  
  // Dairy
  'dairy': [
    'milk', 'cream', 'half and half', 'butter', 'margarine', 'cheese', 'yogurt',
    'sour cream', 'cottage cheese', 'cream cheese', 'eggs', 'egg white', 'egg yolk'
  ],
  
  // Meat & Seafood
  'meat': [
    'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'bacon', 'sausage',
    'ham', 'ground beef', 'ground turkey', 'steak', 'roast', 'chop', 'rib',
    'salmon', 'tuna', 'shrimp', 'crab', 'lobster', 'scallop', 'fish', 'tilapia',
    'cod', 'halibut', 'mahi', 'swordfish', 'canned tuna', 'canned salmon'
  ],
  
  // Bakery
  'bakery': [
    'bread', 'roll', 'bun', 'bagel', 'muffin', 'croissant', 'baguette', 'pita',
    'tortilla', 'naan', 'focaccia', 'ciabatta', 'sourdough', 'whole wheat',
    'white bread', 'multigrain'
  ],
  
  // Pantry
  'pantry': [
    'flour', 'sugar', 'brown sugar', 'powdered sugar', 'salt', 'pepper', 'oil',
    'olive oil', 'vegetable oil', 'canola oil', 'vinegar', 'balsamic', 'rice',
    'pasta', 'noodle', 'spaghetti', 'penne', 'macaroni', 'quinoa', 'couscous',
    'oats', 'cereal', 'granola', 'honey', 'maple syrup', 'vanilla', 'extract',
    'baking soda', 'baking powder', 'yeast', 'cornstarch', 'cocoa', 'chocolate'
  ],
  
  // Canned & Jarred
  'canned': [
    'tomato sauce', 'tomato paste', 'diced tomatoes', 'crushed tomatoes',
    'beans', 'black beans', 'pinto beans', 'kidney beans', 'chickpeas',
    'corn', 'green beans', 'peas', 'soup', 'broth', 'stock', 'coconut milk',
    'salsa', 'pickle', 'olive', 'capers', 'jam', 'jelly', 'peanut butter',
    'almond butter', 'nutella'
  ],
  
  // Spices & Herbs
  'spices': [
    'oregano', 'basil', 'thyme', 'rosemary', 'sage', 'parsley', 'cilantro',
    'dill', 'mint', 'bay leaf', 'paprika', 'cumin', 'coriander', 'turmeric',
    'curry', 'chili powder', 'cayenne', 'cinnamon', 'nutmeg', 'clove', 'ginger',
    'garlic powder', 'onion powder', 'italian seasoning', 'taco seasoning'
  ],
  
  // Frozen
  'frozen': [
    'frozen vegetable', 'frozen fruit', 'ice cream', 'frozen pizza', 'frozen meal',
    'frozen chicken', 'frozen fish', 'frozen shrimp', 'frozen berry', 'frozen pea',
    'frozen corn', 'frozen broccoli', 'frozen spinach', 'ice', 'popsicle'
  ],
  
  // Beverages
  'beverage': [
    'water', 'juice', 'orange juice', 'apple juice', 'cranberry juice', 'soda',
    'cola', 'coffee', 'tea', 'beer', 'wine', 'liquor', 'vodka', 'rum', 'whiskey',
    'sparkling water', 'energy drink', 'sports drink', 'lemonade'
  ],
  
  // Snacks
  'snacks': [
    'chips', 'crackers', 'popcorn', 'pretzels', 'nuts', 'almonds', 'cashews',
    'peanuts', 'trail mix', 'granola bar', 'protein bar', 'cookies', 'candy',
    'chocolate bar', 'gummy', 'dried fruit', 'raisins'
  ]
};

// Get category for an ingredient
export function getIngredientCategory(ingredient: string): string {
  const lowerIngredient = ingredient.toLowerCase();
  
  for (const [category, keywords] of Object.entries(ingredientCategories)) {
    if (keywords.some(keyword => lowerIngredient.includes(keyword))) {
      return category;
    }
  }
  
  return 'other';
}

// Get Instacart aisle based on category
export function categoryToAisle(category: string): string {
  const aisleMap: Record<string, string> = {
    'produce': 'Produce',
    'dairy': 'Dairy',
    'meat': 'Meat & Seafood',
    'bakery': 'Bakery',
    'pantry': 'Pantry',
    'canned': 'Canned & Jarred',
    'spices': 'Spices & Seasonings',
    'frozen': 'Frozen',
    'beverage': 'Beverages',
    'snacks': 'Snacks & Candy',
    'other': 'Other'
  };
  
  return aisleMap[category] || 'Other';
}

// Enhanced ingredient info
export interface IngredientInfo {
  name: string;
  category: string;
  aisle: string;
  searchTerms: string[];
}

// Get enhanced ingredient information
export function getIngredientInfo(ingredient: string): IngredientInfo {
  const category = getIngredientCategory(ingredient);
  const aisle = categoryToAisle(category);
  
  // Generate search terms
  const searchTerms = [ingredient];
  
  // Add singular/plural variations
  if (ingredient.endsWith('s') && ingredient.length > 3) {
    searchTerms.push(ingredient.slice(0, -1));
  } else if (!ingredient.endsWith('s')) {
    searchTerms.push(ingredient + 's');
  }
  
  // Add common variations
  const variations: Record<string, string[]> = {
    'chicken breast': ['chicken', 'boneless chicken', 'chicken breasts'],
    'ground beef': ['beef', 'hamburger', 'ground chuck'],
    'bell pepper': ['pepper', 'sweet pepper', 'capsicum'],
    'green onion': ['scallion', 'spring onion'],
    'cilantro': ['coriander', 'fresh coriander'],
  };
  
  const lowerIngredient = ingredient.toLowerCase();
  for (const [key, values] of Object.entries(variations)) {
    if (lowerIngredient.includes(key)) {
      searchTerms.push(...values);
    }
  }
  
  return {
    name: ingredient,
    category,
    aisle,
    searchTerms: [...new Set(searchTerms)]
  };
}