export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
}

function parseFraction(str: string): number {
  // Handle fractions like "1/2", "3/4", etc.
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

export function parseIngredients(ingredients: string[]): ParsedIngredient[] {
  return ingredients.map(ingredient => {
    const trimmed = ingredient.trim();
    const tokens = trimmed.split(' ');
    
    // Extract quantity (first token, handling fractions)
    const quantity = parseFraction(tokens[0]) || 1;
    
    // Check if second token is a unit
    const commonUnits = ['cup', 'cups', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons', 'tbsp', 'oz', 'lb', 'lbs', 'pound', 'pounds', 'g', 'kg', 'ml', 'l'];
    let unit = '';
    let nameStartIndex = 1;
    
    if (tokens.length > 1) {
      const secondToken = tokens[1]?.toLowerCase();
      if (commonUnits.includes(secondToken)) {
        unit = tokens[1];
        nameStartIndex = 2;
      }
    }
    
    // Extract name (remaining tokens)
    const name = tokens.slice(nameStartIndex).join(' ') || trimmed;
    
    return {
      name,
      quantity,
      unit
    };
  });
} 