import OpenAI from 'openai';

/**
 * Generate a recipe title from ingredients and instructions using AI
 */
export async function generateRecipeTitle(ingredients: string[], instructions: string[]): Promise<string> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = `Generate a concise, appetizing recipe title based on these ingredients and instructions. 

EXAMPLES OF GOOD TITLES:
- "Lobster Pasta"
- "Shrimp Dumplings"  
- "Strawberry Shortcake"
- "Blondie Cookies"
- "Chicken Lo Mein"
- "Butter Chicken with Garlic Naan"
- "Brothy Red Curry Chicken & Charred Cabbage"
- "THE Best Spicy Kale Salad! 🔥🔥"
- "Spicy Chicken Tenders with Homemade Ranch Sauce"

INGREDIENTS: ${ingredients.slice(0, 8).join(', ')}

INSTRUCTIONS: ${instructions.slice(0, 3).join(' ')}

Requirements:
- Focus on the MAIN dish/food item
- Keep it under 8 words
- Make it sound delicious and appetizing
- Don't list random ingredients
- Use cooking method + main ingredient format when appropriate
- Be specific about the actual dish being made

Generate only the title, nothing else:`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 20,
      temperature: 0.3
    });

    const aiTitle = response.choices[0]?.message?.content?.trim() || '';
    
    // Validate the AI response
    if (aiTitle && aiTitle.length > 3 && aiTitle.length < 100 && !aiTitle.includes('&')) {
      console.log(`🤖 AI generated title: "${aiTitle}"`);
      return aiTitle;
    } else {
      // Fallback to simple approach if AI fails
      console.log(`⚠️ AI title invalid: "${aiTitle}", using fallback`);
      return generateSimpleTitle(ingredients, instructions);
    }
  } catch (error) {
    console.error('Error generating AI title:', error);
    return generateSimpleTitle(ingredients, instructions);
  }
}

/**
 * Simple fallback title generation
 */
function generateSimpleTitle(ingredients: string[], instructions: string[]): string {
  // Find the main protein or primary ingredient
  const proteins = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'tofu'];
  const starches = ['pasta', 'rice', 'noodles', 'bread', 'potatoes'];
  const dishes = ['curry', 'soup', 'salad', 'stir fry', 'sandwich', 'burger', 'pizza', 'tacos'];
  
  const allText = (ingredients.join(' ') + ' ' + instructions.join(' ')).toLowerCase();
  
  // Look for specific dishes first
  for (const dish of dishes) {
    if (allText.includes(dish)) {
      const protein = proteins.find(p => allText.includes(p));
      if (protein) {
        return `${protein.charAt(0).toUpperCase() + protein.slice(1)} ${dish.charAt(0).toUpperCase() + dish.slice(1)}`;
      }
      return dish.charAt(0).toUpperCase() + dish.slice(1);
    }
  }
  
  // Look for protein + starch combinations
  const protein = proteins.find(p => allText.includes(p));
  const starch = starches.find(s => allText.includes(s));
  
  if (protein && starch) {
    return `${protein.charAt(0).toUpperCase() + protein.slice(1)} ${starch.charAt(0).toUpperCase() + starch.slice(1)}`;
  }
  
  if (protein) {
    return `${protein.charAt(0).toUpperCase() + protein.slice(1)} Recipe`;
  }
  
  // Extract first meaningful ingredient as fallback
  const firstIngredient = ingredients[0]?.split(' ').find(word => 
    word.length > 3 && !['cups', 'cup', 'tablespoons', 'teaspoons', 'ounces', 'pounds'].includes(word.toLowerCase())
  );
  
  if (firstIngredient) {
    return `${firstIngredient.charAt(0).toUpperCase() + firstIngredient.slice(1)} Recipe`;
  }
  
  return 'Delicious Recipe';
}
