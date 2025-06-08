/**
 * Generate a recipe title from ingredients and instructions
 */
export function generateRecipeTitle(ingredients: string[], instructions: string[]): string {
  // Extract key ingredients (first 3-4 main ingredients)
  const keyIngredients = ingredients
    .slice(0, 4)
    .map(ingredient => {
      // Extract the main ingredient name (remove quantities and common words)
      const words = ingredient.toLowerCase().split(' ');
      const commonWords = ['cup', 'cups', 'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons', 'pound', 'pounds', 'ounce', 'ounces', 'gram', 'grams', 'of', 'and', 'or', 'fresh', 'dried', 'chopped', 'minced', 'sliced', 'can', 'cans', 'large', 'small', 'medium', 'head', 'heads', 'bunch', 'clove', 'cloves', 'piece', 'pieces'];
      
      const mainWords = words.filter(word => 
        !commonWords.includes(word) && 
        !/^\d/.test(word) && // Remove numbers
        word.length > 2
      );
      
      return mainWords[0] || words[words.length - 1]; // Take first meaningful word or last word
    })
    .filter(Boolean)
    .slice(0, 3); // Max 3 ingredients in title

  // Determine cooking method from instructions
  const instructionText = instructions.join(' ').toLowerCase();
  let cookingMethod = '';
  
  if (instructionText.includes('bake') || instructionText.includes('oven')) {
    cookingMethod = 'Baked';
  } else if (instructionText.includes('fry') || instructionText.includes('pan')) {
    cookingMethod = 'Pan-Fried';
  } else if (instructionText.includes('grill')) {
    cookingMethod = 'Grilled';
  } else if (instructionText.includes('roast')) {
    cookingMethod = 'Roasted';
  } else if (instructionText.includes('sauté')) {
    cookingMethod = 'Sautéed';
  } else if (instructionText.includes('boil') || instructionText.includes('simmer')) {
    cookingMethod = 'Simmered';
  } else if (instructionText.includes('steam')) {
    cookingMethod = 'Steamed';
  }

  // Generate title
  if (keyIngredients.length > 0) {
    const ingredientPart = keyIngredients
      .map(ingredient => ingredient.charAt(0).toUpperCase() + ingredient.slice(1))
      .join(' & ');
    
    if (cookingMethod) {
      return `${cookingMethod} ${ingredientPart}`;
    } else {
      return `${ingredientPart} Recipe`;
    }
  }
  
  // Fallback title
  return 'Delicious Recipe';
} 