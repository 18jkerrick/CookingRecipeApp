export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
  displayQuantity?: string;
}

function parseFraction(str: string): number {
  // Handle Unicode fractions
  const unicodeFractions: { [key: string]: number } = {
    '½': 0.5,
    '¼': 0.25,
    '¾': 0.75,
    '⅓': 0.333,
    '⅔': 0.667,
    '⅛': 0.125,
    '⅜': 0.375,
    '⅝': 0.625,
    '⅞': 0.875,
    '⅕': 0.2,
    '⅖': 0.4,
    '⅗': 0.6,
    '⅘': 0.8,
    '⅙': 0.167,
    '⅚': 0.833
  };
  
  // Check for Unicode fractions
  for (const [fraction, value] of Object.entries(unicodeFractions)) {
    if (str.includes(fraction)) {
      // Handle mixed numbers like "1¼"
      const beforeFraction = str.substring(0, str.indexOf(fraction));
      if (beforeFraction && !isNaN(parseFloat(beforeFraction))) {
        return parseFloat(beforeFraction) + value;
      }
      // Just the fraction
      return value;
    }
  }
  
  // Handle regular fractions like "1/2", "3/4", etc.
  if (str.includes('/')) {
    const [numerator, denominator] = str.split('/');
    return parseFloat(numerator) / parseFloat(denominator);
  }
  
  // Handle mixed numbers like "1 1/2"
  if (str.includes(' ') && str.includes('/')) {
    const parts = str.split(' ');
    const whole = parseFloat(parts[0]);
    const [numerator, denominator] = parts[1].split('/');
    return whole + (parseFloat(numerator) / parseFloat(denominator));
  }
  
  // Regular decimal or whole number
  return parseFloat(str);
}

export function parseIngredients(ingredients: string[]) {
  return ingredients.map(ingredient => {
    // Remove extra whitespace and normalize
    const cleanIngredient = ingredient.trim();
    
    // Regular expression to match mixed numbers, fractions, and decimals at the start
    const quantityMatch = cleanIngredient.match(/^(\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?|\d+\/\d+)/);
    
    if (!quantityMatch) {
      // No quantity found, treat as 1 unit
      return {
        name: cleanIngredient,
        quantity: 1,
        unit: ''
      };
    }
    
    const quantityStr = quantityMatch[1];
    let quantity = 0;
    
    // Handle mixed numbers (e.g., "1 1/2")
    const mixedMatch = quantityStr.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1]);
      const numerator = parseInt(mixedMatch[2]);
      const denominator = parseInt(mixedMatch[3]);
      quantity = whole + (numerator / denominator);
    }
    // Handle simple fractions (e.g., "1/2")
    else if (quantityStr.includes('/')) {
      const [numerator, denominator] = quantityStr.split('/').map(Number);
      quantity = numerator / denominator;
    }
    // Handle decimal numbers (e.g., "1.5")
    else {
      quantity = parseFloat(quantityStr);
    }
    
    // Round to 3 decimal places to avoid floating point issues
    quantity = Math.round(quantity * 1000) / 1000;
    
    // Extract the rest of the ingredient (after quantity)
    const remainder = cleanIngredient.substring(quantityMatch[0].length).trim();
    
    // Split remainder into unit and name
    const words = remainder.split(/\s+/);
    
    // Common units to identify
    const units = [
      'cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp', 'teaspoon', 'teaspoons', 'tsp',
      'pound', 'pounds', 'lb', 'lbs', 'ounce', 'ounces', 'oz', 'gram', 'grams', 'g',
      'kilogram', 'kilograms', 'kg', 'liter', 'liters', 'l', 'milliliter', 'milliliters', 'ml',
      'pint', 'pints', 'quart', 'quarts', 'gallon', 'gallons', 'clove', 'cloves',
      'slice', 'slices', 'piece', 'pieces', 'inch', 'inches', 'can', 'cans', 'jar', 'jars',
      'package', 'packages', 'bag', 'bags', 'box', 'boxes'
    ];
    
    let unit = '';
    let name = remainder;
    
    if (words.length > 0) {
      const firstWord = words[0].toLowerCase().replace(/[,.]$/, ''); // Remove trailing comma/period
      if (units.includes(firstWord)) {
        unit = words[0].replace(/[,.]$/, ''); // Keep original case but remove punctuation
        name = words.slice(1).join(' ');
      }
    }
    
    // Clean up the name (remove leading/trailing punctuation and extra spaces)
    name = name.replace(/^[,\s]+|[,\s]+$/g, '').trim();
    
    return {
      name: name || 'Unknown ingredient',
      quantity,
      unit
    };
  });
} 